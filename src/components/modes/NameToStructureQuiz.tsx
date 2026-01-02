import React, { useState, useEffect, useMemo } from 'react';
import { Compound } from '../../types';
import { Category } from '../CategorySelector';
import { StructureViewer } from '../StructureViewer';
import { ScoreDisplay } from '../shared/ScoreDisplay';
import { ProgressBar } from '../shared/ProgressBar';
import { QuizSummary } from '../shared/QuizSummary';
import '../Quiz.css';

interface NameToStructureQuizProps {
  compounds: Compound[];
  category: Category;
  onBack: () => void;
}

export const NameToStructureQuiz: React.FC<NameToStructureQuizProps> = ({ compounds, onBack }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [showAllNames, setShowAllNames] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // 化合物が空の場合はエラーメッセージを表示
  if (compounds.length === 0) {
    return (
      <div className="quiz-container">
        <div className="quiz-header">
          <h1>有機化学クイズ</h1>
        </div>
        <div style={{ textAlign: 'center', color: '#ffffff', padding: '40px' }}>
          <p>問題データが読み込めませんでした。</p>
          <button className="back-button" onClick={onBack} style={{ marginTop: '20px' }}>
            モード選択に戻る
          </button>
        </div>
      </div>
    );
  }

  const currentCompound = compounds[currentIndex];
  if (!currentCompound && !isFinished) return null;

  // 選択肢として構造式を表示（正解を含む4つの構造式）
  const options = useMemo(() => {
    if (isFinished) return [];
    const current = compounds[currentIndex];
    if (!current) return [];

    const wrongCompounds = compounds
      .filter(c => c.id !== current.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    return [current, ...wrongCompounds].sort(() => Math.random() - 0.5);
  }, [currentIndex, compounds, isFinished]);

  const handleAnswer = (answerId: string) => {
    if (showResult) return;

    setSelectedAnswer(answerId);
    setShowResult(true);
    setTotalAnswered(prev => prev + 1);

    if (answerId === currentCompound.id) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < compounds.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setShowAllNames(false);
    } else {
      setIsFinished(true);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setShowAllNames(false);
    setScore(0);
    setTotalAnswered(0);
    setIsFinished(false);
  };

  useEffect(() => {
    if (!isFinished) {
      setSelectedAnswer(null);
      setShowResult(false);
      setShowAllNames(false);
    }
  }, [currentIndex, isFinished]);

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
  }, [showResult, currentIndex, compounds.length]);

  // 画面全体をクリックで次に進む（右クリック含む）
  const handleGlobalInteraction = (e: React.MouseEvent) => {
    if (showResult) {
      if (e.target === e.currentTarget) {
        handleNext();
      }
    }
  };

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h1>有機化学クイズ</h1>
        <div className="quiz-header-right">
          <span className="score-text"><ScoreDisplay score={score} totalAnswered={totalAnswered} /></span>
          <div className="quiz-header-buttons">
            <button className="back-button" onClick={onBack}>
              return
            </button>
            <button className="reset-button" onClick={handleReset}>
              reset
            </button>
          </div>
        </div>
      </div>

      <ProgressBar current={currentIndex + 1} total={compounds.length} />

      {!isFinished && currentCompound && (
        <div className="quiz-content" onClick={handleGlobalInteraction} style={{ cursor: showResult ? 'pointer' : 'default' }}>
          <div className="structure-container" onClick={(e) => { if (showResult && e.target === e.currentTarget) handleNext(); }}>
            <div className="question-header">
              <div className="question-english-line">
                <div className="question-english">Which structure matches this name?</div>
                {showResult && (
                  <div className="quiz-action-buttons">
                    <button className="next-button-inline-small" onClick={(e) => { e.stopPropagation(); handleNext(); }}>
                      {currentIndex < compounds.length - 1 ? 'Next →' : 'Restart'}
                    </button>
                    <button
                      className={`show-names-button ${showAllNames ? 'active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); setShowAllNames(!showAllNames); }}
                    >
                      Show Names
                    </button>
                  </div>
                )}
              </div>
              <div className="question-line">
                <div className="question-name-area">
                  <h2>「{currentCompound.name}」</h2>
                  {showResult && (
                    <span className="result-message-floating">
                      {selectedAnswer === currentCompound.id ? (
                        <span className="correct-message-inline">
                          <span className="message-icon">✓</span>
                          <span className="english-text">Correct!</span>
                        </span>
                      ) : (
                        <span className="incorrect-message-inline">
                          <span className="message-icon">✗</span>
                          <span className="english-text">Wrong</span>
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="options-container-structure">
              {options.map((compound) => {
                const isSelected = selectedAnswer === compound.id;
                const isCorrect = compound.id === currentCompound.id;
                const showCorrect = showResult && isCorrect;
                const showIncorrect = showResult && isSelected && !isCorrect;

                return (
                  <button
                    key={compound.id}
                    className={`option-button-structure ${showCorrect ? 'correct' : ''
                      } ${showIncorrect ? 'incorrect' : ''
                      } ${isSelected ? 'selected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAnswer(compound.id);
                    }}
                    disabled={showResult}
                  >
                    <StructureViewer
                      structure={compound.structure}
                      compoundName={compound.name}
                    />
                    {showAllNames && (
                      <div className="option-compound-name-hint">
                        {compound.name}
                      </div>
                    )}
                    {showCorrect && <span className="result-icon">✓</span>}
                    {showIncorrect && <span className="result-icon">✗</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isFinished && (
        <QuizSummary
          score={score}
          total={compounds.length}
          onRestart={handleReset}
          onBack={onBack}
        />
      )}
    </div>
  );
};

