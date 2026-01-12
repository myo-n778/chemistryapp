import React from 'react';
import { UserStatsPanel } from './UserStatsPanel';
import { PublicRankingPanel } from './PublicRankingPanel';
import { clearActiveUser } from '../utils/sessionLogger';
import './CategorySelector.css';

export type Category = 'organic' | 'inorganic';

interface CategorySelectorProps {
  onSelectCategory: (category: Category) => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({ onSelectCategory }) => {
  const handleLogout = () => {
    clearActiveUser();
    window.location.reload();
  };

  return (
    <div className="category-selector">
      <div className="category-selector-header">
        <button className="logout-button" onClick={handleLogout} title="ユーザー切替">
          ユーザー切替
        </button>
        <h1>Chemistry Drill</h1>
      </div>
      <p className="category-description">Please select a category</p>

      {/* 成績表示パネル（mode指定なし = 最新） */}
      <UserStatsPanel />

      {/* 公開ランキング（mode指定なし = 全カテゴリ） */}
      <PublicRankingPanel />

      <div className="category-grid">
        <button 
          className="category-button"
          onClick={() => onSelectCategory('organic')}
        >
          <div className="category-title">Organic Chemistry</div>
        </button>
        
        <button 
          className="category-button"
          onClick={() => onSelectCategory('inorganic')}
        >
          <div className="category-title">Inorganic Chemistry</div>
        </button>
      </div>
    </div>
  );
};

