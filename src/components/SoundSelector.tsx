import React, { useState, useEffect } from 'react';
import { getSoundSet, setSoundSet, playTestSound, SoundSet } from '../utils/soundManager';
import './SoundSelector.css';

export const SoundSelector: React.FC = () => {
  const [soundSet, setSoundSetState] = useState<SoundSet>(1);
  const [isExpanded, setIsExpanded] = useState(false);

  // localStorageから初期値を読み込み
  useEffect(() => {
    setSoundSetState(getSoundSet());
  }, []);

  const handleSoundSetChange = (set: SoundSet) => {
    setSoundSetState(set);
    setSoundSet(set);
    // iOS/Safariの自動再生制限対応：ユーザー操作時にテスト再生（noneの場合は再生しない）
    playTestSound(set, 'correct');
    setIsExpanded(false); // 選択後に閉じる
  };

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="sound-selector-global">
      <button
        className="sound-selector-toggle"
        onClick={handleToggle}
        title="効果音を選択"
      >
        sound
      </button>
      {isExpanded && (
        <div className="sound-selector-expanded">
          <div className="sound-selector-buttons">
            <button
              className={`sound-selector-button ${soundSet === 0 ? 'active' : ''}`}
              onClick={() => handleSoundSetChange(0)}
              title="音無し"
            >
              none
            </button>
            <button
              className={`sound-selector-button ${soundSet === 1 ? 'active' : ''}`}
              onClick={() => handleSoundSetChange(1)}
              title="セット1"
            >
              1
            </button>
            <button
              className={`sound-selector-button ${soundSet === 2 ? 'active' : ''}`}
              onClick={() => handleSoundSetChange(2)}
              title="セット2"
            >
              2
            </button>
            <button
              className={`sound-selector-button ${soundSet === 3 ? 'active' : ''}`}
              onClick={() => handleSoundSetChange(3)}
              title="セット3"
            >
              3
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
