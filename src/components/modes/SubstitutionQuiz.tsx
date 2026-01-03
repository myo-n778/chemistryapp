import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Compound } from '../../types';
import { Category } from '../CategorySelector';
import { StructureViewer } from '../StructureViewer';
import { ScoreDisplay } from '../shared/ScoreDisplay';
import { ResultMessage } from '../shared/ResultMessage';
import { QuizSummary } from '../shared/QuizSummary';
import { calculateScore, saveHighScore, getRangeKey } from '../../utils/scoreCalculator';
import { loadReactions } from '../../data/dataLoader';
import { ReactionCSVRow } from '../../utils/reactionParser';
import '../Quiz.css';

interface SubstitutionQuizProps {
  compounds: Compound[];
  category: Category;
  onBack: () => void;
  isShuffleMode?: boolean;
  quizSettings?: { orderMode?: 'sequential' | 'shuffle'; questionCountMode?: 'all' | 'batch-10' | 'batch-20' | 'batch-40'; startIndex?: number; allQuestionCount?: number | null };
  totalCount?: number;
  onNextRange?: () => void;
}

export const SubstitutionQuiz: React.FC<SubstitutionQuizProps> = ({ compounds, category, onBack, isShuffleMode = false, quizSettings, totalCount: _totalCount = 0, onNextRange: _onNextRange }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [reactions, setReactions] = useState<ReactionCSVRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [pointScore, setPointScore] = useState(0); // 得点表示モード用
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [lastQuestionKey, setLastQuestionKey] = useState<string | null>(null);
  const [consecutiveCount, setConsecutiveCount] = useState(0);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    console.log(`Loading reactions for category: ${category}`);
    loadReactions(category).then(data => {
      console.log(`Loaded ${data.length} reactions:`, data);
      // シャッフルモードの場合は順序をランダムに
      const shuffledData = isShuffleMode ? [...data].sort(() => Math.random() - 0.5) : data;
      setReactions(shuffledData);
      setLoading(false);
      setQuestionStartTime(Date.now());
    }).catch(err => {
      console.error("Failed to load reactions:", err);
      setLoading(false);
    });
  }, [category, isShuffleMode]);

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

  // 名前の比較をトリミング考慮で行う（全角スペースなどにも対応）
  const cleanString = (s: string | undefined) => s ? s.replace(/[\s\u3000]+/g, '').trim() : '';
  const fromCompound = compounds.find(c => c?.name && cleanString(c.name) === cleanString(currentReaction?.from));
  const toCompound = compounds.find(c => c?.name && cleanString(c.name) === cleanString(currentReaction?.to));
  
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
    const elapsedSeconds = (Date.now() - questionStartTime) / 1000;
    
    // 連続正解カウント（同じ問題が連続で正解した場合のみ）
    const currentQuestionKey = currentReaction ? `${currentReaction.from}-${currentReaction.to}` : '';
    let newConsecutiveCount = 0;
    if (isCorrect && lastQuestionKey === currentQuestionKey) {
      newConsecutiveCount = consecutiveCount + 1;
      setConsecutiveCount(newConsecutiveCount);
      setLastQuestionKey(currentQuestionKey); // 正解した場合のみ更新
    } else if (isCorrect) {
      newConsecutiveCount = 1;
      setConsecutiveCount(1);
      setLastQuestionKey(currentQuestionKey); // 正解した場合のみ更新
    } else {
      setConsecutiveCount(0);
      setLastQuestionKey(null); // 間違えた場合はリセット
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
      const mode = `substitution-${category}`;
      const rangeKey = quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-10' 
        ? getRangeKey('batch-10', quizSettings.startIndex)
        : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-20'
        ? getRangeKey('batch-20', quizSettings.startIndex)
        : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-40'
        ? getRangeKey('batch-40', quizSettings.startIndex)
        : getRangeKey(quizSettings?.questionCountMode || 'all', undefined, quizSettings?.allQuestionCount);
      return { mode, rangeKey };
    };

    if (totalAnswered >= 10) {
      // 最高記録を保存（モード×範囲ごとに分離）
      const { mode, rangeKey } = getModeAndRangeKey();
      saveHighScore(pointScore, score, totalAnswered, mode, rangeKey);
      setIsFinished(true);
    } else if (currentIndex < reactions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setQuestionStartTime(Date.now());
      // 次の問題が異なる場合は連続カウントをリセット
      const nextReaction = reactions[currentIndex + 1];
      const nextQuestionKey = nextReaction ? `${nextReaction.from}-${nextReaction.to}` : '';
      if (nextQuestionKey !== lastQuestionKey) {
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
    setLastQuestionKey(null);
    setConsecutiveCount(0);
    // シャッフルモードの場合は再シャッフル
    if (isShuffleMode && reactions.length > 0) {
      const shuffledData = [...reactions].sort(() => Math.random() - 0.5);
      setReactions(shuffledData);
    }
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
        <h1>Organic Chemistry Drill</h1>
        <div className="quiz-header-right">
          <span className="score-text">{(() => {
            const mode = `substitution-${category}`;
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
              <span className="progress-text">問題 {currentIndex + 1} / {reactions.length}</span>
              {showResult && (
                <button className="next-button-mobile" onClick={handleNext}>
                  Next
                </button>
              )}
            </div>
            <div className="progress-bar-mini">
              <div className="progress-fill-mini" style={{ width: `${((currentIndex + 1) / reactions.length) * 100}%` }}></div>
            </div>
          </div>
        </div>
      </div>

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

      {isFinished && (() => {
        const mode = `substitution-${category}`;
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

