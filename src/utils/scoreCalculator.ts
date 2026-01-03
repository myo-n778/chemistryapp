/**
 * スコア計算ユーティリティ
 */

export interface ScoreResult {
  score: number;
  isCorrect: boolean;
}

const HIGH_SCORE_KEY = 'chemistry-quiz-highscore';
const SCORE_HISTORY_KEY = 'chemistry-quiz-score-history';

/**
 * スコア履歴のキーを生成（モード×範囲ごとに分離）
 */
const getScoreHistoryKey = (mode: string, rangeKey: string): string => {
  return `chemistry-quiz-score-history-${mode}-${rangeKey}`;
};

/**
 * 範囲キーを生成
 */
export const getRangeKey = (questionCountMode: 'all' | 'batch-10' | 'batch-20' | 'batch-40', startIndex?: number, allQuestionCount?: number | null): string => {
  if (questionCountMode === 'all') {
    if (allQuestionCount !== undefined && allQuestionCount !== null) {
      return `all-${allQuestionCount}`;
    }
    return 'all-full';
  } else if (questionCountMode === 'batch-10' && startIndex !== undefined) {
    const endIndex = startIndex + 9;
    return `${startIndex}-${endIndex}`;
  } else if (questionCountMode === 'batch-20' && startIndex !== undefined) {
    const endIndex = startIndex + 19;
    return `${startIndex}-${endIndex}`;
  } else if (questionCountMode === 'batch-40' && startIndex !== undefined) {
    const endIndex = startIndex + 39;
    return `${startIndex}-${endIndex}`;
  }
  return 'unknown';
};

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
 * @param mode クイズモード
 * @param rangeKey 範囲キー（getRangeKeyで生成）
 */
export const getHighScoreWithCount = (mode?: string, rangeKey?: string): HighScoreData => {
  try {
    const history = mode && rangeKey ? getScoreHistory(mode, rangeKey) : getScoreHistory();
    if (history.length > 0) {
      const topEntry = history[0];
      return {
        score: topEntry.score,
        correctCount: topEntry.correctCount,
        totalCount: topEntry.totalCount,
      };
    }
    // 互換性のため旧形式も確認（mode/rangeKeyが指定されている場合はスキップ）
    if (!mode || !rangeKey) {
      const stored = localStorage.getItem(HIGH_SCORE_KEY);
      if (stored) {
        const score = parseInt(stored, 10);
        if (score > 0) {
          return { score, correctCount: 0, totalCount: 0 };
        }
      }
    }
  } catch (error) {
    console.warn('Failed to get high score from localStorage:', error);
  }
  return { score: 0, correctCount: 0, totalCount: 0 };
};

/**
 * スコア履歴をlocalStorageから取得
 * @param mode クイズモード（指定された場合、そのモード×範囲の履歴のみ取得）
 * @param rangeKey 範囲キー（指定された場合、その範囲の履歴のみ取得）
 */
export const getScoreHistory = (mode?: string, rangeKey?: string): ScoreHistoryEntry[] => {
  try {
    const key = mode && rangeKey ? getScoreHistoryKey(mode, rangeKey) : SCORE_HISTORY_KEY;
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        console.warn('Invalid score history format, resetting');
        localStorage.removeItem(key);
        return [];
      }
      // 各エントリの検証
      const valid = parsed.filter(entry => {
        if (!entry || typeof entry !== 'object') return false;
        return typeof entry.score === 'number' && 
               typeof entry.correctCount === 'number' &&
               typeof entry.totalCount === 'number' &&
               typeof entry.date === 'string' &&
               entry.score >= 0 &&
               entry.correctCount >= 0 &&
               entry.totalCount >= 0;
      });
      return valid;
    }
  } catch (error) {
    console.warn('Failed to get score history from localStorage:', error);
    // 破損データを削除
    const key = mode && rangeKey ? getScoreHistoryKey(mode, rangeKey) : SCORE_HISTORY_KEY;
    try {
      localStorage.removeItem(key);
    } catch (removeError) {
      // localStorage.removeItem が失敗することは稀だが、念のため
    }
  }
  return [];
};

/**
 * 最高記録をlocalStorageに保存
 * @param score スコア
 * @param correctCount 正解数
 * @param totalCount 総問題数
 * @param mode クイズモード（指定された場合、そのモード×範囲に保存）
 * @param rangeKey 範囲キー（指定された場合、その範囲に保存）
 */
export const saveHighScore = (
  score: number, 
  correctCount: number = 0, 
  totalCount: number = 0,
  mode?: string,
  rangeKey?: string
): void => {
  try {
    const key = mode && rangeKey ? getScoreHistoryKey(mode, rangeKey) : SCORE_HISTORY_KEY;
    const history = mode && rangeKey ? getScoreHistory(mode, rangeKey) : getScoreHistory();
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
    
    localStorage.setItem(key, JSON.stringify(top5));
    
    // 互換性のため最高スコアも保存（mode/rangeKeyが指定されている場合はスキップ）
    if (!mode || !rangeKey) {
      if (top5.length > 0) {
        localStorage.setItem(HIGH_SCORE_KEY, top5[0].score.toString());
      }
    }
  } catch (error) {
    console.warn('Failed to save high score to localStorage:', error);
  }
};
