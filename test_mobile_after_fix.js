// 修复后回归测试：手机端 + 桌面端都跑
const puppeteer = require('puppeteer-core');
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--enable-webgl', '--use-gl=angle', '--window-size=375,812']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1');

  const failed = [];
  page.on('response', r => {
    if (r.status() >= 400 && !r.url().includes('favicon')) failed.push(`${r.status()} ${r.url().split('/').slice(-2).join('/')}`);
  });

  const t0 = Date.now();
  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await wait(2500);
  await page.click('#openBtn');
  await page.waitForFunction(() => !document.getElementById('loader'), { timeout: 90000 });
  await wait(1500);
  await page.click('#openChapterBtn');
  await page.waitForSelector('.vdot');
  const dots = await page.$$('.vdot');

  // 走所有章节
  const results = [];
  for (let i = 0; i < dots.length; i++){
    const t = Date.now();
    await dots[i].evaluate(d => d.click());
    try {
      await page.waitForFunction(() => document.querySelector('.scene-title')?.textContent?.length > 0, { timeout: 10000 });
    } catch(e){
      results.push({ idx: i, ok: false, reason: 'no title' });
      continue;
    }
    await wait(800);
    const state = await page.evaluate(() => {
      const imgs = document.querySelectorAll('#sceneFrame img');
      const vids = document.querySelectorAll('video');
      const allImgsOk = Array.from(imgs).every(i => i.complete && i.naturalWidth > 0);
      const imgsOk = Array.from(imgs).filter(i => i.complete && i.naturalWidth > 0).length;
      const title = document.querySelector('.scene-title')?.textContent || '';
      const counter = document.querySelector('.scene-counter')?.textContent || '';
      const videoOk = Array.from(vids).every(v => v.readyState >= 1);
      return { imgs, imgsOk, allImgsOk, vids: vids.length, videoOk, title, counter };
    });
    const enterMs = Date.now() - t;
    const ok = state.imgs === 0 ? state.videoOk || state.vids > 0 : state.allImgsOk;
    results.push({ idx: i, ok, enterMs, ...state });
  }

  console.log('=== 章节进入结果 ===');
  results.forEach((r, i) => {
    if (r.ok) console.log(`✓ idx=${r.idx} "${r.title}" enter=${r.enterMs}ms img=${r.imgsOk}/${r.imgs} vid=${r.vids} counter=${r.counter}`);
    else console.log(`✗ idx=${r.idx} ok=${r.ok} reason=${r.reason || 'photo not loaded'} "${r.title || '?'}" img=${r.imgsOk || 0}/${r.imgs || 0}`);
  });

  console.log('\n=== 404 ===');
  console.log(failed.length ? failed : 'none (favicon excluded)');

  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });