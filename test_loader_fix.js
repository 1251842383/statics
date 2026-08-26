// 验证 loader 修复：桌面 + 移动端 3D 可见性、阶段轮播、拖拽旋转、相机推近
const puppeteer = require('puppeteer-core');
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--enable-webgl', '--use-gl=angle', '--window-size=1600,900']
  });

  // ===== 桌面端 =====
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await wait(2200);
  await page.click('#openBtn');
  await wait(2000);  // 进入 loader 早期（DNA 阶段）

  const early = await page.evaluate(() => ({
    stageLabel: document.querySelector('.loader-hex-text')?.textContent,
    loaderVisible: getComputedStyle(document.getElementById('loader')).display
  }));
  console.log('desktop early:', JSON.stringify(early));

  // 2D 层透明度检查：取样 loaderFx canvas 的 alpha
  const fxAlpha = await page.evaluate(() => {
    const fx = document.getElementById('loaderFx');
    const c = document.createElement('canvas');
    c.width = fx.width; c.height = fx.height;
    const cx = c.getContext('2d');
    cx.drawImage(fx, 0, 0);
    // 中心区域平均 alpha
    const d = cx.getImageData(fx.width/2 - 50 | 0, fx.height/2 - 50 | 0, 100, 100).data;
    let a = 0;
    for (let i = 3; i < d.length; i += 4) a += d[i];
    return +(a / (100*100)).toFixed(1);
  });
  console.log('desktop 2D layer avg alpha (0=全透明, 255=全黑):', fxAlpha);

  await page.screenshot({ path: '_loader_fix_dna.png' });

  // 等阶段轮播
  await wait(7000);
  const mid = await page.evaluate(() => ({
    stageLabel: document.querySelector('.loader-hex-text')?.textContent
  }));
  console.log('desktop after 9s:', JSON.stringify(mid));
  await page.screenshot({ path: '_loader_fix_stage2.png' });

  // 拖拽旋转：scene.rotation.y 应变化（通过截图差异粗验）→ 直接看拖拽后画面变化
  const rotBefore = await page.evaluate(() => {
    // 无直接 debug 口，改用截图对比
    return null;
  });
  await page.mouse.move(800, 500);
  await page.mouse.down();
  await page.mouse.move(1100, 500, { steps: 8 });
  await page.mouse.up();
  await wait(600);
  await page.screenshot({ path: '_loader_fix_dragged.png' });
  console.log('desktop drag: captured');

  console.log('desktop errors:', errors.length ? errors : 'none');
  await page.close();

  // ===== 移动端 =====
  const m = await browser.newPage();
  await m.emulate({ viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const mErrors = [];
  m.on('pageerror', e => mErrors.push(e.message));

  await m.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await wait(2200);
  await m.tap('#openBtn');
  await wait(2500);

  const mState = await m.evaluate(() => {
    const tdc = document.getElementById('loader3d');
    return {
      tdcDisplay: tdc ? getComputedStyle(tdc).display : 'missing',
      tdcW: tdc?.width, tdcH: tdc?.height,
      stageLabel: document.querySelector('.loader-hex-text')?.textContent,
      loaderVisible: getComputedStyle(document.getElementById('loader')).display
    };
  });
  console.log('mobile loader:', JSON.stringify(mState));
  await m.screenshot({ path: '_loader_fix_mobile.png' });

  // 手机拖拽 DNA：touch 拖动
  await m.touchscreen.touchStart(200, 500);
  await m.touchscreen.touchMove(320, 480);
  await m.touchscreen.touchEnd();
  await wait(600);
  await m.screenshot({ path: '_loader_fix_mobile_drag.png' });

  // FPS
  const fps = await m.evaluate(() => new Promise(res => {
    let n = 0; const t0 = performance.now();
    (function loop(){ n++; if (performance.now() - t0 < 3000) requestAnimationFrame(loop); else res(+(n/3).toFixed(1)); })();
  }));
  console.log('mobile loader FPS:', fps);
  console.log('mobile errors:', mErrors.length ? mErrors : 'none');

  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });