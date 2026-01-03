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
  const [showExplanation, setShowExplanation] = useState(false);
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

    const timeSpent = Date.now() - questionStartTime;
    const newScore = calculateScore(isCorrect, timeSpent, newConsecutiveCount);
    const newTotalAnswered = totalAnswered + 1;

    setScore(score + newScore);
    setTotalAnswered(newTotalAnswered);

    // 正解時のみ解説を表示
    if (isCorrect) {
      setShowExplanation(true);
    }

    setTimeout(() => {
      isProcessingRef.current = false;
    }, 100);
  };

  const handleNext = () => {
    if (isProcessingRef.current) return;

    if (totalAnswered >= maxQuestions) {
      // クイズ終了
      const mode = `experiment-${category}`;
      const rangeKey = quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-10'
        ? getRangeKey('batch-10', quizSettings.startIndex)
        : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-20'
        ? getRangeKey('batch-20', quizSettings.startIndex)
        : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-40'
        ? getRangeKey('batch-40', quizSettings.startIndex)
        : getRangeKey(quizSettings?.questionCountMode || 'all', undefined, quizSettings?.allQuestionCount);
      saveHighScore(pointScore, score, totalAnswered, mode, rangeKey);
      setIsFinished(true);
    } else {
      // 次の問題へ
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setShowExplanation(false);
      setQuestionStartTime(Date.now());
    }
  };

  // quizSettings.startIndexが変更された時（Next押下時）に状態をリセット
  useEffect(() => {
    if (quizSettings?.startIndex !== undefined) {
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setShowResult(false);
      setShowExplanation(false);
      setScore(0);
      setTotalAnswered(0);
      setPointScore(0);
      setIsFinished(false);
      setQuestionStartTime(Date.now());
      setLastQuestionId(null);
      setConsecutiveCount(0);
    }
  }, [quizSettings?.startIndex]);

  // スコア計算（pointScore更新）
  useEffect(() => {
    if (totalAnswered > 0) {
      const newPointScore = Math.round((score / totalAnswered) * 100);
      setPointScore(newPointScore);
    }
  }, [score, totalAnswered]);

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
          setShowExplanation(false);
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

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h1>Organic Chemistry Drill</h1>
        <ScoreDisplay 
          score={pointScore} 
          totalAnswered={totalAnswered}
          mode={`experiment-${category}`} 
          rangeKey={quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-10'
          ? getRangeKey('batch-10', quizSettings.startIndex)
          : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-20'
          ? getRangeKey('batch-20', quizSettings.startIndex)
          : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-40'
          ? getRangeKey('batch-40', quizSettings.startIndex)
          : getRangeKey(quizSettings?.questionCountMode || 'all', undefined, quizSettings?.allQuestionCount)} />
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${(totalAnswered / maxQuestions) * 100}%` }}
          />
        </div>
      </div>

      <div className="quiz-content">
        <div className="question-section">
          <h2 className="question-text">{currentExperiment.question}</h2>
        </div>

        <div className="options-section">
          {options.map((option, index) => {
            const optionNumber = index + 1;
            const isSelected = selectedAnswer === optionNumber;
            const isCorrect = optionNumber === currentExperiment.correctAnswer;
            let buttonClass = 'option-button';

            if (showResult) {
              if (isCorrect) {
                buttonClass += ' correct';
              } else if (isSelected && !isCorrect) {
                buttonClass += ' wrong';
              }
            } else if (isSelected) {
              buttonClass += ' selected';
            }

            return (
              <button
                key={index}
                className={buttonClass}
                onClick={() => handleAnswer(optionNumber)}
                disabled={showResult}
              >
                {option}
              </button>
            );
          })}
        </div>

        {showResult && (
          <div className="result-section">
            {selectedAnswer === currentExperiment.correctAnswer ? (
              <div className="result-message correct-message">Correct!</div>
            ) : (
              <div className="result-message wrong-message">Wrong</div>
            )}
            {showExplanation && currentExperiment.explanation && (
              <div className="explanation-section">
                <div className="explanation-label">Explanation:</div>
                <div className="explanation-text">{currentExperiment.explanation}</div>
              </div>
            )}
            <button className="next-button" onClick={handleNext}>
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

