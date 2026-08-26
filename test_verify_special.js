// 验证 cover/AR/wish 是否真的渲染（用各自专属 selector）
const puppeteer = require('puppeteer-core');
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--enable-webgl', '--use-gl=angle']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });

  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await wait(2500);
  await page.click('#openBtn');
  await page.waitForFunction(() => !document.getElementById('loader'), { timeout: 60000 });
  await wait(1500);
  await page.click('#openChapterBtn');
  await page.waitForSelector('.vdot');
  const dots = await page.$$('.vdot');

  // 测 cover (idx=0)
  console.log('=== cover ===');
  await dots[0].evaluate(d => d.click());
  await wait(1500);
  const coverState = await page.evaluate(() => ({
    title: document.querySelector('.cover .title')?.textContent,
    sub: document.querySelector('.cover .sub')?.textContent,
    stageHasContent: document.getElementById('viewerStage')?.children.length > 0,
  }));
  console.log('cover:', JSON.stringify(coverState));

  // 测 AR (idx=10)
  console.log('\n=== AR (ch15) ===');
  await dots[10].evaluate(d => d.click());
  await wait(3000);
  const arState = await page.evaluate(() => ({
    arTitle: document.querySelector('.ar-num')?.textContent,
    cards: document.querySelectorAll('.ar-card, .ar-photo, .memory-card').length,
    stageHasContent: document.getElementById('viewerStage')?.children.length > 0,
  }));
  console.log('ar:', JSON.stringify(arState));

  // 测 wish (idx=11)
  console.log('\n=== wish ===');
  await dots[11].evaluate(d => d.click());
  await wait(1500);
  const wishState = await page.evaluate(() => ({
    title: document.querySelector('.viewer-wish-title')?.textContent,
    stageHasContent: document.getElementById('viewerStage')?.children.length > 0,
  }));
  console.log('wish:', JSON.stringify(wishState));

  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });