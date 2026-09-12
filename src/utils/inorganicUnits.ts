import type { InorganicReactionNew } from '../types/inorganic';
import { shuffleLearning } from './learningChoices';
import { getRangeKey } from './scoreCalculator';

export type InorganicLearningMode = 'unit-sequential' | 'unit-shuffle' | 'global-shuffle';
export interface InorganicLearningSettings {
  learningMode?: InorganicLearningMode;
  unitId?: string;
  questionCountMode?: 'all' | 'batch-10' | 'batch-20' | 'batch-40';
  startIndex?: number;
  allQuestionCount?: number | null;
}
export const learningModeLabels: Record<InorganicLearningMode, string> = {
  'unit-sequential': '単元順', 'unit-shuffle': '単元内ランダム', 'global-shuffle': '完全ランダム'
};
const unit = (id: string, title: string, description: string, numbers: number[]) => ({
  id, title, description, questionIds: numbers.map(n => `inorg-${String(n).padStart(3, '0')}`)
});
// 問題IDはSheetsのquestion_id。行移動に依存しない。保留も分類し、出題可否は読込側で決める。
export const inorganicUnits = [
  unit('gases', '気体の発生と性質', '酸やアルカリを加えて発生する気体', [1,2,3,4,5,6]),
  unit('precipitates', '沈殿と色', 'イオンの組合せと沈殿の色', [7,8,9,10,11,12,13,14,15,16,90]),
  unit('complexes', '両性元素と錯イオン', '沈殿の溶解・過剰の試薬・錯イオン', [17,18,19,20,48,49,50,83,84,85,86,87]),
  unit('metals', '金属と水・酸', '水素の発生と金属の置換', [24,25,26,21,22,23,56]),
  unit('halogens', 'ハロゲン', '酸化力の比較と塩素の反応', [27,28,69,70,29,30,71]),
  unit('decomposition', '分解と加熱', '熱分解と過酸化水素の分解', [51,54,88,52,53,89,55,60]),
  unit('sulfur', '硫黄と硫酸', '硫黄の化合物と硫酸の製法', [33,34,35,36,80,81,31,32]),
  unit('nitrogen', '窒素・リン', 'アンモニア・硝酸・リンの化合物', [37,41,44,38,39,40,82,42,43,45,46,47]),
  unit('electrolysis', '電気分解', '水溶液・溶融塩の電極と全反応', [57,58,59,63,64,65,66,67,68]),
  unit('redox', '酸化還元と液性', '半反応式・酸化剤と還元剤・液性による色の変化', [61,62,72,73,74,75,76,77,78,79]),
];
const knownIds = new Set(inorganicUnits.flatMap(u => u.questionIds));
export function getInorganicUnits(reactions: InorganicReactionNew[]) {
  const byId = new Map(reactions.map(r => [r.id, r]));
  const result = inorganicUnits.map(u => ({ ...u, reactions: u.questionIds.flatMap(id => byId.has(id) ? [byId.get(id)!] : []) }));
  const unknown = reactions.filter(r => !knownIds.has(r.id));
  if (unknown.length) result.push({ id: 'unclassified', title: '未分類の追加問題', description: '追加された問題です。単元分類の確認待ちです。', questionIds: unknown.map(r => r.id), reactions: unknown });
  return result;
}
export function buildInorganicSession(reactions: InorganicReactionNew[], settings: InorganicLearningSettings) {
  if (settings.learningMode === 'global-shuffle') return shuffleLearning(reactions).slice(0, settings.allQuestionCount ?? reactions.length);
  const selected = getInorganicUnits(reactions).find(u => u.id === settings.unitId)?.reactions ?? [];
  return settings.learningMode === 'unit-shuffle' ? shuffleLearning(selected) : [...selected];
}
export function nextInorganicUnit(reactions: InorganicReactionNew[], settings: InorganicLearningSettings) {
  if (!settings.learningMode || settings.learningMode === 'global-shuffle') return undefined;
  const units = getInorganicUnits(reactions);
  const index = units.findIndex(u => u.id === settings.unitId);
  return index < 0 ? undefined : units.slice(index + 1).find(u => u.reactions.length > 0);
}
export function inorganicRangeKey(settings?: InorganicLearningSettings) {
  if (settings?.learningMode) return `units-v1-${settings.learningMode}-${settings.learningMode === 'global-shuffle' ? 'all' : settings.unitId}-${settings.allQuestionCount ?? 'full'}`;
  return getRangeKey(settings?.questionCountMode ?? 'all', settings?.startIndex, settings?.allQuestionCount);
}
