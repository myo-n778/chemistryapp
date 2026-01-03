import React, { useState } from 'react';
import './QuestionCountSelector.css';
import { QuizMode } from './ModeSelector';
import { Category } from './CategorySelector';
import { getScoreHistory, getRangeKey } from '../utils/scoreCalculator';

export type QuestionCountMode = 'all' | 'batch-10' | 'batch-20' | 'batch-40';
export type OrderMode = 'sequential' | 'shuffle';
export interface QuizSettings {
  questionCountMode: QuestionCountMode;
  orderMode?: OrderMode;
  startIndex?: number;
  allQuestionCount?: number; // ALLモードの場合の解く問題数（undefined = 全部）
}

interface QuestionCountSelectorProps {
  totalCount: number;
  onSelectSettings: (settings: QuizSettings) => void;
  onBack: () => void;
  mode?: QuizMode;
  category?: Category;
}

export const QuestionCountSelector: React.FC<QuestionCountSelectorProps> = ({ totalCount, onSelectSettings, onBack, mode, category }) => {
  console.log('[QuestionCountSelector] props', { mode, category, totalCount });
  const [orderMode, setOrderMode] = useState<'sequential' | 'shuffle'>('shuffle');
  const [expandedMode, setExpandedMode] = useState<QuestionCountMode | null>(null);

  const handleModeSelect = (mode: QuestionCountMode) => {
    if (mode === 'all') {
      // ALLモードは問題数選択が必要なため、特別な値を設定
      onSelectSettings({
        questionCountMode: 'all',
        orderMode: orderMode,
        allQuestionCount: undefined // 問題数選択が必要
      });
    } else {
      // その他のモードは範囲選択を展開
      setExpandedMode(expandedMode === mode ? null : mode);
    }
  };

  const handleRangeSelect = (mode: QuestionCountMode, startIndex: number) => {
    onSelectSettings({
      questionCountMode: mode,
      startIndex: startIndex,
      orderMode: orderMode
    });
  };

  // 範囲を生成する関数
  const generateRanges = (batchSize: number) => {
    const ranges = [];
    for (let i = 1; i <= totalCount; i += batchSize) {
      const end = Math.min(i + batchSize - 1, totalCount);
      ranges.push({ start: i, end: end });
    }
    return ranges;
  };

  const ranges10 = generateRanges(10);
  const ranges20 = generateRanges(20);
  const ranges40 = generateRanges(40);

  // 取り組み履歴を取得する関数
  const getRangeHistory = (questionCountMode: 'batch-10' | 'batch-20' | 'batch-40', startIndex: number) => {
    if (!mode || !category) {
      console.log('[getRangeHistory] mode or category is missing', { mode, category });
      return null;
    }
    
    const modeKey = `${mode}-${category}`;
    const rangeKey = getRangeKey(questionCountMode, startIndex);
    console.log('[getRangeHistory]', { modeKey, rangeKey, questionCountMode, startIndex });
    const history = getScoreHistory(modeKey, rangeKey);
    console.log('[getRangeHistory] history', history);
    
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
              onClick={() => setOrderMode('sequential')}
            >
              Sequential
            </button>
            <button
              className={`order-toggle-button ${orderMode === 'shuffle' ? 'active' : ''}`}
              onClick={() => setOrderMode('shuffle')}
            >
              Shuffle
            </button>
          </div>
        </div>
      </div>
      <p className="question-count-description">出題する範囲を選択してください（右上で順序を切り替え）</p>

      {/* モード選択ボタン */}
      <div className="mode-selection-container">
        <button
          className={`mode-button ${expandedMode === 'all' ? 'expanded' : ''}`}
          onClick={() => handleModeSelect('all')}
        >
          All Questions
        </button>
        <button
          className={`mode-button ${expandedMode === 'batch-10' ? 'expanded' : ''}`}
          onClick={() => handleModeSelect('batch-10')}
        >
          10ずつ
        </button>
        <button
          className={`mode-button ${expandedMode === 'batch-20' ? 'expanded' : ''}`}
          onClick={() => handleModeSelect('batch-20')}
        >
          20ずつ
        </button>
        {totalCount > 30 && (
          <button
            className={`mode-button ${expandedMode === 'batch-40' ? 'expanded' : ''}`}
            onClick={() => handleModeSelect('batch-40')}
          >
            40ずつ
          </button>
        )}
      </div>

      {/* 範囲選択の展開表示 */}
      {expandedMode === 'batch-10' && (
        <div className="range-selection-container">
          <div className="start-index-grid">
            {ranges10.map(range => {
              console.log('[QuestionCountSelector] rendering range', range, { mode, category });
              const history = getRangeHistory('batch-10', range.start);
              console.log('[QuestionCountSelector] history for range', range, history);
              return (
                <button
                  key={range.start}
                  className="start-index-button"
                  onClick={() => handleRangeSelect('batch-10', range.start)}
                >
                  {range.start}-{range.end}
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
          </div>
        </div>
      )}

      {expandedMode === 'batch-20' && (
        <div className="range-selection-container">
          <div className="start-index-grid">
            {ranges20.map(range => {
              const history = getRangeHistory('batch-20', range.start);
              return (
                <button
                  key={range.start}
                  className="start-index-button"
                  onClick={() => handleRangeSelect('batch-20', range.start)}
                >
                  {range.start}-{range.end}
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
          </div>
        </div>
      )}

      {expandedMode === 'batch-40' && (
        <div className="range-selection-container">
          <div className="start-index-grid">
            {ranges40.map(range => {
              const history = getRangeHistory('batch-40', range.start);
              return (
                <button
                  key={range.start}
                  className="start-index-button"
                  onClick={() => handleRangeSelect('batch-40', range.start)}
                >
                  {range.start}-{range.end}
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
          </div>
        </div>
      )}
    </div>
  );
};
