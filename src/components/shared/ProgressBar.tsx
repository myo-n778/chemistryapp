import React from 'react';
import './ProgressBar.css';

interface ProgressBarProps {
  current: number;
  total: number;
  showResult?: boolean;
  onNext?: () => void;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, total, showResult, onNext }) => {
  return (
    <div className="progress-container">
      <div className="progress-text-wrapper">
        <span className="progress-text">問題 {current} / {total}</span>
        {showResult && onNext && (
          <button className="next-button-mobile" onClick={onNext}>
            Next
          </button>
        )}
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
    </div>
  );
};

