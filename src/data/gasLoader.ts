import { readGasText } from '../utils/gasRead';
import { parseLearningChoices, validateLearningChoices } from '../utils/learningChoices';
import { Compound } from '../types';
import { Category } from '../components/CategorySelector';
import { PROBLEM_BASE_URL } from '../config/gasUrls';
import { parseCSV, csvToCompounds } from '../utils/csvParser';
import { parseReactionCSV, ReactionCSVRow } from '../utils/reactionParser';
import { parseExperimentCSV, ExperimentCSVRow } from '../utils/experimentParser';
import { InorganicReactionNew } from '../types/inorganic';

// 検証を通過した教材だけを1分再利用する。失敗応答は保存しない。
const problemCache = new Map<string, { data: unknown[]; expires: number }>();
async function loadProblem<T>(type: string, category: Category, parse: (data: Record<string, unknown>) => T[]): Promise<T[]> {
  const key = `${category}:${type}`;
  const saved = problemCache.get(key);
  if (saved && saved.expires > Date.now()) return saved.data as T[];
  const data = parse(await requestProblem(type, category));
  if (data.length) problemCache.set(key, { data, expires: Date.now() + 60000 });
  return data;
}
// 同時GETはreadGasTextで共有。タイムアウト後の自動再試行はしない。
async function requestProblem(type: string, category: Category): Promise<Record<string, unknown>> {
  const url = new URL(PROBLEM_BASE_URL);
  url.searchParams.set('type', type);
  url.searchParams.set('category', category);
  const label = type === 'compounds' ? '化合物データ' : type === 'reactions' ? '反応データ' : type === 'experiment' ? '実験データ' : '無機問題データ';
  const raw = await readGasText(url.toString(), label);
  let data: unknown;
  try { data = JSON.parse(raw); }
  catch { throw new Error(`${label}の形式が正しくありません。GASの応答を確認してください。`); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(`${label}と異なる応答が返されました。接続先を確認してください。`);
  const result = data as Record<string, unknown>;
  if (result.error) throw new Error(`${label}を取得できませんでした: ${String(result.error)}`);
  return result;
}

export async function loadCompoundsFromGAS(category: Category): Promise<Compound[]> {
  return loadProblem('compounds', category, data => {
    if (typeof data.csv === 'string') return csvToCompounds(parseCSV(data.csv), []);
    if (Array.isArray(data.compounds)) return data.compounds as Compound[];
    throw new Error('化合物データの形式が正しくありません。');
  });
}
export async function loadReactionsFromGAS(category: Category): Promise<ReactionCSVRow[]> {
  return loadProblem('reactions', category, data => {
    if (typeof data.csv === 'string') return parseReactionCSV(data.csv);
    if (Array.isArray(data.reactions)) return data.reactions as ReactionCSVRow[];
    throw new Error('反応データの形式が正しくありません。');
  });
}
export async function loadExperimentsFromGAS(category: Category): Promise<ExperimentCSVRow[]> {
  return loadProblem('experiment', category, data => {
    if (typeof data.csv === 'string') return parseExperimentCSV(data.csv).filter(row => (row.category || 'organic') === category);
    if (Array.isArray(data.experiments)) return (data.experiments as ExperimentCSVRow[]).filter(row => (row.category || 'organic') === category);
    throw new Error('実験データの形式が正しくありません。');
  });
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
    id: field(row, 'question_id') || `inorganic-${i + 1}`,
    learning_point: field(row, 'learning_point'),
    learning_status: field(row, 'learning_status'),
    a_context: field(row, 'a_context'), b_prompt: field(row, 'b_prompt'), c_prompt: field(row, 'c_prompt'),
    a_distractors: parseLearningChoices(field(row, 'a_distractors_json'), `無機${i + 2}行 A`),
    b_distractors: parseLearningChoices(field(row, 'b_distractors_json'), `無機${i + 2}行 B`),
    c_distractors: parseLearningChoices(field(row, 'c_distractors_json'), `無機${i + 2}行 C`),
    reactants_visual: field(row, 'reactants_visual'),
    products_visual: field(row, 'products_visual'),
    observations_visual: field(row, 'observations_visual'),
    visual_timing: field(row, 'visual_timing'),
    visual_review: field(row, 'visual_review'),
    equation: field(row, 'equation', 'equation_tex'),
    equation_tex: field(row, 'equation_tex') || undefined,
    reactants: field(row, 'reactants', 'reaction_before_ja', 'reactants_tex'),
    reactants_tex: field(row, 'reactants_tex') || undefined,
    products: field(row, 'products', 'reaction_after_ja', 'products_tex'),
    products_tex: field(row, 'products_tex') || undefined,
    conditions: field(row, 'b_answer', 'conditions'), observations: field(row, 'observations'),
    explanation: field(row, 'explanation', 'reaction_ja'),
    reactants_summary: field(row, 'reactants_summary', 'reaction_before_ja', 'reactants'),
    products_summary: field(row, 'products_summary', 'reaction_after_ja', 'products'),
  })).filter(row => row.equation && row.reactants && row.products && row.learning_status !== '保留').map(row => {
    if (!row.learning_point) throw new Error(`${row.id}の覚えるポイントが未設定です。`);
    validateLearningChoices(row.products, row.a_distractors, `${row.id} A`);
    if (row.conditions) validateLearningChoices(row.conditions, row.b_distractors, `${row.id} B`);
    if (row.observations) validateLearningChoices(row.observations, row.c_distractors, `${row.id} C`);
    return row;
  });
}
export async function loadInorganicReactionsNewFromGAS(): Promise<InorganicReactionNew[]> {
  return loadProblem('inorganic-new', 'inorganic', data => {
    if (typeof data.csv === 'string') return parseInorganicCSV(data.csv);
    if (Array.isArray(data.reactions)) return data.reactions as InorganicReactionNew[];
    throw new Error('無機化学データの形式が正しくありません。');
  });
}
