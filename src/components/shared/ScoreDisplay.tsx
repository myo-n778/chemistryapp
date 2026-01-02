import React, { useState, useEffect } from 'react';
import { getHighScoreWithCount } from '../../utils/scoreCalculator';
import './ScoreDisplay.css';

interface ScoreDisplayProps {
  score: number;
  totalAnswered: number;
  pointScore?: number; // 得点表示モード用のポイントスコア
  showPoints?: boolean; // 得点表示モードかどうか
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score, totalAnswered, pointScore, showPoints }) => {
  const highScoreData = showPoints ? getHighScoreWithCount() : { score: 0, correctCount: 0, totalCount: 0 };
  const [isAnimating, setIsAnimating] = useState(false);
  const [prevPointScore, setPrevPointScore] = useState(pointScore || 0);

  // スコア加算時のアニメーション
  useEffect(() => {
    if (showPoints && pointScore !== undefined && pointScore > prevPointScore) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300);
      setPrevPointScore(pointScore);
      return () => clearTimeout(timer);
    }
  }, [pointScore, showPoints, prevPointScore]);
  
  if (showPoints && pointScore !== undefined) {
    return (
      <span className={`score-display ${isAnimating ? 'score-animating' : ''}`}>
        <span className="top-score-text">
          TOP SCORE: {highScoreData.score.toLocaleString()}
          {highScoreData.totalCount > 0 && ` (${highScoreData.correctCount}/${highScoreData.totalCount})`}
        </span>
        <span className="score-text">SCORE: {pointScore.toLocaleString()}</span>
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
