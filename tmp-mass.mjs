import { chromium } from 'playwright';
const GROUPS = ['seating','tables','bars','lighting','large-decor','storage','chandeliers'];
const b = await chromium.launch({ executablePath:'/bin/chromium', args:['--no-sandbox'] });
const ctx = await b.newContext({viewport:{width:1440,height:1200}, deviceScaleFactor:1});
const p = await ctx.newPage();
for (const g of GROUPS) {
  try {
  await p.goto(`http://localhost:8080/collection?group=${g}`,{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(1800);
  for (let i=0;i<8;i++){ await p.mouse.wheel(0,1200); await p.waitForTimeout(450); }
  await p.waitForTimeout(2000);
  const res = await p.evaluate(async () => {
    const imgs = [...document.querySelectorAll('main img')].filter(i=>i.getBoundingClientRect().width>30 && i.complete && i.naturalWidth);
    const rows=[];
    for (const im of imgs) {
      const r = im.getBoundingClientRect();
      let bmp;
      try { const resp = await fetch(im.currentSrc,{mode:'cors'}); bmp = await createImageBitmap(await resp.blob()); }
      catch(e){ rows.push({alt:im.alt, err:String(e).slice(0,40)}); continue; }
      const W=110,H=Math.max(1,Math.round(110*bmp.height/bmp.width));
      const c=new OffscreenCanvas(W,H); const cx=c.getContext('2d',{willReadFrequently:true});
      cx.drawImage(bmp,0,0,W,H);
      const d=cx.getImageData(0,0,W,H).data;
      let op=0,minX=W,maxX=-1,minY=H,maxY=-1;
      for(let y=0;y<H;y++)for(let x=0;x<W;x++){const o=(y*W+x)*4;const a=d[o+3];const lum=(d[o]+d[o+1]+d[o+2])/3;
        if(a>40&&lum<242){op++;if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}}
      // rendered footprint of the source image inside the tile (object-fit contain-ish approx via rect)
      const areaPx = op/(W*H) * r.width * r.height;
      rows.push({alt:im.alt, mass:Math.sqrt(areaPx), tw:Math.round(r.width), th:Math.round(r.height),
        edge:(minX<=0||maxX>=W-1||minY<=0||maxY>=H-1)});
    }
    return rows;
  });
  const ok = res.filter(r=>r.mass);
  const errs = res.filter(r=>r.err);
  const masses = ok.map(r=>r.mass).sort((a,b)=>a-b);
  const med = masses[Math.floor(masses.length/2)]||0;
  const outl = ok.map(r=>({a:r.alt,ratio:+(r.mass/med).toFixed(2)})).filter(r=>r.ratio<0.6||r.ratio>1.45).sort((x,y)=>x.ratio-y.ratio);
  const hs = [...new Set(ok.map(r=>r.th))];
  console.log(`\n=== ${g} n=${ok.length} err=${errs.length} median=${Math.round(med)} tileHeights=${hs.join(',')} outliers=${outl.length}`);
  outl.forEach(o=>console.log(`   ${String(o.ratio).padStart(5)}  ${o.a}`));
  if(errs.length) console.log('   ERR sample:', errs[0].err, errs[0].alt);
  } catch(e){ console.log(`=== ${g} FAILED ${String(e).slice(0,80)}`); }
}
await b.close();
