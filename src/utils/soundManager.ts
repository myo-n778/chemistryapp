/**
 * 効果音管理ユーティリティ
 */

const SOUND_SET_KEY = 'chemistry-quiz-sound-set';

export type SoundSet = 0 | 1 | 2 | 3; // 0 = none (音無し), 1-3 = セット1-3

/**
 * 効果音ファイルのパスを取得
 */
const getSoundPath = (set: SoundSet, type: 'correct' | 'wrong'): string => {
  const baseUrl = import.meta.env.BASE_URL || '/';
  if (set === 1) {
    return type === 'correct' ? `${baseUrl}sound/1correct.mp3` : `${baseUrl}sound/1wrong.mp3`;
  } else if (set === 2) {
    return type === 'correct' ? `${baseUrl}sound/2correct.wav` : `${baseUrl}sound/2wrong.wav`;
  } else {
    return type === 'correct' ? `${baseUrl}sound/3correct.wav` : `${baseUrl}sound/3wrong.wav`;
  }
};

/**
 * 選択された効果音セットをlocalStorageから取得
 */
export const getSoundSet = (): SoundSet => {
  try {
    const stored = localStorage.getItem(SOUND_SET_KEY);
    if (stored) {
      const set = parseInt(stored, 10);
      if (set === 0 || set === 1 || set === 2 || set === 3) {
        return set as SoundSet;
      }
    }
  } catch (error) {
    console.warn('Failed to get sound set from localStorage:', error);
  }
  return 1; // デフォルトはセット1
};

/**
 * 選択された効果音セットをlocalStorageに保存
 */
export const setSoundSet = (set: SoundSet): void => {
  try {
    localStorage.setItem(SOUND_SET_KEY, String(set));
  } catch (error) {
    console.warn('Failed to save sound set to localStorage:', error);
  }
};

/**
 * 正解音を再生
 */
export const playCorrect = (): void => {
  const set = getSoundSet();
  if (set === 0) return; // none（音無し）の場合は再生しない
  const path = getSoundPath(set, 'correct');
  playSound(path);
};

/**
 * 不正解音を再生
 */
export const playWrong = (): void => {
  const set = getSoundSet();
  if (set === 0) return; // none（音無し）の場合は再生しない
  const path = getSoundPath(set, 'wrong');
  playSound(path);
};

/**
 * 音声ファイルを再生（共通処理）
 */
const playSound = (path: string): void => {
  try {
    const audio = new Audio(path);
    
    // エラーハンドリング
    audio.addEventListener('error', () => {
      console.warn('[SoundManager] Audio error:', audio.error, { path });
    });
    
    audio.currentTime = 0; // 連打対応：先頭から再生
    audio.volume = 1.0; // 音量を最大に設定
    const playPromise = audio.play();
    
    // Promise が reject される場合（自動再生制限など）に対応
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        // 自動再生制限エラーは無視（ユーザー操作後に再生可能になる）
        if (error.name !== 'NotAllowedError') {
          console.warn('[SoundManager] Failed to play sound:', error, { path });
        }
      });
    }
  } catch (error) {
    console.warn('[SoundManager] Failed to create audio:', error, { path });
  }
};

/**
 * テスト再生（UI操作時に使用）
 */
export const playTestSound = (set: SoundSet, type: 'correct' | 'wrong'): void => {
  if (set === 0) return; // none（音無し）の場合は再生しない
  const path = getSoundPath(set, type);
  playSound(path);
};
