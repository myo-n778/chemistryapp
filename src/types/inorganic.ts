/**
 * 新しい無機化学反応データ型（Googleスプレッドシート用）
 */
export interface InorganicReactionNew {
  id: string;
  equation: string; // A列：反応式（日本語表記）
  equation_tex?: string; // A列：反応式（TeX形式、オプション）
  reactants: string; // B列：反応内容（反応前・日本語）
  reactants_tex?: string; // B列：反応内容（TeX形式、オプション）
  products: string; // C列：生成物（反応後・日本語）
  products_tex?: string; // C列：生成物（TeX形式、オプション）
  conditions: string; // D列：条件
  observations: string; // E列：観察事項（色・沈殿・気体を含む）
  explanation: string; // F列：解説本文
  reactants_summary: string; // G列：解説用・反応前要約
  products_summary: string; // H列：解説用・生成要約
}

/**
 * 新しい無機化学クイズタイプ
 */
export type InorganicQuizType = 'type-a' | 'type-b' | 'type-c';

