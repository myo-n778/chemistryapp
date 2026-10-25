import React, { useState, useEffect } from 'react';
import { getSoundSet, setSoundSet, playTestSound, SoundSet } from '../utils/soundManager';
import './SoundSelector.css';

export const SoundSelector: React.FC = () => {
  const [soundSet, setSoundSetState] = useState<SoundSet>(0);
  const [isExpanded, setIsExpanded] = useState(false);

  // 音はページを開くたびにOFF。現在のページ内の明示選択だけを反映。
  useEffect(() => {
    const update = () => setSoundSetState(getSoundSet());
    update();
    window.addEventListener('quiz-sound-change', update);
    return () => window.removeEventListener('quiz-sound-change', update);
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
        aria-expanded={isExpanded}
        aria-label={`効果音 ${soundSet === 0 ? 'OFF' : 'ON'}`}
      >
        {soundSet === 0 ? '音 OFF' : `音 ON (${soundSet})`}
      </button>
      {isExpanded && (
        <div className="sound-selector-expanded">
          <div className="sound-selector-buttons">
            <button
              className={`sound-selector-button ${soundSet === 0 ? 'active' : ''}`}
              aria-pressed={soundSet === 0}
              onClick={() => handleSoundSetChange(0)}
              title="音無し"
            >
              OFF
            </button>
            <button
              className={`sound-selector-button ${soundSet === 1 ? 'active' : ''}`}
              aria-pressed={soundSet === 1}
              onClick={() => handleSoundSetChange(1)}
              title="セット1"
            >
              1
            </button>
            <button
              className={`sound-selector-button ${soundSet === 2 ? 'active' : ''}`}
              aria-pressed={soundSet === 2}
              onClick={() => handleSoundSetChange(2)}
              title="セット2"
            >
              2
            </button>
            <button
              className={`sound-selector-button ${soundSet === 3 ? 'active' : ''}`}
              aria-pressed={soundSet === 3}
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
