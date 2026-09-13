const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),assert=require('assert');
const bank=JSON.parse(fs.readFileSync('learning/experiments.json','utf8'));
const keys=['question','1','2','3','4','answer','explanation','question_id','category','unit'];
const csv=rows=>[keys,...rows.map(r=>keys.map(k=>r[k]??''))].map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n');
const fixtures=Object.fromEntries(['inorganic','compounds','reactions'].map(t=>{let rows=JSON.parse(fs.readFileSync(`learning/${t}.json`));const h=Object.keys(rows[0]);return[t,{csv:[h,...rows.map(r=>h.map(k=>r[k]??''))].map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n')}]}));
fixtures.experiment={csv:csv(bank)};
const base=process.env.APP_URL||'http://127.0.0.1:5173';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
for(const width of [320,844,1280])for(const cat of ['organic','inorganic']){
 const p=await browser.newPage({viewport:{width,height:1000}});p.setDefaultTimeout(12000);const errors=[],requests=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{localStorage.setItem('chem.users',JSON.stringify([{userKey:'qa-expansion',displayName:'検証',isPublic:false,createdAt:1}]));localStorage.setItem('chem.activeUser','qa-expansion')});
 await p.route('https://script.google.com/**',r=>{if(r.request().method()!=='GET')return r.fulfill({status:200,body:'{}'});const u=new URL(r.request().url()),type=u.searchParams.get('type');if(type)requests.push(type);return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixtures[type==='inorganic-new'?'inorganic':type]||[])});});
 await p.goto(base);await p.getByRole('group',{name:'文字の大きさ'}).getByRole('button',{name:'大',exact:true}).click();await p.getByRole('button',{name:cat==='organic'?/01 \/ ORGANIC/:/02 \/ INORGANIC/}).click();
 await p.getByRole('button',{name:cat==='organic'?/^⑥/:/タイプD/}).click();await p.getByRole('button',{name:'1-10',exact:true}).waitFor();
 const expected=bank.filter(r=>r.category===cat);assert.equal(expected.length,cat==='organic'?78:60);assert(requests.includes('experiment'));assert(!requests.includes('inorganic-new'),'D loaded ABC');
 const label=await p.getByLabel('選択中の出題タイプ',{exact:true}).innerText();assert(label.startsWith(cat==='organic'?'有機化学':'無機化学'));
 await p.getByRole('button',{name:'Sequential',exact:true}).click();await p.getByRole('button',{name:'All Questions',exact:true}).click();await p.getByRole('button',{name:'ALL',exact:true}).click();
 // Each authored question is rendered and graded at the narrowest width. Other widths sample both ends via ranges below.
 const limit=width===320 && !process.env.SMOKE_ONLY?expected.length:3;assert.equal(await p.locator('h1').innerText(),(cat==='inorganic'?'無機化学':'有機化学')+'Drill');
 for(let n=0;n<limit;n++){
   const row=expected[n];await p.locator('.question-text-inline').waitFor();assert.equal((await p.locator('.question-text-inline').innerText()).replace(/\s/g,''),row.question.replace(/\s/g,''),row.question_id);
   const options=p.locator('.options-container .option-button');const texts=await options.allTextContents();assert.equal(texts.length,[1,2,3,4].filter(k=>row[k]).length);
   const answer=String(row[row.answer]);const ix=texts.findIndex(t=>t.replace(/\s/g,'')===answer.replace(/\s/g,''));assert(ix>=0,'missing answer '+row.question_id);
   for(const e of await options.all())assert(await e.evaluate(e=>e.scrollWidth<=e.clientWidth+2),'option overflow '+row.question_id);
   await options.nth(n%2===0?ix:(ix+1)%texts.length).click();await p.getByText('覚えるポイント',{exact:true}).waitFor();assert.equal(await p.locator('.option-button.correct').count(),1);assert.equal((await p.locator('.option-button.correct').innerText()).replace(/[✓\s]/g,''),answer.replace(/\s/g,''));
   assert(await p.locator(n%2===0?'.result-correct':'.result-incorrect').isVisible());
   if(n===Math.min(limit-1,2))await p.screenshot({path:`/private/tmp/chemistry-expansion-${cat}-${width}.png`,fullPage:true});
   if(n<limit-1){await p.waitForTimeout(350);await p.getByRole('button',{name:'Next',exact:true}).click();await p.waitForTimeout(350);}
 }
 if(width===320 && !process.env.SMOKE_ONLY){await p.waitForTimeout(350);await p.getByRole('button',{name:'Next',exact:true}).click();await p.waitForTimeout(350);await p.locator('.quiz-summary-overlay').waitFor();const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('chem.sessionLogs')||'[]'));assert(saved.length>0);assert.equal(saved.at(-1).category,cat);assert.equal(saved.at(-1).mode,'experiment-'+cat);}
 assert.deepEqual(errors,[]);console.log('EXPANSION_UI_PASS',width,cat,limit,requests);await p.close();
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
