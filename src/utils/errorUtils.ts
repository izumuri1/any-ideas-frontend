// src/utils/errorUtils.ts (新規作成)
/**
 * アプリケーション共通のエラーハンドリング
 */
export const handleError = (error: any, message: string) => {
  console.error(message, error);
  alert(message);
};

/**
 * Supabaseエラー専用のハンドリング（詳細ログ出力）
 */
export const handleSupabaseError = (error: any, context: string) => {
  console.error(`${context}でSupabaseエラー:`, {
    code: error?.code,
    message: error?.message,
    details: error?.details,
    hint: error?.hint
  });
  
  const userMessage = error?.message || `${context}に失敗しました`;
  alert(userMessage);
};