// 进入相册后详细排查：监听所有 console + 截图每章
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

  const logs = [];
  const errors = [];
  page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => errors.push(e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
  page.on('requestfailed', r => errors.push(`reqfail: ${r.url()} - ${r.failure()?.errorText}`));

  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await wait(2500);
  await page.click('#openBtn');
  await page.waitForFunction(() => !document.getElementById('loader'), { timeout: 60000 });
  await wait(1500);

  console.log('=== home sphere state ===');
  const homeState = await page.evaluate(() => {
    const w = window;
    return {
      photoGroupVisible: w.photoGroup?.visible,
      photoMeshCount: w.photoMeshes?.length || 0,
      firstPhotoComplete: w.photoMeshes?.[0]?.mesh?.material?.map?.image?.complete,
      firstPhotoSrc: w.photoMeshes?.[0]?.src,
      homePaused: w.__homePaused
    };
  });
  console.log(JSON.stringify(homeState));

  // 点击进入回忆录
  await page.click('#openChapterBtn');
  await wait(3000);

  console.log('\n=== ch01 viewer state ===');
  const ch01State = await page.evaluate(() => {
    return {
      viewerActive: document.getElementById('viewer')?.classList?.contains('active'),
      viewerPhotos: window.viewerPhotos?.length || 0,
      sceneCount: document.querySelectorAll('.scene').length,
      sceneFrameChildren: document.getElementById('sceneFrame')?.children.length,
      sceneCounter: document.querySelector('.scene-counter')?.textContent,
      imgCount: document.querySelectorAll('#sceneFrame img').length,
      canvasCount: document.querySelectorAll('#sceneFrame canvas').length,
      firstImgSrc: document.querySelector('#sceneFrame img')?.src,
      firstImgComplete: document.querySelector('#sceneFrame img')?.complete,
      viewerFxStop: window.viewerFxState?.stop,
      chapterThreeExists: !!window.chapterThree,
      token: window._openChapterToken
    };
  });
  console.log(JSON.stringify(ch01State, null, 2));

  // 截图
  await page.screenshot({ path: '_ch01_state.png' });
  // 还截一下 chapter 内容
  await page.screenshot({ path: '_ch01_full.png', fullPage: false });

  console.log('\n=== errors ===');
  console.log(errors.length ? errors : 'none');
  console.log('\n=== logs (error only) ===');
  console.log(logs.filter(l => l.startsWith('[error]')).slice(0, 10));

  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });