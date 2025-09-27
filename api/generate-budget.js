import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  console.log('=== API Called ===');
  console.log('Method:', req.method);
  console.log('Body:', req.body);
  console.log('Env OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
  
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
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'OpenAI APIキーが設定されていません'
      });
    }

    // AI APIへのリクエスト作成
    const prompt = `あなたは日本の予算見積り専門アドバイザーです。

    【条件】
    - プラン内容: ${planType}
    - 参加者人数: ${participants}
    - 期間: ${duration}日
    - 場所: ${location}
    ${budget_range ? `- 希望予算: ${budget_range}` : ''}
    ${preferences ? `- 特記事項: ${preferences}` : ''}

    【思考手順】
    1. 各項目の単価相場を設定（土日祝日割増含む）
    2. 「単価×人数×日数」の形式で各項目を計算
    3. 内訳の合計が総額と一致するか検算

    【出力フォーマット】
    総額予算: XX万円〜YY万円

    内訳:
    - 宿泊費: XX万円（計算式: 単価×人数×泊数）
    - 交通費: XX万円（計算式: 単価×台数など）
    - 食事代: XX万円（計算式: 単価×人数×食数）
    - その他: XX万円（内容と計算根拠）

    合計検算: 宿泊費 + 交通費 + 食事代 + その他 = 総額

    480文字以内で簡潔に。不明確な項目は「推定」と明記。`;

    console.log('Calling OpenAI API...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{
            role: 'user',
            content: prompt
            }],
            max_tokens: 800,
            temperature: 0.1
        })
        });

    console.log('OpenAI API response status:', response.status);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = await response.text();
      }
      console.error('OpenAI API Error Response:', errorData);
      throw new Error(`OpenAI API Error (${response.status}): ${errorData.error?.message || errorData || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('OpenAI API response:', data);
    
    if (!data.choices || data.choices.length === 0) {
    console.error('No choices in response:', data);
    throw new Error('OpenAI APIから応答が返されませんでした');
    }

    const suggestion = data.choices[0].message.content;

    if (!suggestion) {
    console.error('No content in response:', data.choices[0]);
    throw new Error('レスポンスにテキストが含まれていません');
    }

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
        hasApiKey: !!process.env.OPENAI_API_KEY,
        timestamp: new Date().toISOString()
      }
    });
  }
}