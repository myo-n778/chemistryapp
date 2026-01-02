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
 * GASをデプロイした後、ここにURLを設定してください
 */
export const GAS_URLS: Record<Category, string> = {
  organic: 'https://script.google.com/macros/s/AKfycbwCnldwaS5elxrV3Iq0Lv0yqbZ9DYT58Y0LHAVeTBlckAm_TXzHWnyWY0apsTy1TS28/exec',
  inorganic: 'https://script.google.com/macros/s/AKfycbwCnldwaS5elxrV3Iq0Lv0yqbZ9DYT58Y0LHAVeTBlckAm_TXzHWnyWY0apsTy1TS28/exec',
};

/**
 * スプレッドシートID（カテゴリごと）
 * GASコード内で使用するスプレッドシートIDを設定してください
 */
export const SPREADSHEET_IDS: Record<Category, string> = {
  organic: '1QxRAbYbN0tA3nmBgT7yL4HhnIPqW_QeFFkzGKkDLda0',
  inorganic: '1QxRAbYbN0tA3nmBgT7yL4HhnIPqW_QeFFkzGKkDLda0',
};

