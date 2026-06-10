const https = require('https');
const url = 'https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/incoming-photos/bars/CANYON%20Bar%200.png';

https.get(url, (res) => {
  let data = Buffer.alloc(0);
  res.on('data', (chunk) => {
    data = Buffer.concat([data, chunk]);
    if (data.length > 32) {
      if (data.toString('ascii', 1, 4) === 'PNG') {
        const w = data.readUInt32BE(16);
        const h = data.readUInt32BE(20);
        console.log(JSON.stringify({ w, h }));
        process.exit(0);
      }
    }
  });
});
