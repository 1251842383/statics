// 线上验证：loader 3D 可见 + BGM debug 钩子 + DNA 缩放
const puppeteer = require('puppeteer-core');
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--enable-webgl', '--use-gl=angle', '--window-size=1600,900', '--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('https://1251842383.github.io/statics/index.html?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await wait(2500);
  await page.click('#openBtn');
  await wait(4500);

  const hooks = await page.evaluate(() => ({
    hasLoaderDebug: typeof window.__loaderDebug === 'function',
    hasBgmDebug: typeof window.__bgmDebug === 'function',
    loaderCamZ: window.__loaderDebug?.()?.camZ,
    stageLabel: document.querySelector('.loader-hex-text')?.textContent,
    bgm: window.__bgmDebug?.()?.bgm
  }));
  console.log('LIVE hooks:', JSON.stringify(hooks));

  // loader 期间缩放
  await page.mouse.move(800, 450);
  await page.mouse.wheel({ deltaY: -400 });
  await wait(700);
  console.log('LIVE loader zoom:', hooks.loaderCamZ, '→', await page.evaluate(() => window.__loaderDebug()?.camZ));

  await page.waitForFunction(() => !document.getElementById('loader'), { timeout: 120000 });
  await wait(1200);
  console.log('LIVE home bgm:', JSON.stringify(await page.evaluate(() => window.__bgmDebug?.())));

  // 进章节验证 BGM 切换
  await page.click('#openChapterBtn');
  await page.waitForSelector('.vdot');
  const dots = await page.$$('.vdot');
  await dots[2].evaluate(d => d.click());
  await wait(2000);
  console.log('LIVE ch02 bgm:', JSON.stringify(await page.evaluate(() => window.__bgmDebug?.())));

  console.log('LIVE errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
