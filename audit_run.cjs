const { chromium } = require('playwright');
const { mkdirSync } = require('fs');

const DIR = '/tmp/browser/glitch';
mkdirSync(DIR, { recursive: true });
const BASE = 'http://localhost:8080';

const log = [];
function note(msg) { console.log('[AUDIT]', msg); log.push(msg); }

async function snap(page, name) {
  await page.screenshot({ path: `${DIR}/${name}.png`, fullPage: true });
  note(`  📸 ${DIR}/${name}.png`);
}

async function run() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });

  // ── DESKTOP 1280 ─────────────────────────────────────────────────────────
  note('=== DESKTOP 1280x800 ===');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const consoleErrs = [], netFails = [];
  page.on('console', m => { if (m.type()==='error'||m.type()==='warning') consoleErrs.push(`[${m.type()}] ${m.text()}`); });
  page.on('response', r => { if (r.status()>=400) netFails.push(`${r.status()} ${r.request().method()} ${r.url()}`); });
  page.on('requestfailed', r => netFails.push(`[FAILED] ${r.url()} — ${r.failure()&&r.failure().errorText}`));

  // /stylebrief/
  note('--- /stylebrief/ ---');
  await page.goto(`${BASE}/stylebrief/`, { waitUntil:'networkidle', timeout:30000 }).catch(e=>note('NAV ERR: '+e));
  await snap(page, '01-desktop-index');
  const h1 = await page.$eval('h1', el=>el.textContent&&el.textContent.trim()).catch(()=>null);
  note(`  h1: "${h1}"`);
  const broken = await page.evaluate(()=>[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src));
  note(broken.length ? `  BROKEN IMAGES: ${broken.join(', ')}` : '  No broken images');

  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await page.waitForTimeout(800);
  await snap(page, '02-desktop-index-scrolled');

  // Enumerate inputs
  note('--- Form inputs ---');
  const inputs = await page.$$('input');
  note(`  input count: ${inputs.length}`);
  for (const inp of inputs) {
    const t = await inp.getAttribute('type');
    const p = await inp.getAttribute('placeholder');
    const n = await inp.getAttribute('name');
    note(`    <input type="${t}" name="${n}" placeholder="${p}">`);
  }
  const textareas = await page.$$('textarea');
  note(`  textarea count: ${textareas.length}`);

  // Fill fields
  await page.fill('input[type="text"]', 'Jane Audit').catch(()=>note('  no text input'));
  await page.fill('input[type="email"]', 'jane@example.com').catch(()=>note('  no email input'));
  await page.fill('input[type="tel"]', '720-555-0000').catch(()=>note('  no tel input'));
  await page.fill('input[type="date"]', '2025-10-15').catch(()=>note('  no date input'));
  if(textareas.length) await textareas[0].fill('Moody velvet, gold, dark florals').catch(()=>{});

  // Scope
  const allBtns = await page.$$('button');
  let scopeDone=false, budgetDone=false;
  for(const b of allBtns){
    const t = (await b.textContent()||'').trim();
    if(!scopeDone && (t==='Full-service design + production'||t==='Rental from Collection'||t.includes('Full-service'))){
      await b.click(); scopeDone=true; note(`  scope clicked: "${t}"`);
    }
    if(!budgetDone && t.includes('$25k')){
      await b.click(); budgetDone=true; note(`  budget clicked: "${t}"`);
    }
  }
  if(!scopeDone) note('  WARNING: scope buttons not found');
  if(!budgetDone) note('  WARNING: budget buttons not found');

  await snap(page, '03-desktop-form-filled');

  // Inspect submit button
  const submitBtn = await page.$('button[type="submit"]');
  if(!submitBtn){
    note('  WARNING: no submit[type=submit] button');
    // try any button that looks like send
    const allB = await page.$$('button');
    for(const b of allB){
      const t=(await b.textContent()||'').toLowerCase();
      if(t.includes('send')||t.includes('submit')||t.includes('brief')) note(`    candidate button: "${t}"`);
    }
  } else {
    const dis = await submitBtn.evaluate(el=>el.disabled);
    const txt = await submitBtn.evaluate(el=>(el.textContent||'').trim());
    note(`  submit: "${txt}", disabled=${dis}`);
    if(!dis){
      note('  Clicking submit (no inspo images)...');
      await submitBtn.click();
      await page.waitForTimeout(4000);
      const url = page.url();
      note(`  URL after submit: ${url}`);
      await snap(page, '04-desktop-after-submit');
      const errEl = await page.$('[role="alert"],[class*="error"],[class*="Error"]').catch(()=>null);
      if(errEl){ note(`  Error text: "${(await errEl.textContent()||'').trim()}"`); }
    } else {
      note('  Submit disabled (canSubmit=false)');
    }
  }

  // /stylebrief/thanks direct
  note('--- /stylebrief/thanks direct ---');
  await page.goto(`${BASE}/stylebrief/thanks`, { waitUntil:'networkidle', timeout:30000 }).catch(e=>note('ERR: '+e));
  await snap(page, '05-desktop-thanks');
  const thanksH1 = await page.$eval('h1', el=>(el.textContent||'').trim()).catch(()=>'NOT FOUND');
  note(`  h1: "${thanksH1}"`);
  const brokenThanks = await page.evaluate(()=>[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src));
  note(brokenThanks.length ? `  BROKEN: ${brokenThanks.join(', ')}` : '  No broken images');

  // /stylebrief/three
  note('--- /stylebrief/three ---');
  await page.goto(`${BASE}/stylebrief/three`, { waitUntil:'networkidle', timeout:30000 }).catch(e=>note('ERR: '+e));
  await snap(page, '06-desktop-three');
  const mv = await page.$('model-viewer');
  note(`  model-viewer present: ${!!mv}`);
  if(mv){
    const src=await mv.getAttribute('src');
    note(`  model src: ${src}`);
    // Check if model 404'd
  }
  const brokenThree=await page.evaluate(()=>[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src));
  note(brokenThree.length ? `  BROKEN IMAGES: ${brokenThree.join(', ')}` : '  No broken images');

  // /admin/studio
  note('--- /admin/studio ---');
  await page.goto(`${BASE}/admin/studio`, { waitUntil:'networkidle', timeout:30000 }).catch(e=>note('ERR: '+e));
  const adminUrl = page.url();
  note(`  Landing URL: ${adminUrl}`);
  await snap(page, '07-admin-studio');
  const adminH1 = await page.$eval('h1', el=>(el.textContent||'').trim()).catch(()=>'NOT FOUND');
  note(`  h1: "${adminH1}"`);
  // check if redirected to login
  if(adminUrl.includes('/login')) note('  → Redirected to login (auth required)');
  else if(adminUrl.includes('/admin/studio')) note('  → Reached admin/studio without auth');

  await ctx.close();

  // ── MOBILE 375 ────────────────────────────────────────────────────────────
  note('=== MOBILE 375x812 ===');
  const mctx = await browser.newContext({ viewport:{ width:375, height:812 } });
  const mob = await mctx.newPage();
  const mobErrs=[], mobNet=[];
  mob.on('console', m=>{ if(m.type()==='error') mobErrs.push(m.text()); });
  mob.on('response', r=>{ if(r.status()>=400) mobNet.push(`${r.status()} ${r.url()}`); });

  // index
  await mob.goto(`${BASE}/stylebrief/`, { waitUntil:'networkidle', timeout:30000 }).catch(e=>note('ERR: '+e));
  await snap(mob, '08-mobile-index');
  await mob.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await mob.waitForTimeout(500);
  await snap(mob, '09-mobile-index-bottom');
  const scrollW = await mob.evaluate(()=>document.body.scrollWidth);
  note(scrollW>375 ? `  LAYOUT GLITCH: horizontal overflow scrollWidth=${scrollW}` : `  No horizontal overflow (${scrollW}px)`);

  // thanks
  await mob.goto(`${BASE}/stylebrief/thanks`, { waitUntil:'networkidle', timeout:30000 }).catch(e=>note('ERR: '+e));
  await snap(mob, '10-mobile-thanks');
  const mobThanksH1=await mob.$eval('h1', el=>(el.textContent||'').trim()).catch(()=>'NOT FOUND');
  note(`  thanks h1: "${mobThanksH1}"`);

  // three
  await mob.goto(`${BASE}/stylebrief/three`, { waitUntil:'networkidle', timeout:30000 }).catch(e=>note('ERR: '+e));
  await snap(mob, '11-mobile-three');
  await mob.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await mob.waitForTimeout(400);
  await snap(mob, '12-mobile-three-scrolled');

  await mctx.close();
  await browser.close();

  // Summary
  note('');
  note('=== SUMMARY ===');
  note('DESKTOP NETWORK FAILURES:');
  if(netFails.length===0) note('  (none)');
  netFails.forEach(f=>note('  '+f));
  note('DESKTOP CONSOLE ERRORS:');
  if(consoleErrs.length===0) note('  (none)');
  consoleErrs.forEach(e=>note('  '+e));
  note('MOBILE NETWORK FAILURES:');
  if(mobNet.length===0) note('  (none)');
  mobNet.forEach(f=>note('  '+f));
  note('MOBILE CONSOLE ERRORS:');
  if(mobErrs.length===0) note('  (none)');
  mobErrs.forEach(e=>note('  '+e));
}

run().catch(e=>{ console.error('FATAL', e); process.exit(1); });
