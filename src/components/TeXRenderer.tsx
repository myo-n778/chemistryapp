import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface TeXRendererProps {
  equation: string;
  displayMode?: boolean;
  className?: string;
}

/**
 * KaTeXを使用してTeX数式をレンダリング
 * mhchem拡張はKaTeXに標準で含まれていないため、\ce{}コマンドを処理する必要がある
 */
export const TeXRenderer: React.FC<TeXRendererProps> = ({
  equation,
  displayMode = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !equation) return;

    try {
      // \ce{}コマンドを処理（簡易版）
      // 実際のmhchem拡張を使う場合は、別途ライブラリが必要
      let processedEquation = equation;
      
      // \ce{...}を処理（簡易実装）
      processedEquation = processedEquation.replace(/\\ce\{([^}]+)\}/g, (_match, content) => {
        // 基本的な化学式の変換
        // 例: \ce{H2O} -> H_2O, \ce{NaCl} -> NaCl
        return content
          .replace(/([A-Z][a-z]?)(\d+)/g, '$1_{$2}') // 下付き数字
          .replace(/([A-Z][a-z]?)\+/g, '$1^+') // 陽イオン
          .replace(/([A-Z][a-z]?)\-/g, '$1^-') // 陰イオン
          .replace(/->/g, '\\rightarrow') // 矢印
          .replace(/<=>/g, '\\rightleftharpoons') // 平衡矢印
          .replace(/↑/g, '\\uparrow') // 気体
          .replace(/↓/g, '\\downarrow'); // 沈殿
      });

      // KaTeXでレンダリング
      katex.render(processedEquation, containerRef.current, {
        displayMode,
        throwOnError: false,
        errorColor: '#cc0000',
      });
    } catch (error) {
      console.error('Error rendering TeX:', error);
      if (containerRef.current) {
        containerRef.current.textContent = equation;
      }
    }
  }, [equation, displayMode]);

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

