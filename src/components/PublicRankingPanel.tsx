import React, { useState, useEffect } from 'react';
import { getActiveUser, User } from '../utils/sessionLogger';
import { getPublicRankingLatest, RecRow } from '../utils/sessionLogger';
import './PublicRankingPanel.css';

interface PublicRankingPanelProps {
  mode?: 'organic' | 'inorganic'; // mode指定時はフィルタ適用
}

export const PublicRankingPanel: React.FC<PublicRankingPanelProps> = ({ mode }) => {
  const [ranking, setRanking] = useState<RecRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeUser, setActiveUser] = useState<User | null>(() => getActiveUser());

  // activeUserの変更を監視（localStorageの変更を検知）
  useEffect(() => {
    const checkActiveUser = () => {
      const currentActiveUser = getActiveUser();
      setActiveUser(currentActiveUser);
    };

    // 初回チェック
    checkActiveUser();

    // 定期的にチェック（ユーザー切替時に更新されるように）
    const interval = setInterval(checkActiveUser, 500);
    return () => clearInterval(interval);
  }, []);

  // activeUserまたはmodeが変更されたときにデータを再取得
  useEffect(() => {
    if (!activeUser) {
      setLoading(false);
      setRanking([]);
      return;
    }

    const loadRanking = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getPublicRankingLatest(mode);
        setRanking(data);
      } catch (err) {
        console.error('Failed to load ranking:', err);
        setError('ランキングの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadRanking();
  }, [mode, activeUser?.userKey]); // activeUser.userKeyを依存配列に追加（activeUser変更時に再取得）

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
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatDate = (value: string | number | undefined | null): string => {
    if (!value || value === '--') {
      return '--';
    }
    try {
      let date: Date;
      if (typeof value === 'string') {
        // 既にYYYY/MM/DD形式の場合はそのまま返す
        if (/^\d{4}\/\d{2}\/\d{2}/.test(value)) {
          return value;
        }
        date = new Date(value);
      } else {
        date = new Date(value);
      }
      
      if (isNaN(date.getTime())) {
        return '--';
      }
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${year}/${month}/${day} ${hours}:${minutes}`;
    } catch {
      return '--';
    }
  };

  return (
    <div className="public-ranking-panel">
      <div className="ranking-header">公開ランキング</div>
      <div className="ranking-table">
        <div className="ranking-table-header">
          <div className="ranking-col-rank">順位</div>
          <div className="ranking-col-name">名前</div>
          <div className="ranking-col-lv">LV</div>
          <div className="ranking-col-ave">全体平均</div>
          <div className="ranking-col-sess">セッション</div>
          <div className="ranking-col-last">最終</div>
        </div>
        <div className="ranking-table-body">
          {ranking.map((row, index) => {
            const rankClass = index === 0 ? 'rankTop1' : index === 1 ? 'rankTop2' : index === 2 ? 'rankTop3' : '';
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;
            return (
              <div key={`${row.userKey}-${row.recordedAt || row.timestamp || index}`} className={`ranking-row ${rankClass}`}>
                <div className="ranking-col-rank">
                  {medal && <span className="rank-medal">{medal}</span>}
                  {index + 1}
                </div>
                <div className="ranking-col-name">{displayValue(row.displayName || row.name)}</div>
                <div className="ranking-col-lv">{displayValue(row.LV)}</div>
                <div className="ranking-col-ave">{displayValue(row.allAve, formatPercentage)}</div>
                <div className="ranking-col-sess">{displayValue(row.sess)}</div>
                <div className="ranking-col-last">{formatDate(row.last)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
