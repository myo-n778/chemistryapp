import React, { useState, useEffect, useMemo } from 'react';
import { Compound } from '../../types';
import { Category } from '../CategorySelector';
import { StructureViewer } from '../StructureViewer';
import { ScoreDisplay } from '../shared/ScoreDisplay';
import { ProgressBar } from '../shared/ProgressBar';
import { ResultMessage } from '../shared/ResultMessage';
import { loadReactions } from '../../data/dataLoader';
import { ReactionCSVRow } from '../../utils/reactionParser';
import '../Quiz.css';

interface SynthesisQuizProps {
  compounds: Compound[];
  category: Category;
  onBack: () => void;
}

export const SynthesisQuiz: React.FC<SynthesisQuizProps> = ({ compounds, category, onBack }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [reactions, setReactions] = useState<ReactionCSVRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReactions(category).then(data => {
      const synthesisReactions = data.filter(r => r.type === 'synthesis');
      setReactions(synthesisReactions);
      setLoading(false);
    });
  }, [category]);

  const currentReaction = reactions[currentIndex];
  
  if (loading) {
    return (
      <div className="quiz-container">
        <p style={{ color: '#ffffff' }}>データを読み込んでいます...</p>
      </div>
    );
  }

  if (!currentReaction || reactions.length === 0) {
    return (
      <div className="quiz-container">
        <p style={{ color: '#ffffff' }}>反応データがありません</p>
        <button className="back-button" onClick={onBack}>モード選択に戻る</button>
      </div>
    );
  }

  const fromCompound = compounds.find(c => c.name === currentReaction.from);
  const correctCompound = compounds.find(c => c.name === currentReaction.to);
  
  if (!fromCompound || !correctCompound) {
    return (
      <div className="quiz-container">
        <p>データが不足しています</p>
        <button className="back-button" onClick={onBack}>モード選択に戻る</button>
      </div>
    );
  }

  const options = useMemo(() => {
    const wrongAnswers = compounds
      .filter(c => c.name !== correctCompound.name)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    return [correctCompound.name, ...wrongAnswers.map(c => c.name)].sort(() => Math.random() - 0.5);
  }, [compounds, correctCompound.name]);

  const handleAnswer = (answer: string) => {
    if (showResult) return;
    
    setSelectedAnswer(answer);
    setShowResult(true);
    setTotalAnswered(prev => prev + 1);
    
    if (answer === correctCompound.name) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < reactions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(0);
    }
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setTotalAnswered(0);
  };

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h1>
          有機化学クイズ　<span className="score-text"><ScoreDisplay score={score} totalAnswered={totalAnswered} /></span>
        </h1>
      </div>

      <ProgressBar current={currentIndex + 1} total={reactions.length} />

      <div className="quiz-content">
        <div className="structure-container">
          <h2>{currentReaction.description || `「${currentReaction.from}」に${currentReaction.reagent}を反応させると何になる？`}</h2>
          {fromCompound && (
            <StructureViewer structure={fromCompound.structure} compoundName={fromCompound.name} />
          )}
        </div>

        <div className="options-container">
          {options.map((option) => {
            const isSelected = selectedAnswer === option;
            const isCorrect = option === correctCompound.name;
            const showCorrect = showResult && isCorrect;
            const showIncorrect = showResult && isSelected && !isCorrect;

            return (
              <button
                key={option}
                className={`option-button ${
                  showCorrect ? 'correct' : ''
                } ${
                  showIncorrect ? 'incorrect' : ''
                } ${isSelected ? 'selected' : ''}`}
                onClick={() => handleAnswer(option)}
                disabled={showResult}
              >
                {option}
                {showCorrect && <span className="result-icon">✓</span>}
                {showIncorrect && <span className="result-icon">✗</span>}
              </button>
            );
          })}
        </div>

        {showResult && (
          <ResultMessage
            isCorrect={selectedAnswer === correctCompound.name}
            correctAnswer={correctCompound.name}
            onNext={handleNext}
            isLast={currentIndex >= reactions.length - 1}
          />
        )}
      </div>

      <div className="quiz-footer">
        <button className="back-button" onClick={onBack}>
          モード選択に戻る
        </button>
        <button className="reset-button" onClick={handleReset}>
          リセット
        </button>
      </div>
    </div>
  );
};

