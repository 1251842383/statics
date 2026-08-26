// 系统测试手机端所有章节流畅度 + 章节切换响应 + 图片加载
const puppeteer = require('puppeteer-core');
const wait = ms => new Promise(r => setTimeout(r, ms));

const CHAPTERS = [
  { id: 'cover',   hasPhotos: false, name: '封面' },
  { id: 'ch01',    hasPhotos: true,  name: '在那之前',    expect: 3 },
  { id: 'ch02',    hasPhotos: true,  name: '峨眉雪',      expect: 5 },
  { id: 'ch03',    hasPhotos: true,  name: '山城之夜',    expect: 8 },
  { id: 'ch04',    hasPhotos: true,  name: '北海海风',    expect: 10 },
  { id: 'ch05',    hasPhotos: true,  name: '那年毕业',    expect: 9 },
  { id: 'ch06',    hasPhotos: true,  name: '在一起',      expect: 36 },
  { id: 'ch07',    hasPhotos: true,  name: '结婚',        expect: 21 },
  { id: 'ch11',    hasPhotos: true,  name: '柯柯',        expect: 25 },
  { id: 'ch14',    hasPhotos: false, name: '影片',        isVideo: true },
  { id: 'ch15',    hasPhotos: false, name: 'AR',          isAR: true },
  { id: 'wish',    hasPhotos: false, name: '下一个十年' }
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--enable-webgl', '--use-gl=angle', '--window-size=375,812']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1');

  const logs = [];
  const errors = [];
  page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));

  console.log('=== 启动 ===');
  const t0 = Date.now();
  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  console.log('page load ms:', Date.now() - t0);

  // 等 splash
  await wait(2500);
  await page.click('#openBtn');
  console.log('clicked openBtn');

  // 等 loader 消失
  await page.waitForFunction(() => !document.getElementById('loader'), { timeout: 90000 });
  await wait(1500);
  console.log('home sphere ready');

  // 进章节
  await page.click('#openChapterBtn');
  await page.waitForSelector('.vdot', { timeout: 15000 });
  const allDots = await page.$$('.vdot');
  console.log('total chapters:', allDots.length);

  // FPS 测试函数（5 秒）
  const measureFps = async () => {
    return await page.evaluate(() => new Promise(res => {
      let n = 0; const t0 = performance.now();
      function loop(){ n++; if (performance.now() - t0 < 3000) requestAnimationFrame(loop); else res(+(n / 3).toFixed(1)); }
      requestAnimationFrame(loop);
    }));
  };

  const memSnapshot = async () => {
    return await page.evaluate(() => {
      const m = performance.memory;
      return m ? { used: +(m.usedJSHeapSize / 1048576).toFixed(1), total: +(m.totalJSHeapSize / 1048576).toFixed(1) } : null;
    });
  };

  // 走每章（通过点击 dots）
  for (let i = 0; i < allDots.length; i++){
    const target = CHAPTERS[i];
    const memBefore = await memSnapshot();

    const tEnterStart = Date.now();
    await allDots[i].evaluate(d => d.click());

    // 等章节标题出现
    try {
      await page.waitForSelector('.scene-counter', { timeout: 8000 });
    } catch(e){
      console.log(`  ✗ ${target.id}(${target.name}) 章节切换超时 (8s)`);
      continue;
    }
    const enterMs = Date.now() - tEnterStart;

    await wait(800);  // 给点时间渲染

    // 拿照片加载状态
    const stateInfo = await page.evaluate(() => {
      const imgs = document.querySelectorAll('#sceneFrame img');
      const videos = document.querySelectorAll('video');
      const allComplete = Array.from(imgs).every(i => i.complete && i.naturalWidth > 0);
      const completeCount = Array.from(imgs).filter(i => i.complete && i.naturalWidth > 0).length;
      const counter = document.querySelector('.scene-counter')?.textContent || '';
      const title = document.querySelector('.scene-title')?.textContent || '';
      return { imgs: imgs.length, videos: videos.length, allComplete, completeCount, counter, title };
    });

    // FPS（仅普通章节）
    let fps = 'n/a';
    if (!target.isAR && !target.isVideo){
      fps = await measureFps();
    }

    const memAfter = await memSnapshot();
    const memDelta = memAfter && memBefore ? +(memAfter.used - memBefore.used).toFixed(1) : 0;

    const ok = stateInfo.imgs === 0 || stateInfo.allComplete || target.isAR || target.isVideo;
    console.log(`${ok ? '✓' : '✗'} ${target.id}(${target.name}) enter=${enterMs}ms img=${stateInfo.completeCount}/${stateInfo.imgs} fps=${fps} mem+${memDelta}MB "${stateInfo.title}"`);

    // 再等 1s 看照片是否后续加载
    if (stateInfo.imgs > 0 && !stateInfo.allComplete){
      await wait(3000);
      const retry = await page.evaluate(() => {
        const imgs = document.querySelectorAll('#sceneFrame img');
        return Array.from(imgs).filter(i => i.complete && i.naturalWidth > 0).length;
      });
      if (retry > stateInfo.completeCount){
        console.log(`  → 3s 后又加载了 ${retry - stateInfo.completeCount} 张（共 ${retry}/${stateInfo.imgs}）`);
      } else if (retry < stateInfo.imgs){
        console.log(`  → 仍有 ${stateInfo.imgs - retry} 张未加载 (counter=${stateInfo.counter})`);
      }
    }
  }

  // 测章节间快速切换响应（cover → ch04 → ch06 → ch11 → ch15）
  console.log('\n=== 快速切换响应测试 ===');
  const indices = [0, 3, 5, 7, 9]; // cover, ch04, ch06, ch11, ch15
  for (const idx of indices){
    const t = Date.now();
    await allDots[idx].evaluate(d => d.click());
    try {
      await page.waitForFunction((i) => {
        const c = document.querySelector('.scene-counter')?.textContent || '';
        const t = document.querySelector('.scene-title')?.textContent || '';
        return t.length > 0;
      }, { timeout: 5000 }, idx);
    } catch(e){
      console.log(`  ✗ 快速切换到 ${idx} 超时`);
      continue;
    }
    const ms = Date.now() - t;
    console.log(`  → 切到 idx=${idx} 用 ${ms}ms`);
    await wait(400);
  }

  console.log('\n=== errors ===');
  console.log(errors.length ? errors.slice(0, 8) : 'none');
  console.log('\n=== logs (error/warn only) ===');
  console.log(logs.filter(l => l.startsWith('[error]') || l.startsWith('[warning]')).slice(0, 10));

  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });