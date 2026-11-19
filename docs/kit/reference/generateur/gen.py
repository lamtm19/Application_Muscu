import math, json
R=math.radians
def dv(a): return (math.cos(R(a)), math.sin(R(a)))
def add(p,v,s=1.0): return (p[0]+v[0]*s, p[1]+v[1]*s)
def sub(a,b): return (a[0]-b[0], a[1]-b[1])
def ang(v): return math.degrees(math.atan2(v[1],v[0]))
def ln(v): return math.hypot(*v)
def f(p): return f"{p[0]:.1f} {p[1]:.1f}"
def ease(x): return (1-math.cos(math.pi*x))/2

def closed(P):
    n=len(P); s="M"+f(P[0])
    for i in range(n):
        p0,p1,p2,p3=P[i-1],P[i],P[(i+1)%n],P[(i+2)%n]
        c1=(p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6)
        c2=(p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6)
        s+="C"+f(c1)+" "+f(c2)+" "+f(p2)
    return s+"Z"

def shape(p0,a,L,prof,flip):
    u=dv(a); n=(-u[1],u[0])
    if flip: n=(-n[0],-n[1])
    A=[];B=[]
    for t,wa,wb in prof:
        c=add(p0,u,t*L); A.append(add(c,n,wa)); B.append(add(c,n,-wb))
    return closed(A+B[::-1])

def ik(s,h,l1,l2,bend):
    d=sub(h,s); D=min(ln(d),l1+l2-0.01); base=ang(d)
    c=(l1*l1+D*D-l2*l2)/(2*l1*D); c=max(-1,min(1,c))
    a1=base+bend*math.degrees(math.acos(c))
    e=add(s,dv(a1),l1)
    return a1, ang(sub(h,e))

# ---------- profils (côté a = avant, côté b = arrière) ----------
SIDE={
 'torso':[(-0.04,3,3),(0,5.5,6.5),(0.14,5,7.6),(0.3,4.4,5.4),(0.5,5,5),(0.72,6.8,5.6),(0.88,6.6,5.6),(0.97,4.6,5),(1.04,2.4,3)],
 'neck':[(-0.1,2.6,2.8),(0.5,2.4,2.6),(1.1,2.6,2.8)],
 'head':[(0,2.6,3),(0.12,4.6,3.6),(0.3,5.6,5),(0.45,6.6,6),(0.55,6,6.3),(0.75,5.2,6),(0.92,3.4,4),(1.02,0.6,0.8)],
 'ua':[(-0.06,3,3.4),(0,4.6,5),(0.15,4.3,4.8),(0.35,3.6,3.9),(0.55,3.7,3.4),(0.75,3,2.9),(0.95,2.5,2.6),(1.06,1.9,1.9)],
 'fa':[(-0.05,2.2,2.2),(0.05,2.7,2.6),(0.25,3.3,2.9),(0.5,2.9,2.5),(0.8,2.2,2),(1,1.8,1.7),(1.05,1.5,1.5)],
 'hand':[(0,1.8,1.7),(0.5,2.3,2.1),(0.95,1.5,1.4),(1.08,0.4,0.4)],
 'th':[(-0.05,4,4.5),(0,6,6.5),(0.25,6.3,5.6),(0.5,5.6,5),(0.75,4.6,4.2),(0.95,3.6,3.5),(1.05,3,3)],
 'sh':[(-0.05,2.8,3),(0,3,3.6),(0.2,3,4.8),(0.4,2.7,4.2),(0.7,2.2,2.6),(0.95,1.8,1.9),(1.04,1.6,1.6)],
 'foot':[(-0.1,2.2,2.2),(0.2,2,2.3),(0.6,1.4,1.7),(0.95,0.9,1.1),(1.08,0.3,0.3)],
}
MUS={ # (segment, profil)
 'pec':('torso',[(0.66,6.4,-2.2),(0.76,6.9,-0.6),(0.88,6.7,-0.6),(0.97,4.8,-2.6)]),
 'abs':('torso',[(0.3,4.4,-1.4),(0.42,4.8,-1.2),(0.56,5.1,-1.2),(0.64,5.6,-2)]),
 'lats':('torso',[(0.42,-2.6,5.2),(0.58,-1.8,5.4),(0.75,-2.2,5.7),(0.9,-3.6,5.4)]),
 'glutes':('torso',[(-0.03,-1.5,3.4),(0.05,-1,6.6),(0.15,-1.6,7.5),(0.26,-3,6.2),(0.32,-4,4.8)]),
 'delt':('ua',[(-0.08,3,3.4),(0,4.8,5.2),(0.18,4.4,4.6),(0.38,1.8,0.6)]),
 'bi':('ua',[(0.18,3.4,-1),(0.35,3.8,-0.3),(0.55,3.9,0),(0.75,3.1,-0.3),(0.9,2.5,-1.2)]),
 'tri':('ua',[(0.15,-1,4.6),(0.35,-0.2,4.1),(0.55,0,3.6),(0.75,-0.3,3),(0.9,-1,2.6)]),
 'brachio':('fa',[(0,2.7,-0.6),(0.2,3.4,0),(0.45,3,0.3),(0.7,2.2,-0.5)]),
 'quad':('th',[(0.08,6,-1.4),(0.3,6.4,-0.8),(0.55,5.7,-0.6),(0.8,4.5,-0.6),(0.96,3.4,-1.4)]),
 'ham':('th',[(0.1,-1.4,6.4),(0.3,-0.8,5.6),(0.55,-0.6,5),(0.8,-0.8,4.1),(0.92,-1.4,3.4)]),
 'calf':('sh',[(0.04,-1.4,3.7),(0.2,-1,4.9),(0.4,-1,4.3),(0.6,-1.5,3),(0.7,-2,2.4)]),
}
HAIR=[(0.42,-4,6.2),(0.58,-2.6,6.6),(0.78,-1.2,6.2),(0.95,1.2,4.1),(1.03,0.5,0.9)]
SHORTS_T=[(-0.05,3.2,3.2),(0,5.7,6.7),(0.14,5.2,7.8),(0.26,4.6,6.4),(0.3,4.5,5.8)]
SHORTS_L=[(-0.05,4.2,4.7),(0,6.2,6.7),(0.25,6.5,5.8),(0.42,6,5.4)]

FRONT={
 'torso':[(-0.04,5.5,5.5),(0,7,7),(0.18,6.6,6.6),(0.4,5.8,5.8),(0.62,6.8,6.8),(0.82,8.6,8.6),(0.93,9.4,9.4),(1.0,6,6),(1.04,3,3)],
 'neck':[(-0.1,3,3),(0.5,2.8,2.8),(1.1,3,3)],
 'head':[(0,3,3),(0.15,4.4,4.4),(0.4,5.4,5.4),(0.65,5.6,5.6),(0.85,4.6,4.6),(1.02,0.8,0.8)],
 'ua':[(-0.06,3,3),(0,4.6,4.6),(0.2,4.3,4),(0.5,3.5,3.4),(0.8,2.9,2.9),(1.06,2.2,2.2)],
 'fa':[(-0.05,2.2,2.2),(0.1,2.8,2.8),(0.35,2.8,2.6),(0.75,2.1,2),(1.05,1.6,1.6)],
 'hand':[(0,1.7,1.7),(0.5,2.2,2.2),(1.08,0.5,0.5)],
 'th':[(-0.05,4,4),(0,5.6,5.4),(0.3,5.6,5),(0.6,4.6,4.4),(0.95,3.4,3.4),(1.05,3,3)],
 'sh':[(-0.05,2.8,2.8),(0.15,3.6,3.6),(0.45,3,3),(0.8,2.2,2.2),(1.04,1.8,1.8)],
 'foot':[(-0.2,2.4,2.4),(0.4,2.6,2.6),(1.1,2,2)],
}
FMUS={
 'pecL':('torso',[(0.7,0.4,-6.2),(0.8,0.4,-7.4),(0.88,0.6,-7.6)]),
 'abs':('torso',[(0.3,3,3),(0.45,3.2,3.2),(0.6,3.4,3.4),(0.66,3,3)]),
 'latL':('torso',[(0.45,5.6,-3.8),(0.62,6.6,-3.4),(0.8,8.2,-4),(0.9,8.8,-6)]),
 'delt':('ua',[(-0.08,3,3),(0,4.8,4.8),(0.2,4.4,4.1),(0.38,1.4,1.4)]),
 'bi':('ua',[(0.2,2.2,2),(0.45,2.6,2.4),(0.7,2.2,2),(0.85,1.4,1.3)]),
 'quad':('th',[(0.05,5,4.4),(0.3,5.4,4.8),(0.6,4.4,4),(0.9,3,2.8)]),
}

GRAD='''<defs><linearGradient id="pdcSk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7f8fa"/><stop offset="1" stop-color="#aeb3bb"/></linearGradient><linearGradient id="pdcSkF" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d7dade"/><stop offset="1" stop-color="#8f949c"/></linearGradient><linearGradient id="pdcFl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a2a2a" stop-opacity="0"/><stop offset="0.25" stop-color="#2a2a2a"/><stop offset="0.75" stop-color="#2a2a2a"/><stop offset="1" stop-color="#2a2a2a" stop-opacity="0"/></linearGradient><linearGradient id="pdcMu" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9a6c"/><stop offset="1" stop-color="#d8371a"/></linearGradient></defs>'''
SK='fill="url(#pdcSk)" stroke="#878c95" stroke-width="0.5"'
SKF='fill="url(#pdcSkF)" stroke="#757a83" stroke-width="0.5"'
MU='fill="url(#pdcMu)" stroke="#b02e14" stroke-width="0.45"'
CT='fill="none" stroke="#9298a1" stroke-width="0.5"'
SHORT='fill="#26282d" stroke="#1a1b1f" stroke-width="0.5"'
DUR="2.4s"
K=4

ANGK=('ua','fa','th','sh','ft','ta','na','ha')
def unwrap(F):
    for k in F[0]:
        if not k.endswith(ANGK) or not isinstance(F[0][k],(int,float)): continue
        for i in range(1,len(F)):
            v=F[i][k]; p=F[i-1][k]
            while v-p>180: v-=360
            while v-p<-180: v+=360
            F[i][k]=v
    return F
def frames(posefn):
    ss=[ease(k/K) for k in range(K+1)]
    seq=ss+ss[-2::-1]
    return unwrap([dict(posefn(s)) for s in seq])

def anim_rot(vals,c):
    if max(abs(v) for v in vals)<0.05: return ''
    return f'<animateTransform attributeName="transform" type="rotate" dur="{DUR}" repeatCount="indefinite" values="{";".join(f"{v:.1f} {c[0]:.1f} {c[1]:.1f}" for v in vals)}"/>'
def anim_tr(vals):
    if max(abs(v[0])+abs(v[1]) for v in vals)<0.05: return ''
    return f'<animateTransform attributeName="transform" type="translate" dur="{DUR}" repeatCount="indefinite" values="{";".join(f"{v[0]:.1f} {v[1]:.1f}" for v in vals)}"/>'
def g(inner,anim): return f'<g>{anim}{inner}</g>' if anim else inner

def muscles(names,targets,seg,p0,a,L,flip,table):
    out=''
    for m,(sg,prof) in table.items():
        if sg!=seg or m not in names: continue
        out+=f'<path d="{shape(p0,a,L,prof,flip)}" {MU if m in targets else CT}/>'
    return out

# ================= figure de profil =================
def side_figure(F, targets, equip_hand=None, equip_torso='', far_dx=(-1.2,-0.6), extra_static_back='', extra_front=''):
    P0=F[0]
    H=P0['H']; ta=P0['ta']; ut=dv(ta)
    S=add(H,ut,27.2); N=add(H,ut,28.6)
    na=P0.get('na',ta); HB=add(N,dv(na),4.6); ha=P0.get('ha',na)
    trv=[sub(p['H'],H) for p in F]
    dta=[p['ta']-ta for p in F]
    dna=[p.get('na',p['ta'])-na-(p['ta']-ta) for p in F]
    dha=[p.get('ha',p.get('na',p['ta']))-ha-(p.get('na',p['ta'])-na) for p in F]
    allm=set(MUS)
    def arm(side,style):
        ua=P0[side+'ua']; fa=P0[side+'fa']; E=add(S,dv(ua),15); W=add(E,dv(fa),13)
        dua=[p[side+'ua']-ua-(p['ta']-ta) for p in F]
        dfa=[p[side+'fa']-fa-(p[side+'ua']-ua) for p in F]
        fl=True
        up=f'<path d="{shape(S,ua,15,SIDE["ua"],fl)}" {style}/>'
        fo=f'<path d="{shape(E,fa,13,SIDE["fa"],fl)}" {style}/><path d="{shape(W,fa,5,SIDE["hand"],fl)}" {style}/>'
        if side=='n':
            up+=muscles(allm,targets,'ua',S,ua,15,fl,MUS)
            fo+=muscles(allm,targets,'fa',E,fa,13,fl,MUS)
        eq=equip_hand(add(W,dv(fa),2.4),fa,side) if equip_hand else ''
        inner=up+g(eq+fo,anim_rot(dfa,E)) if False else up+g(fo+eq,anim_rot(dfa,E))
        return g(inner,anim_rot(dua,S))
    def leg(side,style):
        th=P0[side+'th']; sh=P0[side+'sh']; ft=P0[side+'ft']
        K_=add(H,dv(th),17); A=add(K_,dv(sh),16)
        dth=[p[side+'th']-th for p in F]
        dsh=[p[side+'sh']-sh-(p[side+'th']-th) for p in F]
        dft=[p[side+'ft']-ft-(p[side+'sh']-sh) for p in F]
        fl=True
        t=f'<path d="{shape(H,th,17,SIDE["th"],fl)}" {style}/>'
        if side=='n': t+=muscles(allm,targets,'th',H,th,17,fl,MUS)
        t+=f'<path d="{shape(H,th,17,SHORTS_L,fl)}" {SHORT}/>'
        s=f'<path d="{shape(K_,sh,16,SIDE["sh"],fl)}" {style}/>'
        if side=='n': s+=muscles(allm,targets,'sh',K_,sh,16,fl,MUS)
        fo=f'<path d="{shape(A,ft,9,SIDE["foot"],False)}" {style}/>'
        return g(t+g(s+g(fo,anim_rot(dft,A)),anim_rot(dsh,K_)),anim_rot(dth,H))
    torso=f'<path d="{shape(H,ta,30,SIDE["torso"],False)}" {SK}/>'+muscles(allm,targets,'torso',H,ta,30,False,MUS)
    torso+=f'<path d="{shape(H,ta,30,SHORTS_T,False)}" {SHORT}/>'
    head=f'<path d="{shape(HB,ha,13,SIDE["head"],False)}" {SK}/><path d="{shape(HB,ha,13,HAIR,False)}" fill="#33363c"/>'
    headg=g(f'<path d="{shape(N,na,5.6,SIDE["neck"],False)}" {SK}/>'+g(head,anim_rot(dha,HB)),anim_rot(dna,N))
    rot=anim_rot(dta,H)
    far=f'<g transform="translate({far_dx[0]} {far_dx[1]})">'
    out=extra_static_back
    body=far+leg('f',SKF)+'</g>'
    body+=g(far+arm('f',SKF)+'</g>'+torso+equip_torso+headg,rot)
    body+=leg('n',SK)
    body+=g(arm('n',SK),rot)
    out+=g(body,anim_tr(trv))+extra_front
    return out

# ================= figure de face =================
def front_figure(F,targets,equip_hand=None,extra_back='',extra_front=''):
    P0=F[0]; H=P0['H']; ut=dv(-90)
    trv=[sub(p['H'],H) for p in F]
    N=add(H,ut,28.6); HB=add(N,ut,4.6)
    out=''
    for sd,sx in (('l',-1),('r',1)):
        Hj=(H[0]+sx*3.8,H[1]); th=P0.get(sd+'th',90); Kp=add(Hj,dv(th),17); A=add(Kp,dv(th),16)
        dth=[p.get(sd+'th',90)-th for p in F]
        lg=f'<path d="{shape(Hj,th,17,FRONT["th"],False)}" {SK}/>'+(f'<path d="{shape(Hj,th,17,FMUS["quad"][1],False)}" {MU if "quad" in targets else CT}/>')
        lg+=f'<path d="{shape(Kp,th,16,FRONT["sh"],False)}" {SK}/><path d="{shape(A,90,4,FRONT["foot"],False)}" {SK}/>'
        out+=g(lg,anim_rot(dth,Hj))
    out+=f'<path d="{shape((H[0]-4.2,H[1]),90,7.5,[(-0.3,4.6,4.8),(0,5.4,5.6),(1,5.8,5.6)],False)}" {SHORT}/><path d="{shape((H[0]+4.2,H[1]),90,7.5,[(-0.3,4.8,4.6),(0,5.6,5.4),(1,5.6,5.8)],False)}" {SHORT}/>'
    tor=f'<path d="{shape(H,-90,30,FRONT["torso"],False)}" {SK}/>'
    tor+=f'<path d="{shape(H,-90,30,[(-0.05,4,4),(0,7.2,7.2),(0.2,6.8,6.8),(0.26,6.6,6.6)],False)}" {SHORT}/>'
    for m in ('abs','latL'):
        st=MU if ('lats' in targets and m=='latL') or (m=='abs' and 'abs' in targets) else CT
        tor+=f'<path d="{shape(H,-90,30,FMUS[m][1],False)}" {st}/>'
        if m=='latL': tor+=f'<path d="{shape(H,-90,30,[(t,-b,-a) for t,a,b in FMUS[m][1]],False)}" {st}/>'
    tor+=f'<path d="{shape(H,-90,30,FMUS["pecL"][1],False)}" {CT}/><path d="{shape(H,-90,30,[(t,-b,-a) for t,a,b in FMUS["pecL"][1]],False)}" {CT}/>'
    tor+=f'<path d="{shape(N,-90,5.6,FRONT["neck"],False)}" {SK}/><path d="{shape(HB,-90,13,FRONT["head"],False)}" {SK}/><path d="{shape(HB,-90,13,[(0.45,-4.2,5.6),(0.62,-4.4,5.8),(0.85,-3.6,4.8),(1.03,-0.6,0.9)],False)}" fill="#33363c"/><path d="{shape(HB,-90,13,[(0.45,5.6,-4.2),(0.62,5.8,-4.4),(0.85,4.8,-3.6),(1.03,0.9,-0.6)],False)}" fill="#33363c"/>'
    arms=''
    for sd,sx in (('l',-1),('r',1)):
        S=add(H,ut,26.4); S=(S[0]+sx*8.2,S[1])
        ua=P0[sd+'ua']; fa=P0[sd+'fa']; E=add(S,dv(ua),15); W=add(E,dv(fa),13)
        dua=[p[sd+'ua']-ua for p in F]; dfa=[p[sd+'fa']-fa-(p[sd+'ua']-ua) for p in F]
        up=f'<path d="{shape(S,ua,15,FRONT["ua"],False)}" {SK}/>'
        up+=f'<path d="{shape(S,ua,15,FMUS["delt"][1],False)}" {MU if "delt" in targets else CT}/><path d="{shape(S,ua,15,FMUS["bi"][1],False)}" {MU if "bi" in targets else CT}/>'
        fo=f'<path d="{shape(E,fa,13,FRONT["fa"],False)}" {SK}/><path d="{shape(W,fa,5,FRONT["hand"],False)}" {SK}/>'
        eq=equip_hand(add(W,dv(fa),2.4),fa,sd) if equip_hand else ''
        arms+=g(up+g(fo+eq,anim_rot(dfa,E)),anim_rot(dua,S))
    return extra_back+g(out+tor+arms,anim_tr(trv))+extra_front

# ================= équipements =================
def disc(r,col='#2c2f35'):
    def fn(c,a,side):
        return f'<circle cx="{c[0]:.1f}" cy="{c[1]:.1f}" r="{r}" fill="{col}" stroke="#55595f" stroke-width="0.6"/><circle cx="{c[0]:.1f}" cy="{c[1]:.1f}" r="{r*0.55:.1f}" fill="none" stroke="#45494f" stroke-width="0.5"/><circle cx="{c[0]:.1f}" cy="{c[1]:.1f}" r="1.3" fill="#9aa0a8"/>'
    return fn
def dbprofile(c,a,side):
    n=dv(a+90); p0=add(c,n,-7.5)
    prof=[(0,2.2,2.2),(0.06,3.6,3.6),(0.2,3.6,3.6),(0.22,1,1),(0.78,1,1),(0.8,3.6,3.6),(0.94,3.6,3.6),(1,2.2,2.2)]
    u=dv(a+90); nn=(-u[1],u[0]); A=[];B=[]
    for t,wa,wb in prof:
        q=add(p0,u,t*15); A.append(add(q,nn,wa)); B.append(add(q,nn,-wb))
    pts=A+B[::-1]
    return f'<path d="M{" L".join(f(p) for p in pts)}Z" fill="#2c2f35" stroke="#55595f" stroke-width="0.6"/>'

def svg(label,body):
    return f'<svg viewBox="0 0 120 90" width="{{{{w}}}}" height="{{{{h}}}}" role="img" aria-label="{label}">{GRAD}{body}</svg>'

FLOOR='<rect x="4" y="86" width="112" height="1.4" rx="0.7" fill="url(#pdcFl)"/>'
STAND=dict(nth=90,nsh=90,nft=0,fth=90,fsh=90,fft=0)
def P(**k):
    d=dict(STAND); d.update(k); return d

OUT={}
# ---- curl biceps ----
def curl(s): return P(H=(58,52),ta=-90,nua=93-4*s,nfa=86-160*s,fua=93-4*s,ffa=86-160*s)
OUT['curl']=svg('Curl biceps, haltère prise en supination',FLOOR+side_figure(frames(curl),{'bi'},disc(4.6)))
# ---- curl marteau ----
def ham(s): return P(H=(58,52),ta=-90,nua=93-4*s,nfa=86-150*s,fua=93-4*s,ffa=86-150*s)
OUT['hammer']=svg('Curl marteau, haltère prise neutre',FLOOR+side_figure(frames(ham),{'brachio','bi'},dbprofile))
# ---- lunge ----
def lunge(s):
    H=(56,52+13*s)
    a1,a2=ik(H,(72,82),17,16,-1); b1,b2=ik(H,(37,80),17,16,1)
    return dict(H=H,ta=-90,nua=92,nfa=90,fua=92,ffa=90,nth=a1,nsh=a2,nft=0,fth=b1,fsh=b2,fft=60+60*s)
OUT['lunge']=svg('Fentes',FLOOR+side_figure(frames(lunge),{'quad','glutes'},dbprofile))
# ---- squat ----
def squat(s):
    th=90-68*s; sh=90+28*s; A=(60,84)
    H=sub(sub(A,(16*dv(sh)[0],16*dv(sh)[1])),(17*dv(th)[0],17*dv(th)[1]))
    ta=-90+40*s; S=add(H,dv(ta),27.2); bar=add(add(S,dv(ta+90),-6.5),dv(ta),-2.5)
    a1,a2=ik(S,add(bar,dv(ta+90),4),15,13,-1)
    return dict(H=H,ta=ta,nua=a1,nfa=a2,fua=a1,ffa=a2,nth=th,nsh=sh,nft=0,fth=th,fsh=sh,fft=0)
F=frames(squat); p=F[0]; S0=add(p['H'],dv(p['ta']),27.2); bar=add(add(S0,dv(p['ta']+90),-6.5),dv(p['ta']),-2.5)
OUT['squat']=svg('Squat',FLOOR+side_figure(F,{'quad','glutes'},None,equip_torso=disc(8)(bar,0,'n')))
# ---- développé couché ----
BENCH='<rect x="20" y="76" width="64" height="5" rx="2" fill="#3a3a3a"/><rect x="28" y="81" width="4" height="5" fill="#3a3a3a"/><rect x="74" y="81" width="4" height="5" fill="#3a3a3a"/>'
def press(s):
    H=(68,70); ta=180; S=add(H,dv(ta),27.2)
    hand=add(S,(2.5,-26+19*s)); a1,a2=ik(S,add(hand,dv(90),0),15,13.5,1)
    l1,l2=ik(H,(90,82),17,16,-1)
    return dict(H=H,ta=ta,na=180,ha=180,nua=a1,nfa=a2,fua=a1,ffa=a2,nth=l1,nsh=l2,nft=0,fth=l1,fsh=l2,fft=0)
OUT['press']=svg('Développé couché',FLOOR+side_figure(frames(press),{'pec','tri','delt'},disc(8.5),far_dx=(0,0),extra_static_back=BENCH))
# ---- développé incliné haltères ----
IBENCH='<path d="M24 82 L70 60 L74 64 L30 86 Z" fill="#3a3a3a"/><rect x="66" y="66" width="22" height="5" rx="2" fill="#3a3a3a"/><rect x="80" y="71" width="4" height="15" fill="#3a3a3a"/>'
def incl(s):
    H=(70,64); ta=-150; S=add(H,dv(ta),27.2)
    hand=add(S,(4,-25+17*s)); a1,a2=ik(S,hand,15,13.5,1)
    l1,l2=ik(H,(92,82),17,16,-1)
    return dict(H=H,ta=ta,na=-150,ha=-150,nua=a1,nfa=a2,fua=a1,ffa=a2,nth=l1,nsh=l2,nft=0,fth=l1,fsh=l2,fft=0)
OUT['incline']=svg('Développé incliné haltères',FLOOR+side_figure(frames(incl),{'pec','delt'},disc(5),far_dx=(0,0),extra_static_back=IBENCH))
# ---- barre au front ----
def skull(s):
    H=(68,70); ta=180; S=add(H,dv(ta),27.2)
    l1,l2=ik(H,(90,82),17,16,-1)
    return dict(H=H,ta=ta,na=180,ha=180,nua=-100,nfa=-100-88*s,fua=-100,ffa=-100-88*s,nth=l1,nsh=l2,nft=0,fth=l1,fsh=l2,fft=0)
OUT['skull']=svg('Barre au front',FLOOR+side_figure(frames(skull),{'tri'},disc(6),far_dx=(0,0),extra_static_back=BENCH))
# ---- pompes ----
def pushup(s):
    toe=(28,85.5); a=-17+11*s; th=a+180
    ft=110; A=sub(toe,(9*dv(ft)[0],9*dv(ft)[1]))
    K_=sub(A,(16*dv(th)[0],16*dv(th)[1])); H=sub(K_,(17*dv(th)[0],17*dv(th)[1]))
    S=add(H,dv(a),27.2); a1,a2=ik(S,(S0x,84),15,13.5,1)
    return dict(H=H,ta=a,na=a+5,ha=a+5,nua=a1,nfa=a2,fua=a1,ffa=a2,nth=th,nsh=th,nft=ft,fth=th,fsh=th,fft=ft)
S0x=0
tmp=pushup.__code__
def _s0():
    toe=(28,85.5); a=-17; th=a+180; ft=110
    A=sub(toe,(9*dv(ft)[0],9*dv(ft)[1])); K_=sub(A,(16*dv(th)[0],16*dv(th)[1])); H=sub(K_,(17*dv(th)[0],17*dv(th)[1]))
    return add(H,dv(a),27.2)[0]
S0x=_s0()
OUT['pushup']=svg('Pompes',FLOOR+side_figure(frames(pushup),{'pec','tri'},None,far_dx=(-1,-0.8)))
# ---- gainage ----
def plank(s):
    toe=(26,85.5); a=-6+0.6*s; th=a+180; ft=110
    A=sub(toe,(9*dv(ft)[0],9*dv(ft)[1])); K_=sub(A,(16*dv(th)[0],16*dv(th)[1])); H=sub(K_,(17*dv(th)[0],17*dv(th)[1]))
    S=add(H,dv(a),27.2); a1,a2=ik(S,(S[0]+12,84),15,13.5,-1)
    return dict(H=H,ta=a,na=a+8,ha=a+8,nua=a1,nfa=a2,fua=a1,ffa=a2,nth=th,nsh=th,nft=ft,fth=th,fsh=th,fft=ft)
OUT['plank']=svg('Gainage',FLOOR+side_figure(frames(plank),{'abs'},None,far_dx=(-1,-0.8)))
# ---- rowing ----
def row(s):
    H=(50,54); ta=-22
    l1,l2=ik(H,(56,84),17,16,-1)
    S=add(H,dv(ta),27.2)
    hand=add(S,(0,26-13*s)); hand=(hand[0]-9*s,hand[1])
    a1,a2=ik(S,hand,15,13.5,1)
    return dict(H=H,ta=ta,na=-20,ha=-10,nua=a1,nfa=a2,fua=a1,ffa=a2,nth=l1,nsh=l2,nft=0,fth=l1,fsh=l2,fft=0)
OUT['row']=svg('Rowing haltère',FLOOR+side_figure(frames(row),{'lats','delt'},dbprofile))
# ---- face pull ----
PUL=(112,16)
def fpull(s):
    H=(50,52); ta=-90; S=add(H,dv(ta),27.2)
    tgt=add(S,(27-19*s,-3-7*s)); a1,a2=ik(S,tgt,15,13.5,-1)
    return P(H=H,ta=ta,nua=a1,nfa=a2,fua=a1,ffa=a2)
F=frames(fpull)
def handpos(p):
    S=add(p['H'],dv(p['ta']),27.2); E=add(S,dv(p['nua']),15); W=add(E,dv(p['nfa']),13); return add(W,dv(p['nfa']),2.4)
hp=[handpos(p) for p in F]
cable=f'<line x1="{PUL[0]}" y1="{PUL[1]}" x2="{hp[0][0]:.1f}" y2="{hp[0][1]:.1f}" stroke="#70757f" stroke-width="1.2"><animate attributeName="x2" dur="{DUR}" repeatCount="indefinite" values="{";".join(f"{q[0]:.1f}" for q in hp)}"/><animate attributeName="y2" dur="{DUR}" repeatCount="indefinite" values="{";".join(f"{q[1]:.1f}" for q in hp)}"/></line>'
pole=f'<rect x="113" y="6" width="4" height="80" fill="#3a3a3a"/><circle cx="{PUL[0]}" cy="{PUL[1]}" r="2.6" fill="#2c2f35" stroke="#55595f" stroke-width="0.6"/>'
OUT['facepull']=svg('Face pull',FLOOR+pole+side_figure(F,{'delt','lats'},None,extra_front=cable))
# ---- dips ----
def dips(s):
    hand=(60,50); H=(57,55+11*s); ta=-84+8*s; S=add(H,dv(ta),27.2)
    a1,a2=ik(S,hand,15,13.5,1)
    return dict(H=H,ta=ta,na=ta+4,ha=ta+4,nua=a1,nfa=a2,fua=a1,ffa=a2,nth=100,nsh=150,nft=60,fth=96,fsh=146,fft=56)
BARS='<rect x="44" y="50" width="34" height="3.4" rx="1.7" fill="#55595f"/><rect x="74" y="50" width="3.4" height="36" fill="#3a3a3a"/><rect x="45" y="50" width="3.4" height="36" fill="#3a3a3a"/>'
OUT['dips']=svg('Dips',FLOOR+side_figure(frames(dips),{'tri','pec'},None,extra_front=BARS))
# ---- élévations latérales (face) ----
def raise_(s): return dict(H=(60,52),lua=96+68*s,lfa=96+68*s,rua=84-68*s,rfa=84-68*s)
OUT['raise']=svg('Élévations latérales',FLOOR+front_figure(frames(raise_),{'delt'},disc(3.4)))
# ---- tractions (face) ----
def pull(s):
    H=(60,54-13*s); S=add(H,dv(-90),26.4)
    out=dict(H=H)
    for sd,sx in (('l',-1),('r',1)):
        Sx=(S[0]+sx*8.2,S[1]); a1,a2=ik(Sx,(60+sx*15,6.5),15,13.5,sx)
        out[sd+'ua']=a1; out[sd+'fa']=a2
    return out
PBAR='<rect x="20" y="4" width="80" height="3.4" rx="1.7" fill="#70757f"/>'
OUT['pullup']=svg('Tractions',PBAR+front_figure(frames(pull),{'lats','bi'}))
exec(open('/home/claude/gen/more.py').read())
json.dump(OUT,open('/home/claude/gen/out.json','w'))
print({k:len(v) for k,v in OUT.items()})
