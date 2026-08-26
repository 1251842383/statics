// 验证 wish 文案循环：DOM 文案浮现 → 自动飞散 → 重组成新页
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
  await wait(2400);
  await page.click('#openBtn');
  await page.waitForSelector('#loaderEnterBtn', { timeout: 60000 });
  await page.click('#loaderEnterBtn');
  await page.waitForFunction(() => !document.getElementById('loader'), { timeout: 20000 });
  await wait(1500);

  // 进入 wish 章节（最后一个 vdot）
  await page.click('#openChapterBtn');
  await page.waitForSelector('.vdot', { timeout: 15000 });
  const dots = await page.$$('.vdot');
  await dots[dots.length - 1].evaluate(d => d.click());   // wish 在末尾
  await wait(3000);

  // 1) tabs 是否渲染，3 个按钮
  const tabs1 = await page.evaluate(() => {
    const tabs = document.querySelectorAll('.wish-tabs .ar-tab');
    return {
      count: tabs.length,
      active: document.querySelector('.wish-tabs .ar-tab.active')?.textContent || '',
      tabs: Array.from(tabs).map(t => t.textContent)
    };
  });
  console.log('wish tabs:', JSON.stringify(tabs1));

  // 2) 文案页是否浮现
  await wait(2500);
  const pages1 = await page.evaluate(() => {
    const ps = document.querySelectorAll('.wish-page');
    return {
      count: ps.length,
      texts: Array.from(ps).map(p => ({ txt: p.textContent.slice(0, 30), show: p.classList.contains('show') }))
    };
  });
  console.log('wish pages (t≈3.5s):', JSON.stringify(pages1));

  // 3) 等 ~10s 不动 → 触发自动 flyOut
  await wait(10000);
  const auto = await page.evaluate(() => {
    const tabs = document.querySelectorAll('.wish-tabs .ar-tab');
    return { active: document.querySelector('.wish-tabs .ar-tab.active')?.textContent || '' };
  });
  console.log('after auto-flyout wait:', JSON.stringify(auto));

  // 4) 手动触发：点击心形 canvas 中心
  await page.mouse.click(800, 450);
  await wait(3500);
  const afterClick = await page.evaluate(() => ({
    active: document.querySelector('.wish-tabs .ar-tab.active')?.textContent || '',
    pages: Array.from(document.querySelectorAll('.wish-page')).map(p => p.textContent.slice(0, 18))
  }));
  console.log('after click:', JSON.stringify(afterClick));

  // 5) 切到下一页 tab
  const tabs = await page.$$('.wish-tabs .ar-tab');
  await tabs[2].click();
  await wait(3500);
  const afterTab = await page.evaluate(() => ({
    active: document.querySelector('.wish-tabs .ar-tab.active')?.textContent || '',
    pages: Array.from(document.querySelectorAll('.wish-page')).map(p => p.textContent.slice(0, 18))
  }));
  console.log('after tab2:', JSON.stringify(afterTab));

  // 6) 旋转不应该误触发 flyOut
  await page.mouse.move(800, 450);
  await page.mouse.down();
  await page.mouse.move(950, 480, { steps: 12 });
  await page.mouse.up();
  await wait(1500);
  const afterDrag = await page.evaluate(() => ({
    active: document.querySelector('.wish-tabs .ar-tab.active')?.textContent || ''
  }));
  console.log('after drag (no flyOut):', JSON.stringify(afterDrag));

  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });