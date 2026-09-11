import { useState, useEffect, useMemo, useCallback } from 'react';
import { Quiz } from './components/Quiz';
import { ModeSelector, QuizMode } from './components/ModeSelector';
import { CategorySelector, Category } from './components/CategorySelector';
import { QuestionCountSelector } from './components/QuestionCountSelector';
import { AllQuestionCountSelector } from './components/AllQuestionCountSelector';
import { SoundSelector } from './components/SoundSelector';
import { UserManager } from './components/UserManager';
import { loadCompounds, loadReactions, loadExperiments } from './data/dataLoader';
import { loadInorganicReactionsNew } from './data/inorganicNewLoader';
import { Compound, InorganicReaction } from './types';
import { InorganicReactionNew } from './types/inorganic';
import { ExperimentCSVRow } from './utils/experimentParser';
import { TeXTest } from './components/TeXTest';
import { getActiveUser } from './utils/sessionLogger';
import { GasHealthCheck } from './components/GasHealthCheck';
import './App.css';

// 一時的にTeXTestを表示するためのフラグ（開発用）
const SHOW_TEX_TEST = false;

export type QuestionCountMode = 'all' | 'batch-10' | 'batch-20' | 'batch-40';
export type OrderMode = 'sequential' | 'shuffle';
export interface QuizSettings {
  questionCountMode: QuestionCountMode;
  orderMode?: OrderMode; // Allモードの場合のみ
  startIndex?: number; // 10ずつモードの場合のみ（1-indexed）
  allQuestionCount?: number | null; // ALLモードの場合の解く問題数（nullは全部を意味する）
}

function App() {
  const [activeUser, setActiveUser] = useState(() => {
    const user = getActiveUser();
    return user;
  });
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedMode, setSelectedMode] = useState<QuizMode | null>(null);
  const [quizSettings, setQuizSettings] = useState<QuizSettings | null>(null);
  const [compounds, setCompounds] = useState<Compound[]>([]);
  const [reactions, setReactions] = useState<number>(0); // モード④⑤用のreactions数
  const [experiments, setExperiments] = useState<ExperimentCSVRow[]>([]); // モード⑥用のexperiments
  const [inorganicReactions, setInorganicReactions] = useState<InorganicReaction[]>([]); // 無機化学用（旧）
  const [inorganicReactionsNew, setInorganicReactionsNew] = useState<InorganicReactionNew[]>([]); // 無機化学用（新）
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [inorganicLoading, setInorganicLoading] = useState(false);
  const [inorganicLoadingError, setInorganicLoadingError] = useState<string | null>(null);

  // 初回レンダリング時のデバッグログ
  useEffect(() => {
  }, []);

  const [reloadKey, setReloadKey] = useState(0);

  // 画面を離れた後の応答を破棄し、失敗を空データや旧CSVで隠さない。
  useEffect(() => {
    let cancelled = false;
    setCompounds([]);
    setReactions(0);
    setExperiments([]);
    setLoadingError(null);
    setLoading(selectedCategory === 'organic');
    if (selectedCategory === 'organic') {
      Promise.all([loadCompounds('organic'), loadReactions('organic'), loadExperiments('organic')])
        .then(([nextCompounds, nextReactions, nextExperiments]) => {
          if (cancelled) return;
          if (!nextCompounds.length) throw new Error('化合物データが空です。問題シートを確認してください。');
          setCompounds(nextCompounds);
          setReactions(nextReactions.length);
          setExperiments(nextExperiments);
        })
        .catch(error => {
          if (!cancelled) setLoadingError(error instanceof Error ? error.message : '問題データを取得できませんでした。');
        })
        .finally(() => { if (!cancelled) setLoading(false); });
    }
    return () => { cancelled = true; };
  }, [selectedCategory, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    setInorganicReactions([]);
    setInorganicReactionsNew([]);
    setInorganicLoadingError(null);
    setInorganicLoading(selectedCategory === 'inorganic');
    if (selectedCategory === 'inorganic') {
      loadInorganicReactionsNew()
        .then(data => {
          if (cancelled) return;
          if (!data.length) throw new Error('無機化学の問題データが空です。問題シートを確認してください。');
          setInorganicReactionsNew(data);
        })
        .catch(error => {
          if (!cancelled) setInorganicLoadingError(error instanceof Error ? error.message : '問題データを取得できませんでした。');
        })
        .finally(() => { if (!cancelled) setInorganicLoading(false); });
    }
    return () => { cancelled = true; };
  }, [selectedCategory, reloadKey]);

  // すべてのHooksを先に宣言（固定順序）
  // 回答が空の行は出題せず、件数・範囲・実出題で同じ集合を使う。
  const eligibleInorganicReactions = useMemo(() => {
    const answerKey = selectedMode === 'inorganic-type-b' ? 'conditions'
      : selectedMode === 'inorganic-type-c' ? 'observations' : 'products';
    return inorganicReactionsNew.filter(reaction => reaction[answerKey].trim().length > 0);
  }, [inorganicReactionsNew, selectedMode]);

  // 無機化学データの選択（new/oldの切り替えをuseMemo内で行う）
  const activeInorganicReactions = useMemo(() => {
    if (selectedCategory !== 'inorganic') {
      return null;
    }
    if (selectedMode === 'inorganic-type-a' || selectedMode === 'inorganic-type-b' || selectedMode === 'inorganic-type-c') {
      return { type: 'new' as const, data: eligibleInorganicReactions };
    }
    return { type: 'old' as const, data: inorganicReactions };
  }, [selectedCategory, selectedMode, eligibleInorganicReactions, inorganicReactions]);

  // ローディング状態のチェック（有機化学または無機化学）
  const isLoading = useMemo(() => {
    return selectedCategory === 'inorganic' ? inorganicLoading : loading;
  }, [selectedCategory, inorganicLoading, loading]);

  const currentLoadingError = useMemo(() => {
    return selectedCategory === 'inorganic' ? inorganicLoadingError : loadingError;
  }, [selectedCategory, inorganicLoadingError, loadingError]);

  // モード④⑤の場合はreactions数、モード⑥の場合はexperiments数、無機化学モードの場合はinorganicReactions数、それ以外はcompounds数を使用
  const totalQuestionCount = useMemo(() => {
    if (selectedCategory === 'inorganic') {
      // 回答欄のある出題可能な行の件数を表示する
      if (selectedMode === 'inorganic-type-a' || selectedMode === 'inorganic-type-b' || selectedMode === 'inorganic-type-c') {
        const count = eligibleInorganicReactions.length;
        return count;
      }
      // 旧モードの場合はinorganicReactionsの全件数を使用
      const count = inorganicReactions.length;
      return count;
    } else if (selectedMode === 'reaction' || selectedMode === 'substitution') {
      return reactions;
    } else if (selectedMode === 'experiment') {
      return experiments.length;
    }
    return compounds.filter(c => c.structure?.atoms?.length > 0 && c.structure?.bonds?.length > 0).length;
  }, [selectedCategory, selectedMode, eligibleInorganicReactions, inorganicReactions, reactions, experiments.length, compounds]);


  // 最大問題数（handleNextRange/hasNextRange用）
  const maxQuestionCount = useMemo(() => {
    if (selectedCategory === 'inorganic') {
      return activeInorganicReactions?.data.length ?? 0;
    } else if (selectedMode === 'reaction' || selectedMode === 'substitution') {
      return reactions;
    } else if (selectedMode === 'experiment') {
      return experiments.length;
    }
    return compounds.filter(c => c.structure?.atoms?.length > 0 && c.structure?.bonds?.length > 0).length;
  }, [selectedCategory, selectedMode, activeInorganicReactions, reactions, experiments.length, compounds]);

  const finalCompounds = useMemo(() => {
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
  }, [compounds, quizSettings]);

  // すべてのhooksを先に実行（早期returnの前にすべてのhooksを宣言）
  const handleNextRange = useCallback(() => {
    if (!quizSettings) return;
    
    // batch-10/20/40モードの場合のみ次の範囲へ進む
    if (quizSettings.questionCountMode === 'batch-10' || 
        quizSettings.questionCountMode === 'batch-20' || 
        quizSettings.questionCountMode === 'batch-40') {
      if (quizSettings.startIndex === undefined) return;
      
      let batchSize = 10;
      if (quizSettings.questionCountMode === 'batch-20') {
        batchSize = 20;
      } else if (quizSettings.questionCountMode === 'batch-40') {
        batchSize = 40;
      }
      
      const nextStartIndex = quizSettings.startIndex + batchSize;
      if (nextStartIndex > maxQuestionCount) {
        return; // 次の範囲が存在しない
      }
      
      setQuizSettings({
        ...quizSettings,
        startIndex: nextStartIndex
      });
    }
  }, [quizSettings, maxQuestionCount]);

  // Quizコンポーネントに渡す無機化学データを決定（クイズ開始時に出題セットを確定）
  const quizInorganicReactionsNew = useMemo(() => {

    if (selectedCategory !== 'inorganic' || !quizSettings) {
      return [];
    }

    // selectedModeがnullまたは新しい無機化学モードでない場合は早期return
    const newInorganicModes: QuizMode[] = ['inorganic-type-a', 'inorganic-type-b', 'inorganic-type-c'];
    const isNewInorganicMode = selectedMode !== null && newInorganicModes.includes(selectedMode);
    if (!selectedMode || !isNewInorganicMode) {
      return [];
    }

    const sourceReactions = eligibleInorganicReactions;

    if (sourceReactions.length === 0) {
      console.error('[App] quizInorganicReactionsNew: sourceReactions is empty', {
        selectedCategory,
        selectedMode,
        inorganicReactionsNewLength: inorganicReactionsNew.length,
        sourceReactionsLength: sourceReactions.length,
        quizSettings
      });
      return [];
    }

    // 1) batchSizeの決定
    let batchSize: number | undefined;
    if (quizSettings.questionCountMode === 'batch-10') {
      batchSize = 10;
    } else if (quizSettings.questionCountMode === 'batch-20') {
      batchSize = 20;
    } else if (quizSettings.questionCountMode === 'batch-40') {
      batchSize = 40;
    }

    // 2) shuffleをsliceの前に適用
    const base = (quizSettings.orderMode === 'shuffle') 
      ? (() => {
          const shuffled = [...sourceReactions];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        })()
      : [...sourceReactions];

    let filtered: typeof sourceReactions = [];

    if (quizSettings.questionCountMode && quizSettings.questionCountMode !== 'all' && quizSettings.startIndex !== undefined && batchSize !== undefined) {
      // batch-10/20/40モード
      const start = quizSettings.startIndex - 1; // 1始まりを0始まりに変換
      const end = start + batchSize;

      filtered = base.slice(start, end);
    } else if (quizSettings.questionCountMode === 'all') {
      // ALLモード
      if (quizSettings.allQuestionCount !== undefined && quizSettings.allQuestionCount !== null) {
        filtered = base.slice(0, quizSettings.allQuestionCount);
      } else {
        filtered = base; // 全件
      }
    } else {
      // 設定がない場合は全件
      filtered = base;
    }

    return filtered;
  }, [selectedCategory, selectedMode, eligibleInorganicReactions, quizSettings]);

  const quizInorganicReactions = activeInorganicReactions?.type === 'old' ? activeInorganicReactions.data : [];

  // mainContentをuseMemoで計算（すべてのhooksの後）
  const mainContent = useMemo(() => {
    // selectedModeとselectedCategoryはこの時点でnullでないことが保証されている
    if (!selectedMode || !selectedCategory) {
      return null; // 型チェック用（実際には到達しない）
    }

    // reactions.length === 0の場合はエラー表示
    if (selectedCategory === 'inorganic' && 
        (selectedMode === 'inorganic-type-a' || selectedMode === 'inorganic-type-b' || selectedMode === 'inorganic-type-c') &&
        quizInorganicReactionsNew.length === 0) {
      return (
        <div className="status-panel">
          <p style={{ color: '#ffa500', marginBottom: '20px', fontSize: '1.1rem' }}>
            問題データが見つかりませんでした
          </p>
          <p style={{ color: '#aaaaaa', marginBottom: '20px', fontSize: '0.9rem' }}>
            出題セットが空です。設定を確認してください。
          </p>
          <button
            className="status-action"
            onClick={() => setQuizSettings(null)}
            style={{ marginTop: '20px' }}
          >
            設定に戻る
          </button>
        </div>
      );
    }

    // hasNextRangeをuseMemo内で直接計算
    const hasNext = quizSettings && (
      (quizSettings.questionCountMode === 'batch-10' || 
       quizSettings.questionCountMode === 'batch-20' || 
       quizSettings.questionCountMode === 'batch-40') &&
      quizSettings.startIndex !== undefined
    ) ? (() => {
      let batchSize = 10;
      if (quizSettings.questionCountMode === 'batch-20') {
        batchSize = 20;
      } else if (quizSettings.questionCountMode === 'batch-40') {
        batchSize = 40;
      }
      const nextStartIndex = quizSettings.startIndex! + batchSize;
      return nextStartIndex <= maxQuestionCount;
    })() : false;

    // 通常のクイズ表示
    return (
      <Quiz
        compounds={finalCompounds}
        allCompounds={compounds}
        experiments={experiments}
        inorganicReactions={quizInorganicReactions}
        inorganicReactionsNew={quizInorganicReactionsNew}
        inorganicChoicePool={inorganicReactionsNew}
        mode={selectedMode}
        category={selectedCategory}
        onBack={() => setQuizSettings(null)}
        quizSettings={quizSettings ?? undefined}
        onNextRange={hasNext ? handleNextRange : undefined}
      />
    );
  }, [selectedMode, selectedCategory, inorganicReactionsNew, quizInorganicReactionsNew, finalCompounds, compounds, experiments, quizInorganicReactions, quizSettings, maxQuestionCount, handleNextRange]);

  // Early returns（すべてのhooks宣言の後）
  // activeUserが存在しない場合はユーザー選択画面を表示
  if (!activeUser) {
    return (
      <div className="App">
        <GasHealthCheck />
        <UserManager
          onUserSelected={() => {
            const user = getActiveUser();
            setActiveUser(user);
          }}
        />
      </div>
    );
  }


  if (!selectedCategory) {
    return (
      <div className="App">
        <GasHealthCheck />
        <SoundSelector />
        <CategorySelector onSelectCategory={setSelectedCategory} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="App">
        <GasHealthCheck />
        <SoundSelector />
        <div className="status-panel">
          <p className="loading-text" role="status">問題を読み込んでいます…</p>
          <button className="status-action" onClick={() => setSelectedCategory(null)}>分野選択に戻る</button>
        </div>
      </div>
    );
  }

  if (currentLoadingError) {
    return (
      <div className="App">
        <GasHealthCheck />
        <SoundSelector />
        <div className="status-panel">
          <p role="alert" style={{ color: '#ffa500', marginBottom: '20px', fontSize: '1.1rem' }}>
            データの読み込みに失敗しました
          </p>
          <p style={{ color: '#aaaaaa', marginBottom: '20px', fontSize: '0.9rem' }}>
            {currentLoadingError}
          </p>
          <div className="status-actions">
          <button className="status-action" onClick={() => setReloadKey(key => key + 1)}>再読み込み</button>
          <button
            className="status-action"
            onClick={() => {
              setSelectedCategory(null);
              if (selectedCategory === 'inorganic') {
                setInorganicLoadingError(null);
              } else {
                setLoadingError(null);
              }
            }}
          >
            ← 分野選択に戻る
          </button>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedMode) {
    return (
      <div className="App">
        <GasHealthCheck />
        <SoundSelector />
        <ModeSelector
          category={selectedCategory}
          onSelectMode={setSelectedMode}
          onBack={() => setSelectedCategory(null)}
        />
      </div>
    );
  }

  if (!quizSettings) {
    
    // Inorganicの場合、直接inorganicReactionsNew.lengthを計算して渡す
    // selectedModeが設定されていない場合でも、全件数を表示する
    const actualTotalCount = selectedCategory === 'inorganic' 
      ? (selectedMode === 'inorganic-type-a' || selectedMode === 'inorganic-type-b' || selectedMode === 'inorganic-type-c'
          ? eligibleInorganicReactions.length
          : inorganicReactions.length)
      : totalQuestionCount;
    
    // シートから取得した実件数を使用する

    return (
      <div className="App">
        <SoundSelector />
        <QuestionCountSelector
          totalCount={actualTotalCount}
          onSelectSettings={(settings) => {
            setQuizSettings(settings);
          }}
          onBack={() => setSelectedMode(null)}
          mode={selectedMode ?? undefined}
          category={selectedCategory}
        />
      </div>
    );
  }

  // ALLモードで問題数が未選択の場合（undefinedの場合のみ選択画面を表示）
  if (quizSettings.questionCountMode === 'all' && quizSettings.allQuestionCount === undefined) {
    return (
      <div className="App">
        <SoundSelector />
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
          mode={selectedMode ?? undefined}
          category={selectedCategory}
        />
      </div>
    );
  }

  // フィルタリング後の化合物が空の場合はエラーメッセージを表示
  if (selectedCategory === 'organic' && ['structure-to-name', 'name-to-structure', 'compound-type'].includes(selectedMode) && finalCompounds.length === 0) {
    return (
      <div className="App">
        <div className="status-panel">
          <p style={{ color: '#ffa500', marginBottom: '20px', fontSize: '1.1rem' }}>
            問題データが見つかりませんでした
          </p>
          <p style={{ color: '#aaaaaa', marginBottom: '20px', fontSize: '0.9rem' }}>
            構造式が有効な化合物がありません。データを確認してください。
          </p>
          <button
            className="status-action"
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

  // すべてのhooksを先に実行した後、return分岐を最後にまとめる
  // mainContentは既にuseMemoで計算済み
  
  // 一時的にTeXTestを表示（開発用）
  if (SHOW_TEX_TEST) {
    return (
      <div className="App">
        <TeXTest />
      </div>
    );
  }

  return (
    <div className="App">
      <GasHealthCheck />
      <SoundSelector />
      {mainContent}
    </div>
  );
}

export default App;

