/**
 * セッション記録ユーティリティ
 * ローカルに1問ごとの正誤ログを保存し、セッション完了時にスプレッドシートに記録する
 */

import { GAS_URLS } from '../config/dataSource';

// Storage keys
const STORAGE_KEY_ACTIVE_USER = 'chem.activeUser';
const STORAGE_KEY_QUESTION_LOGS = 'chem.questionLogs';
const STORAGE_KEY_SESSION_LOGS = 'chem.sessionLogs';

/**
 * アクティブユーザー
 */
export interface ActiveUser {
  userKey: string; // 内部ID（UUID推奨）
  displayName: string; // 表示名
  public: boolean; // PUBLIC/PRIVATE
}

/**
 * 問題ログ（1問ごとの記録）
 */
export interface QuestionLog {
  questionId: string; // `${mode}|${unit}|${range}|${index}`
  isCorrect: boolean;
  timestamp: number; // Date.now()
  mode: string;
  category: 'organic' | 'inorganic';
}

/**
 * セッションログ（1セッションの記録）
 */
export interface SessionLog {
  sessionId: string; // UUID
  userKey: string;
  mode: string;
  category: 'organic' | 'inorganic';
  rangeKey: string;
  correctCount: number;
  totalCount: number;
  pointScore: number;
  timestamp: number; // Date.now()
  date: string; // ISO date string
}

/**
 * recシートの行データ（スプレッドシート保存用）
 */
export interface RecRow {
  userKey: string;
  displayName: string;
  mode: string;
  category: string;
  rangeKey: string;
  correctCount: number;
  totalCount: number;
  pointScore: number;
  accuracy: number; // correctCount / totalCount
  date: string; // ISO date string
  timestamp: number; // Date.now()
}

/**
 * 表示用サマリー（集計結果）
 */
export interface RecSummary {
  EXP: number; // 経験値（全セッションの合計正解数）
  LV: number; // レベル（計算ロジックは後で定義）
  allAve: number; // 全セッション合算の正解率（0-1）
  tenAve: number; // 過去10セッション合算の正解率（0-1）
  sess: number; // セッション数
  last: string; // 最終セッション日時（ISO string）
  cst: number; // 現在の連続正解数
  mst: number; // 最大連続正解数
}

/**
 * アクティブユーザーを取得
 */
export const getActiveUser = (): ActiveUser | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_ACTIVE_USER);
    if (!stored) return null;
    return JSON.parse(stored) as ActiveUser;
  } catch (error) {
    console.warn('Failed to get active user:', error);
    return null;
  }
};

/**
 * アクティブユーザーを保存
 */
export const setActiveUser = (user: ActiveUser): void => {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_USER, JSON.stringify(user));
  } catch (error) {
    console.warn('Failed to set active user:', error);
  }
};

/**
 * アクティブユーザーをクリア
 */
export const clearActiveUser = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
  } catch (error) {
    console.warn('Failed to clear active user:', error);
  }
};

/**
 * UUIDを生成（簡易版）
 */
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * 問題ログを保存
 */
export const saveQuestionLog = (log: QuestionLog): void => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_QUESTION_LOGS);
    const logs: QuestionLog[] = stored ? JSON.parse(stored) : [];
    logs.push(log);
    // 最新10000件まで保持（メモリ節約）
    const maxLogs = 10000;
    const recentLogs = logs.slice(-maxLogs);
    localStorage.setItem(STORAGE_KEY_QUESTION_LOGS, JSON.stringify(recentLogs));
  } catch (error) {
    console.warn('Failed to save question log:', error);
  }
};

/**
 * 問題ログを取得（ユーザーキーでフィルタ）
 */
export const getQuestionLogs = (_userKey: string): QuestionLog[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_QUESTION_LOGS);
    if (!stored) return [];
    const allLogs: QuestionLog[] = JSON.parse(stored);
    return allLogs.filter(_log => {
      // userKeyはQuestionLogに含まれていないため、セッションログから逆引きする必要がある
      // 簡易実装: 全ログを返す（実際の実装ではセッションIDで紐付ける）
      return true;
    });
  } catch (error) {
    console.warn('Failed to get question logs:', error);
    return [];
  }
};

/**
 * セッションログを保存
 */
export const saveSessionLog = (log: SessionLog): void => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SESSION_LOGS);
    const logs: SessionLog[] = stored ? JSON.parse(stored) : [];
    logs.push(log);
    // 最新1000セッションまで保持
    const maxSessions = 1000;
    const recentLogs = logs.slice(-maxSessions);
    localStorage.setItem(STORAGE_KEY_SESSION_LOGS, JSON.stringify(recentLogs));
  } catch (error) {
    console.warn('Failed to save session log:', error);
  }
};

/**
 * セッションログを取得（ユーザーキーでフィルタ）
 */
export const getSessionLogs = (userKey: string): SessionLog[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SESSION_LOGS);
    if (!stored) return [];
    const allLogs: SessionLog[] = JSON.parse(stored);
    return allLogs.filter(log => log.userKey === userKey).sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.warn('Failed to get session logs:', error);
    return [];
  }
};

/**
 * セッションからサマリーを計算
 */
export const computeSummaryFromSessions = (_userKey: string, sessions: SessionLog[]): RecSummary => {
  if (sessions.length === 0) {
    return {
      EXP: 0,
      LV: 0,
      allAve: 0,
      tenAve: 0,
      sess: 0,
      last: '',
      cst: 0,
      mst: 0,
    };
  }

  // 全セッション合算
  const totalCorrect = sessions.reduce((sum, s) => sum + s.correctCount, 0);
  const totalQuestions = sessions.reduce((sum, s) => sum + s.totalCount, 0);
  const allAve = totalQuestions > 0 ? totalCorrect / totalQuestions : 0;

  // 過去10セッション合算
  const recent10 = sessions.slice(0, 10);
  const recent10Correct = recent10.reduce((sum, s) => sum + s.correctCount, 0);
  const recent10Questions = recent10.reduce((sum, s) => sum + s.totalCount, 0);
  const tenAve = recent10Questions > 0 ? recent10Correct / recent10Questions : 0;

  // 連続正解数の計算（問題ログから計算）
  // 簡易実装: セッション単位で計算（questionLogsは未使用）
  let cst = 0; // 現在の連続正解数
  let mst = 0; // 最大連続正解数
  let currentStreak = 0;
  
  // セッションを時系列順（古い順）にソート
  const sortedSessions = [...sessions].sort((a, b) => a.timestamp - b.timestamp);
  for (const session of sortedSessions) {
    const sessionAccuracy = session.totalCount > 0 ? session.correctCount / session.totalCount : 0;
    // 100%正解のセッションを連続正解としてカウント（簡易実装）
    if (sessionAccuracy === 1.0) {
      currentStreak++;
      mst = Math.max(mst, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  cst = currentStreak;

  // 経験値: 全セッションの合計正解数
  const EXP = totalCorrect;

  // レベル: 経験値に基づく簡易計算（後で調整可能）
  const LV = Math.floor(EXP / 100) + 1;

  // 最終セッション日時
  const lastSession = sessions[0]; // 既にソート済み（新しい順）
  const last = lastSession.date;

  return {
    EXP,
    LV,
    allAve,
    tenAve,
    sess: sessions.length,
    last,
    cst,
    mst,
  };
};

/**
 * セッション完了時に呼び出す（問題ログとセッションログを保存）
 */
export const saveQuestionLogsForSession = (
  _sessionId: string,
  questionLogs: QuestionLog[]
): void => {
  // 各ログにsessionIdを追加する必要があるが、QuestionLog型を変更せずに実装
  // 簡易実装: そのまま保存（実際の実装ではセッションIDで紐付ける）
  questionLogs.forEach(log => {
    saveQuestionLog(log);
  });
};

/**
 * recシートに1行追加（GAS経由）
 */
export const pushRecRowToSheetRec = async (row: RecRow, category: 'organic' | 'inorganic'): Promise<boolean> => {
  try {
    const gasUrl = GAS_URLS[category];
    
    if (!gasUrl) {
      throw new Error(`GAS URL not configured for category: ${category}`);
    }
    
    await fetch(gasUrl, {
      method: 'POST',
      mode: 'no-cors', // CORS問題を回避（レスポンスは取得できない）
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(row),
    });
    
    // no-corsモードではレスポンスを取得できないため、常にtrueを返す
    // エラーハンドリングはGAS側で行う
    return true;
  } catch (error) {
    console.warn('Failed to push rec row to sheet:', error);
    return false;
  }
};

/**
 * recシートから最新行を取得（GAS経由）
 */
export const fetchLatestRecRow = async (userKey: string, category: 'organic' | 'inorganic'): Promise<RecRow | null> => {
  try {
    const gasUrl = GAS_URLS[category];
    
    if (!gasUrl) {
      throw new Error(`GAS URL not configured for category: ${category}`);
    }
    
    const response = await fetch(`${gasUrl}?type=rec&userKey=${encodeURIComponent(userKey)}`, {
      method: 'GET',
      mode: 'cors',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch rec row: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }
    
    if (!data.data) {
      return null;
    }
    
    return data.data as RecRow;
  } catch (error) {
    console.warn('Failed to fetch latest rec row:', error);
    return null;
  }
};
