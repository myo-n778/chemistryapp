/**
 * スコア計算ユーティリティ
 */

export interface ScoreResult {
  score: number;
  isCorrect: boolean;
}

const HIGH_SCORE_KEY = 'chemistry-quiz-highscore';
const SCORE_HISTORY_KEY = 'chemistry-quiz-score-history';

export interface ScoreHistoryEntry {
  score: number;
  correctCount: number;
  totalCount: number;
  date: string; // ISO date string
}

export interface HighScoreData {
  score: number;
  correctCount: number;
  totalCount: number;
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
 * 最高記録をlocalStorageから取得（互換性のため）
 */
export const getHighScore = (): number => {
  return getHighScoreWithCount().score;
};

/**
 * 最高記録をlocalStorageから取得（正解数付き）
 */
export const getHighScoreWithCount = (): HighScoreData => {
  try {
    const history = getScoreHistory();
    if (history.length > 0) {
      const topEntry = history[0];
      return {
        score: topEntry.score,
        correctCount: topEntry.correctCount,
        totalCount: topEntry.totalCount,
      };
    }
    // 互換性のため旧形式も確認
    const stored = localStorage.getItem(HIGH_SCORE_KEY);
    if (stored) {
      const score = parseInt(stored, 10);
      if (score > 0) {
        return { score, correctCount: 0, totalCount: 0 };
      }
    }
  } catch (error) {
    console.warn('Failed to get high score from localStorage:', error);
  }
  return { score: 0, correctCount: 0, totalCount: 0 };
};

/**
 * スコア履歴をlocalStorageから取得
 */
export const getScoreHistory = (): ScoreHistoryEntry[] => {
  try {
    const stored = localStorage.getItem(SCORE_HISTORY_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to get score history from localStorage:', error);
  }
  return [];
};

/**
 * 最高記録をlocalStorageに保存（互換性のため）
 */
export const saveHighScore = (score: number, correctCount: number = 0, totalCount: number = 0): void => {
  try {
    const history = getScoreHistory();
    const newEntry: ScoreHistoryEntry = {
      score,
      correctCount,
      totalCount,
      date: new Date().toISOString(),
    };
    
    // 新しいエントリを追加
    history.push(newEntry);
    
    // スコアの降順でソート
    history.sort((a, b) => b.score - a.score);
    
    // 上位5件のみ保持
    const top5 = history.slice(0, 5);
    
    localStorage.setItem(SCORE_HISTORY_KEY, JSON.stringify(top5));
    
    // 互換性のため最高スコアも保存
    if (top5.length > 0) {
      localStorage.setItem(HIGH_SCORE_KEY, top5[0].score.toString());
    }
  } catch (error) {
    console.warn('Failed to save high score to localStorage:', error);
  }
};
