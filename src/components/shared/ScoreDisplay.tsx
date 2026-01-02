import React from 'react';
import { getHighScore } from '../../utils/scoreCalculator';
import './ScoreDisplay.css';

interface ScoreDisplayProps {
  score: number;
  totalAnswered: number;
  pointScore?: number; // 得点表示モード用のポイントスコア
  showPoints?: boolean; // 得点表示モードかどうか
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score, totalAnswered, pointScore, showPoints }) => {
  const highScore = showPoints ? getHighScore() : 0;
  
  if (showPoints && pointScore !== undefined) {
    return (
      <span className="score-display">
        <span className="top-score-text">TOP SCORE: {highScore.toLocaleString()}</span>
        <span className="score-text">得点: {pointScore.toLocaleString()}</span>
        <span className="percentage">
          (正解: {score}/{totalAnswered})
        </span>
      </span>
    );
  }

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

