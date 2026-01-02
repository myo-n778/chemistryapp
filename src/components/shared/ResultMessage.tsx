import React from 'react';
import './ResultMessage.css';

interface ResultMessageProps {
  isCorrect: boolean;
  correctAnswer?: string;
  onNext: () => void;
  isLast: boolean;
}

export const ResultMessage: React.FC<ResultMessageProps> = ({
  isCorrect,
  correctAnswer,
  onNext,
  isLast,
}) => {
  return (
    <div className="result-message">
      <div className="result-line">
        {isCorrect ? (
          <span className="correct-message-inline">
            <span className="message-icon">✓</span>
            <span className="english-text">Correct!</span>
          </span>
        ) : (
          <span className="incorrect-message-inline">
            <span className="message-icon">✗</span>
            <span className="english-text">Wrong. Answer: {correctAnswer}</span>
          </span>
        )}
        <button className="next-button-inline" onClick={onNext}>
          {isLast ? 'Restart' : 'Next'}
        </button>
      </div>
    </div>
  );
};

