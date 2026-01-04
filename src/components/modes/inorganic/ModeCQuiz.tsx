import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Category } from '../../CategorySelector';
import { InorganicReaction } from '../../../types';
import { ScoreDisplay } from '../../shared/ScoreDisplay';
import { QuizSummary } from '../../shared/QuizSummary';
import { calculateScore, saveHighScore, getRangeKey } from '../../../utils/scoreCalculator';
import { generateDistractors, shuffleChoices } from '../../../utils/inorganicDistractorGenerator';
import '../Quiz.css';

interface ModeCQuizProps {
  reactions: InorganicReaction[];
  category: Category;
  onBack: () => void;
  isShuffleMode?: boolean;
  quizSettings?: { orderMode?: 'sequential' | 'shuffle'; questionCountMode?: 'all' | 'batch-10' | 'batch-20' | 'batch-40'; startIndex?: number; allQuestionCount?: number | null };
  totalCount?: number;
  onNextRange?: () => void;
}

/**
 * モードC：条件 → 結果（分岐）
 * 使用列：family, conditions, products_desc
 * 誤答：同familyの別variant
 */
export const ModeCQuiz: React.FC<ModeCQuizProps> = ({
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
    let filtered = reactions.filter(r => r.family && r.family.trim() !== '');
    if (quizSettings?.questionCountMode && quizSettings.questionCountMode !== 'all' && quizSettings.startIndex !== undefined) {
      const start = quizSettings.startIndex - 1;
      let end: number;
      if (quizSettings.questionCountMode === 'batch-10') end = start + 10;
      else if (quizSettings.questionCountMode === 'batch-20') end = start + 20;
      else if (quizSettings.questionCountMode === 'batch-40') end = start + 40;
      else end = filtered.length;
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

  // 同familyの別variantを誤答として使用
  const choices = useMemo(() => {
    if (!currentReaction) return { choices: [], correctIndex: 0 };
    const sameFamily = reactions.filter(r => r.family === currentReaction.family && r.id !== currentReaction.id);
    const distractors = sameFamily
      .filter(r => r.variant && r.variant !== currentReaction.variant)
      .map(r => r.products_desc)
      .filter((desc, index, self) => desc && self.indexOf(desc) === index)
      .slice(0, 3);
    
    // 不足する場合は通常の誤答生成を使用
    while (distractors.length < 3) {
      const additional = generateDistractors(currentReaction, reactions, 'products_desc', 1);
      additional.forEach(d => {
        if (!distractors.includes(d) && d !== currentReaction.products_desc) {
          distractors.push(d);
        }
      });
      if (distractors.length >= 3) break;
    }
    
    return shuffleChoices(currentReaction.products_desc, distractors.slice(0, 3));
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
      const mode = `inorganic-mode-c-${category}`;
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
        <div className="quiz-header"><h1>Inorganic Chemistry Drill - Mode C</h1></div>
        <div style={{ textAlign: 'center', color: '#ffffff', padding: '40px' }}>
          <p>問題データにエラーがあります。</p>
          <button className="back-button" onClick={onBack} style={{ marginTop: '20px' }}>戻る</button>
        </div>
      </div>
    );
  }

  if (isFinished) {
    const mode = `inorganic-mode-c-${category}`;
    const rangeKey = quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-10'
      ? getRangeKey('batch-10', quizSettings.startIndex)
      : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-20'
      ? getRangeKey('batch-20', quizSettings.startIndex)
      : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-40'
      ? getRangeKey('batch-40', quizSettings.startIndex)
      : getRangeKey(quizSettings?.questionCountMode || 'all', undefined, quizSettings?.allQuestionCount);

    return (
      <div className="quiz-container">
        <div className="quiz-header"><h1>Inorganic Chemistry Drill - Mode C</h1></div>
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
        <h1>Inorganic Chemistry Drill - Mode C</h1>
        <ScoreDisplay
          score={score}
          totalAnswered={totalAnswered}
          pointScore={pointScore}
          showPoints={true}
          mode={`inorganic-mode-c-${category}`}
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
          <h2 className="question-title">この条件で生成される物質は？</h2>
          <div className="question-text">
            <p><strong>反応ファミリー:</strong> {currentReaction.family}</p>
            <p><strong>条件:</strong> {currentReaction.conditions}</p>
          </div>
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
              <p><strong>正解:</strong> {currentReaction.products_desc}</p>
              {currentReaction.variant && (
                <p><strong>バリアント:</strong> {currentReaction.variant}</p>
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

