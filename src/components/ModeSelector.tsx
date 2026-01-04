import React from 'react';
import { Category } from './CategorySelector';
import './ModeSelector.css';

export type QuizMode =
  | 'structure-to-name'
  | 'name-to-structure'
  | 'compound-type'
  | 'reaction'
  | 'substitution'
  | 'experiment'
  | 'inorganic-mode-a'
  | 'inorganic-mode-b'
  | 'inorganic-mode-c'
  | 'inorganic-mode-d'
  | 'inorganic-mode-e'
  | 'inorganic-mode-f'
  | 'inorganic-mode-g';

interface ModeSelectorProps {
  category: Category;
  onSelectMode: (mode: QuizMode) => void;
  onBack: () => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ category, onSelectMode, onBack }) => {
  const categoryName = category === 'organic' ? 'Organic Chemistry' : 'Inorganic Chemistry';

  return (
    <div className="mode-selector">
      <div className="mode-selector-header">
        <button className="back-to-category-button" onClick={onBack}>
          ← カテゴリ選択に戻る
        </button>
        <h1>{categoryName} Drill</h1>
      </div>
      <p className="mode-description">モードを選択してください</p>
      <div className="mode-grid">
        {category === 'organic' ? (
          <>
            <button
              className="mode-button"
              onClick={() => onSelectMode('structure-to-name')}
            >
              <div className="mode-title">① 構造式から名称</div>
              <div className="mode-subtitle">図から名称を選ぶ</div>
            </button>

            <button
              className="mode-button"
              onClick={() => onSelectMode('name-to-structure')}
            >
              <div className="mode-title">② 名称から構造式</div>
              <div className="mode-subtitle">名称から図を選ぶ</div>
            </button>

            <button
              className="mode-button"
              onClick={() => onSelectMode('compound-type')}
            >
              <div className="mode-title">③ 化合物の種類</div>
              <div className="mode-subtitle">アルコール、アルデヒドなど</div>
            </button>

            <button
              className="mode-button"
              onClick={() => onSelectMode('reaction')}
            >
              <div className="mode-title">④ 反応（何ができる）</div>
              <div className="mode-subtitle">この反応で、何ができるか？</div>
            </button>

            <button
              className="mode-button"
              onClick={() => onSelectMode('substitution')}
            >
              <div className="mode-title">⑤ 反応（何をした）</div>
              <div className="mode-subtitle">この反応で、何をしたか？</div>
            </button>

            <button
              className="mode-button"
              onClick={() => onSelectMode('experiment')}
            >
              <div className="mode-title">⑥ 分類実験</div>
              <div className="mode-subtitle">4択問題</div>
            </button>
          </>
        ) : (
          <>
            <button
              className="mode-button"
              onClick={() => onSelectMode('inorganic-mode-a')}
            >
              <div className="mode-title">モードA：反応 → 生成物</div>
              <div className="mode-subtitle">反応物から生成物を選ぶ</div>
            </button>

            <button
              className="mode-button"
              onClick={() => onSelectMode('inorganic-mode-b')}
            >
              <div className="mode-title">モードB：反応 → 観察</div>
              <div className="mode-subtitle">反応から観察を選ぶ（図付き）</div>
            </button>

            <button
              className="mode-button"
              onClick={() => onSelectMode('inorganic-mode-c')}
            >
              <div className="mode-title">モードC：条件 → 結果</div>
              <div className="mode-subtitle">条件から結果を選ぶ（分岐）</div>
            </button>

            <button
              className="mode-button"
              onClick={() => onSelectMode('inorganic-mode-d')}
            >
              <div className="mode-title">モードD：図を見て答える</div>
              <div className="mode-subtitle">図から物質・反応式・観察を選ぶ</div>
            </button>

            <button
              className="mode-button"
              onClick={() => onSelectMode('inorganic-mode-e')}
            >
              <div className="mode-title">モードE：空欄補充</div>
              <div className="mode-subtitle">空欄を埋める</div>
            </button>

            <button
              className="mode-button"
              onClick={() => onSelectMode('inorganic-mode-f')}
            >
              <div className="mode-title">モードF：式 → 意味</div>
              <div className="mode-subtitle">反応式から意味を選ぶ</div>
            </button>

            <button
              className="mode-button"
              onClick={() => onSelectMode('inorganic-mode-g')}
            >
              <div className="mode-title">モードG：識別・比較</div>
              <div className="mode-subtitle">観察から反応を識別</div>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

