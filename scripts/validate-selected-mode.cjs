const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('fs'),assert=require('assert');
const fixtures=Object.fromEntries(['inorganic','compounds','reactions','experiments'].map(type=>{
 let rows=JSON.parse(fs.readFileSync(`learning/${type}.json`,'utf8'));

 const keys=type==='experiments' ? ['question','1','2','3','4','answer','explanation','question_id','category','unit'] : Object.keys(rows[0]);return [type,{csv:[keys,...rows.map(r=>keys.map(k=>r[k]??''))].map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n')}];
}));
const base=process.env.APP_URL || 'http://127.0.0.1:5173';
const modes=['① 構造式から名称','② 名称から構造式','③ 化合物の種類','④ 反応（何ができる）','⑤ 反応（何をした）','⑥ 知識・実験・構造決定'];
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try {
for(const width of [320,844,1280]){
const p=await b.newPage({viewport:{width,height:900}});p.setDefaultTimeout(10000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('chem.users',JSON.stringify([{userKey:'qa-local',displayName:'確認',isPublic:false,createdAt:1}]));localStorage.setItem('chem.activeUser','qa-local')});
await p.route('https://script.google.com/**',r=>{if(r.request().method()!=='GET')return r.fulfill({status:200,body:'{}'});let type=new URL(r.request().url()).searchParams.get('type');type=type==='experiment'?'experiments':type==='inorganic-new'?'inorganic':type;return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixtures[type]||[])});});
await p.goto(base);await p.getByRole('group',{name:'文字の大きさ'}).getByRole('button',{name:'大',exact:true}).click();await p.getByRole('button',{name:/01 \/ ORGANIC/}).click();
for(const title of modes){
 await p.getByRole('button',{name:new RegExp('^'+title[0])}).click();await p.getByRole('button',{name:'1-10',exact:true}).waitFor();const label=p.getByLabel('選択中の出題タイプ',{exact:true});await label.waitFor();assert.equal(await label.innerText(),'有機化学 · '+title);assert.equal(await label.count(),1);
 for(const name of ['20ずつ','All Questions','10ずつ']){await p.getByRole('button',{name,exact:true}).click();assert.equal(await label.innerText(),'有機化学 · '+title);assert.equal(await label.count(),1);}
 const box=await label.boundingBox();assert(box.x>=0 && box.x+box.width<=width+1);assert(await label.evaluate(e=>e.scrollWidth<=e.clientWidth+1));
 if(title===modes[0]){await p.waitForTimeout(400);await p.screenshot({path:`/private/tmp/chemistry-selected-mode-${width}.png`,fullPage:true});}
 await p.getByRole('button',{name:'1-10',exact:true}).click();const options=p.locator(title[0]==='②'?'.option-button-structure':title[0]==='③'?'.option-button-compact':'.option-button');await options.first().click();await p.getByText('覚えるポイント',{exact:true}).waitFor();await p.getByRole('button',{name:'return',exact:true}).click();await label.waitFor();assert.equal(await label.innerText(),'有機化学 · '+title);
 await p.locator('.question-count-selector .back-button').click();console.log('SELECTED_MODE_PASS',width,title);
}assert.deepEqual(errors,[]);await p.close();
}
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
