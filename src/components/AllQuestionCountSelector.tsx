import React from 'react';
import './QuestionCountSelector.css';

interface AllQuestionCountSelectorProps {
  totalCount: number;
  onSelectCount: (count: number | undefined) => void; // undefined = 全部
  onBack: () => void;
  orderMode: 'sequential' | 'shuffle';
}

export const AllQuestionCountSelector: React.FC<AllQuestionCountSelectorProps> = ({ 
  totalCount, 
  onSelectCount, 
  onBack,
  orderMode 
}) => {
  const options = [10, 20, 30, 40];
  const availableOptions = options.filter(count => count <= totalCount);
  
  const handleSelect = (count: number | undefined) => {
    onSelectCount(count);
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
        {availableOptions.map(count => (
          <button
            key={count}
            className="start-index-button"
            onClick={() => handleSelect(count)}
          >
            {count}
          </button>
        ))}
        {totalCount > 0 && (
          <button
            className="start-index-button all-button-large"
            onClick={() => handleSelect(undefined)}
          >
            ALL
          </button>
        )}
      </div>
    </div>
  );
};

