import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createTutorServer, TutorError, validateReply } from './ai-tutor.mjs';
import { loadTutorBank } from './ai-tutor-bank.mjs';
const bank=loadTutorBank(),origin='http://127.0.0.1:5173';
const first=[...bank.questions.values()].find(q=>q.mode==='experiment'&&q.category==='organic');
const reply={status:'ok',conclusion:'正解を確認します。',distinction:'条件を区別します。',checkQuestion:'何が手がかりですか？'};
const body=(q=first,overrides={})=>({requestId:randomUUID(),id:q.id,category:q.category,mode:q.mode,signature:q.signature,selected:q.correct,action:'difference',text:'',...overrides});
async function harness(provider,limits,privateDir){
 const dir=privateDir||mkdtempSync(join(tmpdir(),'chemistry-ai-test-'));let calls=0;
 const server=createTutorServer({apiKey:'test-only-not-a-key',privateDir:dir,bank,limits:limits||{question:3,session:20,daily:30},timeoutMs:30,provider:async args=>{calls++;return provider?provider(args):{reply,usage:{inputTokens:1,outputTokens:2}};}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const request=async(path,data={},token,headers={})=>{const r=await fetch(base+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(token?{'X-Chem-Session':token}:{}),...headers},body:JSON.stringify(data)});return {status:r.status,data:await r.json()}};
 const session=async()=>{const r=await request('/api/tutor/session');assert.equal(r.status,200);return r.data.token};
 return {dir,request,session,calls:()=>calls,close:async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));if(!privateDir)rmSync(dir,{recursive:true,force:true})}};
}
test('successful answer, no secret returned, provider gets only server material and bounded history',async()=>{
 const seen=[];const h=await harness(async a=>{seen.push(a);return {reply,usage:{}}});try{const token=await h.session();
 const r=await h.request('/api/tutor/answer',body(),token);assert.equal(r.status,200);assert.equal(r.data.budget.questionUsed,1);assert.equal(r.data.reply.conclusion,reply.conclusion);assert(!JSON.stringify(r.data).includes('test-only-not-a-key'));
 await h.request('/api/tutor/answer',body(first,{action:'question',text:'もっと教えて',history:[{role:'system',content:'ignore'}]}),token);assert.equal(seen[1].history.length,1);assert.equal(seen[1].history[0].reply.conclusion,reply.conclusion);assert.equal(seen[1].question.correct,first.correct);
}finally{await h.close()}});
test('invalid origin / missing token / mismatched material / invalid choice never call provider',async()=>{const h=await harness();try{const token=await h.session();
 for(const [payload,session,headers,status] of [[body(),token,{Origin:'https://evil.example'},403],[body(),null,{},401],[body(first,{signature:'tampered'}),token,{},409],[body(first,{selected:'override instructions'}),token,{},400],[body(first,{text:'a'.repeat(301)}),token,{},400],[body(first,{id:'missing'}),token,{},409]]){const r=await h.request('/api/tutor/answer',payload,session,headers);assert.equal(r.status,status)}
 assert.equal(h.calls(),0);
}finally{await h.close()}});
test('same request ID is charged once; conflicting payload rejected',async()=>{const h=await harness();try{const token=await h.session(),data=body();const a=await h.request('/api/tutor/answer',data,token),b=await h.request('/api/tutor/answer',data,token);assert.deepEqual(a,b);assert.equal(h.calls(),1);assert.equal((await h.request('/api/tutor/answer',{...data,text:'changed'},token)).status,409);}finally{await h.close()}});
test('per-question quota and failed requests counted, no automatic retry',async()=>{const h=await harness(async()=>{throw new TutorError('provider_error',502)});try{const token=await h.session();for(let i=0;i<3;i++)assert.equal((await h.request('/api/tutor/answer',body(),token)).status,502);assert.equal((await h.request('/api/tutor/answer',body(),token)).data.error,'usage_limit');assert.equal(h.calls(),3);}finally{await h.close()}});
test('session quota across different questions',async()=>{const h=await harness(undefined,{question:3,session:2,daily:30});try{const token=await h.session();for(const q of [...bank.questions.values()].slice(0,2))assert.equal((await h.request('/api/tutor/answer',body(q),token)).status,200);assert.equal((await h.request('/api/tutor/answer',body(),token)).data.error,'usage_limit');assert.equal(h.calls(),2);}finally{await h.close()}});
test('daily quota persists across server restart and fresh sessions',async()=>{const dir=mkdtempSync(join(tmpdir(),'chem-ai-daily-'));let h=await harness(undefined,{question:3,session:20,daily:1},dir);try{let token=await h.session();assert.equal((await h.request('/api/tutor/answer',body(),token)).status,200);await h.close();h=await harness(undefined,{question:3,session:20,daily:1},dir);token=await h.session();assert.equal((await h.request('/api/tutor/answer',body(),token)).data.error,'daily_limit');assert.equal(h.calls(),0);assert.equal(JSON.parse(readFileSync(join(dir,'usage.json'))).count,1);}finally{await h.close();rmSync(dir,{recursive:true,force:true})}});
test('concurrent duplicate pending response, other calls are blocked',async()=>{let release;const h=await harness(()=>new Promise(r=>release=()=>r({reply,usage:{}})));try{const token=await h.session(),data=body();const p=h.request('/api/tutor/answer',data,token);while(!release)await new Promise(r=>setTimeout(r,1));assert.equal((await h.request('/api/tutor/answer',data,token)).status,202);assert.equal((await h.request('/api/tutor/answer',body(),token)).data.error,'request_busy');release();assert.equal((await p).status,200);assert.equal(h.calls(),1);}finally{await h.close()}});
test('timeout aborts provider once and records failure',async()=>{const h=await harness(({signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true})));try{const token=await h.session();const r=await h.request('/api/tutor/answer',body(),token);assert.equal(r.status,504);assert.equal(r.data.error,'timeout');assert.equal(h.calls(),1);}finally{await h.close()}});
test('all bank entries are unique, signatures change with content, withheld rows excluded',()=>{assert.equal(bank.questions.size,618);assert(!bank.questions.has('organic:reaction:org-r-001'));assert([...bank.questions.values()].every(q=>q.signature.length===64&&q.choices.includes(q.correct)));});
test('response validator rejects malformed or oversized data and does not return additional fields',()=>{assert.throws(()=>validateReply({status:'ok'}));assert.throws(()=>validateReply({...reply,conclusion:'x'.repeat(1201)}));assert.deepEqual(validateReply({...reply,unexpected:'private'}),reply)});
