/**
 * KaTeX + mhchem拡張のロード管理（グローバルに一度だけ初期化）
 * TeXTest.tsxの成功パターンをベースに実装
 */

import katex from 'katex';

let mhchemLoaded = false;
let mhchemLoadPromise: Promise<void> | null = null;

/**
 * KaTeX + mhchem拡張をロード（一度だけ実行）
 * 重要: window.katexにnpmのkatexインスタンスを設定することで、
 * mhchem拡張が正しいKaTeXインスタンスに対して登録される
 */
export const loadKatexMhchem = (): Promise<void> => {
  if (mhchemLoaded) {
    return Promise.resolve();
  }

  if (mhchemLoadPromise) {
    return mhchemLoadPromise;
  }

  // KaTeXが既にロードされていることを確認
  if (typeof katex === 'undefined') {
    const error = new Error('KaTeX is not loaded');
    console.error('[katexMhchemLoader]', error);
    return Promise.reject(error);
  }

  // window.katexにnpmのkatexインスタンスを設定
  // これにより、mhchem.min.jsが正しいKaTeXインスタンスに対してmhchemを登録できる
  (window as any).katex = katex;

  mhchemLoadPromise = new Promise<void>((resolve, reject) => {
    // mhchem拡張スクリプトをロード
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/mhchem.min.js';
    script.async = true;
    script.onload = () => {
      console.log('[katexMhchemLoader] mhchem extension loaded');
      console.log('[katexMhchemLoader] katex.__defineMacro:', typeof (katex as any).__defineMacro);
      mhchemLoaded = true;
      resolve();
    };
    script.onerror = () => {
      const error = new Error('Failed to load mhchem extension');
      console.error('[katexMhchemLoader]', error);
      mhchemLoadPromise = null; // リトライ可能にする
      reject(error);
    };
    document.head.appendChild(script);
  });

  return mhchemLoadPromise;
};

/**
 * mhchem拡張がロード済みかどうかを確認
 */
export const isKatexMhchemLoaded = (): boolean => {
  return mhchemLoaded && typeof katex !== 'undefined';
};
