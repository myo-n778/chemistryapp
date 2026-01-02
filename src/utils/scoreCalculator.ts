/**
 * スコア計算ユーティリティ
 */

export interface ScoreResult {
  score: number;
  isCorrect: boolean;
}

/**
 * 問題ごとのスコアを計算
 * @param isCorrect 正解かどうか
 * @param elapsedSeconds 経過秒数
 * @param consecutiveCount 連続正解回数（同じ問題が連続で正解した回数）
 * @returns スコア
 */
export const calculateScore = (
  isCorrect: boolean,
  elapsedSeconds: number,
  consecutiveCount: number = 0,
  isShuffleMode: boolean = false
): number => {
  if (!isCorrect) {
    return 0;
  }

  // 基本スコア
  let baseScore = 1000;

  // 時間減点（1秒ごとに50点減点）
  const timePenalty = Math.floor(elapsedSeconds) * 50;
  baseScore = Math.max(100, baseScore - timePenalty); // 最低100点

  // 連続正解ボーナス（同じ問題が連続で正解した場合のみ）
  if (consecutiveCount > 1) {
    const bonusMultiplier = Math.pow(1.1, consecutiveCount - 1);
    baseScore = Math.floor(baseScore * bonusMultiplier);
  }

  // シャッフルモード倍率
  if (isShuffleMode) {
    baseScore = Math.round(baseScore * 1.5);
  }

  return baseScore;
};

/**
 * 最高記録をlocalStorageから取得
 */
export const getHighScore = (): number => {
  try {
    const stored = localStorage.getItem('chemistry-quiz-highscore');
    if (stored) {
      return parseInt(stored, 10);
    }
  } catch (error) {
    console.warn('Failed to get high score from localStorage:', error);
  }
  return 0;
};

/**
 * 最高記録をlocalStorageに保存
 */
export const saveHighScore = (score: number): void => {
  try {
    const currentHighScore = getHighScore();
    if (score > currentHighScore) {
      localStorage.setItem('chemistry-quiz-highscore', score.toString());
    }
  } catch (error) {
    console.warn('Failed to save high score to localStorage:', error);
  }
};

