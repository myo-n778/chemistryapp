const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('assert');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{const p=await b.newPage();
const rows=[
 {userKey:'qa-record',name:'検証',mode:'experiment-organic',correctCount:2,totalCount:10,recordedAt:1},
 {userKey:'qa-record',name:'検証',mode:'experiment-inorganic',correctCount:9,totalCount:10,recordedAt:2},
 {userKey:'qa-record',name:'検証',mode:'inorganic-type-a',correctCount:7,totalCount:10,recordedAt:3},
 {userKey:'qa-record',name:'検証',mode:'structure-to-name-organic',correctCount:4,totalCount:10,recordedAt:4},
];
await p.route('https://script.google.com/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(new URL(r.request().url()).searchParams.get('action')==='rec'?rows:[])}));
await p.goto('http://127.0.0.1:5173');
const result=await p.evaluate(async()=>{const m=await import('/src/utils/sessionLogger.ts');
const cases=[['experiment-inorganic','inorganic'],['inorganic-type-a','inorganic'],['experiment-organic','organic'],['structure-to-name-organic','organic'],['organic','organic']];
for(const [mode,expected]of cases)if(m.recordCategory({mode})!==expected)throw Error(mode);
if(m.recordCategory({mode:'experiment-inorganic',category:'organic'})!=='inorganic')throw Error('legacy incorrect category');
if(m.recordCategory({mode:'unknown',category:'organic'})!=='organic')throw Error('fallback');
return {organic:await m.calculateTenAveFromRec('qa-record','organic','検証',true),inorganic:await m.calculateTenAveFromRec('qa-record','inorganic','検証',true)};});
assert.equal(result.organic,.3);assert.equal(result.inorganic,.8);console.log('RECORD_CATEGORY_PASS',result);
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
