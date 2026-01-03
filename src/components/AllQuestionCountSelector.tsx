import React from 'react';
import './QuestionCountSelector.css';
import { QuizMode } from './ModeSelector';
import { Category } from './CategorySelector';
import { getScoreHistory, getRangeKey } from '../utils/scoreCalculator';

interface AllQuestionCountSelectorProps {
  totalCount: number;
  onSelectCount: (count: number | undefined) => void; // undefined = 全部
  onBack: () => void;
  orderMode: 'sequential' | 'shuffle';
  mode?: QuizMode;
  category?: Category;
}

export const AllQuestionCountSelector: React.FC<AllQuestionCountSelectorProps> = ({ 
  totalCount, 
  onSelectCount, 
  onBack,
  orderMode,
  mode,
  category
}) => {
  console.log('[AllQuestionCountSelector] props', { mode, category, totalCount });
  // 35問以下の場合は適切な選択肢を表示（35問も含める）
  const baseOptions = [10, 20, 30];
  const additionalOptions = totalCount <= 35 && totalCount > 30 ? [totalCount] : totalCount > 35 ? [40] : [];
  const options = [...baseOptions, ...additionalOptions];
  const availableOptions = options.filter(count => count <= totalCount);
  
  const handleSelect = (count: number | undefined) => {
    onSelectCount(count);
  };

  // 取り組み履歴を取得する関数（ALLモード用）
  const getAllModeHistory = (allQuestionCount: number | undefined) => {
    if (!mode || !category) {
      console.log('[getAllModeHistory] mode or category is missing', { mode, category });
      return null;
    }
    
    const modeKey = `${mode}-${category}`;
    const rangeKey = getRangeKey('all', undefined, allQuestionCount);
    console.log('[getAllModeHistory]', { modeKey, rangeKey, allQuestionCount });
    const history = getScoreHistory(modeKey, rangeKey);
    console.log('[getAllModeHistory] history', history);
    
    if (history.length === 0) return null;
    
    // 最新の日付を取得
    const latestDate = new Date(history[0].date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const latestDateOnly = new Date(latestDate);
    latestDateOnly.setHours(0, 0, 0, 0);
    const isToday = latestDateOnly.getTime() === today.getTime();
    
    return {
      count: history.length,
      latestDate: latestDate,
      isToday: isToday
    };
  };

  // 取り組み回数に応じた色を取得
  const getHistoryColor = (count: number) => {
    if (count === 1) return '#888'; // 控えめな色
    if (count <= 3) return '#ffa500'; // オレンジ
    if (count <= 5) return '#ff8c00'; // より強いオレンジ
    return '#ff6b35'; // 最も強い色
  };

  return (
    <div className="question-count-selector">
      <div className="question-count-selector-header">
        <div className="header-main-row">
          <button className="back-button" onClick={onBack}>
            return
          </button>
          <h1>問題数を選択</h1>
          <div className="order-toggle-container">
            <button
              className={`order-toggle-button ${orderMode === 'sequential' ? 'active' : ''}`}
              disabled
            >
              Sequential
            </button>
            <button
              className={`order-toggle-button ${orderMode === 'shuffle' ? 'active' : ''}`}
              disabled
            >
              Shuffle
            </button>
          </div>
        </div>
      </div>
      <p className="question-count-description">何問解きますか？</p>

      <div className="start-index-grid">
        {availableOptions.map(count => {
          const history = getAllModeHistory(count);
          return (
            <button
              key={count}
              className="start-index-button"
              onClick={() => handleSelect(count)}
            >
              {count}
              {history && (
                <span className="range-history" style={{ color: getHistoryColor(history.count) }}>
                  <span className="history-count">×{history.count}</span>
                  <span className={`history-date ${history.isToday ? 'today' : ''}`}>
                    {history.latestDate.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                  </span>
                </span>
              )}
            </button>
          );
        })}
        {totalCount > 0 && (() => {
          const history = getAllModeHistory(undefined);
          return (
            <button
              className="start-index-button all-button-large"
              onClick={() => handleSelect(undefined)}
            >
              ALL
              {history && (
                <span className="range-history" style={{ color: getHistoryColor(history.count) }}>
                  <span className="history-count">×{history.count}</span>
                  <span className={`history-date ${history.isToday ? 'today' : ''}`}>
                    {history.latestDate.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                  </span>
                </span>
              )}
            </button>
          );
        })()}
      </div>
    </div>
  );
};

