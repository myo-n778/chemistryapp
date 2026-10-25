import React from 'react';
import { UserStatsPanel } from './UserStatsPanel';
import { PublicRankingPanel } from './PublicRankingPanel';
import { clearActiveUser, clearRecDataCache } from '../utils/sessionLogger';
import './CategorySelector.css';

export type Category = 'organic' | 'inorganic';

interface CategorySelectorProps {
  onSelectCategory: (category: Category) => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({ onSelectCategory }) => {
  const handleLogout = () => {
    clearActiveUser();
    clearRecDataCache();
    window.location.reload();
  };

  return (
    <div className="category-selector">
      <div className="category-selector-header">
        <button className="logout-button" onClick={handleLogout} title="ユーザー切替">
          ユーザー切替
        </button>
        <div><h1>Chemistry Drill</h1></div>
      </div>

      <div className="category-grid">
        <button 
          className="category-button"
          onClick={() => onSelectCategory('organic')}
        >
          <div className="category-title">有機化学</div><p className="category-subtitle">構造式・名称・反応・実験</p>
        </button>
        
        <button 
          className="category-button"
          onClick={() => onSelectCategory('inorganic')}
        >
          <div className="category-title">無機化学</div><p className="category-subtitle">反応式・生成物・観察事項</p>
        </button>
      </div>
      <details className="learning-records"><summary>学習記録・ランキングを見る</summary>
      {/* 成績表示パネル（mode指定なし = 最新） */}
      <UserStatsPanel />

      {/* 公開ランキング（mode指定なし = 全カテゴリ） */}
      <PublicRankingPanel />

      </details>
    </div>
  );
};

