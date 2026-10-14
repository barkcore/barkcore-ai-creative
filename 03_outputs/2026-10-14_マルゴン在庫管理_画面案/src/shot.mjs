import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'}).catch(async()=>chromium.launch());
const p = await b.newPage({viewport:{width:1440,height:900}});
await p.goto('file://'+process.argv[2]);
const names=['1_通常_検索結果','2_最初_検索前','3_エラー_本数が多い','4_出荷の準備','5_出庫の確定'];
for(let i=1;i<=5;i++){await p.locator('#s'+i).screenshot({path:process.argv[3]+'/'+names[i-1]+'.png'});}
await b.close();
