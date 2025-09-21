import { supabase } from '../lib/supabase'

export const cleanupOldNotifications = async (): Promise<number> => {
  try {
    const { data, error } = await supabase.rpc('cleanup_old_notifications')
    if (error) throw error
    console.log(`古い通知を${data}件削除しました`)
    return data
  } catch (error) {
    console.error('通知クリーンアップエラー:', error)
    return 0
  }
}