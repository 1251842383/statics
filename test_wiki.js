// 验证 splash：标签可见 + 单指平移（自由飞行）+ 点击天体显示详情
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
  await wait(3500);

  // 1) 标签 sprite 数
  const lab = await page.evaluate(() => {
    const scene = window.__splashDebug ? window.__splashDebug() : null;
    return { planets: scene.planets, ok: !!scene };
  });
  console.log('debug ok:', JSON.stringify(lab));

  // 截图：标签可见
  await page.screenshot({ path: '_wiki_labels.png' });

  // 2) 点击火星 → 面板显示
  const mars = await page.evaluate(() => window.__splashProject('mars'));
  console.log('mars projection:', JSON.stringify(mars));
  if (mars && mars.inFront && mars.x > 0 && mars.x < 1600 && mars.y > 0 && mars.y < 900){
    await page.mouse.click(mars.x, mars.y);
    await wait(1500);
    const detail = await page.evaluate(() => {
      const d = document.querySelector('.space-detail');
      return {
        show: d?.classList.contains('show'),
        zh: d?.querySelector('.sd-zh')?.textContent || '',
        desc: d?.querySelector('.sd-desc')?.textContent?.slice(0, 40) || ''
      };
    });
    console.log('click mars detail:', JSON.stringify(detail));
    await page.screenshot({ path: '_wiki_mars.png' });
    // 关闭面板
    await page.evaluate(() => document.querySelector('.space-detail')?.classList.remove('show'));
  }

  // 3) 单指平移：mouse drag → focusObj 位置应该变
  const before = await page.evaluate(() => {
    const d = window.__splashDebug();
    return d.camTarget;
  });
  // 模拟单指拖动（用 mouse 实现 pan）
  await page.mouse.move(800, 450);
  await page.mouse.down();
  for (let i = 0; i < 12; i++){
    await page.mouse.move(800 + i * 30, 450 + i * 8, { steps: 1 });
    await wait(20);
  }
  await page.mouse.up();
  await wait(800);
  const after = await page.evaluate(() => window.__splashDebug().camTarget);
  const moved = before.x !== after.x || before.y !== after.y || before.z !== after.z;
  console.log('pan moved:', JSON.stringify({ before, after, moved }));
  await page.screenshot({ path: '_wiki_after_pan.png' });

  // 4) 缩小后看到主星系标签
  for (let i = 0; i < 40; i++){ await page.mouse.wheel({ deltaY: 120 }); await wait(20); }
  await wait(1500);
  await page.screenshot({ path: '_wiki_zoomed_out.png' });
  const far = await page.evaluate(() => window.__splashDebug().distance.toFixed(1));
  console.log('zoom out distance:', far);

  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });