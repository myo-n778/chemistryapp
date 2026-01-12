import React, { useState, useEffect } from 'react';
import { getActiveUser, User, getUserStatsByUserKey, UserStatsRow, calculateTenAveFromRec, calculateQuestionConsecutiveStreak, formatDateJST } from '../utils/sessionLogger';
import './UserStatsPanel.css';

interface UserStatsPanelProps {
  mode?: 'organic' | 'inorganic'; // mode指定時はフィルタ適用
}

export const UserStatsPanel: React.FC<UserStatsPanelProps> = ({ mode }) => {
  // Hookは必ずトップレベルで無条件に宣言（React error #310を防ぐ）
  const [userStats, setUserStats] = useState<UserStatsRow | null>(null);
  const [tenAve, setTenAve] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userKey, setUserKey] = useState<string | null>(null);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [questionStreak, setQuestionStreak] = useState<{ cst: number; mst: number } | null>(null);

  // activeUserの初期化と監視（localStorageの変更を検知）
  useEffect(() => {
    // 初回のみgetActiveUser()を呼ぶ
    const initialUser = getActiveUser();
    const initialUserKey = initialUser?.userKey || null;
    setUserKey(initialUserKey);
    setActiveUser(initialUser);

    // 定期的にチェック（ユーザー切替時に更新されるように）
    // userKeyのみをチェックして、変更があったときのみgetActiveUser()を呼ぶ
    const checkUserKey = () => {
      try {
        const stored = localStorage.getItem('chem.activeUser');
        const currentUserKey = stored || null;
        
        // userKeyが変わったときのみ更新（無限レンダリングを防ぐ）
        if (currentUserKey !== userKey) {
          const currentActiveUser = getActiveUser();
          setUserKey(currentUserKey);
          setActiveUser(currentActiveUser);
        }
      } catch (error) {
        // localStorageアクセスエラーは無視
      }
    };

    const interval = setInterval(checkUserKey, 500);
    return () => clearInterval(interval);
  }, [userKey]); // userKeyを依存配列に含める（変更検知用）

  // userKeyまたはmodeが変更されたときにデータを再取得
  useEffect(() => {
    if (!userKey) {
      setLoading(false);
      setUserStats(null);
      setTenAve(null);
      setQuestionStreak(null);
      return;
    }

    console.log('[UserStatsPanel] Loading userStats for userKey:', userKey, 'mode:', mode);
    
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // userStatsから通算データを取得（userId = userKey + name の複合キー）
        const userName = activeUser?.displayName || '';
        const stats = await getUserStatsByUserKey(userKey, userName);
        console.log('[UserStatsPanel] UserStats loaded:', stats);
        setUserStats(stats);
        
        // tenAveはrecから最新10セッションを計算（userId = userKey + name の複合キー）
        const tenAveValue = await calculateTenAveFromRec(userKey, mode, userName);
        setTenAve(tenAveValue);
        
        // 問題単位の連続正解数を計算
        const streak = calculateQuestionConsecutiveStreak(userKey, mode);
        setQuestionStreak(streak);
      } catch (err) {
        console.error('[UserStatsPanel] Failed to load userStats:', err);
        setError('データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [mode, userKey]); // userKey（文字列）のみを依存配列に含める

  // activeUserが存在しない場合は表示しない（Hookの後に条件分岐）
  if (!activeUser) {
    return null;
  }

  if (loading) {
    return (
      <div className="user-stats-panel">
        <div className="stats-loading">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-stats-panel">
        <div className="stats-error">{error}</div>
      </div>
    );
  }

  // データが存在しない場合は "--" を表示
  const displayValue = (value: string | number | undefined | null, format?: (v: number) => string): string => {
    if (value === undefined || value === null) {
      return '--';
    }
    if (typeof value === 'number' && format) {
      return format(value);
    }
    return String(value);
  };

  const formatPercentage = (value: number | null): string => {
    if (value === null || value === undefined) {
      return '--';
    }
    return `${(value * 100).toFixed(1)}%`;
  };

  // LVを計算（exp / 100 + 1）
  const calculateLV = (exp: number): number => {
    return Math.floor(exp / 100) + 1;
  };
  
  // allAveを計算（totalCorrect / totalQuestions）
  const calculateAllAve = (stats: UserStatsRow | null): number => {
    if (!stats || stats.totalQuestions === 0) {
      return 0;
    }
    return stats.totalCorrect / stats.totalQuestions;
  };

  const lv = userStats ? calculateLV(userStats.exp) : 0;
  const allAve = calculateAllAve(userStats);
  
  return (
    <div className="user-stats-panel">
      <div className="stats-header">
        <div className="stats-name">{displayValue(userStats?.name || activeUser.displayName)}</div>
      </div>
      <div className="stats-grid">
        <div className="stats-item">
          <div className="stats-label">LV</div>
          <div className="stats-value">{displayValue(lv)}</div>
        </div>
        <div className="stats-item">
          <div className="stats-label">EXP</div>
          <div className="stats-value">{displayValue(userStats?.exp)}</div>
        </div>
        <div className="stats-item">
          <div className="stats-label">10回平均</div>
          <div className="stats-value">{displayValue(tenAve, formatPercentage)}</div>
        </div>
        <div className="stats-item">
          <div className="stats-label">全体平均</div>
          <div className="stats-value">{displayValue(allAve, formatPercentage)}</div>
        </div>
        <div className="stats-item">
          <div className="stats-label">セッション</div>
          <div className="stats-value">{displayValue(userStats?.sess)}</div>
        </div>
        <div className="stats-item">
          <div className="stats-label">連続正解</div>
          <div className="stats-value">{displayValue(questionStreak?.cst)}</div>
        </div>
        <div className="stats-item">
          <div className="stats-label">最大連続</div>
          <div className="stats-value">{displayValue(questionStreak?.mst)}</div>
        </div>
        <div className="stats-item">
          <div className="stats-label">最終</div>
          <div className="stats-value stats-value-date">{formatDateJST(userStats?.lastAt)}</div>
        </div>
      </div>
    </div>
  );
};
