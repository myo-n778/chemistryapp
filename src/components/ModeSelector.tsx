import React from 'react';
import { Category } from './CategorySelector';
import './ModeSelector.css';

export type QuizMode =
  | 'structure-to-name'
  | 'name-to-structure'
  | 'compound-type'
  | 'reaction'
  | 'substitution'
  | 'experiment';

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
          <div className="mode-title">⑥ 官能基あて</div>
          <div className="mode-subtitle">4択問題</div>
        </button>
      </div>
    </div>
  );
};

