// 分析 wish 截图：文字是否围成心形（亮像素的外轮廓接近心形分布）
const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new'
  });
  const page = await browser.newPage();
  await page.goto('about:blank');

  const dataUrl = 'data:image/png;base64,' + fs.readFileSync('_wish_heart_1.png').toString('base64');
  const analysis = await page.evaluate(async (url) => {
    const img = new Image();
    await new Promise(r => { img.onload = r; img.src = url; });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const W = img.width, H = img.height;
    const data = ctx.getImageData(0, 0, W, H).data;

    // 网格亮度统计（30x17 格）
    const GX = 30, GY = 17;
    const grid = [];
    for (let gy = 0; gy < GY; gy++){
      const row = [];
      for (let gx = 0; gx < GX; gx++){
        let sum = 0, n = 0;
        for (let y = Math.floor(gy*H/GY); y < Math.floor((gy+1)*H/GY); y += 4){
          for (let x = Math.floor(gx*W/GX); x < Math.floor((gx+1)*W/GX); x += 4){
            const i = (y*W + x)*4;
            sum += data[i] + data[i+1] + data[i+2];
            n++;
          }
        }
        row.push(Math.round(sum/Math.max(1,n)));
      }
      grid.push(row);
    }
    // ASCII 可视化：. 暗 → # 亮
    const maxV = Math.max(...grid.flat());
    const ascii = grid.map(row => row.map(v => {
      const t = v / Math.max(1, maxV);
      return t > 0.5 ? '#' : t > 0.25 ? '+' : t > 0.1 ? '.' : ' ';
    }).join('')).join('\n');
    return { ascii, maxV };
  }, dataUrl);

  console.log('亮度分布（# 最亮）：');
  console.log(analysis.ascii);
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });