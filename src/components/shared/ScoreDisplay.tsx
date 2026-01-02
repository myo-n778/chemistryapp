import React from 'react';
import './ScoreDisplay.css';

interface ScoreDisplayProps {
  score: number;
  totalAnswered: number;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score, totalAnswered }) => {
  return (
    <span className="score-display">
      <span className="score-text">スコア: {score}/{totalAnswered}</span>
      {totalAnswered > 0 && (
        <span className="percentage">
          ({Math.round((score / totalAnswered) * 100)}%)
        </span>
      )}
    </span>
  );
};

