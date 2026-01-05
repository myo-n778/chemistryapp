import { InorganicReactionNew } from '../types/inorganic';

/**
 * 誤答生成ロジック（新しい無機化学データ用）
 * タイプA用の最小実装（後でB/C向けに強化）
 */

/**
 * タイプA（反応 → 生成物）用の誤答生成
 * 正解（products）以外の選択肢を生成
 */
export const generateDistractorsForTypeA = (
  correctReaction: InorganicReactionNew,
  allReactions: InorganicReactionNew[],
  count: number = 3
): string[] => {
  const correctAnswer = correctReaction.products;
  const distractors: string[] = [];
  const usedAnswers = new Set<string>([correctAnswer]);

  // 優先順位1: 同系統を優先（生成物の類似性を考慮）
  // 簡単な実装：同じ反応内容（reactants）を持つ他の反応から選択
  if (correctReaction.reactants) {
    const sameReactants = allReactions.filter(
      r => r.id !== correctReaction.id &&
           r.products &&
           r.products !== correctAnswer &&
           r.reactants === correctReaction.reactants
    );
    
    for (const reaction of sameReactants) {
      if (reaction.products && !usedAnswers.has(reaction.products) && distractors.length < count) {
        distractors.push(reaction.products);
        usedAnswers.add(reaction.products);
      }
    }
  }

  // 優先順位2: ランダム（最終手段）
  const remaining = allReactions.filter(
    r => r.id !== correctReaction.id &&
         r.products &&
         r.products !== correctAnswer &&
         !usedAnswers.has(r.products)
  );

  // ランダムに選択
  const shuffled = [...remaining].sort(() => Math.random() - 0.5);
  for (const reaction of shuffled) {
    if (reaction.products && !usedAnswers.has(reaction.products) && distractors.length < count) {
      distractors.push(reaction.products);
      usedAnswers.add(reaction.products);
    }
  }

  return distractors;
};

/**
 * 選択肢をシャッフルして正解インデックスを返す
 */
export const shuffleChoices = <T>(correctAnswer: T, distractors: T[]): { choices: T[], correctIndex: number } => {
  const allChoices = [correctAnswer, ...distractors];
  const shuffled = [...allChoices].sort(() => Math.random() - 0.5);
  const correctIndex = shuffled.indexOf(correctAnswer);
  return { choices: shuffled, correctIndex };
};

