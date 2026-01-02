export interface ReactionCSVRow {
  type: 'substitution' | 'synthesis';
  from: string;
  reagent: string;
  to: string;
  description: string;
}

export const parseReactionCSV = (csvText: string): ReactionCSVRow[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const rows: ReactionCSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length < 4) continue; // 必須項目（A-D）がない行はスキップ

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

    // ゴミデータ対策: reagentやtoが無効なら行全体をスキップ
    if (isGarbage(reagent) || isGarbage(to)) continue;

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
    }
  }

  return rows;
};

