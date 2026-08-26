// 测 wish 章节 canvas 尺寸 / 位置
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

  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await wait(2500);
  await page.click('#openBtn');
  await page.waitForFunction(() => !document.getElementById('loader'), { timeout: 60000 });
  await wait(1500);
  await page.click('#openChapterBtn');
  await page.waitForSelector('.vdot');

  // 选最后一章（wish idx=11）
  const dots = await page.$$('.vdot');
  await dots[11].evaluate(d => d.click());
  await wait(2500);

  const wishState = await page.evaluate(() => {
    const canvas = document.querySelector('.wish-3d');
    const slide = document.querySelector('.viewer-slide.wish');
    const content = document.querySelector('.viewer-slide.wish .cover-content');
    const title = document.querySelector('.viewer-wish-title');
    const r = canvas?.getBoundingClientRect();
    const sr = slide?.getBoundingClientRect();
    const cr = content?.getBoundingClientRect();
    const tr = title?.getBoundingClientRect();
    return {
      canvas: { w: canvas?.width, h: canvas?.height, cssW: r?.width, cssH: r?.height, top: r?.top, left: r?.left },
      slide: { w: sr?.width, h: sr?.height, top: sr?.top, left: sr?.left },
      content: { w: cr?.width, h: cr?.height, top: cr?.top, left: cr?.left },
      title: { text: title?.textContent, top: tr?.top, left: tr?.left },
      viewport: { w: window.innerWidth, h: window.innerHeight }
    };
  });
  console.log(JSON.stringify(wishState, null, 2));

  // 等几秒看动画
  await wait(3000);
  await page.screenshot({ path: '_wish_state.png' });

  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });