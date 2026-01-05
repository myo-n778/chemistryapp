/**
 * MathJaxの初期化とロード管理
 * グローバルに一度だけ初期化し、複数のコンポーネントで再利用
 */

let mathJaxPromise: Promise<void> | null = null;

/**
 * MathJaxを初期化（一度だけ実行）
 */
export const loadMathJax = (): Promise<void> => {
  if (mathJaxPromise) {
    return mathJaxPromise;
  }

  // 既にロード済みの場合は即座に解決
  if ((window as any).MathJax && (window as any).MathJax.typesetPromise) {
    mathJaxPromise = Promise.resolve();
    return mathJaxPromise;
  }

  mathJaxPromise = new Promise<void>((resolve, reject) => {
    // MathJaxの設定を先に設定（スクリプトロード前に設定する必要がある）
    (window as any).MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']],
        packages: { '[+]': ['mhchem'] },
        mhchem: { legacy: false }
      },
      startup: {
        ready: () => {
          const MathJax = (window as any).MathJax;
          MathJax.startup.defaultReady();
          console.log('[mathJaxLoader] MathJax initialized with mhchem support');
          resolve();
        }
      }
    };

    // MathJaxスクリプトをロード
    const script = document.createElement('script');
    script.id = 'MathJax-script';
    script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
    script.async = true;
    script.onerror = () => {
      console.error('[mathJaxLoader] Failed to load MathJax');
      reject(new Error('Failed to load MathJax'));
    };
    document.head.appendChild(script);
  });

  return mathJaxPromise;
};

/**
 * MathJaxがロード済みかどうかを確認
 */
export const isMathJaxLoaded = (): boolean => {
  return !!(window as any).MathJax && !!(window as any).MathJax.typesetPromise;
};

