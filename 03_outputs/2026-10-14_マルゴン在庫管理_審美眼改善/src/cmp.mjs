import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1560,height:900}});
await p.goto('file://'+process.argv[2]);await p.locator('#all').screenshot({path:process.argv[3]});await b.close();
