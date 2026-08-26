// 调试 loader 3D：检查 canvas 大小 / renderer / 阶段切换 / 像素
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
  page.on('console', m => {
    if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`);
  });
  page.on('pageerror', e => errors.push('PAGE_ERR: ' + e.message));

  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await wait(2200);

  // 立即进入相册触发 loader
  await page.click('#openBtn');
  await wait(3500);

  // 检查 loader 状态
  const loaderState = await page.evaluate(() => {
    const tdc = document.getElementById('loader3d');
    const fx = document.getElementById('loaderFx');
    const loader = document.getElementById('loader');
    return {
      loaderVisible: loader && getComputedStyle(loader).display,
      tdcRect: tdc?.getBoundingClientRect(),
      tdcW: tdc?.width,
      tdcH: tdc?.height,
      tdcCSS: tdc?.style.cssText,
      tdcComputed: tdc ? {
        position: getComputedStyle(tdc).position,
        display: getComputedStyle(tdc).display,
        width: getComputedStyle(tdc).width,
        height: getComputedStyle(tdc).height,
        zIndex: getComputedStyle(tdc).zIndex
      } : null,
      fxW: fx?.width,
      fxH: fx?.height,
      stageRunning: !!window.__stopLoaderThree,
      hasThreeRenderer: !!window.__loaderThreeRenderInfo
    };
  });
  console.log('=== loader state ===');
  console.log(JSON.stringify(loaderState, null, 2));

  // 截图
  await page.screenshot({ path: '_loader_now.png' });

  // 等更多时间看阶段
  await wait(6000);
  const loaderState2 = await page.evaluate(() => {
    const tdc = document.getElementById('loader3d');
    return {
      tdcW: tdc?.width,
      tdcH: tdc?.height,
      visible: !!tdc && getComputedStyle(tdc).visibility
    };
  });
  console.log('=== loader after 6s ===');
  console.log(JSON.stringify(loaderState2));

  console.log('\n=== errors ===');
  console.log(errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });