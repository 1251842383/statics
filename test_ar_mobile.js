// 移动端 AR 章节 smoke test：竖屏、标签栏、上下滑切主题、FPS
const puppeteer = require('puppeteer-core');
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--enable-webgl', '--use-gl=angle']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1');
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await wait(2400);
  await page.tap('#openBtn');
  await page.waitForFunction(() => !document.getElementById('loader'), { timeout: 50000 });
  await wait(1000);

  // 移动端是首页平面/轻量模式？回忆录按钮存在则进
  const hasBtn = await page.$('#openChapterBtn');
  if (hasBtn){
    await page.evaluate(() => document.getElementById('openChapterBtn').click());
    await page.waitForSelector('.vdot', { timeout: 15000 });
    const dots = await page.$$('.vdot');
    console.log('dots:', dots.length);
    await dots[10].evaluate(d => d.click());
    await wait(4000);
  } else {
    console.log('WARN: no openChapterBtn on mobile');
  }

  const state = await page.evaluate(() => {
    const dbg = window.__arDebug ? window.__arDebug() : null;
    const tabs = document.querySelector('.ar-tabs');
    return {
      dbg: dbg ? { theme: dbg.theme, active: dbg.cards.filter(c => c.active).length, settled: dbg.cards.filter(c => c.active && c.reveal > 0.85).length } : null,
      tabsCount: document.querySelectorAll('.ar-tab').length,
      tabsOverflow: tabs ? tabs.scrollWidth > tabs.clientWidth + 2 : null
    };
  });
  console.log('mobile AR:', JSON.stringify(state));

  // 上下滑切主题（在 canvas 区域向上滑）
  await page.touchscreen.touchStart(187, 500);
  await page.touchscreen.touchMove(187, 300);
  await page.touchscreen.touchEnd();
  await wait(2000);
  const themeAfterSwipe = await page.evaluate(() => window.__arDebug().theme);
  console.log('theme after up-swipe:', themeAfterSwipe);

  // FPS
  const fps = await page.evaluate(() => new Promise(res => {
    let n = 0; const t0 = performance.now();
    function loop(){ n++; if (performance.now() - t0 < 3000) requestAnimationFrame(loop); else res(+(n / 3).toFixed(1)); }
    requestAnimationFrame(loop);
  }));
  console.log('mobile AR FPS:', fps);

  await page.screenshot({ path: '_ar_08_mobile.png' });
  console.log('pageerrors:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('MOBILE FAIL:', e.message); process.exit(1); });
