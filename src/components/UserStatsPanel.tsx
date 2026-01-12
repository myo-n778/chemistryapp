import React, { useState, useEffect } from 'react';
import { getActiveUser } from '../utils/sessionLogger';
import { getLatestRecByUser, RecRow } from '../utils/sessionLogger';
import './UserStatsPanel.css';

interface UserStatsPanelProps {
  mode?: 'organic' | 'inorganic'; // mode指定時はフィルタ適用
}

export const UserStatsPanel: React.FC<UserStatsPanelProps> = ({ mode }) => {
  const [recData, setRecData] = useState<RecRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const activeUser = getActiveUser();
    if (!activeUser) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getLatestRecByUser(activeUser.userKey, mode);
        setRecData(data);
      } catch (err) {
        console.error('Failed to load rec data:', err);
        setError('データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [mode]);

  // activeUserが存在しない場合は表示しない
  const activeUser = getActiveUser();
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

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatDate = (value: string | number | undefined | null): string => {
    if (!value || value === '--') {
      return '--';
    }
    try {
      // valueが文字列の場合（YYYY/MM/DD HH:MM形式またはISO形式）
      let date: Date;
      if (typeof value === 'string') {
        // 既にYYYY/MM/DD形式の場合はそのまま返す
        if (/^\d{4}\/\d{2}\/\d{2}/.test(value)) {
          return value;
        }
        // ISO形式やタイムスタンプの場合
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
    <div className="user-stats-panel">
      <div className="stats-header">
        <div className="stats-name">{displayValue(recData?.displayName || recData?.name || activeUser.displayName)}</div>
      </div>
      <div className="stats-grid">
        <div className="stats-item">
          <div className="stats-label">EXP</div>
          <div className="stats-value">{displayValue(recData?.EXP)}</div>
        </div>
        <div className="stats-item">
          <div className="stats-label">LV</div>
          <div className="stats-value">{displayValue(recData?.LV)}</div>
        </div>
        <div className="stats-item">
          <div className="stats-label">10回平均</div>
          <div className="stats-value">{displayValue(recData?.tenAve, formatPercentage)}</div>
        </div>
        <div className="stats-item">
          <div className="stats-label">全体平均</div>
          <div className="stats-value">{displayValue(recData?.allAve, formatPercentage)}</div>
        </div>
        <div className="stats-item">
          <div className="stats-label">セッション</div>
          <div className="stats-value">{displayValue(recData?.sess)}</div>
        </div>
        <div className="stats-item">
          <div className="stats-label">連続正解</div>
          <div className="stats-value">{displayValue(recData?.cst)}</div>
        </div>
        <div className="stats-item">
          <div className="stats-label">最大連続</div>
          <div className="stats-value">{displayValue(recData?.mst)}</div>
        </div>
        <div className="stats-item">
          <div className="stats-label">最終</div>
          <div className="stats-value stats-value-date">{formatDate(recData?.last)}</div>
        </div>
      </div>
    </div>
  );
};
