import * as XLSX from 'xlsx';
import { InorganicReaction } from '../types';
import { parseInorganicSheet, mergeInorganicReactions } from '../utils/inorganicParser';

// キャッシュの有効期限（1時間）
const CACHE_TTL = 60 * 60 * 1000;

interface CacheEntry {
  data: InorganicReaction[];
  timestamp: number;
}

let inorganicCache: CacheEntry | null = null;

/**
 * キャッシュが有効かどうかをチェック
 */
const isCacheValid = (): boolean => {
  if (!inorganicCache) return false;
  const now = Date.now();
  return (now - inorganicCache.timestamp) < CACHE_TTL;
};

/**
 * Excelファイルを読み込む
 */
const loadExcelFile = async (url: string): Promise<XLSX.WorkBook> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load Excel file: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  return workbook;
};

/**
 * 無機化学反応データを読み込む
 */
export const loadInorganicReactions = async (): Promise<InorganicReaction[]> => {
  // キャッシュが有効な場合はそれを返す
  if (isCacheValid()) {
    return inorganicCache!.data;
  }

  try {
    // Excelファイルのパス（public/data/inorganic/reactions.xlsx または inorganic/無機反応一覧_最新版_問題文付き.xlsx）
    const baseUrl = import.meta.env.BASE_URL || '';
    const excelUrl = `${baseUrl}data/inorganic/reactions.xlsx`;
    
    console.log(`[inorganicLoader] Loading Excel file from: ${excelUrl}`);
    
    const workbook = await loadExcelFile(excelUrl);
    
    // シート名を取得
    const sheetNames = workbook.SheetNames;
    console.log(`[inorganicLoader] Found sheets: ${sheetNames.join(', ')}`);
    
    // 一覧モードのシートを探す（通常は最初のシート）
    let listModeSheet = workbook.Sheets[sheetNames[0]];
    let texModeSheet: XLSX.WorkSheet | null = null;
    
    // TEX形式モードのシートを探す（"TEX"や"TeX"を含むシート名）
    for (const sheetName of sheetNames) {
      if (sheetName.toLowerCase().includes('tex') || sheetName.toLowerCase().includes('mhchem')) {
        texModeSheet = workbook.Sheets[sheetName];
        break;
      }
    }
    
    // シートデータを配列に変換
    const listModeData = XLSX.utils.sheet_to_json(listModeSheet, { header: 1, defval: '' }) as any[][];
    const listModeReactions = parseInorganicSheet(listModeData);
    
    console.log(`[inorganicLoader] Parsed ${listModeReactions.length} reactions from list mode sheet`);
    
    let reactions = listModeReactions;
    
    // TEX形式モードのシートがある場合はマージ
    if (texModeSheet) {
      const texModeData = XLSX.utils.sheet_to_json(texModeSheet, { header: 1, defval: '' }) as any[][];
      const texModeReactions = parseInorganicSheet(texModeData);
      console.log(`[inorganicLoader] Parsed ${texModeReactions.length} reactions from TEX mode sheet`);
      reactions = mergeInorganicReactions(listModeReactions, texModeReactions);
    }
    
    // キャッシュに保存
    inorganicCache = {
      data: reactions,
      timestamp: Date.now()
    };
    
    console.log(`[inorganicLoader] Successfully loaded ${reactions.length} inorganic reactions`);
    return reactions;
  } catch (error) {
    console.error('[inorganicLoader] Failed to load inorganic reactions:', error);
    
    // エラー時はキャッシュをクリア
    inorganicCache = null;
    
    // フォールバック: CSVファイルを試す
    try {
      console.log('[inorganicLoader] Attempting to load from CSV as fallback...');
      const baseUrl = import.meta.env.BASE_URL || '';
      const csvUrl = `${baseUrl}data/inorganic/reactions.csv`;
      const response = await fetch(csvUrl);
      if (response.ok) {
        const csvText = await response.text();
        // CSVパーサーは後で実装（必要に応じて）
        console.warn('[inorganicLoader] CSV fallback not yet implemented');
      }
    } catch (csvError) {
      console.error('[inorganicLoader] CSV fallback also failed:', csvError);
    }
    
    throw error;
  }
};

