// 检查 splash 场景里 moon/satellite/asteroid 都建好了
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
  const logs = [];
  page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await wait(3000);

  // 直接从 THREE 场景里查
  const sceneInfo = await page.evaluate(() => {
    // 找 splash canvas 对应的 renderer
    const splashCanvas = document.getElementById('splashCanvas');
    // 通过遍历页面里的 THREE.WebGLRenderer 实例不可行，改用 __splashDebug 拿行星数
    const d = window.__splashDebug ? window.__splashDebug() : null;
    return { ...d, hasSplashCanvas: !!splashCanvas };
  });
  console.log('debug:', JSON.stringify(sceneInfo));

  // 等真实纹理加载
  await wait(2000);

  // 截图
  await page.screenshot({ path: '_splash_earth.png' });
  console.log('logs (last 5):', logs.slice(-5));
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });