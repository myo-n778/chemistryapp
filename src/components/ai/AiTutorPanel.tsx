import { isTutorEnabled, isTutorLive, openTutorSession, requestTutorReply, tutorErrorMessage, TutorClientError } from '../../utils/aiTutorClient';
import { useEffect, useId, useRef, useState } from 'react';
import { ChemicalText } from '../ChemicalText';
import { mockTutorReply, type TutorAction, type TutorQuestion, type TutorReply } from '../../utils/aiTutorMock';
import { useTutorBudget } from './AiTutorSession';
import { getActiveUserKey } from '../../utils/sessionLogger';
import { readTutorUsage, recordTutorDisplay } from '../../utils/aiTutorUsage';
import './AiTutorPanel.css';

export function AiTutorPanel({ question }: { question: TutorQuestion }) {
  if (!isTutorEnabled()) return null;
  return <TutorPanel key={`${question.category}:${question.mode}:${question.id}`} question={question} />;
}
function TutorPanel({ question }: { question: TutorQuestion }) {
  const budget = useTutorBudget();
  const live = isTutorLive();
  const id = useId();
  const usageCategory = question.category === 'inorganic' ? 'inorganic' : 'organic';
  const [usageOwner] = useState(getActiveUserKey);
  const [usage, setUsage] = useState(() => readTutorUsage(usageOwner));
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<{ label: string; reply: TutorReply }[]>([]);
  const [last, setLast] = useState<{action: TutorAction; text: string} | null>(null);
  const active = useRef<AbortController | null>(null);
  const key = `${question.category}:${question.mode}:${question.id}`;
  const count = budget?.questions.get(key) || 0;
  const total = budget?.total || 0;
  const exhausted = count >= 3 || total >= 20;
  useEffect(() => () => { active.current?.abort(); active.current = null; }, []);

  const send = async (action: TutorAction, text = '') => {
    if (!budget || active.current || (budget.questions.get(key) || 0) >= 3 || budget.total >= 20) return;
    if (action === 'question' && (!text.trim() || text.length > 300)) return;
    budget.total++; budget.questions.set(key, (budget.questions.get(key) || 0) + 1);
    const controller = new AbortController(); active.current = controller;
    setBusy(true); setError(''); setLast({ action, text });
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 30000);
    try {
      let reply: TutorReply;
      if (live) {
        if (!budget.liveSession) budget.liveSession = await openTutorSession(controller.signal);
        const result = await requestTutorReply(question, action, text.trim(), controller.signal, budget.liveSession);
        budget.total = result.budget.sessionUsed; budget.questions.set(key, result.budget.questionUsed);
        reply = result.reply;
      } else reply = await mockTutorReply(question, action, text.trim(), controller.signal);
      if (active.current !== controller || controller.signal.aborted) return;
      if (live) setUsage(recordTutorDisplay(usageOwner, usageCategory));
      setHistory(h => [...h, {label: action === 'question' ? text.trim() : action === 'simple' ? 'もっとやさしく説明して' : '答えの理由を確認', reply}]);
      if (action === 'question') setInput('');
    } catch (failure) {
      if (active.current !== controller) return;
      if (failure instanceof TutorClientError && failure.budget) {
        budget.total = failure.budget.sessionUsed; budget.questions.set(key, failure.budget.questionUsed);
      }
      if (!controller.signal.aborted || timedOut) setError(timedOut ? '説明の待ち時間を超えました。通常の解説で学習を続けられます。' : live ? tutorErrorMessage(failure) : '説明を取得できませんでした。通常の解説で学習を続けられます。');
    } finally {
      clearTimeout(timer);
      if (active.current === controller) { active.current = null; setBusy(false); }
    }
  };
  return <section className="ai-tutor" data-question-id={question.id} data-mode={question.mode}
    onClick={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
    <button type="button" className="ai-tutor-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(v => !v)}>
      <span>AIに聞く</span><span aria-hidden="true">{open ? '−' : '＋'}</span>
    </button>
    {open && <div id={id} className="ai-tutor-body">
      <p className="ai-tutor-preview">{live ? 'AIによる学習サポート' : '操作プレビュー · AI未接続'}</p>
      <p className="ai-tutor-count" role="status">{question.category === 'organic' ? '有機' : '無機'} {usage[usageCategory]}回 · 通算 {usage.organic + usage.inorganic}回</p>
      <div className="ai-tutor-actions">
        <button type="button" disabled={busy || exhausted} onClick={() => void send('difference')}>{question.correct === question.selected ? '正解の理由' : '選んだ答えとの違い'}</button>
        <button type="button" disabled={busy || exhausted} onClick={() => void send('simple')}>やさしく説明</button>
      </div>
      <details className="ai-tutor-question">
        <summary>自分の言葉で質問する</summary>
      <form onSubmit={e => { e.preventDefault(); void send('question', input); }}>
        <label htmlFor={`${id}-question`}>この問題について質問する</label>
        <textarea id={`${id}-question`} value={input} maxLength={300} rows={2}
          placeholder="この問題について、分からないところを書いてください" aria-describedby={`${id}-hint`}
          onChange={e => setInput(e.target.value)} disabled={busy || exhausted} />
        <p id={`${id}-hint`} className="ai-tutor-hint">氏名などの個人情報は入力しないでください。{input.length}/300文字</p>
        <button type="submit" disabled={busy || exhausted || !input.trim()}>質問を送る</button>
      </form>
      </details>
      <div role="status" aria-live="polite">{busy ? '説明を準備しています。待たずに次の問題へ進めます。' : ''}</div>
      {error && <div className="ai-tutor-error" role="alert"><p>{error}</p>{last && !exhausted && <button type="button" disabled={busy} onClick={() => void send(last.action, last.text)}>再試行する</button>}</div>}
      {exhausted && <p role="status">{total >= 20 ? 'この学習の利用上限に達しました。' : 'この問題の利用上限に達しました。'}通常の演習は続けられます。</p>}
      <div className="ai-tutor-history" aria-live="polite" aria-relevant="additions">
        {history.map((item, i) => <article key={i} className="ai-tutor-reply">
          <p className="ai-tutor-request">{item.label}</p>
          <strong>結論</strong><p><ChemicalText text={item.reply.conclusion} /></p>
          <strong>区別するポイント</strong><p><ChemicalText text={item.reply.distinction} /></p>
          <strong>確認の問い</strong><p>{item.reply.checkQuestion}</p>
        </article>)}
      </div>
    </div>}
  </section>;
}
