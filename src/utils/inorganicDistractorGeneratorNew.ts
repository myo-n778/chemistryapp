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
 * タイプB（反応式 → 条件）用の誤答生成
 * 正解（conditions）以外の選択肢を生成
 */
export const generateDistractorsForTypeB = (
  correctReaction: InorganicReactionNew,
  allReactions: InorganicReactionNew[],
  count: number = 3
): string[] => {
  const correctAnswer = correctReaction.conditions;
  const distractors: string[] = [];
  const usedAnswers = new Set<string>([correctAnswer]);

  // 優先順位1: 同系統を優先（条件の類似性を考慮）
  // 簡単な実装：同じ反応式（equation）を持つ他の反応から選択
  if (correctReaction.equation) {
    const sameEquation = allReactions.filter(
      r => r.id !== correctReaction.id &&
           r.conditions &&
           r.conditions !== correctAnswer &&
           r.equation === correctReaction.equation
    );
    
    for (const reaction of sameEquation) {
      if (reaction.conditions && !usedAnswers.has(reaction.conditions) && distractors.length < count) {
        distractors.push(reaction.conditions);
        usedAnswers.add(reaction.conditions);
      }
    }
  }

  // 優先順位2: ランダム（最終手段）
  const remaining = allReactions.filter(
    r => r.id !== correctReaction.id &&
         r.conditions &&
         r.conditions !== correctAnswer &&
         !usedAnswers.has(r.conditions)
  );

  // ランダムに選択
  const shuffled = [...remaining].sort(() => Math.random() - 0.5);
  for (const reaction of shuffled) {
    if (reaction.conditions && !usedAnswers.has(reaction.conditions) && distractors.length < count) {
      distractors.push(reaction.conditions);
      usedAnswers.add(reaction.conditions);
    }
  }

  return distractors;
};

/**
 * タイプC（反応式 → 観察）用の誤答生成
 * 正解（observations）以外の選択肢を生成
 * タイプCでは「色だけ違う」「↑/↓が違う」誤答を優先
 */
export const generateDistractorsForTypeC = (
  correctReaction: InorganicReactionNew,
  allReactions: InorganicReactionNew[],
  count: number = 3
): string[] => {
  const correctAnswer = correctReaction.observations;
  const distractors: string[] = [];
  const usedAnswers = new Set<string>([correctAnswer]);

  // 優先順位1: 同じ反応式で観察が異なるもの（色だけ違う、↑/↓が違うなど）
  if (correctReaction.equation) {
    const sameEquation = allReactions.filter(
      r => r.id !== correctReaction.id &&
           r.observations &&
           r.observations !== correctAnswer &&
           r.equation === correctReaction.equation
    );
    
    for (const reaction of sameEquation) {
      if (reaction.observations && !usedAnswers.has(reaction.observations) && distractors.length < count) {
        distractors.push(reaction.observations);
        usedAnswers.add(reaction.observations);
      }
    }
  }

  // 優先順位2: 観察事項が類似しているもの（色だけ違う、↑/↓が違うなど）
  // 簡単な実装：観察事項に同じキーワード（色、沈殿、気体など）を含むもの
  const observationKeywords = extractObservationKeywords(correctAnswer);
  if (observationKeywords.length > 0) {
    const similarObservations = allReactions.filter(
      r => r.id !== correctReaction.id &&
           r.observations &&
           r.observations !== correctAnswer &&
           !usedAnswers.has(r.observations) &&
           observationKeywords.some(keyword => r.observations.includes(keyword))
    );
    
    for (const reaction of similarObservations) {
      if (reaction.observations && !usedAnswers.has(reaction.observations) && distractors.length < count) {
        distractors.push(reaction.observations);
        usedAnswers.add(reaction.observations);
      }
    }
  }

  // 優先順位3: ランダム（最終手段）
  const remaining = allReactions.filter(
    r => r.id !== correctReaction.id &&
         r.observations &&
         r.observations !== correctAnswer &&
         !usedAnswers.has(r.observations)
  );

  // ランダムに選択
  const shuffled = [...remaining].sort(() => Math.random() - 0.5);
  for (const reaction of shuffled) {
    if (reaction.observations && !usedAnswers.has(reaction.observations) && distractors.length < count) {
      distractors.push(reaction.observations);
      usedAnswers.add(reaction.observations);
    }
  }

  return distractors;
};

/**
 * 観察事項からキーワード（色、沈殿、気体など）を抽出
 */
function extractObservationKeywords(observation: string): string[] {
  const keywords: string[] = [];
  const colorKeywords = ['白', '黒', '赤', '青', '緑', '黄', '茶', '灰', '紫', 'ピンク', '褐色', '無色'];
  const typeKeywords = ['沈殿', '気体', '溶液', 'イオン', '↑', '↓'];
  
  for (const keyword of [...colorKeywords, ...typeKeywords]) {
    if (observation.includes(keyword)) {
      keywords.push(keyword);
    }
  }
  
  return keywords;
}

/**
 * 選択肢をシャッフルして正解インデックスを返す
 */
export const shuffleChoices = <T>(correctAnswer: T, distractors: T[]): { choices: T[], correctIndex: number } => {
  const allChoices = [correctAnswer, ...distractors];
  const shuffled = [...allChoices].sort(() => Math.random() - 0.5);
  const correctIndex = shuffled.indexOf(correctAnswer);
  return { choices: shuffled, correctIndex };
};

