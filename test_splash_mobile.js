// 移动端 splash 性能 + 资源消耗测试
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

  const t0 = Date.now();
  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  const loadMs = Date.now() - t0;
  console.log('page load ms:', loadMs);

  await wait(3000);  // splash init
  const dbg = await page.evaluate(() => window.__splashDebug ? window.__splashDebug() : null);
  console.log('mobile splash:', JSON.stringify(dbg));

  // FPS（5 秒窗口）
  const fps = await page.evaluate(() => new Promise(res => {
    let n = 0; const t0 = performance.now();
    function loop(){ n++; if (performance.now() - t0 < 5000) requestAnimationFrame(loop); else res(+(n / 5).toFixed(1)); }
    requestAnimationFrame(loop);
  }));
  console.log('mobile splash FPS (5s):', fps);

  // 内存（performace.memory，仅 Chrome 暴露）
  const mem = await page.evaluate(() => {
    const m = performance.memory;
    return m ? { used: (m.usedJSHeapSize / 1048576).toFixed(1) + 'MB', total: (m.totalJSHeapSize / 1048576).toFixed(1) + 'MB' } : 'n/a';
  });
  console.log('memory:', JSON.stringify(mem));

  await page.screenshot({ path: '_splash_mobile.png' });
  console.log('errors:', errors.length ? errors.slice(0, 5) : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });