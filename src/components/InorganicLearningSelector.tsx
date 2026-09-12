import { useState, useEffect } from 'react';
import type { QuizSettings } from '../App';
import type { InorganicReactionNew } from '../types/inorganic';
import { getInorganicUnits, InorganicLearningMode, learningModeLabels } from '../utils/inorganicUnits';
import './InorganicLearningSelector.css';

export function InorganicLearningSelector({ reactions, onSelectSettings, onBack }: {
  reactions: InorganicReactionNew[]; onSelectSettings: (settings: QuizSettings) => void; onBack: () => void;
}) {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const units = getInorganicUnits(reactions);
  const [mode, setMode] = useState<InorganicLearningMode>('unit-sequential');
  const [unitId, setUnitId] = useState(() => units.find(u => u.reactions.length)?.id ?? '');
  const [count, setCount] = useState<number | null>(10);
  const selected = units.find(u => u.id === unitId);
  const total = mode === 'global-shuffle' ? Math.min(count ?? reactions.length, reactions.length) : selected?.reactions.length ?? 0;
  return <section className="inorganic-learning-selector">
    <button className="learning-back" onClick={onBack}>← 出題タイプに戻る</button>
    <h1>無機化学の学習設定</h1>
    <p>まずは単元順で覚え、慣れたら順番を混ぜて確かめましょう。</p>
    <div className="learning-mode-list" role="group" aria-label="出題の進め方">
      {(Object.keys(learningModeLabels) as InorganicLearningMode[]).map(value => <button key={value} aria-pressed={mode === value} onClick={() => setMode(value)}>
        <strong>{learningModeLabels[value]}</strong>
        <span>{value === 'unit-sequential' ? '選んだ単元を学習順に' : value === 'unit-shuffle' ? '選んだ単元だけ順番を混ぜる' : '全単元から混ぜて出題'}</span>
      </button>)}
    </div>
    {mode === 'global-shuffle' ? <fieldset className="learning-count"><legend>出題数（全{reactions.length}問）</legend>
      {[10,20,null].map(n => <button key={n ?? 'all'} aria-pressed={count === n} onClick={() => setCount(n)}>{n === null ? '全問' : `${n}問`}</button>)}
    </fieldset> : <>
      <h2>学習する単元</h2>
      <div className="learning-unit-list" role="group" aria-label="単元">
        {units.map((u, index) => <button key={u.id} disabled={!u.reactions.length} aria-pressed={unitId === u.id} onClick={() => setUnitId(u.id)}>
          <strong>{index + 1}. {u.title}</strong><span>{u.description}</span>
          <span>{u.reactions.length ? `${u.reactions.length}問` : 'この出題タイプの問題はありません'}</span>
        </button>)}
      </div>
    </>}
    <p className="learning-hint">選択肢の位置は、どのモードでもランダムです。</p>
    <button className="learning-start" disabled={!total} onClick={() => onSelectSettings({
      questionCountMode: 'all', orderMode: mode === 'unit-sequential' ? 'sequential' : 'shuffle',
      learningMode: mode, unitId: mode === 'global-shuffle' ? undefined : unitId, allQuestionCount: total
    })}>{total}問を始める</button>
  </section>;
}
