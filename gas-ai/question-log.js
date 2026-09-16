// Display acknowledgment only: identity is never part of the provider request.
function chemAiLog_(d) {
 if(typeof d.token!=='string'||!/^[a-f0-9-]{72}$/.test(d.token)||typeof d.requestId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(d.requestId)||typeof d.username!=='string'||!d.username.trim()||d.username.length>200)chemAiError_('invalid_request');
 return chemAiLock_(p=>{
  const hash=chemAiHash_(d.token+':'+d.requestId);
  const entry=chemAiRead_(p,'CHEM_AI_REQUEST_'+hash,null),context=chemAiRead_(p,'CHEM_AI_LOG_'+hash,null);
  if(!entry||!context||entry.expires<=Date.now())chemAiError_('log_expired');
  if(!entry.result||!entry.result.reply)chemAiError_('log_unavailable');
  try {
   const sheet=SpreadsheetApp.openById(CHEM_AI_SPREADSHEET_ID).getSheetByName('AI質問');
   if(!sheet||JSON.stringify(sheet.getRange(1,1,1,5).getValues()[0])!==JSON.stringify(['日時','ユーザー名','問題','質問','解答']))chemAiError_('log_failed');
   if(context.logged)return {logged:true};
   const reply=entry.result.reply;
   const answer='結論\n'+reply.conclusion+'\n\n区別するポイント\n'+reply.distinction+'\n\n確認の問い\n'+reply.checkQuestion;
   if(!context.row) {
    const counter='CHEM_QUESTION_LOG_ROW_'+sheet.getSheetId();
    const prior=chemAiRead_(p,counter,{row:1});
    context.row=Math.max(sheet.getLastRow(),prior.row)+1;
    context.stamp=(Date.now()+9*3600000)/86400000+25569;
    context.username=d.username.trim();
    // Reserve a unique row durably before writing. Failed reservations may leave
    // a blank row, but concurrent/retried requests never share a destination.
    chemAiPut_(p,counter,{row:context.row});
    chemAiPut_(p,'CHEM_AI_LOG_'+hash,context);
   }
   if(context.row>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),context.row-sheet.getMaxRows());
   const values=[context.stamp,context.username,context.prompt,context.question,answer];
   const range=sheet.getRange(context.row,1,1,5),current=range.getValues()[0];
   const same=current.every((value,i)=>i===0&&value instanceof Date?Math.abs((value.getTime()/86400000+25569)-values[0])<1/86400000:String(value)===String(values[i]));
   if(!same&&current.some(value=>value!==''))chemAiError_('log_failed');
   if(!same) {
    range.setNumberFormats([['yyyy/MM/dd HH:mm','@','@','@','@']]);
    // Prefix text with an apostrophe so leading =, +, - and @ stay literal.
    range.setValues([[values[0],...values.slice(1).map(value=>"'"+value)]]);
    range.setWrap(true).setVerticalAlignment('top');
    SpreadsheetApp.flush();
   }
   context.logged=true;
   chemAiPut_(p,'CHEM_AI_LOG_'+hash,context);
   return {logged:true};
  } catch(e) {chemAiError_('log_failed');}
 });
}
