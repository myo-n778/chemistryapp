import {readFileSync,writeFileSync} from 'node:fs';
import {buildTutorQuestions} from '../server/ai-tutor-bank.mjs';
import {MODEL,schema,instructions} from '../server/ai-tutor.mjs';
const sheetSource=readFileSync(new URL('./sheets-source.js',import.meta.url),'utf8');
const converter=buildTutorQuestions.toString().replace('buildTutorQuestions','chemAiBuildQuestions_');
const source=readFileSync(new URL('./tutor.template.js',import.meta.url),'utf8');
const output='// npm run ai:gas:build で生成した一括版。教材は既存スプレッドシートから読み取ります。APIキーはここに記載しないでください。\n'+source.replace('__SHEETS_SOURCE__',()=>sheetSource+'\n'+converter).replace('__MODEL__',JSON.stringify(MODEL)).replace('__SCHEMA__',JSON.stringify(schema)).replace('__INSTRUCTIONS__',JSON.stringify(instructions));
const target=new URL('./Code.gs',import.meta.url);
if(process.argv.includes('--check')) {if(readFileSync(target,'utf8')!==output)throw Error('Regenerate Code.gs');}
else writeFileSync(target,output);
console.log(JSON.stringify({source:'existing-spreadsheet',bytes:Buffer.byteLength(output),checked:process.argv.includes('--check')}));
