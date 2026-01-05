export interface Compound {
  id: string;
  name: string;
  type?: string; // 化合物の種類（アルカン、アルケン等）
  structure: StructureData;
}

export interface StructureData {
  atoms: Atom[];
  bonds: Bond[];
}

export interface Atom {
  id: string;
  element: string;
  x: number;
  y: number;
}

export interface Bond {
  from: string;
  to: string;
  type: 'single' | 'double' | 'triple';
}

// 無機化学用の型定義
// 旧無機化学モード（廃止予定）
export type InorganicQuizMode = 'mode-a' | 'mode-b' | 'mode-e' | 'mode-f' | 'mode-g';

// 新しい無機化学タイプをエクスポート
export type { InorganicQuizType } from './types/inorganic';

export interface InorganicReaction {
  id: string;
  topic: string; // 分野（沈殿・酸化還元・電気分解など）
  type: string; // 反応タイプ
  equation_tex: string; // プレーン表示用反応式（→ ↑ ↓ ⇄、Unicode下付・上付）
  reactants_desc: string; // 反応前物質の説明
  products_desc: string; // 反応後物質の説明
  conditions: string; // 条件（温度・濃淡・電極など）
  operation: string; // 操作（加熱・混合・電気分解など）
  observations: string; // 観察（色・沈殿・気体・臭い）
  notes: string; // 補足
  family: string; // 反応ファミリー（類似反応グループ）
  variant: string; // ファミリー内の違い
  difficulty: string; // 難易度
  state_tags: string; // 元データ由来の状態タグ
  tags_norm: string[]; // 規格化タグ（配列）
  ask_types_json: string[]; // 出題タイプ候補（配列）
  question_templates_json: Record<string, string>; // 問題文テンプレ（オブジェクト）
  answer_hint: string; // 解答種別ヒント
  // TEX形式モード用（オプション）
  equation_tex_mhchem?: string; // mhchem形式の反応式
}

