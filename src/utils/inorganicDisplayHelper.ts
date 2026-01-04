/**
 * 無機化学の内部識別子を日本語表示に変換するヘルパー関数
 * ロジック・判定処理には影響を与えず、表示のみを対象とする
 */

/**
 * 反応ファミリー（family）を日本語に変換
 */
export const translateFamily = (family: string): string => {
  const familyMap: Record<string, string> = {
    'gas_generation': '気体が発生する反応',
    'precipitation': '沈殿が生成する反応',
    'acid_base': '酸塩基反応',
    'redox': '酸化還元反応',
    'complex_formation': '錯体生成反応',
    'thermal_decomposition': '熱分解反応',
    'electrolysis': '電気分解',
    'equilibrium': '平衡反応',
  };
  
  return familyMap[family] || family;
};

/**
 * バリアント（variant）を日本語に変換
 */
export const translateVariant = (variant: string): string => {
  const variantMap: Record<string, string> = {
    'acid-bicarbonate': '酸と炭酸水素塩の反応（CO₂が発生）',
    'acid-carbonate': '酸と炭酸塩の反応（CO₂が発生）',
    'acid-sulfite': '酸と亜硫酸塩の反応（SO₂が発生）',
    'acid-sulfide': '酸と硫化物の反応（H₂Sが発生）',
    'alkali-metal-water': 'アルカリ金属と水の反応（H₂が発生）',
    'metal-acid': '金属と酸の反応（H₂が発生）',
  };
  
  return variantMap[variant] || variant;
};

/**
 * 化学式の文字列をTeX形式に変換（簡易版）
 * 完全なTeXパーサーではないが、基本的な下付き・上付きを処理
 */
export const formatChemicalFormula = (formula: string): string => {
  if (!formula) return formula;
  
  // 既にTeX形式の場合はそのまま返す
  if (formula.includes('\\') || formula.includes('_') || formula.includes('^')) {
    return formula;
  }
  
  // 数字を下付きに変換（例: H2O → H_2O）
  let texFormula = formula
    // 化学式の数字を下付きに（例: H2O → H_2O, CO2 → CO_2）
    .replace(/([A-Za-z])(\d+)/g, '$1_{$2}')
    // 括弧内の数字も下付きに（例: Ca(OH)2 → Ca(OH)_2）
    .replace(/\)(\d+)/g, ')_{$1}')
    // 状態記号の括弧を処理（例: (g), (s), (l), (aq)）
    .replace(/\s*\(([glsaq]+)\)/g, '\\text{($1)}')
    // 矢印をTeX形式に
    .replace(/->/g, '\\rightarrow')
    .replace(/<=>/g, '\\rightleftharpoons')
    .replace(/→/g, '\\rightarrow')
    .replace(/⇄/g, '\\rightleftharpoons');
  
  return texFormula;
};

/**
 * 選択肢から「生成物 :」などのプレフィックスを削除
 */
export const cleanProductDescription = (desc: string): string => {
  return desc.replace(/^生成物\s*[:：]\s*/i, '').trim();
};

/**
 * 反応式から左辺（反応物）のみを抽出し、矢印を付けて返す
 * データは変更せず、表示用に左辺のみを生成
 */
export const extractLeftSideWithArrow = (equation: string): string => {
  if (!equation) return equation;
  
  // 矢印記号で分割（様々な表記に対応）
  // 順序が重要：長いパターンから先にチェック
  const arrowPatterns = [
    { pattern: /\\rightleftharpoons/g, name: 'LaTeX平衡矢印' },
    { pattern: /\\rightarrow/g, name: 'LaTeX形式' },
    { pattern: /\\to/g, name: 'LaTeX形式（短い）' },
    { pattern: /<=>/g, name: '平衡矢印' },
    { pattern: /⇒/g, name: '全角二重矢印' },
    { pattern: /→/g, name: '全角矢印' },
    { pattern: /->/g, name: 'ハイフン+大なり' },
  ];
  
  let leftSide = equation;
  let foundArrow = false;
  let isTeXFormat = equation.includes('\\') || equation.includes('\\ce');
  
  // 最初に見つかった矢印で分割
  for (const { pattern } of arrowPatterns) {
    const match = equation.match(pattern);
    if (match && match.index !== undefined) {
      leftSide = equation.substring(0, match.index).trim();
      foundArrow = true;
      break;
    }
  }
  
  // 矢印が見つからなかった場合は、そのまま返す（既に左辺のみの可能性）
  if (!foundArrow) {
    // 既に矢印が含まれていない場合は、そのまま返す
    return equation;
  }
  
  // 左辺の末尾に矢印を追加（TeX形式の場合は\\rightarrow、それ以外は→）
  if (isTeXFormat) {
    // TeX形式の場合
    return leftSide + ' \\rightarrow';
  } else {
    // 通常のテキスト形式の場合
    return leftSide + ' →';
  }
};

