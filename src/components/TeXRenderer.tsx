import React, { useEffect, useRef, useState } from 'react';
import { loadMathJax, isMathJaxLoaded } from '../utils/mathJaxLoader';

interface TeXRendererProps {
  equation: string;
  displayMode?: boolean;
  className?: string;
}

/**
 * MathJaxを使用してTeX数式をレンダリング（mhchem拡張対応）
 * MathJax 3.xはmhchem拡張を標準でサポート
 */
export const TeXRenderer: React.FC<TeXRendererProps> = ({
  equation,
  displayMode = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mathJaxLoaded, setMathJaxLoaded] = useState(isMathJaxLoaded());

  // MathJaxを動的にロード（一度だけ実行）
  useEffect(() => {
    if (mathJaxLoaded) return;

    loadMathJax()
      .then(() => {
        setMathJaxLoaded(true);
      })
      .catch((error) => {
        console.error('[TeXRenderer] Failed to load MathJax:', error);
      });
  }, [mathJaxLoaded]);

  // 数式をレンダリング
  useEffect(() => {
    if (!containerRef.current || !equation || !mathJaxLoaded) return;

    const container = containerRef.current;
    
    // 既存の内容をクリア
    container.innerHTML = '';

    try {
      const mathJax = (window as any).MathJax;
      if (!mathJax || !mathJax.typesetPromise) {
        // MathJaxがまだロードされていない場合はテキストを表示
        container.textContent = equation;
        return;
      }

      // 数式をテキストとして設定
      const mathElement = document.createElement(displayMode ? 'div' : 'span');
      // \ce{}コマンドを含むTeXをそのまま設定
      mathElement.textContent = equation;
      mathElement.style.display = displayMode ? 'block' : 'inline';
      container.appendChild(mathElement);

      // MathJaxでレンダリング（mhchem拡張が自動的に\ce{}を処理）
      mathJax.typesetPromise([mathElement]).then(() => {
        // レンダリング完了
        console.log('[TeXRenderer] Successfully rendered:', equation);
      }).catch((err: Error) => {
        console.error('[TeXRenderer] MathJax rendering error:', err, 'Equation:', equation);
        container.textContent = equation;
      });
    } catch (error) {
      console.error('[TeXRenderer] Error rendering TeX:', error, 'Equation:', equation);
      if (container) {
        container.textContent = equation;
      }
    }
  }, [equation, displayMode, mathJaxLoaded]);

  return (
    <div
      ref={containerRef}
      className={`tex-renderer ${className}`}
      style={{
        display: displayMode ? 'block' : 'inline-block',
        margin: displayMode ? '1em 0' : '0',
      }}
    />
  );
};

/**
 * 通常表示とTeX表示を切り替えるコンポーネント
 */
interface TeXToggleProps {
  plainText: string;
  texEquation?: string;
  defaultMode?: 'plain' | 'tex';
}

export const TeXToggle: React.FC<TeXToggleProps> = ({
  plainText,
  texEquation,
  defaultMode = 'plain',
}) => {
  const [mode, setMode] = React.useState<'plain' | 'tex'>(defaultMode);

  if (!texEquation) {
    return <span>{plainText}</span>;
  }

  return (
    <div className="tex-toggle">
      <div className="tex-toggle-controls">
        <button
          className={`tex-toggle-button ${mode === 'plain' ? 'active' : ''}`}
          onClick={() => setMode('plain')}
        >
          通常表示
        </button>
        <button
          className={`tex-toggle-button ${mode === 'tex' ? 'active' : ''}`}
          onClick={() => setMode('tex')}
        >
          TeX表示
        </button>
      </div>
      <div className="tex-toggle-content">
        {mode === 'plain' ? (
          <span>{plainText}</span>
        ) : (
          <TeXRenderer equation={texEquation} displayMode={true} />
        )}
      </div>
    </div>
  );
};
