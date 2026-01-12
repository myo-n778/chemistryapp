import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Compound } from '../../types';
import { Category } from '../CategorySelector';
import { StructureViewer } from '../StructureViewer';
import { ScoreDisplay } from '../shared/ScoreDisplay';
import { QuizSummary } from '../shared/QuizSummary';
import { calculateScore, saveHighScore, getRangeKey, getScoreHistory, ScoreHistoryEntry } from '../../utils/scoreCalculator';
import { playCorrect, playWrong, playFinishSound } from '../../utils/soundManager';
import { getActiveUser, generateUUID, saveSessionLog, saveQuestionLogsForSession, pushRecRowToSheetRec, QuestionLog, SessionLog, RecRow } from '../../utils/sessionLogger';
import '../Quiz.css';

interface CompoundTypeQuizProps {
  compounds: Compound[];
  allCompounds: Compound[];
  category: Category;
  onBack: () => void;
  isShuffleMode?: boolean;
  quizSettings?: { orderMode?: 'sequential' | 'shuffle'; questionCountMode?: 'all' | 'batch-10' | 'batch-20' | 'batch-40'; startIndex?: number; allQuestionCount?: number | null };
  totalCount?: number;
  onNextRange?: () => void;
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

export const CompoundTypeQuiz: React.FC<CompoundTypeQuizProps> = ({ compounds, allCompounds, category, onBack, isShuffleMode = false, quizSettings, totalCount: _totalCount = 0, onNextRange }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [pointScore, setPointScore] = useState(0); // 得点表示モード用
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [lastQuestionId, setLastQuestionId] = useState<string | null>(null);
  const [consecutiveCount, setConsecutiveCount] = useState(0);
  const isProcessingRef = useRef(false);
  const lastTapRef = useRef<number>(0);
  const tapTimeoutRef = useRef<number | null>(null);
  const questionLogsRef = useRef<QuestionLog[]>([]); // セッション内の問題ログ

  // currentCompoundが存在しない場合の処理
  const currentCompound = compounds[currentIndex];
  if (!currentCompound && !isFinished) {
    return (
      <div className="quiz-container">
        <div className="quiz-header">
          <h1>Organic Chemistry Drill</h1>
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

    const isCorrect = answer === correctType;
    
    // 効果音を再生
    if (isCorrect) {
      playCorrect();
    } else {
      playWrong();
    }
    
    const elapsedSeconds = (Date.now() - questionStartTime) / 1000;
    
    // 連続正解カウント（同じ問題IDが連続で正解した場合のみ）
    const currentQuestionId = currentCompound?.id || '';
    let newConsecutiveCount = 0;
    if (isCorrect && lastQuestionId === currentQuestionId) {
      newConsecutiveCount = consecutiveCount + 1;
      setConsecutiveCount(newConsecutiveCount);
      setLastQuestionId(currentQuestionId); // 正解した場合のみ更新
    } else if (isCorrect) {
      newConsecutiveCount = 1;
      setConsecutiveCount(1);
      setLastQuestionId(currentQuestionId); // 正解した場合のみ更新
    } else {
      setConsecutiveCount(0);
      setLastQuestionId(null); // 間違えた場合はリセット
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

    // 問題ログを追加
    const getModeAndRangeKey = () => {
      const mode = `compound-type-${category}`;
      const rangeKey = quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-10' 
        ? getRangeKey('batch-10', quizSettings.startIndex)
        : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-20'
        ? getRangeKey('batch-20', quizSettings.startIndex)
        : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-40'
        ? getRangeKey('batch-40', quizSettings.startIndex)
        : getRangeKey(quizSettings?.questionCountMode || 'all', undefined, quizSettings?.allQuestionCount);
      return { mode, rangeKey };
    };
    const { mode, rangeKey } = getModeAndRangeKey();
    const questionLog: QuestionLog = {
      questionId: `${mode}|${rangeKey}|${questionLogsRef.current.length}`,
      isCorrect,
      timestamp: Date.now(),
      mode,
      category: 'organic',
    };
    questionLogsRef.current.push(questionLog);
  };

  const handleNext = () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    
    const getModeAndRangeKey = () => {
      const mode = `compound-type-${category}`;
      const rangeKey = quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-10' 
        ? getRangeKey('batch-10', quizSettings.startIndex)
        : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-20'
        ? getRangeKey('batch-20', quizSettings.startIndex)
        : quizSettings?.questionCountMode && quizSettings.questionCountMode === 'batch-40'
        ? getRangeKey('batch-40', quizSettings.startIndex)
        : getRangeKey(quizSettings?.questionCountMode || 'all', undefined, quizSettings?.allQuestionCount);
      return { mode, rangeKey };
    };

    // 範囲内の問題数に合わせて終了判定（範囲内の問題数が指定出題数より少ない場合はその問題数で終了）
    let expectedQuestions = 10;
    if (quizSettings?.questionCountMode === 'batch-20') {
      expectedQuestions = 20;
    } else if (quizSettings?.questionCountMode === 'batch-40') {
      expectedQuestions = 40;
    }
    const maxQuestions = Math.min(expectedQuestions, compounds.length);
    if (totalAnswered >= maxQuestions) {
      // 最高記録を保存（モード×範囲ごとに分離）
      const { mode, rangeKey } = getModeAndRangeKey();
      saveHighScore(pointScore, score, totalAnswered, mode, rangeKey);
      
      // セッションログを保存
      const activeUser = getActiveUser();
      if (!activeUser) {
        console.error('Active user not found');
        return;
      }
      
      const sessionId = generateUUID();
      const now = Date.now();
      const dateStr = new Date(now).toISOString().split('T')[0];
      const sessionLog: SessionLog = {
        sessionId,
        userKey: activeUser.userKey,
        mode,
        category: 'organic',
        rangeKey,
        correctCount: score,
        totalCount: totalAnswered,
        pointScore,
        timestamp: now,
        date: dateStr,
      };
      saveSessionLog(sessionLog);
      saveQuestionLogsForSession(sessionId, questionLogsRef.current);
      
      const recRow: RecRow = {
        userKey: activeUser.userKey,
        displayName: activeUser.displayName,
        mode,
        category: 'organic',
        rangeKey,
        correctCount: score,
        totalCount: totalAnswered,
        pointScore,
        accuracy: totalAnswered > 0 ? score / totalAnswered : 0,
        date: dateStr,
        timestamp: now,
        isPublic: activeUser.isPublic,
      };
      pushRecRowToSheetRec(recRow, 'organic').catch(err => console.warn('Failed to push rec row:', err));
      
      setIsFinished(true);
    } else if (currentIndex < compounds.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setQuestionStartTime(Date.now());
      // 次の問題が異なる場合は連続カウントをリセット（同じ問題IDでなければ）
      const nextCompound = compounds[currentIndex + 1];
      if (nextCompound && nextCompound.id !== lastQuestionId) {
        setConsecutiveCount(0);
      }
    } else {
      // 最高記録を保存（モード×範囲ごとに分離）
      const { mode, rangeKey } = getModeAndRangeKey();
      saveHighScore(pointScore, score, totalAnswered, mode, rangeKey);
      
      // セッションログを保存
      const activeUser = getActiveUser();
      if (!activeUser) {
        console.error('Active user not found');
        return;
      }
      
      const sessionId = generateUUID();
      const now = Date.now();
      const dateStr = new Date(now).toISOString().split('T')[0];
      const sessionLog: SessionLog = {
        sessionId,
        userKey: activeUser.userKey,
        mode,
        category: 'organic',
        rangeKey,
        correctCount: score,
        totalCount: totalAnswered,
        pointScore,
        timestamp: now,
        date: dateStr,
      };
      saveSessionLog(sessionLog);
      saveQuestionLogsForSession(sessionId, questionLogsRef.current);
      
      const recRow: RecRow = {
        userKey: activeUser.userKey,
        displayName: activeUser.displayName,
        mode,
        category: 'organic',
        rangeKey,
        correctCount: score,
        totalCount: totalAnswered,
        pointScore,
        accuracy: totalAnswered > 0 ? score / totalAnswered : 0,
        date: dateStr,
        timestamp: now,
        isPublic: activeUser.isPublic,
      };
      pushRecRowToSheetRec(recRow, 'organic').catch(err => console.warn('Failed to push rec row:', err));
      
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
    setLastQuestionId(null);
    setConsecutiveCount(0);
    questionLogsRef.current = []; // 問題ログをリセット
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
      questionLogsRef.current = []; // 問題ログをリセット
    }
  }, [quizSettings?.startIndex]);

  useEffect(() => {
    if (!isFinished) {
      setSelectedAnswer(null);
      setShowResult(false);
      setQuestionStartTime(Date.now());
    }
  }, [currentIndex, isFinished]);

  // 結果画面が表示された時にfinish音声を再生
  useEffect(() => {
    if (isFinished && totalAnswered > 0) {
      console.log('[CompoundTypeQuiz] isFinished changed to true, playing finish sound');
      const getModeAndRangeKey = () => {
        const mode = `compound-type-${category}`;
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
      console.log(`[CompoundTypeQuiz] Result: score=${score}/${totalAnswered} (${percentage}%), isNewRecord=${isNewRecord}, isRankIn=${isRankIn}`);
      if (isNewRecord) {
        console.log('[CompoundTypeQuiz] Playing finish sound: type 3 (最高記録更新)');
        playFinishSound(3); // 最高記録更新
      } else if (isRankIn) {
        console.log('[CompoundTypeQuiz] Playing finish sound: type 2 (ランクイン)');
        playFinishSound(2); // ランクイン
      } else if (percentage === 100) {
        console.log('[CompoundTypeQuiz] Playing finish sound: type 5 (満点)');
        playFinishSound(5); // 満点で記録更新でない
      } else if (percentage >= 60) {
        console.log('[CompoundTypeQuiz] Playing finish sound: type 1 (60%以上)');
        playFinishSound(1); // 60%以上
      } else {
        console.log('[CompoundTypeQuiz] Playing finish sound: type 4 (60%未満)');
        playFinishSound(4); // 60%未満
      }
    }
  }, [isFinished, totalAnswered, score, pointScore, category, quizSettings]);

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

  // 画面全体をクリック/タップで次に進む（PCはシングルクリック、スマホはダブルタップ）
  const handleGlobalInteraction = (e: React.MouseEvent) => {
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
          if (tapTimeoutRef.current !== null) {
            window.clearTimeout(tapTimeoutRef.current);
          }
          tapTimeoutRef.current = window.setTimeout(() => {
            lastTapRef.current = 0;
          }, 300) as unknown as number;
        }
      }
    }
  };

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h1>Organic Chemistry Drill</h1>
        <div className="quiz-header-right">
          <span className="score-text">{(() => {
            const mode = `compound-type-${category}`;
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
              <span className="progress-text">問題 {currentIndex + 1} / {compounds.length}</span>
              {showResult && (
                <button className="next-button-mobile" onClick={handleNext}>
                  Next
                </button>
              )}
            </div>
            <div className="progress-bar-mini">
              <div className="progress-fill-mini" style={{ width: `${((currentIndex + 1) / compounds.length) * 100}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {!isFinished && currentCompound && (
        <div className="quiz-content" onClick={handleGlobalInteraction} onTouchEnd={handleTouchEnd} style={{ cursor: showResult ? 'pointer' : 'default' }}>
          <div className="structure-container" onClick={(e) => { if (showResult && e.target === e.currentTarget) handleNext(); }}>
            <div className="question-header">
              <div className="question-line">
                <div className="question-name-area">
                  <h2>「{currentCompound.name}」</h2>
                </div>
              </div>
              <div className="reaction-question-line">
                <span className="question-text-inline">Which type is this compound?</span>
                {showResult && (
                  <div className="result-action-inline">
                    <span className={selectedAnswer === correctType ? "result-correct" : "result-incorrect"}>
                      {selectedAnswer === correctType ? "✓ Correct!" : "✗ Wrong"}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="compound-type-mobile-layout">
              <div className="structure-viewer-wrapper">
                <StructureViewer structure={currentCompound.structure} compoundName={currentCompound.name} />
              </div>
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
        </div>
      )}

      {isFinished && (() => {
        const mode = `compound-type-${category}`;
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
            onNext={onNextRange}
            mode={mode}
            rangeKey={rangeKey}
          />
        );
      })()}
    </div>
  );
};
