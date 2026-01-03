export interface ExperimentCSVRow {
  question: string; // A列：問題文
  option1: string; // B列：選択肢1
  option2: string; // C列：選択肢2
  option3: string; // D列：選択肢3
  option4: string; // E列：選択肢4
  correctAnswer: number; // F列：答え番号（1〜4）
  explanation: string; // G列：解説
}

/**
 * experimentシートのCSVをパース
 */
/**
 * CSVの1行をパース（カンマ区切り、ダブルクォート対応）
 */
const parseCSVLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // エスケープされたダブルクォート
        current += '"';
        i++; // 次の文字をスキップ
      } else {
        // クォートの開始/終了
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // カンマで区切る（クォート外の場合のみ）
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim()); // 最後の値
  return values;
};

export const parseExperimentCSV = (csvText: string): ExperimentCSVRow[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const rows: ExperimentCSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 7) {
      continue; // 必須項目（A-G）がない行はスキップ
    }

    const question = values[0] || '';
    const option1 = values[1] || '';
    const option2 = values[2] || '';
    const option3 = values[3] || '';
    const option4 = values[4] || '';
    const correctAnswerStr = values[5] || '';
    const explanation = values[6] || '';

    // 問題文と選択肢が空の場合はスキップ
    if (!question || !option1 || !option2 || !option3 || !option4) {
      continue;
    }

    // 答え番号を数値に変換（1〜4）
    const correctAnswer = parseInt(correctAnswerStr, 10);
    if (isNaN(correctAnswer) || correctAnswer < 1 || correctAnswer > 4) {
      continue; // 無効な答え番号はスキップ
    }

    rows.push({
      question,
      option1,
      option2,
      option3,
      option4,
      correctAnswer,
      explanation
    });
  }

  console.log(`[experimentParser] Parsed ${rows.length} valid experiments from ${lines.length - 1} CSV lines`);
  return rows;
};

