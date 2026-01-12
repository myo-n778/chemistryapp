import { useState, useEffect, useMemo, useCallback } from 'react';
import { Quiz } from './components/Quiz';
import { ModeSelector, QuizMode } from './components/ModeSelector';
import { CategorySelector, Category } from './components/CategorySelector';
import { QuestionCountSelector } from './components/QuestionCountSelector';
import { AllQuestionCountSelector } from './components/AllQuestionCountSelector';
import { SoundSelector } from './components/SoundSelector';
import { UserManager } from './components/UserManager';
import { loadCompounds, loadReactions, loadExperiments, loadInorganicReactionsData } from './data/dataLoader';
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
    console.log('[App] Initial activeUser:', user);
    console.log('[App] localStorage chem.activeUser:', localStorage.getItem('chem.activeUser'));
    console.log('[App] localStorage chem.users:', localStorage.getItem('chem.users'));
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
    console.log('[App] App component mounted, activeUser:', activeUser);
  }, []);

  // activeUserが存在しない場合はユーザー選択画面を表示
  if (!activeUser) {
    console.log('[App] No activeUser, showing UserManager');
    return (
      <div className="App">
        <GasHealthCheck />
        <UserManager
          onUserSelected={() => {
            const user = getActiveUser();
            console.log('[App] User selected, new user:', user);
            setActiveUser(user);
          }}
        />
      </div>
    );
  }

  console.log('[App] activeUser exists, showing main app:', activeUser);

  // 有機化学データの読み込み
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
          
          // モード④⑤⑥用にreactionsとexperimentsデータを並列で読み込む（高速化）
          Promise.all([
            loadReactions(selectedCategory).catch(error => {
              console.error('Failed to load reactions:', error);
              return [];
            }),
            loadExperiments(selectedCategory).catch(error => {
              console.error('Failed to load experiments:', error);
              return [];
            })
          ]).then(([reactionsData, experimentsData]) => {
            console.log(`App.tsx: Loaded ${reactionsData.length} reactions and ${experimentsData.length} experiments`);
            setReactions(reactionsData.length);
            setExperiments(experimentsData);
            setLoading(false);
            setLoadingError(null);
          }).catch(error => {
            console.error('Failed to load reactions or experiments:', error);
            setReactions(0);
            setExperiments([]);
            setLoading(false);
            setLoadingError(null);
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

  // 無機化学データの読み込み
  useEffect(() => {
    let isMounted = true;
    let newLoaderSucceeded = false; // 新しいローダーが成功したかどうかのフラグ

    if (selectedCategory !== 'inorganic') {
      setInorganicReactions([]);
      setInorganicReactionsNew([]);
      setInorganicLoading(false);
      setInorganicLoadingError(null);
      return;
    }

    setInorganicLoading(true);
    setInorganicLoadingError(null);
    // 初期状態をリセット
    setInorganicReactions([]);
    setInorganicReactionsNew([]);

    // 新しい無機化学データを読み込み
    loadInorganicReactionsNew()
      .then(data => {
        if (!isMounted) return;
        if (data && Array.isArray(data) && data.length > 0) {
          console.log(`[App] Loaded ${data.length} new inorganic reactions`, {
            dataLength: data.length,
            firstFew: data.slice(0, 3),
            selectedCategory,
            selectedMode
          });
          newLoaderSucceeded = true; // 成功フラグを立てる
          setInorganicReactionsNew(data);
          setInorganicReactions([]); // 旧データは空にする
          setInorganicLoading(false);
          setInorganicLoadingError(null);
        } else {
          // データが空の場合はフォールバックへ
          console.error('[App] New inorganic reactions data is empty', {
            data,
            dataIsArray: Array.isArray(data),
            dataLength: data?.length
          });
          throw new Error('New inorganic reactions data is empty');
        }
      })
      .catch(error => {
        if (!isMounted) return;
        if (newLoaderSucceeded) {
          // 新しいローダーが既に成功している場合はフォールバックを発動させない
          return;
        }
        console.error('Failed to load new inorganic reactions:', error);
        // フォールバック: 旧データを読み込む（新しいローダーが成功していない場合のみ）
        loadInorganicReactionsData()
          .then(data => {
            if (!isMounted || newLoaderSucceeded) return; // 新しいローダーが成功していたら無視
            console.log(`App.tsx: Loaded ${data.length} old inorganic reactions (fallback)`);
            setInorganicReactions(data);
            setInorganicReactionsNew([]); // 新データは空にする
            setInorganicLoading(false);
            setInorganicLoadingError(null);
          })
          .catch(oldError => {
            if (!isMounted || newLoaderSucceeded) return; // 新しいローダーが成功していたら無視
            console.error('Failed to load old inorganic reactions:', oldError);
            setInorganicReactions([]);
            setInorganicReactionsNew([]);
            setInorganicLoading(false);
            const errorMessage = error instanceof Error ? error.message : 'データの読み込みに失敗しました';
            setInorganicLoadingError(errorMessage);
          });
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  // すべてのHooksを先に宣言（固定順序）
  // 無機化学データの選択（new/oldの切り替えをuseMemo内で行う）
  const activeInorganicReactions = useMemo(() => {
    if (selectedCategory !== 'inorganic') {
      return null;
    }
    if (selectedMode === 'inorganic-type-a' || selectedMode === 'inorganic-type-b' || selectedMode === 'inorganic-type-c') {
      return { type: 'new' as const, data: inorganicReactionsNew };
    }
    return { type: 'old' as const, data: inorganicReactions };
  }, [selectedCategory, selectedMode, inorganicReactionsNew, inorganicReactions]);

  // ローディング状態のチェック（有機化学または無機化学）
  const isLoading = useMemo(() => {
    return selectedCategory === 'inorganic' ? inorganicLoading : loading;
  }, [selectedCategory, inorganicLoading, loading]);

  const currentLoadingError = useMemo(() => {
    return selectedCategory === 'inorganic' ? inorganicLoadingError : loadingError;
  }, [selectedCategory, inorganicLoadingError, loadingError]);

  // モード④⑤の場合はreactions数、モード⑥の場合はexperiments数、無機化学モードの場合はinorganicReactions数、それ以外はcompounds数を使用
  const totalQuestionCount = useMemo(() => {
    console.log('[App] totalQuestionCount useMemo recalculating', {
      selectedCategory,
      selectedMode,
      inorganicReactionsNewLength: inorganicReactionsNew.length,
      inorganicReactionsLength: inorganicReactions.length
    });
    if (selectedCategory === 'inorganic') {
      // Inorganicの場合、新しいモード（type-a/b/c）の場合はinorganicReactionsNewの全件数を使用
      // 問題数選択時点では、フィルタリング前の全件数を表示する
      if (selectedMode === 'inorganic-type-a' || selectedMode === 'inorganic-type-b' || selectedMode === 'inorganic-type-c') {
        const count = inorganicReactionsNew.length;
        console.log('[App] totalQuestionCount calculation (inorganic new)', {
          selectedCategory,
          selectedMode,
          inorganicReactionsNewLength: inorganicReactionsNew.length,
          inorganicReactionsNew: inorganicReactionsNew,
          count
        });
        return count;
      }
      // 旧モードの場合はinorganicReactionsの全件数を使用
      const count = inorganicReactions.length;
      console.log('[App] totalQuestionCount calculation (inorganic old)', {
        selectedCategory,
        selectedMode,
        inorganicReactionsLength: inorganicReactions.length,
        count
      });
      return count;
    } else if (selectedMode === 'reaction' || selectedMode === 'substitution') {
      return reactions;
    } else if (selectedMode === 'experiment') {
      return experiments.length;
    }
    return compounds.length;
  }, [selectedCategory, selectedMode, inorganicReactionsNew, inorganicReactions, reactions, experiments.length, compounds.length]);


  // 最大問題数（handleNextRange/hasNextRange用）
  const maxQuestionCount = useMemo(() => {
    if (selectedCategory === 'inorganic') {
      return activeInorganicReactions?.data.length ?? 0;
    } else if (selectedMode === 'reaction' || selectedMode === 'substitution') {
      return reactions;
    } else if (selectedMode === 'experiment') {
      return experiments.length;
    }
    return compounds.length;
  }, [selectedCategory, selectedMode, activeInorganicReactions, reactions, experiments.length, compounds.length]);

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
    console.log('[App] quizInorganicReactionsNew: useMemo start', {
      selectedCategory,
      selectedMode,
      hasQuizSettings: !!quizSettings,
      inorganicReactionsNewLength: inorganicReactionsNew.length,
      inorganicReactionsNew: inorganicReactionsNew
    });

    if (selectedCategory !== 'inorganic' || !quizSettings) {
      console.log('[App] quizInorganicReactionsNew: early return - category or settings check', {
        selectedCategory,
        hasQuizSettings: !!quizSettings
      });
      return [];
    }

    // selectedModeがnullまたは新しい無機化学モードでない場合は早期return
    const newInorganicModes: QuizMode[] = ['inorganic-type-a', 'inorganic-type-b', 'inorganic-type-c'];
    const isNewInorganicMode = selectedMode !== null && newInorganicModes.includes(selectedMode);
    if (!selectedMode || !isNewInorganicMode) {
      console.log('[App] quizInorganicReactionsNew: early return - mode check', {
        selectedMode,
        isNewInorganicMode,
        expectedModes: newInorganicModes,
        modeMatch: {
          'inorganic-type-a': selectedMode === 'inorganic-type-a',
          'inorganic-type-b': selectedMode === 'inorganic-type-b',
          'inorganic-type-c': selectedMode === 'inorganic-type-c'
        }
      });
      return [];
    }

    const sourceReactions = inorganicReactionsNew;
    console.log('[App] quizInorganicReactionsNew: sourceReactions assignment', {
      sourceReactionsLength: sourceReactions.length,
      inorganicReactionsNewLength: inorganicReactionsNew.length,
      sourceReactionsIsSame: sourceReactions === inorganicReactionsNew,
      sourceReactionsFirstFew: sourceReactions.slice(0, 3)
    });

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
      
      console.log('[App] quizInorganicReactionsNew: batch mode', {
        questionCountMode: quizSettings.questionCountMode,
        startIndex: quizSettings.startIndex,
        start,
        end,
        batchSize,
        baseLength: base.length,
        totalCount: sourceReactions.length
      });

      filtered = base.slice(start, end);
    } else if (quizSettings.questionCountMode === 'all') {
      // ALLモード
      if (quizSettings.allQuestionCount !== undefined && quizSettings.allQuestionCount !== null) {
        filtered = base.slice(0, quizSettings.allQuestionCount);
      } else {
        filtered = base; // 全件
      }
      
      console.log('[App] quizInorganicReactionsNew: all mode', {
        allQuestionCount: quizSettings.allQuestionCount,
        baseLength: base.length,
        filteredLength: filtered.length
      });
    } else {
      // 設定がない場合は全件
      filtered = base;
    }

    console.log('[App] quizInorganicReactionsNew: result', {
      filteredLength: filtered.length,
      sourceReactionsLength: sourceReactions.length,
      quizSettings
    });

    return filtered;
  }, [selectedCategory, selectedMode, inorganicReactionsNew, quizSettings]);

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
        <div style={{ textAlign: 'center', color: '#ffffff', padding: '40px' }}>
          <p style={{ color: '#ffa500', marginBottom: '20px', fontSize: '1.1rem' }}>
            問題データが見つかりませんでした
          </p>
          <p style={{ color: '#aaaaaa', marginBottom: '20px', fontSize: '0.9rem' }}>
            出題セットが空です。設定を確認してください。
          </p>
          <button
            className="back-button"
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
        mode={selectedMode}
        category={selectedCategory}
        onBack={() => setQuizSettings(null)}
        quizSettings={quizSettings ?? undefined}
        onNextRange={hasNext ? handleNextRange : undefined}
      />
    );
  }, [selectedMode, selectedCategory, quizInorganicReactionsNew, finalCompounds, compounds, experiments, quizInorganicReactions, quizSettings, maxQuestionCount, handleNextRange]);

  // Early returns（すべてのhooks宣言の後）
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
        <div style={{ textAlign: 'center', color: '#ffffff', padding: '40px' }}>
          <p className="loading-text">loading…</p>
        </div>
      </div>
    );
  }

  if (currentLoadingError) {
    return (
      <div className="App">
        <GasHealthCheck />
        <SoundSelector />
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
    // 【切り分けテスト3】inorganicReactionsNewの状態を確認
    console.log('[App] 【切り分けテスト】QuestionCountSelector表示前の状態確認', {
      selectedCategory,
      selectedMode,
      inorganicReactionsNew: {
        isArray: Array.isArray(inorganicReactionsNew),
        length: inorganicReactionsNew.length,
        firstFew: inorganicReactionsNew.slice(0, 3),
        fullArray: inorganicReactionsNew
      },
      inorganicReactions: {
        isArray: Array.isArray(inorganicReactions),
        length: inorganicReactions.length
      },
      stateVariables: {
        inorganicReactionsNewState: inorganicReactionsNew,
        inorganicReactionsState: inorganicReactions
      }
    });
    
    // Inorganicの場合、直接inorganicReactionsNew.lengthを計算して渡す
    // selectedModeが設定されていない場合でも、全件数を表示する
    const actualTotalCount = selectedCategory === 'inorganic' 
      ? (selectedMode === 'inorganic-type-a' || selectedMode === 'inorganic-type-b' || selectedMode === 'inorganic-type-c'
          ? inorganicReactionsNew.length
          : inorganicReactions.length)
      : totalQuestionCount;
    
    // 【切り分けテスト1】一時的にハードコードして動作確認
    const testTotalCount = selectedCategory === 'inorganic' ? 90 : actualTotalCount;
    
    console.log('[App] Rendering QuestionCountSelector', {
      totalQuestionCount,
      actualTotalCount,
      testTotalCount,
      selectedMode,
      selectedCategory,
      inorganicReactionsNewLength: inorganicReactionsNew.length,
      inorganicReactionsLength: inorganicReactions.length,
      inorganicReactionsNew: inorganicReactionsNew,
      activeInorganicReactions: activeInorganicReactions?.data.length ?? 0
    });
    return (
      <div className="App">
        <SoundSelector />
        <QuestionCountSelector
          totalCount={testTotalCount}
          onSelectSettings={(settings) => {
            console.log('[App] onSelectSettings called', settings);
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

