import type { InorganicReactionNew } from '../types/inorganic';
import { shuffleLearning, validateLearningChoices } from './learningChoices';
function reviewed(reaction: InorganicReactionNew, target: 'a' | 'b' | 'c', answer: string, count: number): string[] {
  const choices = reaction[`${target}_distractors`] || [];
  validateLearningChoices(answer, choices, `${reaction.id} ${target.toUpperCase()}`);
  return choices.slice(0, count).map(choice => choice.text);
}
export const generateDistractorsForTypeA = (reaction: InorganicReactionNew, _pool: InorganicReactionNew[], count = 3) => reviewed(reaction, 'a', reaction.products, count);
export const generateDistractorsForTypeB = (reaction: InorganicReactionNew, _pool: InorganicReactionNew[], count = 3) => reviewed(reaction, 'b', reaction.conditions, count);
export const generateDistractorsForTypeC = (reaction: InorganicReactionNew, _pool: InorganicReactionNew[], count = 3) => reviewed(reaction, 'c', reaction.observations, count);
export const shuffleChoices = <T>(correctAnswer: T, distractors: T[]): { choices: T[]; correctIndex: number } => {
  const choices = shuffleLearning([correctAnswer, ...distractors]);
  return { choices, correctIndex: choices.indexOf(correctAnswer) };
};
