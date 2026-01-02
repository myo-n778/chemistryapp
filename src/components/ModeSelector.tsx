import React from 'react';
import { Category } from './CategorySelector';
import './ModeSelector.css';

export type QuizMode =
  | 'structure-to-name'
  | 'name-to-structure'
  | 'compound-type'
  | 'reaction'
  | 'substitution'
  | 'synthesis';

interface ModeSelectorProps {
  category: Category;
  onSelectMode: (mode: QuizMode) => void;
  onBack: () => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ category, onSelectMode, onBack }) => {
  const categoryName = category === 'organic' ? '有機化学' : '無機化学';

  return (
    <div className="mode-selector">
      <div className="mode-selector-header">
        <button className="back-to-category-button" onClick={onBack}>
          ← カテゴリ選択に戻る
        </button>
        <h1>{categoryName}クイズ</h1>
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
          <div className="mode-title">④ 反応クイズ</div>
          <div className="mode-subtitle">A+B→C、A+C→Bなど</div>
        </button>

        <button
          className="mode-button"
          onClick={() => onSelectMode('substitution')}
        >
          <div className="mode-title">⑤ 置換反応</div>
          <div className="mode-subtitle">◯◯をしたら何になる？</div>
        </button>

        <button
          className="mode-button"
          onClick={() => onSelectMode('synthesis')}
        >
          <div className="mode-title">⑥ 合成反応</div>
          <div className="mode-subtitle">◯◯に△△をしたらなる？</div>
        </button>
      </div>
    </div>
  );
};

