import { Compound, InorganicReaction } from '../types';
import { parseCSV, csvToCompounds } from '../utils/csvParser';
import { parseReactionCSV, ReactionCSVRow } from '../utils/reactionParser';
import { parseExperimentCSV, ExperimentCSVRow } from '../utils/experimentParser';
import { Category } from '../components/CategorySelector';
import { DATA_SOURCE } from '../config/dataSource';
import { loadCompoundsFromGAS, loadReactionsFromGAS, loadExperimentsFromGAS } from './gasLoader';
import { loadInorganicReactions } from './inorganicLoader';

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

const experimentCache: Record<Category, CacheEntry<ExperimentCSVRow[]> | null> = {
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

// localStorage用のキー
const getLocalStorageKey = (category: Category, type: 'compounds' | 'reactions' | 'experiments'): string => {
  return `chemistry_app_cache_${category}_${type}`;
};

// localStorageからキャッシュを読み込む
const loadFromLocalStorage = <T>(category: Category, type: 'compounds' | 'reactions' | 'experiments'): CacheEntry<T> | null => {
  try {
    const key = getLocalStorageKey(category, type);
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const entry: CacheEntry<T> = JSON.parse(stored);
    const now = Date.now();
    if ((now - entry.timestamp) < CACHE_TTL) {
      return entry;
    }
    // 期限切れの場合は削除
    localStorage.removeItem(key);
    return null;
  } catch (error) {
    console.warn(`Failed to load cache from localStorage for ${category}/${type}:`, error);
    return null;
  }
};

// localStorageにキャッシュを保存
const saveToLocalStorage = <T>(category: Category, type: 'compounds' | 'reactions' | 'experiments', data: T): void => {
  try {
    const key = getLocalStorageKey(category, type);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.warn(`Failed to save cache to localStorage for ${category}/${type}:`, error);
    // localStorageが満杯の場合などは無視
  }
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
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        console.warn(`Attempt ${attempt + 1} failed, retrying...`, lastError);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  throw lastError || new Error('Unknown error');
};

export const loadCompounds = async (category: Category): Promise<Compound[]> => {
  // メモリキャッシュが有効な場合はそれを返す（ただし、空配列はキャッシュしない）
  if (isCacheValid(compoundCache[category])) {
    const cachedData = compoundCache[category]!.data;
    if (cachedData && cachedData.length > 0) {
      return cachedData;
    }
    // キャッシュが空配列の場合は再取得を試みる
    compoundCache[category] = null;
  }
  
  // localStorageキャッシュをチェック
  const localStorageCache = loadFromLocalStorage<Compound[]>(category, 'compounds');
  if (localStorageCache) {
    console.log(`[${category}] Using compounds cache from localStorage`);
    // メモリキャッシュにも反映
    compoundCache[category] = localStorageCache;
    return localStorageCache.data;
  }

  // データソースに応じて読み込み方法を切り替え
  if (DATA_SOURCE === 'gas') {
    console.log(`[${category}] Attempting to load compounds from GAS...`);
    try {
      const compounds = await fetchWithRetry(() => loadCompoundsFromGAS(category), 2, 1000);
      if (compounds && Array.isArray(compounds) && compounds.length > 0) {
        console.log(`[${category}] Successfully loaded ${compounds.length} compounds from GAS`);
        const cacheEntry = { data: compounds, timestamp: Date.now() };
        compoundCache[category] = cacheEntry;
        saveToLocalStorage(category, 'compounds', compounds);
        return compounds;
      }
      console.warn(`[${category}] GAS returned empty array, falling back to CSV`);
    } catch (error) {
      console.warn(`[${category}] Failed to load compounds from GAS, falling back to CSV:`, error);
      // GASが失敗した場合はCSVにフォールバック
    }
  } else {
    console.log(`[${category}] DATA_SOURCE is '${DATA_SOURCE}', loading from CSV`);
  }

  // CSVファイルを読み込む（カテゴリごと）
  console.log(`[${category}] Loading compounds from CSV file...`);
  try {
    const baseUrl = import.meta.env.BASE_URL || '';
    const csvUrl = `${baseUrl}data/${category}/compounds.csv`;
    console.log(`[${category}] Fetching CSV from: ${csvUrl}`);
    const response = await fetchWithRetry(
      () => fetch(csvUrl),
      2,
      1000
    );
    if (!response.ok) {
      throw new Error(`Failed to load ${category}/compounds.csv: ${response.status} ${response.statusText}`);
    }

    const csvText = await response.text();
    if (!csvText || csvText.trim().length === 0) {
      throw new Error(`Empty CSV file for ${category}/compounds.csv`);
    }

    const csvRows = parseCSV(csvText);
    console.log(`[${category}] Parsed ${csvRows.length} rows from CSV`);
    // プリセットデータは使用せず、外部データのみを使用
    const compounds = csvToCompounds(csvRows, []);

    if (compounds && Array.isArray(compounds) && compounds.length > 0) {
      console.log(`[${category}] Successfully loaded ${compounds.length} compounds from CSV`);
      const cacheEntry = { data: compounds, timestamp: Date.now() };
      compoundCache[category] = cacheEntry;
      saveToLocalStorage(category, 'compounds', compounds);
      return compounds;
    }
    throw new Error('Failed to parse compounds from CSV or empty result');
  } catch (error) {
    console.error(`Failed to load compounds from CSV for ${category}:`, error);
    // エラー時はキャッシュをクリアして空配列を返す
    compoundCache[category] = null;
    throw error; // エラーを再スローしてApp.tsxでエラー表示させる
  }
};

export const loadReactions = async (category: Category): Promise<ReactionCSVRow[]> => {
  // メモリキャッシュが有効な場合はそれを返す
  if (isCacheValid(reactionCache[category])) {
    return reactionCache[category]!.data;
  }
  
  // localStorageキャッシュをチェック
  const localStorageCache = loadFromLocalStorage<ReactionCSVRow[]>(category, 'reactions');
  if (localStorageCache) {
    console.log(`[${category}] Using reactions cache from localStorage`);
    reactionCache[category] = localStorageCache;
    return localStorageCache.data;
  }
  
  // キャッシュをクリア
  reactionCache[category] = null;

  // データソースに応じて読み込み方法を切り替え
  if (DATA_SOURCE === 'gas') {
    try {
      const reactions = await fetchWithRetry(() => loadReactionsFromGAS(category), 2, 1000);
      if (reactions && Array.isArray(reactions) && reactions.length > 0) {
        const cacheEntry = { data: reactions, timestamp: Date.now() };
        reactionCache[category] = cacheEntry;
        saveToLocalStorage(category, 'reactions', reactions);
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
      console.log(`[dataLoader] Loaded ${reactions.length} reactions for ${category}`);
      const cacheEntry = { data: reactions, timestamp: Date.now() };
      reactionCache[category] = cacheEntry;
      saveToLocalStorage(category, 'reactions', reactions);
      return reactions;
    }
    throw new Error('Failed to parse reactions from CSV');
  } catch (error) {
    console.warn(`Failed to load reactions from CSV for ${category}:`, error);
    return [];
  }
};

export const loadExperiments = async (category: Category): Promise<ExperimentCSVRow[]> => {
  // メモリキャッシュが有効な場合はそれを返す
  if (isCacheValid(experimentCache[category])) {
    return experimentCache[category]!.data;
  }
  
  // localStorageキャッシュをチェック
  const localStorageCache = loadFromLocalStorage<ExperimentCSVRow[]>(category, 'experiments');
  if (localStorageCache) {
    console.log(`[${category}] Using experiments cache from localStorage`);
    experimentCache[category] = localStorageCache;
    return localStorageCache.data;
  }
  
  // キャッシュをクリア
  experimentCache[category] = null;

  // データソースに応じて読み込み方法を切り替え
  if (DATA_SOURCE === 'gas') {
    try {
      const experiments = await fetchWithRetry(() => loadExperimentsFromGAS(category), 2, 1000);
      if (experiments && Array.isArray(experiments) && experiments.length > 0) {
        const cacheEntry = { data: experiments, timestamp: Date.now() };
        experimentCache[category] = cacheEntry;
        saveToLocalStorage(category, 'experiments', experiments);
        return experiments;
      }
      console.warn(`GAS returned empty array for experiments ${category}, falling back to CSV`);
    } catch (error) {
      console.warn(`Failed to load experiments from GAS for ${category}, falling back to CSV:`, error);
      // GASが失敗した場合はCSVにフォールバック
    }
  }

  // CSVファイルを読み込む
  try {
    const baseUrl = import.meta.env.BASE_URL || '';
    const response = await fetchWithRetry(
      () => fetch(`${baseUrl}data/${category}/experiment.csv`),
      2,
      1000
    );
    if (!response.ok) {
      throw new Error(`Failed to load ${category}/experiment.csv: ${response.statusText}`);
    }

    const csvText = await response.text();
    if (!csvText || csvText.trim().length === 0) {
      throw new Error(`Empty CSV file for ${category}/experiment.csv`);
    }

    const experiments = parseExperimentCSV(csvText);

    if (experiments && Array.isArray(experiments)) {
      console.log(`[dataLoader] Loaded ${experiments.length} experiments for ${category}`);
      const cacheEntry = { data: experiments, timestamp: Date.now() };
      experimentCache[category] = cacheEntry;
      saveToLocalStorage(category, 'experiments', experiments);
      return experiments;
    }
    throw new Error('Failed to parse experiments from CSV');
  } catch (error) {
    console.warn(`Failed to load experiments from CSV for ${category}:`, error);
    return [];
  }
};

/**
 * 無機化学反応データを読み込む
 * 新しいExcel形式（問題バンク_TEX）を優先的に読み込む
 */
export const loadInorganicReactionsData = async (): Promise<InorganicReaction[]> => {
  try {
    // 新しいExcel形式を優先的に読み込む
    const { loadInorganicQuizQuestions } = await import('./inorganicQuizLoader');
    try {
      const quizQuestions = await loadInorganicQuizQuestions();
      if (quizQuestions.length > 0) {
        console.log(`[dataLoader] Loaded ${quizQuestions.length} quiz questions from new Excel format`);
        return quizQuestions;
      }
    } catch (quizError) {
      console.warn('[dataLoader] Failed to load new Excel format, falling back to old format:', quizError);
    }
    
    // フォールバック: 既存の形式を読み込む
    return await loadInorganicReactions();
  } catch (error) {
    console.error('Failed to load inorganic reactions:', error);
    return [];
  }
};

