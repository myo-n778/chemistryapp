import React from 'react';
import { parseObservation, ObservationVisual } from '../utils/inorganicObservationParser';
import './InorganicObservationDisplay.css';

interface InorganicObservationDisplayProps {
  observation: string;
  className?: string;
}

export const InorganicObservationDisplay: React.FC<InorganicObservationDisplayProps> = ({
  observation,
  className = '',
}) => {
  const visuals = parseObservation(observation);

  return (
    <div className={`inorganic-observation-display ${className}`}>
      {visuals.map((visual, index) => {
        if (visual.type === 'precipitate') {
          return (
            <span key={index} className="observation-visual observation-precipitate">
              <span className="visual-icon precipitate-icon">⬇</span>
              {visual.color && <span className="visual-color">（{visual.color}）</span>}
              {visual.text && <span className="visual-text">{visual.text}</span>}
              <span className="observation-arrow">↓</span>
            </span>
          );
        } else if (visual.type === 'gas') {
          return (
            <span key={index} className="observation-visual observation-gas">
              <span className="visual-icon gas-icon">⬆</span>
              {visual.color && <span className="visual-color">（{visual.color}）</span>}
              {visual.text && <span className="visual-text">{visual.text}</span>}
              <span className="observation-arrow">↑</span>
            </span>
          );
        } else if (visual.type === 'solution') {
          return (
            <span key={index} className="observation-visual observation-solution">
              <span className="visual-icon solution-icon">■</span>
              {visual.color && <span className="visual-color">（{visual.color}）</span>}
            </span>
          );
        } else {
          return (
            <span key={index} className="observation-text">
              {visual.text}
            </span>
          );
        }
      })}
    </div>
  );
};

