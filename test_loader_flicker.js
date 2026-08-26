// 检测 loader 3D 渲染是否闪烁（多次截图对比）
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

  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await wait(2500);

  // 模拟鼠标移动触发 cursor trail
  await page.mouse.move(800, 400);
  await page.click('#openBtn');
  console.log('clicked openBtn');
  await wait(500);  // 进入 loader

  // 截图 1：DNA 阶段
  await page.screenshot({ path: '_loader_1_dna.png' });

  // 等 3.5s 应该进入 ROSE_CLOUD 阶段
  await wait(3500);
  await page.screenshot({ path: '_loader_2_rose_cloud.png' });

  // 等 3.5s 进入 BLOOM
  await wait(3500);
  await page.screenshot({ path: '_loader_3_bloom.png' });

  // 等 3.5s 进入 PETAL_RAIN
  await wait(3500);
  await page.screenshot({ path: '_loader_4_petal_rain.png' });

  // 等 3.5s 进入 ALL
  await wait(3500);
  await page.screenshot({ path: '_loader_5_all.png' });

  // 检查 loader 3D 是否有内容
  const loaderState = await page.evaluate(() => {
    const tdc = document.getElementById('loader3d');
    if (!tdc) return { error: 'no loader3d canvas' };
    const ctx = tdc.getContext('webgl2') || tdc.getContext('webgl');
    return {
      width: tdc.width,
      height: tdc.height,
      style: tdc.style.cssText,
      hasContext: !!ctx,
      // 父 z-index
      parentZ: tdc.parentElement?.style?.zIndex
    };
  });
  console.log('loader3d state:', JSON.stringify(loaderState));

  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });