// 验证 splash 行星公转极慢：t=0 vs t=4s 位置应仅小幅变化
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

  // 直接取 splash scene 中行星初始角度（不点 openBtn，让它一直转）
  const t0 = await page.evaluate(() => {
    const dbg = window.__splashDebug?.();
    return dbg ? { angles: dbg.angles, t: dbg.t, planetCount: dbg.planetCount, galaxyZ: dbg.galaxyZ } : null;
  });
  console.log('t≈0 :', JSON.stringify(t0));

  await wait(4000);

  const t4 = await page.evaluate(() => {
    const dbg = window.__splashDebug?.();
    return dbg ? { angles: dbg.angles, t: dbg.t, planetCount: dbg.planetCount, galaxyZ: dbg.galaxyZ } : null;
  });
  console.log('t≈4 :', JSON.stringify(t4));

  // 角度差
  if (t0 && t4 && t0.angles && t4.angles){
    const deltas = t4.angles.map((a, i) => +(a - (t0.angles[i] || 0)).toFixed(3));
    console.log('angle delta over 4s:', JSON.stringify(deltas));
  }

  // 现在点 openBtn → splash → 候补状态
  console.log('\nerrors:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });