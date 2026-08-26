// 取 loader 3D canvas 像素检查是否真的有内容
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
  await wait(3500);  // splash dive + 进入 loader

  // 多次采样 loader canvas pixels
  const samples = [];
  for (let i = 0; i < 5; i++){
    await wait(2500);  // 每 2.5s 采样一次，覆盖 DNA→ROSE→BLOOM→PETAL_RAIN→ALL
    const sample = await page.evaluate(() => {
      const tdc = document.getElementById('loader3d');
      if (!tdc) return null;
      // 把 webgl canvas 转成 dataURL 取像素
      try {
        const gl = tdc.getContext('webgl2') || tdc.getContext('webgl');
        const px = new Uint8Array(4);
        // 中心点
        gl.readPixels(tdc.width/2|0, tdc.height/2|0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        const center = [px[0], px[1], px[2], px[3]];
        // 角点
        gl.readPixels(50, 50, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        const corner = [px[0], px[1], px[2], px[3]];
        // 100 个采样点像素 sum
        let sum = 0, lit = 0;
        for (let k = 0; k < 100; k++){
          const x = Math.floor(Math.random() * tdc.width);
          const y = Math.floor(Math.random() * tdc.height);
          gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
          const lum = px[0]+px[1]+px[2];
          sum += lum;
          if (lum > 20) lit++;
        }
        return { center, corner, avgLum: (sum/100).toFixed(1), lit100: lit, w: tdc.width, h: tdc.height };
      } catch (e){
        return { error: e.message };
      }
    });
    samples.push({ t: (i+1)*2.5, sample });
    await page.screenshot({ path: `_loader_sample_${i+1}.png` });
  }

  console.log(JSON.stringify(samples, null, 2));
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });