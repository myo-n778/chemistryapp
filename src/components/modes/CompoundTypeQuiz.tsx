import React, { useState, useEffect, useMemo } from 'react';
import { Compound } from '../../types';
import { StructureViewer } from '../StructureViewer';
import { ScoreDisplay } from '../shared/ScoreDisplay';
import { ProgressBar } from '../shared/ProgressBar';
import { QuizSummary } from '../shared/QuizSummary';
import '../Quiz.css';

interface CompoundTypeQuizProps {
  compounds: Compound[];
  allCompounds: Compound[];
  onBack: () => void;
}

// 種類の表記をインテリジェントに集約・正規化する関数
const normalizeType = (type: string | undefined): string => {
  if (!type) return 'アルカン';
  const t = type.trim();

  // 【最優先】特定性の高いカテゴリから判定

  // 1. 芳香族（ベンゼン環を持つもの）
  if (t.includes('芳香族') || t.includes('ベンゼン') || t.includes('フェノール') ||
    t.includes('アニリン') || t.includes('トルエン') || t.includes('キシレン') ||
    t.includes('サリチル') || t.includes('フタル')) {
    return '芳香族化合物';
  }

  // 2. 高分子・生体分子
  if (t.includes('糖') || t.includes('分子') || t.includes('アミノ酸') || t.includes('ペプチド') ||
    t.includes('タンパク') || t.includes('繊維') || t.includes('ゴム') || t.includes('樹脂') ||
    t.includes('縮合') || t.includes('付加')) {
    return '高分子化合物';
  }

  // 3. 油脂・エステル関連
  if (t.includes('油脂') || t.includes('脂肪') || t.includes('石鹸') || t.includes('セッケン') ||
    t.includes('グリセリン') || t.includes('エステル')) {
    return '油脂';
  }

  // 4. 基本的な官能基系
  if (t.includes('カルボン酸')) return 'カルボン酸';
  if (t.includes('アルデヒド') || t.includes('ホルミル')) return 'アルデヒド';
  if (t.includes('ケトン') || t.includes('カルボニル')) return 'ケトン';
  if (t.includes('アルコール') || t.includes('ヒドロキシ')) return 'アルコール';
  if (t.includes('エーテル')) return 'エーテル';

  // 5. 炭化水素（ここで初めてアルカン等を確認）
  if (t.includes('アルキン')) return 'アルキン';
  if (t.includes('アルケン') || t.includes('ジエン')) return 'アルケン';
  if (t.includes('アルカン') || t.includes('シクロ')) return 'アルカン';

  // 6. その他メジャーな分類
  if (t.includes('ハロゲン')) return 'ハロゲン化物';
  if (t.includes('ニトロ')) return 'ニトロ化合物';

  return t; // これでもヒットしない場合はそのまま表示
};

// 優先的に表示する順序の定義（ご提示の順序に基づく）
const PREFERRED_TYPE_ORDER = [
  'アルカン', 'アルケン', 'アルキン', // 1行目
  'アルコール', 'アルデヒド',
  'ケトン', 'カルボン酸', 'エーテル',
  '芳香族化合物', '油脂', '高分子化合物' // 集約されたカテゴリ
];

export const CompoundTypeQuiz: React.FC<CompoundTypeQuizProps> = ({ compounds, allCompounds, onBack }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // currentCompoundが存在しない場合の処理
  const currentCompound = compounds[currentIndex];
  if (!currentCompound && !isFinished) {
    return (
      <div className="quiz-container">
        <div className="quiz-header">
          <h1>有機化学クイズ</h1>
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

  // データからすべての種類を動的に抽出し、集約してソート
  const sortedTypes = useMemo(() => {
    const uniqueTypes = new Set<string>();

    // 優先リストの項目をベースに追加
    PREFERRED_TYPE_ORDER.forEach(t => uniqueTypes.add(t));

    // 全データから種類を抽出して集約
    allCompounds.forEach(c => {
      const normalized = normalizeType(c.type);
      uniqueTypes.add(normalized);
    });

    // ソートロジック
    return Array.from(uniqueTypes).sort((a, b) => {
      const indexA = PREFERRED_TYPE_ORDER.indexOf(a);
      const indexB = PREFERRED_TYPE_ORDER.indexOf(b);

      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [allCompounds]);

  const correctType = isFinished ? '' : normalizeType(currentCompound?.type);

  const handleAnswer = (answer: string) => {
    if (showResult) return;

    setSelectedAnswer(answer);
    setShowResult(true);
    setTotalAnswered(prev => prev + 1);

    if (answer === correctType) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < compounds.length - 1) {
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
  };

  useEffect(() => {
    if (!isFinished) {
      setSelectedAnswer(null);
      setShowResult(false);
    }
  }, [currentIndex, isFinished]);

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
  }, [showResult, currentIndex, compounds.length]);

  // 画面全体をクリックで次に進む
  const handleGlobalInteraction = (e: React.MouseEvent) => {
    if (showResult) {
      if (e.target === e.currentTarget) {
        handleNext();
      }
    }
  };

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h1>有機化学クイズ</h1>
        <div className="quiz-header-right">
          <span className="score-text"><ScoreDisplay score={score} totalAnswered={totalAnswered} /></span>
          <div className="quiz-header-buttons">
            <button className="back-button" onClick={onBack}>
              return
            </button>
            <button className="reset-button" onClick={handleReset}>
              reset
            </button>
          </div>
        </div>
      </div>

      <ProgressBar current={currentIndex + 1} total={compounds.length} />

      {!isFinished && currentCompound && (
        <div className="quiz-content" onClick={handleGlobalInteraction} style={{ cursor: showResult ? 'pointer' : 'default' }}>
          <div className="structure-container" onClick={(e) => { if (showResult && e.target === e.currentTarget) handleNext(); }}>
            <div className="question-header">
              <div className="question-english-line">
                <div className="question-english" style={{ transform: 'translateX(-80px)' }}>
                  Which type is this compound?
                </div>
                {showResult && (
                  <div className="quiz-action-buttons-horizontal">
                    <span className="result-message-inline">
                      {selectedAnswer === correctType ? (
                        <span className="correct-message-inline">
                          <span className="message-icon">✓</span>
                          <span className="english-text">Correct!</span>
                        </span>
                      ) : (
                        <span className="incorrect-message-inline">
                          <span className="message-icon">✗</span>
                          <span className="english-text">Wrong</span>
                        </span>
                      )}
                    </span>
                    <button className="next-button-inline-small" onClick={(e) => { e.stopPropagation(); handleNext(); }}>
                      {currentIndex < compounds.length - 1 ? 'Next →' : 'Restart'}
                    </button>
                  </div>
                )}
              </div>
              <div className="question-line">
                <div className="question-name-area">
                  <h2>「{currentCompound.name}」</h2>
                </div>
              </div>
            </div>
            <StructureViewer structure={currentCompound.structure} compoundName={currentCompound.name} />
            <div className="options-grid-compact">
              {sortedTypes.map((option) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = option === correctType;
                const showCorrect = showResult && isCorrect;
                const showIncorrect = showResult && isSelected && !isCorrect;

                return (
                  <button
                    key={option}
                    className={`option-button-compact ${showCorrect ? 'correct' : ''} ${showIncorrect ? 'incorrect' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAnswer(option);
                    }}
                    disabled={showResult}
                  >
                    <span className="option-text-small">{option}</span>
                    {showCorrect && <span className="result-icon-small">✓</span>}
                    {showIncorrect && <span className="result-icon-small">✗</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isFinished && (
        <QuizSummary
          score={score}
          total={compounds.length}
          onRestart={handleReset}
          onBack={onBack}
        />
      )}
    </div>
  );
};
