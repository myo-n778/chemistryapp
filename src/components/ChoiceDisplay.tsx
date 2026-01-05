import React from 'react';
import { RenderMaybeTeX } from './RenderMaybeTeX';

/**
 * 選択肢表示コンポーネント
 * RenderMaybeTeXを使用して統一
 */
interface ChoiceDisplayProps {
  text: string;
  className?: string;
}

export const ChoiceDisplay: React.FC<ChoiceDisplayProps> = ({ text, className = '' }) => {
  return <RenderMaybeTeX value={text} displayMode={false} className={className} />;
};

