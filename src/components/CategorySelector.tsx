import React from 'react';
import './CategorySelector.css';

export type Category = 'organic' | 'inorganic';

interface CategorySelectorProps {
  onSelectCategory: (category: Category) => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({ onSelectCategory }) => {
  return (
    <div className="category-selector">
      <h1>Chemistry Drill</h1>
      <p className="category-description">カテゴリを選択してください</p>
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

