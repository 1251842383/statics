// 验证桌面端相册布局尺寸 + 触摸屏笔记本（pointer:coarse + 宽屏）检测
const puppeteer = require('puppeteer-core');
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--enable-webgl', '--use-gl=angle', '--window-size=1600,900']
  });

  // ===== 场景1：普通桌面（有鼠标）=====
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });
  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await wait(2500);
  await page.click('#openBtn');
  await page.waitForFunction(() => !document.getElementById('loader'), { timeout: 60000 });
  await wait(1000);
  await page.click('#openChapterBtn');
  await page.waitForSelector('.vdot');
  const dots = await page.$$('.vdot');
  await dots[1].evaluate(d => d.click());  // ch01 book
  await wait(2500);

  const desk = await page.evaluate(() => {
    const book = document.querySelector('.book');
    const r = book?.getBoundingClientRect();
    return {
      isDesktop: window.__isDesktop,
      htmlClass: document.documentElement.className,
      book: r ? { w: r.width | 0, h: r.height | 0 } : null,
      viewport: { w: innerWidth, h: innerHeight }
    };
  });
  console.log('normal desktop:', JSON.stringify(desk));
  await page.screenshot({ path: '_album_desk_book.png' });
  await page.close();

  // ===== 场景2：触摸屏笔记本（hasTouch=true → pointer:coarse，宽屏）=====
  const t = await browser.newPage();
  await t.setViewport({ width: 1920, height: 1080, hasTouch: true });
  await t.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await wait(2500);
  const touchLaptop = await t.evaluate(() => ({
    isDesktop: window.__isDesktop,
    htmlClass: document.documentElement.className,
    matchFine: matchMedia('(pointer:fine)').matches,
    matchCoarse: matchMedia('(pointer:coarse)').matches,
    matchHover: matchMedia('(hover:hover)').matches
  }));
  console.log('touch laptop (1920x1080 hasTouch):', JSON.stringify(touchLaptop));
  await t.close();

  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
