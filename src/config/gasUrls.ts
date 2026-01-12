/**
 * GAS URL定数の一元管理
 * 問題データ/rec/userStatsのURL混線を防ぐため、ここで厳密に定義
 */

/**
 * 問題データ用GAS URL（CSVを返す）
 * 想定: ?type=compounds|reactions|experiment|inorganic-new → CSVまたは {csv:"..."}
 * 
 * 【重要】ヘルスチェック結果により、現在のURLはuserStats専用GASです。
 * 正しい問題データ用GASのURLを設定してください。
 * 
 * 設定方法：
 * 1. GAS_CODE.js をデプロイしたGASプロジェクトのWebアプリURLを取得
 * 2. 環境変数 VITE_GAS_URL_PROBLEM に設定するか、以下のデフォルト値を置き換えてください
 */
export const PROBLEM_BASE_URL = import.meta.env.VITE_GAS_URL_PROBLEM || 
  ''; // 正しい問題データ用GASのURLを設定してください

/**
 * recデータ取得専用GAS URL（JSON配列を返す）
 * 想定: ?action=rec → JSON配列
 * 
 * 【重要】ヘルスチェック結果により、現在のURLはuserStats専用GASです。
 * 正しいrec専用GASのURLを設定してください。
 * 
 * 設定方法：
 * 1. GAS_CODE_REC_ONLY.js をデプロイしたGASプロジェクトのWebアプリURLを取得
 * 2. 環境変数 VITE_GAS_URL_REC に設定するか、以下のデフォルト値を置き換えてください
 */
export const REC_BASE_URL = import.meta.env.VITE_GAS_URL_REC || 
  ''; // 正しいrec専用GASのURLを設定してください

/**
 * userStatsデータ取得専用GAS URL（JSON配列を返す）
 * 想定: ?action=userStats → JSON配列
 * 
 * 【確定】ヘルスチェックにより、このURLは正しく動作しています。
 * GAS_CODE_USERSTATS.js をデプロイしたGASプロジェクトのURLです。
 */
export const STATS_BASE_URL = import.meta.env.VITE_GAS_URL_USERSTATS || 
  'https://script.google.com/macros/s/AKfycbz3dAJzhk6TcRMwHIg-NJvpJ2xiv_utZoQt_I9m5_ZN-usWeL1kpWbLkkJ1k51jSJUK_Q/exec';

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
