// 验证 splash 实景银河背景 + 自由飞行 + 卫星
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
  await wait(8000);   // 等银河贴图加载（ESO 8MB 大图）

  const hasSky = await page.evaluate(() => !!window.__milkyWayTex && !!window.__milkyWayTex.image);
  const skyInfo = await page.evaluate(() => {
    const t = window.__milkyWayTex;
    if (!t) return { loaded: false };
    return { loaded: !!t.image, w: t.image?.width, h: t.image?.height, src: t.image?.src?.slice(-60) };
  });
  console.log('milky way info:', JSON.stringify(skyInfo));
  console.log('milky way texture loaded:', hasSky);

  await page.screenshot({ path: '_milky_initial.png' });

  // 检查像素：背景不是纯黑
  const px = await page.evaluate(() => {
    const c = document.querySelector('#splash canvas');
    const cv = document.createElement('canvas'); cv.width = 1600; cv.height = 900;
    const ctx = cv.getContext('2d');
    // 直接从 canvas 抽像素
    try {
      ctx.drawImage(c, 0, 0, 1600, 900);
      const d = ctx.getImageData(50, 50, 1, 1).data;   // 左上角
      const d2 = ctx.getImageData(1500, 50, 1, 1).data;  // 右上角
      const d3 = ctx.getImageData(800, 850, 1, 1).data;  // 底部
      return { tl: [d[0], d[1], d[2]], tr: [d2[0], d2[1], d2[2]], br: [d3[0], d3[1], d3[2]] };
    } catch(e){ return { error: e.message }; }
  });
  console.log('pixels:', JSON.stringify(px));

  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });