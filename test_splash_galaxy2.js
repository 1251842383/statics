// 验证 splash 银河升级：按钮右下角、行星真实贴图、点击聚焦切换、星系点击、缩小远景
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
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('favicon')) errors.push('console: ' + m.text()); });

  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await wait(4000);  // 等贴图加载

  // 1) 按钮位置（右下角）
  const btn = await page.evaluate(() => {
    const b = document.getElementById('openBtn');
    const r = b.getBoundingClientRect();
    return { x: r.x|0, y: r.y|0, right: (innerWidth - r.right)|0, bottom: (innerHeight - r.bottom)|0 };
  });
  console.log('button margins (right/bottom):', JSON.stringify(btn));

  // 2) 贴图加载完成检查（Lambert 材质的 map 是否就位）
  const texLoaded = await page.evaluate(() => {
    const d = window.__splashDebug();
    return { planets: d.planets, focus: d.focus };
  });
  console.log('planets:', JSON.stringify(texLoaded));

  await page.screenshot({ path: '_sg_overview.png' });

  // 3) 点击火星：投影找屏幕坐标
  const mars = await page.evaluate(() => window.__splashProject('mars'));
  console.log('mars screen:', JSON.stringify(mars));
  if (mars && mars.inFront){
    await page.mouse.click(mars.x, mars.y);
    await wait(2500);
    const focus = await page.evaluate(() => window.__splashDebug());
    console.log('after mars click: focus=' + focus.focus, 'dist=' + focus.distance.toFixed(1), 'camTarget=' + JSON.stringify(focus.camTarget));
    await page.screenshot({ path: '_sg_mars_focus.png' });
  } else {
    console.log('mars not in front / not found — 拖拽旋转后重试');
    await page.mouse.move(800, 450);
    await page.mouse.down(); await page.mouse.move(1000, 450, { steps: 5 }); await page.mouse.up();
    await wait(600);
    const mars2 = await page.evaluate(() => window.__splashProject('mars'));
    console.log('mars screen retry:', JSON.stringify(mars2));
    if (mars2 && mars2.inFront){
      await page.mouse.click(mars2.x, mars2.y);
      await wait(2500);
      const f2 = await page.evaluate(() => window.__splashDebug());
      console.log('after mars click(retry): focus=' + f2.focus, 'dist=' + f2.distance.toFixed(1));
      await page.screenshot({ path: '_sg_mars_focus.png' });
    }
  }

  // 4) 点击木星（验证 ShaderMaterial 被替换为贴图）
  const jup = await page.evaluate(() => window.__splashProject('jupiter'));
  console.log('jupiter screen:', JSON.stringify(jup));
  if (jup && jup.inFront){
    await page.mouse.click(jup.x, jup.y);
    await wait(2500);
    const f3 = await page.evaluate(() => window.__splashDebug());
    console.log('after jupiter click: focus=' + f3.focus, 'dist=' + f3.distance.toFixed(1));
    await page.screenshot({ path: '_sg_jupiter_focus.png' });
  }

  // 5) 点击地球（俯视山川大海）
  const earth = await page.evaluate(() => window.__splashProject('earth'));
  if (earth && earth.inFront){
    await page.mouse.click(earth.x, earth.y);
    await wait(2500);
    const f4 = await page.evaluate(() => window.__splashDebug());
    console.log('after earth click: focus=' + f4.focus, 'dist=' + f4.distance.toFixed(1));
    await page.screenshot({ path: '_sg_earth_focus.png' });
  }

  // 6) 缩小到远景看星系 + 点击远景星系
  await page.mouse.move(800, 450);
  for (let i = 0; i < 30; i++){ await page.mouse.wheel({ deltaY: 120 }); await wait(30); }
  await wait(2500);
  const zOut = await page.evaluate(() => window.__splashDebug().distance);
  console.log('zoomed out to:', zOut?.toFixed(1));
  await page.screenshot({ path: '_sg_zoomed_out.png' });

  const g1 = await page.evaluate(() => window.__splashProject('galaxy1'));
  console.log('galaxy1 screen:', JSON.stringify(g1));
  if (g1 && g1.inFront && g1.x > 0 && g1.x < 1600 && g1.y > 0 && g1.y < 900){
    await page.mouse.click(g1.x, g1.y);
    await wait(3000);
    const f5 = await page.evaluate(() => window.__splashDebug());
    console.log('after galaxy1 click: focus=' + f5.focus, 'dist=' + f5.distance.toFixed(1));
    await page.screenshot({ path: '_sg_galaxy_focus.png' });
  }

  // 7) 进入相册（按钮在右下角，验证 dive 正常 + loader 出现）
  const btn2 = await page.evaluate(() => {
    const r = document.getElementById('openBtn').getBoundingClientRect();
    return { x: r.x + r.width/2, y: r.y + r.height/2 };
  });
  await page.mouse.click(btn2.x, btn2.y);
  await wait(4500);
  const loaderState = await page.evaluate(() => ({
    loaderShown: getComputedStyle(document.getElementById('loader')).display,
    splashHidden: document.getElementById('splash')?.classList.contains('hidden')
  }));
  console.log('enter album:', JSON.stringify(loaderState));

  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
