// Run with Vite on localhost:5173. PLAYWRIGHT_MODULE may specify an installed runtime.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.resolve(__dirname, '..');
const data = {};
for (const name of ['inorganic','compounds','reactions','experiments']) data[name] = JSON.parse(fs.readFileSync(path.join(root,'learning',name+'.json'),'utf8'));
const fields = {
 inorganic: ['equation_tex','reactants_tex','products_tex','conditions','observations','reaction_ja','reaction_before_ja','reaction_after_ja','reactants_visual','products_visual','observations_visual','visual_timing','visual_review','learning_point','a_distractors_json','b_distractors_json','c_distractors_json','a_context','b_prompt','c_prompt','learning_status','question_id','b_answer'],
 compounds: ['id','name','type','formula','atoms','bonds','choice_ids_json','learning_point'],
 reactions: ['type','from','reagent','to','description','product_distractors_json','reagent_distractors_json','learning_point','question_id','learning_status'],
 experiments: ['question','1','2','3','4','answer','explanation','question_id'],
};
const csv = (name) => [fields[name], ...data[name].map(row=>fields[name].map(key=>row[key]??''))].map(row=>row.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join('\r\n');
const fixtures = Object.fromEntries(Object.keys(fields).map(name=>[name,{csv:csv(name)}]));
if (process.env.FIXTURE_PATH) fs.writeFileSync(process.env.FIXTURE_PATH,JSON.stringify(fixtures));
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await b.newPage();await p.goto('http://127.0.0.1:5173/');
 const result=await p.evaluate(async fixtures=>{
  const {parseInorganicCSV}=await import('/src/data/gasLoader.ts');
  const {parseCSV,csvToCompounds}=await import('/src/utils/csvParser.ts');
  const {parseReactionCSV}=await import('/src/utils/reactionParser.ts');
  const {parseExperimentCSV}=await import('/src/utils/experimentParser.ts');
  const u=await import('/src/utils/learningChoices.ts');
  const types=await import('/src/components/modes/CompoundTypeQuiz.tsx');
  const g=await import('/src/utils/inorganicDistractorGeneratorNew.ts');
  const check=(value,msg)=>{if(!value)throw Error(msg)};
  const inorganic=parseInorganicCSV(fixtures.inorganic.csv);
  const compounds=csvToCompounds(parseCSV(fixtures.compounds.csv),[]);
  const reactions=parseReactionCSV(fixtures.reactions.csv);
  const experiments=parseExperimentCSV(fixtures.experiments.csv);
  const counts={A:0,B:0,C:0,compounds:compounds.length,reactions:reactions.length,experiments:experiments.length};
  for(const row of inorganic)for(const [mode,key] of [['A','products'],['B','conditions'],['C','observations']]){
   if(!row[key])continue;counts[mode]++;
   const ds=g['generateDistractorsForType'+mode](row,inorganic);const seen=new Set();
   for(let i=0;i<200;i++){const q=g.shuffleChoices(row[key],ds);check(q.choices[q.correctIndex]===row[key],'correct index');check(q.choices.length>=2&&q.choices.length<=4,'count');seen.add(q.correctIndex);}
   check(seen.size===ds.length+1,'unreachable position '+row.id+mode);
   check(row.learning_point,'point');
  }
  for(const row of compounds){
   check(u.compoundOptions(row,compounds).some(c=>c.id===row.id),'compound answer');
   const correct=types.normalizeType(row.type), wrong=types.typeDistractors(correct);
   check(wrong.length>=1&&wrong.length<=3&&!wrong.includes(correct),'classification '+row.name);
  }
  for(const [id,expected] of [['40','エステル'],['48','アミノ酸'],['49','単糖'],['50','二糖'],['51','多糖'],['56','ハロゲン化アルカン'],['73','キノン']])check(types.normalizeType(compounds.find(c=>c.id===id).type)===expected,'classification regression '+id);
  for(const row of reactions){u.learningOptions(row.to,row.productDistractors);u.learningOptions(row.reagent,row.reagentDistractors);check(row.learningPoint,'reaction point');}
  const ep=new Set();for(const row of experiments){
   const raw=[row.option1,row.option2,row.option3,row.option4].map((text,i)=>({text,id:i+1})).filter(x=>x.text);
   check(new Set(raw.map(x=>x.text)).size===raw.length,'experiment duplicate');
   for(let i=0;i<100;i++){const q=u.shuffleLearning(raw);const ix=q.findIndex(x=>x.id===row.correctAnswer);check(ix>=0,'experiment correct id');ep.add(ix);}
  }
  check(ep.has(3),'experiment fourth position unreachable');
  for(const bad of ['not json','[{"text":"x"}]']){let rejected=false;try{u.parseLearningChoices(bad,'test')}catch{rejected=true}check(rejected,'invalid accepted');}
  let missing=false;try{u.learningOptions('x',[])}catch{missing=true}check(missing,'random fallback');
  for(const text of ['赤褐色の沈殿','青色の沈殿','白色の沈殿'])check(u.learningChoiceVisuals(text,'本文に合わせる',false),'missing color on a choice');
  check(!u.learningChoiceVisuals('赤褐色','解説のみ',false),'before-answer color');
  return {counts,positions:[...ep].sort(),ids:inorganic.map(r=>r.id)};
 },fixtures);
 assert.equal(result.counts.A,88);assert.equal(result.counts.reactions,32);assert.equal(result.counts.experiments,18);
 console.log(JSON.stringify(result,null,2));console.log('LEARNING_DATA_AND_SHUFFLE_PASS');
}finally{await b.close()}})().catch(error=>{console.error(error);process.exit(1)});
