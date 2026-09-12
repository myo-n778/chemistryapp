import { splitChemicalText } from '../utils/chemicalText';
export function ChemicalText({ text }: { text: string }) {
  return <>{splitChemicalText(text).map((part, index) => part.script === 'sub'
    ? <sub key={index} style={{ fontSize: '0.75em', lineHeight: 0 }}>{part.text}</sub>
    : part.script === 'sup'
      ? <sup key={index} style={{ fontSize: '0.75em', lineHeight: 0 }}>{part.text}</sup>
      : <span key={index}>{part.text}</span>)}</>;
}
