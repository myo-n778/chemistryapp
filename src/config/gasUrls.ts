/**
 * GAS URL定数の一元管理
 * 問題データ/rec/userStatsのURL混線を防ぐため、ここで厳密に定義
 */

/**
 * 問題データ用GAS URL（CSVを返す）
 * 想定: ?type=compounds|reactions|experiment|inorganic-new → CSVまたは {csv:"..."}
 */
export const PROBLEM_BASE_URL = import.meta.env.VITE_GAS_URL_PROBLEM || 
  'https://script.google.com/macros/s/AKfycbxU4eANa9Q0t77ZftT2EFHvGfGSHloB1e0G3IZ86bk5uBZVII-IY_9FDpV8t1AkZtxh_w/exec';

/**
 * recデータ取得専用GAS URL（JSON配列を返す）
 * 想定: ?action=rec → JSON配列
 */
export const REC_BASE_URL = import.meta.env.VITE_GAS_URL_REC || 
  'https://script.google.com/macros/s/AKfycbz3dAJzhk6TcRMwHIg-NJvpJ2xiv_utZoQt_I9m5_ZN-usWeL1kpWbLkkJ1k51jSJUK_Q/exec';

/**
 * userStatsデータ取得専用GAS URL（JSON配列を返す）
 * 想定: ?action=userStats → JSON配列
 */
export const STATS_BASE_URL = import.meta.env.VITE_GAS_URL_USERSTATS || 
  'https://script.google.com/macros/s/AKfycbzYBUA5VdUzyGu83FxL-DZ1O_DZogjV149BVaDrbLiH8t4m-IyljrfX1p4EsrIe2gZ8zw/exec';

/**
 * 直叩き検証用URL（コメント）
 * 
 * A) 問題データ: PROBLEM_BASE_URL?type=compounds
 *    期待: メタン等のCSVが返る（{csv:"..."} または CSV文字列）
 * 
 * B) recデータ: REC_BASE_URL?action=rec
 *    期待: JSON配列が返る（csvフィールド無し）
 * 
 * C) userStatsデータ: STATS_BASE_URL?action=userStats
 *    期待: JSON配列が返る（csvフィールド無し）
 */

// 開発環境でのURL検証ログ
if (import.meta.env.DEV) {
  console.log('[gasUrls] GAS URLs configured:', {
    problem: PROBLEM_BASE_URL ? '✓' : '✗',
    rec: REC_BASE_URL ? '✓' : '✗',
    stats: STATS_BASE_URL ? '✓' : '✗',
  });
}
