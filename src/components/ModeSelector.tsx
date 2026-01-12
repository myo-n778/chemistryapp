import React from 'react';
import { Category } from './CategorySelector';
import { UserStatsPanel } from './UserStatsPanel';
import { PublicRankingPanel } from './PublicRankingPanel';
import { clearActiveUser, clearRecDataCache } from '../utils/sessionLogger';
import './ModeSelector.css';

export type QuizMode =
  | 'structure-to-name'
  | 'name-to-structure'
  | 'compound-type'
  | 'reaction'
  | 'substitution'
  | 'experiment'
  | 'inorganic-type-a'
  | 'inorganic-type-b'
  | 'inorganic-type-c'
  | 'inorganic-mode-a' // 旧モード（後で削除予定）
  | 'inorganic-mode-b' // 旧モード（後で削除予定）
  | 'inorganic-mode-e' // 旧モード（後で削除予定）
  | 'inorganic-mode-f' // 旧モード（後で削除予定）
  | 'inorganic-mode-g'; // 旧モード（後で削除予定）

interface ModeSelectorProps {
  category: Category;
  onSelectMode: (mode: QuizMode) => void;
  onBack: () => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ category, onSelectMode, onBack }) => {
  const categoryName = category === 'organic' ? 'Organic Chemistry' : 'Inorganic Chemistry';

  const handleLogout = () => {
    clearActiveUser();
    clearRecDataCache();
    window.location.reload();
  };

  return (
    <div className="mode-selector">
      <div className="mode-selector-header">
        <button className="back-to-category-button" onClick={onBack}>
          ← カテゴリ選択に戻る
        </button>
        <h1>{categoryName} Drill</h1>
        <button className="logout-button" onClick={handleLogout} title="ユーザー切替">
          ユーザー切替
        </button>
      </div>
      <p className="mode-description">モードを選択してください</p>
      
      {/* 成績表示パネル（mode指定 = categoryでフィルタ） */}
      <UserStatsPanel mode={category} />
      
      {/* 公開ランキング（mode指定 = categoryでフィルタ） */}
      <PublicRankingPanel mode={category} />
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
              onClick={() => onSelectMode('inorganic-type-a')}
            >
              <div className="mode-title">タイプA：反応 → 生成物</div>
              <div className="mode-subtitle">反応内容から生成物を選ぶ</div>
            </button>

            <button
              className="mode-button"
              onClick={() => onSelectMode('inorganic-type-b')}
            >
              <div className="mode-title">タイプB：反応式 → 条件</div>
              <div className="mode-subtitle">反応式から条件を選ぶ</div>
            </button>

            <button
              className="mode-button"
              onClick={() => onSelectMode('inorganic-type-c')}
            >
              <div className="mode-title">タイプC：反応式 → 観察</div>
              <div className="mode-subtitle">反応式から観察を選ぶ</div>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

