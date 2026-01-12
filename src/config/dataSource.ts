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
  organic: import.meta.env.VITE_GAS_URL_ORGANIC || 'https://script.google.com/macros/s/AKfycbxXc3xz7seg_3x7NouBO3OzDYxYMfCAZib9CqRFVdpEMEtEScKp5jdCFNdjRsIkIgFRWw/exec',
  inorganic: import.meta.env.VITE_GAS_URL_INORGANIC || 'https://script.google.com/macros/s/AKfycbxXc3xz7seg_3x7NouBO3OzDYxYMfCAZib9CqRFVdpEMEtEScKp5jdCFNdjRsIkIgFRWw/exec',
};

/**
 * recデータ取得専用のGAS URL
 * 問題データ用APIとは完全に分離
 * 環境変数から取得。設定されていない場合は新しいGAS URLを使用
 */
export const GAS_URL_REC: string = import.meta.env.VITE_GAS_URL_REC || 'https://script.google.com/macros/s/AKfycby56m2gHAx33pyEKAk1tzzxBG5GJ1BGFmeUPmNj66j0LZG1fjzZu20ZfwEfCC13YjLExw/exec';

// 環境変数が設定されているか検証（開発環境のみ警告）
if (import.meta.env.DEV) {
  if (!GAS_URLS.organic || !GAS_URLS.inorganic) {
    console.warn('GAS URLs are not configured. Please set VITE_GAS_URL_ORGANIC and VITE_GAS_URL_INORGANIC environment variables.');
  } else {
    console.log(`[DataSource] GAS URLs configured:`, {
      organic: GAS_URLS.organic ? '✓' : '✗',
      inorganic: GAS_URLS.inorganic ? '✓' : '✗',
      dataSource: DATA_SOURCE
    });
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

