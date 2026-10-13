/* FAX入出庫 読み取りデモ（仮データ・同じブラウザの中だけに保存）
   読み取り結果は、用意した架空のサンプルFAX（samples-data.js）だけが返す。実際のOCRは行わない。 */
(() => {
'use strict';

const KEY = 'faxdemo.v1';
const $ = (id) => document.getElementById(id);
const SCREENS = ['pick', 'reading', 'review', 'saved', 'stock'];
const SAMPLE_LABELS = {
  'FAX_入庫_手書き_山川物産': ['入庫', '山川物産（手書き）'],
  'FAX_出庫_手書き_青空食品': ['出庫', '青空食品（手書き・訂正線あり）'],
  'FAX_入庫_印字_北原商事': ['入庫', '北原商事（印字されたFAX）'],
  'FAX_出庫_書式違い_みどり製菓': ['出庫', 'みどり製菓（書式がちがう手書き）']
};

/* ---------- 保存（localStorage。使えないときはこのページの間だけ） ---------- */
let memory = { batches: [] };
let storageOk = true;
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : null;
    if (v && Array.isArray(v.batches)) return v;
  } catch (e) { storageOk = false; }
  return memory;
}
function store(v) {
  memory = v;
  try { localStorage.setItem(KEY, JSON.stringify(v)); }
  catch (e) { storageOk = false; }
}

/* ---------- 小さな道具 ---------- */
function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (v === true) n.setAttribute(k, '');
    else if (v !== false && v != null) n.setAttribute(k, v);
  }
  kids.forEach((c) => n.append(c));
  return n;
}
function setLive(msg) { const l = $('live'); l.textContent = ''; setTimeout(() => { l.textContent = msg; }, 50); }
const norm = (s) => String(s == null ? '' : s).normalize('NFKC').trim();
function pad(n) { return String(n).padStart(2, '0'); }
function normDate(s) {
  const t = norm(s).replace(/[年月\-.]/g, '/').replace(/日/g, '');
  const m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(t);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return `${y}/${pad(mo)}/${pad(d)}`;
}
const jpDate = (s) => { const [, m, d] = s.split('/'); return `${+m}月${+d}日`; };

function ask({ title, body, ok, cancel, focusCancel }) {
  const dlg = $('dlg');
  $('dlg-title').textContent = title;
  $('dlg-body').textContent = body;
  $('dlg-ok').textContent = ok;
  $('dlg-cancel').textContent = cancel;
  return new Promise((resolve) => {
    dlg.addEventListener('close', () => resolve(dlg.returnValue === 'ok'), { once: true });
    dlg.returnValue = 'cancel';
    dlg.showModal();
    (focusCancel ? $('dlg-cancel') : $('dlg-ok')).focus();
  });
}

/* ---------- 画面の切り替え ---------- */
let screen = 'pick';
function show(name, opts = {}) {
  screen = name;
  SCREENS.forEach((s) => { $('screen-' + s).hidden = s !== name; });
  const stock = name === 'stock';
  const a = $('nav-stock'), b = $('nav-import');
  stock ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
  stock ? b.removeAttribute('aria-current') : b.setAttribute('aria-current', 'page');
  const h1 = document.querySelector('#screen-' + name + ' h1');
  window.scrollTo(0, 0);
  if (!opts.keepFocus && h1) h1.focus({ preventScroll: true });
}
async function leaveGuard(actionText) {
  if (screen !== 'review') return true;
  return ask({
    title: 'まだ保存していません',
    body: `${actionText}と、いま直している内容は消えます。よろしいですか？`,
    ok: actionText, cancel: 'もどって続ける', focusCancel: true
  });
}
async function go(target) {
  if (target === 'stock') {
    if (!(await leaveGuard('在庫を見る'))) return;
    renderStock(); show('stock');
  } else {
    if (!(await leaveGuard('取り込み画面にもどる'))) return;
    toPick();
  }
}
function toPick(opts = {}) {
  $('pick-error').hidden = true;
  const note = $('pick-note');
  note.hidden = !opts.note; note.textContent = opts.note || '';
  $('file').value = '';
  show('pick');
  if (opts.note) setLive(opts.note);
}

/* ---------- 1. FAXを選ぶ ---------- */
function showPickError(title, body) {
  $('pick-note').hidden = true;
  $('pick-error-title').textContent = title;
  $('pick-error-body').textContent = body;
  $('pick-error').hidden = false;
  show('pick');
}
const baseName = (n) => n.replace(/\.pdf$/i, '');
let cur = null;

async function handleFile(file) {
  const name = file.name;
  if (!/\.pdf$/i.test(name) && file.type !== 'application/pdf') {
    showPickError('うまく読み込めませんでした', `選ばれたファイル「${name}」はPDFではありません。FAXをPDFにしたファイルを選んでください。`);
    return;
  }
  const key = baseName(name);
  if (window.SAMPLES && window.SAMPLES[key]) return startReading(name, window.SAMPLES[key], null);
  $('reading-file').textContent = `${name}　少しお待ちください。`;
  $('pick-error').hidden = true; show('reading'); setLive('読み取っています');
  try {
    const buf = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
    const page = await pdf.getPage(1);
    const vp = page.getViewport({ scale: 1.4 });
    const canvas = document.createElement('canvas');
    canvas.width = vp.width; canvas.height = vp.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    const notes = ['このデモでは、用意したサンプルFAX以外は自動で読み取れません。FAXを見ながら、手で入力してみてください。'];
    if (pdf.numPages > 1) notes.push(`このPDFは${pdf.numPages}ページあります。デモでは1ページ目だけ表示します。`);
    openReview({
      fileName: name, img: canvas.toDataURL('image/png'), date: '', kind: '', shipper: '',
      rows: [{ name: '', qty: '', flag: null, why: '' }], note: notes.join(' ')
    });
  } catch (e) {
    showPickError('うまく読み込めませんでした', `「${name}」を開けませんでした。壊れているか、パスワードが付いているかもしれません。別のPDFを選んでください。`);
  }
}
function startReading(fileName, sample) {
  $('reading-file').textContent = `${fileName}　少しお待ちください。`;
  $('pick-error').hidden = true; show('reading'); setLive('読み取っています');
  setTimeout(() => {
    const d = sample.data;
    openReview({
      fileName, img: sample.img,
      date: normDate(d.date.replace(/-/g, '/')) || '', kind: d.kind, shipper: d.shipper,
      rows: d.rows.map((r) => ({ name: r.name, qty: String(r.qty), flag: r.flag || null, why: r.why || '' })), note: ''
    });
  }, 1100);
}

/* ---------- 2. 確かめて直す ---------- */
function openReview(c) {
  cur = c;
  $('fax-img').src = c.img;
  $('fax-cap').textContent = `届いたFAX（${c.fileName}）`;
  $('f-date').value = c.date; $('f-shipper').value = c.shipper;
  $('k-in').checked = c.kind === '入庫'; $('k-out').checked = c.kind === '出庫';
  const n = $('review-note'); n.hidden = !c.note; n.textContent = c.note;
  clearFormErrors();
  renderRows();
  show('review');
  setLive(`読み取りました。${c.rows.length}件。${flagCount() ? '確認が必要な所が' + flagCount() + 'つあります。' : ''}`);
}
const flagCount = () => cur.rows.filter((r) => r.flag).length;
function updateAttn() {
  const n = flagCount();
  $('attn').hidden = n === 0;
  $('attn-text').textContent = `確認が必要な所が${n}つあります。`;
}
function renderRows() {
  const tb = $('rows'); tb.replaceChildren();
  cur.rows.forEach((r, i) => {
    const nameIn = el('input', { type: 'text', 'aria-label': `${i + 1}行目の商品名`, autocomplete: 'off' });
    nameIn.value = r.name;
    const qtyIn = el('input', { type: 'text', inputmode: 'numeric', 'aria-label': `${i + 1}行目の数量`, autocomplete: 'off' });
    qtyIn.value = r.qty;
    const del = el('button', { type: 'button', 'aria-label': `${i + 1}行目を消す`, text: '消す' });
    const tdName = el('td', { class: r.flag === 'name' ? 'flag' : '' }, nameIn);
    const tdQty = el('td', { class: 'num' + (r.flag === 'qty' ? ' flag' : '') }, qtyIn);
    const tr = el('tr', r.flag ? { class: 'hasflag' } : {}, tdName, tdQty, el('td', { class: 'rowdel' }, del));
    tb.append(tr);
    let whyTr = null;
    if (r.flag) {
      const ok = el('button', { type: 'button', text: '合っています' });
      whyTr = el('tr', { class: 'whyrow' }, el('td', { colspan: '3' },
        el('p', { class: 'why' }, el('b', { text: '要確認' }), el('span', { text: r.why }), ok)));
      tb.append(whyTr);
      const clear = () => {
        if (!r.flag) return;
        r.flag = null; tdName.classList.remove('flag'); tdQty.classList.remove('flag');
        tr.classList.remove('hasflag'); whyTr.remove(); updateAttn(); setLive('確認済みにしました');
      };
      const focusTo = r.flag === 'name' ? nameIn : qtyIn;
      ok.addEventListener('click', () => { clear(); focusTo.focus(); });
      (r.flag === 'name' ? nameIn : qtyIn).addEventListener('input', clear);
    }
    nameIn.addEventListener('input', () => { r.name = nameIn.value; nameIn.removeAttribute('aria-invalid'); });
    qtyIn.addEventListener('input', () => { r.qty = qtyIn.value; qtyIn.removeAttribute('aria-invalid'); });
    del.addEventListener('click', () => {
      cur.rows.splice(i, 1);
      if (!cur.rows.length) cur.rows.push({ name: '', qty: '', flag: null, why: '' });
      renderRows(); setLive(`${i + 1}行目を消しました`);
      const focusTarget = $('rows').querySelector('input'); if (focusTarget) focusTarget.focus();
    });
  });
  updateAttn();
}
$('btn-add').addEventListener('click', () => {
  cur.rows.push({ name: '', qty: '', flag: null, why: '' });
  renderRows();
  const ins = $('rows').querySelectorAll('input'); ins[ins.length - 2].focus();
});

function clearFormErrors() {
  const e = $('form-error'); e.hidden = true; e.textContent = '';
  document.querySelectorAll('#review-form [aria-invalid]').forEach((n) => { n.removeAttribute('aria-invalid'); n.removeAttribute('aria-describedby'); });
}
function readForm() {
  clearFormErrors();
  const errors = []; // {msg, node}
  const date = normDate($('f-date').value);
  if (!date) errors.push({ msg: '日付は「2026/10/09」のように入れてください。', node: $('f-date') });
  const kindEl = document.querySelector('input[name="kind"]:checked');
  if (!kindEl) errors.push({ msg: '区分（入庫か出庫か）を選んでください。', node: $('k-in') });
  const shipper = norm($('f-shipper').value);
  if (!shipper) errors.push({ msg: '荷主名を入れてください。', node: $('f-shipper') });
  const trs = [...$('rows').querySelectorAll('tr:not(.whyrow)')];
  const rows = [];
  cur.rows.forEach((r, i) => {
    const nameIn = trs[i].querySelectorAll('input')[0], qtyIn = trs[i].querySelectorAll('input')[1];
    const name = norm(r.name), qraw = norm(r.qty);
    if (!name && !qraw) return;              // 空の行は無視
    if (!name) errors.push({ msg: `${i + 1}行目の商品名を入れてください。`, node: nameIn });
    if (!/^\d+$/.test(qraw) || +qraw < 1) errors.push({ msg: `${i + 1}行目の数量は、1以上の数字で入れてください。`, node: qtyIn });
    else rows.push({ name, qty: +qraw });
  });
  if (!rows.length && !errors.length) errors.push({ msg: '商品を1行以上入れてください。', node: $('rows').querySelector('input') });
  if (errors.length) {
    errors.forEach((e) => { e.node.setAttribute('aria-invalid', 'true'); e.node.setAttribute('aria-describedby', 'form-error'); });
    const box = $('form-error');
    box.textContent = errors.length === 1 ? errors[0].msg : `${errors[0].msg}（ほかに直す所が${errors.length - 1}つあります）`;
    box.hidden = false;
    errors[0].node.focus();
    return null;
  }
  return { date, kind: kindEl.value, shipper, rows };
}

$('review-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const v = readForm();
  if (!v) return;
  const left = flagCount();
  if (left) {
    const okay = await ask({
      title: `要確認の所が${left}つ残っています`, body: 'FAXと見比べましたか？ このまま保存することもできます。',
      ok: 'このまま保存', cancel: 'もどって確認', focusCancel: true
    });
    if (!okay) return;
  }
  const db = load();
  if (db.batches.some((b) => b.fileName === cur.fileName)) {
    const okay = await ask({
      title: 'このFAXはすでに保存されています', body: 'もう一度保存すると、在庫が二重に増えたり減ったりします。それでも保存しますか？',
      ok: 'もう一度保存する', cancel: '保存しない', focusCancel: true
    });
    if (!okay) return;
  }
  const batch = { id: Date.now(), fileName: cur.fileName, ...v, savedAt: new Date().toISOString() };
  db.batches.push(batch); store(db);
  renderSaved(batch); show('saved'); setLive(`保存しました。${batch.rows.length}件。`);
});
$('btn-back').addEventListener('click', () => go('pick'));

/* ---------- 3. 保存してExcelへ ---------- */
let lastBatchId = null;
function renderSaved(batch) {
  lastBatchId = batch.id;
  $('saved-lead').textContent = `${batch.shipper}の${batch.kind} ${batch.rows.length}件を保存しました。`;
  $('btn-undo').textContent = `いま保存した${batch.rows.length}件を取り消す`;
  const all = flatRows(load());
  $('saved-cap').textContent = `Excelに入る内容（このとおりに出力されます）　保存したぶん全部で${all.length}件`;
  const tb = $('saved-rows'); tb.replaceChildren();
  all.forEach((r) => tb.append(el('tr', {},
    el('td', { text: r.date }),
    el('td', { class: r.kind === '入庫' ? 'in-t' : 'out-t', text: r.kind }),
    el('td', { text: r.shipper }), el('td', { text: r.name }),
    el('td', { class: 'num', text: String(r.qty) }))));
}
$('btn-next').addEventListener('click', () => toPick());
$('btn-undo').addEventListener('click', () => {
  const db = load();
  const b = db.batches.find((x) => x.id === lastBatchId);
  if (!b) return toPick();
  db.batches = db.batches.filter((x) => x.id !== lastBatchId); store(db);
  toPick({ note: `取り消しました。「${b.shipper}の${b.kind} ${b.rows.length}件」は保存されていません。` });
});

function flatRows(db) {
  const out = [];
  db.batches.forEach((b) => b.rows.forEach((r) => out.push({ date: b.date, kind: b.kind, shipper: b.shipper, name: r.name, qty: r.qty })));
  return out;
}

/* ---------- 在庫 ---------- */
function stockOf(db) {
  const m = new Map();
  flatRows(db).forEach((r) => {
    if (!m.has(r.name)) m.set(r.name, { name: r.name, in: 0, out: 0 });
    m.get(r.name)[r.kind === '入庫' ? 'in' : 'out'] += r.qty;
  });
  return [...m.values()].map((s) => ({ ...s, stock: s.in - s.out }));
}
function renderStock() {
  const db = load();
  const empty = db.batches.length === 0;
  $('stock-empty').hidden = !empty; $('stock-body').hidden = empty;
  if (empty) {
    $('stock-lead').textContent = '保存したFAXの合計から、商品ごとの在庫を出します。';
    $('stock-attn').hidden = true; return;
  }
  const dates = db.batches.map((b) => b.date).sort();
  const span = dates[0] === dates[dates.length - 1] ? `${jpDate(dates[0])}分` : `${jpDate(dates[0])}〜${jpDate(dates[dates.length - 1])}分`;
  $('stock-lead').textContent = `保存したFAX ${db.batches.length}枚（${span}）の合計です。在庫は「入庫の合計 − 出庫の合計」です。`;
  const list = stockOf(db);
  const neg = list.filter((s) => s.stock < 0).length;
  $('stock-attn').hidden = neg === 0;
  $('stock-attn-text').textContent = `在庫がマイナスの商品が${neg}つあります。入庫のFAXがまだ保存されていないかもしれません。`;
  const tb = $('stock-rows'); tb.replaceChildren();
  list.forEach((s) => tb.append(el('tr', s.stock < 0 ? { class: 'neg' } : {},
    el('td', { text: s.name }), el('td', { class: 'num', text: String(s.in) }), el('td', { class: 'num', text: String(s.out) }),
    el('td', { class: 'num', text: s.stock < 0 ? `−${-s.stock}　マイナス` : String(s.stock) }))));
}
$('btn-stock-start').addEventListener('click', () => toPick());
$('btn-reset').addEventListener('click', async () => {
  const n = load().batches.length;
  const okay = await ask({
    title: 'デモの記録をすべて消しますか？', body: `保存した${n}枚分の記録が、このブラウザから消えます。元には戻せません。`,
    ok: 'すべて消す', cancel: 'やめる', focusCancel: true
  });
  if (!okay) return;
  store({ batches: [] }); renderStock(); setLive('記録をすべて消しました'); $('screen-stock').querySelector('h1').focus();
});

/* ---------- Excel ---------- */
function exportXlsx(first) {
  const db = load();
  const rows = flatRows(db);
  const moves = [['日付', '区分', '荷主名', '商品名', '数量']];
  rows.forEach((r) => { const [y, m, d] = r.date.split('/').map(Number); moves.push([new Date(Date.UTC(y, m - 1, d)), r.kind, r.shipper, r.name, r.qty]); });
  const ws1 = XLSX.utils.aoa_to_sheet(moves, { cellDates: true });
  ws1['!cols'] = [{ wch: 12 }, { wch: 6 }, { wch: 16 }, { wch: 18 }, { wch: 8 }];
  for (let i = 1; i < moves.length; i++) { const c = ws1['A' + (i + 1)]; if (c) c.z = 'yyyy/mm/dd'; }
  const st = [['商品名', '入庫の合計', '出庫の合計', '在庫']];
  stockOf(db).forEach((s) => st.push([s.name, s.in, s.out, s.stock]));
  const ws2 = XLSX.utils.aoa_to_sheet(st);
  ws2['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 8 }];
  const wb = XLSX.utils.book_new();
  const order = first === 'stock' ? [['在庫', ws2], ['入出庫', ws1]] : [['入出庫', ws1], ['在庫', ws2]];
  order.forEach(([n, w]) => XLSX.utils.book_append_sheet(wb, w, n));
  const t = new Date();
  XLSX.writeFile(wb, `入出庫_在庫_${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}.xlsx`, { cellDates: true });
  setLive('Excelファイルをダウンロードしました');
}
$('btn-xlsx').addEventListener('click', () => exportXlsx('moves'));
$('btn-stock-xlsx').addEventListener('click', () => exportXlsx('stock'));

/* ---------- ファイル選択・ドラッグ ---------- */
$('btn-pick').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) handleFile(f); });
const drop = $('drop');
['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', (e) => { const f = e.dataTransfer.files[0]; if (f) handleFile(f); });
['dragover', 'drop'].forEach((t) => window.addEventListener(t, (e) => e.preventDefault()));

const ul = $('sample-list');
Object.keys(window.SAMPLES || {}).forEach((key) => {
  const [kind, label] = SAMPLE_LABELS[key] || [window.SAMPLES[key].data.kind, key];
  const b = el('button', { class: 'link', type: 'button', text: label });
  b.addEventListener('click', () => startReading(key + '.pdf', window.SAMPLES[key]));
  ul.append(el('li', {}, el('span', { class: 'k ' + (kind === '入庫' ? 'in' : 'out'), text: kind }), b));
});

/* ---------- メニュー ---------- */
$('nav-import').addEventListener('click', (e) => { e.preventDefault(); go('pick'); });
$('nav-stock').addEventListener('click', (e) => { e.preventDefault(); go('stock'); });

if (location.hash === '#stock') { renderStock(); show('stock', { keepFocus: true }); } else { show('pick', { keepFocus: true }); }
})();
