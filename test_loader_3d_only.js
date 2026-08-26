// 直接拿 loader3d canvas 截图，避开 preserveDrawingBuffer 问题
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

  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await wait(2200);
  await page.click('#openBtn');
  await wait(3500);

  // 每个阶段截 loader 3D canvas 单图
  for (let i = 0; i < 5; i++){
    await wait(3000);  // 每阶段约 3 秒
    const tdc = await page.$('#loader3d');
    if (tdc){
      await tdc.screenshot({ path: `_loader3d_only_${i+1}.png` });
    }
    // 同时记录哪些对象可见
    const visible = await page.evaluate(() => {
      // 试图拿 scene 引用 —— 没暴露。只能取 canvas 自身信息
      const tdc = document.getElementById('loader3d');
      return {
        loaderRunning: !!window.__loaderStartTime,
        loaderVisible: getComputedStyle(document.getElementById('loader')).display,
        stage: window.__loaderStage
      };
    });
    console.log(`t=${(i+1)*3}s:`, JSON.stringify(visible));
  }

  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });