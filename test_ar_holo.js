// 验证 AR 全息卡：转动视角（拖拽 world.rotation.y）时卡面颜色应变化（彩虹镀层 + 高光带）
const puppeteer = require('puppeteer-core');
const fs = require('fs');
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
  page.on('pageerror', e => errors.push(e.message));

  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await wait(2400);
  await page.click('#openBtn');
  await page.waitForSelector('#loaderEnterBtn', { timeout: 60000 });
  await page.click('#loaderEnterBtn');
  await page.waitForFunction(() => !document.getElementById('loader'), { timeout: 20000 });
  await wait(1000);

  await page.click('#openChapterBtn');
  await page.waitForSelector('.vdot');
  const dots = await page.$$('.vdot');
  await dots[10].evaluate(d => d.click());  // ch15 AR
  await wait(3500);  // 等卡片物化

  const analyze = async (f) => {
    const dataUrl = 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
    return page.evaluate(async (url) => {
      const img = new Image();
      await new Promise(r => { img.onload = r; img.src = url; });
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const W = img.width, H = img.height;
      const data = ctx.getImageData(0, 0, W, H).data;
      // 中心区域色相分布：全息彩虹会让色相方差变大
      let hx = 0, hy = 0, n = 0;
      const px = [];
      for (let y = H*0.3|0; y < H*0.7; y += 6){
        for (let x = W*0.3|0; x < W*0.7; x += 6){
          const i = (y*W + x)*4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const ang = Math.atan2(Math.sqrt(3)*(g-b), 2*r-g-b);  // hue
          hx += Math.cos(ang); hy += Math.sin(ang);
          if (n % 7 === 0) px.push([r|0, g|0, b|0]);
          n++;
        }
      }
      const meanAng = Math.atan2(hy, hx);
      const dispersion = 1 - Math.hypot(hx, hy) / n;  // 0=同色，1=色相散布
      return { meanHue: +(meanAng * 180 / Math.PI).toFixed(0), dispersion: +dispersion.toFixed(3), n, samples: px.slice(0, 5) };
    }, dataUrl);
  };

  // 正对视角
  await page.screenshot({ path: '_holo_front.png' });
  const front = await analyze('_holo_front.png');
  console.log('front:', JSON.stringify(front));

  // 拖拽转 45°（视角侧看卡片）
  await page.mouse.move(800, 450);
  await page.mouse.down();
  await page.mouse.move(500, 450, { steps: 10 });
  await page.mouse.up();
  await wait(1200);
  await page.screenshot({ path: '_holo_side.png' });
  const side = await analyze('_holo_side.png');
  console.log('side (45°):', JSON.stringify(side));

  // 再转一些
  await page.mouse.move(800, 450);
  await page.mouse.down();
  await page.mouse.move(420, 460, { steps: 10 });
  await page.mouse.up();
  await wait(1200);
  await page.screenshot({ path: '_holo_side2.png' });
  const side2 = await analyze('_holo_side2.png');
  console.log('side (more):', JSON.stringify(side2));

  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
