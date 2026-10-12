# イラスト生成（顔なしの人物・画面・スマホ）。パレットは深いティール×生成り×真鍮
PAPER='#f5f2ec';SAND='#e6dfd0';TEAL='#0f3f45';TEAL2='#1d5a61';TEAL3='#8fb8bb';BRASS='#b9a272';BRASSD='#8a7440';INK='#16201f';WHITE='#ffffff'

DEFS='''<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<symbol id="pb" viewBox="0 0 100 230"><path d="M30 28c0-16 8-24 20-24s20 8 20 24v6H30z" style="fill:var(--hr,#1b1b1b)"/><ellipse cx="50" cy="34" rx="15" ry="17" style="fill:var(--sk,#e9c7a8)"/><path d="M33 32c-1-16 9-27 22-25 10 2 15 12 13 25-4-9-11-13-19-13s-13 4-16 13z" style="fill:var(--hr,#1b1b1b)"/><rect x="44" y="49" width="12" height="12" style="fill:var(--sk,#e9c7a8)"/><path d="M22 70c0-9 8-13 18-13h20c10 0 18 4 18 13v62H22z" style="fill:var(--sh,#1d5a61)"/><rect x="28" y="130" width="19" height="84" rx="4" style="fill:var(--pn,#16201f)"/><rect x="53" y="130" width="19" height="84" rx="4" style="fill:var(--pn,#16201f)"/><ellipse cx="36" cy="217" rx="14" ry="6" fill="#16201f"/><ellipse cx="64" cy="217" rx="14" ry="6" fill="#16201f"/></symbol>
<symbol id="pl" viewBox="0 0 100 230"><path d="M26 30c0-18 9-27 24-27s24 9 24 27v44H26z" style="fill:var(--hr,#1b1b1b)"/><ellipse cx="50" cy="34" rx="15" ry="17" style="fill:var(--sk,#e9c7a8)"/><path d="M34 30c0-14 8-22 16-22s17 8 17 22c-5-6-11-9-17-9s-12 3-16 9z" style="fill:var(--hr,#1b1b1b)"/><rect x="44" y="49" width="12" height="12" style="fill:var(--sk,#e9c7a8)"/><path d="M22 70c0-9 8-13 18-13h20c10 0 18 4 18 13v62H22z" style="fill:var(--sh,#1d5a61)"/><rect x="28" y="130" width="19" height="84" rx="4" style="fill:var(--pn,#16201f)"/><rect x="53" y="130" width="19" height="84" rx="4" style="fill:var(--pn,#16201f)"/><ellipse cx="36" cy="217" rx="14" ry="6" fill="#16201f"/><ellipse cx="64" cy="217" rx="14" ry="6" fill="#16201f"/></symbol>
</defs></svg>'''

ARMS={
 'down':'<path d="M22 72L12 124l10 4 12-54z M78 72l10 52-10 4-12-54z" style="fill:var(--sh)"/><circle cx="17" cy="129" r="6" style="fill:var(--sk)"/><circle cx="83" cy="129" r="6" style="fill:var(--sk)"/>',
 'pointR':'<path d="M22 72L12 124l10 4 12-54z" style="fill:var(--sh)"/><circle cx="17" cy="129" r="6" style="fill:var(--sk)"/><path d="M78 72L114 90l-4 11-38-18z" style="fill:var(--sh)"/><circle cx="114" cy="95" r="6" style="fill:var(--sk)"/>',
 'pointL':'<path d="M78 72l10 52-10 4-12-54z" style="fill:var(--sh)"/><circle cx="83" cy="129" r="6" style="fill:var(--sk)"/><path d="M22 72L-14 90l4 11 38-18z" style="fill:var(--sh)"/><circle cx="-14" cy="95" r="6" style="fill:var(--sk)"/>',
 'note':'<path d="M22 72l-4 36 32 10 4-10-24-10 4-24z M78 72l4 36-32 10-4-10 24-10-4-24z" style="fill:var(--sh)"/><rect x="40" y="96" width="28" height="36" rx="3" transform="rotate(-8 54 114)" fill="'+BRASS+'"/><circle cx="49" cy="116" r="6" style="fill:var(--sk)"/><circle cx="62" cy="114" r="6" style="fill:var(--sk)"/>',
 'phone':'<path d="M22 72L12 124l10 4 12-54z" style="fill:var(--sh)"/><circle cx="17" cy="129" r="6" style="fill:var(--sk)"/><path d="M78 72L98 96l-6 8-26-22z" style="fill:var(--sh)"/><rect x="92" y="68" width="20" height="34" rx="5" fill="'+TEAL+'"/><rect x="95" y="72" width="14" height="24" rx="2" fill="'+TEAL3+'"/><circle cx="96" cy="102" r="6" style="fill:var(--sk)"/>',
}
def person(x,y,s,arms='down',sh=TEAL2,pn=INK,long=False,hr='#1b1b1b',flip=False):
    sym='pl' if long else 'pb'
    t=f'translate({x},{y}) scale({-s if flip else s},{s})'
    return f'<g transform="{t}" style="--sh:{sh};--pn:{pn};--hr:{hr};--sk:#e9c7a8"><use href="#{sym}" width="100" height="230"/>{ARMS[arms]}</g>'

def bubble(x,y,w,h,tail='bl',inner='dots',fill=WHITE,stroke=BRASS):
    tx={'bl':f'M{x+24} {y+h-1}l-10 18 24-18z','br':f'M{x+w-24} {y+h-1}l10 18-24-18z'}[tail]
    box=f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{h/2.6:.0f}" fill="{fill}" stroke="{stroke}" stroke-width="1.5"/><path d="{tx}" fill="{fill}" stroke="{stroke}" stroke-width="1.5"/><rect x="{x+3}" y="{y+h-4}" width="40" height="6" fill="{fill}" transform="translate({0 if tail=="bl" else w-46},0)"/>'
    cx=x+w/2;cy=y+h/2
    if inner=='dots':
        i=''.join(f'<circle cx="{cx+d}" cy="{cy}" r="5" fill="{BRASSD}"/>' for d in (-18,0,18))
    elif inner=='q':
        i=f'<text x="{cx}" y="{cy+11}" text-anchor="middle" font-size="30" font-family="Georgia,serif" fill="{BRASSD}">?</text>'
    elif inner=='lines':
        i=f'<rect x="{x+16}" y="{cy-12}" width="{w-32}" height="5" rx="2.5" fill="{TEAL3}"/><rect x="{x+16}" y="{cy+2}" width="{(w-32)*.6:.0f}" height="5" rx="2.5" fill="{TEAL3}"/>'
    elif inner=='check':
        i=f'<path d="M{cx-12} {cy} l8 9 18-20" stroke="{TEAL2}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
    elif inner=='bulb':
        i=f'<circle cx="{cx}" cy="{cy-4}" r="12" fill="{BRASS}"/><rect x="{cx-6}" y="{cy+8}" width="12" height="8" rx="2" fill="{BRASSD}"/>'
    return box+i

def dash(x,y,w,h,bars=(40,65,50,85,60,95)):
    n=len(bars);bw=(w-48-(n-1)*8)/n
    b=''.join(f'<rect x="{x+24+k*(bw+8):.1f}" y="{y+h-80-bars[k]*0.5:.1f}" width="{bw:.1f}" height="{bars[k]*0.5:.1f}" rx="3" fill="{TEAL2 if k%2 else TEAL3}"/>' for k in range(n))
    rows=''.join(f'<rect x="{x+24}" y="{y+h-62+r*14}" width="{(w-48)*(0.9-r*0.2):.0f}" height="6" rx="3" fill="{SAND}"/>' for r in range(3))
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="16" fill="{WHITE}" stroke="{SAND}"/>'
      f'<rect x="{x}" y="{y}" width="{w}" height="26" rx="16" fill="{TEAL}"/><rect x="{x}" y="{y+14}" width="{w}" height="12" fill="{TEAL}"/>'
      f'<circle cx="{x+16}" cy="{y+13}" r="3.5" fill="{BRASS}"/><circle cx="{x+30}" cy="{y+13}" r="3.5" fill="{TEAL3}"/><circle cx="{x+44}" cy="{y+13}" r="3.5" fill="{TEAL3}"/>'
      f'<rect x="{x+24}" y="{y+42}" width="{w*.3:.0f}" height="8" rx="4" fill="{TEAL}"/>'+b+rows)

def phone(x,y,w,h,rot=0):
    cx=x+w/2;cy=y+h/2
    items=''.join(f'<rect x="{x+16}" y="{y+52+k*(h*0.17):.0f}" width="{w-32}" height="{h*0.12:.0f}" rx="8" fill="{SAND}"/><circle cx="{x+30}" cy="{y+52+k*(h*0.17)+h*0.06:.0f}" r="{h*0.04:.0f}" fill="{[BRASS,TEAL3,TEAL2][k]}"/>' for k in range(3))
    return (f'<g transform="rotate({rot} {cx} {cy})"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{w*0.16:.0f}" fill="{TEAL}"/>'
      f'<rect x="{x+7}" y="{y+8}" width="{w-14}" height="{h-16}" rx="{w*0.12:.0f}" fill="{WHITE}"/><rect x="{x+16}" y="{y+20}" width="{w*0.4:.0f}" height="10" rx="5" fill="{TEAL}"/>'
      f'{items}<rect x="{x+16}" y="{y+h-46}" width="{w-32}" height="22" rx="11" fill="{TEAL2}"/></g>')

def browser(x,y,w,h):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="{WHITE}" stroke="{SAND}"/><rect x="{x}" y="{y}" width="{w}" height="26" rx="14" fill="{SAND}"/><rect x="{x}" y="{y+14}" width="{w}" height="12" fill="{SAND}"/>'
      f'<circle cx="{x+16}" cy="{y+13}" r="3.5" fill="{BRASS}"/><circle cx="{x+30}" cy="{y+13}" r="3.5" fill="{TEAL3}"/><rect x="{x+60}" y="{y+7}" width="{w-90}" height="12" rx="6" fill="{WHITE}"/>'
      f'<rect x="{x+16}" y="{y+38}" width="{w-32}" height="{h*0.36:.0f}" rx="8" fill="{TEAL2}"/><rect x="{x+34}" y="{y+56}" width="{w*0.4:.0f}" height="10" rx="5" fill="{PAPER}"/><rect x="{x+34}" y="{y+76}" width="{w*0.25:.0f}" height="8" rx="4" fill="{TEAL3}"/>'
      +''.join(f'<rect x="{x+16+k*((w-32)/3):.0f}" y="{y+h*0.5+16:.0f}" width="{(w-32)/3-10:.0f}" height="{h*0.3:.0f}" rx="8" fill="{SAND}"/>' for k in range(3)))

def sheet(x,y,w,h):
    g=''.join(f'<line x1="{x}" x2="{x+w}" y1="{y+30+k*((h-30)/6):.0f}" y2="{y+30+k*((h-30)/6):.0f}" stroke="{SAND}"/>' for k in range(1,6))
    v=''.join(f'<line y1="{y+30}" y2="{y+h}" x1="{x+k*(w/4):.0f}" x2="{x+k*(w/4):.0f}" stroke="{SAND}"/>' for k in range(1,4))
    fills=''.join(f'<rect x="{x+6+(k%4)*(w/4):.0f}" y="{y+36+(k//4)*((h-30)/6):.0f}" width="{w/4-12:.0f}" height="8" rx="4" fill="{[TEAL3,SAND,BRASS][k%3]}"/>' for k in (0,1,2,3,5,6,8,9,10))
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{WHITE}" stroke="{SAND}"/><rect x="{x}" y="{y}" width="{w}" height="30" rx="12" fill="{TEAL}"/><rect x="{x}" y="{y+16}" width="{w}" height="14" fill="{TEAL}"/>'+g+v+fills

def svg(vb,body,label,bg=PAPER,extra=''):
    w,h=vb
    return f'<svg viewBox="0 0 {w} {h}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="{label}"><rect width="{w}" height="{h}" fill="{bg}"/>{extra}{body}</svg>'

def deco(w,h):
    return f'<circle cx="{w*0.62:.0f}" cy="{h*0.72:.0f}" r="{min(w,h)*0.4:.0f}" fill="{SAND}"/><circle cx="{w*0.86:.0f}" cy="{h*0.16:.0f}" r="{min(w,h)*0.1:.0f}" fill="none" stroke="{BRASS}" stroke-width="1.5"/><circle cx="{w*0.1:.0f}" cy="{h*0.2:.0f}" r="{min(w,h)*0.03:.0f}" fill="{TEAL3}"/>'

FLOOR=lambda w,y:f'<rect x="0" y="{y}" width="{w}" height="{480-y}" fill="#ebe5d8"/>'

def hero():
    w=h=640
    b=deco(w,h)+f'<rect x="0" y="600" width="{w}" height="60" fill="#ebe5d8"/>'
    b+=dash(250,110,330,230)+phone(470,290,100,190,6)
    b+=f'<path d="M180 245C205 245 215 232 246 228" fill="none" stroke="{BRASS}" stroke-width="2" stroke-dasharray="6 6"/><path d="M240 222l10 5-9 8" fill="none" stroke="{BRASS}" stroke-width="2"/>'
    b+=bubble(40,190,140,90,'bl','dots')
    b+=person(70,335,1.3,'down',BRASS,INK,long=True)+person(200,335,1.3,'note',TEAL2,TEAL)
    return svg((w,h),b,'相談する人と、話を聞く人のイラスト。背景には業務システムの画面とスマホの画面。')

def about():
    w,h=600,630
    b=deco(w,h)+f'<rect x="0" y="560" width="{w}" height="70" fill="#ebe5d8"/>'
    b+=bubble(70,150,150,90,'bl','lines')+bubble(360,110,130,80,'br','check')
    b+=person(100,300,1.3,'pointR',BRASS,INK,long=True)+person(360,300,1.3,'note',TEAL2,TEAL,flip=False)
    return svg((w,h),b,'お客さんの話を、ノートを持って聞く人のイラスト。')

def card(kind):
    w,h=600,450
    b=deco(w,h)+f'<rect x="0" y="400" width="{w}" height="50" fill="#ebe5d8"/>'
    if kind=='sys':
        b+=dash(60,50,340,260)+person(440,150,1.1,'pointL',TEAL2,TEAL,long=True)
        lab='業務システムの画面を指しながら説明する人のイラスト。'
    elif kind=='app':
        b+=phone(110,40,170,330,-4)+person(400,150,1.1,'phone',BRASS,INK)
        lab='スマホの画面と、スマホを手にした人のイラスト。'
    elif kind=='web':
        b+=browser(60,60,390,260)+person(470,150,1.1,'pointL',TEAL,INK)
        lab='ホームページの画面を指しながら説明する人のイラスト。'
    return svg((w,h),b,lab)

def consult(kind):
    w,h=600,450
    b=deco(w,h)
    desk=f'<rect x="0" y="300" width="{w}" height="150" fill="{TEAL2}"/><rect x="0" y="300" width="{w}" height="8" fill="{TEAL}"/>'
    if kind==1:
        b+=sheet(300,50,270,210)+person(110,100,1.3,'down',BRASS,INK)+desk
        b+=bubble(60,22,110,64,'bl','dots')+f'<circle cx="480" cy="360" r="26" fill="{PAPER}"/><path d="M480 344v16l11 6" stroke="{TEAL}" stroke-width="3" fill="none" stroke-linecap="round"/>'
        lab='毎月の集計に時間がかかって、考え込んでいる人のイラスト。'
    elif kind==2:
        b+=person(230,100,1.3,'down',TEAL2,TEAL,long=True)+desk
        stack=''.join(f'<rect x="{40+k*6}" y="{262-k*14}" width="120" height="84" rx="3" fill="{PAPER if k%2 else WHITE}" stroke="{SAND}" transform="rotate({(-3+k*2)} 100 300)"/><rect x="{56+k*6}" y="{274-k*14}" width="60" height="5" rx="2" fill="{TEAL3}"/>' for k in range(3))
        b+=stack+f'<path d="M170 255C200 215 250 215 300 240" fill="none" stroke="{BRASS}" stroke-width="2.5" stroke-dasharray="6 6"/><path d="M292 232l12 8-14 5" fill="none" stroke="{BRASS}" stroke-width="2.5"/>'
        b+=f'<rect x="380" y="150" width="170" height="130" rx="10" fill="{WHITE}" stroke="{SAND}"/><rect x="380" y="150" width="170" height="22" rx="10" fill="{TEAL}"/><rect x="396" y="188" width="138" height="10" rx="5" fill="{SAND}"/><rect x="396" y="208" width="138" height="10" rx="5" fill="{SAND}"/><rect x="396" y="228" width="80" height="10" rx="5" fill="{BRASS}"/><rect x="440" y="280" width="30" height="20" fill="{TEAL}"/>'
        lab='紙の帳票を見ながら、画面に入力している人のイラスト。'
    else:
        b+=person(110,120,1.15,'down',TEAL,INK,long=True)+bubble(70,24,120,80,'bl','bulb')
        b+=phone(370,60,130,250,5)
        b+=f'<rect x="270" y="140" width="64" height="64" fill="{BRASS}" transform="rotate(-6 302 172)"/><rect x="282" y="156" width="38" height="5" rx="2" fill="{PAPER}" transform="rotate(-6 302 172)"/><rect x="282" y="168" width="28" height="5" rx="2" fill="{PAPER}" transform="rotate(-6 302 172)"/>'
        b+=f'<rect x="0" y="400" width="{w}" height="50" fill="#ebe5d8"/>'
        lab='「こんなアプリがあったら」と思いついた人と、スマホ画面のスケッチのイラスト。'
    return svg((w,h),b,lab)
