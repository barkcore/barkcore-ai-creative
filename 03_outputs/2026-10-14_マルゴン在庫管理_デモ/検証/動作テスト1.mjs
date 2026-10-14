import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const url='file://'+process.argv[2]; const out=process.argv[3];
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:1440,height:900}});
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push('pageerror '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console '+m.text())});
let pass=0,fail=0;
const ok=(c,m)=>{if(c){pass++;console.log('OK  '+m)}else{fail++;console.log('NG  '+m)}};
const txt=async s=>(await p.locator(s).first().innerText().catch(()=>'<none>'));
await p.goto(url);
ok(await p.evaluate(()=>document.activeElement.id)==='q','開いた時点で検索欄にフォーカス');
await p.screenshot({path:out+'/01_start.png'});
await p.fill('#q','1024');
let t=await txt('#results');
ok(t.includes('A-1024')&&t.includes('B-03')&&t.includes('C-07'),'1024で瓶B-03・C-07が出る');
ok(t.includes('引当可能')&&/20/.test(t),'引当可能が出る');
// 引当可能: B-03 は 30-10=20
const rows=await p.locator('#results tbody tr').allInnerTexts();
ok(rows[0].replace(/\s+/g,' ').includes('B-03')&&/30\s+10\s+20/.test(rows[0].replace(/\s+/g,' ')),'B-03 在庫30 引当10 引当可能20 : '+rows[0].replace(/\s+/g,' '));
await p.screenshot({path:out+'/02_search.png'});
// 全角・ハイフンなし
await p.fill('#q','Ａ１０２４');ok((await txt('#results')).includes('B-03'),'全角でも検索できる');
await p.fill('#q','サンプル牛D');ok((await txt('#results')).includes('A-2210'),'名前でも検索できる');
await p.fill('#q','zzz');ok((await txt('#results')).includes('見つかりません'),'結果なしの表示');
await p.screenshot({path:out+'/03_noresult.png'});
await p.click('text=入力を消す');ok((await p.inputValue('#q'))==='','入力を消す');
await p.fill('#q','1024');
// 超過（C-07 引当可能20）
await p.click('button[aria-label="A-1024 瓶 C-07を出荷に入れる"]');
await p.fill('#qtyIn','25');
ok((await txt('#qtyErr')).includes('最大 20 本'),'超過エラー表示');
ok(await p.locator('#qtyGo').isDisabled(),'超過では保存ボタン無効');
await p.screenshot({path:out+'/04_over.png'});
await p.fill('#qtyIn','0');ok((await txt('#qtyErr')).includes('1以上'),'0はエラー');
await p.fill('#qtyIn','abc');ok((await txt('#qtyErr')).includes('1以上'),'文字はエラー');
await p.click('#results >> text=やめる');
// 重複: B-03 は既にS1に入っている
await p.click('button[aria-label="A-1024 瓶 B-03を出荷に入れる"]');
ok((await txt('#results')).includes('すでにこの出荷に入っています'),'同じ在庫の重複エラー');
await p.screenshot({path:out+'/05_dup.png'});
await p.click('#results >> text=閉じる');
// C-07 を追加
await p.click('button[aria-label="A-1024 瓶 C-07を出荷に入れる"]');
await p.fill('#qtyIn','15');await p.keyboard.press('Enter');
t=await txt('#results');ok(t.includes('出荷予定に入れました')&&t.includes('15本'),'追加後メッセージ（Enterで保存）');
let side=await txt('#sideBox');ok(side.includes('45本'),'引当合計 10+20+15=45 : '+side.replace(/\s+/g,' '));
const r2=(await p.locator('#results tbody tr').allInnerTexts()).map(x=>x.replace(/\s+/g,' '));
ok(/20\s+15\s+5/.test(r2[1]),'C-07 在庫20 引当15 引当可能5 : '+r2[1]);
await p.screenshot({path:out+'/06_added.png'});
// 5を超える
await p.click('button[aria-label="A-1024 瓶 C-07を出荷に入れる"]').catch(()=>{});
// 準備へ
await p.click('nav >> text=出荷の準備');
await p.waitForSelector('h1:has-text("出荷の準備")');
t=await txt('main');ok(t.includes('B-03')&&t.includes('C-07')&&t.includes('E-11'),'準備に3行');
ok(t.includes('合計 45本'),'合計45本');
await p.screenshot({path:out+'/07_prep.png'});
// 変更: C-07 15 -> 21 (最大20)
await p.click('button[aria-label="A-1024 瓶 C-07の本数や瓶を変更"]');
await p.fill('#edQty','21');await p.click('#edGo');
ok((await txt('#edErr')).includes('最大 20 本'),'変更の超過エラー');
await p.screenshot({path:out+'/08_edit_err.png'});
await p.fill('#edQty','18');await p.click('#edGo');
t=await txt('main');ok(t.includes('変更しました')&&t.includes('合計 48本'),'変更が反映 合計48');
// 他の瓶へ変更（B-03は別の行にあるので重複エラーになるはず）
await p.click('button[aria-label="A-1024 瓶 C-07の本数や瓶を変更"]');
await p.selectOption('#edBottle','K1');
await p.click('#edGo');
ok((await txt('#edErr')).includes('すでにこの出荷に入っています'),'瓶変更の重複チェック: '+(await txt('#edErr')));
await p.click('main >> button:has-text("やめる")');
// 取消
await p.click('button[aria-label="A-2210 瓶 E-11を取消"]');
await p.screenshot({path:out+'/09_cancel_ask.png'});
ok(await p.locator('#ask').evaluate(d=>d.open),'取消は確認ダイアログが出る');
await p.screenshot({path:out+'/09b_ask_dialog.png'});
await p.click('#askNo');ok((await txt('main')).includes('合計 48本'),'やめるなら取り消されない');
await p.click('button[aria-label="A-2210 瓶 E-11を取消"]');await p.click('#askYes');
t=await txt('main');ok(t.includes('取り消しました')&&t.includes('合計 28本'),'行の取消で引当が外れる 合計28');
await p.goto(url+'#search');await p.fill('#q','2210');
const e11=(await p.locator('#results tbody tr').first().innerText()).replace(/\s+/g,' ');
ok(/44\s+0\s+44/.test(e11),'E-11の引当が0に戻る: '+e11);
// 出荷先を消して確定へ → エラー
await p.goto(url+'#prep');
await p.fill('#shDest','');await p.click('text=出庫の確定へ');
ok((await txt('#shErr')).includes('出荷先を入れてください'),'出荷先なしで確定へ進めない');
await p.screenshot({path:out+'/10_dest_err.png'});
await p.fill('#shDest','サンプル商事（仮）');
// ピッキング表の印刷
await p.evaluate(()=>{window.print=()=>{window.__printed=true}});
await p.click('text=ピッキング表を印刷');
ok(await p.evaluate(()=>window.__printed===true),'印刷ボタンで印刷が呼ばれる');
await p.emulateMedia({media:'print'});
await p.screenshot({path:out+'/11_print_pick.png',fullPage:false});
await p.pdf({path:out+'/pick.pdf',format:'A4'});
await p.emulateMedia({media:'screen'});
// 確定画面
await p.click('text=出庫の確定へ');
await p.waitForSelector('h1:has-text("この内容で出庫を確定")');
t=await txt('main');ok(/30\s*→\s*12/.test(t.replace(/\n/g,' '))||t.includes('→'),'確定前に「在庫→確定後」表示');
await p.screenshot({path:out+'/12_confirm.png'});
const before=await p.evaluate(()=>JSON.parse(localStorage.getItem('margon-inventory-demo-v1')).stock.map(s=>s.qty));
await p.click('#cfGo');
await p.waitForSelector('h1:has-text("出庫を確定しました")');
const after=await p.evaluate(()=>JSON.parse(localStorage.getItem('margon-inventory-demo-v1')).stock.map(s=>s.qty));
ok(before[0]===30&&after[0]===20&&before[1]===20&&after[1]===2,'確定で在庫が減る B-03 30→20, C-07 20→2 : '+before+' → '+after);
await p.screenshot({path:out+'/13_done.png'});
// 引当が消えているか
await p.goto(url+'#search');await p.fill('#q','1024');
const r3=(await p.locator('#results tbody tr').allInnerTexts()).map(x=>x.replace(/\s+/g,' '));
ok(/20\s+0\s+20/.test(r3[0])&&/2\s+0\s+2/.test(r3[1]),'確定後 引当0 : '+r3.join(' | '));
// 通知印刷
await p.goto(url+'#prep');await p.evaluate(()=>{window.print=()=>{window.__printed=true}});
await p.click('text=出荷連絡を印刷');await p.emulateMedia({media:'print'});
await p.screenshot({path:out+'/14_print_notice.png'});
await p.pdf({path:out+'/notice.pdf',format:'A4'});await p.emulateMedia({media:'screen'});
// 入庫
await p.goto(url+'#stock-in');
await p.click('button:has-text("入庫する")');
ok((await txt('#inNoErr')).includes('入れてください'),'入庫 必須エラー');
await p.screenshot({path:out+'/15_stockin_err.png'});
await p.fill('#inNo','a-1024');ok((await p.inputValue('#inName'))==='サンプル牛A','既存の製品番号で名前が入る');
await p.fill('#inDate','2025-03-12');await p.fill('#inBottle','b-03');await p.fill('#inQty','5');
await p.click('button:has-text("入庫する")');
t=await txt('main');ok(t.includes('入庫しました')&&t.includes('既存の在庫に足しました')&&t.includes('合計 25本'),'同じ製品・採取日・瓶は足し算: '+t.split('\n')[1]);
await p.screenshot({path:out+'/16_stockin_ok.png'});
// 新しい製品
await p.fill('#inNo','a-9999');await p.fill('#inName','テスト牛');await p.fill('#inDate','2026-09-30');await p.fill('#inBottle','z-01');await p.fill('#inQty','7');
await p.click('button:has-text("入庫する")');
await p.goto(url+'#search');await p.fill('#q','9999');
ok((await txt('#results')).includes('Z-01')&&(await txt('#results')).includes('テスト牛'),'新しい製品を入庫して検索で出る');
// 訂正
await p.fill('#q','1024');
await p.click('button[aria-label="A-1024 瓶 B-03の在庫を訂正"]');
ok(await p.locator('#fix').evaluate(d=>d.open),'訂正ダイアログが開く');
await p.fill('#fixQty','24');await p.click('#fixGo');
ok((await txt('#fixWhyErr')).includes('理由'),'理由なしでは訂正できない');
await p.screenshot({path:out+'/17_fix_err.png'});
await p.fill('#fixWhy','数え直したら1本少なかった');await p.click('#fixGo');
t=await txt('#results');ok(t.includes('訂正しました')&&/24/.test(t),'訂正できる');
await p.goto(url+'#stock-in');ok((await txt('main')).includes('理由：数え直したら'),'履歴に訂正の理由が残る');
await p.screenshot({path:out+'/18_history.png',fullPage:true});
// 引当より少なくできない: 新規引当
await p.goto(url+'#search');await p.fill('#q','3305');
await p.click('button[aria-label="A-3305 瓶 B-04を出荷に入れる"]');await p.fill('#qtyIn','10');await p.click('#qtyGo');
await p.click('button[aria-label="A-3305 瓶 B-04の在庫を訂正"]');
await p.fill('#fixQty','5');await p.fill('#fixWhy','テスト');await p.click('#fixGo');
ok((await txt('#fixQtyErr')).includes('10本より少なくはできません'),'引当より少ない訂正は不可');
await p.click('#fixCancel');
// 再読み込みで保持
await p.reload();await p.fill('#q','3305');
ok((await txt('#results')).includes('10'),'再読み込み後もデータが残る');
// 二重確定防止: 確定したshipを再度確認URL
const sid=await p.evaluate(()=>JSON.parse(localStorage.getItem('margon-inventory-demo-v1')).ships.find(x=>x.status==='done').id);
await p.goto(url+'#confirm/'+sid);
ok((await txt('h1')).includes('確定しました'),'確定済みは再確定できず完了表示になる');
// 空の出荷
await p.goto(url+'#prep');
// 仮データに戻す
await p.click('#resetBtn');await p.click('#askYes');
await p.fill('#q','1024');
const r4=(await p.locator('#results tbody tr').first().innerText()).replace(/\s+/g,' ');
ok(/30\s+10\s+20/.test(r4),'仮データに戻す: '+r4);
// キーボード: Tab順
await p.goto(url+'#search');await p.fill('#q','1024');
await p.keyboard.press('Tab');
const f1=await p.evaluate(()=>document.activeElement.getAttribute('aria-label')||document.activeElement.textContent);
ok(!!f1,'Tabで操作部品に移れる: '+f1);
// 1024幅
await p.setViewportSize({width:1024,height:800});
await p.goto(url+'#search');await p.fill('#q','1024');
const ov=await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
ok(!ov,'1024幅で横はみ出しなし');
await p.screenshot({path:out+'/19_w1024.png'});
await p.goto(url+'#prep');
ok(!(await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)),'1024幅 準備画面も横はみ出しなし');
await p.setViewportSize({width:1280,height:800});
await p.goto(url+'#prep');
ok(!(await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)),'1280幅 横はみ出しなし');
console.log('errors:',errs.length?errs:'なし');
console.log('PASS',pass,'FAIL',fail);
await b.close();
