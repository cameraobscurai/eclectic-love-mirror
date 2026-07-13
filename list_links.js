import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://localhost:8080/gallery', { waitUntil: 'networkidle' });
  const links = await page.$$eval('a', links => links.map(a => ({ text: a.innerText, href: a.href, pathname: a.pathname })));
  console.log(JSON.stringify(links, null, 2));
  await browser.close();
})();
