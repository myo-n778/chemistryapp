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
  quizSettings?: { questionCountMode?: 'all' | 'batch-10' | 'batch-20' | 'batch-40' | 'batch-20' | 'batch-40'; startIndex?: number; allQuestionCount?: number };
  totalCount?: number;
  onNextRange?: () => void;
}

export const SubstitutionQuiz: React.FC<SubstitutionQuizProps> = ({ compounds, category, onBack, quizSettings: _quizSettings, totalCount: _totalCount = 0, onNextRange: _onNextRange }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [reactions, setReactions] = useState<ReactionCSVRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    loadReactions(category).then(data => {
      setReactions(data);
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
  const toCompound = compounds.find(c => c.name === currentReaction.to);
  
  if (!fromCompound || !toCompound) {
    return (
      <div className="quiz-container">
        <p>データが不足しています</p>
        <button className="back-button" onClick={onBack}>モード選択に戻る</button>
      </div>
    );
  }

  // reagentを答える選択肢を生成
  const options = useMemo(() => {
    const correctReagent = currentReaction.reagent;
    const allReagents = Array.from(new Set(reactions.map(r => r.reagent))).filter(r => r !== '');
    const wrongReagents = allReagents
      .filter(r => r !== correctReagent)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    return [correctReagent, ...wrongReagents].sort(() => Math.random() - 0.5);
  }, [currentIndex, reactions, currentReaction]);

  const handleAnswer = (answer: string) => {
    if (showResult) return;
    const isCorrect = answer === currentReaction.reagent;
    setSelectedAnswer(answer);
    setShowResult(true);
    setTotalAnswered(prev => prev + 1);
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
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
    if (showResult && !isProcessingRef.current) {
      const target = e.target as HTMLElement;
      if (!target.closest('button') && !target.closest('a')) {
        handleNext();
      }
    }
  };

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h1>
          Organic Chemistry Drill <span className="score-text"><ScoreDisplay score={score} totalAnswered={totalAnswered} /></span>
        </h1>
      </div>

      <ProgressBar current={currentIndex + 1} total={reactions.length} showResult={showResult} onNext={handleNext} />

      <div className="quiz-content" style={{ cursor: showResult ? 'pointer' : 'default' }} onClick={handleContentClick} onTouchEnd={(e) => {
        if (showResult && !isProcessingRef.current) {
          const target = e.target as HTMLElement;
          if (!target.closest('button') && !target.closest('a')) {
            e.preventDefault();
            handleNext();
          }
        }
      }}>
        <div className="structure-container">
          <h2>この反応で、何をしたか？</h2>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>From</div>
              {fromCompound && (
                <StructureViewer structure={fromCompound.structure} compoundName={fromCompound.name} />
              )}
              <div style={{ marginTop: '10px' }}>{currentReaction.from}</div>
            </div>
            <div style={{ fontSize: '2rem' }}>→</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>To</div>
              {toCompound && (
                <StructureViewer structure={toCompound.structure} compoundName={toCompound.name} />
              )}
              <div style={{ marginTop: '10px' }}>{currentReaction.to}</div>
            </div>
          </div>
        </div>

        <div className="options-container">
          {options.map((option) => {
            const isSelected = selectedAnswer === option;
            const isCorrect = option === currentReaction.reagent;
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
          <>
            {selectedAnswer === currentReaction.reagent && currentReaction.description && (
              <div style={{ textAlign: 'center', color: '#ffa500', fontSize: '1rem', padding: '15px', marginTop: '20px' }}>
                {currentReaction.description}
              </div>
            )}
            <ResultMessage
              isCorrect={selectedAnswer === currentReaction.reagent}
              correctAnswer={currentReaction.reagent}
              onNext={handleNext}
              isLast={currentIndex >= reactions.length - 1}
            />
          </>
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
          mode={`substitution-${category}`}
          rangeKey="all-full"
        />
      )}
    </div>
  );
};

