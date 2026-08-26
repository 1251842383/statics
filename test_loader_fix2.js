// 验证 loader 修复 v2：正确时机（点击后等 splash 俯冲完成 ~4s）
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
  await wait(2200);
  await page.click('#openBtn');
  await wait(4500);  // 俯冲 2.5s + loader fadeIn

  // 钉住进度，防止本地缓存导致 loader 提前结束
  await page.evaluate(() => window.__setLoaderProgress(0.35));

  const st = await page.evaluate(() => ({
    stageLabel: document.querySelector('.loader-hex-text')?.textContent,
    loaderDisplay: getComputedStyle(document.getElementById('loader')).display
  }));
  console.log('t+4.5s:', JSON.stringify(st));
  await page.screenshot({ path: '_lf_dna.png' });

  await wait(3200);
  console.log('t+7.7s:', await page.evaluate(() => document.querySelector('.loader-hex-text')?.textContent));
  await page.screenshot({ path: '_lf_stage2.png' });

  await wait(3200);
  console.log('t+10.9s:', await page.evaluate(() => document.querySelector('.loader-hex-text')?.textContent));
  await page.screenshot({ path: '_lf_stage3.png' });

  await wait(3200);
  console.log('t+14.1s:', await page.evaluate(() => document.querySelector('.loader-hex-text')?.textContent));
  await page.screenshot({ path: '_lf_stage4.png' });

  // 拖拽旋转
  await page.mouse.move(800, 500);
  await page.mouse.down();
  await page.mouse.move(1150, 500, { steps: 10 });
  await page.mouse.up();
  await wait(500);
  await page.screenshot({ path: '_lf_dragged.png' });

  // FPS
  const fps = await page.evaluate(() => new Promise(res => {
    let n = 0; const t0 = performance.now();
    (function loop(){ n++; if (performance.now() - t0 < 3000) requestAnimationFrame(loop); else res(+(n/3).toFixed(1)); })();
  }));
  console.log('desktop loader FPS:', fps);
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
  await wait(4500);
  await m.evaluate(() => window.__setLoaderProgress(0.35));

  const mState = await m.evaluate(() => {
    const tdc = document.getElementById('loader3d');
    return {
      tdcDisplay: tdc ? getComputedStyle(tdc).display : 'missing',
      tdcW: tdc?.width, tdcH: tdc?.height,
      stageLabel: document.querySelector('.loader-hex-text')?.textContent,
      loaderDisplay: getComputedStyle(document.getElementById('loader')).display
    };
  });
  console.log('mobile t+4.5s:', JSON.stringify(mState));
  await m.screenshot({ path: '_lf_mobile.png' });

  // 相机推近验证：采样两次 3D 内容差异（5s dolly 15→9）
  await wait(3000);
  await m.screenshot({ path: '_lf_mobile_late.png' });

  // touch 拖拽
  await m.touchscreen.touchStart(195, 450);
  await m.touchscreen.touchMove(320, 440, { steps: 6 });
  await m.touchscreen.touchEnd();
  await wait(500);
  await m.screenshot({ path: '_lf_mobile_drag.png' });

  const mFps = await m.evaluate(() => new Promise(res => {
    let n = 0; const t0 = performance.now();
    (function loop(){ n++; if (performance.now() - t0 < 3000) requestAnimationFrame(loop); else res(+(n/3).toFixed(1)); })();
  }));
  console.log('mobile loader FPS:', mFps);
  console.log('mobile errors:', mErrors.length ? mErrors : 'none');

  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
