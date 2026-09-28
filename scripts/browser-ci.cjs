
const { chromium, webkit } = require('playwright');
const { createServer } = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const server = createServer((req, res) => {
  const name = new URL(req.url, 'http://localhost').pathname;
  const file = path.join(process.cwd(), name === '/' ? 'index.html' : name);
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  const types = {'.html':'text/html', '.js':'text/javascript', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json'};
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  res.end(fs.readFileSync(file));
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  try {
    for (const engine of [chromium, webkit]) {
      const browser = await engine.launch();
      try {
        const context = await browser.newContext({ viewport: {width:390, height:844}, reducedMotion:'reduce', hasTouch:true });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('https://fonts.googleapis.com/**', route => route.abort());
        await page.route('https://fonts.gstatic.com/**', route => route.abort());
        // The app must work even when an old external rating file cannot load.
        await page.route('**/mastery.js*', route => route.abort());
        await page.clock.install();
        await page.goto(url);
        assert.equal(await page.locator('#map td').count(),64);
        await page.locator('#soundBtn').click();
        await page.locator('[data-n="all"]').click();
        assert.equal(await page.locator('[data-n="7"]').getAttribute('aria-pressed'),'true');
        assert.equal(await page.locator('[data-n="2"]').getAttribute('aria-pressed'),'false');
        await page.locator('#goBtn').click();
        await page.clock.runFor(300);
        await page.locator('#quitBtn').click();
        await page.locator('#goBtn').click();
        await page.clock.runFor(2200);
        assert.equal(await page.locator('#count').isVisible(),true);
        await page.clock.runFor(300);
        assert.equal(await page.locator('#count').isVisible(),false);
        assert.equal(await page.locator('#qa').innerText(),'7');
        let answer = Number(await page.locator('#qa').innerText()) * Number(await page.locator('#qb').innerText());
        await page.locator('[data-k="1"]').click();
        await page.locator('[data-k="del"]').click();
        assert.equal(await page.locator('#ans').innerText(),'?');
        for (const digit of String(answer)) await page.locator('[data-k="'+digit+'"]').click();
        assert.ok(Number(await page.locator('#score').innerText()) > 0);
        await page.clock.runFor(250);
        await page.keyboard.type('00');
        assert.equal(await page.locator('#hint').innerText(),'Запомни!');
        await page.clock.runFor(1400);
        await page.clock.runFor(60000);
        assert.equal(await page.locator('#result').isVisible(),true);
        assert.equal(await page.locator('#rOk').innerText(),'1');
        assert.equal(await page.locator('#rBad').innerText(),'1');
        await page.locator('#againBtn').click();
        await page.clock.runFor(2500);
        assert.equal(await page.locator('#game').isVisible(),true);
        await page.locator('#quitBtn').click();
        assert.equal(await page.locator('#map td').count(),64);
        assert.equal(await page.locator('#fixBtn').isVisible(),true);
        await page.locator('#fixBtn').click();
        await page.clock.runFor(2500);
        await page.locator('#quitBtn').click();
        await page.reload();
        assert.equal(await page.locator('#map td').count(),64);
        assert.equal(await page.locator('#fixBtn').isVisible(),true);
        // Partially damaged legacy storage must not disable all controls.
        await page.evaluate(() => localStorage.setItem('umnozhayka-v1',JSON.stringify({
          tables:[], stats:{'7x8':{n:4,last:null},'bad':{}}, stars:null, best:'invalid'
        })));
        await page.reload();
        assert.equal(await page.locator('#map td').count(),64);
        await page.locator('#goBtn').click();
        await page.clock.runFor(2500);
        assert.equal(await page.locator('#count').isVisible(),false);
        assert.deepEqual(errors,[]);
        await context.close();
        console.log(engine.name() + ': menu, mobile keypad, keyboard, countdown restart, scoring, errors, results, replay, persistence, legacy storage PASS');
      } finally { await browser.close(); }
    }
  } finally { server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
