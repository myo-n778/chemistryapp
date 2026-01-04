import { useState, useEffect } from 'react';
import { Quiz } from './components/Quiz';
import { ModeSelector, QuizMode } from './components/ModeSelector';
import { CategorySelector, Category } from './components/CategorySelector';
import { QuestionCountSelector } from './components/QuestionCountSelector';
import { AllQuestionCountSelector } from './components/AllQuestionCountSelector';
import { loadCompounds, loadReactions, loadExperiments, loadInorganicReactionsData } from './data/dataLoader';
import { Compound, InorganicReaction } from './types';
import { ExperimentCSVRow } from './utils/experimentParser';
import './App.css';

export type QuestionCountMode = 'all' | 'batch-10' | 'batch-20' | 'batch-40';
export type OrderMode = 'sequential' | 'shuffle';
export interface QuizSettings {
  questionCountMode: QuestionCountMode;
  orderMode?: OrderMode; // Allモードの場合のみ
  startIndex?: number; // 10ずつモードの場合のみ（1-indexed）
  allQuestionCount?: number | null; // ALLモードの場合の解く問題数（nullは全部を意味する）
}

function App() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedMode, setSelectedMode] = useState<QuizMode | null>(null);
  const [quizSettings, setQuizSettings] = useState<QuizSettings | null>(null);
  const [compounds, setCompounds] = useState<Compound[]>([]);
  const [reactions, setReactions] = useState<number>(0); // モード④⑤用のreactions数
  const [experiments, setExperiments] = useState<ExperimentCSVRow[]>([]); // モード⑥用のexperiments
  const [inorganicReactions, setInorganicReactions] = useState<InorganicReaction[]>([]); // 無機化学用
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [inorganicLoading, setInorganicLoading] = useState(false);
  const [inorganicLoadingError, setInorganicLoadingError] = useState<string | null>(null);

  // 初回レンダリング時のデバッグログ
  useEffect(() => {
    console.log('App component mounted');
  }, []);

  useEffect(() => {
    // 無機化学の場合はスキップ
    if (selectedCategory === 'inorganic') {
      // 無機化学の場合は何もしない（別のuseEffectで処理）
    } else if (selectedCategory) {
      setLoading(true);
      setLoadingError(null);
      loadCompounds(selectedCategory)
        .then(data => {
          // null/undefinedチェック
          if (!data || !Array.isArray(data)) {
            throw new Error('Invalid data format received');
          }

          // 全化合物データを保持（ReactionQuiz用に構造式がなくても名前で使う）
          console.log(`App.tsx: Loaded ${data.length} total compounds`);

          // 構造式が有効な化合物をフィルタリング（既存のクイズモード用）
          const valid = data.filter(c =>
            c &&
            c.structure &&
            c.structure.atoms &&
            Array.isArray(c.structure.atoms) &&
            c.structure.atoms.length > 0 &&
            c.structure.bonds &&
            Array.isArray(c.structure.bonds) &&
            c.structure.bonds.length > 0
          );
          console.log(`App.tsx: ${valid.length} compounds have valid structures`);

          // setCompoundsには全データを渡す（構造式がなくても名前検索に使うため）
          setCompounds(data);
          
          // モード④⑤用にreactionsデータも読み込む
          loadReactions(selectedCategory)
            .then(reactionsData => {
              console.log(`App.tsx: Loaded ${reactionsData.length} reactions`);
              setReactions(reactionsData.length);
              
              // モード⑥用にexperimentsデータも読み込む
              loadExperiments(selectedCategory)
                .then(experimentsData => {
                  console.log(`App.tsx: Loaded ${experimentsData.length} experiments`);
                  setExperiments(experimentsData);
                  setLoading(false);
                  setLoadingError(null);
                })
                .catch(error => {
                  console.error('Failed to load experiments:', error);
                  setExperiments([]);
                  setLoading(false);
                  setLoadingError(null); // experimentsの読み込み失敗は致命的ではない
                });
            })
            .catch(error => {
              console.error('Failed to load reactions:', error);
              setReactions(0);
              // reactionsの読み込み失敗時もexperimentsを試みる
              loadExperiments(selectedCategory)
                .then(experimentsData => {
                  console.log(`App.tsx: Loaded ${experimentsData.length} experiments`);
                  setExperiments(experimentsData);
                  setLoading(false);
                  setLoadingError(null);
                })
                .catch(expError => {
                  console.error('Failed to load experiments:', expError);
                  setExperiments([]);
                  setLoading(false);
                  setLoadingError(null);
                });
            });
        })
        .catch(error => {
          console.error('Failed to load compounds:', error);
          setCompounds([]);
          setReactions(0);
          setExperiments([]);
          setLoading(false);
          const errorMessage = error instanceof Error ? error.message : 'データの読み込みに失敗しました';
          setLoadingError(errorMessage);
        });
    } else {
      // カテゴリが未選択の場合は状態をリセット
      setCompounds([]);
      setReactions(0);
      setExperiments([]);
      setLoading(false);
      setLoadingError(null);
    }
  }, [selectedCategory]);

  const getFilteredCompounds = () => {
    if (!quizSettings) {
      // 構造式が有効な化合物のみを返す
      return compounds.filter(c =>
        c &&
        c.structure &&
        c.structure.atoms &&
        Array.isArray(c.structure.atoms) &&
        c.structure.atoms.length > 0 &&
        c.structure.bonds &&
        Array.isArray(c.structure.bonds) &&
        c.structure.bonds.length > 0
      );
    }

    // まず構造式が有効な化合物のみをフィルタリング
    let filtered = compounds.filter(c =>
      c &&
      c.structure &&
      c.structure.atoms &&
      Array.isArray(c.structure.atoms) &&
      c.structure.atoms.length > 0 &&
      c.structure.bonds &&
      Array.isArray(c.structure.bonds) &&
      c.structure.bonds.length > 0
    );

    // 問題数モードに応じてフィルタリング
    if (quizSettings.questionCountMode === 'batch-10') {
      const startIdx = (quizSettings.startIndex || 1) - 1;
      filtered = filtered.slice(startIdx, startIdx + 10);
    } else if (quizSettings.questionCountMode === 'batch-20') {
      const startIdx = (quizSettings.startIndex || 1) - 1;
      filtered = filtered.slice(startIdx, startIdx + 20);
    } else if (quizSettings.questionCountMode === 'batch-40') {
      const startIdx = (quizSettings.startIndex || 1) - 1;
      filtered = filtered.slice(startIdx, startIdx + 40);
    } else if (quizSettings.questionCountMode === 'all') {
      // ALLモード：問題数が指定されている場合はその数だけ、nullの場合は全部
      if (quizSettings.allQuestionCount !== undefined && quizSettings.allQuestionCount !== null) {
        filtered = filtered.slice(0, quizSettings.allQuestionCount);
      }
    }

    // 順番モードに応じてソート
    if (quizSettings.orderMode === 'shuffle') {
      filtered = filtered.sort(() => Math.random() - 0.5);
    }

    return filtered;
  };

  if (!selectedCategory) {
    return (
      <div className="App">
        <CategorySelector onSelectCategory={setSelectedCategory} />
      </div>
    );
  }

  // 無機化学データの読み込み
  useEffect(() => {
    if (selectedCategory === 'inorganic') {
      let isMounted = true;
      setInorganicLoading(true);
      setInorganicLoadingError(null);
      
      loadInorganicReactionsData()
        .then(data => {
          if (!isMounted) return;
          console.log(`App.tsx: Loaded ${data.length} inorganic reactions`);
          setInorganicReactions(data);
          setInorganicLoading(false);
          setInorganicLoadingError(null);
        })
        .catch(error => {
          if (!isMounted) return;
          console.error('Failed to load inorganic reactions:', error);
          setInorganicReactions([]);
          setInorganicLoading(false);
          const errorMessage = error instanceof Error ? error.message : 'データの読み込みに失敗しました';
          setInorganicLoadingError(errorMessage);
        });
      
      return () => {
        isMounted = false;
      };
    } else {
      // 無機化学以外の場合は状態をリセット
      setInorganicReactions([]);
      setInorganicLoading(false);
      setInorganicLoadingError(null);
    }
    // loadInorganicReactionsDataは外部からインポートされた関数で変更されないため、依存配列に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  // ローディング状態のチェック（有機化学または無機化学）
  const isLoading = selectedCategory === 'inorganic' ? inorganicLoading : loading;
  const currentLoadingError = selectedCategory === 'inorganic' ? inorganicLoadingError : loadingError;

  if (isLoading) {
    return (
      <div className="App">
        <div style={{ textAlign: 'center', color: '#ffffff', padding: '40px' }}>
          <p className="loading-text">loading…</p>
        </div>
      </div>
    );
  }

  if (currentLoadingError) {
    return (
      <div className="App">
        <div style={{ textAlign: 'center', color: '#ffffff', padding: '40px' }}>
          <p style={{ color: '#ffa500', marginBottom: '20px', fontSize: '1.1rem' }}>
            データの読み込みに失敗しました
          </p>
          <p style={{ color: '#aaaaaa', marginBottom: '20px', fontSize: '0.9rem' }}>
            {currentLoadingError}
          </p>
          <button
            className="back-button"
            onClick={() => {
              setSelectedCategory(null);
              if (selectedCategory === 'inorganic') {
                setInorganicLoadingError(null);
              } else {
                setLoadingError(null);
              }
            }}
            style={{ marginTop: '20px' }}
          >
            ← return
          </button>
        </div>
      </div>
    );
  }

  if (!selectedMode) {
    return (
      <div className="App">
        <ModeSelector
          category={selectedCategory}
          onSelectMode={setSelectedMode}
          onBack={() => setSelectedCategory(null)}
        />
      </div>
    );
  }

  // モード④⑤の場合はreactions数、モード⑥の場合はexperiments数、無機化学モードの場合はinorganicReactions数、それ以外はcompounds数を使用
  const totalQuestionCount = (selectedMode === 'reaction' || selectedMode === 'substitution') 
    ? reactions 
    : selectedMode === 'experiment' 
    ? experiments.length 
    : selectedMode?.startsWith('inorganic-mode-')
    ? inorganicReactions.length
    : compounds.length;

  if (!quizSettings) {
    return (
      <div className="App">
        <QuestionCountSelector
          totalCount={totalQuestionCount}
          onSelectSettings={setQuizSettings}
          onBack={() => setSelectedMode(null)}
          mode={selectedMode}
          category={selectedCategory}
        />
      </div>
    );
  }

  // ALLモードで問題数が未選択の場合（undefinedの場合のみ選択画面を表示）
  if (quizSettings.questionCountMode === 'all' && quizSettings.allQuestionCount === undefined) {
    return (
      <div className="App">
        <AllQuestionCountSelector
          totalCount={totalQuestionCount}
          orderMode={quizSettings.orderMode || 'sequential'}
          onSelectCount={(count) => {
            // countがundefinedの場合は全件を意味するので、nullを設定してクイズを開始
            setQuizSettings({
              ...quizSettings,
              allQuestionCount: count === undefined ? null : count
            });
          }}
          onBack={() => setQuizSettings(null)}
          mode={selectedMode}
          category={selectedCategory}
        />
      </div>
    );
  }

  const finalCompounds = getFilteredCompounds();

  // フィルタリング後の化合物が空の場合はエラーメッセージを表示
  if (finalCompounds.length === 0 && compounds.length > 0) {
    return (
      <div className="App">
        <div style={{ textAlign: 'center', color: '#ffffff', padding: '40px' }}>
          <p style={{ color: '#ffa500', marginBottom: '20px', fontSize: '1.1rem' }}>
            問題データが見つかりませんでした
          </p>
          <p style={{ color: '#aaaaaa', marginBottom: '20px', fontSize: '0.9rem' }}>
            構造式が有効な化合物がありません。データを確認してください。
          </p>
          <button
            className="back-button"
            onClick={() => {
              setQuizSettings(null);
            }}
            style={{ marginTop: '20px' }}
          >
            設定に戻る
          </button>
        </div>
      </div>
    );
  }

  const handleNextRange = () => {
    if (!quizSettings || quizSettings.startIndex === undefined) return;
    
    let batchSize = 10;
    if (quizSettings.questionCountMode === 'batch-20') {
      batchSize = 20;
    } else if (quizSettings.questionCountMode === 'batch-40') {
      batchSize = 40;
    }
    
    const nextStartIndex = quizSettings.startIndex + batchSize;
    // 境界チェック（モード④⑤の場合はreactions数、モード⑥の場合はexperiments数を使用）
    const maxCount = (selectedMode === 'reaction' || selectedMode === 'substitution') 
      ? reactions 
      : selectedMode === 'experiment' 
      ? experiments.length 
      : compounds.length;
    if (nextStartIndex > maxCount) {
      return; // 次の範囲が存在しない
    }
    
    setQuizSettings({
      ...quizSettings,
      startIndex: nextStartIndex
    });
  };
  

  return (
    <div className="App">
      <Quiz
        compounds={finalCompounds}
        allCompounds={compounds}
        experiments={experiments}
        inorganicReactions={inorganicReactions}
        mode={selectedMode}
        category={selectedCategory}
        onBack={() => setQuizSettings(null)}
        quizSettings={quizSettings}
        onNextRange={handleNextRange}
      />
    </div>
  );
}

export default App;

