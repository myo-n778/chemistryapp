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
        <div><p className="category-eyebrow">CHEMISTRY / 化学演習</p><h1>Chemistry Drill</h1></div>
      </div>
      <p className="category-description">今日の学習を、ここから。分野を選んで始めましょう。</p>

      <div className="category-grid">
        <button 
          className="category-button"
          onClick={() => onSelectCategory('organic')}
        >
          <span className="category-number">01 / ORGANIC</span><div className="category-title">有機化学</div><p className="category-subtitle">構造式・名称・反応・実験</p><span className="category-start">学習を始める →</span>
        </button>
        
        <button 
          className="category-button"
          onClick={() => onSelectCategory('inorganic')}
        >
          <span className="category-number">02 / INORGANIC</span><div className="category-title">無機化学</div><p className="category-subtitle">反応式・生成物・観察事項</p><span className="category-start">学習を始める →</span>
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

