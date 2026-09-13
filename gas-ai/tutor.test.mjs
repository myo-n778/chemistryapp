import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {loadTutorBank} from '../server/ai-tutor-bank.mjs';
const code=readFileSync(new URL('./Code.gs',import.meta.url),'utf8');
const bank=loadTutorBank();
const fixtureTables=process.env.CHEM_AI_SHEETS_FIXTURE ? JSON.parse(readFileSync(process.env.CHEM_AI_SHEETS_FIXTURE,'utf8')) : Object.fromEntries(['compounds','reactions','experiment','inorganic'].map(name=>{
 const rows=JSON.parse(readFileSync(new URL('../learning/'+(name==='experiment'?'experiments':name)+'.json',import.meta.url),'utf8'));
 const heads=[...new Set(rows.flatMap(Object.keys))];return [name,[heads,...rows.map(r=>heads.map(k=>r[k]??''))]];
}));
function runtime(shared=new Map()) {
 let locked=false,calls=0,now=Date.now(),hook,sheetReads=0;
 const tables=JSON.parse(JSON.stringify(fixtureTables));
 const cache=new Map();
 const props={getProperty:k=>shared.get(k)??null,setProperty:(k,v)=>{assert(Buffer.byteLength(v)<=9000);shared.set(k,v);},deleteProperty:k=>shared.delete(k),getProperties:()=>Object.fromEntries(shared)};
 const blob=x=>({getBytes:()=>Array.from(Buffer.from(x)),getDataAsString:()=>Buffer.from(x).toString()});
 const context=vm.createContext({Date:class extends Date {constructor(v){super(v??now)}static now(){return now;}},
  Utilities:{getUuid:randomUUID,DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(a,t)=>Array.from(createHash(a).update(t).digest()),newBlob:blob,formatDate:d=>new Date(+d+9*3600000).toISOString().slice(0,10)},
  SpreadsheetApp:{openById:id=>{assert.equal(id,'1QxRAbYbN0tA3nmBgT7yL4HhnIPqW_QeFFkzGKkDLda0');return {getSheetByName:name=>{assert(['compounds','reactions','experiment','inorganic'].includes(name));sheetReads++;const values=tables[name];return values?{getLastRow:()=>values.length,getLastColumn:()=>values[0].length,getRange:(r,c,h,w)=>{assert.equal(r,1);assert.equal(c,1);assert.equal(h,values.length);assert.equal(w,values[0].length);return {getValues:()=>JSON.parse(JSON.stringify(values))}}}:null;}}}},
  PropertiesService:{getScriptProperties:()=>props},LockService:{getScriptLock:()=>({tryLock:()=>{if(locked)return false;locked=true;return true},releaseLock:()=>{locked=false}})},CacheService:{getScriptCache:()=>({get:k=>cache.get(k)??null,put:(k,v)=>cache.set(k,v)})},
  ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>({text})})},
  UrlFetchApp:{fetch:(url,opts)=>{calls++;assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(opts.headers.Authorization,'Bearer sk-test-only');const input=JSON.parse(opts.payload);assert.equal(input.store,false);assert.equal(input.max_output_tokens,1000);if(hook)return hook(input);return response();}}
 });vm.runInContext(code,context);
 const response=(reply={status:'ok',conclusion:'確認用の説明です。',distinction:'条件を比べます。',checkQuestion:'どの条件ですか？'})=>({getResponseCode:()=>200,getContentText:()=>JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(reply)}]}]})});
 const post=d=>JSON.parse(context.doPost({postData:{contents:JSON.stringify(d)}}).text);
 const configure=()=>{props.setProperty('OPENAI_API_KEY','sk-test-only');props.setProperty('CHEM_AI_ENABLED','true');};
 return {context,props,shared,post,configure,response,tables,get sheetReads(){return sheetReads},get calls(){return calls},set hook(v){hook=v},advance:ms=>{now+=ms},setLocked:v=>{locked=v}};
}
const question=[...bank.questions.values()].find(q=>q.category==='organic'&&q.mode==='experiment');
function request(token,q=question){return {operation:'answer',token,requestId:randomUUID(),id:q.id,category:q.category,mode:q.mode,signature:q.signature,selected:q.choices[0],action:'difference',text:''};}
function session(r){const s=r.post({operation:'session'});assert(s.token,s.error);return s.token;}
test('disabled by default and health never exposes keys',()=>{const r=runtime();assert.equal(r.post({operation:'session'}).error,'not_configured');r.configure();const health=r.context.doGet().text;assert(!health.includes('sk-test'));assert.equal(JSON.parse(health).bankVersion,'sheets-v1');assert.equal(r.sheetReads,0);});
test('successful response and dedup survive new GAS execution context',()=>{const r=runtime();r.configure();const d=request(session(r));const a=r.post(d);assert.equal(a.reply.status,'ok');assert.equal(a.budget.dailyUsed,1);assert.equal(r.calls,1);assert.deepEqual(r.post(d),a);assert.equal(r.calls,1);const r2=runtime(r.shared);assert.deepEqual(r2.post(d),a);assert.equal(r2.calls,0);assert.equal(r2.post({...d,text:'changed'}).error,'request_id_conflict');});
test('invalid signature, choice, free text and token rejected before provider',()=>{const r=runtime();r.configure();const d=request(session(r));for(const [patch,error] of [[{signature:'wrong'},'material_mismatch'],[{selected:'invented'},'invalid_choice'],[{text:'a'.repeat(301)},'invalid_request'],[{action:'question',text:' '},'invalid_request'],[{token:'x'},'invalid_request'],[{category:'other'},'invalid_request']])assert.equal(r.post({...d,...patch}).error,error);assert.equal(r.calls,0);});
test('question and session limits enforced on server',()=>{const r=runtime();r.configure();const t=session(r);for(let i=0;i<3;i++)assert(r.post(request(t)).reply);assert.equal(r.post(request(t)).error,'usage_limit');const qs=[...bank.questions.values()].filter(q=>q!==question);for(let i=0;i<17;i++)assert(r.post(request(t,qs[i])).reply);assert.equal(r.post(request(t,qs[18])).error,'usage_limit');assert.equal(r.calls,20);});
test('daily quota shared by anonymous sessions and retained after restart',()=>{const r=runtime();r.configure();const qs=[...bank.questions.values()];for(let j=0;j<2;j++){const t=session(r);for(let i=0;i<15;i++)assert(r.post(request(t,qs[i])).reply);}assert.equal(r.calls,30);const next=runtime(r.shared);assert.equal(next.post({operation:'session'}).error,'daily_limit');assert.equal(next.calls,0);next.advance(25*3600000);assert(next.post({operation:'session'}).token);});
test('failed provider request counts and is never auto retried',()=>{const r=runtime();r.configure();r.hook=()=>({getResponseCode:()=>429,getContentText:()=>JSON.stringify({error:{code:'insufficient_quota',message:'private message'}})});const d=request(session(r)),a=r.post(d);assert.equal(a.error,'insufficient_quota');assert.equal(a.budget.dailyUsed,1);assert(!JSON.stringify(a).includes('private message'));assert.deepEqual(r.post(d),a);assert.equal(r.calls,1);});
test('overlap is rejected while provider runs; repeated request returns pending',()=>{const r=runtime();r.configure();const t=session(r),d=request(t);r.hook=()=>{assert.equal(r.post({...d,requestId:randomUUID()}).error,'request_busy');assert.equal(r.post(d).error,'request_pending');return r.response();};assert(r.post(d).reply);assert.equal(r.calls,1);});
test('session expiry, lock contention and session-start rate cap',()=>{const r=runtime();r.configure();const t=session(r);r.advance(3*3600000);assert.equal(r.post(request(t)).error,'session_expired');for(let i=0;i<10;i++)session(r);assert.equal(r.post({operation:'session'}).error,'session_limit');r.setLocked(true);assert.equal(r.post({operation:'session'}).error,'request_busy');});
test('oversized/malformed provider response rejected without losing reservation',()=>{const r=runtime();r.configure();const t=session(r);r.hook=()=>r.response({status:'ok',conclusion:'あ'.repeat(1200),distinction:'あ'.repeat(1200),checkQuestion:'あ'.repeat(1200)});assert.equal(r.post(request(t)).error,'invalid_response');assert.equal(r.calls,1);});
test('follow-up uses previous explanation without sending any user identity',()=>{const r=runtime();r.configure();const t=session(r);r.post(request(t));r.hook=input=>{const data=JSON.parse(input.input);assert.equal(data.history.length,1);assert.equal(data.question.id,question.id);assert(!('token' in data));assert(!('userKey' in data));return r.response();};assert(r.post({...request(t),action:'question',text:'もう少し簡単に'}).reply);});
test('all 618 questions read from Sheets match canonical question/signature',()=>{
 const r=runtime();for(const [key,q] of bank.questions){const got=r.context.chemAiQuestion_(q.category,q.mode,q.id);assert.deepEqual(JSON.parse(JSON.stringify(got)),q,key);}assert.equal(r.sheetReads,618);
});
test('changing a sheet takes effect without rebuild; old screen signature is rejected',()=>{
 const r=runtime();r.configure();const d=request(session(r));
 const cols=r.tables.experiment[0],row=r.tables.experiment.find(row=>row[cols.indexOf('question_id')]===question.id);
 row[cols.indexOf('explanation')]='シート更新後の説明';
 assert.equal(r.post(d).error,'material_mismatch');assert.equal(r.calls,0);
 const q=r.context.chemAiQuestion_(question.category,question.mode,question.id);assert.equal(q.explanation,'シート更新後の説明');assert.notEqual(q.signature,question.signature);
 r.hook=input=>{assert.equal(JSON.parse(input.input).question.explanation,'シート更新後の説明');return r.response();};
 assert(r.post({...d,requestId:randomUUID(),signature:q.signature}).reply);
});
test('missing sheet, invalid headers, duplicates and malformed source do not call OpenAI',()=>{
 for(const kind of ['missing','header','duplicate','bad-json']){
  const r=runtime();r.configure();const q=[...bank.questions.values()].find(q=>q.mode==='structure-to-name');const d=request(session(r),q);
  if(kind==='missing')delete r.tables.compounds;
  if(kind==='header')r.tables.compounds[0][0]='wrong';
  if(kind==='duplicate')r.tables.compounds.push([...r.tables.compounds[1]]);
  if(kind==='bad-json')r.tables.compounds[1][r.tables.compounds[0].indexOf('atoms')]='broken';
  assert.equal(r.post(d).error,'material_source_error',kind);assert.equal(r.calls,0);
 }
});
test('unknown session and health do not access Sheets',()=>{
 const r=runtime();r.configure();assert.equal(r.post(request(randomUUID()+randomUUID())).error,'session_expired');r.context.doGet();assert.equal(r.sheetReads,0);
});
