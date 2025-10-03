import DOMPurify from 'dompurify';

/**
 * ユーザー入力をサニタイズしてXSS攻撃を防ぐ
 * @param dirty - サニタイズ対象の文字列
 * @returns サニタイズされた安全な文字列
 */
export const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // HTMLタグを一切許可しない
    ALLOWED_ATTR: [], // 属性も許可しない
    KEEP_CONTENT: true // タグは削除するが、テキスト内容は保持
  });
};

/**
 * サニタイズ済みHTMLを安全に表示するためのprops生成
 * dangerouslySetInnerHTMLで使用
 */
export const createSafeHtml = (dirty: string) => {
  return { __html: sanitizeHtml(dirty) };
};