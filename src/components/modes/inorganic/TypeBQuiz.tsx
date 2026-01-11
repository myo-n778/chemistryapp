import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Category } from '../../CategorySelector';
import { InorganicReactionNew } from '../../../types/inorganic';
import { ScoreDisplay } from '../../shared/ScoreDisplay';
import { QuizSummary } from '../../shared/QuizSummary';
import { calculateScore, saveHighScore, getRangeKey, getScoreHistory, ScoreHistoryEntry } from '../../../utils/scoreCalculator';
import { playFinishSound } from '../../../utils/soundManager';
import { generateDistractorsForTypeB, shuffleChoices } from '../../../utils/inorganicDistractorGeneratorNew';
import { InorganicExplanationPanel } from '../../InorganicExplanationPanel';
import { TeXRenderer } from '../../TeXRenderer';
import { ChoiceDisplay } from '../../ChoiceDisplay';
import { RenderMaybeTeX } from '../../RenderMaybeTeX';
import { playCorrect, playWrong } from '../../../utils/soundManager';
import '../../Quiz.css';

/**
 * 問題文表示コンポーネント（TeX表示切り替え機能付き）
 */
const QuestionDisplay: React.FC<{ text: string; tex?: string; label?: string }> = ({ text, tex }) => {
  const [showTeX, setShowTeX] = useState(false);

  if (!tex) {
    return <RenderMaybeTeX value={text} displayMode={true} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <button
          onClick={() => setShowTeX(!showTeX)}
          style={{
            padding: '4px 8px',
            fontSize: '0.8rem',
            backgroundColor: showTeX ? '#4a5568' : '#2d3748',
            color: '#e0e0e0',
            border: '1px solid #4a5568',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {showTeX ? '通常表示' : 'TeX表示'}
        </button>
      </div>
      {showTeX ? (
        <TeXRenderer equation={tex} displayMode={true} />
      ) : (
        <RenderMaybeTeX value={text} displayMode={true} />
      )}
    </div>
  );
};

interface TypeBQuizProps {
  reactions: InorganicReactionNew[];
  category: Category;
  onBack: () => void;
  isShuffleMode?: boolean;
  quizSettings?: { orderMode?: 'sequential' | 'shuffle'; questionCountMode?: 'all' | 'batch-10' | 'batch-20' | 'batch-40'; startIndex?: number; allQuestionCount?: number | null };
  totalCount?: number;
  onNextRange?: () => void;
}

/**
 * タイプB：反応式 → 条件
 * 出題：A列（反応式）
 * 解答：D列（条件）を4択から選ぶ
 */
export const TypeBQuiz: React.FC<TypeBQuizProps> = ({
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
    console.log('[TypeBQuiz] filteredReactions useMemo start', {
      reactionsLength: reactions.length,
      quizSettings,
      isShuffleMode
    });

    // 1) startIndexは1始まりなので、sliceで使う前に正規化
    // 2) batchSizeの決定を先に行う
    let batchSize: number | undefined;
    if (quizSettings?.questionCountMode === 'batch-10') {
      batchSize = 10;
    } else if (quizSettings?.questionCountMode === 'batch-20') {
      batchSize = 20;
    } else if (quizSettings?.questionCountMode === 'batch-40') {
      batchSize = 40;
    }

    // 3) shuffleはsliceの前に適用
    const base = (isShuffleMode || quizSettings?.orderMode === 'shuffle') 
      ? (() => {
          const shuffled = [...reactions];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        })()
      : [...reactions];

    let filtered: typeof reactions = [];

    if (quizSettings?.questionCountMode && quizSettings.questionCountMode !== 'all' && quizSettings.startIndex !== undefined && batchSize !== undefined) {
      // batch-10/20/40モード
      const start = quizSettings.startIndex - 1; // 1始まりを0始まりに変換
      const end = start + batchSize;
      
      console.log('[TypeBQuiz] batch mode', {
        questionCountMode: quizSettings.questionCountMode,
        startIndex: quizSettings.startIndex,
        start,
        end,
        batchSize,
        baseLength: base.length,
        totalCount: reactions.length
      });

      filtered = base.slice(start, end);
    } else if (quizSettings?.questionCountMode === 'all') {
      // ALLモード
      if (quizSettings.allQuestionCount !== undefined && quizSettings.allQuestionCount !== null) {
        filtered = base.slice(0, quizSettings.allQuestionCount);
      } else {
        filtered = base; // 全件
      }
      
      console.log('[TypeBQuiz] all mode', {
        allQuestionCount: quizSettings.allQuestionCount,
        baseLength: base.length,
        filteredLength: filtered.length
      });
    } else {
      // 設定がない場合は全件
      filtered = base;
    }

    // 4) selected.length === 0をエラーにする前に、値を確認
    console.log('[TypeBQuiz] filteredReactions result', {
      filteredLength: filtered.length,
      reactionsLength: reactions.length,
      quizSettings
    });

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

    const correctAnswer = currentReaction.conditions;
    const distractors = generateDistractorsForTypeB(currentReaction, reactions, 3);
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

  const handleNext = useCallback(() => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    const getModeAndRangeKey = () => {
      const mode = `inorganic-type-b-${category}`;
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
  }, [totalAnswered, maxQuestions, currentIndex, filteredReactions.length, lastQuestionId, pointScore, score, quizSettings, category]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showResult && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showResult, handleNext]);

  const handleAnswer = (selectedOption: number) => {
    if (isProcessingRef.current) return;
    if (showResult) return;
    isProcessingRef.current = true;
    setSelectedAnswer(selectedOption);
    setShowResult(true);
    const isCorrect = selectedOption === choices.correctIndex;
    
    // 効果音を再生
    if (isCorrect) {
      playCorrect();
    } else {
      playWrong();
    }
    
    const currentQuestionKey = currentReaction?.id;
    if (!currentQuestionKey) {
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 100);
      return;
    }
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

  // 結果画面が表示された時にfinish音声を再生
  useEffect(() => {
    if (isFinished && totalAnswered > 0) {
      console.log('[TypeBQuiz] isFinished changed to true, playing finish sound');
      const getModeAndRangeKey = () => {
        const mode = `inorganic-type-b-${category}`;
        const rangeKey = quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-10' 
          ? getRangeKey('batch-10', quizSettings.startIndex)
          : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-20'
          ? getRangeKey('batch-20', quizSettings.startIndex)
          : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-40'
          ? getRangeKey('batch-40', quizSettings.startIndex)
          : getRangeKey(quizSettings?.questionCountMode || 'all', undefined, quizSettings?.allQuestionCount);
        return { mode, rangeKey };
      };
      
      // 最高記録情報を取得（既に保存済み）
      const { mode, rangeKey } = getModeAndRangeKey();
      const history = mode && rangeKey ? getScoreHistory(mode, rangeKey) : getScoreHistory();
      const topScore = history.length > 0 ? history[0].score : 0;
      const isNewRecord = pointScore > topScore;
      const today = new Date().toISOString().split('T')[0];
      const top5 = history.slice(0, 5);
      const isRankIn = top5.some((entry: ScoreHistoryEntry) => {
        const entryDate = new Date(entry.date).toISOString().split('T')[0];
        return entry.score === pointScore && 
               entry.correctCount === score && 
               entry.totalCount === totalAnswered &&
               entryDate === today;
      });
      
      // finish音声を再生
      const percentage = Math.round((score / totalAnswered) * 100);
      console.log(`[TypeBQuiz] Result: score=${score}/${totalAnswered} (${percentage}%), isNewRecord=${isNewRecord}, isRankIn=${isRankIn}`);
      if (isNewRecord) {
        console.log('[TypeBQuiz] Playing finish sound: type 3 (最高記録更新)');
        playFinishSound(3); // 最高記録更新
      } else if (isRankIn) {
        console.log('[TypeBQuiz] Playing finish sound: type 2 (ランクイン)');
        playFinishSound(2); // ランクイン
      } else if (percentage === 100) {
        console.log('[TypeBQuiz] Playing finish sound: type 5 (満点)');
        playFinishSound(5); // 満点で記録更新でない
      } else if (percentage >= 60) {
        console.log('[TypeBQuiz] Playing finish sound: type 1 (60%以上)');
        playFinishSound(1); // 60%以上
      } else {
        console.log('[TypeBQuiz] Playing finish sound: type 4 (60%未満)');
        playFinishSound(4); // 60%未満
      }
    }
  }, [isFinished, totalAnswered, score, pointScore, category, quizSettings]);

  // すべてのhooksを先に実行した後、return分岐を最後にまとめる
  if (!currentReaction && !isFinished) {
    console.error('[TypeBQuiz] Error: currentReaction is null', {
      currentIndex,
      filteredReactionsLength: filteredReactions.length,
      reactionsLength: reactions.length,
      quizSettings,
      actualAvailableQuestions,
      expectedQuestions,
      maxQuestions
    });
    return null; // App.tsxで既にエラーチェック済みなので、ここではnullを返す
  }

  if (isFinished) {
    const mode = `inorganic-type-b-${category}`;
    const rangeKey = quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-10'
      ? getRangeKey('batch-10', quizSettings.startIndex)
      : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-20'
      ? getRangeKey('batch-20', quizSettings.startIndex)
      : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-40'
      ? getRangeKey('batch-40', quizSettings.startIndex)
      : getRangeKey(quizSettings?.questionCountMode || 'all', undefined, quizSettings?.allQuestionCount);

    return (
      <div className="quiz-container">
        <div className="quiz-header"><h1>Inorganic Chemistry Drill - Type B</h1></div>
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
        <h1>Inorganic Chemistry Drill - Type B</h1>
        <div className="quiz-header-right">
          <span className="score-text">
            <ScoreDisplay
              score={score}
              totalAnswered={totalAnswered}
              pointScore={pointScore}
              showPoints={true}
              mode={`inorganic-type-b-${category}`}
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
            {showResult && (
              <div className={`result-status ${isCorrect ? 'result-correct' : 'result-incorrect'}`}>
                {isCorrect ? (
                  <span className="correct-status">
                    <span className="message-icon">✓</span>
                    <span className="english-text">Correct!</span>
                  </span>
                ) : (
                  <span className="incorrect-status">
                    <span className="message-icon">✗</span>
                    <span className="english-text">Wrong</span>
                  </span>
                )}
              </div>
            )}
            <button className="back-button" onClick={onBack}>
              return
            </button>
            {showResult && (
              <button className="next-button-inline" onClick={handleNext}>
                Next
              </button>
            )}
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
          <h2 className="question-title">この反応の条件は？</h2>
          <div className="question-text">
            <QuestionDisplay
              text={currentReaction.equation}
              tex={currentReaction.equation_tex}
              label="反応式"
            />
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
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <ChoiceDisplay text={choice} />
                </div>
                {showCorrect && <span className="result-icon" style={{ marginLeft: '8px' }}>✓</span>}
                {showIncorrect && <span className="result-icon" style={{ marginLeft: '8px' }}>✗</span>}
              </button>
            );
          })}
        </div>

        {showResult && (
          <div className="result-panel">
            <div className="result-explanation">
              <p><strong>正解:</strong> <ChoiceDisplay text={currentReaction.conditions} /></p>
              <InorganicExplanationPanel
                reaction={currentReaction}
                correctAnswer={currentReaction.conditions}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

