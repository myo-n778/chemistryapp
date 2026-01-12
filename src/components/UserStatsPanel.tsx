import React, { useState, useEffect } from 'react';
import { getActiveUser, User } from '../utils/sessionLogger';
import { getLatestRecByUser, RecRow, calculateQuestionConsecutiveStreak } from '../utils/sessionLogger';
import './UserStatsPanel.css';

interface UserStatsPanelProps {
  mode?: 'organic' | 'inorganic'; // mode指定時はフィルタ適用
}

export const UserStatsPanel: React.FC<UserStatsPanelProps> = ({ mode }) => {
  // Hookは必ずトップレベルで無条件に宣言（React error #310を防ぐ）
  const [recData, setRecData] = useState<RecRow | null>(null);
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
      setRecData(null);
      setQuestionStreak(null);
      return;
    }

    console.log('[UserStatsPanel] Loading rec data for userKey:', userKey, 'mode:', mode);
    
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getLatestRecByUser(userKey, mode);
        console.log('[UserStatsPanel] Rec data loaded:', data);
        setRecData(data);
        
        // 問題単位の連続正解数を計算
        const streak = calculateQuestionConsecutiveStreak(userKey, mode);
        setQuestionStreak(streak);
      } catch (err) {
        console.error('[UserStatsPanel] Failed to load rec data:', err);
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

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatDate = (recRow: RecRow | null | undefined): string => {
    if (!recRow) {
      return '--';
    }
    
    try {
      let date: Date | null = null;
      
      // 優先順位1: recordedAt（number ms）があるならそれを表示（最も信頼）
      if (recRow.recordedAt && typeof recRow.recordedAt === 'number' && recRow.recordedAt > 0) {
        date = new Date(recRow.recordedAt);
      }
      // 優先順位2: recordedAtReadable が日時文字列ならそれを表示
      else if ((recRow as any)?.recordedAtReadable && typeof (recRow as any).recordedAtReadable === 'string') {
        const recordedAtReadable = (recRow as any).recordedAtReadable;
        // YYYY/MM/DD HH:MM形式の場合はそのまま使用
        if (/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}/.test(recordedAtReadable)) {
          // 文字列をパースしてDateオブジェクトに変換
          const parts = recordedAtReadable.match(/(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})/);
          if (parts) {
            date = new Date(parseInt(parts[1]), parseInt(parts[2]) - 1, parseInt(parts[3]), parseInt(parts[4]), parseInt(parts[5]));
          }
        } else {
          date = new Date(recordedAtReadable);
        }
      }
      // 優先順位3: last が ISO ならそれを表示
      else if (recRow.last && typeof recRow.last === 'string') {
        // 日付のみ（00:00Z固定）の場合は時刻の根拠にならないため、recordedAtを優先
        // ISO形式（YYYY-MM-DDTHH:mm:ss）の場合は使用
        if (recRow.last.includes('T') || recRow.last.includes(' ')) {
          date = new Date(recRow.last);
        } else {
          // 日付のみの場合は時刻が00:00Z固定なので、recordedAtがあればそれを使う
          // ここでは既にrecordedAtがないことが確定しているので、日付のみとして扱う
          date = new Date(recRow.last);
        }
      }
      
      if (!date || isNaN(date.getTime())) {
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
          <div className="stats-label">LV</div>
          <div className="stats-value">{displayValue(recData?.LV)}</div>
        </div>
        <div className="stats-item">
          <div className="stats-label">EXP</div>
          <div className="stats-value">{displayValue(recData?.EXP)}</div>
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
          <div className="stats-value">{displayValue(questionStreak?.cst ?? recData?.cst)}</div>
        </div>
        <div className="stats-item">
          <div className="stats-label">最大連続</div>
          <div className="stats-value">{displayValue(questionStreak?.mst ?? recData?.mst)}</div>
        </div>
        <div className="stats-item">
          <div className="stats-label">最終</div>
          <div className="stats-value stats-value-date">{formatDate(recData)}</div>
        </div>
      </div>
    </div>
  );
};
