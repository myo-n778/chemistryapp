import { Compound } from '../types';
import { Category } from '../components/CategorySelector';
import { PROBLEM_BASE_URL } from '../config/gasUrls';
import { parseCSV, csvToCompounds } from '../utils/csvParser';
import { parseReactionCSV, ReactionCSVRow } from '../utils/reactionParser';
import { parseExperimentCSV, ExperimentCSVRow } from '../utils/experimentParser';
import { InorganicReactionNew } from '../types/inorganic';

/**
 * GASから化合物データを取得
 * 問題データ用URL（PROBLEM_BASE_URL）のみを使用
 */
export const loadCompoundsFromGAS = async (category: Category): Promise<Compound[]> => {
  // PROBLEM_BASE_URLが設定されていない場合のエラー
  if (!PROBLEM_BASE_URL || PROBLEM_BASE_URL.trim() === '') {
    const errorMsg = 'PROBLEM_BASE_URL is not configured. Please set the problem data GAS URL in src/config/gasUrls.ts or set the VITE_GAS_URL_PROBLEM environment variable.';
    console.error('[problemLoader]', errorMsg);
    throw new Error(errorMsg);
  }
  
  const requestId = `problemLoader#compounds#${Date.now()}`;
  const url = `${PROBLEM_BASE_URL}?type=compounds&category=${category}`;
  
  console.log(`[${requestId}] Fetching compounds from:`, url);

  try {
    // GASエンドポイントからデータを取得（タイムアウト付き）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒タイムアウト

    let response: Response;
    try {
      response = await fetch(url, {
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

    // 形式チェック: レスポンス情報をログ出力
    const contentType = response.headers.get('content-type') || 'unknown';
    console.log(`[${requestId}] Response status: ${response.status} ${response.statusText}`);
    console.log(`[${requestId}] Content-Type: ${contentType}`);

    if (!response.ok) {
      throw new Error(`Failed to load compounds from GAS: ${response.status} ${response.statusText}`);
    }

    const rawText = await response.text();
    const rawPreview = rawText.substring(0, 200);
    console.log(`[${requestId}] Raw response preview (first 200 chars):`, rawPreview);

    // HTMLが返ってきた場合（ログイン画面など）を検知
    if (rawText.trim().startsWith('<!DOCTYPE') || rawText.trim().startsWith('<html')) {
      const errorMsg = `[${requestId}] ERROR: Received HTML instead of JSON. This may be a login page or error page.`;
      console.error(errorMsg);
      console.error(`[${requestId}] Used URL:`, url);
      throw new Error('Received HTML instead of JSON. Check GAS deployment and access permissions.');
    }

    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch (jsonError) {
      console.error(`[${requestId}] Failed to parse JSON:`, jsonError);
      console.error(`[${requestId}] Raw text (first 500 chars):`, rawText.substring(0, 500));
      throw new Error('Failed to parse JSON response from GAS');
    }

    if (!data || (typeof data !== 'object')) {
      throw new Error('Invalid response format from GAS');
    }

    console.log(`[${requestId}] Parsed response structure:`, Object.keys(data));

    // userStats専用GASが設定されている場合のエラー検知
    if (data.error) {
      const errorStr = String(data.error);
      if (errorStr.includes('userStats') || errorStr.includes('Use action=userStats')) {
        const errorMsg = `[${requestId}] ERROR: PROBLEM_BASE_URL is pointing to a userStats-only GAS. This URL should be a problem data GAS.`;
        console.error(errorMsg);
        console.error(`[${requestId}] Current PROBLEM_BASE_URL:`, PROBLEM_BASE_URL);
        console.error(`[${requestId}] GAS error:`, data.error);
        throw new Error('PROBLEM_BASE_URL is incorrectly configured. It points to a userStats-only GAS, but it should point to a problem data GAS. Please check your GAS deployment and update PROBLEM_BASE_URL in src/config/gasUrls.ts');
      }
      if (errorStr.includes('rec') || errorStr.includes('Use action=rec')) {
        const errorMsg = `[${requestId}] ERROR: PROBLEM_BASE_URL is pointing to a rec-only GAS. This URL should be a problem data GAS.`;
        console.error(errorMsg);
        console.error(`[${requestId}] Current PROBLEM_BASE_URL:`, PROBLEM_BASE_URL);
        console.error(`[${requestId}] GAS error:`, data.error);
        throw new Error('PROBLEM_BASE_URL is incorrectly configured. It points to a rec-only GAS, but it should point to a problem data GAS. Please check your GAS deployment and update PROBLEM_BASE_URL in src/config/gasUrls.ts');
      }
    }
    
    // 問題データ取得なのにJSON配列が直接返されている場合を検知（rec/userStats APIの可能性）
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0];
      // recデータには name, userKey, mode などのフィールドがある
      // userStatsデータには userKey, name, exp などのフィールドがある
      if (firstItem.userKey || firstItem.name === '表示名（displayName）') {
        const errorMsg = `[${requestId}] ERROR: Received rec/userStats data instead of problem data.`;
        console.error(errorMsg);
        console.error(`[${requestId}] First item keys:`, Object.keys(firstItem));
        console.error(`[${requestId}] Used URL:`, url);
        throw new Error('Received rec/userStats data instead of problem data. Check that problem URL (PROBLEM_BASE_URL) is correctly configured.');
      }
    }

    // GASから返されるデータ形式に応じて処理
    if (data.csv) {
      // CSV形式で返される場合
      const csvRows = parseCSV(data.csv);
      console.log(`[${requestId}] Parsed ${csvRows.length} CSV rows from GAS`);

      // デフォルトデータ（defaultOrganicCompounds）は使用せず、GASからのデータのみを使用する
      // これにより、スプレッドシートのデータが確実に優先される
      const compounds = csvToCompounds(csvRows, []);
      console.log(`[${requestId}] Converted to ${compounds.length} compounds from GAS`);

      // デバッグ: 全化合物名を出力（最初の10件のみ）
      if (compounds.length > 0) {
        console.log(`[${requestId}] First 10 compound names:`, compounds.slice(0, 10).map(c => c.name));
      }

      if (compounds.length === 0) {
        // GASデータが空の場合のみ警告を出すが、デフォルトフォールバックはしない
        console.warn(`[${requestId}] No compounds found in GAS data.`);
        return [];
      }

      return compounds;
    } else if (data.compounds) {
      // 既にパース済みの化合物データが返される場合
      console.log(`[${requestId}] Received pre-parsed compounds array:`, data.compounds.length);
      return data.compounds as Compound[];
    } else if (data.error) {
      const errorMsg = `[${requestId}] GAS error: ${data.error}`;
      console.error(errorMsg);
      throw new Error(`GAS error: ${data.error}`);
    } else {
      // 予期しない形式の場合、詳細をログ出力
      const errorMsg = `[${requestId}] Invalid data format from GAS. Expected "csv" or "compounds" field.`;
      console.error(errorMsg);
      console.error(`[${requestId}] Response keys:`, Object.keys(data));
      console.error(`[${requestId}] Response preview:`, JSON.stringify(data).substring(0, 500));
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
 * 問題データ用URL（PROBLEM_BASE_URL）のみを使用
 */
export const loadReactionsFromGAS = async (category: Category): Promise<ReactionCSVRow[]> => {
  // PROBLEM_BASE_URLが設定されていない場合のエラー
  if (!PROBLEM_BASE_URL || PROBLEM_BASE_URL.trim() === '') {
    const errorMsg = 'PROBLEM_BASE_URL is not configured. Please set the problem data GAS URL in src/config/gasUrls.ts or set the VITE_GAS_URL_PROBLEM environment variable.';
    console.error('[problemLoader]', errorMsg);
    throw new Error(errorMsg);
  }
  
  const requestId = `problemLoader#reactions#${Date.now()}`;
  const url = `${PROBLEM_BASE_URL}?type=reactions&category=${category}`;
  
  console.log(`[${requestId}] Fetching reactions from:`, url);

  try {
    // GASエンドポイントからデータを取得（タイムアウト付き）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒タイムアウト

    let response: Response;
    try {
      response = await fetch(url, {
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

    // 形式チェック: レスポンス情報をログ出力
    const contentType = response.headers.get('content-type') || 'unknown';
    console.log(`[${requestId}] Response status: ${response.status} ${response.statusText}`);
    console.log(`[${requestId}] Content-Type: ${contentType}`);

    if (!response.ok) {
      throw new Error(`Failed to load reactions from GAS: ${response.status} ${response.statusText}`);
    }

    const rawText = await response.text();
    const rawPreview = rawText.substring(0, 200);
    console.log(`[${requestId}] Raw response preview (first 200 chars):`, rawPreview);

    // HTMLが返ってきた場合を検知
    if (rawText.trim().startsWith('<!DOCTYPE') || rawText.trim().startsWith('<html')) {
      const errorMsg = `[${requestId}] ERROR: Received HTML instead of JSON.`;
      console.error(errorMsg);
      throw new Error('Received HTML instead of JSON. Check GAS deployment and access permissions.');
    }

    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch (jsonError) {
      console.error(`[${requestId}] Failed to parse JSON:`, jsonError);
      throw new Error('Failed to parse JSON response from GAS');
    }

    if (!data || (typeof data !== 'object')) {
      throw new Error('Invalid response format from GAS');
    }

    // 問題データ取得なのにJSON配列が直接返されている場合を検知
    if (Array.isArray(data) && data.length > 0 && data[0].userKey) {
      const errorMsg = `[${requestId}] ERROR: Received rec/userStats data instead of problem data.`;
      console.error(errorMsg);
      throw new Error('Received rec/userStats data instead of problem data.');
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
 * 問題データ用URL（PROBLEM_BASE_URL）のみを使用
 */
export const loadExperimentsFromGAS = async (category: Category): Promise<ExperimentCSVRow[]> => {
  // PROBLEM_BASE_URLが設定されていない場合のエラー
  if (!PROBLEM_BASE_URL || PROBLEM_BASE_URL.trim() === '') {
    const errorMsg = 'PROBLEM_BASE_URL is not configured. Please set the problem data GAS URL in src/config/gasUrls.ts or set the VITE_GAS_URL_PROBLEM environment variable.';
    console.error('[problemLoader]', errorMsg);
    throw new Error(errorMsg);
  }
  
  const requestId = `problemLoader#experiments#${Date.now()}`;
  const url = `${PROBLEM_BASE_URL}?type=experiment&category=${category}`;
  
  console.log(`[${requestId}] Fetching experiments from:`, url);

  try {
    // GASエンドポイントからデータを取得（タイムアウト付き）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒タイムアウト

    let response: Response;
    try {
      response = await fetch(url, {
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

    // 形式チェック: レスポンス情報をログ出力
    const contentType = response.headers.get('content-type') || 'unknown';
    console.log(`[${requestId}] Response status: ${response.status} ${response.statusText}`);
    console.log(`[${requestId}] Content-Type: ${contentType}`);

    if (!response.ok) {
      throw new Error(`Failed to load experiments from GAS: ${response.status} ${response.statusText}`);
    }

    const rawText = await response.text();
    const rawPreview = rawText.substring(0, 200);
    console.log(`[${requestId}] Raw response preview (first 200 chars):`, rawPreview);

    // HTMLが返ってきた場合を検知
    if (rawText.trim().startsWith('<!DOCTYPE') || rawText.trim().startsWith('<html')) {
      const errorMsg = `[${requestId}] ERROR: Received HTML instead of JSON.`;
      console.error(errorMsg);
      throw new Error('Received HTML instead of JSON. Check GAS deployment and access permissions.');
    }

    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch (jsonError) {
      console.error(`[${requestId}] Failed to parse JSON:`, jsonError);
      throw new Error('Failed to parse JSON response from GAS');
    }

    if (!data || (typeof data !== 'object')) {
      throw new Error('Invalid response format from GAS');
    }

    // 問題データ取得なのにJSON配列が直接返されている場合を検知
    if (Array.isArray(data) && data.length > 0 && data[0].userKey) {
      const errorMsg = `[${requestId}] ERROR: Received rec/userStats data instead of problem data.`;
      console.error(errorMsg);
      throw new Error('Received rec/userStats data instead of problem data.');
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
 * 問題データ用URL（PROBLEM_BASE_URL）のみを使用
 */
export const loadInorganicReactionsNewFromGAS = async (): Promise<InorganicReactionNew[]> => {
  // PROBLEM_BASE_URLが設定されていない場合のエラー
  if (!PROBLEM_BASE_URL || PROBLEM_BASE_URL.trim() === '') {
    const errorMsg = 'PROBLEM_BASE_URL is not configured. Please set the problem data GAS URL in src/config/gasUrls.ts or set the VITE_GAS_URL_PROBLEM environment variable.';
    console.error('[problemLoader]', errorMsg);
    throw new Error(errorMsg);
  }
  
  const requestId = `problemLoader#inorganic-new#${Date.now()}`;
  const url = `${PROBLEM_BASE_URL}?type=inorganic-new&category=inorganic`;
  
  console.log(`[${requestId}] Fetching inorganic-new from:`, url);

  try {
    // GASエンドポイントからデータを取得（タイムアウト付き）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒タイムアウト

    let response: Response;
    try {
      response = await fetch(url, {
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

    // 形式チェック: レスポンス情報をログ出力
    const contentType = response.headers.get('content-type') || 'unknown';
    console.log(`[${requestId}] Response status: ${response.status} ${response.statusText}`);
    console.log(`[${requestId}] Content-Type: ${contentType}`);

    if (!response.ok) {
      throw new Error(`Failed to load inorganic reactions new from GAS: ${response.status} ${response.statusText}`);
    }

    const rawText = await response.text();
    const rawPreview = rawText.substring(0, 200);
    console.log(`[${requestId}] Raw response preview (first 200 chars):`, rawPreview);

    // HTMLが返ってきた場合を検知
    if (rawText.trim().startsWith('<!DOCTYPE') || rawText.trim().startsWith('<html')) {
      const errorMsg = `[${requestId}] ERROR: Received HTML instead of JSON.`;
      console.error(errorMsg);
      throw new Error('Received HTML instead of JSON. Check GAS deployment and access permissions.');
    }

    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch (jsonError) {
      console.error(`[${requestId}] Failed to parse JSON:`, jsonError);
      throw new Error('Failed to parse JSON response from GAS');
    }

    if (!data || (typeof data !== 'object')) {
      throw new Error('Invalid response format from GAS');
    }

    console.log(`[${requestId}] Parsed response structure:`, Object.keys(data));

    // 問題データ取得なのにJSON配列が直接返されている場合を検知
    if (Array.isArray(data) && data.length > 0 && data[0].userKey) {
      const errorMsg = `[${requestId}] ERROR: Received rec/userStats data instead of problem data.`;
      console.error(errorMsg);
      throw new Error('Received rec/userStats data instead of problem data.');
    }

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
        let equation_tex = columns.length > 8 ? columns[8]?.trim() || undefined : undefined;
        let reactants_tex = columns.length > 9 ? columns[9]?.trim() || undefined : undefined;
        let products_tex = columns.length > 10 ? columns[10]?.trim() || undefined : undefined;

        // バックスラッシュの処理
        // CSVパース時、引用符内の\\は\として解釈される
        // しかし、GAS側でCSV生成時に\\が\\として保存されている場合、\\のままになる
        // 実際のデータを確認してから調整
        if (equation_tex) {
          // デバッグ用ログ（最初の1件のみ）
          if (i === 0) {
            console.log('[gasLoader] Raw equation_tex (first 100 chars):', equation_tex.substring(0, 100));
            console.log('[gasLoader] equation_tex contains \\ce:', equation_tex.includes('\\ce'));
          }
        }

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

