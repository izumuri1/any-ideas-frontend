/**
 * 日付を「yyyy/m/d(曜日)」形式でフォーマットする
 */
export const formatDateWithDayOfWeek = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
  
  return `${year}/${month}/${day}(${dayOfWeek})`;
};

/**
 * 期間を「yyyy/m/d(曜日)～yyyy/m/d(曜日)」形式でフォーマットする
 */
export const formatPeriodWithDayOfWeek = (startDate: Date, endDate: Date): string => {
  return `${formatDateWithDayOfWeek(startDate)}～${formatDateWithDayOfWeek(endDate)}`;
};

/**
 * 日本語の年月文字列をパースする
 * @param dateStr - "2024年3月" 形式の文字列
 * @returns パース結果 {year: number, month: number}
 */
export const parseJapaneseDate = (dateStr: string) => {
  const match = dateStr.match(/(\d{4})年(\d{1,2})月/);
  if (!match) return { year: 0, month: 0 };
  return { year: parseInt(match[1]), month: parseInt(match[2]) };
};

/**
 * when_textフィールドで日本語の年月順にソートする
 * @param items - ソート対象の配列
 * @returns ソート済みの配列
 */
export const sortByWhenText = <T extends { when_text: string | null }>(items: T[]): T[] => {
  return items.sort((a, b) => {
    // nullや空文字の場合は最後に配置
    if (!a.when_text && !b.when_text) return 0;
    if (!a.when_text) return 1;
    if (!b.when_text) return -1;
    
    // 日本語の年月を数値に変換してソート
    const dateA = parseJapaneseDate(a.when_text);
    const dateB = parseJapaneseDate(b.when_text);
    
    // 年で比較
    if (dateA.year !== dateB.year) {
      return dateA.year - dateB.year;
    }
    
    // 年が同じ場合は月で比較
    return dateA.month - dateB.month;
  });
};