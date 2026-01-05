import React from 'react';
import { TeXRenderer } from './TeXRenderer';

/**
 * 選択肢表示コンポーネント
 * TeX文字列（\ce{}を含む）の場合は自動的にレンダリング
 */
interface ChoiceDisplayProps {
  text: string;
  className?: string;
}

export const ChoiceDisplay: React.FC<ChoiceDisplayProps> = ({ text, className = '' }) => {
  // \ce{}を含む場合はTeXとしてレンダリング
  const isTeX = text.includes('\\ce{') || text.includes('\\ce[');

  if (isTeX) {
    return (
      <TeXRenderer
        equation={text}
        displayMode={false}
        className={className}
      />
    );
  }

  // 通常のテキストとして表示
  return <span className={className}>{text}</span>;
};

