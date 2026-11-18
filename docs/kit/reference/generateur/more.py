# ======== utilitaires supplémentaires ========
def hand_world(p, side='n'):
    S=add(p['H'],dv(p['ta']),27.2); E=add(S,dv(p[side+'ua']),15); W=add(E,dv(p[side+'fa']),13); return add(W,dv(p[side+'fa']),2.4)
def band(F, anchor, side='n', col='#c9a227', w=1.3):
    hp=[hand_world(p,side) for p in F]
    a=lambda i: ";".join(f"{q[i]:.1f}" for q in hp)
    return f'<line x1="{anchor[0]}" y1="{anchor[1]}" x2="{hp[0][0]:.1f}" y2="{hp[0][1]:.1f}" stroke="{col}" stroke-width="{w}" stroke-linecap="round"><animate attributeName="x2" dur="{DUR}" repeatCount="indefinite" values="{a(0)}"/><animate attributeName="y2" dur="{DUR}" repeatCount="indefinite" values="{a(1)}"/></line>'
def fhand(p,sd):
    H=p['H']; S=add(H,dv(-90),26.4); sx=-1 if sd=='l' else 1; S=(S[0]+sx*8.2,S[1])
    E=add(S,dv(p[sd+'ua']),15); W=add(E,dv(p[sd+'fa']),13); return add(W,dv(p[sd+'fa']),2.4)
def fband(F, anchors, col='#c9a227'):
    out=''
    for sd,anc in zip(('l','r'),anchors):
        hp=[fhand(p,sd) for p in F]; a=lambda i: ";".join(f"{q[i]:.1f}" for q in hp)
        out+=f'<line x1="{anc[0]}" y1="{anc[1]}" x2="{hp[0][0]:.1f}" y2="{hp[0][1]:.1f}" stroke="{col}" stroke-width="1.3" stroke-linecap="round"><animate attributeName="x2" dur="{DUR}" repeatCount="indefinite" values="{a(0)}"/><animate attributeName="y2" dur="{DUR}" repeatCount="indefinite" values="{a(1)}"/></line>'
    return out
def dbaxial(c,a,side):
    u=dv(a); p0=add(c,u,-7.5); nn=(-u[1],u[0])
    prof=[(0,2.2,2.2),(0.06,3.6,3.6),(0.2,3.6,3.6),(0.22,1,1),(0.78,1,1),(0.8,3.6,3.6),(0.94,3.6,3.6),(1,2.2,2.2)]
    A=[];B=[]
    for t,wa,wb in prof:
        q=add(p0,u,t*15); A.append(add(q,nn,wa)); B.append(add(q,nn,-wb))
    return f'<path d="M{" L".join(f(p) for p in A+B[::-1])}Z" fill="#2c2f35" stroke="#55595f" stroke-width="0.6"/>'
def bench(x1,x2,top,col='#3a3a3a'):
    return f'<rect x="{x1}" y="{top}" width="{x2-x1}" height="5" rx="2" fill="{col}"/><rect x="{x1+5}" y="{top+5}" width="4" height="{86-top-5}" fill="{col}"/><rect x="{x2-9}" y="{top+5}" width="4" height="{86-top-5}" fill="{col}"/>'
def legs_floor(H, ankle, bend=-1):
    return ik(H,ankle,17,16,bend)
def body_line(toe, a, ft=110):
    th=a+180; A=sub(toe,(9*dv(ft)[0],9*dv(ft)[1])); K_=sub(A,(16*dv(th)[0],16*dv(th)[1])); H=sub(K_,(17*dv(th)[0],17*dv(th)[1]))
    return H,th
def pushup_gen(toe,a0,a1,handy,ft=110,targets={'pec','tri'},extra='',hands_db=False,top_h=26.5,bot_h=11.5):
    def shoulder_y(a):
        H,th=body_line(toe,a,ft); return add(H,dv(a),27.2)[1]
    def solve(target):
        lo,hi=-60.0,60.0
        for _ in range(60):
            m=(lo+hi)/2
            if shoulder_y(m) < target: lo=m
            else: hi=m
        return (lo+hi)/2
    a0=solve(handy-top_h); a1=solve(handy-bot_h)
    H0,_=body_line(toe,a0,ft); hx=add(H0,dv(a0),27.2)[0]+1
    def pose(s):
        a=a0+(a1-a0)*s; H,th=body_line(toe,a,ft); S=add(H,dv(a),27.2)
        u1,u2=ik(S,(hx,handy),15,13.5,1)
        return dict(H=H,ta=a,na=a+5,ha=a+5,nua=u1,nfa=u2,fua=u1,ffa=u2,nth=th,nsh=th,nft=ft,fth=th,fsh=th,fft=ft)
    db=f'<circle cx="{hx:.1f}" cy="{handy+5.5:.1f}" r="5" fill="#2c2f35" stroke="#55595f" stroke-width="0.6"/><circle cx="{hx:.1f}" cy="{handy+5.5:.1f}" r="1.3" fill="#9aa0a8"/>' if hands_db else ''
    return FLOOR+extra+db+side_figure(frames(pose),targets,None,far_dx=(-1,-0.8))

# ---- repos (assis, respiration) ----
def rest(s):
    H=(46,68); ta=-66-5*s; S=add(H,dv(ta),27.2)
    knee=add(H,dv(2),17); a1,a2=ik(S,add(knee,(3,-3)),15,13.5,-1)
    return dict(H=H,ta=ta,na=ta+28,ha=ta+38+4*s,nua=a1,nfa=a2,fua=a1,ffa=a2,nth=2,nsh=88,nft=0,fth=0,fsh=86,fft=0)
OUT['rest']=svg('Récupération',FLOOR+bench(20,58,72)+'<rect x="88" y="72" width="7" height="14" rx="2.5" fill="#3a5a6a"/><rect x="89.5" y="69" width="4" height="3.5" rx="1" fill="#2a2a2a"/>'+side_figure(frames(rest),set(),None))
# ---- exercice perso ----
def generic(s): return P(H=(58,52),ta=-90-1.5*s,nua=95,nfa=95,fua=93,ffa=93)
OUT['generic']=svg('Exercice personnalisé',FLOOR+side_figure(frames(generic),set(),dbaxial))
# ---- échauffement : moulinets de bras ----
def warm(s): return dict(H=(60,52),lua=100+190*s,lfa=100+190*s,rua=80-190*s,rfa=80-190*s)
K_old=K; K=8
OUT['warmup']=svg('Échauffement, rotations d’épaules',FLOOR+front_figure(frames(warm),{'delt'}))
K=K_old
# ---- jumping jacks ----
def jj(s): return dict(H=(60,52-1.5*s),lua=98+150*s,lfa=98+150*s,rua=82-150*s,rfa=82-150*s,lth=90+14*s,rth=90-14*s)
OUT['jumpingjack']=svg('Jumping jacks',FLOOR+front_figure(frames(jj),{'quad','delt'}))
# ---- écartés élastique bas -> haut (profil) ----
def flylh(s): ua=105-130*s; return P(H=(62,52),ta=-90,nua=ua,nfa=ua-12,fua=ua+2,ffa=ua-10)
F=frames(flylh); OUT['flyLowHigh']=svg('Écartés élastique de bas en haut',FLOOR+side_figure(F,{'pec','delt'},None,extra_front=band(F,(22,85))))
# ---- écartés élastique haut -> bas (profil) ----
def flyhl(s): ua=-45+105*s; return P(H=(62,52),ta=-90,nua=ua,nfa=ua-12,fua=ua+2,ffa=ua-10)
F=frames(flyhl); OUT['flyHighLow']=svg('Écartés élastique de haut en bas',FLOOR+side_figure(F,{'pec'},None,extra_front=band(F,(20,6))))
# ---- extension triceps nuque ----
def ohe(s): return P(H=(58,52),ta=-90,nua=-98,nfa=-98-125*s,fua=-96,ffa=-96-125*s)
OUT['overheadExt']=svg('Extension triceps nuque',FLOOR+side_figure(frames(ohe),{'tri'},dbaxial))
# ---- curl bayesian ----
def bay(s): return P(H=(62,52),ta=-90,nua=110,nfa=110-140*s,fua=104,ffa=104-140*s)
F=frames(bay); OUT['bayesian']=svg('Curl Bayesian à l’élastique',FLOOR+band(F,(14,84))+side_figure(F,{'bi'},None))
# ---- barre au front haltères, au sol ----
def skf(s):
    H=(68,79); l1,l2=ik(H,(90,83),17,16,-1)
    return dict(H=H,ta=180,na=180,ha=180,nua=-100,nfa=-100-95*s,fua=-100,ffa=-100-95*s,nth=l1,nsh=l2,nft=0,fth=l1,fsh=l2,fft=0)
OUT['skullFloor']=svg('Barre au front aux haltères, au sol',FLOOR+side_figure(frames(skf),{'tri'},disc(4.5),far_dx=(0,0)))
# ---- pompes : variantes ----
OUT['pushupIncline']=svg('Pompes inclinées, mains sur un banc',pushup_gen((24,85.5),-34,-24,70,extra=bench(70,104,72)))
OUT['pushupDecline']=svg('Pompes pieds surélevés',pushup_gen((22,64.5),14,24,85,ft=100,extra=bench(8,34,66),targets={'pec','delt','tri'}))
OUT['pushupDeclineDeficit']=svg('Pompes pieds surélevés en déficit',pushup_gen((22,64.5),10,22,74,ft=100,extra=bench(8,34,66),targets={'pec','delt'},hands_db=True))
OUT['pushupDeficit']=svg('Pompes en déficit',pushup_gen((28,85.5),-22,-9,74,targets={'pec','tri'},hands_db=True))
# ---- pompes piquées ----
def pike(s):
    toe=(28,85.5); th=-55; ft=100
    A=sub(toe,(9*dv(ft)[0],9*dv(ft)[1])); K_=sub(A,(16*dv(th+180)[0],16*dv(th+180)[1])); H=sub(K_,(17*dv(th+180)[0],17*dv(th+180)[1]))
    ta=48+14*s; S=add(H,dv(ta),27.2); a1,a2=ik(S,(pk_hx,85),15,13.5,1)
    return dict(H=H,ta=ta,na=ta+10,ha=ta+10,nua=a1,nfa=a2,fua=a1,ffa=a2,nth=th+180,nsh=th+180,nft=ft,fth=th+180,fsh=th+180,fft=ft)
toe=(28,85.5); th=-55; ft=100
A_=sub(toe,(9*dv(ft)[0],9*dv(ft)[1])); K2=sub(A_,(16*dv(th+180)[0],16*dv(th+180)[1])); H2=sub(K2,(17*dv(th+180)[0],17*dv(th+180)[1]))
pk_hx=add(H2,dv(48),27.2)[0]+1
OUT['pike']=svg('Pompes piquées',FLOOR+side_figure(frames(pike),{'delt','tri'},None,far_dx=(-1,-0.8)))
# ---- mountain climbers ----
def mc(s):
    toe=(28,85.5); a=-17; H,th=body_line(toe,a); S=add(H,dv(a),27.2)
    u1,u2=ik(S,(S[0]+1,85),15,13.5,1)
    nth=163-118*s; fth=45+118*s
    return dict(H=H,ta=a,na=a+5,ha=a+5,nua=u1,nfa=u2,fua=u1,ffa=u2,nth=nth,nsh=nth+(95 if s>0 else 0)*s,nft=110,fth=fth,fsh=fth+95*(1-s),fft=110)
OUT['mountain']=svg('Mountain climbers',FLOOR+side_figure(frames(mc),{'abs','quad'},None,far_dx=(-1,-0.8)))
# ---- rowing australien ----
def invrow(s):
    heel=(100,82); al=24+10*s; ft=-72
    A=heel; K_=sub(A,(16*dv(al)[0],16*dv(al)[1])); H=sub(K_,(17*dv(al)[0],17*dv(al)[1]))
    ta=al+180; S=add(H,dv(ta),27.2); a1,a2=ik(S,(ir_hx,45),15,13.5,1)
    return dict(H=H,ta=ta,na=ta,ha=ta,nua=a1,nfa=a2,fua=a1,ffa=a2,nth=al,nsh=al,nft=ft,fth=al,fsh=al,fft=ft)
al=24; K_=sub((100,82),(16*dv(al)[0],16*dv(al)[1])); H_=sub(K_,(17*dv(al)[0],17*dv(al)[1])); ir_hx=add(H_,dv(al+180),27.2)[0]+1
OUT['invrow']=svg('Rowing australien',FLOOR+'<rect x="8" y="43" width="62" height="3.4" rx="1.7" fill="#70757f"/><rect x="10" y="43" width="3.4" height="43" fill="#3a3a3a"/><rect x="64" y="43" width="3.4" height="43" fill="#3a3a3a"/>'+side_figure(frames(invrow),{'lats','bi'},None,far_dx=(0,0)))
# ---- dips buste penché ----
def dipl(s):
    hand=(62,44); H=(51,50+11*s); ta=-60+6*s; S=add(H,dv(ta),27.2)
    a1,a2=ik(S,hand,15,13.5,1)
    return dict(H=H,ta=ta,na=ta+10,ha=ta+14,nua=a1,nfa=a2,fua=a1,ffa=a2,nth=100,nsh=175,nft=80,fth=96,fsh=170,fft=76)
OUT['dipsLean']=svg('Dips buste penché',FLOOR+side_figure(frames(dipl),{'pec','tri'},None,extra_front='<rect x="46" y="44" width="34" height="3.4" rx="1.7" fill="#55595f"/><rect x="76" y="44" width="3.4" height="42" fill="#3a3a3a"/><rect x="47" y="44" width="3.4" height="42" fill="#3a3a3a"/>'))
# ---- développé militaire ----
def ohp(s):
    H=(58,52); ta=-90; S=add(H,dv(ta),27.2); t=add(S,(5-3*s,-3-24*s))
    a1,a2=ik(S,t,15,13.5,-1)
    return P(H=H,ta=ta,nua=a1,nfa=a2,fua=a1,ffa=a2)
OUT['ohp']=svg('Développé militaire',FLOOR+side_figure(frames(ohp),{'delt','tri'},disc(8)))
# ---- élévations frontales ----
def fr(s): return P(H=(56,52),ta=-90,nua=88-86*s,nfa=88-86*s,fua=88,ffa=88)
OUT['frontraise']=svg('Élévations frontales',FLOOR+side_figure(frames(fr),{'delt'},disc(4.2)))
# ---- soulevé de terre ----
def dl(s):
    A=(58,84); ta=-35-55*s
    for hy in range(40,56):
        pass
    Hy=63-11*s; Hx=46+10*s; H=(Hx,Hy)
    l1,l2=ik(H,A,17,16,-1)
    S=add(H,dv(ta),27.2); u=ik(S,add(S,(0.5,27.5)),15,13.5,1)
    return dict(H=H,ta=ta,na=ta+(25*(1-s)),ha=ta+(35*(1-s)),nua=u[0],nfa=u[1],fua=u[0],ffa=u[1],nth=l1,nsh=l2,nft=0,fth=l1,fsh=l2,fft=0)
OUT['deadlift']=svg('Soulevé de terre',FLOOR+side_figure(frames(dl),{'glutes','ham','lats'},disc(8.5)))
# ---- hip thrust ----
def ht(s):
    S=(32,62); ta=-150-30*s; H=sub(S,(27.2*dv(ta)[0],27.2*dv(ta)[1]))
    l1,l2=ik(H,(82,83),17,16,-1)
    hand=add(H,(-2,-8)); a1,a2=ik(S,hand,15,13.5,1)
    return dict(H=H,ta=ta,na=180,ha=180,nua=a1,nfa=a2,fua=a1,ffa=a2,nth=l1,nsh=l2,nft=0,fth=l1,fsh=l2,fft=0)
F=frames(ht); ph=[add(p['H'],(0,-9)) for p in F]
htbar=f'<circle cx="{ph[0][0]:.1f}" cy="{ph[0][1]:.1f}" r="7.5" fill="#2c2f35" stroke="#55595f" stroke-width="0.6"><animate attributeName="cx" dur="{DUR}" repeatCount="indefinite" values="{";".join(f"{q[0]:.1f}" for q in ph)}"/><animate attributeName="cy" dur="{DUR}" repeatCount="indefinite" values="{";".join(f"{q[1]:.1f}" for q in ph)}"/></circle>'
OUT['hipthrust']=svg('Hip thrust',FLOOR+bench(10,36,66)+side_figure(F,{'glutes','ham'},None,far_dx=(0,0),extra_front=htbar))
# ---- crunch ----
def cr(s):
    H=(64,79); ta=180+20*s; l1,l2=ik(H,(88,83),17,16,-1)
    return dict(H=H,ta=ta,na=ta+8*s,ha=ta+14*s,nua=ta+28,nfa=ta+28+150,fua=ta+28,ffa=ta+28+150,nth=l1,nsh=l2,nft=0,fth=l1,fsh=l2,fft=0)
OUT['crunch']=svg('Crunch',FLOOR+side_figure(frames(cr),{'abs'},None,far_dx=(0,0)))
# ---- relevés de jambes ----
def lr(s):
    H=(66,79); a=-4-80*s
    return dict(H=H,ta=180,na=180,ha=180,nua=4,nfa=4,fua=4,ffa=4,nth=a,nsh=a,nft=a-80,fth=a,fsh=a,fft=a-80)
OUT['legraise']=svg('Relevés de jambes',FLOOR+side_figure(frames(lr),{'abs'},None,far_dx=(0,0)))
# ---- mollets ----
def calf(s):
    ft=26*s; A0=(58.5,82); toe0=add(A0,dv(0),9)
    A=sub(toe0,(9*dv(ft)[0],9*dv(ft)[1])); A=(A0[0]+(A[0]-A0[0])*0, A[1])
    dy=A[1]-A0[1]
    return P(H=(58,52+dy),ta=-90,nua=93,nfa=93,fua=93,ffa=93,nft=ft,fft=ft)
OUT['calf']=svg('Mollets debout',FLOOR+side_figure(frames(calf),{'calf'},dbaxial))
# ================= variantes exactes =================
OUT['pressDb']=svg('Développé couché haltères',FLOOR+side_figure(frames(press),{'pec','tri','delt'},disc(5),far_dx=(0,0),extra_static_back=BENCH))
OUT['inclineBar']=svg('Développé incliné barre',FLOOR+side_figure(frames(incl),{'pec','delt'},disc(8.5),far_dx=(0,0),extra_static_back=IBENCH))
OUT['curlBar']=svg('Curl barre',FLOOR+side_figure(frames(curl),{'bi'},disc(7.5)))
OUT['ohpDb']=svg('Développé épaules haltères',FLOOR+side_figure(frames(ohp),{'delt','tri'},disc(5)))
OUT['rowBar']=svg('Rowing barre',FLOOR+side_figure(frames(row),{'lats','delt'},disc(8)))
F=frames(curl); OUT['curlBand']=svg('Curl à l’élastique',FLOOR+side_figure(F,{'bi'},None,extra_front=band(F,(62,85))))
F=frames(ohe); OUT['overheadExtBand']=svg('Extension triceps nuque à l’élastique',FLOOR+band(F,(52,85))+side_figure(F,{'tri'},None))
def raise_b(s): return dict(H=(60,52),lua=96+68*s,lfa=96+68*s,rua=84-68*s,rfa=84-68*s)
F=frames(raise_b); OUT['raiseBand']=svg('Élévations latérales à l’élastique',FLOOR+fband(F,[(57,86),(63,86)])+front_figure(F,{'delt'}))
def squat_legs(s, lean=40):
    th=90-68*s; sh=90+28*s; A=(60,84)
    H=sub(sub(A,(16*dv(sh)[0],16*dv(sh)[1])),(17*dv(th)[0],17*dv(th)[1]))
    return H,th,sh,-90+lean*s
def sqbw(s):
    H,th,sh,ta=squat_legs(s,38)
    return dict(H=H,ta=ta,na=ta+6*s,ha=ta+10*s,nua=-2,nfa=-2,fua=0,ffa=0,nth=th,nsh=sh,nft=0,fth=th,fsh=sh,fft=0)
OUT['squatBw']=svg('Squat poids du corps',FLOOR+side_figure(frames(sqbw),{'quad','glutes'},None))
def jsq(s):
    d=sqbw(s); jump=(1-s)**2
    d['H']=(d['H'][0],d['H'][1]-5*jump); d['nft']=d['fft']=40*jump
    d['nua']=d['fua']=-2+70*jump; d['nfa']=d['ffa']=d['nua']
    return d
OUT['jumpSquat']=svg('Squat sauté',FLOOR+side_figure(frames(jsq),{'quad','glutes'},None))
def gob(s):
    H,th,sh,ta=squat_legs(s,22)
    S=add(H,dv(ta),27.2); chest=add(add(S,dv(ta),-6),dv(ta+90),9)
    a1,a2=ik(S,chest,15,13.5,-1)
    return dict(H=H,ta=ta,na=ta+4*s,ha=ta+6*s,nua=a1,nfa=a2,fua=a1,ffa=a2,nth=th,nsh=sh,nft=0,fth=th,fsh=sh,fft=0)
F=frames(gob); p0=F[0]; S0=add(p0['H'],dv(p0['ta']),27.2); ch0=add(add(S0,dv(p0['ta']),-6),dv(p0['ta']+90),9)
OUT['goblet']=svg('Goblet squat',FLOOR+side_figure(F,{'quad','glutes'},None,equip_torso=dbaxial(add(ch0,dv(p0['ta']+90),1.5),p0['ta'],'n')))
def bulg(s):
    H=(58,52+12*s)
    a1,a2=ik(H,(72,82),17,16,-1); b1,b2=ik(H,(36,60),17,16,1)
    return dict(H=H,ta=-88,nua=92,nfa=90,fua=92,ffa=90,nth=a1,nsh=a2,nft=0,fth=b1,fsh=b2,fft=-160)
OUT['bulgarian']=svg('Fentes bulgares',FLOOR+bench(14,40,62)+side_figure(frames(bulg),{'quad','glutes'},dbprofile))
def bridge(s):
    S=(32,80); ta=178-28*s; H=sub(S,(27.2*dv(ta)[0],27.2*dv(ta)[1]))
    l1,l2=ik(H,(80,83),17,16,-1)
    return dict(H=H,ta=ta,na=180,ha=180,nua=4,nfa=4,fua=4,ffa=4,nth=l1,nsh=l2,nft=0,fth=l1,fsh=l2,fft=0)
OUT['bridge']=svg('Pont fessier',FLOOR+side_figure(frames(bridge),{'glutes','ham'},None,far_dx=(0,0)))
def bdips(s):
    H=(54,60+11*s); ta=-86; S=add(H,dv(ta),27.2)
    a1,a2=ik(S,(44,58.5),15,13.5,1); l1,l2=ik(H,(80,84),17,16,-1)
    return dict(H=H,ta=ta,na=ta+4,ha=ta+4,nua=a1,nfa=a2,fua=a1,ffa=a2,nth=l1,nsh=l2,nft=0,fth=l1,fsh=l2,fft=0)
OUT['benchDips']=svg('Dips sur banc',FLOOR+bench(18,46,60)+side_figure(frames(bdips),{'tri'},None))
def row1(s):
    H=(46,54); ta=-14
    l1,l2=ik(H,(50,84),17,16,-1)
    S=add(H,dv(ta),27.2)
    hand=add(S,(0,26-13*s)); hand=(hand[0]-9*s,hand[1]); a1,a2=ik(S,hand,15,13.5,1)
    b1,b2=ik(S,(S[0]+4,63),15,13.5,1)
    return dict(H=H,ta=ta,na=-12,ha=-4,nua=a1,nfa=a2,fua=b1,ffa=b2,nth=l1,nsh=l2,nft=0,fth=l1+8,fsh=l2+4,fft=0)
OUT['rowOne']=svg('Rowing haltère unilatéral',FLOOR+bench(64,100,63)+side_figure(frames(row1),{'lats','delt'},dbprofile))
def rdl(s):
    A=(58,84); ta=-28-62*s; H=(50+8*s,53-1*s)
    l1,l2=ik(H,A,17,16,-1)
    S=add(H,dv(ta),27.2); u=ik(S,add(S,(0.5,27.5)),15,13.5,1)
    return dict(H=H,ta=ta,na=ta+(20*(1-s)),ha=ta+(30*(1-s)),nua=u[0],nfa=u[1],fua=u[0],ffa=u[1],nth=l1,nsh=l2,nft=0,fth=l1,fsh=l2,fft=0)
OUT['rdl']=svg('Soulevé de terre jambes tendues',FLOOR+side_figure(frames(rdl),{'ham','glutes'},disc(8.5)))
