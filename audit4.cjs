const { chromium } = require('playwright');
(async () => {
  const storageKey = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
  const sessionJson = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
  const browser = await chromium.launch({ executablePath: '/bin/chromium', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
  const page = await context.newPage();
  const log = (...a) => console.log(...a);
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0,150)); });
  page.on('pageerror', err => consoleErrors.push('PAGEERROR: ' + err.message));

  await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded' });
  if (storageKey && sessionJson) await page.evaluate(({k,v}) => localStorage.setItem(k, v), { k: storageKey, v: sessionJson });

  await page.goto('http://localhost:8080/admin/products', { waitUntil: 'networkidle' });
  await page.click('table tbody tr:first-child');
  await page.waitForTimeout(1500);

  // find drawer container, test scroll
  const drawer = await page.$('[role="dialog"], .drawer, aside');
  log('drawer found:', !!drawer);
  if (drawer) {
    const box = await drawer.boundingBox();
    log('drawer box', JSON.stringify(box));
    await page.mouse.move(box.x + box.width/2, box.y + box.height/2);
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/browser/audit-c/10-drawer-scrolled.png', fullPage: false });
  }

  // check image editor embedded (not modal)
  const imgEditorInline = await page.$('text=/crop|image editor|photo editor/i');
  log('image editor element found:', !!imgEditorInline);

  // Edit title text field
  const titleInput = await page.$('input[name="title"], input[value]:visible');
  const inputs = await page.$$('input[type="text"], textarea');
  log('num text inputs in drawer', inputs.length);
  if (inputs.length) {
    await inputs[0].fill('');
    await inputs[0].type('TEST EDIT ZZZ', {delay: 20});
    await page.waitForTimeout(3000); // wait for potential refetch to stomp
    const val = await inputs[0].inputValue();
    log('value after typing + wait (refetch stomp test):', val);
  }

  // undo button check
  const undoBtn = await page.$('button:has-text("Undo")');
  if (undoBtn) {
    const disabled = await undoBtn.isDisabled();
    log('Undo button disabled while dirty?', disabled);
  } else log('no undo button found');

  // Save button
  const saveBtn = await page.$('button:has-text("Save")');
  if (saveBtn) {
    await saveBtn.click();
    await page.waitForTimeout(1500);
    log('clicked save, console errors so far:', JSON.stringify(consoleErrors.slice(-3)));
  } else log('no save button found');

  await page.screenshot({ path: '/tmp/browser/audit-c/11-drawer-after-save.png', fullPage: true });

  // Publish button
  const publishBtn = await page.$('button:has-text("Publish")');
  log('publish button found:', !!publishBtn);

  log('ALL CONSOLE ERRORS:', JSON.stringify(consoleErrors));
  await browser.close();
})();
