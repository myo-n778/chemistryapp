import { Category } from '../components/CategorySelector';
import { PROBLEM_BASE_URL } from './gasUrls';

/**
 * データソースの種類
 */
export type DataSource = 'csv' | 'gas';

/**
 * データソース設定
 * GASを使用する場合は、GASのWebアプリURLを設定してください
 */
export const DATA_SOURCE: DataSource = 'gas'; // 'csv' または 'gas'

/**
 * GAS WebアプリのURL（カテゴリごと）
 * 問題データ用URLは gasUrls.ts の PROBLEM_BASE_URL を一元管理
 * 後方互換性のため、両方のカテゴリで同じURLを使用
 */
export const GAS_URLS: Record<Category, string> = {
  organic: PROBLEM_BASE_URL,
  inorganic: PROBLEM_BASE_URL,
};

// 環境変数が設定されているか検証（開発環境のみ警告）
if (import.meta.env.DEV) {
  console.log(`[DataSource] GAS URLs configured:`, {
    problem: PROBLEM_BASE_URL ? '✓' : '✗',
    dataSource: DATA_SOURCE
  });
}

/**
 * スプレッドシートID（カテゴリごと）
 * 環境変数から取得（GAS_CODE.jsで使用）
 */
export const SPREADSHEET_IDS: Record<Category, string> = {
  organic: import.meta.env.VITE_SPREADSHEET_ID_ORGANIC || '',
  inorganic: import.meta.env.VITE_SPREADSHEET_ID_INORGANIC || '',
};

