const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('fs'),assert=require('assert');
const fixtures=Object.fromEntries(['inorganic','compounds','reactions','experiments'].map(type=>{
 let rows=JSON.parse(fs.readFileSync(`learning/${type}.json`,'utf8'));

 const keys=type==='experiments' ? ['question','1','2','3','4','answer','explanation','question_id'] : Object.keys(rows[0]);return [type,{csv:[keys,...rows.map(r=>keys.map(k=>r[k]??''))].map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n')}];
}));
const base=process.env.APP_URL || 'http://127.0.0.1:5173';
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try {
for(const width of [320,844,1280]){
 const p=await b.newPage({viewport:{width,height:900}});p.setDefaultTimeout(8000);
 await p.addInitScript(()=>{localStorage.setItem('chem.users',JSON.stringify([{userKey:'qa-local',displayName:'確認',isPublic:false,createdAt:1}]));localStorage.setItem('chem.activeUser','qa-local')});
 await p.route('https://script.google.com/**',r=>{if(r.request().method()!=='GET')return r.fulfill({status:200,body:'{}'});let type=new URL(r.request().url()).searchParams.get('type');type=type==='experiment'?'experiments':type==='inorganic-new'?'inorganic':type;return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixtures[type]||[])});});
 await p.goto(base);await p.getByRole('group',{name:'文字の大きさ'}).getByRole('button',{name:'大',exact:true}).click();await p.getByRole('button',{name:/01 \/ ORGANIC/}).click();await p.getByRole('button',{name:/^①/}).click();
 await p.getByRole('button',{name:'1-10',exact:true}).waitFor();
 await p.getByRole('button',{name:'10ずつ',exact:true}).click();assert(await p.getByRole('button',{name:'1-10',exact:true}).isVisible());
 await p.getByRole('button',{name:'20ずつ',exact:true}).click();assert(await p.getByRole('button',{name:'1-20',exact:true}).isVisible());
 await p.getByRole('button',{name:'40ずつ',exact:true}).click();assert(await p.getByRole('button',{name:'1-40',exact:true}).isVisible());
 await p.getByRole('button',{name:'All Questions',exact:true}).click();assert(await p.getByRole('button',{name:'ALL',exact:true}).isVisible());assert.equal(await p.getByRole('heading',{name:'問題数を選択',exact:true}).count(),1);
 await p.getByRole('button',{name:'Sequential',exact:true}).click();assert((await p.getByRole('button',{name:'Sequential',exact:true}).getAttribute('class')).includes('active'));
 await p.getByRole('button',{name:'10ずつ',exact:true}).click();await p.waitForTimeout(400);await p.screenshot({path:`/private/tmp/chemistry-range-${width}.png`,fullPage:true});
 const overflow=await p.locator('.start-index-button,.mode-button').evaluateAll(es=>es.filter(e=>e.getBoundingClientRect().right>innerWidth+2||e.getBoundingClientRect().left<0).map(e=>e.textContent));assert.deepEqual(overflow,[]);
 await p.getByRole('button',{name:'All Questions',exact:true}).click();await p.getByRole('button',{name:'10',exact:true}).click();await p.locator('.progress-text').waitFor();assert((await p.locator('.progress-text').innerText()).includes('/ 10'));
 await p.getByRole('button',{name:'return',exact:true}).click();await p.getByRole('button',{name:'All Questions',exact:true}).click();await p.getByRole('button',{name:'ALL',exact:true}).click();await p.locator('.progress-text').waitFor();assert((await p.locator('.progress-text').innerText()).includes('/ 74'));
 console.log('RANGE_SELECTION_PASS',width,'initial, repeat, 10/20/40/all, order, count10, all74');await p.close();
}
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
