export interface ReactionCSVRow {
  type: 'substitution' | 'synthesis';
  from: string;
  reagent: string;
  to: string;
  description: string;
}

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

export const parseReactionCSV = (csvText: string): ReactionCSVRow[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const rows: ReactionCSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 4) {
      console.log(`[reactionParser] Skipped row ${i + 1}: insufficient columns (${values.length} < 4)`);
      continue; // 必須項目（A-D）がない行はスキップ
    }

    // 値のクリーニング（前後の空白とダブルクォートを削除）
    const clean = (val: string) => val ? val.trim().replace(/^"|"$/g, '') : '';

    // ゴミデータ判定: 数字のみ、数字+ピリオド（行番号形式）、極端に短いもの
    const isGarbage = (val: string) => {
      if (!val) return true;
      // 数字のみ（例: "1", "2"）
      if (/^\d+$/.test(val)) return true;
      // 行番号形式（例: "1.", "2."）
      if (/^\d+\.$/.test(val)) return true;
      return false;
    };

    const reagent = clean(values[2]);
    const to = clean(values[3]);

    // ゴミデータ対策: reagentが無効なら行全体をスキップ
    // toは化合物名なので、数字のみでも有効な可能性がある（例: "1-ブロモエタン"の略記など）
    if (isGarbage(reagent)) {
      console.log(`[reactionParser] Skipped row ${i + 1}: garbage reagent data (reagent="${reagent}")`);
      continue;
    }

    const row: ReactionCSVRow = {
      type: (clean(values[0]) as 'substitution' | 'synthesis') || 'substitution',
      from: clean(values[1]),
      reagent: reagent,
      to: to,
      description: clean(values[4])
    };

    // from または to が空の場合は有効なデータではないとみなす
    if (row.from && row.to) {
      rows.push(row);
    } else {
      console.log(`[reactionParser] Skipped row ${i + 1}: empty from/to (from="${row.from}", to="${row.to}")`);
    }
  }

  console.log(`[reactionParser] Parsed ${rows.length} valid reactions from ${lines.length - 1} CSV lines`);
  return rows;
};

