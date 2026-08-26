// 测试 Wikimedia + NASA 卫星/月亮贴图 CORS 可达性
const puppeteer = require('puppeteer-core');
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new'
  });
  const page = await browser.newPage();

  const probe = await page.evaluate(async () => {
    const urls = [
      // Wikimedia (CORS 通常开)
      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/International_Space_Station_after_undocking_of_STS-132.jpg/640px-International_Space_Station_after_undocking_of_STS-132.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/0/04/International_Space_Station_after_undocking_of_STS-132.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Hubble_01.jpg/640px-Hubble_01.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Hubble_01.jpg/640px-Hubble_01.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Sputnik_asm.jpg/640px-Sputnik_asm.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Tiangong_1_drawing.jpg/640px-Tiangong_1_drawing.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Tiangong_space_station_line_drawing.png/640px-Tiangong_space_station_line_drawing.png',
      // 已确认可达（地球/月亮）
      'https://threejs.org/examples/textures/planets/moon_1024.jpg'
    ];
    const out = [];
    for (const u of urls){
      try {
        const r = await fetch(u, { mode: 'cors' });
        out.push({ url: u.split('/').slice(-2).join('/'), ok: r.ok, status: r.status, ct: r.headers.get('content-type') });
      } catch (e){
        out.push({ url: u.split('/').slice(-2).join('/'), ok: false, err: e.message });
      }
    }
    return out;
  });
  console.log(JSON.stringify(probe, null, 2));
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });