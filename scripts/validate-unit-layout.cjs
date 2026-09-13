const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('fs'),assert=require('assert');
const fixtures=Object.fromEntries(['inorganic','compounds','reactions','experiments'].map(type=>{
 let rows=JSON.parse(fs.readFileSync(`learning/${type}.json`,'utf8'));

 const keys=type==='experiments' ? ['question','1','2','3','4','answer','explanation','question_id'] : Object.keys(rows[0]);return [type,{csv:[keys,...rows.map(r=>keys.map(k=>r[k]??''))].map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n')}];
}));
const base=process.env.APP_URL || 'http://127.0.0.1:5173';
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try {
for(const [width,zoom] of [[320,1],[844,1],[1280,1],[1600,.8]]){
const p=await b.newPage({viewport:{width,height:900}});p.setDefaultTimeout(10000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('chem.users',JSON.stringify([{userKey:'qa-local',displayName:'確認',isPublic:false,createdAt:1}]));localStorage.setItem('chem.activeUser','qa-local')});
await p.route('https://script.google.com/**',r=>{if(r.request().method()!=='GET')return r.fulfill({status:200,body:'{}'});let type=new URL(r.request().url()).searchParams.get('type');type=type==='experiment'?'experiments':type==='inorganic-new'?'inorganic':type;return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixtures[type]||[])});});
await p.goto(base);if(zoom!==1)await p.evaluate(z=>document.documentElement.style.zoom=String(z),zoom);
await p.getByRole('group',{name:'文字の大きさ'}).getByRole('button',{name:'大',exact:true}).click();await p.getByRole('button',{name:/02 \/ INORGANIC/}).click();
for(const type of ['A','B','C']){
await p.getByRole('button',{name:new RegExp('^タイプ'+type)}).click();await p.locator('.learning-unit-list button').first().waitFor();
const rects=await p.locator('.learning-mode-list button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {top:r.top,height:r.height,right:r.right,left:r.left}}));assert(Math.max(...rects.map(r=>r.top))-Math.min(...rects.map(r=>r.top))<2);assert(rects.every(r=>r.height<=60 && r.left>=0 && r.right<=width+1));
const top=await p.locator('.inorganic-learning-selector').boundingBox(),modes=await p.locator('.learning-mode-list').boundingBox(),unit=await p.locator('.learning-unit-list').boundingBox();assert(modes.y-top.y<25);assert(unit.y-modes.y<210,'Unit list pushed too far down');
if(width>=1280){const us=await p.locator('.learning-unit-list button').evaluateAll(es=>es.slice(0,3).map(e=>e.getBoundingClientRect().top));assert(Math.max(...us)-Math.min(...us)<2,'Desktop must show at least 3 columns');}
if(type==='A'){await p.waitForTimeout(350);await p.screenshot({path:`/private/tmp/chemistry-unit-compact-${width}.png`,fullPage:true});}
for(const mode of ['単元順','単元内ランダム','完全ランダム']){
await p.getByRole('button',{name:mode,exact:true}).click();
if(mode!=='完全ランダム'){const available=p.locator('.learning-unit-list button:not([disabled])');await available.nth(1).click();assert.equal(await available.nth(1).getAttribute('aria-pressed'),'true');}
else await p.getByRole('button',{name:'20問',exact:true}).click();
await p.locator('.learning-start').click();await p.locator('.option-button').first().waitFor();assert((await p.locator('.learning-session-label').innerText()).includes(mode));await p.locator('.option-button').first().click();await p.getByText('覚えるポイント',{exact:true}).waitFor();await p.getByRole('button',{name:'return',exact:true}).click();
}
await p.locator('.learning-back').click();console.log('UNIT_LAYOUT_PASS',width,zoom,type);
}assert.deepEqual(errors,[]);await p.close();
}
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
