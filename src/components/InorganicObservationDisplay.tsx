import React from 'react';
import { parseObservation } from '../utils/inorganicObservationParser';
import { ColorAnnotatedText } from './ColorAnnotatedText';
import './InorganicObservationDisplay.css';

interface InorganicObservationDisplayProps {
  observation: string;
  className?: string;
  colorCues?: string;
}

export const InorganicObservationDisplay: React.FC<InorganicObservationDisplayProps> = ({
  observation,
  className = '',
  colorCues,
}) => {
  const visuals = parseObservation(observation);

  return (
    <div className={`inorganic-observation-display ${className}`}>
      {visuals.map((visual, index) => {
        if (visual.type === 'precipitate') {
          return (
            <span key={index} className="observation-visual observation-precipitate">
              <span className="visual-icon precipitate-icon">⬇</span>
              {visual.color && <span className="visual-color">（<ColorAnnotatedText text={visual.color} cues={colorCues} />）</span>}
              {visual.text && <span className="visual-text"><ColorAnnotatedText text={visual.text} cues={colorCues} /></span>}
              <span className="observation-arrow">↓</span>
            </span>
          );
        } else if (visual.type === 'gas') {
          return (
            <span key={index} className="observation-visual observation-gas">
              <span className="visual-icon gas-icon">⬆</span>
              {visual.color && <span className="visual-color">（<ColorAnnotatedText text={visual.color} cues={colorCues} />）</span>}
              {visual.text && <span className="visual-text"><ColorAnnotatedText text={visual.text} cues={colorCues} /></span>}
              <span className="observation-arrow">↑</span>
            </span>
          );
        } else if (visual.type === 'solution') {
          return (
            <span key={index} className="observation-visual observation-solution">
              <span className="visual-icon solution-icon">■</span>
              {visual.color && <span className="visual-color">（<ColorAnnotatedText text={visual.color} cues={colorCues} />）</span>}
            </span>
          );
        } else {
          return (
            <span key={index} className="observation-text">
              <ColorAnnotatedText text={visual.text} cues={colorCues} />
            </span>
          );
        }
      })}
    </div>
  );
};

