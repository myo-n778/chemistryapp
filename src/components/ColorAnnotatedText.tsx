import { ChemicalText } from './ChemicalText';
import { RenderMaybeTeX } from './RenderMaybeTeX';
import { CHEMICAL_COLORS, parseColorCues, splitColorText } from '../utils/inorganicColors';
import './ColorAnnotatedText.css';

interface Props { text: string; cues?: string; displayMode?: boolean; className?: string }
export function ColorAnnotatedText({ text, cues, displayMode = false, className = '' }: Props) {
  const parsed = parseColorCues(cues);
  // 化学式の構文を分断しない。色名は通常の文章だけで装飾する。
  if (!parsed.length || /\\ce[\[{]/.test(text)) {
    return <RenderMaybeTeX value={text} displayMode={displayMode} className={className} />;
  }
  return <span className={`color-annotated-text ${className}`}>
    {splitColorText(text, parsed).map((part, index) => part.cue ? (
      <span className="color-word" key={index}>
        <span className={`color-swatch${part.cue.color === '無色' ? ' color-swatch-clear' : ''}`}
          style={{ backgroundColor: CHEMICAL_COLORS[part.cue.color] }} aria-hidden="true"
          title={`${part.cue.color}${part.cue.state !== '未指定' ? `（${part.cue.state}）` : ''}の見本`} />
        {part.text}
      </span>
    ) : <span key={index}><ChemicalText text={part.text} /></span>)}
  </span>;
}
