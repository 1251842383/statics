// 快速切换章节压力测试：测 openChapter 竞态保护是否有效
const puppeteer = require('puppeteer-core');
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--enable-webgl', '--use-gl=angle']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await wait(2500);
  await page.click('#openBtn');
  await page.waitForFunction(() => !document.getElementById('loader'), { timeout: 60000 });
  await wait(1500);
  await page.click('#openChapterBtn');
  await page.waitForSelector('.vdot');
  const dots = await page.$$('.vdot');

  // 连点 4 个不同章节（每次间隔 50ms）
  console.log('=== 快速切换测试 ===');
  const seq = [3, 6, 1, 8, 4, 7, 2];  // ch04, ch07, ch02, ch11, ch05, ch07, ch03
  for (const idx of seq){
    await dots[idx].evaluate(d => d.click());
    await wait(50);
  }
  await wait(3000);

  // 最终应该停在 seq 最后一个 idx=2 (ch03)
  const finalState = await page.evaluate(() => ({
    title: document.querySelector('.scene-title')?.textContent,
    counter: document.querySelector('.scene-counter')?.textContent,
    imgsOk: Array.from(document.querySelectorAll('#sceneFrame img')).filter(i => i.complete && i.naturalWidth > 0).length,
    imgsTotal: document.querySelectorAll('#sceneFrame img').length,
    token: window._openChapterToken,
  }));
  console.log('final:', JSON.stringify(finalState));

  // 验证 scene-frame img 是 ch03 的（应该 1/8 = 第 1 张）
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });