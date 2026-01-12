/**
 * セッション記録ユーティリティ
 * ローカルに1問ごとの正誤ログを保存し、セッション完了時にスプレッドシートに記録する
 */

import { GAS_URLS } from '../config/dataSource';

// GAS BASE URL（rec取得専用）
const GAS_BASE_URL = 'https://script.google.com/macros/s/AKfycbx7Xbe0Q89w1QNGJ2lCcBYaAT6f1d_yIdUeRZtlDR3tKwZZ3ESDSWltE1p6FjCSdyAUng/exec';

// rec取得専用URL（action=recのみ、typeパラメータは一切含めない）
const GAS_REC_URL = `${GAS_BASE_URL}?action=rec`;

// recデータのキャッシュ（全データを1回取得して再利用）
let recDataCache: RecRow[] | null = null;
let recDataCacheTimestamp: number = 0;
const REC_CACHE_TTL = 30 * 1000; // 30秒キャッシュ

/**
 * RecRowを正規化（recordedAtを数値に変換、その他の型を保証）
 */
function normalizeRecRow(row: Record<string, any>): RecRow | null {
  try {
    // recordedAtを数値に変換
    let recordedAt: number;
    if (typeof row.recordedAt === 'string') {
      recordedAt = Number(row.recordedAt);
      if (isNaN(recordedAt)) {
        recordedAt = 0;
      }
    } else if (typeof row.recordedAt === 'number') {
      recordedAt = row.recordedAt;
    } else {
      // timestampから取得を試みる
      recordedAt = typeof row.timestamp === 'number' ? row.timestamp : 0;
    }
    
    return {
      userKey: String(row.userKey || ''),
      displayName: String(row.name || row.displayName || ''),
      mode: String(row.mode || ''),
      category: (row.mode || '').indexOf('organic') === 0 ? 'organic' : 'inorganic',
      rangeKey: String(row.rangeKey || ''),
      correctCount: Number(row.correctCount || 0),
      totalCount: Number(row.totalCount || 0),
      pointScore: Number(row.pointScore || 0),
      accuracy: Number(row.accuracy || 0),
      date: String(row.date || row.last || ''),
      timestamp: recordedAt,
      isPublic: Boolean(row.isPublic),
      name: String(row.name || ''),
      EXP: Number(row.EXP || 0),
      LV: Number(row.LV || 0),
      tenAve: Number(row.tenAve || 0),
      allAve: Number(row.allAve || 0),
      sess: Number(row.sess || 0),
      cst: Number(row.cst || 0),
      mst: Number(row.mst || 0),
      last: String(row.last || ''),
      recordedAt: recordedAt
    };
  } catch (error) {
    console.warn('Failed to normalize rec row:', error, row);
    return null;
  }
}

/**
 * recシートの全データを取得（キャッシュ付き）
 * 専用エンドポイント（action=rec）を使用し、type検証を完全に回避
 */
async function fetchAllRecData(): Promise<RecRow[]> {
  const now = Date.now();
  
  // キャッシュが有効な場合は再利用
  if (recDataCache && (now - recDataCacheTimestamp) < REC_CACHE_TTL) {
    return recDataCache;
  }
  
  try {
    // rec取得専用URLを使用（問題データ用APIとは完全に分離）
    // GAS_REC_URL = BASE_URL?action=rec（typeパラメータは一切含めない）
    console.log('[recLoader] Fetching rec data from:', GAS_REC_URL);
    
    const response = await fetch(GAS_REC_URL, {
      method: 'GET',
      mode: 'cors',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch all rec data: ${response.status} ${response.statusText}`);
    }
    
    const rawText = await response.text();
    console.log('[recLoader] Raw response text:', rawText.substring(0, 500)); // 最初の500文字をログ
    
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      console.error('[recLoader] Failed to parse JSON:', parseError, 'Raw text:', rawText);
      throw new Error('Invalid JSON response');
    }
    
    console.log('[recLoader] Parsed response:', data);
    
    // csvが含まれている場合は問題データ用APIが呼ばれている（エラー）
    // 開発中のみエラーを出力（本番環境では警告のみ）
    if (data.csv) {
      const errorMsg = '[recLoader] ERROR: Received CSV data instead of rec data. This means problem data API was called instead of rec API.';
      console.error(errorMsg);
      console.error('[recLoader] Response contains csv field:', data.csv.substring(0, 100));
      console.error('[recLoader] Used URL:', GAS_REC_URL);
      if (import.meta.env.DEV) {
        throw new Error('Received CSV data instead of rec data. Check that rec URL is correctly configured and action=rec parameter is used.');
      }
      // 本番環境では警告のみで空配列を返す
      return [];
    }
    
    if (data.error) {
      console.error('[recLoader] GAS error:', data.error);
      throw new Error(data.error);
    }
    
    // レスポンス形式の柔軟な解釈
    let recRows: any[] = [];
    
    // パターン1: { data: [...] } 形式（GAS側の想定形式）
    if (data.data && Array.isArray(data.data)) {
      recRows = data.data;
    }
    // パターン2: { rows: [...] } 形式
    else if (data.rows && Array.isArray(data.rows)) {
      recRows = data.rows;
    }
    // パターン3: 配列が直接返されている
    else if (Array.isArray(data)) {
      recRows = data;
    }
    // パターン4: その他の形式を試す
    else {
      // dataオブジェクトの値の中に配列があるか探す
      for (const key in data) {
        if (Array.isArray(data[key])) {
          console.log(`[recLoader] Found array in key "${key}"`);
          recRows = data[key];
          break;
        }
      }
    }
    
    if (recRows.length === 0) {
      console.warn('[recLoader] No rec rows found in response. Response structure:', Object.keys(data));
      return [];
    }
    
    console.log(`[recLoader] Loaded rec rows: ${recRows.length}`);
    
    // 全行を正規化
    const normalized: RecRow[] = recRows
      .map((row: Record<string, any>) => normalizeRecRow(row))
      .filter((row: RecRow | null): row is RecRow => row !== null);
    
    // ① 説明行・不正行を除外（nameが説明文やヘッダっぽいもの、userKey欠損、recordedAt無効など）
    const filtered: RecRow[] = normalized.filter((row: RecRow) => {
      // userKeyは必須（空文字やnullは除外）
      const userKey = (row.userKey || '').trim();
      if (!userKey) {
        return false;
      }
      
      // recordedAtが0または無効値の行はlatest判定を壊すので除外
      if (!row.recordedAt || row.recordedAt <= 0) {
        return false;
      }
      
      // name/displayNameが明らかに説明行・ヘッダっぽい場合は除外
      const name = (row.name || row.displayName || '').trim();
      if (!name) {
        return false;
      }
      const lower = name.toLowerCase();
      if (
        lower.includes('displayname') ||
        lower.includes('表示名') ||
        lower.includes('ユーザー名') ||
        lower.includes('userkey') ||
        lower.includes('説明') ||
        lower.startsWith('name(') ||
        lower.startsWith('name（')
      ) {
        return false;
      }
      
      return true;
    });
    
    // 統計ログ（開発用）
    const totalRows = normalized.length;
    const filteredRows = filtered.length;
    const uniqueUserKeys = new Set(filtered.map(row => String(row.userKey))).size;
    console.log('[recLoader] Stats after normalization/filtering:', {
      totalRows,
      filteredRows,
      uniqueUserKeys
    });
    
    console.log(`[recLoader] Normalized ${normalized.length} rec rows (after filtering: ${filtered.length})`);
    
    // キャッシュに保存（正規化＋フィルタ済みデータのみ）
    recDataCache = filtered;
    recDataCacheTimestamp = now;
    
    console.log(`[recLoader] Fetched ${filtered.length} rec rows (cached)`);
    
    return filtered;
  } catch (error) {
    console.warn('[recLoader] Failed to fetch all rec data:', error);
    // キャッシュがあればそれを返す
    if (recDataCache) {
      console.log('[recLoader] Using cached data due to fetch error');
      return recDataCache;
    }
    return [];
  }
}

/**
 * キャッシュをクリア（ユーザー切替時など）
 */
export const clearRecDataCache = (): void => {
  recDataCache = null;
  recDataCacheTimestamp = 0;
};

// Storage keys
const STORAGE_KEY_ACTIVE_USER = 'chem.activeUser'; // userKey | null
const STORAGE_KEY_USERS = 'chem.users'; // User[]
const STORAGE_KEY_QUESTION_LOGS = 'chem.questionLogs';
const STORAGE_KEY_SESSION_LOGS = 'chem.sessionLogs';

/**
 * ユーザー
 */
export interface User {
  userKey: string; // 一意キー（出席番号/PIN等、ユーザー入力）
  displayName: string; // 表示名
  isPublic: boolean; // PUBLIC/PRIVATE
  createdAt: number; // 作成日時（Date.now()）
}

/**
 * アクティブユーザー（後方互換性のため残す）
 * @deprecated getActiveUser()はUser | nullを返すようになりました
 */
export interface ActiveUser {
  userKey: string;
  displayName: string;
  public: boolean; // isPublicの旧名
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
  displayName?: string; // クライアント側から送信時
  name?: string; // GAS側から返される時
  mode: string;
  category?: string; // クライアント側から送信時のみ
  rangeKey?: string; // クライアント側から送信時のみ
  correctCount?: number; // クライアント側から送信時のみ
  totalCount?: number; // クライアント側から送信時のみ
  pointScore?: number; // クライアント側から送信時のみ
  accuracy?: number; // correctCount / totalCount（クライアント側から送信時のみ）
  date?: string; // ISO date string（クライアント側から送信時のみ）
  timestamp?: number; // Date.now()（クライアント側から送信時のみ）
  isPublic: boolean; // PUBLIC/PRIVATE
  // GAS側から返される集計済みデータ
  EXP?: number;
  LV?: number;
  tenAve?: number;
  allAve?: number;
  sess?: number;
  cst?: number;
  mst?: number;
  last?: string;
  recordedAt?: number; // GAS側から返される時
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
 * 全ユーザーを取得
 */
export const getUsers = (): User[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_USERS);
    if (!stored) return [];
    return JSON.parse(stored) as User[];
  } catch (error) {
    console.warn('Failed to get users:', error);
    return [];
  }
};

/**
 * 全ユーザーを保存
 */
export const setUsers = (users: User[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  } catch (error) {
    console.warn('Failed to set users:', error);
  }
};

/**
 * ユーザーを追加
 */
export const addUser = (user: User): boolean => {
  try {
    const users = getUsers();
    // userKeyの重複チェック
    if (users.some(u => u.userKey === user.userKey)) {
      return false; // 重複
    }
    users.push(user);
    setUsers(users);
    return true;
  } catch (error) {
    console.warn('Failed to add user:', error);
    return false;
  }
};

/**
 * userKeyからユーザーを取得
 */
export const getUserByKey = (userKey: string): User | null => {
  try {
    const users = getUsers();
    return users.find(u => u.userKey === userKey) || null;
  } catch (error) {
    console.warn('Failed to get user by key:', error);
    return null;
  }
};

/**
 * アクティブユーザーのuserKeyを取得
 */
export const getActiveUserKey = (): string | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_ACTIVE_USER);
    if (!stored) return null;
    return stored; // userKey文字列として保存
  } catch (error) {
    console.warn('Failed to get active user key:', error);
    return null;
  }
};

/**
 * アクティブユーザーのuserKeyを設定
 */
export const setActiveUserKey = (userKey: string | null): void => {
  try {
    if (userKey === null) {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
    } else {
      localStorage.setItem(STORAGE_KEY_ACTIVE_USER, userKey);
    }
  } catch (error) {
    console.warn('Failed to set active user key:', error);
  }
};

/**
 * アクティブユーザーを取得（Userオブジェクトを返す）
 */
export const getActiveUser = (): User | null => {
  try {
    const userKey = getActiveUserKey();
    console.log('[sessionLogger] getActiveUser - userKey:', userKey);
    if (!userKey) {
      console.log('[sessionLogger] getActiveUser - no userKey, returning null');
      return null;
    }
    const user = getUserByKey(userKey);
    console.log('[sessionLogger] getActiveUser - found user:', user);
    if (!user) {
      console.warn('[sessionLogger] getActiveUser - userKey exists but user not found, clearing activeUserKey');
      clearActiveUser();
      return null;
    }
    return user;
  } catch (error) {
    console.warn('Failed to get active user:', error);
    return null;
  }
};

/**
 * アクティブユーザーを保存（UserオブジェクトからuserKeyを取得して保存）
 */
export const setActiveUser = (user: User): void => {
  try {
    setActiveUserKey(user.userKey);
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
export const fetchLatestRecRow = async (userKey: string, _category: 'organic' | 'inorganic'): Promise<RecRow | null> => {
  // 新しい実装ではfetchAllRecDataを使用するため、この関数は非推奨
  // 互換性のため、fetchAllRecData経由で取得
  // categoryパラメータは互換性のため残していますが使用しません
  try {
    const allRecData = await fetchAllRecData();
    const filtered = allRecData.filter(row => row.userKey === userKey);
    if (filtered.length === 0) {
      return null;
    }
    filtered.sort((a, b) => {
      const timestampA = Number(a.recordedAt || a.timestamp || 0);
      const timestampB = Number(b.recordedAt || b.timestamp || 0);
      return timestampB - timestampA;
    });
    return filtered[0] || null;
  } catch (error) {
    console.warn('Failed to fetch latest rec row:', error);
    return null;
  }
};

/**
 * recシートから最新行を取得（userKey + mode でフィルタ）
 * @param userKey - ユーザーキー
 * @param mode - オプション: 'organic' または 'inorganic' でフィルタ
 * @returns RecRow | null
 */
export const getLatestRecByUser = async (userKey: string, mode?: 'organic' | 'inorganic'): Promise<RecRow | null> => {
  try {
    // 全recデータを取得（キャッシュから）
    const allRecData = await fetchAllRecData();
    
    // userKeyでフィルタ
    let filtered = allRecData.filter(row => row.userKey === userKey);
    
    if (filtered.length === 0) {
      return null;
    }
    
    // modeでフィルタ（指定されている場合）
    if (mode) {
      filtered = filtered.filter(row => {
        const rowMode = row.mode || '';
        return rowMode.indexOf(mode) === 0;
      });
    }
    
    if (filtered.length === 0) {
      return null;
    }
    
    // recordedAtでソート（新しい順）して最新を取得
    filtered.sort((a, b) => {
      const timestampA = Number(a.recordedAt || a.timestamp || 0);
      const timestampB = Number(b.recordedAt || b.timestamp || 0);
      return timestampB - timestampA; // 降順
    });
    
    return filtered[0] || null;
  } catch (error) {
    console.warn('Failed to get latest rec by user:', error);
    return null;
  }
};

/**
 * 公開ランキングを取得（isPublic=trueのユーザーの最新行のみ、allAve降順）
 * @param mode - オプション: 'organic' または 'inorganic' でフィルタ
 * @returns RecRow[]
 */
export const getPublicRankingLatest = async (mode?: 'organic' | 'inorganic'): Promise<RecRow[]> => {
  try {
    // 全recデータを取得（キャッシュから）
    const allRecData = await fetchAllRecData();
    
    // isPublic=trueでフィルタ
    let publicRows = allRecData.filter(row => row.isPublic === true);
    
    if (publicRows.length === 0) {
      return [];
    }
    
    // modeでフィルタ（指定されている場合）
    if (mode) {
      publicRows = publicRows.filter(row => {
        const rowMode = row.mode || '';
        return rowMode.indexOf(mode) === 0;
      });
    }
    
    if (publicRows.length === 0) {
      return [];
    }
    
    // userKeyごとに最新行のみを残す（recordedAtが最新のもの）
    const userLatestMap = new Map<string, RecRow>();
    for (const row of publicRows) {
      const userKey = row.userKey;
      const existing = userLatestMap.get(userKey);
      if (!existing) {
        userLatestMap.set(userKey, row);
      } else {
        const existingTimestamp = Number(existing.recordedAt || existing.timestamp || 0);
        const currentTimestamp = Number(row.recordedAt || row.timestamp || 0);
        if (!isNaN(currentTimestamp) && !isNaN(existingTimestamp) && currentTimestamp > existingTimestamp) {
          userLatestMap.set(userKey, row);
        }
      }
    }
    
    // allAve降順でソート（同率の場合はsess → lastで安定ソート）
    const ranking = Array.from(userLatestMap.values());
    ranking.sort((a, b) => {
      const allAveA = Number(a.allAve || 0);
      const allAveB = Number(b.allAve || 0);
      if (!isNaN(allAveA) && !isNaN(allAveB) && allAveB !== allAveA) {
        return allAveB - allAveA;
      }
      const sessA = Number(a.sess || 0);
      const sessB = Number(b.sess || 0);
      if (!isNaN(sessA) && !isNaN(sessB) && sessB !== sessA) {
        return sessB - sessA;
      }
      const lastA = String(a.last || '');
      const lastB = String(b.last || '');
      return lastB.localeCompare(lastA);
    });
    
    return ranking;
  } catch (error) {
    console.warn('Failed to get public ranking:', error);
    return [];
  }
};
