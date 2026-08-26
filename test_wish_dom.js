// 检查 wish-3d canvas 实际样式
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

  const dots = await page.$$('.vdot');
  await dots[11].evaluate(d => d.click());
  await wait(2500);

  const css = await page.evaluate(() => {
    const canvas = document.querySelector('.wish-3d');
    const slide = document.querySelector('.viewer-slide.wish');
    const cs = getComputedStyle(canvas);
    const ss = getComputedStyle(slide);
    return {
      canvasClass: canvas?.className,
      canvasInlineStyle: canvas?.style.cssText,
      canvasComputed: {
        position: cs.position,
        top: cs.top,
        right: cs.right,
        bottom: cs.bottom,
        left: cs.left,
        width: cs.width,
        height: cs.height,
        zIndex: cs.zIndex
      },
      slideComputed: {
        position: ss.position,
        display: ss.display,
        width: ss.width,
        height: ss.height
      },
      // 检查样式表里 wish-3d 规则
      ruleExists: Array.from(document.styleSheets).flatMap(s => {
        try { return Array.from(s.cssRules); } catch(e) { return []; }
      }).filter(r => r.selectorText && r.selectorText.includes('wish-3d')).map(r => r.cssText)
    };
  });
  console.log(JSON.stringify(css, null, 2));

  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });