// Run against npm run dev. No requests to production; fixtures and POST responses stay in the browser.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs'), assert = require('assert');
const base = process.env.APP_URL || 'http://127.0.0.1:5173';
const rows = JSON.parse(fs.readFileSync('learning/inorganic.json', 'utf8'));
const fixtures = Object.fromEntries(['inorganic','compounds','reactions','experiments'].map(type => {
  const data = JSON.parse(fs.readFileSync(`learning/${type}.json`, 'utf8'));
  const keys = Object.keys(data[0]);
  const csv = [keys, ...data.map(r => keys.map(k => r[k] ?? ''))].map(row => row.map(v => '"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
  return [type, {csv}];
}));
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const modulePage = await browser.newPage();
    await modulePage.goto(base);
    const result = await modulePage.evaluate(async rows => {
      const m = await import('/src/utils/inorganicUnits.ts');
      // Classification only needs stable IDs and answer availability, independently of CSV parser.
      const active = rows.filter(r => r.learning_status !== '保留').map(r => ({id:r.question_id, products:r.reaction_after_ja, conditions:r.b_answer, observations:r.observations}));
      const checks=[];
      const ensure=(ok,message)=>{if(!ok)throw Error(message)};
      const allIds=m.inorganicUnits.flatMap(u=>u.questionIds);
      ensure(allIds.length===90 && new Set(allIds).size===90, '90 IDs classified exactly once');
      ensure(rows.every(r=>allIds.includes(r.question_id)), 'All source IDs mapped');
      for(const key of ['products','conditions','observations']) {
        const eligible=active.filter(r=>r[key]); const units=m.getInorganicUnits(eligible);
        ensure(units.flatMap(u=>u.reactions).length===eligible.length,'No loss or duplicate '+key);
        for(const u of units.filter(u=>u.reactions.length)) {
          const settings={learningMode:'unit-sequential',unitId:u.id,allQuestionCount:u.reactions.length};
          const expected=u.questionIds.filter(id=>eligible.some(r=>r.id===id));
          const seq=m.buildInorganicSession([...eligible].reverse(),settings).map(r=>r.id);
          ensure(JSON.stringify(seq)===JSON.stringify(expected),'Order independent of Sheet rows '+u.id);
          const sequences=new Set();
          for(let i=0;i<50;i++) {
            const mixed=m.buildInorganicSession(eligible,{...settings,learningMode:'unit-shuffle'}).map(r=>r.id);
            ensure(mixed.length===seq.length && [...mixed].sort().join() === [...seq].sort().join(),'Unit boundary');sequences.add(mixed.join());
          }
          ensure(seq.length<2 || sequences.size>1,'Unit shuffle');
          const next=m.nextInorganicUnit(eligible,settings);
          if(next)ensure(next.reactions.length>0,'Next skips empty');
        }
        const sampled=new Set();
        for(let i=0;i<100;i++) {
          const set=m.buildInorganicSession(eligible,{learningMode:'global-shuffle',allQuestionCount:10});
          ensure(set.length===Math.min(10,eligible.length) && new Set(set.map(r=>r.id)).size===set.length,'Global size and uniqueness');
          set.forEach(r=>sampled.add(r.id));
        }
        ensure(sampled.size===eligible.length,'Global reaches all units');
        checks.push({key,count:eligible.length,units:units.map(u=>`${u.id}:${u.reactions.length}`)});
      }
      const keys=['unit-sequential','unit-shuffle','global-shuffle'].map(learningMode=>m.inorganicRangeKey({learningMode,unitId:'gases',allQuestionCount:6}));
      ensure(new Set(keys).size===3 && !keys.includes('all-6'),'Scores isolated');
      ensure(m.getInorganicUnits([{id:'new-id'}]).at(-1).id==='unclassified','Unknown visible');
      return checks;
    }, rows);
    console.log('DATA_PASS',JSON.stringify(result));await modulePage.close();
    for (const width of [320,844,1280]) for (const type of ['A','B','C']) {
      const p=await browser.newPage({viewport:{width,height:width===844?390:900}});p.setDefaultTimeout(10000);
      const errors=[],posts=[];p.on('pageerror',e=>errors.push(e.message));
      await p.addInitScript(()=>{localStorage.setItem('chem.users',JSON.stringify([{userKey:'qa-local',displayName:'確認',isPublic:false,createdAt:1}]));localStorage.setItem('chem.activeUser','qa-local')});
      await p.route('https://**/*',r=>{
        if(r.request().method()==='POST'){posts.push(r.request().postData());return r.fulfill({status:200,body:'{"ok":true}'});}
        let key=new URL(r.request().url()).searchParams.get('type');key=key==='inorganic-new'?'inorganic':key==='experiment'?'experiments':key;
        return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixtures[key]||[])});
      });
      await p.goto(base);await p.getByRole('group',{name:'文字の大きさ'}).getByRole('button',{name:'大',exact:true}).click();
      await p.getByRole('button',{name:/02 \/ INORGANIC/}).click();await p.getByRole('button',{name:new RegExp('^タイプ'+type)}).click();
      assert.equal(await p.locator('.learning-mode-list [aria-pressed=true] strong').innerText(),'単元順');
      for(const mode of ['単元順','単元内ランダム','完全ランダム']) {
        await p.getByRole('button',{name:new RegExp('^'+mode)}).click();
        if(mode==='完全ランダム')await p.getByRole('button',{name:'10問',exact:true}).click();
        const bad=await p.evaluate(()=>[...document.querySelectorAll('.inorganic-learning-selector button')].filter(e=>e.getBoundingClientRect().right>innerWidth+2 || e.scrollWidth>e.clientWidth+3).map(e=>e.textContent));assert.deepEqual(bad,[],'Selector fits '+width);
        if(width===320 && mode==='単元順') { await p.evaluate(()=>window.scrollTo(0,0)); await p.screenshot({path:`/private/tmp/chemistry-units-selector-${type}.png`,fullPage:true}); }
        const button=p.locator('.learning-start');const count=Number((await button.innerText()).match(/\d+/)[0]);
        await button.click();await p.locator('.option-button').first().waitFor();
        assert((await p.locator('.learning-session-label').innerText()).includes(mode));
        // Complete first unit at 320px to prove next-unit remount and result/log separation.
        const finish=width===320 && mode==='単元順';
        for(let q=0;q<(finish?count:1);q++) {
          await p.waitForTimeout(350); console.log('ANSWER',width,type,mode,q);
          const before=await p.locator('.option-button').evaluateAll(es=>es.map(e=>{const c=e.cloneNode(true);c.querySelectorAll('.result-icon').forEach(n=>n.remove());return c.textContent;}));
          await p.locator('.option-button').first().click();await p.getByText('覚えるポイント',{exact:true}).waitFor();
          assert.deepEqual(await p.locator('.option-button').evaluateAll(es=>es.map(e=>{const c=e.cloneNode(true);c.querySelectorAll('.result-icon').forEach(n=>n.remove());return c.textContent;})),before,'Choice order stable after answer');
          if(finish){await p.waitForTimeout(650);await p.locator('.next-button-inline').click();}
        }
        if(finish){await p.getByRole('button',{name:'次の単元へ',exact:true}).waitFor();const label=await p.locator('.learning-session-label').innerText();await p.getByRole('button',{name:'次の単元へ',exact:true}).click();await p.locator('.option-button').first().waitFor();assert.notEqual(await p.locator('.learning-session-label').innerText(),label);assert((await p.locator('.progress-text').innerText()).includes('1'));await p.locator('.option-button').first().click();await p.getByText('覚えるポイント',{exact:true}).waitFor();}
        await p.locator('.back-button').first().click();await p.locator('.learning-start').waitFor();
      }
      assert.deepEqual(errors,[]);console.log('UI_PASS',width,type,'posts intercepted',posts.length);await p.close();
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
