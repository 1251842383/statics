// splash 写实化验证：纹理加载 + 行星动画 + 卫星月球
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
  await wait(2500);  // 等 splash 3D 初始化

  // 检查 splash debug 接口 + 各行星位置
  const t0 = await page.evaluate(() => {
    const d = window.__splashDebug ? window.__splashDebug() : null;
    return d;
  });
  console.log('splash debug:', JSON.stringify(t0));

  // 拖拽旋转 → 检查 yaw 变化
  await page.mouse.move(800, 450);
  await page.mouse.down();
  await page.mouse.move(900, 480);
  await page.mouse.move(1000, 500);
  await page.mouse.up();
  await wait(300);
  const t1 = await page.evaluate(() => window.__splashDebug());
  console.log('after drag:', JSON.stringify(t1));

  // 滚轮缩放 → 检查 distance
  await page.mouse.wheel({ deltaY: -200 });
  await wait(300);
  const t2 = await page.evaluate(() => window.__splashDebug());
  console.log('after wheel:', JSON.stringify(t2));

  // 等 4 秒看行星动画（公转应可见）
  await wait(4000);
  const t3 = await page.evaluate(() => window.__splashDebug());
  console.log('after 4s animation:', JSON.stringify(t3));

  // 截图
  await page.screenshot({ path: '_splash_v3.png' });
  console.log('errors:', errors.length ? errors.slice(0, 5) : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });