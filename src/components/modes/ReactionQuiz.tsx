import React, { useState, useEffect, useMemo } from 'react';
import { Compound } from '../../types';
import { Category } from '../CategorySelector';
import { StructureViewer } from '../StructureViewer';
import { ScoreDisplay } from '../shared/ScoreDisplay';
import { QuizSummary } from '../shared/QuizSummary';
import { loadReactions } from '../../data/dataLoader';
import { ReactionCSVRow } from '../../utils/reactionParser';
import '../Quiz.css';

interface ReactionQuizProps {
  compounds: Compound[];
  category: Category;
  onBack: () => void;
}

export const ReactionQuiz: React.FC<ReactionQuizProps> = ({ compounds, category, onBack }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [reactions, setReactions] = useState<ReactionCSVRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);

  // 各問題のパターン（0: toを答える, 1: reagentを答える）を保持
  const [questionPatterns, setQuestionPatterns] = useState<number[]>([]);

  useEffect(() => {
    console.log(`Loading reactions for category: ${category}`);
    loadReactions(category).then(data => {
      console.log(`Loaded ${data.length} reactions:`, data);
      setReactions(data);
      // ランダムにパターンを割り振り
      const patterns = data.map(() => Math.floor(Math.random() * 2));
      setQuestionPatterns(patterns);
      setLoading(false);
    }).catch(err => {
      console.error("Failed to load reactions:", err);
      setLoading(false);
    });
  }, [category]);

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
  const currentPattern = questionPatterns[currentIndex]; // 0: Dを答える, 1: Cを答える

  // 選択肢の生成（Hooksは条件分岐より前に呼ぶ）
  const options = useMemo(() => {
    if (loading || reactions.length === 0 || !currentReaction || isFinished) return [];

    if (currentPattern === 0) {
      // 物質D（to）を答えるパターン
      const correctName = currentReaction.to;
      const allNames = Array.from(new Set(compounds.map(c => c.name)));
      const wrongNames = allNames
        .filter(name => name !== correctName)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      return [correctName, ...wrongNames].sort(() => Math.random() - 0.5);
    } else {
      // 試薬C（reagent）を答えるパターン
      const correctReagent = currentReaction.reagent;
      const allReagents = Array.from(new Set(reactions.map(r => r.reagent))).filter(r => r !== '');
      const wrongReagents = allReagents
        .filter(r => r !== correctReagent)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      return [correctReagent, ...wrongReagents].sort(() => Math.random() - 0.5);
    }
  }, [currentIndex, currentPattern, reactions, compounds, isFinished, loading, currentReaction]);

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
  const correctValue = currentPattern === 0 ? currentReaction?.to : currentReaction?.reagent;

  const handleAnswer = (answer: string) => {
    if (showResult) return;

    setSelectedAnswer(answer);
    setShowResult(true);
    setTotalAnswered(prev => prev + 1);

    if (answer === correctValue) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < reactions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setIsFinished(true);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setTotalAnswered(0);
    setIsFinished(false);
    // パターンを再生成
    setQuestionPatterns(reactions.map(() => Math.floor(Math.random() * 2)));
  };

  // 表示ロジックの分岐（Hooksの後）
  if (loading) {
    return (
      <div className="quiz-container">
        <div className="quiz-header"><h1>有機化学クイズ</h1></div>
        <div style={{ textAlign: 'center', color: '#ffffff', padding: '40px' }}>
          <p>データを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (reactions.length === 0) {
    return (
      <div className="quiz-container">
        <div className="quiz-header"><h1>有機化学クイズ</h1></div>
        <div style={{ textAlign: 'center', color: '#ffffff', padding: '40px' }}>
          <p>反応データが見つかりませんでした。</p>
          <p>スプレッドシートの「reactions」シートにデータがあるか確認してください。</p>
          <button className="back-button" onClick={onBack} style={{ marginTop: '20px' }}>戻る</button>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <QuizSummary
        score={score}
        total={reactions.length}
        onRestart={handleReset}
        onBack={onBack}
      />
    );
  }

  // データ不整合ガード
  if (!currentReaction) {
    return (
      <div className="quiz-container">
        <div className="quiz-header"><h1>有機化学クイズ</h1></div>
        <div style={{ textAlign: 'center', color: '#ffffff', padding: '40px' }}>
          <p>データの読み込みに失敗しました。</p>
          <button className="back-button" onClick={onBack}>戻る</button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h1>有機化学クイズ</h1>
        <div className="quiz-header-right">
          <span className="score-text"><ScoreDisplay score={score} totalAnswered={totalAnswered} /></span>
          <div className="quiz-header-buttons">
            <button className="back-button" onClick={onBack}>return</button>
            <button className="reset-button" onClick={handleReset}>reset</button>
          </div>
          {/* ProgressBarをヘッダー内に移動 */}
          <div className="reaction-progress-inline">
            <span className="progress-text">問題 {currentIndex + 1} / {reactions.length}</span>
            <div className="progress-bar-mini">
              <div className="progress-fill-mini" style={{ width: `${((currentIndex + 1) / reactions.length) * 100}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="quiz-content" onClick={() => showResult && handleNext()} style={{ cursor: showResult ? 'pointer' : 'default' }}>
        <div className="reaction-quiz-wrapper" onClick={() => showResult && handleNext()}>
          {/* 質問文エリア - 余白を最小に */}
          <div className="reaction-question-line">
            <span className="question-text-inline">
              {currentPattern === 0 ? "What is the product of this reaction?" : "What is the reagent for this reaction?"}
            </span>
            {showResult && (
              <div className="result-action-inline">
                <span className={selectedAnswer === correctValue ? "result-correct" : "result-incorrect"}>
                  {selectedAnswer === correctValue ? "✓ Correct!" : "✗ Wrong"}
                </span>
                <button
                  className={selectedAnswer === correctValue ? "next-button-correct" : "next-button-incorrect"}
                  onClick={(e) => { e.stopPropagation(); handleNext(); }}
                >
                  {currentIndex < reactions.length - 1 ? 'Next →' : 'Restart'}
                </button>
              </div>
            )}
          </div>

          {/* 説明文の枠を常に確保 */}
          <div className="reaction-description-area">
            {currentReaction.description && showResult ? (
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
                {currentPattern === 1 && !showResult ? <span className="placeholder">?</span> : currentReaction.reagent}
              </div>
              <div className="reaction-arrow">→</div>
            </div>

            <div className="product-block">
              <span className="label">Product</span>
              <div className="name-box">
                {currentPattern === 0 && !showResult ? <span className="placeholder">?</span> : currentReaction.to}
              </div>
              {/* 正解後、または最初からProductが見えているパターンの場合に構造式を表示 */}
              {(currentPattern === 0 && !showResult) ? (
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
    </div>
  );
};

