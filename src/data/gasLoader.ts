import { Compound } from '../types';
import { Category } from '../components/CategorySelector';
import { GAS_URLS } from '../config/dataSource';
import { parseCSV, csvToCompounds } from '../utils/csvParser';
import { parseReactionCSV, ReactionCSVRow } from '../utils/reactionParser';
import { parseExperimentCSV, ExperimentCSVRow } from '../utils/experimentParser';
import { InorganicReactionNew } from '../types/inorganic';

/**
 * GASから化合物データを取得
 */
export const loadCompoundsFromGAS = async (category: Category): Promise<Compound[]> => {
  const gasUrl = GAS_URLS[category];

  if (!gasUrl) {
    throw new Error(`GAS URL not configured for category: ${category}`);
  }

  try {
    // GASエンドポイントからデータを取得（タイムアウト付き）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒タイムアウト

    let response: Response;
    try {
      response = await fetch(`${gasUrl}?type=compounds&category=${category}`, {
        method: 'GET',
        mode: 'cors', // CORS対応が必要
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error('Request timeout: GAS took too long to respond');
      }
      throw fetchError;
    }

    if (!response.ok) {
      throw new Error(`Failed to load compounds from GAS: ${response.status} ${response.statusText}`);
    }

    let data: any;
    try {
      data = await response.json();
    } catch (jsonError) {
      throw new Error('Failed to parse JSON response from GAS');
    }

    if (!data || (typeof data !== 'object')) {
      throw new Error('Invalid response format from GAS');
    }

    console.log(`[${category}] GAS response received`);

    // GASから返されるデータ形式に応じて処理
    if (data.csv) {
      // CSV形式で返される場合
      const csvRows = parseCSV(data.csv);
      console.log(`[${category}] Parsed ${csvRows.length} CSV rows from GAS`);

      // デフォルトデータ（defaultOrganicCompounds）は使用せず、GASからのデータのみを使用する
      // これにより、スプレッドシートのデータが確実に優先される
      const compounds = csvToCompounds(csvRows, []);
      console.log(`[${category}] Converted to ${compounds.length} compounds from GAS`);

      // デバッグ: 全化合物名を出力
      console.log(`[${category}] All compound names:`, compounds.map(c => c.name));

      if (compounds.length === 0) {
        // GASデータが空の場合のみ警告を出すが、デフォルトフォールバックはしない
        console.warn('No compounds found in GAS data.');
        return [];
      }

      return compounds;
    } else if (data.compounds) {
      // 既にパース済みの化合物データが返される場合
      return data.compounds as Compound[];
    } else if (data.error) {
      throw new Error(`GAS error: ${data.error}`);
    } else {
      throw new Error('Invalid data format from GAS. Expected "csv" or "compounds" field.');
    }
  } catch (error) {
    console.error(`Failed to load compounds from GAS for ${category}:`, error);
    // フォールバック: 有機化学の場合でもデフォルトデータを返さない（スプレッドシート優先）
    // 必要なら空配列を返してエラー表示させる
    if (category === 'organic') {
      console.warn('Failed to load GAS data. Returning empty array to avoid stale data.');
      return [];
    }
    throw error;
  }
};

/**
 * GASから反応データを取得
 */
export const loadReactionsFromGAS = async (category: Category): Promise<ReactionCSVRow[]> => {
  const gasUrl = GAS_URLS[category];

  if (!gasUrl) {
    throw new Error(`GAS URL not configured for category: ${category}`);
  }

  try {
    // GASエンドポイントからデータを取得（タイムアウト付き）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒タイムアウト

    let response: Response;
    try {
      response = await fetch(`${gasUrl}?type=reactions&category=${category}`, {
        method: 'GET',
        mode: 'cors',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error('Request timeout: GAS took too long to respond');
      }
      throw fetchError;
    }

    if (!response.ok) {
      throw new Error(`Failed to load reactions from GAS: ${response.status} ${response.statusText}`);
    }

    let data: any;
    try {
      data = await response.json();
    } catch (jsonError) {
      throw new Error('Failed to parse JSON response from GAS');
    }

    if (!data || (typeof data !== 'object')) {
      throw new Error('Invalid response format from GAS');
    }

    if (data.csv) {
      // CSV形式で返される場合
      return parseReactionCSV(data.csv);
    } else if (data.reactions) {
      // 既にパース済みの反応データが返される場合
      return data.reactions as ReactionCSVRow[];
    } else {
      throw new Error('Invalid data format from GAS');
    }
  } catch (error) {
    console.error(`Failed to load reactions from GAS for ${category}:`, error);
    return [];
  }
};

/**
 * GASからexperimentシートのデータを取得
 */
export const loadExperimentsFromGAS = async (category: Category): Promise<ExperimentCSVRow[]> => {
  const gasUrl = GAS_URLS[category];

  if (!gasUrl) {
    throw new Error(`GAS URL not configured for category: ${category}`);
  }

  try {
    // GASエンドポイントからデータを取得（タイムアウト付き）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒タイムアウト

    let response: Response;
    try {
      response = await fetch(`${gasUrl}?type=experiment&category=${category}`, {
        method: 'GET',
        mode: 'cors',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error('Request timeout: GAS took too long to respond');
      }
      throw fetchError;
    }

    if (!response.ok) {
      throw new Error(`Failed to load experiments from GAS: ${response.status} ${response.statusText}`);
    }

    let data: any;
    try {
      data = await response.json();
    } catch (jsonError) {
      throw new Error('Failed to parse JSON response from GAS');
    }

    if (!data || (typeof data !== 'object')) {
      throw new Error('Invalid response format from GAS');
    }

    if (data.csv) {
      // CSV形式で返される場合
      return parseExperimentCSV(data.csv);
    } else if (data.experiments) {
      // 既にパース済みのexperimentデータが返される場合
      return data.experiments as ExperimentCSVRow[];
    } else {
      throw new Error('Invalid data format from GAS');
    }
  } catch (error) {
    console.error(`Failed to load experiments from GAS for ${category}:`, error);
    return [];
  }
};

/**
 * GASから新しい無機化学反応データを取得
 */
export const loadInorganicReactionsNewFromGAS = async (): Promise<InorganicReactionNew[]> => {
  const gasUrl = GAS_URLS.inorganic;

  if (!gasUrl) {
    throw new Error('GAS URL not configured for inorganic category');
  }

  try {
    // GASエンドポイントからデータを取得（タイムアウト付き）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒タイムアウト

    let response: Response;
    try {
      response = await fetch(`${gasUrl}?type=inorganic-new&category=inorganic`, {
        method: 'GET',
        mode: 'cors',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error('Request timeout: GAS took too long to respond');
      }
      throw fetchError;
    }

    if (!response.ok) {
      throw new Error(`Failed to load inorganic reactions new from GAS: ${response.status} ${response.statusText}`);
    }

    let data: any;
    try {
      data = await response.json();
    } catch (jsonError) {
      throw new Error('Failed to parse JSON response from GAS');
    }

    if (!data || (typeof data !== 'object')) {
      throw new Error('Invalid response format from GAS');
    }

    console.log('[gasLoader] GAS response received for inorganic-new');

    if (data.csv) {
      // CSV形式で返される場合
      const csvText = data.csv;
      const lines = csvText.split('\n').filter((line: string) => line.trim().length > 0);

      if (lines.length < 2) {
        throw new Error('Spreadsheet has no data rows');
      }

      // ヘッダー行をスキップ（1行目）
      const dataRows = lines.slice(1);
      const reactions: InorganicReactionNew[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        // CSV行を解析（カンマ区切り、引用符で囲まれた値に対応）
        const columns = parseCSVRow(row);

        if (columns.length < 8) {
          console.warn(`[gasLoader] Skipping row ${i + 2}: insufficient columns (${columns.length})`);
          continue;
        }

        const equation = columns[0]?.trim() || '';
        const reactants = columns[1]?.trim() || '';
        const products = columns[2]?.trim() || '';
        const conditions = columns[3]?.trim() || '';
        const observations = columns[4]?.trim() || '';
        const explanation = columns[5]?.trim() || '';
        const reactants_summary = columns[6]?.trim() || '';
        const products_summary = columns[7]?.trim() || '';

        // TeX形式データ（オプション、列が追加された場合に対応）
        // I列: equation_tex, J列: reactants_tex, K列: products_tex
        const equation_tex = columns.length > 8 ? columns[8]?.trim() || undefined : undefined;
        const reactants_tex = columns.length > 9 ? columns[9]?.trim() || undefined : undefined;
        const products_tex = columns.length > 10 ? columns[10]?.trim() || undefined : undefined;

        // 必須フィールドのチェック
        if (!equation || !reactants || !products) {
          console.warn(`[gasLoader] Skipping row ${i + 2}: missing required fields`);
          continue;
        }

        const reaction: InorganicReactionNew = {
          id: `inorganic-${i + 1}`,
          equation,
          equation_tex: equation_tex || undefined,
          reactants,
          reactants_tex: reactants_tex || undefined,
          products,
          products_tex: products_tex || undefined,
          conditions,
          observations,
          explanation,
          reactants_summary,
          products_summary,
        };

        reactions.push(reaction);
      }

      console.log(`[gasLoader] Successfully loaded ${reactions.length} inorganic reactions new from GAS`);
      return reactions;
    } else if (data.reactions) {
      // 既にパース済みの反応データが返される場合
      return data.reactions as InorganicReactionNew[];
    } else if (data.error) {
      throw new Error(`GAS error: ${data.error}`);
    } else {
      throw new Error('Invalid data format from GAS. Expected "csv" or "reactions" field.');
    }
  } catch (error) {
    console.error('Failed to load inorganic reactions new from GAS:', error);
    throw error;
  }
};

/**
 * CSV行を解析（引用符で囲まれた値に対応）
 */
function parseCSVRow(row: string): string[] {
  const columns: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        // エスケープされた引用符
        current += '"';
        i++; // 次の文字をスキップ
      } else {
        // 引用符の開始/終了
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // カンマで区切る（引用符の外のみ）
      columns.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // 最後の列を追加
  columns.push(current.trim());
  
  return columns;
}

