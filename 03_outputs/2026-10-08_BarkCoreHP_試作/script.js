const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
const f=document.getElementById('f');
if(f)f.addEventListener('submit',e=>{e.preventDefault();const m=document.getElementById('msg');m.style.display='block';m.textContent='これは試作ページです。送信先が未設定のため、入力内容はどこにも送られていません。'});
