import React from 'react';
import './ProgressBar.css';

interface ProgressBarProps {
  current: number;
  total: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, total }) => {
  return (
    <div className="progress-container">
      <span className="progress-text">問題 {current} / {total}</span>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
    </div>
  );
};

