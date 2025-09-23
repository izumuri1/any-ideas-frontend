// /api/generate-budget.js
// デバッグ用シンプル版

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
    const { formData, userId } = req.body;
    
    // 基本的な入力チェック
    if (!formData || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: '必要なデータが不足しています',
        received: { formData: !!formData, userId: !!userId }
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
    プラン内容: ${formData.planType}
    参加者人数: ${formData.participants}
    期間（日数）: ${formData.duration}
    場所: ${formData.location}
    ${formData.budget_range ? `希望予算: ${formData.budget_range}` : ''}
    ${formData.preferences ? `特記事項: ${formData.preferences}` : ''}

    【出力フォーマット】
    総額予算: XX万円〜YY万円
    内訳:
    - 宿泊費: XX万円
    - 交通費: XX万円
    - 食事代: XX万円
    - その他: XX万円

    【注意事項】
    - 2024年の日本における最新の市場価格や相場を前提とする
    - 希望条件（例:高級旅館、特定エリア等）があれば必ず加味した現実的な価格設定にする
    - 自信の無い項目は「推定」と明記し、可能な範囲で根拠を添える
    - 曖昧な場合も必ず金額レンジ（例：15〜20万円）の形で回答する
    `;

    console.log('Calling Gemini API...');
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`, {
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
          temperature: 0.3
        }
      })
    });

    console.log('Gemini API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API Error:', errorData);
      throw new Error(`Gemini API Error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('Gemini API response:', data);
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Gemini APIから有効な応答を取得できませんでした');
    }

    const suggestion = data.candidates[0].content.parts[0].text;

    // 成功レスポンス
    return res.status(200).json({
      success: true,
      suggestion,
      debug: {
        hasApiKey: !!apiKey,
        formData,
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