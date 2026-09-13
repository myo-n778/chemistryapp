import { AI_TUTOR_GAS_URL } from '../config/aiTutor';
import { isTutorPreview, type TutorAction, type TutorQuestion, type TutorReply } from './aiTutorMock';
export interface TutorSession { token: string; bankVersion: string }
export interface TutorBudget { questionUsed:number; sessionUsed:number }
export class TutorClientError extends Error {
  constructor(public code:string, public budget?:TutorBudget) { super(code); }
}
export function isTutorLive() {
  return (!!AI_TUTOR_GAS_URL || (import.meta.env.DEV && ['localhost','127.0.0.1','[::1]'].includes(location.hostname)
    && new URLSearchParams(location.search).get('ai') === '1')) && !isTutorPreview();
}
export const isTutorEnabled = () => isTutorPreview() || isTutorLive();
const errorMessages:Record<string,string>={
 not_configured:'AIは準備中です。通常の演習は続けられます。',
 session_limit:'AIの利用開始が集中しています。少し待ってから再試行してください。',
 material_mismatch:'問題とAI側の教材が一致しないため、説明を止めました。通常の解説を使ってください。',
 session_expired:'AIの利用セッションが切れました。出題タイプへ戻って学習を開始し直してください。',
 daily_limit:'今日のAI利用上限に達しました。通常の演習は続けられます。',
 usage_limit:'AIの利用上限に達しました。通常の演習は続けられます。',
 insufficient_quota:'OpenAI側の利用枠が不足しています。管理者による確認が必要です。',
 rate_limit_exceeded:'AI側が混み合っています。通常の演習を続け、必要なときに再試行してください。',
 request_busy:'別のAI要求を処理中です。少し待ってから再試行してください。',
 request_pending:'同じ要求を処理中です。自動で再送はしません。',
 timeout:'説明の待ち時間を超えました。通常の解説で学習を続けられます。',
};
export const tutorErrorMessage = (error:unknown) => error instanceof TutorClientError
 ? errorMessages[error.code] || 'AIの説明を取得できませんでした。通常の解説で学習を続けられます。'
 : 'AIサーバーに接続できませんでした。通常の解説で学習を続けられます。';
async function post(path:string, body:unknown, signal:AbortSignal, session?:TutorSession) {
 const gas = !!AI_TUTOR_GAS_URL;
 const response=await fetch(gas ? AI_TUTOR_GAS_URL : path,{method:'POST',signal,credentials:'omit',headers:gas ? {'Content-Type':'text/plain;charset=UTF-8'} : {'Content-Type':'application/json',...(session?{'X-Chem-Session':session.token}:{})},body:JSON.stringify(gas ? {...(body as object),operation:path.endsWith('/session')?'session':'answer',...(session?{token:session.token}:{})} : body),cache:'no-store'});
 let data;try{data=await response.json();}catch{throw new TutorClientError('invalid_response');}
 if(!response.ok || data.error)throw new TutorClientError(data.error || 'request_failed',data.budget);
 return data;
}
export async function openTutorSession(signal:AbortSignal):Promise<TutorSession>{
 const data=await post('/api/tutor/session',{},signal);
 if(typeof data.token!=='string'||typeof data.bankVersion!=='string')throw new TutorClientError('invalid_response');
 return {token:data.token,bankVersion:data.bankVersion};
}
export async function requestTutorReply(q:TutorQuestion,action:TutorAction,text:string,signal:AbortSignal,session:TutorSession):Promise<{reply:TutorReply;budget:TutorBudget}> {
 const bytes=new TextEncoder().encode(JSON.stringify([q.id,q.mode,q.category,q.prompt,q.correct,q.explanation||'',q.structure||null]));
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 const signature=Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
 const requestId=crypto.randomUUID();
 const data=await post('/api/tutor/answer',{requestId,id:q.id,mode:q.mode,category:q.category,signature,selected:q.selected,action,text},signal,session);
 if(data.requestId!==requestId||data.bankVersion!==session.bankVersion||!data.reply||!['ok','insufficient_context','out_of_scope'].includes(data.reply.status)||['conclusion','distinction','checkQuestion'].some(k=>typeof data.reply[k]!=='string'||data.reply[k].length>1200)||!Number.isInteger(data.budget?.questionUsed)||!Number.isInteger(data.budget?.sessionUsed))throw new TutorClientError('invalid_response');
 return {reply:data.reply,budget:data.budget};
}
