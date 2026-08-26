// 验证线上部署：wish 文字围心 + 交互
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
  await page.goto('https://1251842383.github.io/statics/index.html?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await wait(2500);
  await page.click('#openBtn');
  await page.waitForSelector('#loaderEnterBtn', { timeout: 90000 });
  await page.click('#loaderEnterBtn');
  await page.waitForFunction(() => !document.getElementById('loader'), { timeout: 20000 });
  await wait(1500);
  await page.click('#openChapterBtn');
  await page.waitForSelector('.vdot');
  const dots = await page.$$('.vdot');
  await dots[11].evaluate(d => d.click());  // wish
  await wait(3500);
  const state = await page.evaluate(() => ({
    domTextGone: !document.querySelector('.viewer-wish-text'),
    camZ: window.__wishDebug?.()?.camZ,
    textCount: window.__wishDebug?.()?.textCount
  }));
  console.log('LIVE wish state:', JSON.stringify(state));

  // 缩放测试
  await page.mouse.move(800, 450);
  await page.mouse.wheel({ deltaY: -500 });
  await wait(1200);
  const z2 = await page.evaluate(() => window.__wishDebug?.()?.camZ);
  console.log('LIVE zoom:', state.camZ, '→', z2);

  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });