/**
 * 日付ユーティリティ（週末・祝日判定）
 *
 * 習慣の週末除外機能で使用。
 */

import holiday_jp from '@holiday-jp/holiday_jp';

/**
 * 指定日が土日祝かどうかを判定
 * @param dateStr YYYY-MM-DD 形式の日付文字列
 * @returns 土曜・日曜・祝日の場合は true
 */
export function isWeekendOrHoliday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;

  const d = new Date(dateStr + 'T12:00:00'); // タイムゾーン回避のため正午で解釈
  const day = d.getDay(); // 0=日, 6=土

  if (day === 0 || day === 6) return true;

  return holiday_jp.isHoliday(d);
}

/**
 * 指定日が weekday（月〜金で祝日でない）かどうか
 * 習慣の進捗率計算で「カウント対象日」の判定に使用
 */
export function isWeekday(dateStr: string): boolean {
  return !isWeekendOrHoliday(dateStr);
}

/**
 * 日本時間の「今日」の日付から N 日前を YYYY-MM-DD で返す（カレンダー上の日数）
 * ヘッダー未確定の集計ウィンドウ下限などに使用
 */
export function getDateStringDaysAgoJST(daysAgo: number): string {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' })
  const todayStr = fmt.format(new Date())
  const [y, m, d] = todayStr.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d))
  utc.setUTCDate(utc.getUTCDate() - daysAgo)
  const y2 = utc.getUTCFullYear()
  const m2 = utc.getUTCMonth() + 1
  const d2 = utc.getUTCDate()
  return `${y2}-${String(m2).padStart(2, '0')}-${String(d2).padStart(2, '0')}`
}
