import { ChemicalText } from './ChemicalText';
interface Props { point?: string; reason?: string }
export function LearningPoint({ point, reason }: Props) {
  if (!point) return null;
  return <section className="learning-point" style={{ margin: '1rem 0', padding: '0.9rem', border: '1px solid #9a762f', borderRadius: '8px', background: 'rgba(255, 191, 64, 0.08)', textAlign: 'left', overflowWrap: 'anywhere', minWidth: 0 }}>
    <strong>覚えるポイント</strong>
    <p style={{ margin: '0.4rem 0 0', lineHeight: 1.7 }}><ChemicalText text={point} /></p>
    {reason && reason !== point && <p style={{ margin: '0.5rem 0 0', lineHeight: 1.7 }}><strong>選んだ答えとの違い：</strong><ChemicalText text={reason} /></p>}
  </section>;
}
