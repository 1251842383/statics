// 综合验证：splash → 加载页(15s+5 阶段) → 首页 → 章节(含照片) → 键盘导航
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
  page.on('pageerror', e => errors.push('[pageerror] ' + (e.message || e).split('\n')[0]));
  page.on('console', m => { if (m.type() === 'error') errors.push('[console] ' + m.text().split('\n')[0]); });

  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await wait(2400);
  await page.click('#openBtn');
  const tLoaderStart = Date.now();
  await page.waitForFunction(() => !document.getElementById('loader'), { timeout: 60000 });
  const loaderMs = Date.now() - tLoaderStart;
  await wait(1500);
  console.log('home ok after', loaderMs, 'ms loader');

  // 验证首页有 openChapterBtn
  const homeState = await page.evaluate(() => ({
    hasSphere: !!window.photoGroup,
    photos: window.photoMeshes ? window.photoMeshes.length : 0,
    openBtnVisible: !!document.getElementById('openChapterBtn') && document.getElementById('openChapterBtn').offsetParent !== null,
    previewBtnVisible: getComputedStyle(document.getElementById('openChapterBtn')).display !== 'none'
  }));
  console.log('home state:', JSON.stringify(homeState));

  // 点击进入回忆录
  await page.click('#openChapterBtn');
  await page.waitForSelector('.vdot', { timeout: 15000 });
  const dots = await page.$$('.vdot');
  console.log('chapter view dots:', dots.length);

  // 验证 ch01 照片加载
  await dots[0].evaluate(d => d.click());
  await wait(3000);
  const ch01 = await page.evaluate(() => {
    const imgs = document.querySelectorAll('#sceneFrame img');
    const counter = document.querySelector('.scene-counter')?.textContent || '';
    return {
      imgs: imgs.length,
      allComplete: Array.from(imgs).every(i => i.complete && i.naturalWidth > 0),
      firstSrc: imgs[0]?.src || '',
      counter
    };
  });
  console.log('ch01:', JSON.stringify(ch01));

  // 键盘右 → 下一章
  await page.keyboard.press('ArrowRight');
  await wait(3000);
  const afterRight = await page.evaluate(() => ({
    counter: document.querySelector('.scene-counter')?.textContent || '',
    title: document.querySelector('.scene-text')?.textContent?.trim()?.slice(0, 30) || '',
    sceneClass: document.querySelector('.scene')?.className || ''
  }));
  console.log('after ArrowRight:', JSON.stringify(afterRight));

  // 键盘左 → 上一章
  await page.keyboard.press('ArrowLeft');
  await wait(2500);
  const afterLeft = await page.evaluate(() => ({
    counter: document.querySelector('.scene-counter')?.textContent || '',
    title: document.querySelector('.scene-text')?.textContent?.trim()?.slice(0, 30) || ''
  }));
  console.log('after ArrowLeft:', JSON.stringify(afterLeft));

  // 再右键两次到 ch03 测试连续键盘切换
  await page.keyboard.press('ArrowRight');
  await wait(2500);
  await page.keyboard.press('ArrowRight');
  await wait(2500);
  const ch3 = await page.evaluate(() => ({
    counter: document.querySelector('.scene-counter')?.textContent || '',
    imgs: document.querySelectorAll('#sceneFrame img').length,
    title: document.querySelector('.scene-text')?.textContent?.trim()?.slice(0, 30) || ''
  }));
  console.log('ch03 (after 2×ArrowRight):', JSON.stringify(ch3));

  // 验证每个 stage 是否都看到
  console.log('pageerrors:', errors.length ? errors.slice(0, 6) : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });