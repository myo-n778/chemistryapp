import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Category } from '../../CategorySelector';
import { InorganicReaction } from '../../../types';
import { ScoreDisplay } from '../../shared/ScoreDisplay';
import { QuizSummary } from '../../shared/QuizSummary';
import { calculateScore, saveHighScore, getRangeKey } from '../../../utils/scoreCalculator';
import { generateDistractors, shuffleChoices } from '../../../utils/inorganicDistractorGenerator';
import { cleanProductDescription, extractLeftSideWithArrow } from '../../../utils/inorganicDisplayHelper';
import { TeXRenderer } from '../../TeXRenderer';
import '../../Quiz.css';

interface ModeAQuizProps {
  reactions: InorganicReaction[];
  category: Category;
  onBack: () => void;
  isShuffleMode?: boolean;
  quizSettings?: { orderMode?: 'sequential' | 'shuffle'; questionCountMode?: 'all' | 'batch-10' | 'batch-20' | 'batch-40'; startIndex?: number; allQuestionCount?: number | null };
  totalCount?: number;
  onNextRange?: () => void;
}

/**
 * モードA：反応 → 生成物
 * 使用列：reactants_desc, conditions(任意), products_desc
 */
export const ModeAQuiz: React.FC<ModeAQuizProps> = ({
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

  // 範囲フィルタリングとシャッフル処理
  const filteredReactions = useMemo(() => {
    let filtered = [...reactions];

    if (quizSettings?.questionCountMode && quizSettings.questionCountMode !== 'all' && quizSettings.startIndex !== undefined) {
      const start = quizSettings.startIndex - 1;
      let end: number;
      if (quizSettings.questionCountMode === 'batch-10') {
        end = start + 10;
      } else if (quizSettings.questionCountMode === 'batch-20') {
        end = start + 20;
      } else if (quizSettings.questionCountMode === 'batch-40') {
        end = start + 40;
      } else {
        end = reactions.length;
      }
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
  const currentReaction = filteredReactions[currentIndex];

  // 選択肢を生成
  const choices = useMemo(() => {
    if (!currentReaction) return { choices: [], correctIndex: 0 };
    
    // 新しいExcel形式（quiz-で始まるID）の場合は、products_descから選択肢を取得
    if (currentReaction.id.startsWith('quiz-')) {
      try {
        const choicesArray = JSON.parse(currentReaction.products_desc);
        if (Array.isArray(choicesArray) && choicesArray.length === 4) {
          const correctIndex = parseInt(currentReaction.conditions || currentReaction.answer_hint || '0', 10);
          if (correctIndex >= 0 && correctIndex < 4) {
            // 選択肢は既に正しい順序で格納されているので、そのまま使用
            return {
              choices: choicesArray,
              correctIndex: correctIndex
            };
          }
        }
      } catch (e) {
        console.error('Failed to parse quiz choices:', e);
      }
    }
    
    // 既存形式の場合は従来の処理
    const correctAnswer = cleanProductDescription(currentReaction.products_desc);
    const distractors = generateDistractors(currentReaction, reactions, 'products_desc', 3).map(d => 
      cleanProductDescription(d)
    );
    return shuffleChoices(correctAnswer, distractors);
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
      const mode = `inorganic-mode-a-${category}`;
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
        <div className="quiz-header"><h1>Inorganic Chemistry Drill - Mode A</h1></div>
        <div style={{ textAlign: 'center', color: '#ffffff', padding: '40px' }}>
          <p>問題データにエラーがあります。</p>
          <button className="back-button" onClick={onBack} style={{ marginTop: '20px' }}>戻る</button>
        </div>
      </div>
    );
  }

  if (isFinished) {
    const mode = `inorganic-mode-a-${category}`;
    const rangeKey = quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-10'
      ? getRangeKey('batch-10', quizSettings.startIndex)
      : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-20'
      ? getRangeKey('batch-20', quizSettings.startIndex)
      : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-40'
      ? getRangeKey('batch-40', quizSettings.startIndex)
      : getRangeKey(quizSettings?.questionCountMode || 'all', undefined, quizSettings?.allQuestionCount);

    return (
      <div className="quiz-container">
        <div className="quiz-header"><h1>Inorganic Chemistry Drill - Mode A</h1></div>
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
        <h1>Inorganic Chemistry Drill - Mode A</h1>
        <div className="quiz-header-right">
          <span className="score-text">
            <ScoreDisplay
              score={score}
              totalAnswered={totalAnswered}
              pointScore={pointScore}
              showPoints={true}
              mode={`inorganic-mode-a-${category}`}
              rangeKey={quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-10'
                ? getRangeKey('batch-10', quizSettings.startIndex)
                : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-20'
                ? getRangeKey('batch-20', quizSettings.startIndex)
                : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-40'
                ? getRangeKey('batch-40', quizSettings.startIndex)
                : getRangeKey(quizSettings?.questionCountMode || 'all', undefined, quizSettings?.allQuestionCount)}
            />
          </span>
          <div className="quiz-header-buttons">
            <button className="back-button" onClick={onBack}>
              return
            </button>
          </div>
        </div>
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
          <h2 className="question-title">この反応で生成される物質は？</h2>
          <div className="question-text">
            {/* 問題文には左辺（反応物）のみ＋→を表示 */}
            {currentReaction.id.startsWith('quiz-') ? (
              currentReaction.equation_tex_mhchem || currentReaction.reactants_desc ? (
                <div style={{ marginBottom: '10px' }}>
                  <TeXRenderer
                    equation={extractLeftSideWithArrow(currentReaction.equation_tex_mhchem || currentReaction.reactants_desc)}
                    displayMode={true}
                  />
                </div>
              ) : null
            ) : (
              <>
                {currentReaction.equation_tex_mhchem ? (
                  <div style={{ marginBottom: '10px' }}>
                    <TeXRenderer
                      equation={extractLeftSideWithArrow(currentReaction.equation_tex_mhchem)}
                      displayMode={true}
                    />
                  </div>
                ) : currentReaction.equation_tex ? (
                  <div style={{ marginBottom: '10px' }}>
                    <TeXRenderer
                      equation={extractLeftSideWithArrow(currentReaction.equation_tex)}
                      displayMode={true}
                    />
                  </div>
                ) : (
                  <p><strong>反応物:</strong> {currentReaction.reactants_desc}</p>
                )}
                {currentReaction.conditions && !currentReaction.conditions.match(/^\d+$/) && (
                  <p><strong>条件:</strong> {currentReaction.conditions}</p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="options-container reaction-options-grid">
          {choices.choices.map((choice, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectChoice = index === choices.correctIndex;
            const showCorrect = showResult && isCorrectChoice;
            const showIncorrect = showResult && isSelected && !isCorrectChoice;

            return (
              <button
                key={index}
                className={`option-button ${showCorrect ? 'correct' : ''} ${showIncorrect ? 'incorrect' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => handleAnswer(index)}
                disabled={showResult}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span style={{ flex: 1, textAlign: 'left' }}>
                  {/* 選択肢もTeX形式で表示（新しいExcel形式の場合は必ずTeX、既存形式の場合はTeX形式の文字列の場合のみ） */}
                  {(() => {
                    // 新しいExcel形式の場合は必ずTeXで表示
                    if (currentReaction.id.startsWith('quiz-')) {
                      return <TeXRenderer equation={choice} displayMode={false} />;
                    }
                    
                    // 既存形式の場合、TeX形式の文字列が含まれている場合のみTeXで表示
                    // \ce, \rightarrow, _{, ^{等を含む場合はTeX形式と判定
                    const isTeXFormat = choice.includes('\\') || choice.includes('_{') || choice.includes('^{') || 
                                        choice.includes('→') || choice.includes('\\ce');
                    
                    if (isTeXFormat) {
                      return <TeXRenderer equation={choice} displayMode={false} />;
                    }
                    return choice;
                  })()}
                </span>
                {showCorrect && <span className="result-icon" style={{ marginLeft: '8px' }}>✓</span>}
                {showIncorrect && <span className="result-icon" style={{ marginLeft: '8px' }}>✗</span>}
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
              {/* 新しいExcel形式の場合は、正解選択肢をTeXで表示 */}
              {currentReaction.id.startsWith('quiz-') ? (
                <>
                  <p><strong>正解:</strong></p>
                  <div style={{ marginBottom: '10px' }}>
                    <TeXRenderer
                      equation={choices.choices[choices.correctIndex]}
                      displayMode={true}
                    />
                  </div>
                  {currentReaction.notes && (
                    <div style={{ marginTop: '10px' }}>
                      <p><strong>解説:</strong></p>
                      <TeXRenderer
                        equation={currentReaction.notes}
                        displayMode={true}
                      />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p><strong>正解:</strong> {cleanProductDescription(currentReaction.products_desc)}</p>
                  {currentReaction.equation_tex_mhchem ? (
                    <div style={{ marginTop: '10px', marginBottom: '10px' }}>
                      <p><strong>反応式:</strong></p>
                      <TeXRenderer
                        equation={currentReaction.equation_tex_mhchem}
                        displayMode={true}
                      />
                    </div>
                  ) : currentReaction.equation_tex ? (
                    <div style={{ marginTop: '10px', marginBottom: '10px' }}>
                      <p><strong>反応式:</strong></p>
                      <TeXRenderer
                        equation={currentReaction.equation_tex}
                        displayMode={true}
                      />
                    </div>
                  ) : null}
                  {currentReaction.observations && (
                    <p><strong>観察:</strong> {currentReaction.observations}</p>
                  )}
                  {currentReaction.notes && (
                    <p><strong>補足:</strong> {currentReaction.notes}</p>
                  )}
                </>
              )}
            </div>
            <button className="next-button-inline" onClick={handleNext}>
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

