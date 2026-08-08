import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/bin/chromium', args:['--no-sandbox'] });
const ctx = await b.newContext({viewport:{width:1280,height:1800}});
const p = await ctx.newPage();
for (const g of ['seating','tables','lounge-seating','pillows-throws','rugs','furs-pelts','bars','cocktail-bar']) {
  await p.goto(`http://localhost:8080/collection?group=${g}`,{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(2200);
  const n = await p.evaluate(()=>document.querySelectorAll('img[alt]').length);
  const txt = await p.evaluate(()=>document.body.innerText.slice(0,200).replace(/\n/g,' | '));
  console.log(g.padEnd(16), 'imgs=', n, '::', txt);
}
await b.close();
