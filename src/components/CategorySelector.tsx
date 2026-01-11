import React, { useState, useEffect } from 'react';
import './CategorySelector.css';
import { getSoundSet, setSoundSet, playTestSound, SoundSet } from '../utils/soundManager';

export type Category = 'organic' | 'inorganic';

interface CategorySelectorProps {
  onSelectCategory: (category: Category) => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({ onSelectCategory }) => {
  const [soundSet, setSoundSetState] = useState<SoundSet>(1);

  // localStorageから初期値を読み込み
  useEffect(() => {
    setSoundSetState(getSoundSet());
  }, []);

  const handleSoundSetChange = (set: SoundSet) => {
    setSoundSetState(set);
    setSoundSet(set);
    // iOS/Safariの自動再生制限対応：ユーザー操作時にテスト再生
    playTestSound(set, 'correct');
  };

  return (
    <div className="category-selector">
      <h1>Chemistry Drill</h1>
      <p className="category-description">Please select a category</p>
      
      {/* 効果音セット選択 */}
      <div className="sound-set-selector">
        <label className="sound-set-label">効果音：</label>
        <div className="sound-set-buttons">
          <button
            className={`sound-set-button ${soundSet === 1 ? 'active' : ''}`}
            onClick={() => handleSoundSetChange(1)}
          >
            セット1
          </button>
          <button
            className={`sound-set-button ${soundSet === 2 ? 'active' : ''}`}
            onClick={() => handleSoundSetChange(2)}
          >
            セット2
          </button>
          <button
            className={`sound-set-button ${soundSet === 3 ? 'active' : ''}`}
            onClick={() => handleSoundSetChange(3)}
          >
            セット3
          </button>
        </div>
      </div>

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

