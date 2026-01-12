/**
 * GAS URL定数の一元管理
 * 問題データ/rec/userStatsのURL混線を防ぐため、ここで厳密に定義
 */

/**
 * 統合GAS URL（問題CSV / rec / userStats を1本で運用）
 * 
 * 【重要】統合GAS（GAS_CODE_UNIFIED.js）を使用しています。
 * 3つのURL（PROBLEM_BASE_URL, REC_BASE_URL, STATS_BASE_URL）はすべて同じ統合GASのURLを指します。
 * 
 * 統合GASのAPI仕様：
 * - ?type=compounds|reactions|experiment|inorganic-new → {csv:"..."}（問題データ）
 * - ?action=rec → JSON配列（recデータ）
 * - ?action=userStats → JSON配列（userStatsデータ）
 * - ?action=health → ヘルスチェック情報
 * - POST → recに追記＋userStatsを加算更新
 */
const UNIFIED_GAS_URL = 'https://script.google.com/macros/s/AKfycbz5Tsfh3Ky6Wim2IB0Gsw68C5z-p8nwKXaCSpGOIUL2kh-DgVek3C3iXvAbSw0kqmeE5A/exec';

/**
 * 問題データ用GAS URL（CSVを返す）
 * 想定: ?type=compounds|reactions|experiment|inorganic-new → CSVまたは {csv:"..."}
 * 
 * 【統合GAS使用】統合GASのURLを使用（action判定よりtype判定が優先される）
 */
export const PROBLEM_BASE_URL = import.meta.env.VITE_GAS_URL_PROBLEM || UNIFIED_GAS_URL;

/**
 * recデータ取得専用GAS URL（JSON配列を返す）
 * 想定: ?action=rec → JSON配列
 * 
 * 【統合GAS使用】統合GASのURLを使用（action=recで取得）
 */
export const REC_BASE_URL = import.meta.env.VITE_GAS_URL_REC || UNIFIED_GAS_URL;

/**
 * userStatsデータ取得専用GAS URL（JSON配列を返す）
 * 想定: ?action=userStats → JSON配列
 * 
 * 【統合GAS使用】統合GASのURLを使用（action=userStatsで取得）
 */
export const STATS_BASE_URL = import.meta.env.VITE_GAS_URL_USERSTATS || UNIFIED_GAS_URL;

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
