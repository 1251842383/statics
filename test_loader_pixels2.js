// 分析 loader 截图像素：3D 层是否真的在渲染（非纯黑）
const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new'
  });
  const page = await browser.newPage();
  await page.goto('about:blank');

  for (const f of ['_loader_fix_dna.png', '_loader_fix_stage2.png', '_loader_fix_dragged.png', '_loader_fix_mobile.png', '_loader_fix_mobile_drag.png']) {
    const dataUrl = 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
    const r = await page.evaluate(async (url) => {
      const img = new Image();
      await new Promise(r => { img.onload = r; img.src = url; });
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const W = img.width, H = img.height;
      const data = ctx.getImageData(0, 0, W, H).data;
      const GX = 24, GY = 13;
      const grid = [];
      for (let gy = 0; gy < GY; gy++) {
        const row = [];
        for (let gx = 0; gx < GX; gx++) {
          let sum = 0, n = 0;
          for (let y = Math.floor(gy*H/GY); y < Math.floor((gy+1)*H/GY); y += 4) {
            for (let x = Math.floor(gx*W/GX); x < Math.floor((gx+1)*W/GX); x += 4) {
              const i = (y*W + x)*4;
              sum += data[i] + data[i+1] + data[i+2];
              n++;
            }
          }
          row.push(Math.round(sum/Math.max(1,n)));
        }
        grid.push(row);
      }
      const maxV = Math.max(...grid.flat());
      const ascii = grid.map(row => row.map(v => {
        const t = v / Math.max(1, maxV);
        return t > 0.5 ? '#' : t > 0.25 ? '+' : t > 0.1 ? '.' : ' ';
      }).join('')).join('\n');
      return { ascii, maxV };
    }, dataUrl);
    console.log('=== ' + f + ' (max=' + r.maxV + ') ===');
    console.log(r.ascii);
  }
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
