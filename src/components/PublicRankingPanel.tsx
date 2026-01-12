import React, { useState, useEffect } from 'react';
import { getActiveUser, User, getPublicRankingFromUserStats, UserStatsRow, formatDateJST } from '../utils/sessionLogger';
import './PublicRankingPanel.css';

interface PublicRankingPanelProps {
  // modeはuserStatsでは使わない（全データから取得）
}

export const PublicRankingPanel: React.FC<PublicRankingPanelProps> = () => {
  // Hookは必ずトップレベルで無条件に宣言（React error #310を防ぐ）
  const [ranking, setRanking] = useState<UserStatsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userKey, setUserKey] = useState<string | null>(null);
  const [activeUser, setActiveUser] = useState<User | null>(null);

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

  // userKeyが変更されたときにデータを再取得（modeはuserStatsでは使わない）
  useEffect(() => {
    if (!userKey) {
      setLoading(false);
      setRanking([]);
      return;
    }

    console.log('[PublicRankingPanel] Loading ranking from userStats');
    
    const loadRanking = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getPublicRankingFromUserStats();
        console.log('[PublicRankingPanel] Ranking loaded:', data.length, 'entries');
        setRanking(data);
      } catch (err) {
        console.error('[PublicRankingPanel] Failed to load ranking:', err);
        setError('ランキングの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadRanking();
  }, [userKey]); // userKey（文字列）のみを依存配列に含める

  // activeUserが存在しない場合は表示しない（Hookの後に条件分岐）
  if (!activeUser) {
    return null;
  }

  if (loading) {
    return (
      <div className="public-ranking-panel">
        <div className="ranking-loading">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="public-ranking-panel">
        <div className="ranking-error">{error}</div>
      </div>
    );
  }

  if (ranking.length === 0) {
    return (
      <div className="public-ranking-panel">
        <div className="ranking-header">公開ランキング</div>
        <div className="ranking-empty">まだ公開データがありません</div>
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

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };
  
  // allAveを計算（totalCorrect / totalQuestions）
  const calculateAllAve = (stats: UserStatsRow): number => {
    if (stats.totalQuestions === 0) {
      return 0;
    }
    return stats.totalCorrect / stats.totalQuestions;
  };
  
  // LVを計算（exp / 100 + 1）
  const calculateLV = (exp: number): number => {
    return Math.floor(exp / 100) + 1;
  };

  return (
    <div className="public-ranking-panel">
      <div className="ranking-header">公開ランキング</div>
      <div className="ranking-scroll-container">
        <div className="ranking-table">
          <div className="ranking-table-header">
            <div className="ranking-col-rank">順位</div>
            <div className="ranking-col-name">名前</div>
            <div className="ranking-col-lv">LV</div>
            <div className="ranking-col-exp">EXP</div>
            <div className="ranking-col-ave">全体平均</div>
            <div className="ranking-col-sess">セッション</div>
            <div className="ranking-col-last">最終</div>
          </div>
          <div className="ranking-table-body">
          {ranking.map((row, index) => {
            const rankClass = index === 0 ? 'rankTop1' : index === 1 ? 'rankTop2' : index === 2 ? 'rankTop3' : '';
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;
            const allAve = calculateAllAve(row);
            const lv = calculateLV(row.exp);
            return (
              <div key={`${row.userKey}-${row.updatedAt || index}`} className={`ranking-row ${rankClass}`}>
                <div className="ranking-col-rank">
                  {medal && <span className="rank-medal">{medal}</span>}
                  {index + 1}
                </div>
                <div className="ranking-col-name">{displayValue(row.name)}</div>
                <div className="ranking-col-lv">{displayValue(lv)}</div>
                <div className="ranking-col-exp">{displayValue(row.exp)}</div>
                <div className="ranking-col-ave">{displayValue(allAve, formatPercentage)}</div>
                <div className="ranking-col-sess">{displayValue(row.sess)}</div>
                <div className="ranking-col-last">{formatDateJST(row.lastAt)}</div>
              </div>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
};
