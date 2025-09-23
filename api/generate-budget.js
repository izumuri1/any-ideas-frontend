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

    // 簡単なGemini APIテスト
    const prompt = `以下の条件で簡潔な予算を提案してください：
プラン: ${formData.planType}
参加者: ${formData.participants}
期間: ${formData.duration}
場所: ${formData.location}

100文字以内で回答してください。`;

    console.log('Calling Gemini API...');
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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
          maxOutputTokens: 150,
          temperature: 0.7
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