import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Compound } from '../../types';
import { Category } from '../CategorySelector';
import { StructureViewer } from '../StructureViewer';
import { ScoreDisplay } from '../shared/ScoreDisplay';
import '../Quiz.css';

interface StructureToNameQuizProps {
  compounds: Compound[];
  category: Category;
  onBack: () => void;
}

export const StructureToNameQuiz: React.FC<StructureToNameQuizProps> = ({ compounds, onBack }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const isProcessingRef = useRef(false);

  // 化合物が空の場合はエラーメッセージを表示
  if (compounds.length === 0) {
    return (
      <div className="quiz-container">
        <div className="quiz-header">
          <h1>有機化学クイズ</h1>
        </div>
        <div style={{ textAlign: 'center', color: '#ffffff', padding: '40px' }}>
          <p>問題データが読み込めませんでした。</p>
          <p>ブラウザのコンソールを確認してください。</p>
          <button className="back-button" onClick={onBack} style={{ marginTop: '20px' }}>
            モード選択に戻る
          </button>
        </div>
      </div>
    );
  }

  const currentCompound = compounds[currentIndex];
  
  // currentCompoundが存在しない場合の処理
  if (!currentCompound) {
    return (
      <div className="quiz-container">
        <div className="quiz-header">
          <h1>有機化学クイズ</h1>
        </div>
        <div style={{ textAlign: 'center', color: '#ffffff', padding: '40px' }}>
          <p>問題データにエラーがあります。</p>
          <button className="back-button" onClick={onBack} style={{ marginTop: '20px' }}>
            モード選択に戻る
          </button>
        </div>
      </div>
    );
  }
  
  const options = useMemo(() => {
    const allNames = compounds.map(c => c.name);
    const wrongAnswers = allNames
      .filter(name => name !== currentCompound.name)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    return [currentCompound.name, ...wrongAnswers].sort(() => Math.random() - 0.5);
  }, [currentIndex, compounds, currentCompound.name]);

  const handleAnswer = (answer: string) => {
    if (showResult) return;
    
    setSelectedAnswer(answer);
    setShowResult(true);
    setTotalAnswered(prev => prev + 1);
    
    if (answer === currentCompound.name) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    
    if (currentIndex < compounds.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(0);
    }
    setSelectedAnswer(null);
    setShowResult(false);
    
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
  };

  useEffect(() => {
    setSelectedAnswer(null);
    setShowResult(false);
  }, [currentIndex]);

  // Enterキー、スペースキーで次に進む
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && showResult) {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showResult, currentIndex, compounds.length]);

  // 画面全体をクリック/タップで次に進む
  const handleContentClick = (e: React.MouseEvent) => {
    if (showResult && !isProcessingRef.current) {
      const target = e.target as HTMLElement;
      // ボタンやインタラクティブな要素以外をクリックした場合に進む
      if (!target.closest('button') && !target.closest('a')) {
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
          <div className="reaction-progress-inline">
            <div className="progress-text-wrapper">
              <span className="progress-text">問題 {currentIndex + 1} / {compounds.length}</span>
              {showResult && (
                <button className="next-button-mobile" onClick={handleNext}>
                  Next
                </button>
              )}
            </div>
            <div className="progress-bar-mini">
              <div className="progress-fill-mini" style={{ width: `${((currentIndex + 1) / compounds.length) * 100}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="quiz-content" onClick={handleContentClick} onTouchEnd={(e) => {
        if (showResult && !isProcessingRef.current) {
          const target = e.target as HTMLElement;
          if (!target.closest('button') && !target.closest('a')) {
            e.preventDefault();
            handleNext();
          }
        }
      }} style={{ cursor: showResult ? 'pointer' : 'default' }}>
        <div className="structure-container">
          <div className="question-header">
            <div className="reaction-question-line">
              <span className="question-text-inline">What is the name of this compound?</span>
              {showResult && (
                <div className="result-action-inline">
                  <span className={selectedAnswer === currentCompound.name ? "result-correct" : "result-incorrect"}>
                    {selectedAnswer === currentCompound.name ? "✓ Correct!" : "✗ Wrong"}
                  </span>
                </div>
              )}
            </div>
          </div>
          <StructureViewer structure={currentCompound.structure} compoundName={currentCompound.name} />
          <div className="options-container">
            {options.map((option) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = option === currentCompound.name;
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAnswer(option);
                  }}
                  disabled={showResult}
                >
                  {option}
                  {showCorrect && <span className="result-icon">✓</span>}
                  {showIncorrect && <span className="result-icon">✗</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

