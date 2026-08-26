// 测试滚轮切图 + 整体加载后的状态
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
  await page.waitForFunction(() => !document.getElementById('loader'), { timeout: 60000 });
  await wait(1500);
  await page.click('#openChapterBtn');
  await page.waitForSelector('.vdot');

  // 选 ch03 (8 张图)
  const dots = await page.$$('.vdot');
  await dots[3].evaluate(d => d.click());
  await wait(2000);

  const beforeWheel = await page.evaluate(() => ({
    counter: document.querySelector('.scene-counter')?.textContent,
    imgSrcs: Array.from(document.querySelectorAll('#sceneFrame img')).map(i => i.src.split('/').pop())
  }));
  console.log('before wheel:', JSON.stringify(beforeWheel));

  // 模拟滚轮往下
  await page.mouse.move(800, 450);
  await page.mouse.wheel({ deltaY: 200 });
  await wait(1500);
  const afterWheel = await page.evaluate(() => ({
    counter: document.querySelector('.scene-counter')?.textContent,
    imgSrcs: Array.from(document.querySelectorAll('#sceneFrame img')).map(i => i.src.split('/').pop())
  }));
  console.log('after wheel down:', JSON.stringify(afterWheel));

  // 滚轮往上
  await page.mouse.wheel({ deltaY: -200 });
  await wait(1500);
  const afterUp = await page.evaluate(() => ({
    counter: document.querySelector('.scene-counter')?.textContent,
    imgSrcs: Array.from(document.querySelectorAll('#sceneFrame img')).map(i => i.src.split('/').pop())
  }));
  console.log('after wheel up:', JSON.stringify(afterUp));

  // 键盘 ArrowDown
  await page.keyboard.press('ArrowDown');
  await wait(1500);
  const afterKey = await page.evaluate(() => ({
    counter: document.querySelector('.scene-counter')?.textContent,
    imgSrcs: Array.from(document.querySelectorAll('#sceneFrame img')).map(i => i.src.split('/').pop())
  }));
  console.log('after ArrowDown:', JSON.stringify(afterKey));

  // 测 splash 行星点击（先回首页再测）
  await page.click('#viewerBack');
  await wait(2000);

  console.log('\n=== splash 行星点击测试 ===');
  // 等 splash 渲染
  await wait(1000);
  // 找到地球的屏幕位置 → 模拟点击
  const earthClickResult = await page.evaluate(() => {
    // 用 __splashDebug 拿 planet meshes 不可行
    // 改用 raycaster 找不到 → 我们估算地球位置（默认 distance=12, earth 在 x=12）
    // 实际屏幕坐标需要 projection matrix，这里简单取画布中心靠右
    return { hint: 'see planet positions in debug' };
  });

  await page.mouse.click(700, 400);  // splash canvas 偏右位置
  await wait(1500);
  const splashState = await page.evaluate(() => {
    const d = window.__splashDebug ? window.__splashDebug() : null;
    return d;
  });
  console.log('after splash click (700,400):', JSON.stringify(splashState));

  // 测试 fps 在 splash（应该稳定）
  const fps = await page.evaluate(() => new Promise(res => {
    let n = 0; const t0 = performance.now();
    function loop(){ n++; if (performance.now() - t0 < 3000) requestAnimationFrame(loop); else res(+(n/3).toFixed(1)); }
    requestAnimationFrame(loop);
  }));
  console.log('splash FPS:', fps);

  console.log('\nerrors:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });