// 教材は既存の chemistry スプレッドシートで管理します。全教材の埋込みはしません。
const CHEM_AI_SPREADSHEET_ID = '1QxRAbYbN0tA3nmBgT7yL4HhnIPqW_QeFFkzGKkDLda0';
// これは通信形式の版です。教材の一致は各問題のSHA-256で確認します。
const CHEM_AI_PROTOCOL = 'sheets-v1';
function chemAiQuestion_(category,mode,id) {
 const table=mode==='experiment'?'experiment':
  category==='organic'&&['structure-to-name','name-to-structure','compound-type'].includes(mode)?'compounds':
  category==='organic'&&['reaction','substitution'].includes(mode)?'reactions':
  category==='inorganic'&&['inorganic-type-a','inorganic-type-b','inorganic-type-c'].includes(mode)?'inorganic':null;
 if(!table)chemAiError_('material_mismatch');
 const required={compounds:['id','name','type','atoms','bonds'],reactions:['from','to','reagent'],experiment:['question','1','2','3','4','answer','explanation'],inorganic:['question_id','reactants_tex','products_tex','observations']};
 let rows;
 try {
  const sheet=SpreadsheetApp.openById(CHEM_AI_SPREADSHEET_ID).getSheetByName(table);
  if(!sheet)chemAiError_('material_source_error');
  const height=sheet.getLastRow(),width=sheet.getLastColumn();
  if(height<2||width<1||height*width>50000)chemAiError_('material_source_error');
  const values=sheet.getRange(1,1,height,width).getValues();
  const headers=values.shift().map(v=>String(v).trim());
  if(required[table].some(h=>!headers.includes(h))||headers.filter(Boolean).length!==new Set(headers.filter(Boolean)).size)chemAiError_('material_source_error');
  rows=values.filter(row=>row.some(v=>String(v).trim())).map(row=>Object.fromEntries(headers.map((h,i)=>[h,String(row[i]??'')]).filter(([h])=>h)));
 } catch(e) {chemAiError_('material_source_error');}
 try {
  const sign=q=>chemAiHash_(JSON.stringify([q.id,q.mode,q.category,q.prompt,q.correct,q.explanation||'',q.structure||null]));
  const questions=chemAiBuildQuestions_(table==='compounds'?rows:[],table==='reactions'?rows:[],table==='experiment'?rows:[],table==='inorganic'?rows:[],sign);
  const q=questions.get(category+':'+mode+':'+id);
  if(!q||!q.correct||!q.prompt)chemAiError_('material_mismatch');
  return q;
 } catch(e) {if(e.chemCode)throw e;chemAiError_('material_source_error');}
}
