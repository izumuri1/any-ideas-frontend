import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  console.log('=== API Called ===');
  console.log('Method:', req.method);
  console.log('Body:', req.body);
  console.log('Env GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
  
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { planType, participants, duration, location, budget_range, preferences, userId } = req.body;
    
    // 基本的な入力チェック
    if (!planType || !participants || !duration || !location || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: '必要なデータが不足しています',
        received: { planType: !!planType, participants: !!participants, duration: !!duration, location: !!location, userId: !!userId }
      });
    }

    // 使用回数制限チェック
    const today = new Date().toISOString().split('T')[0];
    
    // 今日の使用回数を取得
    const { data: usageData, error: fetchError } = await supabase
      .from('ai_usage_quotas')
      .select('daily_count')
      .eq('user_id', userId)
      .eq('usage_date', today)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('使用回数取得エラー:', fetchError);
      return res.status(500).json({
        success: false,
        error: 'システムエラーが発生しました'
      });
    }

    const currentUsage = usageData?.daily_count || 0;
    const DAILY_LIMIT = 15;

    // 制限チェック
    if (currentUsage >= DAILY_LIMIT) {
      return res.status(429).json({
        success: false,
        error: 'quota_exceeded',
        message: `本日のAI使用回数が上限（${DAILY_LIMIT}回）に達しました。明日の0時にリセットされます。`,
        usage: {
          daily: {
            used: currentUsage,
            limit: DAILY_LIMIT,
            remaining: 0
          }
        }
      });
    }

    // APIキーの存在確認
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'Gemini APIキーが設定されていません'
      });
    }

    // Gemini APIへのリクエスト作成
    const prompt = `
    あなたは2024年の日本における予算見積り専門のアドバイザーです。
    【依頼内容】
    下記条件に基づき、現実的な予算を詳細に見積もってください。
    必ず各項目に実際の物価を考慮してください。土日や祝日割増も計算に入れてください。
    【条件】
    プラン内容: ${planType}
    参加者人数: ${participants}
    期間（日数）: ${duration}
    場所: ${location}
    ${budget_range ? `希望予算: ${budget_range}` : ''}
    ${preferences ? `特記事項: ${preferences}` : ''}
    【出力フォーマット】
    総額予算: XX万円〜YY万円
    内訳:
    - 宿泊費: XX万円
    - 交通費: XX万円
    - 食事代: XX万円
    - その他: XX万円
    【注意事項】
    - 回答は480文字以内で簡潔にまとめてください
    - 質問が行われた時点の日本における最新の市場価格や相場を前提とする
    - 希望条件（例:高級旅館、特定エリア等）があれば必ず加味した現実的な価格設定にする
    - 自信の無い項目は「推定」と明記し、可能な範囲で根拠を添える
    - 曖昧な場合も必ず金額レンジ（例：15〜20万円）の形で回答する
    - 必ず計算を二重チェックし、各内訳の合計が総額予算と一致するようにしてください
    - 人数と単価の計算は特に慎重に行い、明確な根拠を示してください
    【計算チェック必須】
    回答前に以下を確認してください：
    1. 人数 × 単価の計算が正しいか
    2. 各項目（宿泊費+交通費+食事代+その他）の合計が総額予算の範囲内か
    3. 単価が現実的な相場に合っているか
    `;

    console.log('Calling Gemini API...');
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
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
          maxOutputTokens: 800,
          temperature: 0.1
        }
      })
    });

    console.log('Gemini API response status:', response.status);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = await response.text();
      }
      console.error('Gemini API Error Response:', errorData);
      throw new Error(`Gemini API Error (${response.status}): ${errorData.error?.message || errorData || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('Gemini API response:', data);
    
    if (!data.candidates || data.candidates.length === 0) {
      console.error('No candidates in response:', data);
      throw new Error('Gemini APIから候補が返されませんでした');
    }

    if (!data.candidates[0].content || !data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0) {
      console.error('Invalid content structure:', data.candidates[0]);
      throw new Error('Gemini APIのレスポンス構造が不正です');
    }

    const suggestion = data.candidates[0].content.parts[0].text;

    // 使用回数を更新（UPSERT）
    const newUsageCount = currentUsage + 1;
    const { error: upsertError } = await supabase
      .from('ai_usage_quotas')
      .upsert({
        user_id: userId,
        usage_date: today,
        daily_count: newUsageCount,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,usage_date'
      });

    if (upsertError) {
      console.error('使用回数更新エラー:', upsertError);
      // エラーが発生してもAI提案は返す（課金されたため）
    }

    // 成功レスポンス
    return res.status(200).json({
      success: true,
      suggestion,
      usage: {
        daily: {
          used: newUsageCount,
          limit: DAILY_LIMIT,
          remaining: DAILY_LIMIT - newUsageCount
        }
      },
      debug: {
        hasApiKey: !!apiKey,
        requestData: { planType, participants, duration, location, budget_range, preferences },
        userId
      }
    });

  } catch (error) {
    console.error('=== Error Details ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return res.status(500).json({
      success: false,
      error: 'AI提案の生成に失敗しました',
      details: error.message,
      debug: {
        hasApiKey: !!process.env.GEMINI_API_KEY,
        timestamp: new Date().toISOString()
      }
    });
  }
}