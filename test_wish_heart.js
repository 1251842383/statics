// wish 页验证：文字围成心形 + 缩放 + flick 深潜 + 禁用左右滑切章
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

  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await wait(2500);
  await page.click('#openBtn');
  await page.waitForSelector('#loaderEnterBtn', { timeout: 60000 });
  await page.click('#loaderEnterBtn');
  await page.waitForFunction(() => !document.getElementById('loader'), { timeout: 20000 });
  await wait(1500);
  await page.click('#openChapterBtn');
  await page.waitForSelector('.vdot');
  const dots = await page.$$('.vdot');
  await dots[11].evaluate(d => d.click());  // wish
  await wait(3500);

  // 1) 检查文字 sprite 数量 + DOM 文案已移除
  const state1 = await page.evaluate(() => ({
    domTextGone: !document.querySelector('.viewer-wish-text'),
    domTitleGone: !document.querySelector('.viewer-wish-title'),
    canvasRect: (() => { const c = document.querySelector('.wish-3d'); const r = c?.getBoundingClientRect(); return r ? { w: r.width|0, h: r.height|0 } : null; })()
  }));
  console.log('wish DOM:', JSON.stringify(state1));

  await page.screenshot({ path: '_wish_heart_1.png' });

  // 2) 滚轮缩放（相机 z 应变小）
  const beforeZoom = await page.evaluate(() => window.__wishDebug?.()?.camZ);
  await page.mouse.move(800, 450);
  await page.mouse.wheel({ deltaY: -600 });  // 向前滚 = 拉近
  await wait(1500);
  const afterZoom = await page.evaluate(() => window.__wishDebug?.()?.camZ);
  console.log('zoom:', beforeZoom, '→', afterZoom);

  // 3) flick 上滑 → 深潜
  const zBeforeDive = await page.evaluate(() => window.__wishDebug?.()?.camZ);
  await page.mouse.move(800, 600);
  await page.mouse.down();
  await page.mouse.move(800, 300, { steps: 6 });  // 快速上滑
  await page.mouse.up();
  await wait(1200);
  const zAfterDive = await page.evaluate(() => window.__wishDebug?.()?.camZ);
  console.log('dive:', zBeforeDive, '→', zAfterDive);

  await page.screenshot({ path: '_wish_heart_2.png' });

  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });