import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const url='file://'+process.argv[2],out=process.argv[3];
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let n=0,f=0;const ok=(c,m)=>{c?n++:f++;console.log((c?'OK  ':'NG  ')+m)};
for(const w of [390,360]){
 const ctx=await b.newContext({viewport:{width:w,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 const ovf=()=>p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 await p.goto(url);await p.fill('#q','1024');
 ok(await ovf()<=0,w+': 検索 横はみ出しなし');
 // 瓶番号が割れていない（1行）
 const h=await p.evaluate(()=>[...document.querySelectorAll('td.bot')].map(e=>e.getBoundingClientRect().height));
 const lines=await p.evaluate(()=>[...document.querySelectorAll('td.bot')].map(e=>{const r=document.createRange();r.selectNodeContents(e.lastChild);return r.getClientRects().length}));ok(lines.every(x=>x===1),w+': 瓶番号が1行（文字が割れない）'+lines);
 const nav=await p.evaluate(()=>[...document.querySelectorAll('nav a')].map(e=>Math.round(e.getBoundingClientRect().height)));
 const navl=await p.evaluate(()=>[...document.querySelectorAll('nav a')].map(e=>{const r=document.createRange();r.selectNodeContents(e);const ys=new Set([...r.getClientRects()].map(x=>Math.round(x.top)));return ys.size}));ok(navl.every(x=>x===1),w+': メニューが折り返さない '+navl);
 const btnH=await p.evaluate(()=>[...document.querySelectorAll('#results .btn')].map(e=>Math.round(e.getBoundingClientRect().height)));
 ok(btnH.every(x=>x>=44),w+': ボタン高さ44以上 '+btnH);
 if(w===390)await p.screenshot({path:out+'/m1_search.png'});
 // タップで引当
 await p.tap('button[aria-label="A-1024 瓶 C-07を出荷に入れる"]');
 await p.fill('#qtyIn','25');
 ok((await p.locator('#qtyErr').innerText()).includes('最大 20 本'),w+': 超過エラー');
 if(w===390)await p.screenshot({path:out+'/m2_over.png'});
 await p.fill('#qtyIn','15');await p.tap('#qtyGo');
 ok((await p.locator('#results').innerText()).includes('出荷予定に入れました'),w+': タップで引当できる');
 await p.tap('nav >> text=出荷の準備');
 ok(await ovf()<=0,w+': 準備 横はみ出しなし');const dw=await p.evaluate(()=>[...document.querySelectorAll('table.pl td[data-label="採取日"]')].map(e=>{const r=document.createRange();r.selectNodeContents(e.lastChild);return r.getClientRects().length}));ok(dw.every(x=>x===1),w+': 採取日が途中で改行されない '+dw);
 if(w===390)await p.screenshot({path:out+'/m3_prep.png',fullPage:true});
 await p.tap('text=出庫の確定へ');await p.waitForSelector('h1:has-text("出庫を確定")');
 ok((await p.locator('h1').innerText()).includes('出庫を確定'),w+': 確定画面へ');
 ok(await ovf()<=0,w+': 確定 横はみ出しなし');
 if(w===390)await p.screenshot({path:out+'/m4_confirm.png',fullPage:true});
 await p.tap('#cfGo');
 ok((await p.locator('h1').innerText()).includes('確定しました'),w+': 確定できる');
 await p.goto(url+'#stock-in');ok(await ovf()<=0,w+': 入庫 横はみ出しなし');
 if(w===390)await p.screenshot({path:out+'/m5_stockin.png',fullPage:true});
 ok(errs.length===0,w+': JSエラーなし');
 await ctx.close();
}
console.log('PASS',n,'FAIL',f);await b.close();
