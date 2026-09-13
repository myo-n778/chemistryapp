import type { QuizMode } from '../components/ModeSelector';

// 出題タイプ選択と問題数選択で、同じ名称を使う。
export const quizModeLabels: Partial<Record<QuizMode, string>> = {
  'structure-to-name': '① 構造式から名称',
  'name-to-structure': '② 名称から構造式',
  'compound-type': '③ 化合物の種類',
  reaction: '④ 反応（何ができる）',
  substitution: '⑤ 反応（何をした）',
  experiment: '⑥ 分類実験',
};
