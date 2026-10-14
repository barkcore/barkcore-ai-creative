// 使い方: node shoot.js <html> <出力フォルダ>
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const [html, out] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 2200, height: 900 }, deviceScaleFactor: 2 });
  await p.goto('file://' + path.resolve(html));
  for (let i = 1; i <= 5; i++) {
    await p.locator('#s' + i).screenshot({ path: `${out}/s${i}.png` });
  }
  await p.locator('.row').screenshot({ path: `${out}/all.png` });
  await b.close();
})();
