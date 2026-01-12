/**
 * セッション記録ユーティリティ
 * ローカルに1問ごとの正誤ログを保存し、セッション完了時にスプレッドシートに記録する
 */

import { REC_BASE_URL, STATS_BASE_URL } from '../config/gasUrls';

// rec取得専用URL（action=recのみ、typeパラメータは一切含めない）
const GAS_REC_URL = `${REC_BASE_URL}?action=rec`;

// userStats取得専用URL（action=userStatsのみ）
const GAS_USERSTATS_URL = `${STATS_BASE_URL}?action=userStats`;

// recデータのキャッシュ（全データを1回取得して再利用）
let recDataCache: RecRow[] | null = null;
let recDataCacheTimestamp: number = 0;
const REC_CACHE_TTL = 30 * 1000; // 30秒キャッシュ

// userStatsデータのキャッシュ（全データを1回取得して再利用）
let userStatsCache: UserStatsRow[] | null = null;
let userStatsCacheTimestamp: number = 0;
const USERSTATS_CACHE_TTL = 30 * 1000; // 30秒キャッシュ

/**
 * RecRowを正規化（recordedAtを数値に変換、その他の型を保証）
 * recordedAtがnullの場合は救済処理を行う（除外しない）
 */
function normalizeRecRow(row: Record<string, any>): RecRow | null {
  try {
    // userKeyを必ずstringに正規化（numberでも許容）
    const userKey = String(row.userKey || '');
    
    // recordedAtを数値に変換（救済処理付き）
    let recordedAt: number;
    if (typeof row.recordedAt === 'string') {
      recordedAt = Number(row.recordedAt);
      if (isNaN(recordedAt)) {
        recordedAt = 0;
      }
    } else if (typeof row.recordedAt === 'number' && !isNaN(row.recordedAt)) {
      recordedAt = row.recordedAt;
    } else {
      // recordedAtがnull/undefinedの場合、救済処理を試みる
      // 優先順位1: recordedAtReadableから取得
      if (row.recordedAtReadable) {
        const parsed = Date.parse(row.recordedAtReadable);
        if (!isNaN(parsed)) {
          recordedAt = parsed;
        } else {
          recordedAt = 0;
        }
      }
      // 優先順位2: last（ISO文字列）から取得
      else if (row.last) {
        const parsed = Date.parse(row.last);
        if (!isNaN(parsed)) {
          recordedAt = parsed;
        } else {
          recordedAt = 0;
        }
      }
      // 優先順位3: timestampから取得
      else if (typeof row.timestamp === 'number' && !isNaN(row.timestamp)) {
        recordedAt = row.timestamp;
      }
      // それも無い場合は0を入れて残す（表示は可能にする）
      else {
        recordedAt = 0;
      }
    }
    
    return {
      userKey: userKey,
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
  
  // REC_BASE_URLが設定されていない場合のエラー
  if (!REC_BASE_URL || REC_BASE_URL.trim() === '') {
    const errorMsg = 'REC_BASE_URL is not configured. Please set the rec-only GAS URL in src/config/gasUrls.ts or set the VITE_GAS_URL_REC environment variable.';
    console.error('[recLoader]', errorMsg);
    throw new Error(errorMsg);
  }
  
  try {
    // rec取得専用URLを使用（問題データ用APIとは完全に分離）
    // GAS_REC_URL = REC_BASE_URL?action=rec（typeパラメータは一切含めない）
    const requestId = `recLoader#${Date.now()}`;
    console.log(`[${requestId}] Fetching rec data from:`, GAS_REC_URL);
    
    const response = await fetch(GAS_REC_URL, {
      method: 'GET',
      mode: 'cors',
    });
    
    // 形式チェック: レスポンス情報をログ出力
    const contentType = response.headers.get('content-type') || 'unknown';
    console.log(`[${requestId}] Response status: ${response.status} ${response.statusText}`);
    console.log(`[${requestId}] Content-Type: ${contentType}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch all rec data: ${response.status} ${response.statusText}`);
    }
    
    const rawText = await response.text();
    const rawPreview = rawText.substring(0, 200);
    console.log(`[${requestId}] Raw response preview (first 200 chars):`, rawPreview);
    
    // HTMLが返ってきた場合（ログイン画面など）を検知
    if (rawText.trim().startsWith('<!DOCTYPE') || rawText.trim().startsWith('<html')) {
      const errorMsg = `[${requestId}] ERROR: Received HTML instead of JSON. This may be a login page or error page.`;
      console.error(errorMsg);
      console.error(`[${requestId}] Used URL:`, GAS_REC_URL);
      throw new Error('Received HTML instead of JSON. Check GAS deployment and access permissions.');
    }
    
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse JSON:`, parseError);
      console.error(`[${requestId}] Raw text (first 500 chars):`, rawText.substring(0, 500));
      throw new Error('Invalid JSON response for rec data');
    }
    
    console.log(`[${requestId}] Parsed response structure:`, Object.keys(data));
    
    // csvが含まれている場合は問題データ用APIが呼ばれている（エラー）
    if (data.csv) {
      const errorMsg = `[${requestId}] ERROR: Received CSV data instead of rec data. This means problem data API was called instead of rec API.`;
      console.error(errorMsg);
      console.error(`[${requestId}] Response contains csv field (first 100 chars):`, String(data.csv).substring(0, 100));
      console.error(`[${requestId}] Used URL:`, GAS_REC_URL);
      throw new Error('Received CSV data instead of rec data. Check that rec URL (REC_BASE_URL) is correctly configured and action=rec parameter is used.');
    }
    
    // JSON配列が直接返されている場合を検知（問題データAPIの可能性）
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0];
      // recデータには name, userKey, mode などのフィールドがあるはず
      // 問題データ（compounds）には structure, atoms などのフィールドがある
      if (firstItem.structure || firstItem.atoms) {
        const errorMsg = `[${requestId}] ERROR: Received problem data (compounds) instead of rec data.`;
        console.error(errorMsg);
        console.error(`[${requestId}] First item keys:`, Object.keys(firstItem));
        console.error(`[${requestId}] Used URL:`, GAS_REC_URL);
        throw new Error('Received problem data instead of rec data. Check that rec URL (REC_BASE_URL) is correctly configured.');
      }
    }
    
    // userStats専用GASが設定されている場合のエラー検知
    if (data.error) {
      const errorStr = String(data.error);
      if (errorStr.includes('userStats') || errorStr.includes('Use action=userStats')) {
        const errorMsg = `[${requestId}] ERROR: REC_BASE_URL is pointing to a userStats-only GAS. This URL should be a rec-only GAS.`;
        console.error(errorMsg);
        console.error(`[${requestId}] Current REC_BASE_URL:`, REC_BASE_URL);
        console.error(`[${requestId}] GAS error:`, data.error);
        throw new Error('REC_BASE_URL is incorrectly configured. It points to a userStats-only GAS, but it should point to a rec-only GAS. Please check your GAS deployment and update REC_BASE_URL in src/config/gasUrls.ts');
      }
      console.error(`[${requestId}] GAS error:`, data.error);
      throw new Error(String(data.error));
    }
    
    // JSON配列以外が返された場合のエラー検知
    if (!Array.isArray(data) && !(data.data && Array.isArray(data.data)) && !(data.rows && Array.isArray(data.rows))) {
      const errorMsg = `[${requestId}] ERROR: Expected JSON array for rec data, but received: ${typeof data}`;
      console.error(errorMsg);
      console.error(`[${requestId}] Response structure:`, Object.keys(data));
      console.error(`[${requestId}] Response preview:`, JSON.stringify(data).substring(0, 200));
      throw new Error('Invalid response format for rec data. Expected JSON array, but received a different format. Check that REC_BASE_URL points to a rec-only GAS.');
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
    
    // ① 説明行のみを除外（最低限のフィルタ、全捨てを絶対にしない）
    const filtered: RecRow[] = normalized.filter((row: RecRow) => {
      // userKeyをstringに正規化（numberでも許容）
      const userKey = String(row.userKey || '').trim();
      
      // userKeyが空の場合は除外
      if (!userKey) {
        return false;
      }
      
      // 説明行の判定（厳密に）
      // name が "表示名（displayName）" の行、または userKey が "ユーザーキー（一意ID）" の行は除外
      const name = (row.name || row.displayName || '').trim();
      const userKeyLower = userKey.toLowerCase();
      const nameLower = name.toLowerCase();
      
      // 説明行の典型的なパターンをチェック
      if (
        nameLower === '表示名（displayname）' ||
        nameLower === '表示名(displayname)' ||
        nameLower === 'displayname' ||
        userKeyLower === 'ユーザーキー（一意id）' ||
        userKeyLower === 'ユーザーキー(一意id)' ||
        userKeyLower === 'userkey' ||
        (nameLower.includes('表示名') && nameLower.includes('displayname')) ||
        (userKeyLower.includes('ユーザーキー') && userKeyLower.includes('一意'))
      ) {
        return false; // 説明行として除外
      }
      
      // recordedAtが0でも残す（latest抽出時に「古い」として扱われるだけ）
      // nameが空でも残す（displayNameがあればOK、両方空でもuserKeyがあれば残す）
      
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

/**
 * userStatsシートの全データを取得（キャッシュ付き）
 */
async function fetchAllUserStats(): Promise<UserStatsRow[]> {
  const now = Date.now();
  
  // キャッシュが有効な場合は再利用
  if (userStatsCache && (now - userStatsCacheTimestamp) < USERSTATS_CACHE_TTL) {
    return userStatsCache;
  }
  
  // STATS_BASE_URLが設定されていない場合のエラー
  if (!STATS_BASE_URL || STATS_BASE_URL.trim() === '') {
    const errorMsg = 'STATS_BASE_URL is not configured. Please set the userStats-only GAS URL in src/config/gasUrls.ts or set the VITE_GAS_URL_USERSTATS environment variable.';
    console.error('[userStatsLoader]', errorMsg);
    throw new Error(errorMsg);
  }
  
  try {
    const requestId = `userStatsLoader#${Date.now()}`;
    console.log(`[${requestId}] Fetching userStats data from:`, GAS_USERSTATS_URL);
    
    const response = await fetch(GAS_USERSTATS_URL, {
      method: 'GET',
      mode: 'cors',
    });
    
    // 形式チェック: レスポンス情報をログ出力
    const contentType = response.headers.get('content-type') || 'unknown';
    console.log(`[${requestId}] Response status: ${response.status} ${response.statusText}`);
    console.log(`[${requestId}] Content-Type: ${contentType}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch all userStats: ${response.status} ${response.statusText}`);
    }
    
    const rawText = await response.text();
    const rawPreview = rawText.substring(0, 200);
    console.log(`[${requestId}] Raw response preview (first 200 chars):`, rawPreview);
    
    // HTMLが返ってきた場合（ログイン画面など）を検知
    if (rawText.trim().startsWith('<!DOCTYPE') || rawText.trim().startsWith('<html')) {
      const errorMsg = `[${requestId}] ERROR: Received HTML instead of JSON. This may be a login page or error page.`;
      console.error(errorMsg);
      console.error(`[${requestId}] Used URL:`, GAS_USERSTATS_URL);
      throw new Error('Received HTML instead of JSON. Check GAS deployment and access permissions.');
    }
    
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse JSON:`, parseError);
      console.error(`[${requestId}] Raw text (first 500 chars):`, rawText.substring(0, 500));
      throw new Error('Invalid JSON response for userStats data');
    }
    
    console.log(`[${requestId}] Parsed response structure:`, Object.keys(data));
    
    // csvが含まれている場合は問題データ用APIが呼ばれている（エラー）
    if (data.csv) {
      const errorMsg = `[${requestId}] ERROR: Received CSV data instead of userStats data. This means problem data API was called instead of userStats API.`;
      console.error(errorMsg);
      console.error(`[${requestId}] Response contains csv field (first 100 chars):`, String(data.csv).substring(0, 100));
      console.error(`[${requestId}] Used URL:`, GAS_USERSTATS_URL);
      throw new Error('Received CSV data instead of userStats data. Check that userStats URL (STATS_BASE_URL) is correctly configured and action=userStats parameter is used.');
    }
    
    // userStats専用GAS以外が設定されている場合のエラー検知
    if (data.error) {
      const errorStr = String(data.error);
      if (errorStr.includes('rec') || errorStr.includes('Use action=rec')) {
        const errorMsg = `[${requestId}] ERROR: STATS_BASE_URL is pointing to a rec-only GAS. This URL should be a userStats-only GAS.`;
        console.error(errorMsg);
        console.error(`[${requestId}] Current STATS_BASE_URL:`, STATS_BASE_URL);
        console.error(`[${requestId}] GAS error:`, data.error);
        throw new Error('STATS_BASE_URL is incorrectly configured. It points to a rec-only GAS, but it should point to a userStats-only GAS. Please check your GAS deployment and update STATS_BASE_URL in src/config/gasUrls.ts');
      }
      console.error(`[${requestId}] GAS error:`, data.error);
      throw new Error(String(data.error));
    }
    
    // JSON配列以外が返された場合のエラー検知
    let userStatsRows: any[] = [];
    if (Array.isArray(data)) {
      userStatsRows = data;
    } else if (data.data && Array.isArray(data.data)) {
      userStatsRows = data.data;
    } else if (data.rows && Array.isArray(data.rows)) {
      userStatsRows = data.rows;
    } else {
      const errorMsg = `[${requestId}] ERROR: Expected JSON array for userStats data, but received: ${typeof data}`;
      console.error(errorMsg);
      console.error(`[${requestId}] Response structure:`, Object.keys(data));
      console.error(`[${requestId}] Response preview:`, JSON.stringify(data).substring(0, 200));
      throw new Error('Invalid response format for userStats data. Expected JSON array, but received a different format. Check that STATS_BASE_URL points to a userStats-only GAS.');
    }
    
    if (userStatsRows.length === 0) {
      console.warn('[userStatsLoader] No userStats rows found in response.');
      return [];
    }
    
    console.log(`[userStatsLoader] Loaded userStats rows: ${userStatsRows.length}`);
    
    // 正規化（userKeyを必ず文字列に）
    const normalized: UserStatsRow[] = userStatsRows.map((row: Record<string, any>) => ({
      userKey: String(row.userKey || ''),
      name: String(row.name || ''),
      isPublic: Boolean(row.isPublic),
      exp: Number(row.exp || 0),
      totalCorrect: Number(row.totalCorrect || 0),
      totalQuestions: Number(row.totalQuestions || 0),
      sess: Number(row.sess || 0),
      lastAt: Number(row.lastAt || 0),
      updatedAt: Number(row.updatedAt || 0)
    })).filter((row: UserStatsRow) => row.userKey !== ''); // userKeyが空の行を除外
    
    userStatsCache = normalized;
    userStatsCacheTimestamp = now;
    
    console.log(`[userStatsLoader] Fetched ${normalized.length} userStats rows (cached)`);
    
    return normalized;
  } catch (error) {
    console.warn('[userStatsLoader] Failed to fetch all userStats:', error);
    if (userStatsCache) {
      console.log('[userStatsLoader] Using cached data due to fetch error');
      return userStatsCache;
    }
    return [];
  }
}

/**
 * userStatsキャッシュをクリア（ユーザー切替時など）
 */
export const clearUserStatsCache = (): void => {
  userStatsCache = null;
  userStatsCacheTimestamp = 0;
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
 * userStatsシートの行データ（通算集計）
 */
export interface UserStatsRow {
  userKey: string; // 必ず文字列
  name: string;
  isPublic: boolean;
  exp: number; // 累計正解数（EXP）
  totalCorrect: number; // 累計正解数（expと同じ）
  totalQuestions: number; // 累計問題数
  sess: number; // セッション数
  lastAt: number; // 最終取り組み日時（ms）
  updatedAt: number; // 更新日時（ms）
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
 * 注意: QuestionLogにはuserKeyが含まれていないため、セッションログから逆引きする
 * 簡易実装: セッションログのuserKeyとタイムスタンプ範囲で紐付ける
 */
export const getQuestionLogs = (userKey: string): QuestionLog[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_QUESTION_LOGS);
    if (!stored) return [];
    const allLogs: QuestionLog[] = JSON.parse(stored);
    
    // セッションログを取得して、タイムスタンプ範囲で紐付ける
    const sessionLogs = getSessionLogs(userKey);
    if (sessionLogs.length === 0) {
      return [];
    }
    
    // セッションログのタイムスタンプ範囲を取得
    const sessionTimestamps = new Set<number>();
    sessionLogs.forEach(session => {
      // タイムスタンプ範囲を記録（簡易実装: セッションタイムスタンプをキーとして使用）
      sessionTimestamps.add(session.timestamp);
    });
    
    // セッションログのタイムスタンプ範囲内のQuestionLogをフィルタ
    // 簡易実装: セッションログのタイムスタンプに最も近いQuestionLogを紐付ける
    const filteredLogs: QuestionLog[] = [];
    allLogs.forEach(log => {
      // セッションログのタイムスタンプ範囲内かチェック
      for (const sessionTimestamp of sessionTimestamps) {
        const timeDiff = Math.abs(log.timestamp - sessionTimestamp);
        if (timeDiff < 30 * 60 * 1000) { // 30分以内
          filteredLogs.push(log);
          break;
        }
      }
    });
    
    // タイムスタンプ順にソート
    return filteredLogs.sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.warn('Failed to get question logs:', error);
    return [];
  }
};

/**
 * 問題単位の連続正解数と最大連続正解数を計算
 * @param userKey ユーザーキー
 * @param mode オプション: 'organic' または 'inorganic' でフィルタ
 * @returns { cst: number, mst: number } 現在の連続正解数と最大連続正解数
 */
export const calculateQuestionConsecutiveStreak = (userKey: string, mode?: 'organic' | 'inorganic'): { cst: number; mst: number } => {
  try {
    const questionLogs = getQuestionLogs(userKey);
    
    // modeでフィルタ（指定されている場合）
    let filteredLogs = questionLogs;
    if (mode) {
      filteredLogs = questionLogs.filter(log => {
        return log.category === mode;
      });
    }
    
    if (filteredLogs.length === 0) {
      return { cst: 0, mst: 0 };
    }
    
    // タイムスタンプ順にソート（既にソート済みだが念のため）
    const sortedLogs = [...filteredLogs].sort((a, b) => a.timestamp - b.timestamp);
    
    let cst = 0; // 現在の連続正解数
    let mst = 0; // 最大連続正解数
    let currentStreak = 0;
    
    // 最新から遡って連続正解数を計算
    for (let i = sortedLogs.length - 1; i >= 0; i--) {
      const log = sortedLogs[i];
      if (log.isCorrect) {
        currentStreak++;
        mst = Math.max(mst, currentStreak);
        // 最新の連続正解数がcst
        if (i === sortedLogs.length - 1 || (i < sortedLogs.length - 1 && sortedLogs[i + 1].isCorrect)) {
          cst = currentStreak;
        }
      } else {
        // 間違えたら連続が途切れる
        if (i === sortedLogs.length - 1) {
          cst = 0; // 最新が間違いなら連続正解数は0
        }
        currentStreak = 0;
      }
    }
    
    // 最新から遡って連続正解数を再計算（より正確に）
    cst = 0;
    for (let i = sortedLogs.length - 1; i >= 0; i--) {
      if (sortedLogs[i].isCorrect) {
        cst++;
      } else {
        break; // 間違えたら終了
      }
    }
    
    return { cst, mst };
  } catch (error) {
    console.warn('Failed to calculate question consecutive streak:', error);
    return { cst: 0, mst: 0 };
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
export const pushRecRowToSheetRec = async (row: RecRow, _category: 'organic' | 'inorganic'): Promise<boolean> => {
  try {
    // 問題データ保存時はPROBLEM_BASE_URLを使用（rec保存とは別のGAS）
    const { PROBLEM_BASE_URL } = await import('../config/gasUrls');
    const requestId = `recSaver#${Date.now()}`;
    
    console.log(`[${requestId}] Pushing rec row to:`, PROBLEM_BASE_URL);
    console.log(`[${requestId}] Rec row data:`, { userKey: row.userKey, name: row.name, mode: row.mode });
    
    await fetch(PROBLEM_BASE_URL, {
      method: 'POST',
      mode: 'no-cors', // CORS問題を回避（レスポンスは取得できない）
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(row),
    });
    
    console.log(`[${requestId}] Rec row pushed successfully`);
    
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
 * 複合ユーザーIDを生成（userKey + name）
 */
const getUserId = (row: RecRow | UserStatsRow): string => {
  const userKey = String(row.userKey || '');
  const name = String((row as RecRow).name || (row as RecRow).displayName || (row as UserStatsRow).name || '');
  return `${userKey}|${name}`;
};

/**
 * recシートから最新行を取得（userId + mode でフィルタ）
 * userId = userKey + name の複合キー
 * @param userKey - ユーザーキー
 * @param userName - ユーザー名（displayName/name）
 * @param mode - オプション: 'organic' または 'inorganic' でフィルタ
 * @returns RecRow | null
 */
export const getLatestRecByUser = async (userKey: string, mode?: 'organic' | 'inorganic', userName?: string): Promise<RecRow | null> => {
  try {
    // 全recデータを取得（キャッシュから）
    const allRecData = await fetchAllRecData();
    
    // userId（userKey + name）でフィルタ
    const targetUserId = userName ? `${String(userKey)}|${String(userName)}` : null;
    let filtered = allRecData.filter(row => {
      if (targetUserId) {
        return getUserId(row) === targetUserId;
      }
      // userNameが指定されていない場合は、userKeyのみでフィルタ（後方互換性）
      return String(row.userKey) === String(userKey);
    });
    
    if (filtered.length === 0) {
      return null;
    }
    
    // modeでフィルタ（指定されている場合）
    // mode フィルタは 'organic'/'inorganic' を「含むか」で判定する
    if (mode) {
      filtered = filtered.filter(row => {
        const rowMode = (row.mode || '').toLowerCase();
        const rowCategory = (row.category || '').toLowerCase();
        const modeLower = mode.toLowerCase();
        // mode文字列に含まれるか、またはcategoryが一致するか
        return rowMode.includes(modeLower) || rowCategory === modeLower;
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
    // mode フィルタは 'organic'/'inorganic' を「含むか」で判定する
    if (mode) {
      publicRows = publicRows.filter(row => {
        const rowMode = (row.mode || '').toLowerCase();
        const rowCategory = (row.category || '').toLowerCase();
        const modeLower = mode.toLowerCase();
        // mode文字列に含まれるか、またはcategoryが一致するか
        return rowMode.includes(modeLower) || rowCategory === modeLower;
      });
    }
    
    if (publicRows.length === 0) {
      return [];
    }
    
    // ユーザー統合ルール: userKey + name の複合キーでグループ化
    // 同一ユーザー判定キーを「userKey + name」の組み合わせにする
    const userLatestMap = new Map<string, RecRow>();
    for (const row of publicRows) {
      const userKey = String(row.userKey || ''); // 必ずstringに正規化
      const name = String(row.name || row.displayName || ''); // nameを取得
      const compositeKey = `${userKey}|${name}`; // 複合キー
      
      const existing = userLatestMap.get(compositeKey);
      if (!existing) {
        userLatestMap.set(compositeKey, row);
      } else {
        // recordedAtで比較（補完後の値を使用）
        const existingTimestamp = Number(existing.recordedAt || existing.timestamp || 0);
        const currentTimestamp = Number(row.recordedAt || row.timestamp || 0);
        // recordedAt=0の行は「古い」として扱われる（除外はしない）
        if (currentTimestamp > existingTimestamp) {
          userLatestMap.set(compositeKey, row);
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

/**
 * userStatsからユーザーの通算データを取得（userId = userKey + name の複合キー）
 * @param userKey - ユーザーキー
 * @param userName - ユーザー名（displayName/name）
 * @returns UserStatsRow | null
 */
export const getUserStatsByUserKey = async (userKey: string, userName?: string): Promise<UserStatsRow | null> => {
  try {
    const allUserStats = await fetchAllUserStats();
    const targetUserId = userName ? `${String(userKey)}|${String(userName)}` : null;
    
    if (targetUserId) {
      // userId（複合キー）で検索
      const stats = allUserStats.find(row => getUserId(row) === targetUserId);
      return stats || null;
    } else {
      // userNameが指定されていない場合は、userKeyのみで検索（後方互換性）
      const normalizedUserKey = String(userKey);
      const stats = allUserStats.find(row => String(row.userKey) === normalizedUserKey);
      return stats || null;
    }
  } catch (error) {
    console.warn('Failed to get userStats by userKey:', error);
    return null;
  }
};

/**
 * recから最新10セッションのtenAveを計算（userId = userKey + name の複合キー）
 * @param userKey - ユーザーキー
 * @param mode - オプション: 'organic' または 'inorganic' でフィルタ
 * @param userName - ユーザー名（displayName/name）
 * @returns number (0-1)
 */
export const calculateTenAveFromRec = async (userKey: string, mode?: 'organic' | 'inorganic', userName?: string): Promise<number> => {
  try {
    const allRecData = await fetchAllRecData();
    const targetUserId = userName ? `${String(userKey)}|${String(userName)}` : null;
    
    // userId（複合キー）でフィルタ
    let filtered = allRecData.filter(row => {
      if (targetUserId) {
        return getUserId(row) === targetUserId;
      }
      // userNameが指定されていない場合は、userKeyのみでフィルタ（後方互換性）
      return String(row.userKey) === String(userKey);
    });
    
    // modeでフィルタ（指定されている場合）
    if (mode) {
      filtered = filtered.filter(row => {
        const rowMode = (row.mode || '').toLowerCase();
        const rowCategory = (row.category || '').toLowerCase();
        const modeLower = mode.toLowerCase();
        return rowMode.includes(modeLower) || rowCategory === modeLower;
      });
    }
    
    if (filtered.length === 0) {
      return 0;
    }
    
    // recordedAtでソート（新しい順）
    filtered.sort((a, b) => {
      const timestampA = Number(a.recordedAt || a.timestamp || 0);
      const timestampB = Number(b.recordedAt || b.timestamp || 0);
      return timestampB - timestampA; // 降順
    });
    
    // 最新10セッションを取得
    const recent10 = filtered.slice(0, 10);
    
    // 合計を計算
    const totalCorrect = recent10.reduce((sum, row) => sum + (row.correctCount || 0), 0);
    const totalQuestions = recent10.reduce((sum, row) => sum + (row.totalCount || 0), 0);
    
    if (totalQuestions === 0) {
      return 0;
    }
    
    return totalCorrect / totalQuestions;
  } catch (error) {
    console.warn('Failed to calculate tenAve from rec:', error);
    return 0;
  }
};

/**
 * userStatsから公開ランキングを取得（isPublic=trueのユーザーのみ、allAve降順）
 * userId = userKey + name の複合キーでグループ化（既にuserStatsは1ユーザー=1行なので、そのまま使用）
 * @returns UserStatsRow[]
 */
export const getPublicRankingFromUserStats = async (): Promise<UserStatsRow[]> => {
  try {
    const allUserStats = await fetchAllUserStats();
    
    // isPublic=trueでフィルタ
    let publicStats = allUserStats.filter(row => row.isPublic === true);
    
    if (publicStats.length === 0) {
      return [];
    }
    
    // userId（userKey + name）でグループ化（同名でもuserKeyが違えば別ユーザー）
    const userStatsMap = new Map<string, UserStatsRow>();
    for (const row of publicStats) {
      const userId = getUserId(row);
      const existing = userStatsMap.get(userId);
      if (!existing) {
        userStatsMap.set(userId, row);
      } else {
        // 既に存在する場合は、updatedAtが新しい方を採用
        if (row.updatedAt > existing.updatedAt) {
          userStatsMap.set(userId, row);
        }
      }
    }
    
    // allAve降順でソート（同率の場合はsess → lastAtで安定ソート）
    const ranking = Array.from(userStatsMap.values());
    ranking.sort((a, b) => {
      const allAveA = a.totalQuestions > 0 ? a.totalCorrect / a.totalQuestions : 0;
      const allAveB = b.totalQuestions > 0 ? b.totalCorrect / b.totalQuestions : 0;
      if (allAveB !== allAveA) {
        return allAveB - allAveA; // allAve降順
      }
      // 同率の場合
      const sessA = a.sess || 0;
      const sessB = b.sess || 0;
      if (sessB !== sessA) {
        return sessB - sessA; // sess降順
      }
      // さらに同率の場合
      const lastAtA = a.lastAt || 0;
      const lastAtB = b.lastAt || 0;
      return lastAtB - lastAtA; // lastAt降順
    });
    
    return ranking;
  } catch (error) {
    console.warn('Failed to get public ranking from userStats:', error);
    return [];
  }
};

/**
 * 時刻をJST（Asia/Tokyo）でフォーマット
 * @param timestamp - ミリ秒のタイムスタンプ
 * @returns YYYY/MM/DD HH:mm 形式の文字列
 */
export const formatDateJST = (timestamp: number | null | undefined): string => {
  if (!timestamp || timestamp <= 0) {
    return '--';
  }
  
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return '--';
    }
    
    // Intl.DateTimeFormat で JST に変換
    const formatter = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === 'year')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const day = parts.find(p => p.type === 'day')?.value || '';
    const hour = parts.find(p => p.type === 'hour')?.value || '';
    const minute = parts.find(p => p.type === 'minute')?.value || '';
    
    return `${year}/${month}/${day} ${hour}:${minute}`;
  } catch (error) {
    console.warn('Failed to format date JST:', error);
    return '--';
  }
};
