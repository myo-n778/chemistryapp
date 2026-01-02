import React, { useState } from 'react';
import './QuestionCountSelector.css';

export type QuestionCountMode = 'all' | 'batch-10';
export type OrderMode = 'sequential' | 'shuffle';
export interface QuizSettings {
  questionCountMode: QuestionCountMode;
  orderMode?: OrderMode;
  startIndex?: number;
}

interface QuestionCountSelectorProps {
  totalCount: number;
  onSelectSettings: (settings: QuizSettings) => void;
  onBack: () => void;
}

export const QuestionCountSelector: React.FC<QuestionCountSelectorProps> = ({ totalCount, onSelectSettings, onBack }) => {
  const [orderMode, setOrderMode] = useState<'sequential' | 'shuffle'>('sequential');

  const handleStartIndexSelect = (index: number) => {
    onSelectSettings({
      questionCountMode: 'batch-10',
      startIndex: index,
      orderMode: orderMode
    });
  };

  const handleAllSelect = () => {
    onSelectSettings({
      questionCountMode: 'all',
      orderMode: orderMode
    });
  };

  // 10問ずつの範囲を生成
  const generateRanges = () => {
    const ranges = [];
    for (let i = 1; i <= totalCount; i += 10) {
      const end = Math.min(i + 9, totalCount);
      ranges.push({ start: i, end: end });
    }
    return ranges;
  };

  const ranges = generateRanges();

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

      <div className="all-modes-container-single">
        <button
          className="start-index-button all-button-large"
          onClick={handleAllSelect}
        >
          All Questions
        </button>
      </div>

      <div className="start-index-grid">
        {/* 範囲セレクトボタン */}
        {ranges.map(range => (
          <button
            key={range.start}
            className="start-index-button"
            onClick={() => handleStartIndexSelect(range.start)}
          >
            {range.start}-{range.end}
          </button>
        ))}
      </div>
    </div>
  );
};

