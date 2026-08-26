// 部署后回归测试 —— 直接访问 GitHub Pages
const puppeteer = require('puppeteer-core');
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--enable-webgl', '--use-gl=angle']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });

  const failed = [];
  page.on('response', r => {
    if (r.status() >= 400 && !r.url().includes('favicon')) failed.push(`${r.status()} ${r.url().split('/').slice(-2).join('/')}`);
  });

  console.log('=== 访问 GitHub Pages ===');
  const t0 = Date.now();
  await page.goto('https://1251842383.github.io/statics/index.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  console.log('load ms:', Date.now() - t0);

  await wait(3000);  // splash init
  await page.click('#openBtn');
  await page.waitForFunction(() => !document.getElementById('loader'), { timeout: 180000 });
  await wait(1500);
  await page.click('#openChapterBtn');
  await page.waitForSelector('.vdot');
  const dots = await page.$$('.vdot');
  console.log('chapters:', dots.length);

  // 走所有章节（除了 cover/wish/ar 这些用不同 DOM 的）
  const photoChapters = [1, 2, 3, 4, 5, 6, 7, 8, 9]; // ch01-ch09 + ch11
  let okCount = 0;
  for (const idx of photoChapters){
    await dots[idx].evaluate(d => d.click());
    await wait(1200);
    const state = await page.evaluate(() => {
      const imgs = document.querySelectorAll('#sceneFrame img');
      const vids = document.querySelectorAll('video');
      const allImgsOk = Array.from(imgs).every(i => i.complete && i.naturalWidth > 0);
      const imgsOk = Array.from(imgs).filter(i => i.complete && i.naturalWidth > 0).length;
      const title = document.querySelector('.scene-title')?.textContent || '';
      const counter = document.querySelector('.scene-counter')?.textContent || '';
      const videoOk = Array.from(vids).every(v => v.readyState >= 1);
      return { imgs: imgs.length, imgsOk, allImgsOk, vids: vids.length, videoOk, title, counter };
    });
    const ok = state.imgs === 0 ? state.videoOk : state.allImgsOk;
    if (ok) okCount++;
    console.log(`${ok ? '✓' : '✗'} idx=${idx} "${state.title}" img=${state.imgsOk}/${state.imgs} vid=${state.vids} counter=${state.counter}`);
  }
  console.log(`\nphoto/video chapters ok: ${okCount}/${photoChapters.length}`);

  // 测点击章节内图片 → preview 加载原图
  console.log('\n=== 章节点图 → 原图预览 ===');
  await dots[4].evaluate(d => d.click());  // ch04 北海 (idx=4)
  await wait(1500);
  const previewState = await page.evaluate(async () => {
    const img = document.querySelector('#sceneFrame img');
    if (!img) return { error: 'no img' };
    const src = img.src;
    // 模拟点击
    img.click();
    await new Promise(r => setTimeout(r, 1500));
    const previewImg = document.querySelector('#previewStage img.preview-slide img, #previewStage .preview-slide img');
    return {
      clickedSrc: src,
      previewSrc: previewImg?.src || '(none)',
      previewActive: document.getElementById('preview')?.classList?.contains('active')
    };
  });
  console.log('preview test:', JSON.stringify(previewState));

  console.log('\n=== 404 ===');
  console.log(failed.length ? failed.slice(0, 10) : 'none');

  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });