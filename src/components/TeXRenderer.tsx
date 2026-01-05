import React, { useEffect, useRef, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { loadKatexMhchem, isKatexMhchemLoaded } from '../utils/katexMhchemLoader';

interface TeXRendererProps {
  equation: string;
  displayMode?: boolean;
  className?: string;
}

/**
 * KaTeXを使用してTeX数式をレンダリング（mhchem拡張対応）
 * \ce{}コマンドを正しく処理
 */
export const TeXRenderer: React.FC<TeXRendererProps> = ({
  equation,
  displayMode = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mhchemLoaded, setMhchemLoaded] = useState(isKatexMhchemLoaded());

  // mhchem拡張をロード（一度だけ実行）
  useEffect(() => {
    if (mhchemLoaded) return;

    loadKatexMhchem()
      .then(() => {
        setMhchemLoaded(true);
      })
      .catch((error) => {
        console.error('[TeXRenderer] Failed to load KaTeX mhchem:', error);
      });
  }, [mhchemLoaded]);

  // 数式をレンダリング
  useEffect(() => {
    if (!containerRef.current || !equation) return;

    const container = containerRef.current;
    
    // 既存の内容をクリア
    container.innerHTML = '';

    try {
      // KaTeXでレンダリング（mhchem拡張がロードされていれば\ce{}が自動的に処理される）
      katex.render(equation, container, {
        displayMode,
        throwOnError: false,
        errorColor: '#cc0000',
        // mhchem拡張は自動的に有効化される（mhchem.min.jsがロードされていれば）
      });
      
      console.log('[TeXRenderer] Successfully rendered:', equation.substring(0, 50));
    } catch (error) {
      console.error('[TeXRenderer] Error rendering TeX:', error, 'Equation:', equation);
      if (container) {
        container.textContent = equation;
      }
    }
  }, [equation, displayMode, mhchemLoaded]);

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
