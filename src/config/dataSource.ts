import { Category } from '../components/CategorySelector';

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
 * 環境変数から取得。設定されていない場合は空文字列を返す
 */
export const GAS_URLS: Record<Category, string> = {
  organic: import.meta.env.VITE_GAS_URL_ORGANIC || '',
  inorganic: import.meta.env.VITE_GAS_URL_INORGANIC || '',
};

// 環境変数が設定されているか検証（開発環境のみ警告）
if (import.meta.env.DEV) {
  if (!GAS_URLS.organic || !GAS_URLS.inorganic) {
    console.warn('GAS URLs are not configured. Please set VITE_GAS_URL_ORGANIC and VITE_GAS_URL_INORGANIC environment variables.');
  }
}

/**
 * スプレッドシートID（カテゴリごと）
 * 環境変数から取得（GAS_CODE.jsで使用）
 */
export const SPREADSHEET_IDS: Record<Category, string> = {
  organic: import.meta.env.VITE_SPREADSHEET_ID_ORGANIC || '',
  inorganic: import.meta.env.VITE_SPREADSHEET_ID_INORGANIC || '',
};

