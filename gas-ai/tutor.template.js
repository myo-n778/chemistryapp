/* AI専用GAS。教材4シートは読取のみ。質問ログはAI質問へ保存。成績シートにはアクセスしません。 */
__SHEETS_SOURCE__
const CHEM_AI_MODEL = __MODEL__;
const CHEM_AI_SCHEMA = __SCHEMA__;
const CHEM_AI_INSTRUCTIONS = __INSTRUCTIONS__;
const CHEM_AI_LIMITS = {question:3,session:20,daily:30};
const CHEM_AI_TTL = 2*60*60*1000;
function chemAiError_(code,budget) {const e=new Error(code);e.chemCode=code;e.budget=budget;throw e;}
function chemAiJson_(data) {return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
function chemAiHash_(text) {return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,text,Utilities.Charset.UTF_8).map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');}
function chemAiRead_(p,k,fallback) {const v=p.getProperty(k);return v===null?fallback:JSON.parse(v);}
function chemAiPut_(p,k,v) {const data=JSON.stringify(v);if(Utilities.newBlob(data).getBytes().length>8500)chemAiError_('state_too_large');p.setProperty(k,data);}
function chemAiLock_(fn) {const lock=LockService.getScriptLock();if(!lock.tryLock(2000))chemAiError_('request_busy');try{return fn(PropertiesService.getScriptProperties());}finally{lock.releaseLock();}}
function chemAiReady_(p) {if(p.getProperty('CHEM_AI_ENABLED')!=='true'||!/^sk-/.test(p.getProperty('OPENAI_API_KEY')||''))chemAiError_('not_configured');}
function doGet() {return chemAiJson_({service:'chemistry-ai',version:'gas-question-log-v1',bankVersion:CHEM_AI_PROTOCOL});}
function doPost(e) {
  try {
    const text=e&&e.postData&&e.postData.contents;
    if(typeof text!=='string'||text.length>12000)chemAiError_('invalid_request');
    let d;try{d=JSON.parse(text);}catch(_){chemAiError_('invalid_json');}
    if(!d||typeof d!=='object'||Array.isArray(d))chemAiError_('invalid_request');
    if(d.operation==='session')return chemAiJson_(chemAiSession_());
    if(d.operation==='log')return chemAiJson_(chemAiLog_(d));
    if(d.operation==='answer')return chemAiJson_(chemAiAnswer_(d));
    chemAiError_('invalid_operation');
  } catch(e) {return chemAiJson_({error:e.chemCode||'internal_error',...(e.budget?{budget:e.budget}:{})});}
}
function chemAiSession_() {
 return chemAiLock_(p=>{
  chemAiReady_(p);const now=Date.now();let sessions=0;
  const values=p.getProperties();
  Object.keys(values).filter(k=>/^CHEM_AI_(SESSION|REQUEST|LOG)_/.test(k)).forEach(k=>{const x=JSON.parse(values[k]);if(x.expires<=now)p.deleteProperty(k);else if(k.indexOf('CHEM_AI_SESSION_')===0)sessions++;});
  const day=Utilities.formatDate(new Date(now),'Asia/Tokyo','yyyy-MM-dd');const daily=chemAiRead_(p,'CHEM_AI_DAILY',{day:day,count:0});
  if(daily.day===day&&daily.count>=CHEM_AI_LIMITS.daily)chemAiError_('daily_limit');
  let rate=chemAiRead_(p,'CHEM_AI_SESSION_RATE',{minute:0,count:0});const minute=Math.floor(now/60000);
  if(rate.minute!==minute)rate={minute:minute,count:0};if(rate.count>=10||sessions>=60)chemAiError_('session_limit');
  chemAiPut_(p,'CHEM_AI_SESSION_RATE',{minute:minute,count:rate.count+1});
  const token=Utilities.getUuid()+Utilities.getUuid();
  chemAiPut_(p,'CHEM_AI_SESSION_'+chemAiHash_(token),{expires:now+CHEM_AI_TTL,total:0,questions:{}});
  return {token:token,bankVersion:CHEM_AI_PROTOCOL,limits:CHEM_AI_LIMITS,model:CHEM_AI_MODEL};
 });
}
function chemAiAnswer_(d) {
 const {requestId,id,category,mode,signature,selected,action,text=''}=d;
 if(typeof d.token!=='string'||!/^[a-f0-9-]{72}$/.test(d.token)||typeof requestId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(requestId)||typeof id!=='string'||id.length>500||!['organic','inorganic'].includes(category)||typeof mode!=='string'||mode.length>40||typeof selected!=='string'||selected.length>3000||!['difference','simple','question'].includes(action)||typeof text!=='string'||text.length>300||(action==='question'&&!text.trim()))chemAiError_('invalid_request');
 const preflight=PropertiesService.getScriptProperties();chemAiReady_(preflight);
 const liveSession=chemAiRead_(preflight,'CHEM_AI_SESSION_'+chemAiHash_(d.token),null);
 if(!liveSession||liveSession.expires<=Date.now())chemAiError_('session_expired');
 const key=category+':'+mode+':'+id,q=chemAiQuestion_(category,mode,id);
 if(!q||q.signature!==signature)chemAiError_('material_mismatch');
 if(!q.choices.includes(selected))chemAiError_('invalid_choice');
 const sk='CHEM_AI_SESSION_'+chemAiHash_(d.token),qk=chemAiHash_(key),rk='CHEM_AI_REQUEST_'+chemAiHash_(d.token+':'+requestId);
 const digest=chemAiHash_(JSON.stringify([id,category,mode,signature,selected,action,text]));
 const reserved=chemAiLock_(p=>{
  chemAiReady_(p);const now=Date.now(),s=chemAiRead_(p,sk,null);
  if(!s||s.expires<=now)chemAiError_('session_expired');
  const previous=chemAiRead_(p,rk,null);
  if(previous){if(previous.digest!==digest)chemAiError_('request_id_conflict');return {existing:previous.result||{error:'request_pending',budget:previous.budget}};}
  const budget={questionUsed:s.questions[qk]||0,sessionUsed:s.total};
  if(s.total>=CHEM_AI_LIMITS.session||budget.questionUsed>=CHEM_AI_LIMITS.question)chemAiError_('usage_limit',budget);
  // Global serialization avoids overlapping provider charges. Lock is not held during fetch.
  if(chemAiRead_(p,'CHEM_AI_BUSY',{until:0}).until>now)chemAiError_('request_busy',budget);
  const day=Utilities.formatDate(new Date(now),'Asia/Tokyo','yyyy-MM-dd');
  let daily=chemAiRead_(p,'CHEM_AI_DAILY',{day:day,count:0});if(daily.day!==day)daily={day:day,count:0};
  if(daily.count>=CHEM_AI_LIMITS.daily)chemAiError_('daily_limit',budget);
  daily.count++;s.total++;s.questions[qk]=budget.questionUsed+1;
  const next={questionUsed:s.questions[qk],sessionUsed:s.total,dailyUsed:daily.count};
  // Charge reservation is persisted first: a partial storage failure can over-count, never under-count.
  chemAiPut_(p,'CHEM_AI_DAILY',daily);chemAiPut_(p,sk,s);
  chemAiPut_(p,rk,{expires:s.expires,digest:digest,budget:next});
  chemAiPut_(p,'CHEM_AI_LOG_'+chemAiHash_(d.token+':'+requestId),{expires:s.expires,prompt:q.prompt,question:action==='question'?text.trim():action==='simple'?'やさしく説明':selected===q.correct?'正解の理由':'選んだ答えとの違い'});
  chemAiPut_(p,'CHEM_AI_BUSY',{until:now+7*60*1000,request:rk});
  return {budget:next,expires:s.expires};
 });
 if(reserved.existing)return reserved.existing;
 const hk='history-'+chemAiHash_(d.token+':'+key+':'+signature);let result;
 try {
  const {choices,signature:unused,...material}=q;
  let history=[];try{history=JSON.parse(CacheService.getScriptCache().get(hk)||'[]');}catch(_){}
  const reply=chemAiProvider_({...material,selectedAnswer:selected},action,text.trim(),history);
  result={reply:reply,requestId:requestId,bankVersion:CHEM_AI_PROTOCOL,model:CHEM_AI_MODEL,budget:reserved.budget};
  try{CacheService.getScriptCache().put(hk,JSON.stringify([...history,{action:action,studentQuestion:text.trim(),reply:reply}].slice(-2)),7200);}catch(_){}
 } catch(e) {result={error:e.chemCode||'connection_failed',requestId:requestId,budget:reserved.budget};}
 // Completion storage failures still leave the reserved request, preventing duplicate provider calls.
 chemAiLock_(p=>{
  chemAiPut_(p,rk,{expires:reserved.expires,digest:digest,budget:reserved.budget,result:result});
  if(chemAiRead_(p,'CHEM_AI_BUSY',{}).request===rk)p.deleteProperty('CHEM_AI_BUSY');
 });
 return result;
}
function chemAiProvider_(question,action,text,history) {
 const response=UrlFetchApp.fetch('https://api.openai.com/v1/responses',{
  method:'post',contentType:'application/json',muteHttpExceptions:true,
  headers:{Authorization:'Bearer '+PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY')},
  payload:JSON.stringify({model:CHEM_AI_MODEL,store:false,reasoning:{effort:'none'},max_output_tokens:1000,instructions:CHEM_AI_INSTRUCTIONS,input:JSON.stringify({question:question,action:action,studentQuestion:text,history:history}),text:{format:{type:'json_schema',name:'chemistry_tutor',strict:true,schema:CHEM_AI_SCHEMA}}})
 });
 let data;try{data=JSON.parse(response.getContentText());}catch(_){chemAiError_('provider_error');}
 if(response.getResponseCode()!==200)chemAiError_(['insufficient_quota','rate_limit_exceeded'].includes(data.error&&data.error.code)?data.error.code:'provider_error');
 if(data.status!=='completed')chemAiError_('incomplete_response');
 const content=(data.output||[]).reduce((a,o)=>a.concat(o.content||[]),[]);
 if(content.some(c=>c.type==='refusal'))chemAiError_('refused');
 let reply;try{reply=JSON.parse(content.filter(c=>c.type==='output_text').map(c=>c.text).join(''));}catch(_){chemAiError_('invalid_response');}
 if(!reply||!['ok','insufficient_context','out_of_scope'].includes(reply.status)||['conclusion','distinction','checkQuestion'].some(k=>typeof reply[k]!=='string'||reply[k].length>1200)||!reply.conclusion.trim())chemAiError_('invalid_response');
 // Keep each PropertiesService value below its byte limit, including JSON and multibyte characters.
 if(Utilities.newBlob(JSON.stringify(reply)).getBytes().length>6500)chemAiError_('invalid_response');
 return {status:reply.status,conclusion:reply.conclusion,distinction:reply.distinction,checkQuestion:reply.checkQuestion};
}

__QUESTION_LOG__
