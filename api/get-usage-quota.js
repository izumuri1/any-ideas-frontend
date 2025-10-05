import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {

  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'userIdが必要です' 
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const DAILY_LIMIT = 15;

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

    return res.status(200).json({
      success: true,
      usage: {
        daily: {
          used: currentUsage,
          limit: DAILY_LIMIT,
          remaining: DAILY_LIMIT - currentUsage
        }
      }
    });

  } catch (error) {
    console.error('使用回数取得エラー:', error);
    return res.status(500).json({
      success: false,
      error: 'システムエラーが発生しました'
    });
  }
}