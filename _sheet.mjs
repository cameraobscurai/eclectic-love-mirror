import fs from 'node:fs'; import path from 'node:path'; import sharp from 'sharp';
const dir='/tmp/normalized-covers';
const rep=JSON.parse(fs.readFileSync(path.join(dir,'_report.json'),'utf8'));
const CELL=300, COLS=7;
const items=rep.ok;
const rows=Math.ceil(items.length/COLS)*2;
const comp=[];
for(let i=0;i<items.length;i++){
  const r=Math.floor(i/COLS), c=i%COLS;
  const before=Buffer.from(await (await fetch(items[i].sourceUrl)).arrayBuffer());
  const b=await sharp(before).flatten({background:'#eeeeee'}).resize(CELL,CELL,{fit:'contain',background:'#eeeeee'}).png().toBuffer();
  const a=await sharp(path.join(dir,items[i].slug+'.png')).flatten({background:'#ffffff'}).resize(CELL,CELL,{fit:'contain',background:'#ffffff'}).png().toBuffer();
  comp.push({input:b,left:c*CELL,top:r*2*CELL});
  comp.push({input:a,left:c*CELL,top:(r*2+1)*CELL});
}
await sharp({create:{width:COLS*CELL,height:rows*CELL,channels:3,background:'#ffffff'}}).composite(comp).jpeg({quality:82}).toFile('/tmp/sheet.jpg');
console.log('ok', items.map(i=>i.slug).join('\n'));
