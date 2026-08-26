// ch15 AR时光墙 验证脚本：进场 → 主题切换 → 拖拽 → 点击凝视
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
  page.on('console', m => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
  page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
  page.on('response', r => { if (r.status() >= 400) errors.push(`[404] ${r.status()} ${r.url()}`); });

  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  console.log('loaded, waiting splash...');
  await wait(2400);
  await page.click('#openBtn');
  console.log('clicked openBtn, waiting loader...');

  // 等 loader 完成（min 6.5s）→ #loader 被移除
  await page.waitForFunction(() => !document.getElementById('loader'), { timeout: 40000 });
  console.log('loader done, entering chapters...');
  await wait(800);

  await page.click('#openChapterBtn');
  await page.waitForSelector('.vdot', { timeout: 15000 });
  const dots = await page.$$('.vdot');
  console.log('dots:', dots.length);

  // ch15 = CHAPTERS 索引 10（cover,01..11,14,15,wish）
  await dots[10].click();
  await wait(2500);
  console.log('in ch15? mode check:', await page.evaluate(() => ({
    hasSlide: !!document.querySelector('.viewer-slide.ar'),
    tabs: document.querySelectorAll('.ar-tab').length,
    label: document.querySelector('.ar-theme-label')?.textContent || '',
  })));
  await page.screenshot({ path: '_ar_01_initial.png' });

  // 等 6s：首个主题完全聚合 + 自动巡检间隙
  await wait(6000);
  await page.screenshot({ path: '_ar_02_theme1_full.png' });

  // 程序化验证：卡片聚合状态 + canvas 像素实际有内容
  const state1 = await page.evaluate(() => {
    const dbg = window.__arDebug ? window.__arDebug() : null;
    let lit = 0, bright = 0;
    const cv = document.querySelector('.ar-canvas');
    if (cv){
      const c2 = document.createElement('canvas');
      c2.width = 160; c2.height = 90;
      const cx = c2.getContext('2d');
      cx.drawImage(cv, 0, 0, 160, 90);
      const d = cx.getImageData(0, 0, 160, 90).data;
      for (let i = 3; i < d.length; i += 4){
        if (d[i] > 10){ lit++; if (d[i] > 200) bright++; }
      }
    }
    return { dbg, lit, bright };
  });
  const dbg = state1.dbg;
  if (dbg){
    const active = dbg.cards.filter(c => c.active);
    const settled = active.filter(c => c.reveal > 0.85);
    const nearBase = active.filter(c => Math.hypot(c.pos[0]-c.base[0], c.pos[1]-c.base[1], c.pos[2]-c.base[2]) < 0.5);
    console.log(`theme=${dbg.theme} cards=${dbg.cards.length} active=${active.length} loaded=${dbg.cards.filter(c=>c.loaded).length} settled(reveal>0.85)=${settled.length} nearBase=${nearBase.length}`);
    console.log(`canvas: litPx=${state1.lit}/14400 brightPx=${state1.bright}`);
    if (active.length === 0 || settled.length < active.length - 1) { console.log('WARN: cards not settled'); }
    if (state1.lit < 2000) { console.log('WARN: canvas too dark'); }
  } else {
    console.log('ERROR: __arDebug not available');
  }

  // 切换主题（点第 3 个 tab：相拥）
  const tabs = await page.$$('.ar-tab');
  if (tabs[2]) { await tabs[2].click(); }
  await wait(2500);
  await page.screenshot({ path: '_ar_03_theme3.png' });
  console.log('theme after switch:', await page.evaluate(() => document.querySelector('.ar-theme-label')?.textContent));
  const state2 = await page.evaluate(() => window.__arDebug());
  if (state2){
    const active = state2.cards.filter(c => c.active);
    const settled = active.filter(c => c.reveal > 0.85 && Math.hypot(c.pos[0]-c.base[0], c.pos[1]-c.base[1], c.pos[2]-c.base[2]) < 0.5);
    console.log(`theme2: active=${active.length} settled=${settled.length} rotY=${state2.rotY}`);
  }

  // 点击上排中间卡片 → 凝视一帧（拖拽前，卡片还在屏幕中央）
  await page.mouse.click(800, 340);
  await wait(1600);
  await page.screenshot({ path: '_ar_05_focus.png' });
  const state3 = await page.evaluate(() => window.__arDebug());
  if (state3){
    const foc = state3.cards.filter(c => c.focused);
    console.log(`focus: focused=${foc.length} scale=${foc.map(c => c.scale)} rotY=${state3.rotY}`);
    if (!foc.length) console.log('WARN: focus click missed');
    // 取消凝视
    await page.mouse.click(200, 200);
    await wait(800);
  }

  // 拖拽旋转
  const rotBefore = await page.evaluate(() => window.__arDebug().rotY);
  await page.mouse.move(800, 450);
  await page.mouse.down();
  await page.mouse.move(1100, 430, { steps: 12 });
  await page.mouse.up();
  await wait(1200);
  await page.screenshot({ path: '_ar_04_dragged.png' });
  const rotAfter = await page.evaluate(() => window.__arDebug().rotY);
  console.log(`drag rotation: ${rotBefore} -> ${rotAfter} (delta ${+(rotAfter - rotBefore).toFixed(3)})`);
  if (Math.abs(rotAfter - rotBefore) < 0.3) console.log('WARN: drag did not rotate');

  // 回归：退出 AR 回首页，进 ch01 和 wish 章节确认无错误
  await page.click('#viewerBack');
  await wait(1200);
  const dots2 = await page.$$('.vdot');
  // dots2 重新可见需重进章节：从回忆录按钮进入
  await page.evaluate(() => document.getElementById('openChapterBtn').style.display = 'inline-flex');
  await page.click('#openChapterBtn');
  await wait(2000);
  await page.screenshot({ path: '_ar_06_regression_ch01.png' });
  const dots3 = await page.$$('.vdot');
  await dots3[dots3.length - 1].click();
  await wait(2500);
  await page.screenshot({ path: '_ar_07_regression_wish.png' });
  const wishOk = await page.evaluate(() => !!document.querySelector('.viewer-slide.wish'));
  console.log('wish chapter regression:', wishOk ? 'OK' : 'FAIL');

  console.log('errors:', errors.length ? errors.slice(0, 10) : 'none');
  await browser.close();
})().catch(e => { console.error('TEST FAIL:', e.message); process.exit(1); });
