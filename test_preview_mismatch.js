// 复现原图错位：进入 ch07 结婚章（stack 模式），点主图，看预览显示的是哪张
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
  await wait(2500);
  await page.click('#openBtn');
  await page.waitForFunction(() => !document.getElementById('loader'), { timeout: 60000 });
  await wait(1500);
  await page.click('#openChapterBtn');
  await page.waitForSelector('.vdot');
  const dots = await page.$$('.vdot');
  await dots[6].evaluate(d => d.click());  // ch07 结婚
  await wait(3000);

  // 当前 stack hero 显示的照片 + counter
  const state1 = await page.evaluate(() => ({
    counter: document.querySelector('.scene-counter')?.textContent,
    heroImg: document.querySelector('.cinema-hero img')?.src.split('/').slice(-2).join('/'),
    mode: document.querySelector('.scene')?.className
  }));
  console.log('进入 ch07:', JSON.stringify(state1));

  // 点击 hero
  await page.click('.cinema-hero');
  await wait(2000);

  const state2 = await page.evaluate(() => ({
    previewActive: document.querySelector('.preview.active') ? true : false,
    previewImg: document.querySelector('.preview-stage img, .preview img, #previewStage img')?.src?.split('/').slice(-2).join('/'),
    pdotActive: Array.from(document.querySelectorAll('.pdot')).findIndex(d => d.classList.contains('active')),
    pdotCount: document.querySelectorAll('.pdot').length,
    previewInfo: document.querySelector('.preview-info .pt')?.textContent
  }));
  console.log('点击后预览:', JSON.stringify(state2));

  // 关闭预览，切换到下一张再点
  await page.evaluate(() => document.querySelector('#previewBack, .preview-back')?.click());
  await wait(1000);
  await page.keyboard.press('ArrowDown');
  await wait(2500);

  const state3 = await page.evaluate(() => ({
    counter: document.querySelector('.scene-counter')?.textContent,
    heroImg: document.querySelector('.cinema-hero img')?.src.split('/').slice(-2).join('/')
  }));
  console.log('ArrowDown 后:', JSON.stringify(state3));

  await page.click('.cinema-hero');
  await wait(2000);
  const state4 = await page.evaluate(() => ({
    previewImg: document.querySelector('#previewStage img, .preview img')?.src?.split('/').slice(-2).join('/'),
    pdotActive: Array.from(document.querySelectorAll('.pdot')).findIndex(d => d.classList.contains('active'))
  }));
  console.log('第二次点击预览:', JSON.stringify(state4));

  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });