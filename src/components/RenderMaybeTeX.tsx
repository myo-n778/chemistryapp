import React from 'react';
import { TeXRenderer } from './TeXRenderer';

/**
 * TeX文字列（\ce{}を含む）を自動検出してレンダリングするラッパーコンポーネント
 * すべてのテキスト表示を統一するために使用
 */
interface RenderMaybeTeXProps {
  value: string;
  displayMode?: boolean;
  className?: string;
}

/**
 * \ce{}を含む文字列を正規化（必要に応じて）
 */
function normalizeChemTeX(value: string): string {
  // 既に\ce{}で囲まれている場合はそのまま返す
  if (value.trim().startsWith('\\ce{') && value.trim().endsWith('}')) {
    return value.trim();
  }
  // \ce{}を含むが、全体が\ce{}で囲まれていない場合は、そのまま返す（既に正しい形式の可能性がある）
  if (value.includes('\\ce{')) {
    return value;
  }
  return value;
}

export const RenderMaybeTeX: React.FC<RenderMaybeTeXProps> = ({
  value,
  displayMode = false,
  className = '',
}) => {
  // \ce{}を含む場合はTeXとしてレンダリング
  if (value.includes('\\ce{') || value.includes('\\ce[')) {
    return (
      <TeXRenderer
        equation={normalizeChemTeX(value)}
        displayMode={displayMode}
        className={className}
      />
    );
  }

  // 通常のテキストとして表示
  return <span className={className}>{value}</span>;
};

