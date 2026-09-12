import type { Compound } from '../types';
import { CHEMICAL_COLORS } from './inorganicColors';
export interface LearningChoice { text: string; reason: string }
const normalize = (value: string) => value.normalize('NFKC').replace(/\s/g, '');
/** 不足や壊れた設定は明示的にエラーにする。無関係な答えでは補充しない。 */
export function parseLearningChoices(raw: string | undefined, label: string): LearningChoice[] {
  if (!raw) return [];
  let values: unknown;
  try { values = JSON.parse(raw); } catch { throw new Error(`${label}の誤選択肢JSONを確認してください。`); }
  if (!Array.isArray(values) || values.some(x => !x || typeof x.text !== 'string' || !x.text.trim() || typeof x.reason !== 'string' || !x.reason.trim())) {
    throw new Error(`${label}の誤選択肢にはtextとreasonが必要です。`);
  }
  return values as LearningChoice[];
}
export function validateLearningChoices(correct: string, choices: LearningChoice[], label: string): void {
  if (!correct || choices.length < 1 || choices.length > 3 || new Set([correct, ...choices.map(c => c.text)].map(normalize)).size !== choices.length + 1) {
    throw new Error(`${label}の選択肢を確認してください。正解と重複しない誤答1〜3個が必要です。`);
  }
}
/** Fisher–Yates。正解位置の偏りを避け、値と正誤の対応は保持する。 */
export function shuffleLearning<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function learningOptions(correct: string, choices: LearningChoice[], label = 'この問題'): string[] {
  validateLearningChoices(correct, choices, label);
  return shuffleLearning([correct, ...choices.map(c => c.text)]);
}
export function parseChoiceIds(raw: string | undefined): string[] {
  if (!raw) return [];
  let ids: unknown;
  try { ids = JSON.parse(raw); } catch { throw new Error('構造問題のchoice_ids_jsonを確認してください。'); }
  if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string' || !id)) throw new Error('構造問題の候補IDは文字列の配列にしてください。');
  return ids as string[];
}
export function compoundOptions(current: Compound, pool: Compound[]): Compound[] {
  const ids = current.choiceIds || [];
  const candidates = ids.map(id => pool.find(row => row.id === id));
  if (ids.length < 1 || ids.length > 3 || new Set([current.id, ...ids]).size !== ids.length + 1 || candidates.some(row => !row || !row.structure.atoms.length || !row.structure.bonds.length)) {
    throw new Error(`${current.name}の構造候補IDを確認してください。`);
  }
  return shuffleLearning([current, ...candidates as Compound[]]);
}
/** 誤選択肢にも同じ規則で色を付ける。正解の出典をヒントにしない。 */
export function learningChoiceVisuals(text: string, timing: string | undefined, answered: boolean): string {
  if (timing !== '本文に合わせる' && !(answered && timing === '解説のみ')) return '';
  return Object.keys(CHEMICAL_COLORS).filter(color => text.includes(color)).join(';');
}
