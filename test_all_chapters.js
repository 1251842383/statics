// 全章节综合验证：文案特效 + 流畅度 + DOM 不累积 + 点击原图
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
  page.on('pageerror', e => errors.push('[pageerror] ' + (e.stack || e.message).split('\n').slice(0, 4).join(' | ')));

  const fps = (secs = 2) => page.evaluate(s => new Promise(res => {
    let n = 0; const t0 = performance.now();
    function loop(){ n++; if (performance.now() - t0 < s * 1000) requestAnimationFrame(loop); else res(+(n / s).toFixed(1)); }
    requestAnimationFrame(loop);
  }), secs);

  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await wait(2400);
  await page.click('#openBtn');
  // 加载完成后出现"进入回忆球"按钮，点击进入（不再自动进入）
  await page.waitForSelector('#loaderEnterBtn', { timeout: 60000 });
  await page.click('#loaderEnterBtn');
  await page.waitForFunction(() => !document.getElementById('loader'), { timeout: 20000 });
  await wait(1500);
  console.log('home FPS:', await fps());

  await page.click('#openChapterBtn');
  await page.waitForSelector('.vdot', { timeout: 15000 });
  const dots = await page.$$('.vdot');

  const chapters = [
    { i: 1,  id: 'ch01', mode: 'book',     acc: 9000 },
    { i: 2,  id: 'ch02', mode: 'book',     acc: 0 },
    { i: 3,  id: 'ch03', mode: 'book',     acc: 0 },
    { i: 4,  id: 'ch04', mode: 'flow',     acc: 8500 },
    { i: 5,  id: 'ch05', mode: 'book',     acc: 0 },
    { i: 6,  id: 'ch06', mode: 'stack',    acc: 9500 },
    { i: 7,  id: 'ch07', mode: 'stack',    acc: 0 },
    { i: 8,  id: 'ch11', mode: 'stack',    acc: 0 },
    { i: 9,  id: 'ch14', mode: 'filmstrip',acc: 0 },
    { i: 10, id: 'ch15', mode: 'ar',       acc: 0 },
    { i: 11, id: 'wish', mode: 'wish',     acc: 0 }
  ];

  for (const c of chapters){
    await dots[c.i].evaluate(d => d.click());
    await wait(c.mode === 'ar' ? 4500 : (c.mode === 'wish' ? 3000 : 2500));
    const info = await page.evaluate((mode, acc) => {
      const scene = document.querySelector('.scene');
      const frame = scene?.querySelector('#sceneFrame');
      const text = scene?.querySelector('.scene-text');
      const spans = text ? text.querySelectorAll('.ch') : [];
      let animated = 0;
      spans.forEach(sp => { if (getComputedStyle(sp).animationName !== 'none') animated++; });
      const contAnim = text ? getComputedStyle(text).animationName !== 'none' : false;
      return {
        sceneOk: mode === 'wish' ? !!document.querySelector('.viewer-slide.wish')
              : mode === 'ar' ? !!document.querySelector('.viewer-slide.ar')
              : !!scene,
        cls: scene?.className || document.querySelector('.viewer-slide')?.className || '',
        photos: mode === 'filmstrip' ? document.querySelectorAll('.film-card video').length
              : mode === 'wish' ? 0
              : document.querySelectorAll('#sceneFrame img').length,
        spans: spans.length, animated, contAnim,
        frameChildren: frame ? frame.children.length : -1,
        counter: scene?.querySelector('.scene-counter')?.textContent || ''
      };
    }, c.mode, c.acc);
    const f = await fps();
    let accNote = '';
    if (c.acc){
      // 等一个自动翻页周期，检查照片推进 + DOM 不累积
      const before = await page.evaluate(() => ({
        imgs: document.querySelectorAll('#sceneFrame img').length,
        src: document.querySelector('#sceneFrame img')?.src || '',
        counter: document.querySelector('.scene-counter')?.textContent || '',
        fc: document.querySelector('#sceneFrame')?.children.length ?? -1
      }));
      await wait(c.acc + 1600);
      const after = await page.evaluate(() => ({
        imgs: document.querySelectorAll('#sceneFrame img').length,
        src: document.querySelector('#sceneFrame img')?.src || '',
        counter: document.querySelector('.scene-counter')?.textContent || '',
        fc: document.querySelector('#sceneFrame')?.children.length ?? -1
      }));
      const advanced = before.counter !== after.counter || before.src !== after.src;
      accNote = ` | autoAdv:${advanced ? 'OK' : 'STUCK'} frameChildren:${before.fc}->${after.fc}${after.fc > before.fc ? ' LEAK' : ''}`;
    }
    const txtOk = (c.mode === 'ar' || c.mode === 'wish' || c.mode === 'filmstrip') ? '-' : ((info.animated > 0 || info.contAnim) ? 'OK' : 'NONE');
    console.log(`${c.id}(${c.mode}): scene:${info.sceneOk ? 'OK' : 'FAIL'} photos:${info.photos} text:${info.spans}spans/${txtOk} FPS:${f}${accNote}`);
  }

  // ===== 点击原图验证（ch01 book 模式）=====
  await dots[1].evaluate(d => d.click());
  await wait(2500);
  const heroImg = await page.$('.book-page.right');
  await heroImg.click();
  await wait(2000);
  const pv = await page.evaluate(() => ({
    active: document.getElementById('preview').classList.contains('active'),
    imgLoaded: !!document.querySelector('.preview-slide img')?.complete,
    imgSrc: document.querySelector('.preview-slide img')?.src || ''
  }));
  console.log('click-original (book):', JSON.stringify(pv));
  await page.click('#previewBack');
  await wait(800);
  const backToChapter = await page.evaluate(() => ({
    viewerActive: document.getElementById('viewer').classList.contains('active'),
    previewClosed: !document.getElementById('preview').classList.contains('active'),
    bookVisible: !!document.querySelector('.book')
  }));
  console.log('close-preview-back-to-chapter:', JSON.stringify(backToChapter));

  // stack 模式点击原图（ch06）
  await dots[6].evaluate(d => d.click());
  await wait(2500);
  await page.click('.cinema-hero');
  await wait(2000);
  const pv2 = await page.evaluate(() => ({
    active: document.getElementById('preview').classList.contains('active'),
    imgLoaded: !!document.querySelector('.preview-slide img')?.complete
  }));
  console.log('click-original (stack):', JSON.stringify(pv2));
  await page.click('#previewBack');

  console.log('pageerrors:', errors.length ? errors.slice(0, 8) : 'none');
  await browser.close();
})().catch(e => { console.error('ALL-CHAPTER FAIL:', e.message); process.exit(1); });
