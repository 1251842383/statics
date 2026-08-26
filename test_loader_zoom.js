// 验证 loader DNA 缩放：桌面滚轮 + 移动端双指捏合
const puppeteer = require('puppeteer-core');
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--enable-webgl', '--use-gl=angle', '--window-size=1600,900']
  });

  // ===== 桌面滚轮 =====
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await wait(2200);
  await page.click('#openBtn');
  await wait(4500);
  await page.evaluate(() => window.__setLoaderProgress(0.35));
  await wait(1500);  // 让自动推镜结束（t>5）

  const z0 = await page.evaluate(() => window.__loaderDebug().camZ);
  await page.mouse.move(800, 450);
  await page.mouse.wheel({ deltaY: -400 });  // 放大
  await wait(800);
  const z1 = await page.evaluate(() => window.__loaderDebug().camZ);
  await page.mouse.wheel({ deltaY: 600 });   // 缩小
  await wait(800);
  const z2 = await page.evaluate(() => window.__loaderDebug().camZ);
  console.log(`desktop wheel zoom: ${z0?.toFixed(2)} → ${z1?.toFixed(2)} (in) → ${z2?.toFixed(2)} (out)`);
  await page.close();

  // ===== 移动端捏合 =====
  const m = await browser.newPage();
  await m.emulate({ viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const mErrors = [];
  m.on('pageerror', e => mErrors.push(e.message));
  await m.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await wait(2200);
  await m.tap('#openBtn');
  await wait(4500);
  await m.evaluate(() => window.__setLoaderProgress(0.35));
  await wait(1500);

  const mz0 = await m.evaluate(() => window.__loaderDebug().camZ);
  // 双指捏合放大（两指张开）
  await m.touchscreen.touchStart(150, 400);
  await m.touchscreen.touchMove(100, 350);
  // puppeteer touchscreen 只支持单点，改用 CDP 双指事件
  const client = await m.createCDPSession();
  await m.evaluate(() => { window.__ldTestPinch = true; });
  // 直接派发 TouchEvent 到 loader host 模拟双指
  await m.evaluate(() => {
    const host = document.getElementById('loader');
    const mk = (xs, ys) => xs.map((x, i) => new Touch({ identifier: i, target: host, clientX: x, clientY: ys[i] }));
    const fire = (type, xs, ys) => host.dispatchEvent(new TouchEvent(type, { touches: mk(xs, ys), changedTouches: mk(xs, ys), bubbles: true, cancelable: true }));
    fire('touchstart', [150, 240], [400, 400]);
    fire('touchmove', [120, 270], [400, 400]);
    fire('touchmove', [90, 300], [400, 400]);
    fire('touchend', [], []);
  });
  await wait(800);
  const mz1 = await m.evaluate(() => window.__loaderDebug().camZ);
  // 再捏回去（缩小）
  await m.evaluate(() => {
    const host = document.getElementById('loader');
    const mk = (xs, ys) => xs.map((x, i) => new Touch({ identifier: i, target: host, clientX: x, clientY: ys[i] }));
    const fire = (type, xs, ys) => host.dispatchEvent(new TouchEvent(type, { touches: mk(xs, ys), changedTouches: mk(xs, ys), bubbles: true, cancelable: true }));
    fire('touchstart', [90, 300], [400, 400]);
    fire('touchmove', [130, 260], [400, 400]);
    fire('touchmove', [170, 220], [400, 400]);
    fire('touchend', [], []);
  });
  await wait(800);
  const mz2 = await m.evaluate(() => window.__loaderDebug().camZ);
  console.log(`mobile pinch zoom: ${mz0?.toFixed(2)} → ${mz1?.toFixed(2)} (in) → ${mz2?.toFixed(2)} (out)`);

  console.log('desktop errors:', errors.length ? errors : 'none');
  console.log('mobile errors:', mErrors.length ? mErrors : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
