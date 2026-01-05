/**
 * KaTeX + mhchem拡張のロード管理
 * グローバルに一度だけ初期化し、複数のコンポーネントで再利用
 */

let katexMhchemLoaded = false;
let katexMhchemPromise: Promise<void> | null = null;

/**
 * KaTeX + mhchem拡張をロード（一度だけ実行）
 */
export const loadKatexMhchem = (): Promise<void> => {
  if (katexMhchemLoaded) {
    return Promise.resolve();
  }

  if (katexMhchemPromise) {
    return katexMhchemPromise;
  }

  katexMhchemPromise = new Promise<void>((resolve, reject) => {
    // mhchem拡張スクリプトをロード
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/mhchem.min.js';
    script.async = true;
    script.onload = () => {
      console.log('[katexMhchemLoader] KaTeX mhchem extension loaded');
      katexMhchemLoaded = true;
      resolve();
    };
    script.onerror = () => {
      console.error('[katexMhchemLoader] Failed to load KaTeX mhchem extension');
      reject(new Error('Failed to load KaTeX mhchem extension'));
    };
    document.head.appendChild(script);
  });

  return katexMhchemPromise;
};

/**
 * KaTeX + mhchemがロード済みかどうかを確認
 */
export const isKatexMhchemLoaded = (): boolean => {
  return katexMhchemLoaded && !!(window as any).katex;
};

