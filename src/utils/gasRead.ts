/** GASのGETだけを共有する。POST・保存処理には使わない。自動再試行なし。 */
export const GAS_READ_TIMEOUT_MS = 45000;
const pending = new Map<string, Promise<string>>();

export function readGasText(url: string, label: string): Promise<string> {
  const existing = pending.get(url);
  if (existing) return existing;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<string>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`${label}の読み込みが45秒以内に完了しませんでした。通信状態を確認し、再読み込みしてください。`));
    }, GAS_READ_TIMEOUT_MS);
  });
  const fetchText = (async () => {
    const response = await fetch(url, { signal: controller.signal });
    if (response.status === 401 || response.status === 403) throw new Error(`${label}へのアクセスが拒否されました。管理者に公開設定を確認してください。`);
    if (!response.ok) throw new Error(`${label}を取得できませんでした（HTTP ${response.status}）。`);
    const text = await response.text();
    if (/^\s*</.test(text)) throw new Error(`${label}の代わりに認証画面が返されました。管理者に公開設定を確認してください。`);
    return text;
  })();
  // 中断通知を待たない環境でも、UIは必ず制限時間で待機を終了する。
  const task = Promise.race([fetchText, timeout]).catch(error => {
    if (controller.signal.aborted) throw new Error(`${label}の読み込みが45秒以内に完了しませんでした。通信状態を確認し、再読み込みしてください。`);
    if (error instanceof TypeError) throw new Error(`${label}に接続できません。通信状態と公開設定を確認してください。`);
    throw error;
  }).finally(() => { clearTimeout(timer); });
  pending.set(url, task);
  void task.finally(() => pending.delete(url)).catch(() => {});
  return task;
}
