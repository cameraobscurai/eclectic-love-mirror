import { chromium } = require('playwright');
import { mkdirSync } from 'fs';

const DIR = '/tmp/browser/glitch';
mkdirSync(DIR, { recursive: true });
const BASE = 'http://localhost:8080';

const log = [];
function note(msg) { console.log('[AUDIT]', msg); log.push(msg); }

async function snap(page, name) {
  await page.screenshot({ path: `${DIR}/${name}.png`, fullPage: true });
  note(`  📸 screenshot: ${DIR}/${name}.png`);
}

async function run() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });

  // ── DESKTOP 1280 ──────────────────────────────────────────────────────────
  note('=== DESKTOP 1280×800 ===');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const consoleErrs = [], netFails = [];
  page.on('console', m => { if (m.type()==='error'||m.type()==='warning') consoleErrs.push(`[${m.type()}] ${m.text()}`); });
  page.on('response', r => { if(r.status()>=400) netFails.push(`${r.status()} ${r.request().method()} ${r.url()}`); });
  page.on('requestfailed', r => netFails.push(`[FAILED] ${r.url()} — ${r.failure()?.errorText}`));

  // ── /stylebrief/ ─────────────────────────────────────────────────────────
  note('--- /stylebrief/ ---');
  await page.goto(`${BASE}/stylebrief/`, { waitUntil:'networkidle', timeout:30000 }).catch(e=>note('ERR: '+e));
  await snap(page, '01-desktop-index');
  const h1 = await page.$eval('h1', el=>el.textContent?.trim()).catch(()=>null);
  note(`  h1: "${h1}"`);
  const broken = await page.evaluate(()=>[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src));
  if(broken.length) note(`  BROKEN IMAGES: ${broken.join(', ')}`);
  else note('  images OK');

  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await page.waitForTimeout(600);
  await snap(page, '02-desktop-index-bottom');

  // Fill form
  note('--- Filling form ---');
  // name — find first text input
  const inputs = await page.$$('input');
  note(`  total inputs found: ${inputs.length}`);
  for (const inp of inputs) {
    const t = await inp.getAttribute('type');
    const p = await inp.getAttribute('placeholder');
    const n = await inp.getAttribute('name');
    note(`    input type="${t}" name="${n}" placeholder="${p}"`);
  }

  // Fill by placeholder/type
  await page.fill('input[type="email"]', 'jane@example.com').catch(()=>note('  no email input'));
  await page.fill('input[type="tel"]', '303-555-0000').catch(()=>note('  no tel input'));
  await page.fill('input[type="date"]', '2025-10-01').catch(()=>note('  no date input'));
  // text inputs
  const textInputs = await page.$$('input[type="text"]');
  if(textInputs[0]) await textInputs[0].fill('Jane Audit').catch(()=>{});
  const textarea = await page.$('textarea');
  if(textarea) await textarea.fill('Dark and dramatic, velvet textures, gold accents').catch(()=>{});

  // Scope + budget chips
  const allBtns = await page.$$('button');
  for(const b of allBtns){
    const t = await b.textContent();
    if(t?.trim()==='Full-service design + production'){ await b.click(); note(`  clicked scope: ${t.trim()}`); break; }
  }
  for(const b of await page.$$('button')){
    const t = await b.textContent();
    if(t?.includes('$25k – $75k')){ await b.click(); note(`  clicked budget: ${t.trim()}`); break; }
  }

  await snap(page, '03-desktop-form-filled');

  // Submit
  const submitBtn = await page.$('button[type="submit"]');
  if(!submitBtn){ note('  WARNING: no submit button found'); }
  else {
    const dis = await submitBtn.evaluate(el=>el.disabled);
    const txt = await submitBtn.evaluate(el=>el.textContent?.trim());
    note(`  submit button: "${txt}", disabled=${dis}`);
    if(!dis){
      note('  Clicking submit...');
      await Promise.all([
        page.waitForNavigation({ timeout:10000 }).catch(()=>{}),
        submitBtn.click()
      ]);
      await page.waitForTimeout(3000);
      const url = page.url();
      note(`  URL after submit: ${url}`);
      await snap(page, '04-desktop-after-submit');
      if(url.includes('/thanks')) note('  ✓ Reached /thanks');
      else note('  ✗ Did NOT reach /thanks');
      // Check for submit error
      const errEl = await page.$('[role="alert"]').catch(()=>null);
      if(errEl){ const t=await errEl.textContent(); note(`  Alert text: "${t}"`); }
    } else {
      note('  Submit disabled. canSubmit=false (probably missing required fields with no images)');
      await snap(page, '04-desktop-submit-disabled');
    }
  }

  // ── /stylebrief/thanks direct ─────────────────────────────────────────────
  note('--- /stylebrief/thanks (direct) ---');
  await page.goto(`${BASE}/stylebrief/thanks`, { waitUntil:'networkidle', timeout:30000 }).catch(e=>note('ERR: '+e));
  await snap(page, '05-desktop-thanks');
  const h1Thanks = await page.$eval('h1', el=>el.textContent?.trim()).catch(()=>'NOT FOUND');
  note(`  h1: "${h1Thanks}"`);
  const brokenThanks = await page.evaluate(()=>[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src));
  if(brokenThanks.length) note(`  BROKEN IMAGES: ${brokenThanks.join(', ')}`);

  // ── /stylebrief/three ─────────────────────────────────────────────────────
  note('--- /stylebrief/three ---');
  await page.goto(`${BASE}/stylebrief/three`, { waitUntil:'networkidle', timeout:30000 }).catch(e=>note('ERR: '+e));
  await snap(page, '06-desktop-three');
  const mvEl = await page.$('model-viewer');
  note(`  model-viewer in DOM: ${!!mvEl}`);
  if(mvEl){
    const src = await mvEl.getAttribute('src');
    note(`  model src: ${src}`);
  }
  const brokenThree = await page.evaluate(()=>[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src));
  if(brokenThree.length) note(`  BROKEN IMAGES: ${brokenThree.join(', ')}`);

  // ── /admin/studio ─────────────────────────────────────────────────────────
  note('--- /admin/studio ---');
  const adminNetFails = [];
  page.on('response', r=>{ if(r.status()===401||r.status()===403) adminNetFails.push(`${r.status()} ${r.url()}`); });
  await page.goto(`${BASE}/admin/studio`, { waitUntil:'networkidle', timeout:30000 }).catch(e=>note('ERR: '+e));
  const adminUrl = page.url();
  note(`  Landing URL: ${adminUrl}`);
  await snap(page, '07-admin-studio');
  const adminH1 = await page.$eval('h1', el=>el.textContent?.trim()).catch(()=>'NOT FOUND');
  note(`  h1: "${adminH1}"`);
  if(adminNetFails.length) note(`  Auth failures: ${adminNetFails.join(', ')}`);

  // ── MOBILE 375 ────────────────────────────────────────────────────────────
  note('=== MOBILE 375×812 ===');
  await ctx.close();
  const mctx = await browser.newContext({ viewport:{ width:375, height:812 } });
  const mob = await mctx.newPage();
  const mobErrs=[], mobNet=[];
  mob.on('console', m=>{ if(m.type()==='error') mobErrs.push(m.text()); });
  mob.on('response', r=>{ if(r.status()>=400) mobNet.push(`${r.status()} ${r.url()}`); });

  await mob.goto(`${BASE}/stylebrief/`, { waitUntil:'networkidle', timeout:30000 }).catch(e=>note('ERR: '+e));
  await snap(mob, '08-mobile-index');
  await mob.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await mob.waitForTimeout(400);
  await snap(mob, '09-mobile-index-bottom');

  // Check overflow / horizontal scroll
  const bodyWidth = await mob.evaluate(()=>document.body.scrollWidth);
  const viewportW = 375;
  if(bodyWidth > viewportW) note(`  LAYOUT GLITCH: body scrollWidth=${bodyWidth} > viewport=${viewportW}`);
  else note(`  No horizontal overflow (scrollWidth=${bodyWidth})`);

  await mob.goto(`${BASE}/stylebrief/thanks`, { waitUntil:'networkidle', timeout:30000 }).catch(e=>note('ERR: '+e));
  await snap(mob, '10-mobile-thanks');

  await mob.goto(`${BASE}/stylebrief/three`, { waitUntil:'networkidle', timeout:30000 }).catch(e=>note('ERR: '+e));
  await snap(mob, '11-mobile-three');
  const mvMob = await mob.$('model-viewer');
  note(`  mobile model-viewer: ${!!mvMob}`);

  await mctx.close();
  await browser.close();

  // Summary
  note('');
  note('=== NETWORK FAILURES (desktop) ===');
  netFails.forEach(f=>note('  '+f));
  note('=== CONSOLE ERRORS/WARNINGS (desktop) ===');
  consoleErrs.forEach(e=>note('  '+e));
  note('=== MOBILE NETWORK FAILURES ===');
  mobNet.forEach(f=>note('  '+f));
  note('=== MOBILE CONSOLE ERRORS ===');
  mobErrs.forEach(e=>note('  '+e));
}

run().catch(e=>{ console.error('FATAL',e); process.exit(1); });
