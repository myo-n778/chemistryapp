import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Compound } from '../../types';
import { Category } from '../CategorySelector';
import { StructureViewer } from '../StructureViewer';
import { ScoreDisplay } from '../shared/ScoreDisplay';
import { ProgressBar } from '../shared/ProgressBar';
import { ResultMessage } from '../shared/ResultMessage';
import { QuizSummary } from '../shared/QuizSummary';
import { loadReactions } from '../../data/dataLoader';
import { ReactionCSVRow } from '../../utils/reactionParser';
import '../Quiz.css';

interface SubstitutionQuizProps {
  compounds: Compound[];
  category: Category;
  onBack: () => void;
}

export const SubstitutionQuiz: React.FC<SubstitutionQuizProps> = ({ compounds, category, onBack }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [reactions, setReactions] = useState<ReactionCSVRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPreparing, setShowPreparing] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    loadReactions(category).then(data => {
      const substitutionReactions = data.filter(r => r.type === 'substitution');
      setReactions(substitutionReactions);
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

  const handleAnswer = (_answer: string) => {
    setShowPreparing(true);
    setTimeout(() => setShowPreparing(false), 2000);
  };

  const handleNext = () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    
    if (totalAnswered >= 10) {
      setIsFinished(true);
    } else if (currentIndex < reactions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setIsFinished(true);
    }
    
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 300);
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setTotalAnswered(0);
    setIsFinished(false);
  };

  // Enterキー、スペースキーで次に進む
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && showResult) {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showResult, currentIndex, reactions.length]);

  // 画面全体をクリック/タップで次に進む
  const handleContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('button') && !target.closest('a')) {
      setShowPreparing(true);
      setTimeout(() => setShowPreparing(false), 2000);
    }
  };

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h1>
          有機化学Practice　<span className="score-text"><ScoreDisplay score={score} totalAnswered={totalAnswered} /></span>
        </h1>
      </div>

      <ProgressBar current={currentIndex + 1} total={reactions.length} showResult={showResult} onNext={handleNext} />

      <div className="quiz-content" onClick={handleContentClick} onTouchEnd={(e) => {
        const target = e.target as HTMLElement;
        if (!target.closest('button') && !target.closest('a')) {
          e.preventDefault();
          setShowPreparing(true);
          setTimeout(() => setShowPreparing(false), 2000);
        }
      }} style={{ cursor: 'pointer' }}>
        {showPreparing && (
          <div style={{ textAlign: 'center', color: '#ffa500', fontSize: '1.2rem', padding: '20px', fontWeight: 'bold' }}>
            Preparing...
          </div>
        )}
        <div className="structure-container">
          <h2>{currentReaction.description || `「${currentReaction.from}」に${currentReaction.reagent}をしたら何になる？`}</h2>
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

      {isFinished && (
        <QuizSummary
          score={score}
          total={totalAnswered}
          onRestart={handleReset}
          onBack={onBack}
        />
      )}
    </div>
  );
};

