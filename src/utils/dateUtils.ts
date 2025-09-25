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