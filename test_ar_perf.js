// 流畅度验证：首页球面 / AR 章节 / 主题切换 的 FPS
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

  const fps = () => page.evaluate(() => new Promise(res => {
    let n = 0; const t0 = performance.now();
    function loop(){ n++; if (performance.now() - t0 < 3000) requestAnimationFrame(loop); else res(+(n / 3).toFixed(1)); }
    requestAnimationFrame(loop);
  }));

  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await wait(2400);
  await page.click('#openBtn');
  await page.waitForFunction(() => !document.getElementById('loader'), { timeout: 40000 });
  await wait(2000);
  console.log('home sphere FPS:', await fps());

  // 进 AR 章节
  await page.click('#openChapterBtn');
  await page.waitForSelector('.vdot', { timeout: 15000 });
  const dots = await page.$$('.vdot');
  await dots[10].click();
  await wait(4000);
  console.log('AR idle FPS:', await fps());

  // 拖拽中的 FPS（模拟持续拖动 3s）
  await page.mouse.move(700, 450);
  await page.mouse.down();
  const dragFps = page.evaluate(() => new Promise(res => {
    let n = 0; const t0 = performance.now();
    function loop(){ n++; if (performance.now() - t0 < 3000) requestAnimationFrame(loop); else res(+(n / 3).toFixed(1)); }
    requestAnimationFrame(loop);
  }));
  const tDragEnd = Date.now() + 2800;
  let x = 700;
  while (Date.now() < tDragEnd){
    x += 9;
    await page.mouse.move(x, 445 + Math.sin(x / 30) * 15);
    await wait(50);
  }
  await page.mouse.up();
  console.log('AR dragging FPS:', await dragFps);

  // 主题切换瞬间 FPS
  const tabs = await page.$$('.ar-tab');
  await tabs[1].click();
  console.log('AR theme-switch FPS:', await fps());

  // 长驻留 10s：无泄漏劣化（对比 idle）
  await wait(8000);
  console.log('AR idle (10s later) FPS:', await fps());

  console.log('pageerrors:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('PERF FAIL:', e.message); process.exit(1); });
