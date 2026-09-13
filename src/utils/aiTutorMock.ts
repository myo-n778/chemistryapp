// Local preview only. No provider API, credential, or network access.
export interface TutorQuestion {
  id: string; mode: string; category: string; prompt: string;
  correct: string; selected: string; explanation?: string;
  correctId?: string; selectedId?: string; structure?: unknown;
}
export type TutorAction = 'difference' | 'simple' | 'question';
export interface TutorReply { conclusion: string; distinction: string; checkQuestion: string }
export function isTutorPreview() {
  return import.meta.env.DEV && ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
    && new URLSearchParams(location.search).get('aiMock') === '1';
}
export function mockTutorReply(q: TutorQuestion, action: TutorAction, question: string, signal: AbortSignal): Promise<TutorReply> {
  const scenario = new URLSearchParams(location.search).get('aiMockScenario');
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout>;
    const abort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
    if (signal.aborted) { abort(); return; }
    signal.addEventListener('abort', abort, { once: true });
    timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      if (scenario === 'error') { reject(new Error('mock-error')); return; }
      if (scenario === 'invalid') { reject(new Error('invalid-response')); return; }
      // Deterministic sample: never present this as a generated answer to free text.
      resolve({
        conclusion: action === 'question' ? `質問「${question}」を受け付けました。これは操作確認用の応答で、質問へのAI回答ではありません。` : `この問題の正解は「${q.correct}」です。`,
        distinction: action === 'difference' && q.selected !== q.correct
          ? `選んだ答えは「${q.selected}」。既存の解説で違いを確認しましょう。${q.explanation || ''}`
          : `既存の解説：${q.explanation || 'この問題には解説が登録されていません。'}`,
        checkQuestion: '正解を選ぶ手がかりを、自分の言葉で説明できますか？',
      });
    }, scenario === 'timeout' ? 60000 : scenario === 'slow' ? 2500 : 450);
  });
}
