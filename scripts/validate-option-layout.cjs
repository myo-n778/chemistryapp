const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('fs'),assert=require('assert');
// The screenshot's third/fourth questions came from a shuffled session. Put those same
// source questions at positions 3/4 in the browser-only fixture, without changing Sheets.
const fixtures=Object.fromEntries(['inorganic','compounds','reactions','experiments'].map(type=>{
 let rows=JSON.parse(fs.readFileSync(`learning/${type}.json`,'utf8'));
 if(type==='experiments'){
  const targets=[rows.find(r=>r.question.includes('フェノールとエタノール')),rows.find(r=>r.question.startsWith('次の物質のうち、NaHCO3水溶液'))];
  assert(targets.every(Boolean));const other=rows.filter(r=>!targets.includes(r));rows=[...other.slice(0,2),...targets,...other.slice(2)];
 }
 const keys=type==='experiments' ? ['question','1','2','3','4','answer','explanation','question_id','category','unit'] : Object.keys(rows[0]);return [type,{csv:[keys,...rows.map(r=>keys.map(k=>r[k]??''))].map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n')}];
}));
const base=process.env.APP_URL || 'http://127.0.0.1:5173';
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
for(const [width,zoom] of [[320,1],[844,1],[1280,1],[1600,.8]]) {
const p=await b.newPage({viewport:{width,height:900}});p.setDefaultTimeout(8000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('chem.users',JSON.stringify([{userKey:'qa-local',displayName:'確認',isPublic:false,createdAt:1}]));localStorage.setItem('chem.activeUser','qa-local')});
await p.route('https://script.google.com/**',r=>{if(r.request().method()!=='GET')return r.fulfill({status:200,body:'{}'});let type=new URL(r.request().url()).searchParams.get('type');type=type==='experiment'?'experiments':type==='inorganic-new'?'inorganic':type;return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixtures[type]||[])});});
await p.goto(base);if(zoom!==1)await p.evaluate(z=>document.documentElement.style.zoom=String(z),zoom);
await p.getByRole('group',{name:'文字の大きさ'}).getByRole('button',{name:'大',exact:true}).click();await p.getByRole('button',{name:/01 \/ ORGANIC/}).click();await p.getByRole('button',{name:/^⑥/}).click();await p.getByRole('button',{name:'Sequential',exact:true}).click();await p.getByRole('button',{name:'10ずつ',exact:true}).click();await p.getByRole('button',{name:'1-10',exact:true}).click();
for(let q=0;q<4;q++){
 await p.locator('.option-button').first().waitFor();await p.waitForTimeout(350);
 if(q===2){
 console.log('QUESTION',q,await p.locator('.progress-text').innerText(),await p.locator('.question-text-inline').innerText());assert((await p.locator('.question-text-inline').innerText()).includes('フェノールとエタノール'));
 const metrics=await p.locator('.option-button').evaluateAll(es=>es.map(e=>{
 const text=e.querySelector('.chemical-text');if(!text)return {error:'missing text group'};
 const r=text.getBoundingClientRect();const parts=[...text.children].map(c=>c.getBoundingClientRect());let gap=0;for(let i=1;i<parts.length;i++)if(Math.abs(parts[i].top-parts[i-1].top)<20)gap=Math.max(gap,parts[i].left-parts[i-1].right);
 return {text:text.textContent,gap,width:r.width,button:e.clientWidth,sub:text.querySelectorAll('sub').length};
 }));
 for(const m of metrics){assert(!m.error);assert(m.gap<8,'Chemical text split apart '+JSON.stringify(m));}
 assert(metrics.some(m=>m.text==='FeCl3水溶液' && m.sub===1));assert(metrics.some(m=>m.text==='NaHCO3水溶液' && m.sub===1));
 await p.screenshot({path:`/private/tmp/chemistry-option-fixed-${width}.png`,fullPage:true});console.log('TEXT_SPACING_PASS',width,zoom,JSON.stringify(metrics));
 }
 await p.locator('.option-button').first().click();await p.getByText('覚えるポイント',{exact:true}).waitFor();
 const next=p.locator('.next-button-mobile');const bounds=await next.boundingBox();assert(bounds.height>=44 && bounds.width>=70,'Next touch target '+JSON.stringify(bounds));
 if(q===3)assert((await p.locator('.question-text-inline').innerText()).includes('次の物質のうち、NaHCO3水溶液'));
 if(q===3)await p.screenshot({path:`/private/tmp/chemistry-next-fixed-${width}.png`,fullPage:true});
 const overflow=await p.locator('.option-button,.next-button-mobile').evaluateAll(es=>es.filter(e=>e.getBoundingClientRect().right>innerWidth+2||e.scrollWidth>e.clientWidth+2).map(e=>e.className));assert.deepEqual(overflow,[]);
 await p.waitForTimeout(650);await next.click();
}
assert((await p.locator('.progress-text').innerText()).includes('5'));assert.deepEqual(errors,[]);console.log('NEXT_CLICK_PASS',width,zoom);await p.close();
}
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
