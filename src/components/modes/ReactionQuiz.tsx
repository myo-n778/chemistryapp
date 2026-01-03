import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Compound } from '../../types';
import { Category } from '../CategorySelector';
import { StructureViewer } from '../StructureViewer';
import { ScoreDisplay } from '../shared/ScoreDisplay';
import { QuizSummary } from '../shared/QuizSummary';
import { calculateScore, saveHighScore, getRangeKey } from '../../utils/scoreCalculator';
import { loadReactions } from '../../data/dataLoader';
import { ReactionCSVRow } from '../../utils/reactionParser';
import '../Quiz.css';

interface ReactionQuizProps {
  compounds: Compound[];
  category: Category;
  onBack: () => void;
  isShuffleMode?: boolean;
  quizSettings?: { orderMode?: 'sequential' | 'shuffle'; questionCountMode?: 'all' | 'batch-10' | 'batch-20' | 'batch-40'; startIndex?: number; allQuestionCount?: number | null };
  totalCount?: number;
  onNextRange?: () => void;
}

export const ReactionQuiz: React.FC<ReactionQuizProps> = ({ compounds, category, onBack, isShuffleMode = false, quizSettings, totalCount: _totalCount = 0, onNextRange: _onNextRange }) => {
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
  const [lastQuestionKey, setLastQuestionKey] = useState<string | null>(null); // 問題IDの代わりにreactionのキーを使用
  const [consecutiveCount, setConsecutiveCount] = useState(0);
  const isProcessingRef = useRef(false);
  const lastTapRef = useRef<number>(0);
  const tapTimeoutRef = useRef<number | null>(null);

  // モード④は常にtoを答えるため、パターンは不要

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

  // キーボード操作のサポート
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showResult && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showResult, currentIndex, reactions.length]);

  const currentReaction = reactions[currentIndex];

  // 選択肢の生成（常にtoを答える）
  const options = useMemo(() => {
    if (loading || reactions.length === 0 || !currentReaction || isFinished) return [];

    // 物質toを答える
    const correctName = currentReaction.to;
    const allNames = Array.from(new Set(compounds.map(c => c.name)));
    const wrongNames = allNames
      .filter(name => name !== correctName)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    return [correctName, ...wrongNames].sort(() => Math.random() - 0.5);
  }, [currentIndex, reactions, compounds, isFinished, loading, currentReaction]);

  // 名前の比較をトリミング考慮で行う（全角スペースなどにも対応）
  const cleanString = (s: string | undefined) => s ? s.replace(/[\s\u3000]+/g, '').trim() : '';
  const fromCompound = compounds.find(c => c?.name && cleanString(c.name) === cleanString(currentReaction?.from));
  const toCompound = compounds.find(c => c?.name && cleanString(c.name) === cleanString(currentReaction?.to));

  // デバッグ: なぜtoCompoundが見つからないのか調査
  if (currentReaction && !toCompound) {
    console.log('=== DEBUG: toCompound NOT FOUND ===');
    console.log('Looking for (raw):', currentReaction.to);
    console.log('Looking for (cleaned):', cleanString(currentReaction.to));

    // 文字コードを比較
    const targetChars = [...cleanString(currentReaction.to)].map(c => c.charCodeAt(0));
    console.log('Target char codes:', targetChars);

    // 同じ名前っぽいものを探す（「クロロメタン」を含むもの）
    const similarCompounds = compounds.filter(c => c.name.includes('クロロ') || c.name.includes('メタン'));
    console.log('Similar compounds:', similarCompounds.map(c => ({
      name: c.name,
      cleaned: cleanString(c.name),
      charCodes: [...cleanString(c.name)].map(ch => ch.charCodeAt(0))
    })));
  }
  const correctValue = currentReaction?.to;

  const handleAnswer = (answer: string) => {
    if (showResult) return;

    const isCorrect = answer === correctValue;
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
      const mode = `reaction-${category}`;
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
  };

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

  // 表示ロジックの分岐（Hooksの後）
  if (loading) {
    return (
      <div className="quiz-container">
        <div className="quiz-header"><h1>Organic Chemistry Drill</h1></div>
        <div style={{ textAlign: 'center', color: '#ffffff', padding: '40px' }}>
          <p>データを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (reactions.length === 0) {
    return (
      <div className="quiz-container">
        <div className="quiz-header"><h1>Organic Chemistry Drill</h1></div>
        <div style={{ textAlign: 'center', color: '#ffffff', padding: '40px' }}>
          <p>反応データが見つかりませんでした。</p>
          <p>スプレッドシートの「reactions」シートにデータがあるか確認してください。</p>
          <button className="back-button" onClick={onBack} style={{ marginTop: '20px' }}>戻る</button>
        </div>
      </div>
    );
  }

  if (isFinished) {
    const mode = `reaction-${category}`;
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
  }

  return (
    <div className="quiz-container" style={{ cursor: showResult ? 'pointer' : 'default' }} onClick={handleContentClick} onTouchEnd={handleTouchEnd}>
      <div className="quiz-header">
        <h1>Organic Chemistry Drill</h1>
        <div className="quiz-header-right">
          <span className="score-text">{(() => {
            const mode = `reaction-${category}`;
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
        <div className="reaction-quiz-wrapper">
          {/* 質問文エリア - 余白を最小に */}
          <div className="reaction-question-line">
            <span className="question-text-inline">
              この反応で、何ができるか？
            </span>
            {showResult && (
              <div className="result-action-inline">
                <span className={selectedAnswer === correctValue ? "result-correct" : "result-incorrect"}>
                  {selectedAnswer === correctValue ? "✓ Correct!" : "✗ Wrong"}
                </span>
              </div>
            )}
          </div>

          {/* 説明文を最初から表示 */}
          <div className="reaction-description-area">
            {currentReaction.description ? (
              <p>{currentReaction.description}</p>
            ) : (
              <p className="description-placeholder">&nbsp;</p>
            )}
          </div>

          <div className="reaction-equation-area">
            <div className="reactant-block">
              <span className="label">Reactant</span>
              <div className="name-box">{currentReaction.from}</div>
              {fromCompound && <StructureViewer structure={fromCompound.structure} compoundName={fromCompound.name} size={200} />}
            </div>

            <div className="arrow-block">
              <div className="reagent-box">
                {currentReaction.reagent}
              </div>
              <div className="reaction-arrow">→</div>
            </div>

            <div className="product-block">
              <span className="label">Product</span>
              <div className="name-box">
                {!showResult ? <span className="placeholder">?</span> : currentReaction.to}
              </div>
              {/* 正解後に構造式を表示 */}
              {!showResult ? (
                <div className="structure-placeholder">?</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {toCompound ? (
                    <StructureViewer structure={toCompound.structure} compoundName={toCompound.name} size={200} />
                  ) : (
                    <div style={{ color: '#888', fontSize: '0.8rem', marginTop: '10px' }}>
                      {/* 図が見つからない場合のフォールバック */}
                      (NO IMAGE: {currentReaction.to})
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="options-container reaction-options-grid">
            {options.map((option) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = option === correctValue;
              const showCorrect = showResult && isCorrect;
              const showIncorrect = showResult && isSelected && !isCorrect;

              return (
                <button
                  key={option}
                  className={`option-button ${showCorrect ? 'correct' : ''} ${showIncorrect ? 'incorrect' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={(e) => { e.stopPropagation(); handleAnswer(option); }}
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
  );
};

