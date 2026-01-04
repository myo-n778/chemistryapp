import { InorganicReaction } from '../types';

/**
 * 誤答生成の優先順位に従って、正答以外の選択肢を生成
 */
export const generateDistractors = (
  correctReaction: InorganicReaction,
  allReactions: InorganicReaction[],
  answerField: 'products_desc' | 'observations' | 'equation_tex' | 'conditions' | 'operation',
  count: number = 3
): string[] => {
  const correctAnswer = correctReaction[answerField];
  const distractors: string[] = [];
  const usedAnswers = new Set<string>([correctAnswer]);

  // 優先順位1: 同familyの別variant
  if (correctReaction.family) {
    const sameFamily = allReactions.filter(
      r => r.family === correctReaction.family && 
           r.id !== correctReaction.id &&
           r[answerField] &&
           r[answerField] !== correctAnswer
    );
    
    for (const reaction of sameFamily) {
      const answer = reaction[answerField];
      if (answer && !usedAnswers.has(answer) && distractors.length < count) {
        distractors.push(answer);
        usedAnswers.add(answer);
      }
    }
  }

  // 優先順位2: 同tags_norm
  if (distractors.length < count && correctReaction.tags_norm.length > 0) {
    const sameTags = allReactions.filter(
      r => r.id !== correctReaction.id &&
           r[answerField] &&
           r[answerField] !== correctAnswer &&
           r.tags_norm.some(tag => correctReaction.tags_norm.includes(tag))
    );
    
    for (const reaction of sameTags) {
      const answer = reaction[answerField];
      if (answer && !usedAnswers.has(answer) && distractors.length < count) {
        distractors.push(answer);
        usedAnswers.add(answer);
      }
    }
  }

  // 優先順位3: 同元素系（reactants_descやproducts_descから元素を抽出）
  if (distractors.length < count) {
    const elements = extractElements(correctReaction);
    if (elements.length > 0) {
      const sameElements = allReactions.filter(
        r => r.id !== correctReaction.id &&
             r[answerField] &&
             r[answerField] !== correctAnswer &&
             (extractElements(r).some(el => elements.includes(el)))
      );
      
      for (const reaction of sameElements) {
        const answer = reaction[answerField];
        if (answer && !usedAnswers.has(answer) && distractors.length < count) {
          distractors.push(answer);
          usedAnswers.add(answer);
        }
      }
    }
  }

  // 優先順位4: ランダム（最終手段）
  const remaining = allReactions.filter(
    r => r.id !== correctReaction.id &&
         r[answerField] &&
         r[answerField] !== correctAnswer &&
         !usedAnswers.has(r[answerField])
  );

  // ランダムにシャッフル
  const shuffled = [...remaining].sort(() => Math.random() - 0.5);
  
  for (const reaction of shuffled) {
    const answer = reaction[answerField];
    if (answer && distractors.length < count) {
      distractors.push(answer);
      usedAnswers.add(answer);
    }
  }

  return distractors.slice(0, count);
};

/**
 * 反応から主要な元素を抽出（簡易版）
 */
const extractElements = (reaction: InorganicReaction): string[] => {
  const elements: string[] = [];
  const text = `${reaction.reactants_desc} ${reaction.products_desc}`;
  
  // 主要な元素記号を検出（H, He, Li, Be, B, C, N, O, F, Ne, Na, Mg, Al, Si, P, S, Cl, Ar, K, Ca, Fe, Cu, Zn, Ag, I, Ba, Pbなど）
  const elementPatterns = [
    /H[2O]?/g, /He/g, /Li/g, /Be/g, /B/g, /C[O2]?/g, /N[2O]?/g, /O[2H]?/g, /F/g, /Ne/g,
    /Na[Cl]?/g, /Mg/g, /Al/g, /Si/g, /P/g, /S[O2]?/g, /Cl[2]?/g, /Ar/g,
    /K/g, /Ca/g, /Fe/g, /Cu/g, /Zn/g, /Ag/g, /I[2]?/g, /Ba/g, /Pb/g
  ];
  
  elementPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // 元素記号のみを抽出（化合物名の一部でない場合）
        const element = match.replace(/[0-9]/g, '').toUpperCase();
        if (element.length <= 2 && !elements.includes(element)) {
          elements.push(element);
        }
      });
    }
  });
  
  return elements;
};

/**
 * 選択肢をシャッフルして正答の位置を返す
 */
export const shuffleChoices = <T>(correctAnswer: T, distractors: T[]): { choices: T[], correctIndex: number } => {
  const allChoices = [correctAnswer, ...distractors];
  const shuffled = [...allChoices].sort(() => Math.random() - 0.5);
  const correctIndex = shuffled.indexOf(correctAnswer);
  return { choices: shuffled, correctIndex };
};

