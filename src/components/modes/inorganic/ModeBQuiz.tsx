import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Category } from '../../CategorySelector';
import { InorganicReaction } from '../../../types';
import { ScoreDisplay } from '../../shared/ScoreDisplay';
import { QuizSummary } from '../../shared/QuizSummary';
import { calculateScore, saveHighScore, getRangeKey } from '../../../utils/scoreCalculator';
import { generateDistractors, shuffleChoices } from '../../../utils/inorganicDistractorGenerator';
import { InorganicVisualViewer } from '../../InorganicVisualViewer';
import '../Quiz.css';

interface ModeBQuizProps {
  reactions: InorganicReaction[];
  category: Category;
  onBack: () => void;
  isShuffleMode?: boolean;
  quizSettings?: { orderMode?: 'sequential' | 'shuffle'; questionCountMode?: 'all' | 'batch-10' | 'batch-20' | 'batch-40'; startIndex?: number; allQuestionCount?: number | null };
  totalCount?: number;
  onNextRange?: () => void;
}

/**
 * モードB：反応 → 観察
 * 使用列：reactants_desc or equation_tex, observations
 * 図：tags_norm
 */
export const ModeBQuiz: React.FC<ModeBQuizProps> = ({
  reactions,
  category,
  onBack,
  isShuffleMode = false,
  quizSettings,
  totalCount: _totalCount = 0,
  onNextRange,
}) => {
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

  const filteredReactions = useMemo(() => {
    let filtered = [...reactions];
    if (quizSettings?.questionCountMode && quizSettings.questionCountMode !== 'all' && quizSettings.startIndex !== undefined) {
      const start = quizSettings.startIndex - 1;
      let end: number;
      if (quizSettings.questionCountMode === 'batch-10') end = start + 10;
      else if (quizSettings.questionCountMode === 'batch-20') end = start + 20;
      else if (quizSettings.questionCountMode === 'batch-40') end = start + 40;
      else end = reactions.length;
      filtered = filtered.slice(start, end);
    } else if (quizSettings?.questionCountMode === 'all' && quizSettings.allQuestionCount !== undefined && quizSettings.allQuestionCount !== null) {
      filtered = filtered.slice(0, quizSettings.allQuestionCount);
    }
    if (isShuffleMode) {
      const shuffled = [...filtered];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
    return filtered;
  }, [reactions, quizSettings, isShuffleMode]);

  const actualAvailableQuestions = filteredReactions.length;
  const expectedQuestions = useMemo(() => {
    if (quizSettings?.questionCountMode === 'all') return quizSettings.allQuestionCount ?? actualAvailableQuestions;
    else if (quizSettings?.questionCountMode === 'batch-10') return Math.min(10, actualAvailableQuestions);
    else if (quizSettings?.questionCountMode === 'batch-20') return Math.min(20, actualAvailableQuestions);
    else if (quizSettings?.questionCountMode === 'batch-40') return Math.min(40, actualAvailableQuestions);
    return actualAvailableQuestions;
  }, [quizSettings, actualAvailableQuestions]);

  const maxQuestions = Math.min(expectedQuestions, actualAvailableQuestions);
  const currentReaction = filteredReactions[currentIndex];

  const choices = useMemo(() => {
    if (!currentReaction) return { choices: [], correctIndex: 0 };
    const distractors = generateDistractors(currentReaction, reactions, 'observations', 3);
    return shuffleChoices(currentReaction.observations, distractors);
  }, [currentReaction, reactions]);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showResult && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showResult, currentIndex, filteredReactions.length]);

  const handleAnswer = (selectedOption: number) => {
    if (isProcessingRef.current) return;
    if (showResult) return;
    isProcessingRef.current = true;
    setSelectedAnswer(selectedOption);
    setShowResult(true);
    const isCorrect = selectedOption === choices.correctIndex;
    const currentQuestionKey = currentReaction.id;
    const elapsedSeconds = (Date.now() - questionStartTime) / 1000;
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
    if (isCorrect) {
      const points = calculateScore(true, elapsedSeconds, newConsecutiveCount, isShuffleMode);
      setPointScore(prev => prev + points);
      setScore(prev => prev + 1);
    }
    setTotalAnswered(prev => prev + 1);
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 100);
  };

  const handleNext = () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    const getModeAndRangeKey = () => {
      const mode = `inorganic-mode-b-${category}`;
      const rangeKey = quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-10'
        ? getRangeKey('batch-10', quizSettings.startIndex)
        : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-20'
        ? getRangeKey('batch-20', quizSettings.startIndex)
        : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-40'
        ? getRangeKey('batch-40', quizSettings.startIndex)
        : getRangeKey(quizSettings?.questionCountMode || 'all', undefined, quizSettings?.allQuestionCount);
      return { mode, rangeKey };
    };
    if (totalAnswered >= maxQuestions) {
      const { mode, rangeKey } = getModeAndRangeKey();
      saveHighScore(pointScore, score, totalAnswered, mode, rangeKey);
      setIsFinished(true);
    } else if (currentIndex < filteredReactions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setQuestionStartTime(Date.now());
      const nextReaction = filteredReactions[currentIndex + 1];
      if (nextReaction && nextReaction.id !== lastQuestionId) {
        setConsecutiveCount(0);
      }
    } else {
      const { mode, rangeKey } = getModeAndRangeKey();
      saveHighScore(pointScore, score, totalAnswered, mode, rangeKey);
      setIsFinished(true);
    }
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 300);
  };

  if (!currentReaction && !isFinished) {
    return (
      <div className="quiz-container">
        <div className="quiz-header"><h1>Inorganic Chemistry Drill - Mode B</h1></div>
        <div style={{ textAlign: 'center', color: '#ffffff', padding: '40px' }}>
          <p>問題データにエラーがあります。</p>
          <button className="back-button" onClick={onBack} style={{ marginTop: '20px' }}>戻る</button>
        </div>
      </div>
    );
  }

  if (isFinished) {
    const mode = `inorganic-mode-b-${category}`;
    const rangeKey = quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-10'
      ? getRangeKey('batch-10', quizSettings.startIndex)
      : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-20'
      ? getRangeKey('batch-20', quizSettings.startIndex)
      : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-40'
      ? getRangeKey('batch-40', quizSettings.startIndex)
      : getRangeKey(quizSettings?.questionCountMode || 'all', undefined, quizSettings?.allQuestionCount);

    return (
      <div className="quiz-container">
        <div className="quiz-header"><h1>Inorganic Chemistry Drill - Mode B</h1></div>
        <QuizSummary
          score={score}
          total={totalAnswered}
          pointScore={pointScore}
          onRestart={() => {
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
          }}
          onBack={onBack}
          onNext={onNextRange}
          mode={mode}
          rangeKey={rangeKey}
        />
      </div>
    );
  }

  const isCorrect = selectedAnswer !== null && selectedAnswer === choices.correctIndex;
  const progress = ((currentIndex + 1) / maxQuestions) * 100;

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h1>Inorganic Chemistry Drill - Mode B</h1>
        <ScoreDisplay
          score={score}
          totalAnswered={totalAnswered}
          pointScore={pointScore}
          showPoints={true}
          mode={`inorganic-mode-b-${category}`}
          rangeKey={quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-10'
            ? getRangeKey('batch-10', quizSettings.startIndex)
            : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-20'
            ? getRangeKey('batch-20', quizSettings.startIndex)
            : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-40'
            ? getRangeKey('batch-40', quizSettings.startIndex)
            : getRangeKey(quizSettings?.questionCountMode || 'all', undefined, quizSettings?.allQuestionCount)}
        />
      </div>

      <div className="quiz-progress">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="progress-text">
          問題 {currentIndex + 1} / {maxQuestions}
        </div>
      </div>

      <div className="quiz-content">
        <div className="question-area">
          <h2 className="question-title">この反応で観察される現象は？</h2>
          <div className="question-text">
            <p><strong>反応物:</strong> {currentReaction.reactants_desc || currentReaction.equation_tex}</p>
          </div>
          {currentReaction.tags_norm && currentReaction.tags_norm.length > 0 && (
            <div className="visual-area">
              <InorganicVisualViewer reaction={currentReaction} width={400} height={300} />
            </div>
          )}
        </div>

        <div className="choices-area">
          {choices.choices.map((choice, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectChoice = index === choices.correctIndex;
            let buttonClass = 'choice-button';
            if (showResult) {
              if (isCorrectChoice) buttonClass += ' correct';
              else if (isSelected && !isCorrectChoice) buttonClass += ' incorrect';
            } else if (isSelected) buttonClass += ' selected';
            return (
              <button
                key={index}
                className={buttonClass}
                onClick={() => handleAnswer(index)}
                disabled={showResult}
              >
                {choice}
              </button>
            );
          })}
        </div>

        {showResult && (
          <div className="result-panel">
            <div className={`result-message ${isCorrect ? 'correct' : 'incorrect'}`}>
              {isCorrect ? '正解！' : '不正解'}
            </div>
            <div className="result-explanation">
              <p><strong>正解:</strong> {currentReaction.observations}</p>
              {currentReaction.products_desc && (
                <p><strong>生成物:</strong> {currentReaction.products_desc}</p>
              )}
              {currentReaction.notes && (
                <p><strong>補足:</strong> {currentReaction.notes}</p>
              )}
            </div>
            <button className="next-button" onClick={handleNext}>
              次へ
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

