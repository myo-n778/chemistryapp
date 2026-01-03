import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Category } from '../CategorySelector';
import { ScoreDisplay } from '../shared/ScoreDisplay';
import { QuizSummary } from '../shared/QuizSummary';
import { calculateScore, saveHighScore, getRangeKey } from '../../utils/scoreCalculator';
import { ExperimentCSVRow } from '../../utils/experimentParser';
import '../Quiz.css';

interface ExperimentQuizProps {
  experiments: ExperimentCSVRow[];
  category: Category;
  onBack: () => void;
  isShuffleMode?: boolean;
  quizSettings?: { orderMode?: 'sequential' | 'shuffle'; questionCountMode?: 'all' | 'batch-10' | 'batch-20' | 'batch-40'; startIndex?: number; allQuestionCount?: number | null };
  totalCount?: number;
  onNextRange?: () => void;
}

export const ExperimentQuiz: React.FC<ExperimentQuizProps> = ({ experiments, category, onBack, isShuffleMode = false, quizSettings, totalCount: _totalCount = 0, onNextRange }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [pointScore, setPointScore] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [lastQuestionId, setLastQuestionId] = useState<string | null>(null);
  const [consecutiveCount, setConsecutiveCount] = useState(0);
  const isProcessingRef = useRef(false);

  // 範囲フィルタリングとシャッフル処理
  const filteredExperiments = useMemo(() => {
    let filtered = [...experiments];

    // 範囲フィルタリング
    if (quizSettings?.questionCountMode && quizSettings.questionCountMode !== 'all' && quizSettings.startIndex !== undefined) {
      const start = quizSettings.startIndex;
      let end: number;
      if (quizSettings.questionCountMode === 'batch-10') {
        end = start + 10;
      } else if (quizSettings.questionCountMode === 'batch-20') {
        end = start + 20;
      } else if (quizSettings.questionCountMode === 'batch-40') {
        end = start + 40;
      } else {
        end = experiments.length;
      }
      filtered = filtered.slice(start, end);
    } else if (quizSettings?.questionCountMode === 'all' && quizSettings.allQuestionCount !== undefined && quizSettings.allQuestionCount !== null) {
      filtered = filtered.slice(0, quizSettings.allQuestionCount);
    }

    // シャッフルモード
    if (isShuffleMode) {
      const shuffled = [...filtered];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }

    return filtered;
  }, [experiments, quizSettings, isShuffleMode]);

  // 実際に利用可能な問題数
  const actualAvailableQuestions = filteredExperiments.length;

  // 期待される問題数
  const expectedQuestions = useMemo(() => {
    if (quizSettings?.questionCountMode === 'all') {
      return quizSettings.allQuestionCount ?? actualAvailableQuestions;
    } else if (quizSettings?.questionCountMode === 'batch-10') {
      return Math.min(10, actualAvailableQuestions);
    } else if (quizSettings?.questionCountMode === 'batch-20') {
      return Math.min(20, actualAvailableQuestions);
    } else if (quizSettings?.questionCountMode === 'batch-40') {
      return Math.min(40, actualAvailableQuestions);
    }
    return actualAvailableQuestions;
  }, [quizSettings, actualAvailableQuestions]);

  const maxQuestions = Math.min(expectedQuestions, actualAvailableQuestions);

  const currentExperiment = filteredExperiments[currentIndex];

  if (!currentExperiment && !isFinished) {
    return (
      <div className="quiz-container">
        <div className="quiz-header">
          <h1>Organic Chemistry Drill</h1>
        </div>
        <div style={{ textAlign: 'center', color: '#ffffff', padding: '40px' }}>
          <p>問題データにエラーがあります。</p>
          <button className="back-button" onClick={onBack} style={{ marginTop: '20px' }}>
            Return
          </button>
        </div>
      </div>
    );
  }

  const handleAnswer = (selectedOption: number) => {
    if (isProcessingRef.current) return;
    if (showResult) return;

    isProcessingRef.current = true;
    setSelectedAnswer(selectedOption);
    setShowResult(true);

    const isCorrect = selectedOption === currentExperiment.correctAnswer;
    const currentQuestionKey = `${currentExperiment.question}-${currentIndex}`;
    const elapsedSeconds = (Date.now() - questionStartTime) / 1000;

    // 連続正解数の計算
    let newConsecutiveCount = 0;
    if (isCorrect && lastQuestionId === currentQuestionKey) {
      newConsecutiveCount = consecutiveCount + 1;
      setConsecutiveCount(newConsecutiveCount);
      setLastQuestionId(currentQuestionKey);
    } else if (isCorrect) {
      newConsecutiveCount = 1;
      setConsecutiveCount(1);
      setLastQuestionId(currentQuestionKey);
    } else {
      setConsecutiveCount(0);
      setLastQuestionId(null);
    }

    // スコア計算（得点表示モード）- 他のモードと同じ方法
    if (isCorrect) {
      const points = calculateScore(true, elapsedSeconds, newConsecutiveCount, isShuffleMode);
      setPointScore(prev => prev + points);
    }

    setSelectedAnswer(selectedOption);
    setShowResult(true);
    setTotalAnswered(prev => prev + 1);

    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    setTimeout(() => {
      isProcessingRef.current = false;
    }, 100);
  };

  const handleNext = () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    
    const getModeAndRangeKey = () => {
      const mode = `experiment-${category}`;
      const rangeKey = quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-10' 
        ? getRangeKey('batch-10', quizSettings.startIndex)
        : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-20'
        ? getRangeKey('batch-20', quizSettings.startIndex)
        : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-40'
        ? getRangeKey('batch-40', quizSettings.startIndex)
        : getRangeKey(quizSettings?.questionCountMode || 'all', undefined, quizSettings?.allQuestionCount);
      return { mode, rangeKey };
    };

    // 範囲内の問題数に合わせて終了判定
    if (totalAnswered >= maxQuestions) {
      // 最高記録を保存（モード×範囲ごとに分離）
      const { mode, rangeKey } = getModeAndRangeKey();
      saveHighScore(pointScore, score, totalAnswered, mode, rangeKey);
      setIsFinished(true);
    } else if (currentIndex < filteredExperiments.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setQuestionStartTime(Date.now());
      // 次の問題が異なる場合は連続カウントをリセット
      const nextExperiment = filteredExperiments[currentIndex + 1];
      if (nextExperiment && `${nextExperiment.question}-${currentIndex + 1}` !== lastQuestionId) {
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

  // quizSettings.startIndexが変更された時（Next押下時）に状態をリセット
  useEffect(() => {
    if (quizSettings?.startIndex !== undefined) {
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
    }
  }, [quizSettings?.startIndex]);

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
  }, [showResult, currentIndex, filteredExperiments.length]);

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

  // クイズ終了時の処理
  if (isFinished) {
    const mode = `experiment-${category}`;
    const rangeKey = quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-10'
      ? getRangeKey('batch-10', quizSettings.startIndex)
      : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-20'
      ? getRangeKey('batch-20', quizSettings.startIndex)
      : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-40'
      ? getRangeKey('batch-40', quizSettings.startIndex)
      : getRangeKey(quizSettings?.questionCountMode || 'all', undefined, quizSettings?.allQuestionCount);

    return (
      <QuizSummary
        score={Math.round((pointScore / 100) * totalAnswered)}
        total={totalAnswered}
        pointScore={pointScore}
        onRestart={() => {
          setCurrentIndex(0);
          setSelectedAnswer(null);
          setShowResult(false);
          setScore(0);
          setTotalAnswered(0);
          setIsFinished(false);
          setPointScore(0);
          setQuestionStartTime(Date.now());
          setLastQuestionId(null);
          setConsecutiveCount(0);
        }}
        onBack={onBack}
        mode={mode}
        rangeKey={rangeKey}
        onNext={onNextRange}
      />
    );
  }

  const options = [
    currentExperiment.option1,
    currentExperiment.option2,
    currentExperiment.option3,
    currentExperiment.option4,
  ];

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

  const mode = `experiment-${category}`;
  const rangeKey = quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-10'
    ? getRangeKey('batch-10', quizSettings.startIndex)
    : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-20'
    ? getRangeKey('batch-20', quizSettings.startIndex)
    : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-40'
    ? getRangeKey('batch-40', quizSettings.startIndex)
    : getRangeKey(quizSettings?.questionCountMode || 'all', undefined, quizSettings?.allQuestionCount);

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h1>有機化学Drill</h1>
        <div className="quiz-header-right">
          <span className="score-text">
            <ScoreDisplay 
              score={score} 
              totalAnswered={totalAnswered}
              pointScore={pointScore} 
              showPoints={true}
              mode={mode} 
              rangeKey={rangeKey} 
            />
          </span>
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
              <span className="progress-text">問題 {currentIndex + 1} / {filteredExperiments.length}</span>
              {showResult && (
                <button className="next-button-mobile" onClick={handleNext}>
                  Next
                </button>
              )}
            </div>
            <div className="progress-bar-mini">
              <div className="progress-fill-mini" style={{ width: `${((currentIndex + 1) / filteredExperiments.length) * 100}%` }}></div>
            </div>
          </div>
        </div>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${(totalAnswered / maxQuestions) * 100}%` }}
        />
      </div>

      <div className="quiz-content" onClick={handleContentClick} onTouchEnd={handleTouchEnd} style={{ cursor: showResult ? 'pointer' : 'default' }}>
        <div className="question-section">
          <div className="reaction-question-line">
            <span className="question-text-inline">{currentExperiment.question}</span>
            {showResult && (
              <div className="result-action-inline">
                <span className={selectedAnswer === currentExperiment.correctAnswer ? "result-correct" : "result-incorrect"}>
                  {selectedAnswer === currentExperiment.correctAnswer ? "✓ Correct!" : "✗ Wrong"}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="options-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(8px, 1.5vw, 12px)' }}>
          {options.map((option, index) => {
            const optionNumber = index + 1;
            const isSelected = selectedAnswer === optionNumber;
            const isCorrect = optionNumber === currentExperiment.correctAnswer;
            const showCorrect = showResult && isCorrect;
            const showIncorrect = showResult && isSelected && !isCorrect;

            return (
              <button
                key={index}
                className={`option-button ${
                  showCorrect ? 'correct' : ''
                } ${
                  showIncorrect ? 'incorrect' : ''
                } ${isSelected ? 'selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAnswer(optionNumber);
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

        {showResult && currentExperiment.explanation && (
          <div className="explanation-section">
            <div className="explanation-label">Explanation:</div>
            <div className="explanation-text">{currentExperiment.explanation}</div>
          </div>
        )}
      </div>
    </div>
  );
};

