import { Compound } from '../types';

export interface CompoundCSVRow {
  id: string;
  name: string;
  type: string;
  formula: string;
  atoms?: string; // JSON形式の原子データ
  bonds?: string; // JSON形式の結合データ
}

// 全角スペースなども含むクリーニング関数
const cleanName = (name: string) => {
  if (!name) return '';
  return name.replace(/[\s\u3000]+/g, '').trim();
};

export const parseCSV = (csvText: string): CompoundCSVRow[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  // ヘッダー行があっても無視して、インデックスベースでデータを取得する
  // ユーザー仕様: B列(1)=名前, E列(4)=原子データ, F列(5)=結合データ
  const rows: CompoundCSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    // データが足りない行はスキップ
    if (values.length <= 1) continue;

    const row: CompoundCSVRow = {
      id: values[0] || `compound_${i}`, // A列があればID、なければ連番
      name: cleanName(values[1]),      // B列: 名前
      type: values[2] || '',           // C列: タイプ（想定）
      formula: values[3] || '',        // D列: 化学式（想定）
      atoms: values[4] || '',          // E列: 原子データ
      bonds: values[5] || '',          // F列: 結合データ
    };

    // 名前がある場合のみ有効な行とする
    if (row.name) {
      rows.push(row);
    }
  }

  return rows;
};

// CSV行を正しくパース（引用符で囲まれたフィールドを処理）
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // エスケープされた引用符
        current += '"';
        i++; // 次の引用符をスキップ
      } else {
        // 引用符の開始/終了
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // フィールドの区切り
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // 最後のフィールドを追加
  values.push(current.trim());

  return values;
}

export const csvToCompounds = (csvRows: CompoundCSVRow[], existingCompounds: Compound[]): Compound[] => {
  const result = csvRows.map((row): Compound | null => {
    // 既存の化合物データから構造式を取得（名前でマッチング）
    // existingCompoundsは基本空だが、渡された場合はチェック
    const existing = existingCompounds.find(c => cleanName(c.name) === cleanName(row.name));

    if (existing) {
      return {
        ...existing,
        id: row.id,
        name: row.name, // CSVの名前を使用
        type: row.type || existing.type,
      };
    }

    // 構造式データがJSON形式で提供されている場合
    if (row.atoms && row.bonds && row.atoms.trim() !== '' && row.bonds.trim() !== '') {
      try {
        // GASから返されるJSON文字列は、エスケープされた引用符を含む場合がある
        // parseCSVLineで既に外側の引用符は処理されているが、
        // JSON文字列内のエスケープされた引用符（\"\"）を処理する必要がある
        let atomsStr = row.atoms.trim();
        let bondsStr = row.bonds.trim();
        
        // 外側の引用符を除去（もしあれば）
        if ((atomsStr.startsWith('"') && atomsStr.endsWith('"')) || 
            (atomsStr.startsWith("'") && atomsStr.endsWith("'"))) {
          atomsStr = atomsStr.slice(1, -1);
        }
        if ((bondsStr.startsWith('"') && bondsStr.endsWith('"')) || 
            (bondsStr.startsWith("'") && bondsStr.endsWith("'"))) {
          bondsStr = bondsStr.slice(1, -1);
        }
        
        // GASのレスポンスでは、JSON文字列内の引用符が \"\" としてエスケープされている
        // これを \" に変換（JSON文字列内のエスケープされた引用符を正しく処理）
        // ただし、既に正しくエスケープされている場合はそのまま
        // \"\" を \" に変換（エスケープされたダブルクォート2つを1つに）
        atomsStr = atomsStr.replace(/\\"\\"/g, '\\"');
        bondsStr = bondsStr.replace(/\\"\\"/g, '\\"');
        
        // さらに、連続するダブルクォート（""）を単一のダブルクォート（"）に変換
        // これは、CSVパーサーが既に処理している可能性があるが、念のため
        atomsStr = atomsStr.replace(/""/g, '"');
        bondsStr = bondsStr.replace(/""/g, '"');
        
        // JSON parseを試みる
        const atoms = JSON.parse(atomsStr);
        const bonds = JSON.parse(bondsStr);

        if (Array.isArray(atoms) && Array.isArray(bonds) && atoms.length > 0 && bonds.length > 0) {
          return {
            id: row.id,
            name: row.name,
            type: row.type || 'organic', // タイプがない場合はorganicとする
            structure: {
              atoms,
              bonds,
            },
          };
        }
      } catch (e) {
        console.warn(`Failed to parse structure JSON for ${row.name}:`, e);
        console.warn(`atoms (first 200 chars): ${row.atoms.substring(0, 200)}`); // デバッグ用
        console.warn(`bonds (first 200 chars): ${row.bonds.substring(0, 200)}`); // デバッグ用
      }
    }

    // 構造式がない場合でも、ReactionQuizで名前だけは使えるようにオブジェクトとしては返す？
    // いや、構造式がないとStructureViewerでエラーになるか何も出ない。
    // NO IMAGEを出すためにはデータが存在している必要がある。
    // 構造式パースに失敗してもCompoundオブジェクトは作るように変更する。

    return {
      id: row.id,
      name: row.name,
      type: row.type || 'unknown',
      structure: { atoms: [], bonds: [] } // 空の構造式
    };
  });

  return result.filter((c): c is Compound => c !== null);
};
