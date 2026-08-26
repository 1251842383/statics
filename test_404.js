// 抓所有 404 请求路径，找出哪些 thumb_small 或 资源缺失
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

  const failed = [];
  page.on('response', r => {
    if (r.status() >= 400){
      failed.push(`${r.status()} ${r.url()}`);
    }
  });

  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await wait(2500);
  await page.click('#openBtn');
  await page.waitForFunction(() => !document.getElementById('loader'), { timeout: 60000 });
  await wait(1500);
  await page.click('#openChapterBtn');
  await page.waitForSelector('.vdot');
  const dots = await page.$$('.vdot');

  // 走每章
  for (let i = 0; i < dots.length; i++){
    await dots[i].evaluate(d => d.click());
    await wait(3000);
  }
  await wait(2000);

  console.log('=== 失败请求 ===');
  const uniq = [...new Set(failed)];
  uniq.forEach(u => console.log(u));
  console.log('unique 404/500 count:', uniq.length);
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });