import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/bin/chromium', args:['--no-sandbox'] });
const p = await (await b.newContext({viewport:{width:1440,height:1200}})).newPage();
await p.goto('http://localhost:8080/collection?group=seating',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(3000);
console.log(await p.evaluate(()=>{
  const all=[...document.querySelectorAll('img')];
  const m=[...document.querySelectorAll('main img')];
  const big=all.filter(i=>i.getBoundingClientRect().width>30);
  return {all:all.length, inMain:m.length, big:big.length,
    sample: big.slice(0,3).map(i=>({alt:i.alt, complete:i.complete, nw:i.naturalWidth, src:i.currentSrc.slice(0,60), co:i.crossOrigin}))};
}));
await b.close();
