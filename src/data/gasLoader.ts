import { Compound } from '../types';
import { Category } from '../components/CategorySelector';
import { PROBLEM_BASE_URL } from '../config/gasUrls';
import { parseCSV, csvToCompounds } from '../utils/csvParser';
import { parseReactionCSV, ReactionCSVRow } from '../utils/reactionParser';
import { parseExperimentCSV, ExperimentCSVRow } from '../utils/experimentParser';
import { InorganicReactionNew } from '../types/inorganic';

// StrictModeや同時マウントによる同一GETを共有。失敗後の自動再試行はしない。
const pending = new Map<string, Promise<Record<string, unknown>>>();
function requestProblem(type: string, category: Category): Promise<Record<string, unknown>> {
  const url = new URL(PROBLEM_BASE_URL);
  url.searchParams.set('type', type);
  url.searchParams.set('category', category);
  const key = url.toString();
  const existing = pending.get(key);
  if (existing) return existing;
  const request = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(key, { signal: controller.signal });
      if (response.status === 401 || response.status === 403) {
        throw new Error('問題データへのアクセスが拒否されました。管理者にGASの公開設定を確認してください。');
      }
      if (!response.ok) throw new Error(`問題データを取得できませんでした（HTTP ${response.status}）。`);
      const raw = await response.text();
      if (/^\s*</.test(raw)) throw new Error('問題データの代わりに認証画面が返されました。管理者にGASの公開設定を確認してください。');
      let data: unknown;
      try { data = JSON.parse(raw); }
      catch { throw new Error('問題データの形式が正しくありません。GASの応答を確認してください。'); }
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('問題データと異なる応答が返されました。接続先を確認してください。');
      const result = data as Record<string, unknown>;
      if (result.error) throw new Error(`問題データを取得できませんでした: ${String(result.error)}`);
      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw new Error('読み込みが15秒以内に完了しませんでした。通信状態を確認して再読み込みしてください。');
      if (error instanceof TypeError) throw new Error('問題データに接続できません。通信状態とGASの公開設定を確認してください。');
      throw error;
    } finally { clearTimeout(timer); }
  })();
  pending.set(key, request);
  void request.finally(() => pending.delete(key)).catch(() => {});
  return request;
}

export async function loadCompoundsFromGAS(category: Category): Promise<Compound[]> {
  const data = await requestProblem('compounds', category);
  if (typeof data.csv === 'string') return csvToCompounds(parseCSV(data.csv), []);
  if (Array.isArray(data.compounds)) return data.compounds as Compound[];
  throw new Error('化合物データの形式が正しくありません。');
}
export async function loadReactionsFromGAS(category: Category): Promise<ReactionCSVRow[]> {
  const data = await requestProblem('reactions', category);
  if (typeof data.csv === 'string') return parseReactionCSV(data.csv);
  if (Array.isArray(data.reactions)) return data.reactions as ReactionCSVRow[];
  throw new Error('反応データの形式が正しくありません。');
}
export async function loadExperimentsFromGAS(category: Category): Promise<ExperimentCSVRow[]> {
  const data = await requestProblem('experiment', category);
  if (typeof data.csv === 'string') return parseExperimentCSV(data.csv);
  if (Array.isArray(data.experiments)) return data.experiments as ExperimentCSVRow[];
  throw new Error('実験データの形式が正しくありません。');
}

/** 引用符内の改行・カンマ・二重引用符を保ったCSVレコード。 */
function csvRecords(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (c === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = '';
    } else cell += c;
  }
  if (quoted) throw new Error('無機化学CSVの引用符が閉じられていません。');
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function parseInorganicCSV(text: string): InorganicReactionNew[] {
  const [header, ...rows] = csvRecords(text.replace(/^\uFEFF/, ''));
  if (!header) return [];
  const field = (row: string[], ...names: string[]) => {
    for (const name of names) {
      const index = header.indexOf(name);
      if (index >= 0 && row[index]) return row[index];
    }
    return '';
  };
  for (const names of [['equation', 'equation_tex'], ['reactants', 'reactants_tex'], ['products', 'products_tex']]) {
    if (!names.some(name => header.includes(name))) throw new Error(`無機化学シートに必要な列がありません: ${names.join(' / ')}`);
  }
  return rows.map((row, i) => ({
    id: `inorganic-${i + 1}`,
    equation: field(row, 'equation', 'equation_tex'),
    equation_tex: field(row, 'equation_tex') || undefined,
    reactants: field(row, 'reactants', 'reaction_before_ja', 'reactants_tex'),
    reactants_tex: field(row, 'reactants_tex') || undefined,
    products: field(row, 'products', 'reaction_after_ja', 'products_tex'),
    products_tex: field(row, 'products_tex') || undefined,
    conditions: field(row, 'conditions'), observations: field(row, 'observations'),
    explanation: field(row, 'explanation', 'reaction_ja'),
    reactants_summary: field(row, 'reactants_summary', 'reaction_before_ja', 'reactants'),
    products_summary: field(row, 'products_summary', 'reaction_after_ja', 'products'),
  })).filter(row => row.equation && row.reactants && row.products);
}
export async function loadInorganicReactionsNewFromGAS(): Promise<InorganicReactionNew[]> {
  const data = await requestProblem('inorganic-new', 'inorganic');
  if (typeof data.csv === 'string') return parseInorganicCSV(data.csv);
  if (Array.isArray(data.reactions)) return data.reactions as InorganicReactionNew[];
  throw new Error('無機化学データの形式が正しくありません。');
}
