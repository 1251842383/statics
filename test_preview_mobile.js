// 手机视口验证 ch07 结婚章点击→预览映射
const puppeteer = require('puppeteer-core');
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--enable-webgl', '--use-gl=angle']
  });
  const page = await browser.newPage();
  await page.emulate({ viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });

  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await wait(2500);
  await page.tap('#openBtn');
  await page.waitForFunction(() => !document.getElementById('loader'), { timeout: 60000 });
  await wait(1500);
  await page.tap('#openChapterBtn');
  await page.waitForSelector('.vdot');
  const dots = await page.$$('.vdot');
  await dots[7].evaluate(d => d.click());  // ch07 结婚
  await wait(3000);

  const before = await page.evaluate(() => ({
    counter: document.querySelector('.scene-counter')?.textContent,
    heroImg: document.querySelector('.cinema-hero img')?.src.split('/').slice(-2).join('/'),
    mode: document.querySelector('.scene')?.className
  }));
  console.log('ch07 mobile 进入:', JSON.stringify(before));

  // tap hero 中心
  const hero = await page.$('.cinema-hero');
  if (hero){
    const box = await hero.boundingBox();
    await page.touchscreen.tap(box.x + box.width/2, box.y + box.height/2);
    await wait(2000);
  }
  const preview = await page.evaluate(() => ({
    img: document.querySelector('.preview img, #previewStage img, .preview-stage img')?.src?.split('/').slice(-2).join('/'),
    activeDot: Array.from(document.querySelectorAll('.pdot')).findIndex(d => d.classList.contains('active')),
    info: document.querySelector('.preview-info .pt')?.textContent
  }));
  console.log('点击后预览:', JSON.stringify(preview));

  // 预览里横滑两张再验证
  await page.evaluate(() => {
    const b = document.getElementById('previewBack') || document.querySelector('.preview-back');
    if (b) b.click();
  });
  await wait(800);

  // 切到第 5 张再点
  await page.evaluate(() => { window.viewerPhotos; });
  for (let k = 0; k < 4; k++){
    await page.keyboard.press('ArrowDown');
    await wait(1200);
  }
  const before2 = await page.evaluate(() => ({
    counter: document.querySelector('.scene-counter')?.textContent,
    heroImg: document.querySelector('.cinema-hero img')?.src.split('/').slice(-2).join('/')
  }));
  console.log('切到第5张:', JSON.stringify(before2));
  const hero2 = await page.$('.cinema-hero');
  if (hero2){
    const box = await hero2.boundingBox();
    await page.touchscreen.tap(box.x + box.width/2, box.y + box.height/2);
    await wait(2000);
  }
  const preview2 = await page.evaluate(() => ({
    img: document.querySelector('.preview img, #previewStage img, .preview-stage img')?.src?.split('/').slice(-2).join('/'),
    activeDot: Array.from(document.querySelectorAll('.pdot')).findIndex(d => d.classList.contains('active'))
  }));
  console.log('第5张点击预览:', JSON.stringify(preview2));

  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });