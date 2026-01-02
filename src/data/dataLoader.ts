import { Compound } from '../types';
import { parseCSV, csvToCompounds } from '../utils/csvParser';
import { parseReactionCSV, ReactionCSVRow } from '../utils/reactionParser';
import { Category } from '../components/CategorySelector';
import { DATA_SOURCE } from '../config/dataSource';
import { loadCompoundsFromGAS, loadReactionsFromGAS } from './gasLoader';

// キャッシュの有効期限（1時間）
const CACHE_TTL = 60 * 60 * 1000; // 1時間（ミリ秒）

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const compoundCache: Record<Category, CacheEntry<Compound[]> | null> = {
  organic: null,
  inorganic: null,
};

const reactionCache: Record<Category, CacheEntry<ReactionCSVRow[]> | null> = {
  organic: null,
  inorganic: null,
};

/**
 * キャッシュが有効かどうかをチェック
 */
const isCacheValid = <T>(cacheEntry: CacheEntry<T> | null): boolean => {
  if (!cacheEntry) return false;
  const now = Date.now();
  return (now - cacheEntry.timestamp) < CACHE_TTL;
};

/**
 * リトライ付きデータ取得
 */
const fetchWithRetry = async <T>(
  fetchFn: () => Promise<T>,
  maxRetries: number = 2,
  retryDelay: number = 1000
): Promise<T> => {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fetchFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries - 1) {
        console.warn(`Attempt ${attempt + 1} failed, retrying...`, lastError);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  throw lastError || new Error('Unknown error');
};

export const loadCompounds = async (category: Category): Promise<Compound[]> => {
  // キャッシュが有効な場合はそれを返す
  if (isCacheValid(compoundCache[category])) {
    return compoundCache[category]!.data;
  }
  
  // キャッシュをクリア
  compoundCache[category] = null;

  // データソースに応じて読み込み方法を切り替え
  if (DATA_SOURCE === 'gas') {
    try {
      const compounds = await fetchWithRetry(() => loadCompoundsFromGAS(category), 2, 1000);
      if (compounds && Array.isArray(compounds) && compounds.length > 0) {
        compoundCache[category] = { data: compounds, timestamp: Date.now() };
        return compounds;
      }
      console.warn(`GAS returned empty array for ${category}, falling back to CSV`);
    } catch (error) {
      console.warn(`Failed to load compounds from GAS for ${category}, falling back to CSV:`, error);
      // GASが失敗した場合はCSVにフォールバック
    }
  }

  // CSVファイルを読み込む（カテゴリごと）
  try {
    const baseUrl = import.meta.env.BASE_URL || '';
    const response = await fetchWithRetry(
      () => fetch(`${baseUrl}data/${category}/compounds.csv`),
      2,
      1000
    );
    if (!response.ok) {
      throw new Error(`Failed to load ${category}/compounds.csv: ${response.statusText}`);
    }

    const csvText = await response.text();
    if (!csvText || csvText.trim().length === 0) {
      throw new Error(`Empty CSV file for ${category}/compounds.csv`);
    }

    const csvRows = parseCSV(csvText);
    // プリセットデータは使用せず、外部データのみを使用
    const compounds = csvToCompounds(csvRows, []);

    if (compounds && Array.isArray(compounds)) {
      compoundCache[category] = { data: compounds, timestamp: Date.now() };
      return compounds;
    }
    throw new Error('Failed to parse compounds from CSV');
  } catch (error) {
    console.warn(`Failed to load compounds from CSV for ${category}:`, error);
    // フォールバック時もプリセットは使用しない
    return [];
  }
};

export const loadReactions = async (category: Category): Promise<ReactionCSVRow[]> => {
  // キャッシュが有効な場合はそれを返す
  if (isCacheValid(reactionCache[category])) {
    return reactionCache[category]!.data;
  }
  
  // キャッシュをクリア
  reactionCache[category] = null;

  // データソースに応じて読み込み方法を切り替え
  if (DATA_SOURCE === 'gas') {
    try {
      const reactions = await fetchWithRetry(() => loadReactionsFromGAS(category), 2, 1000);
      if (reactions && Array.isArray(reactions) && reactions.length > 0) {
        reactionCache[category] = { data: reactions, timestamp: Date.now() };
        return reactions;
      }
      console.warn(`GAS returned empty array for reactions ${category}, falling back to CSV`);
    } catch (error) {
      console.warn(`Failed to load reactions from GAS for ${category}, falling back to CSV:`, error);
      // GASが失敗した場合はCSVにフォールバック
    }
  }

  // CSVファイルを読み込む
  try {
    const baseUrl = import.meta.env.BASE_URL || '';
    const response = await fetchWithRetry(
      () => fetch(`${baseUrl}data/${category}/reactions.csv`),
      2,
      1000
    );
    if (!response.ok) {
      throw new Error(`Failed to load ${category}/reactions.csv: ${response.statusText}`);
    }

    const csvText = await response.text();
    if (!csvText || csvText.trim().length === 0) {
      throw new Error(`Empty CSV file for ${category}/reactions.csv`);
    }

    const reactions = parseReactionCSV(csvText);

    if (reactions && Array.isArray(reactions)) {
      reactionCache[category] = { data: reactions, timestamp: Date.now() };
      return reactions;
    }
    throw new Error('Failed to parse reactions from CSV');
  } catch (error) {
    console.warn(`Failed to load reactions from CSV for ${category}:`, error);
    return [];
  }
};

