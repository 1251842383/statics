// 直接探测每个银河贴图 URL 在浏览器内是否可达
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
  page.on('requestfailed', r => console.log('FAILED:', r.url(), '|', r.failure()?.errorText));
  page.on('response', r => {
    const url = r.url();
    if (/eso|homer|229447|threejs.*planets/.test(url)){
      console.log('OK:', url.slice(0, 80), '|', r.status());
    }
  });

  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await wait(10000);
  await browser.close();
})().catch(e => console.error(e.message));