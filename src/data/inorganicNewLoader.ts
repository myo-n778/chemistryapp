import { InorganicReactionNew } from '../types/inorganic';

/**
 * Googleスプレッドシートから無機化学反応データを読み込む
 * スプレッドシートID: 1QxRAbYbN0tA3nmBgT7yL4HhnIPqW_QeFFkzGKkDLda0
 * シート名: inorganic
 */
export const loadInorganicReactionsNew = async (): Promise<InorganicReactionNew[]> => {
  const SPREADSHEET_ID = '1QxRAbYbN0tA3nmBgT7yL4HhnIPqW_QeFFkzGKkDLda0';
  const SHEET_NAME = 'inorganic';
  const GID = '1277422771';

  try {
    // GoogleスプレッドシートをCSVとして公開している場合のURL
    // または、GASエンドポイントを使用する場合
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}&gid=${GID}`;
    
    console.log(`[inorganicNewLoader] Loading data from: ${csvUrl}`);
    
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to load spreadsheet: ${response.status} ${response.statusText}`);
    }

    const csvText = await response.text();
    console.log(`[inorganicNewLoader] Response received, length: ${csvText.length}, first 200 chars:`, csvText.substring(0, 200));
    
    // HTMLが返ってきた場合（認証エラーなど）を検出
    if (csvText.trim().startsWith('<!DOCTYPE') || csvText.trim().startsWith('<html')) {
      console.error('[inorganicNewLoader] Received HTML instead of CSV. Spreadsheet may not be publicly accessible.');
      throw new Error('Spreadsheet is not publicly accessible. Please make sure the spreadsheet is shared with "Anyone with the link"');
    }
    
    const lines = csvText.split('\n').filter(line => line.trim().length > 0);
    console.log(`[inorganicNewLoader] Parsed ${lines.length} lines from CSV`);

    if (lines.length < 2) {
      console.error('[inorganicNewLoader] Spreadsheet has no data rows. Lines:', lines);
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
        console.warn(`[inorganicNewLoader] Skipping row ${i + 2}: insufficient columns (${columns.length})`);
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
        console.warn(`[inorganicNewLoader] Skipping row ${i + 2}: missing required fields`);
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

    console.log(`[inorganicNewLoader] Successfully loaded ${reactions.length} reactions`, {
      firstReaction: reactions[0],
      lastReaction: reactions[reactions.length - 1]
    });
    return reactions;
  } catch (error) {
    console.error('[inorganicNewLoader] Failed to load reactions:', error);
    if (error instanceof Error) {
      console.error('[inorganicNewLoader] Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
};

/**
 * CSV行を解析（引用符で囲まれた値に対応）
 * 既存のcsvParser.tsのparseCSVLineと同じロジックを使用
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

