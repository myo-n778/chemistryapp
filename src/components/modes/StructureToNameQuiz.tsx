import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Compound } from '../../types';
import { Category } from '../CategorySelector';
import { StructureViewer } from '../StructureViewer';
import { ScoreDisplay } from '../shared/ScoreDisplay';
import { QuizSummary } from '../shared/QuizSummary';
import { calculateScore, saveHighScore, getRangeKey } from '../../utils/scoreCalculator';
import '../Quiz.css';

interface StructureToNameQuizProps {
  compounds: Compound[];
  category: Category;
  onBack: () => void;
  isShuffleMode?: boolean;
  quizSettings?: { orderMode?: 'sequential' | 'shuffle'; questionCountMode?: 'all' | 'batch-10' | 'batch-20' | 'batch-40'; startIndex?: number; allQuestionCount?: number | null };
  totalCount?: number;
  onNextRange?: () => void;
}

export const StructureToNameQuiz: React.FC<StructureToNameQuizProps> = ({ compounds, category, onBack, isShuffleMode = false, quizSettings, totalCount: _totalCount = 0, onNextRange: _onNextRange }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [pointScore, setPointScore] = useState(0); // 得点表示モード用
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [lastQuestionId, setLastQuestionId] = useState<string | null>(null);
  const [consecutiveCount, setConsecutiveCount] = useState(0);
  const isProcessingRef = useRef(false);

  // 化合物が空の場合はエラーメッセージを表示
  if (compounds.length === 0) {
    return (
      <div className="quiz-container">
        <div className="quiz-header">
          <h1>Organic Chemistry Drill</h1>
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
          <h1>Organic Chemistry Drill</h1>
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
    
    const isCorrect = answer === currentCompound.name;
    const elapsedSeconds = (Date.now() - questionStartTime) / 1000;
    
    // 連続正解カウント（同じ問題IDが連続で正解した場合のみ）
    const currentQuestionId = currentCompound.id;
    let newConsecutiveCount = 0;
    if (isCorrect && lastQuestionId === currentQuestionId) {
      newConsecutiveCount = consecutiveCount + 1;
      setConsecutiveCount(newConsecutiveCount);
      setLastQuestionId(currentQuestionId); // 正解した場合のみ更新
    } else if (isCorrect) {
      newConsecutiveCount = 1;
      setConsecutiveCount(1);
      setLastQuestionId(currentQuestionId); // 正解した場合のみ更新
    } else {
      setConsecutiveCount(0);
      setLastQuestionId(null); // 間違えた場合はリセット
    }
    
    // スコア計算（得点表示モード）
    if (isCorrect) {
      const points = calculateScore(true, elapsedSeconds, newConsecutiveCount, isShuffleMode);
      setPointScore(prev => prev + points);
    }
    
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
    
    const getModeAndRangeKey = () => {
      const mode = `structure-to-name-${category}`;
      const rangeKey = quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-10' 
        ? getRangeKey('batch-10', quizSettings.startIndex)
        : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-20'
        ? getRangeKey('batch-20', quizSettings.startIndex)
        : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-40'
        ? getRangeKey('batch-40', quizSettings.startIndex)
        : getRangeKey(quizSettings?.questionCountMode || 'all', undefined, quizSettings?.allQuestionCount);
      return { mode, rangeKey };
    };

    // 範囲内の問題数に合わせて終了判定（範囲内の問題数が指定出題数より少ない場合はその問題数で終了）
    let expectedQuestions = 10;
    if (quizSettings?.questionCountMode === 'batch-20') {
      expectedQuestions = 20;
    } else if (quizSettings?.questionCountMode === 'batch-40') {
      expectedQuestions = 40;
    }
    const maxQuestions = Math.min(expectedQuestions, compounds.length);
    if (totalAnswered >= maxQuestions) {
      // 最高記録を保存（モード×範囲ごとに分離）
      const { mode, rangeKey } = getModeAndRangeKey();
      saveHighScore(pointScore, score, totalAnswered, mode, rangeKey);
      setIsFinished(true);
    } else if (currentIndex < compounds.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setQuestionStartTime(Date.now());
      // 次の問題が異なる場合は連続カウントをリセット（同じ問題IDでなければ）
      const nextCompound = compounds[currentIndex + 1];
      if (nextCompound && nextCompound.id !== lastQuestionId) {
        setConsecutiveCount(0);
      }
    } else {
      // 最高記録を保存（モード×範囲ごとに分離）
      const { mode, rangeKey } = getModeAndRangeKey();
      saveHighScore(pointScore, score, totalAnswered, mode, rangeKey);
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
    setPointScore(0);
    setIsFinished(false);
    setQuestionStartTime(Date.now());
    setLastQuestionId(null);
    setConsecutiveCount(0);
  };

  useEffect(() => {
    if (!isFinished) {
      setSelectedAnswer(null);
      setShowResult(false);
      setQuestionStartTime(Date.now());
    }
  }, [currentIndex, isFinished]);

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

  // ダブルタップ検出用
  const lastTapRef = useRef<number>(0);
  const tapTimeoutRef = useRef<number | null>(null);

  // 画面全体をクリック/タップで次に進む（PCはシングルクリック、スマホはダブルタップ）
  const handleContentClick = (e: React.MouseEvent) => {
    if (showResult && !isProcessingRef.current) {
      const target = e.target as HTMLElement;
      // ボタンやインタラクティブな要素以外をクリックした場合に進む
      if (!target.closest('button') && !target.closest('a')) {
        // PCの場合はシングルクリックで進む
        handleNext();
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (showResult && !isProcessingRef.current) {
      const target = e.target as HTMLElement;
      if (!target.closest('button') && !target.closest('a')) {
        e.preventDefault();
        const now = Date.now();
        const timeSinceLastTap = now - lastTapRef.current;
        
        // 300ms以内に2回タップされたらダブルタップとみなす
        if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
          if (tapTimeoutRef.current !== null) {
            window.clearTimeout(tapTimeoutRef.current);
            tapTimeoutRef.current = null;
          }
          lastTapRef.current = 0;
          handleNext();
        } else {
          // シングルタップの可能性があるので、タイムアウトを設定
          lastTapRef.current = now;
          if (tapTimeoutRef.current) {
            clearTimeout(tapTimeoutRef.current);
          }
          tapTimeoutRef.current = window.setTimeout(() => {
            lastTapRef.current = 0;
          }, 300) as unknown as number;
        }
      }
    }
  };

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h1>有機化学Drill</h1>
        <div className="quiz-header-right">
          <span className="score-text">{(() => {
            const mode = `structure-to-name-${category}`;
            const rangeKey = quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-10' 
              ? getRangeKey('batch-10', quizSettings.startIndex)
              : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-20'
              ? getRangeKey('batch-20', quizSettings.startIndex)
              : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-40'
              ? getRangeKey('batch-40', quizSettings.startIndex)
              : getRangeKey(quizSettings?.questionCountMode || 'all', undefined, quizSettings?.allQuestionCount);
            return <ScoreDisplay score={score} totalAnswered={totalAnswered} pointScore={pointScore} showPoints={true} mode={mode} rangeKey={rangeKey} />;
          })()}</span>
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

      <div className="quiz-content" onClick={handleContentClick} onTouchEnd={handleTouchEnd} style={{ cursor: showResult ? 'pointer' : 'default' }}>
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

      {isFinished && (() => {
        const mode = `structure-to-name-${category}`;
        const rangeKey = quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-10' 
          ? getRangeKey('batch-10', quizSettings.startIndex)
          : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-20'
          ? getRangeKey('batch-20', quizSettings.startIndex)
          : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-40'
          ? getRangeKey('batch-40', quizSettings.startIndex)
          : getRangeKey(quizSettings?.questionCountMode || 'all', undefined, quizSettings?.allQuestionCount);
        return (
          <QuizSummary
            score={score}
            total={totalAnswered}
            pointScore={pointScore}
            onRestart={handleReset}
            onBack={onBack}
            mode={mode}
            rangeKey={rangeKey}
          />
        );
      })()}
    </div>
  );
};

