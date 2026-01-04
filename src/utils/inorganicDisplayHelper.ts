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

