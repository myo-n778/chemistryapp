import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
export const questionSignature = q => createHash('sha256').update(JSON.stringify([q.id, q.mode, q.category, q.prompt, q.correct, q.explanation || '', q.structure || null])).digest('hex');
export function loadTutorBank(root = new URL('../learning/', import.meta.url)) {
  const files = ['compounds', 'reactions', 'experiments', 'inorganic'];
  const raw = files.map(f => readFileSync(new URL(`${f}.json`, root), 'utf8'));
  const [compounds, reactions, experiments, inorganic] = raw.map(JSON.parse);
  return {questions:buildTutorQuestions(compounds,reactions,experiments,inorganic,questionSignature), version:createHash('sha256').update(raw.join('\n')).digest('hex')};
}

// Pure conversion shared by the local server and the sheet-reading GAS.
export function buildTutorQuestions(compounds,reactions,experiments,inorganic,sign) {
const normType = value => value === '芳香族（キノン）' ? 'キノン' : (value || '').trim();
const field = (row, ...keys) => keys.map(k => String(row[k] ?? '').trim()).find(Boolean) || '';
const parseChoices = value => value ? JSON.parse(value).map(x => x.text) : [];
  const bank = new Map();
  const add = (q, choices, details = {}) => {
    const key = `${q.category}:${q.mode}:${q.id}`;
    if (bank.has(key)) throw new Error('Duplicate tutor question');
    bank.set(key, { ...q, choices: [...new Set(choices.filter(Boolean))], details, signature: sign(q) });
  };
  const names = compounds.map(c => c.name);
  const knownTypes = [...compounds.map(c => normType(c.type)), '芳香族炭化水素','フェノール類','芳香族カルボン酸','単糖','二糖','多糖','合成高分子','天然高分子','アミン（カルボキシ基なし）','カルボン酸（アミノ基なし）','エステル','フェノール類（遊離形）','芳香族アミン','芳香族アルコール（環に直接OHは結合しない）','芳香族エーテル','アルデヒド','ケトン','カルボン酸','アルコール','エーテル','アミン','ニトリル','芳香族アルデヒド','ハロゲン化芳香族','アミド','ニトロ化合物','飽和鎖式炭化水素','脂肪族アルコール','脂肪族ケトン','アルカン','アルケン','アルキン'];
  for (const c of compounds) {
    const common = {id:String(c.id), category:'organic', correct:c.name, explanation:c.learning_point};
    const structure = {atoms:JSON.parse(c.atoms || '[]'), bonds:JSON.parse(c.bonds || '[]')};
    add({...common, mode:'structure-to-name', prompt:`構造式に対応する名称は？（${c.name}）`, structure},names,{formula:c.formula});
    add({...common, mode:'name-to-structure', prompt:`${c.name}の構造式は？`, structure},names,{formula:c.formula});
    add({...common, mode:'compound-type', prompt:`${c.name}の化合物の種類は？`, correct:normType(c.type)},knownTypes,{formula:c.formula,structure});
  }
  for (const r of reactions.filter(r => r.learning_status !== '保留')) {
    const common = {id:r.question_id || `${r.from}-${r.to}-${r.reagent}`,category:'organic',explanation:r.learning_point};
    add({...common,mode:'reaction',prompt:`${r.from}に${r.reagent}：何ができる？`,correct:r.to},[r.to,...parseChoices(r.product_distractors_json)],{description:r.description});
    add({...common,mode:'substitution',prompt:`${r.from}から${r.to}：何をした？`,correct:r.reagent},[r.reagent,...parseChoices(r.reagent_distractors_json)],{description:r.description});
  }
  for (const r of experiments) {
    add({id:r.question_id || r.question,category:r.category || 'organic',mode:'experiment',prompt:r.question,correct:String(r[r.answer]),explanation:r.explanation},[1,2,3,4].map(i=>String(r[i] || '')));
  }
  for (const r of inorganic.filter(r=>r.learning_status !== '保留')) {
    const id=field(r,'question_id','id'),reactants=field(r,'reactants','reaction_before_ja','reactants_tex'),products=field(r,'products','reaction_after_ja','products_tex');
    const equation=field(r,'equation','equation_tex'),conditions=field(r,'b_answer','conditions'),observations=field(r,'observations');
    const common={id,category:'inorganic',explanation:field(r,'learning_point','explanation','reaction_ja')};
    const prompts={a:`${r.a_context || ''} ${reactants}：生成物は？`,b:`${equation} ${r.b_prompt || '条件は？'}`,c:`${reactants} ${conditions} ${r.c_prompt || '観察される現象は？'}`};
    for(const [m,correct] of [['a',products],['b',conditions],['c',observations]]) {
      if(correct) add({...common,mode:`inorganic-type-${m}`,prompt:prompts[m],correct},[correct,...parseChoices(r[`${m}_distractors_json`])],{equation,conditions,reactants,products,observations});
    }
  }
  return bank;
}
