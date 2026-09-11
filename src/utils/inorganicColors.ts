import type { InorganicReactionNew } from '../types/inorganic';

/** 見本色。濃度・照明・端末による実物の色の違いは表現しない。 */
export const CHEMICAL_COLORS: Readonly<Record<string, string>> = {
  '白色': '#FFFFFF', '黒色': '#202020', '青色': '#4086DF', '緑色': '#459D60',
  '黄色': '#F4D13D', '赤色': '#D9443F', '紫色': '#8556B4', '橙色': '#EA913A',
  '褐色': '#985A32', '淡黄色': '#F8ECA5', '淡緑色': '#B6D9B2',
  '緑白色': '#DCE9D8', '青白色': '#D8EAF2', '黄褐色': '#B38A39',
  '赤褐色': '#A74C35', '黄緑色': '#BED058', '深青色': '#2448B5',
  '赤紫色': '#AC3B90', '黒紫色': '#38253F', '無色': 'transparent',
};
const states = new Set(['未指定', '沈殿', '気体', '溶液', '固体', '液体']);
export interface ColorCue { color: string; state: string }
export type VisualTarget = 'reactants' | 'products' | 'observations';

/** 例: 青色（溶液）;白色（沈殿）。未知の値をCSSとして使わない。 */
export function parseColorCues(value?: string): ColorCue[] {
  if (typeof value !== 'string') return [];
  const cues: ColorCue[] = [];
  for (const item of value.split(/[;；\n]/)) {
    const match = item.trim().match(/^([^（）()]+?)(?:[（(]([^（）()]+)[）)])?$/);
    if (!match) continue;
    const color = match[1].trim();
    const state = match[2]?.trim() || '未指定';
    if (!Object.prototype.hasOwnProperty.call(CHEMICAL_COLORS, color) || !states.has(state)) continue;
    if (!cues.some(cue => cue.color === color && cue.state === state)) cues.push({ color, state });
  }
  return cues;
}

export function colorCuesFor(reaction: InorganicReactionNew, target: VisualTarget, answered: boolean): string {
  const timing = reaction.visual_timing;
  const enabled = timing === '本文に合わせる' || (answered && timing === '解説のみ');
  return enabled ? reaction[`${target}_visual`] || '' : '';
}

/** 正解行ではなく、選択肢自身の出典に照合する。重複行の指定が違えば非表示。 */
export function choiceColorCues(pool: InorganicReactionNew[], text: string, target: VisualTarget, answered: boolean): string {
  const matches = pool.filter(row => row[target].trim() === text.trim());
  if (!matches.length) return '';
  const values = matches.map(row => colorCuesFor(row, target, answered));
  if (values.some(value => !value)) return '';
  return values.join(';');
}

const colorPattern = new RegExp(Object.keys(CHEMICAL_COLORS).sort((a, b) => b.length - a.length).join('|'), 'g');
export function splitColorText(text: string, cues: ColorCue[]): Array<{ text: string; cue?: ColorCue }> {
  const parts: Array<{ text: string; cue?: ColorCue }> = [];
  let cursor = 0;
  for (const match of text.matchAll(colorPattern)) {
    const start = match.index!;
    if (start > cursor) parts.push({ text: text.slice(cursor, start) });
    // すでに本文にある色名のみを装飾する。未記載の色・状態は挿入しない。
    parts.push({ text: match[0], cue: cues.find(cue => cue.color === match[0]) });
    cursor = start + match[0].length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts;
}
