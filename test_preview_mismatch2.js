// 全面测各模式点击→预览映射：book(ch01)/flow(ch04)/stack(ch06) + 结婚 ch07
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

  async function testChapter(dotIdx, label, clickSelector){
    const dots = await page.$$('.vdot');
    await dots[dotIdx].evaluate(d => d.click());
    await wait(2500);
    const shown = await page.evaluate(sel => {
      const el = document.querySelector(sel);
      return el ? (el.src || el.style.backgroundImage).split('/').slice(-2).join('/').replace(/["')]/g,'') : null;
    }, clickSelector.shown);
    const before = await page.evaluate(() => ({
      counter: document.querySelector('.scene-counter')?.textContent,
      mode: document.querySelector('.scene')?.className
    }));
    // 点击
    const clickable = await page.$(clickSelector.click);
    if (!clickable){ console.log(label, '找不到点击元素', clickSelector.click); return; }
    await clickable.evaluate(el => el.click());
    await wait(1800);
    const preview = await page.evaluate(() => ({
      img: document.querySelector('.preview img, #previewStage img, .preview-stage img')?.src?.split('/').slice(-2).join('/'),
      activeDot: Array.from(document.querySelectorAll('.pdot')).findIndex(d => d.classList.contains('active')),
      info: document.querySelector('.preview-info .pt')?.textContent
    }));
    console.log(`${label}: 显示=${shown} counter=${before.counter} mode=${before.mode}`);
    console.log(`  点击后预览=${preview.img} (pdot#${preview.activeDot}) 章节=${preview.info}`);
    // 关闭预览
    await page.evaluate(() => {
      const b = document.getElementById('previewBack') || document.querySelector('.preview-back');
      if (b) b.click();
    });
    await wait(800);
  }

  // ch01 book（右页点击）
  await testChapter(1, 'ch01 book右页', { shown: '.book-page.right img', click: '.book-page.right' });
  // ch01 book 左页点击
  await testChapter(1, 'ch01 book左页', { shown: '.book-page.left img', click: '.book-page.left' });
  // ch04 flow
  await testChapter(4, 'ch04 flow', { shown: '.flow-card.active img, .flow img', click: '.flow-card' });
  // ch07 结婚 stack
  await testChapter(7, 'ch07 stack', { shown: '.cinema-hero img', click: '.cinema-hero' });

  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });