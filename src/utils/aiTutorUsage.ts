// AI回答が画面に表示された回数。上限管理とは別に、この端末・利用者ごとに保存する。
export interface TutorUsage { organic: number; inorganic: number }
const memory = new Map<string, TutorUsage>();
const keyFor = (userKey: string | null) => `chem.aiUsage.v1:${JSON.stringify(userKey)}`;
const validCount = (value: unknown): number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value < Number.MAX_SAFE_INTEGER / 2 ? value : 0;
export function readTutorUsage(userKey: string | null): TutorUsage {
  const key = keyFor(userKey);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const value = JSON.parse(raw);
      const saved = memory.get(key);
      return { organic: Math.max(validCount(value?.organic), saved?.organic || 0), inorganic: Math.max(validCount(value?.inorganic), saved?.inorganic || 0) };
    }
  } catch { /* 保存できない環境では、このページ内の計数を使う。 */ }
  return memory.get(key) || { organic: 0, inorganic: 0 };
}
export function recordTutorDisplay(userKey: string | null, category: 'organic' | 'inorganic'): TutorUsage {
  const key = keyFor(userKey);
  const usage = readTutorUsage(userKey);
  const next = { ...usage, [category]: usage[category] + 1 };
  memory.set(key, next);
  try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* 回答の表示は継続する。 */ }
  return next;
}
