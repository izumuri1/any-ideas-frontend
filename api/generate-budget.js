// /api/generate-budget.js
// Gemini API を使用した安全な予算提案生成API

// 使用量管理クラス
class GeminiUsageManager {
  constructor() {
    this.requestLog = []; // タイムスタンプのログ
    this.dailyUsage = new Map(); // date -> count
    
    // 安全な制限値（実際の制限より低く設定）
    this.SAFE_RPM = 10; // 1分間10回（実際は60回）
    this.SAFE_DAILY = 200; // 1日200回（実際は1000回）
    this.USER_DAILY_LIMIT = 20; // 1ユーザー1日20回
    this.USER_HOURLY_LIMIT = 5; // 1ユーザー1時間5回
    
    this.userDailyUsage = new Map(); // userId_date -> count
    this.userHourlyUsage = new Map(); // userId -> timestamps[]
  }

  // 全体の制限チェック
  canMakeGlobalRequest() {
    const now = Date.now();
    const oneMinuteAgo = now - (60 * 1000);
    const today = new Date().toDateString();

    // 過去1分間のリクエスト数をチェック
    this.requestLog = this.requestLog.filter(timestamp => timestamp > oneMinuteAgo);
    if (this.requestLog.length >= this.SAFE_RPM) {
      return {
        canRequest: false,
        reason: 'システムの1分間制限に達しました。1分後に再度お試しください。',
        retryAfter: 60
      };
    }

    // 今日の総リクエスト数をチェック
    const todayUsage = this.dailyUsage.get(today) || 0;
    if (todayUsage >= this.SAFE_DAILY) {
      return {
        canRequest: false,
        reason: 'システムの1日制限に達しました。明日再度お試しください。',
        retryAfter: null
      };
    }

    return { canRequest: true };
  }

  // ユーザー個別の制限チェック
  canUserMakeRequest(userId) {
    const now = Date.now();
    const today = new Date().toDateString();
    const userDailyKey = `${userId}_${today}`;

    // ユーザーの1日制限チェック
    const userDailyCount = this.userDailyUsage.get(userDailyKey) || 0;
    if (userDailyCount >= this.USER_DAILY_LIMIT) {
      return {
        canRequest: false,
        reason: `1日の利用制限（${this.USER_DAILY_LIMIT}回）に達しました。明日再度お試しください。`,
        remaining: 0
      };
    }

    // ユーザーの1時間制限チェック
    const oneHourAgo = now - (60 * 60 * 1000);
    const userTimestamps = this.userHourlyUsage.get(userId) || [];
    const recentRequests = userTimestamps.filter(timestamp => timestamp > oneHourAgo);
    
    if (recentRequests.length >= this.USER_HOURLY_LIMIT) {
      return {
        canRequest: false,
        reason: `1時間の利用制限（${this.USER_HOURLY_LIMIT}回）に達しました。しばらく待ってからお試しください。`,
        remaining: this.USER_DAILY_LIMIT - userDailyCount
      };
    }

    return { 
      canRequest: true, 
      remaining: this.USER_DAILY_LIMIT - userDailyCount 
    };
  }

  // 使用量を記録
  recordUsage(userId) {
    const now = Date.now();
    const today = new Date().toDateString();
    const userDailyKey = `${userId}_${today}`;

    // グローバル使用量記録
    this.requestLog.push(now);
    const todayUsage = this.dailyUsage.get(today) || 0;
    this.dailyUsage.set(today, todayUsage + 1);

    // ユーザー使用量記録
    const userDailyCount = this.userDailyUsage.get(userDailyKey) || 0;
    this.userDailyUsage.set(userDailyKey, userDailyCount + 1);

    const userTimestamps = this.userHourlyUsage.get(userId) || [];
    userTimestamps.push(now);
    this.userHourlyUsage.set(userId, userTimestamps);
  }

  // 使用状況の取得
  getUsageStats() {
    const today = new Date().toDateString();
    const todayUsage = this.dailyUsage.get(today) || 0;
    
    return {
      todayUsage,
      dailyLimit: this.SAFE_DAILY,
      remainingToday: this.SAFE_DAILY - todayUsage,
      currentRPM: this.requestLog.length
    };
  }
}

// グローバルな使用量管理インスタンス
const usageManager = new GeminiUsageManager();

// 入力値のサニタイズ
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>\"'`]/g, '') // 危険な文字を除去
    .trim()
    .substring(0, 500); // 長さ制限
}

// 簡潔なプロンプト生成（トークン節約）
function createCompactPrompt(formData) {
  const planType = sanitizeInput(formData.planType);
  const participants = sanitizeInput(formData.participants);
  const duration = sanitizeInput(formData.duration);
  const location = sanitizeInput(formData.location);
  const budgetRange = sanitizeInput(formData.budget_range || '');
  const preferences = sanitizeInput(formData.preferences || '');

  return `以下の条件で日本円の予算見積もりを簡潔に提案してください：

プラン: ${planType}
参加者: ${participants}
期間: ${duration}
場所: ${location}
希望予算: ${budgetRange || '指定なし'}
要望: ${preferences || 'なし'}

回答形式:
総額: X万円〜Y万円
内訳: 宿泊費X万円、交通費Y万円、その他Z万円

150文字以内で回答してください。`;
}

// Gemini API呼び出し
async function callGeminiAPI(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Gemini APIキーが設定されていません');
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        maxOutputTokens: 200, // 出力制限でコスト管理
        temperature: 0.7
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Gemini API Error: ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  
  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    throw new Error('Gemini APIから有効な応答を取得できませんでした');
  }

  return data.candidates[0].content.parts[0].text;
}

// メインのAPIハンドラー
export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { formData, userId } = req.body;

    // 入力値検証
    if (!formData || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: '必要なデータが不足しています' 
      });
    }

    // 必須フィールドチェック
    const requiredFields = ['planType', 'participants', 'duration', 'location'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `以下の項目は必須です: ${missingFields.join(', ')}`
      });
    }

    // グローバル制限チェック
    const globalCheck = usageManager.canMakeGlobalRequest();
    if (!globalCheck.canRequest) {
      return res.status(429).json({
        success: false,
        error: globalCheck.reason,
        retryAfter: globalCheck.retryAfter
      });
    }

    // ユーザー制限チェック
    const userCheck = usageManager.canUserMakeRequest(userId);
    if (!userCheck.canRequest) {
      return res.status(429).json({
        success: false,
        error: userCheck.reason,
        remaining: userCheck.remaining
      });
    }

    // プロンプト生成
    const prompt = createCompactPrompt(formData);

    // Gemini API呼び出し
    const suggestion = await callGeminiAPI(prompt);

    // 使用量記録
    usageManager.recordUsage(userId);

    // 成功レスポンス
    res.status(200).json({
      success: true,
      suggestion,
      remaining: userCheck.remaining - 1,
      usage: usageManager.getUsageStats()
    });

  } catch (error) {
    console.error('Budget generation error:', error);
    
    // エラーレスポンス
    res.status(500).json({
      success: false,
      error: 'AI提案の生成に失敗しました',
      suggestion: 'AI提案の生成に失敗しました。手動で入力してください。'
    });
  }
}