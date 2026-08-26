const puppeteer = require('puppeteer-core');
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--enable-webgl', '--use-gl=angle', '--window-size=1600,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('[c] ' + m.text()); });
  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await wait(2500);
  // splash 阶段检测
  const splashState = await page.evaluate(() => {
    const d = window.__splashDebug ? window.__splashDebug() : null;
    const cv = document.getElementById('splashCanvas');
    let lit = 0;
    if (cv){
      const c2 = document.createElement('canvas'); c2.width = 160; c2.height = 90;
      const cx = c2.getContext('2d'); cx.drawImage(cv, 0, 0, 160, 90);
      const d2 = cx.getImageData(0,0,160,90).data;
      for (let i=3;i<d2.length;i+=4) if (d2[i] > 10) lit++;
    }
    return { dbg: d, canvasLit: lit };
  });
  console.log('splash pre-click:', JSON.stringify(splashState));
  await page.click('#openBtn');
  await wait(1500);
  const midState = await page.evaluate(() => ({
    dbg: window.__splashDebug ? window.__splashDebug() : null,
    splashVisible: !document.getElementById('splash')?.classList.contains('hidden')
  }));
  console.log('mid dive (1.5s):', JSON.stringify(midState));
  // 拖拽
  await page.mouse.move(800, 450);
  await page.mouse.down();
  await page.mouse.move(1100, 430, { steps: 10 });
  await page.mouse.up();
  await wait(400);
  // 滚轮缩放
  await page.mouse.wheel({ deltaY: -300 });
  await wait(400);
  const afterInteract = await page.evaluate(() => window.__splashDebug());
  console.log('after drag+wheel:', JSON.stringify(afterInteract));
  // 等俯冲完成
  await wait(2200);
  const afterDive = await page.evaluate(() => ({
    splashExists: !!document.getElementById('splash'),
    loaderShown: !!document.getElementById('loader')?.classList.contains('show'),
    homeVisible: document.getElementById('home')?.style.display !== 'none'
  }));
  console.log('after dive:', JSON.stringify(afterDive));
  // 等 loader
  await page.waitForFunction(() => !document.getElementById('loader'), { timeout: 50000 }).catch(() => {});
  await wait(1500);
  const home = await page.evaluate(() => ({
    openChapterBtn: document.getElementById('openChapterBtn')?.style.display !== 'none',
    photosCount: document.querySelectorAll('#home canvas')[1]?.children.length || 0
  }));
  console.log('home ready:', JSON.stringify(home));
  console.log('errors:', errors.length ? errors.slice(0, 5) : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
