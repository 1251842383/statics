// 检查 threejs.org 行星贴图 CDN 是否在本地浏览器能访问
const puppeteer = require('puppeteer-core');
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--enable-webgl', '--window-size=1600,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });

  const requests = [];
  page.on('response', r => {
    const url = r.url();
    if (url.includes('texture') || url.includes('planet') || url.includes('moon') || url.includes('earth')){
      requests.push({ url, status: r.status() });
    }
  });

  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await wait(3000);

  // 也直接 fetch 测试 CDN 可达性
  const direct = await page.evaluate(async () => {
    const urls = [
      'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
      'https://threejs.org/examples/textures/planets/moon_1024.jpg',
      'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg',
      'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/moon_1024.jpg',
      // NASA
      'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_2048.jpg',
      'https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200407.3x5400x2700.jpg'
    ];
    const out = [];
    for (const u of urls){
      try {
        const r = await fetch(u, { mode: 'cors' });
        out.push({ url: u, ok: r.ok, status: r.status, type: r.headers.get('content-type') });
      } catch (e){
        out.push({ url: u, ok: false, err: e.message });
      }
    }
    return out;
  });

  console.log('=== direct CDN probe ===');
  console.log(JSON.stringify(direct, null, 2));

  console.log('\n=== page requests ===');
  console.log(JSON.stringify(requests, null, 2));

  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });