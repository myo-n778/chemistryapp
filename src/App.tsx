import { useState, useEffect } from 'react';
import { Quiz } from './components/Quiz';
import { ModeSelector, QuizMode } from './components/ModeSelector';
import { CategorySelector, Category } from './components/CategorySelector';
import { QuestionCountSelector } from './components/QuestionCountSelector';
import { loadCompounds } from './data/dataLoader';
import { Compound } from './types';
import './App.css';

export type QuestionCountMode = 'all' | 'batch-10';
export type OrderMode = 'sequential' | 'shuffle';
export interface QuizSettings {
  questionCountMode: QuestionCountMode;
  orderMode?: OrderMode; // Allモードの場合のみ
  startIndex?: number; // 10ずつモードの場合のみ（1-indexed）
}

function App() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedMode, setSelectedMode] = useState<QuizMode | null>(null);
  const [quizSettings, setQuizSettings] = useState<QuizSettings | null>(null);
  const [compounds, setCompounds] = useState<Compound[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // 初回レンダリング時のデバッグログ
  useEffect(() => {
    console.log('App component mounted');
  }, []);

  useEffect(() => {
    if (selectedCategory) {
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
          setLoading(false);
          setLoadingError(null);
        })
        .catch(error => {
          console.error('Failed to load compounds:', error);
          setCompounds([]);
          setLoading(false);
          const errorMessage = error instanceof Error ? error.message : 'データの読み込みに失敗しました';
          setLoadingError(errorMessage);
        });
    } else {
      // カテゴリが未選択の場合は状態をリセット
      setCompounds([]);
      setLoading(false);
      setLoadingError(null);
    }
  }, [selectedCategory]);

  const getFilteredCompounds = () => {
    if (!quizSettings) return compounds;

    let filtered = [...compounds];

    // 問題数モードに応じてフィルタリング
    if (quizSettings.questionCountMode === 'batch-10') {
      const startIdx = (quizSettings.startIndex || 1) - 1;
      filtered = filtered.slice(startIdx, startIdx + 10);
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

  if (loading) {
    return (
      <div className="App">
        <div style={{ textAlign: 'center', color: '#ffffff', padding: '40px' }}>
          データを読み込んでいます...
        </div>
      </div>
    );
  }

  if (loadingError) {
    return (
      <div className="App">
        <div style={{ textAlign: 'center', color: '#ffffff', padding: '40px' }}>
          <p style={{ color: '#ffa500', marginBottom: '20px', fontSize: '1.1rem' }}>
            データの読み込みに失敗しました
          </p>
          <p style={{ color: '#aaaaaa', marginBottom: '20px', fontSize: '0.9rem' }}>
            {loadingError}
          </p>
          <button
            className="back-button"
            onClick={() => {
              setSelectedCategory(null);
              setLoadingError(null);
            }}
            style={{ marginTop: '20px' }}
          >
            カテゴリ選択に戻る
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

  if (!quizSettings) {
    return (
      <div className="App">
        <QuestionCountSelector
          totalCount={compounds.length}
          onSelectSettings={setQuizSettings}
          onBack={() => setSelectedMode(null)}
        />
      </div>
    );
  }

  const finalCompounds = getFilteredCompounds();

  return (
    <div className="App">
      <Quiz
        compounds={finalCompounds}
        allCompounds={compounds}
        mode={selectedMode}
        category={selectedCategory}
        onBack={() => setQuizSettings(null)}
      />
    </div>
  );
}

export default App;

