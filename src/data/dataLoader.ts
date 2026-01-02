import { Compound } from '../types';
import { parseCSV, csvToCompounds, CompoundCSVRow } from '../utils/csvParser';
import { parseReactionCSV, ReactionCSVRow } from '../utils/reactionParser';
import { compounds as defaultOrganicCompounds } from './compounds';
import { Category } from '../components/CategorySelector';
import { DATA_SOURCE } from '../config/dataSource';
import { loadCompoundsFromGAS, loadReactionsFromGAS } from './gasLoader';

const compoundCache: Record<Category, Compound[] | null> = {
  organic: null,
  inorganic: null,
};

const reactionCache: Record<Category, ReactionCSVRow[] | null> = {
  organic: null,
  inorganic: null,
};

export const loadCompounds = async (category: Category): Promise<Compound[]> => {
  if (compoundCache[category]) {
    return compoundCache[category]!;
  }

  // データソースに応じて読み込み方法を切り替え
  if (DATA_SOURCE === 'gas') {
    try {
      const compounds = await loadCompoundsFromGAS(category);
      compoundCache[category] = compounds;
      return compounds;
    } catch (error) {
      console.warn(`Failed to load compounds from GAS for ${category}, falling back to CSV:`, error);
      // GASが失敗した場合はCSVにフォールバック
    }
  }

  // CSVファイルを読み込む（カテゴリごと）
  try {
    const response = await fetch(`/data/${category}/compounds.csv`);
    if (!response.ok) {
      throw new Error(`Failed to load ${category}/compounds.csv`);
    }

    const csvText = await response.text();
    const csvRows = parseCSV(csvText);
    // プリセットデータは使用せず、外部データのみを使用
    const compounds = csvToCompounds(csvRows, []);

    compoundCache[category] = compounds;
    return compounds;
  } catch (error) {
    console.warn(`Failed to load compounds from CSV for ${category}:`, error);
    // フォールバック時もプリセットは使用しない
    return [];
  }
};

export const loadReactions = async (category: Category): Promise<ReactionCSVRow[]> => {
  if (reactionCache[category]) {
    return reactionCache[category]!;
  }

  // データソースに応じて読み込み方法を切り替え
  if (DATA_SOURCE === 'gas') {
    try {
      const reactions = await loadReactionsFromGAS(category);
      reactionCache[category] = reactions;
      return reactions;
    } catch (error) {
      console.warn(`Failed to load reactions from GAS for ${category}, falling back to CSV:`, error);
      // GASが失敗した場合はCSVにフォールバック
    }
  }

  // CSVファイルを読み込む
  try {
    const response = await fetch(`/data/${category}/reactions.csv`);
    if (!response.ok) {
      throw new Error(`Failed to load ${category}/reactions.csv`);
    }

    const csvText = await response.text();
    const reactions = parseReactionCSV(csvText);

    reactionCache[category] = reactions;
    return reactions;
  } catch (error) {
    console.warn(`Failed to load reactions from CSV for ${category}:`, error);
    return [];
  }
};

