// 手机端相册 BGM：进入各章节后 currentBGM / audioCtx.state / 定时循环是否正常
const puppeteer = require('puppeteer-core');
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--enable-webgl', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required']
  });

  const m = await browser.newPage();
  await m.emulate({ viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const errors = [];
  m.on('pageerror', e => errors.push(e.message));

  await m.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await wait(2200);
  await m.tap('#openBtn');
  await m.waitForSelector('#loaderEnterBtn', { timeout: 90000 });
  await m.click('#loaderEnterBtn');
  await m.waitForFunction(() => !document.getElementById('loader'), { timeout: 20000 });
  await wait(1000);

  // 统计实际被调度的音符数：监听 audioCtx.destination 的连接不可行，改 monkeypatch createOscillator 前……
  // 直接检查内部状态变量（脚本在同一全局作用域）
  const audioState = () => m.evaluate(() => window.__bgmDebug ? window.__bgmDebug() : { noHook: true });
  console.log('home:', JSON.stringify(await audioState()));

  await m.tap('#openChapterBtn');
  await m.waitForSelector('.vdot');
  const dots = await m.$$('.vdot');

  // 逐章检查 BGM 切换
  const chapters = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  for (const ci of chapters) {
    await dots[ci].evaluate(d => d.click());
    await wait(1200);
    const s = await audioState();
    const exp = await m.evaluate(i => [null,null,null,"snow","story","wave","grad","slow","wedding","future","wedding","story"][i] || "(cover)", ci);
    const ok = s.bgm === exp ? 'OK' : 'MISMATCH(expected ' + exp + ')';
    console.log(`dot${ci}: ${JSON.stringify(s)} ${ok}`);
  }

  // 回 home 再进章节（iOS 常见：返回后 BGM 停）
  await m.tap('#viewerBack');
  await wait(800);
  console.log('back-home:', JSON.stringify(await audioState()));
  await dots[2].evaluate(d => d.click());
  await wait(1200);
  console.log('re-enter ch:', JSON.stringify(await audioState()));

  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
