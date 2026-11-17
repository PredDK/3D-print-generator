
// ================= UDSUGNINGSARM =================
// fejet rør: ringe (cirkler) vinkelret på en sti, med varierende inder-/yderradius
function sweepTube(o,S,N=96){
  const ring=(s,r)=>{const p=[];for(let k=0;k<N;k++){const f=2*Math.PI*k/N,c=Math.cos(f),si=Math.sin(f);
    p.push([s.c[0]+r*(c*s.N[0]+si*s.B[0]),s.c[1]+r*(c*s.N[1]+si*s.B[1]),s.c[2]+r*(c*s.N[2]+si*s.B[2])]);}return p;};
  const O=S.map(s=>ring(s,s.ro)),I=S.map(s=>ring(s,s.ri)),t=[];
  for(let j=0;j+1<S.length;j++)for(let k=0;k<N;k++){const k1=(k+1)%N;Q(t,O[j][k],O[j][k1],O[j+1][k1],O[j+1][k]);Q(t,I[j][k],I[j+1][k],I[j+1][k1],I[j][k1]);}
  const L=S.length-1;for(let k=0;k<N;k++){const k1=(k+1)%N;Q(t,O[0][k],I[0][k],I[0][k1],O[0][k1]);Q(t,O[L][k],O[L][k1],I[L][k1],I[L][k]);}
  let v=0;for(let i=0;i<t.length;i+=9)v+=t[i]*(t[i+4]*t[i+8]-t[i+5]*t[i+7])-t[i+1]*(t[i+3]*t[i+8]-t[i+5]*t[i+6])+t[i+2]*(t[i+3]*t[i+7]-t[i+4]*t[i+6]);
  if(v<0)for(let i=0;i<t.length;i+=9)for(let j=0;j<3;j++){const a=t[i+3+j];t[i+3+j]=t[i+6+j];t[i+6+j]=a;}
  for(const x of t)o.push(x);
}
// sti: lodret stykke, bue (vinkel al, radius Rb) mod +x, derefter lige. Returnerer funktion s -> ramme
function bendPath(z0,hv,al,Rb){const La=al*Rb;
  return s=>{if(s<=hv)return {c:[0,0,z0+s],T:[0,0,1],N:[1,0,0],B:[0,1,0]};
    if(s<=hv+La){const th=(s-hv)/Rb;return {c:[Rb-Rb*Math.cos(th),0,z0+hv+Rb*Math.sin(th)],T:[Math.sin(th),0,Math.cos(th)],N:[Math.cos(th),0,-Math.sin(th)],B:[0,1,0]};}
    const e=s-hv-La,c0=[Rb-Rb*Math.cos(al),0,z0+hv+Rb*Math.sin(al)],T=[Math.sin(al),0,Math.cos(al)];
    return {c:[c0[0]+e*T[0],0,c0[2]+e*T[2]],T,N:[Math.cos(al),0,-Math.sin(al)],B:[0,1,0]};};}
// fælles mål for drejeleddet
function armDims(P){const Rc=P.aid/2,Rs=Rc+P.spw,Rb=Rs+P.rc,Rof=Rb+P.cw,k=Rof-Rs,kc=Math.min(k,Rof-Rb-1.2),hs=P.hs,gd=1.2,zg=hs*0.45;
  const bore=P.aod/2+P.pc,ros=bore+P.sw2;return {Rc,Rs,Rb,Rof,k,kc,hs,gd,zg,bore,ros,Z0:hs+kc+P.rc};}
// rør-delen over koblingen: lodret, bue, overgang, muffe
function armSocket(o,P,D,z0,riStart,riChamfer){
  const al=(P.jtype==='swivel'?0:P.jang)*Math.PI/180,ro0=D.Rof,Rbend=Math.max(ro0,D.ros)+1.5,hv=riChamfer?Math.max(P.hv,riStart-D.Rc+0.5):P.hv;
  const path=bendPath(z0,hv,al,Rbend),La=al*Rbend,S=[],add=(s,ro,ri)=>{const f=path(s);S.push({...f,ro,ri});};
  let s=0;add(0,ro0,riStart);
  if(riChamfer){add(riStart-D.Rc,ro0,D.Rc);}
  add(hv,ro0,D.Rc);
  for(let k=1;k<=24&&La>0;k++)add(hv+La*k/24,ro0,D.Rc);
  const tl=Math.max(4,Math.abs(ro0-D.ros)*1.2),s1=hv+La+tl;add(s1,D.ros,D.Rc);
  if(D.bore>D.Rc+0.01)add(s1,D.ros,D.bore);   // anslag for røret
  add(s1+P.sd2,D.ros,D.bore);
  sweepTube(o,S,P.seg||96);
  const end=path(s1+P.sd2);return {end,al};
}
function buildArmMale(P,D){
  const o=[],{Rc,Rs,Rof,k,hs,gd,zg}=D;
  // tap med V-rille + 45° skulder (drejet profil)
  const prof=[[Rc,0],[Rs-0.4,0],[Rs,0.4],[Rs,zg-gd],[Rs-gd,zg],[Rs,zg+gd],[Rs,hs],[Rof,hs+k],[Rof,hs+k+0.6],[Rc,hs+k+0.6]];
  revolve(o,prof,P.seg||96);
  const r=armSocket(o,P,D,hs+k,Rc,false);return {tris:o,...r};
}
function slitRing(ri,ro,gap,rot,n=96){// C-formet ring med spalte omkring vinklen rot
  const gO=Math.asin(Math.min(0.99,gap/2/ro)),gI=Math.asin(Math.min(0.99,gap/2/ri)),p=[];
  for(let k=0;k<=n;k++){const a=rot+gO+(2*Math.PI-2*gO)*k/n;p.push([ro*Math.cos(a),ro*Math.sin(a)]);}
  for(let k=n;k>=0;k--){const a=rot+gI+(2*Math.PI-2*gI)*k/n;p.push([ri*Math.cos(a),ri*Math.sin(a)]);}
  return p;}
function buildArmFemale(P,D){
  const o=[],{Rb,Rof,kc,hs,gd,zg,Z0}=D,warn=[];
  const zb=Z0+0.6,zr=Z0-zg,rd=gd-0.35,gap=P.slit,rot=Math.PI;
  // klemringen bygges som tynde skiver: forsænkning ved mundingen, boring, V-vulst
  const rin=z=>{let r=Rb;if(z<kc)r=Rb+(kc-z);const d=Math.abs(z-zr);if(d<rd)r=Math.min(r,Rb-(rd-d));return r;};
  const dz=0.2;for(let z=0;z<zb-1e-6;z+=dz){const z1=Math.min(zb,z+dz);extrude(o,slitRing(rin((z+z1)/2),Rof,gap,rot,P.seg||96),[],z,z1,MAP_Z);}
  // ører med skruehul og møtrikfælde
  const nR=(P.nutAF+0.3)/Math.sqrt(3),et=P.nutT+2.4,ew=Math.max(P.sh2d+6,2*nR+3),x0=-Rof-ew,x1=-Math.max(Rb+1,Rof-1.6),ze=zb-0.01,xm=(x0+x1-1.6)/2,zm=ze/2;
  const ear=[[x0,0],[x1,0],[x1,ze],[x0,ze]];
  extrude(o,ear,[circ(xm,zm,P.sh2d/2,32)],-(gap/2+et),-gap/2,MAP_Y);
  const nutOk=zm-nR>0.8&&ze-zm-nR>0.8;if(!nutOk)warn.push('Møtrikken er for stor til klemringen – gør tappen længere eller brug en mindre skrue.');
  layered(o,ear,[{d:et,hole:circ(xm,zm,P.sh2d/2,32),g:'h'},...(nutOk?[{d:P.nutT,hole:hexPoly(xm,zm,P.nutAF+0.3).map(([x,z])=>{const dx=x-xm,dz=z-zm,c=Math.cos(Math.PI/6),q=Math.sin(Math.PI/6);return [xm+c*dx-q*dz,zm+q*dx+c*dz];}),g:'h'}]:[])],gap/2,gap/2+et,true,MAP_Y);
  const r=armSocket(o,P,D,zb-0.3,Rb,true);return {tris:o,warn,...r,zb};
}
function buildKnob(P){const o=[],R=Math.max(P.kd2/2,((P.headAF+0.3)/Math.sqrt(3)+2)/0.82,(P.sh2d/2+2)/0.82),n=6,pts=[];
  for(let k=0;k<n*16;k++){const a=2*Math.PI*k/(n*16),r=R*(0.82+0.18*Math.cos(n*a));pts.push([r*Math.cos(a),r*Math.sin(a)]);}
  layered(o,pts,[{d:P.kh,hole:circ(0,0,P.sh2d/2,32),g:'h'},{d:P.headH,hole:hexPoly(0,0,P.headAF+0.3),g:'h'}],0,P.kh,false);
  return o;}
function buildFlange(P){const o=[],warn=[],bore=P.aod/2+P.pc,t=P.ft,ros=bore+P.sw2,dMin=2*(ros+3)+(P.fn>0?2*(P.shd2+4):6);let Df=P.fd;if(Df<dMin){Df=Math.ceil(dMin);warn.push(`Flangen er gjort Ø${Df} mm, så der er plads til røret${P.fn>0?' og skruerne':''}.`);}
  const nh=P.fn|0,rh=Df/2-Math.max(P.shd2/2+3,6),feats=[];
  for(let i=0;i<nh;i++){const a=2*Math.PI*i/nh;feats.push(...screwFeats(rh*Math.cos(a),rh*Math.sin(a),P.fsd,P.shd2,t,'f'+i));}
  if(rh-P.shd2/2<ros+1)warn.push('Flangen er for lille til skruehullerne – gør den større.');
  layered(o,circ(0,0,Df/2,128),[{d:t,hole:circ(0,0,bore,128),g:'c'},...feats],0,t,true);
  revolve(o,[[bore,t-0.2],[ros,t-0.2],[ros+3,t-0.2],[ros,t+2.8],[ros,t+P.fh],[bore,t+P.fh]],P.seg||128);
  return {tris:o,warn,dims:[Df,Df,t+P.fh]};}
function buildHood(P){const o=[],warn=[],bore=P.aod/2+P.pc,w=P.hw3,Rm=P.hmd/2,ros=bore+P.sw2;
  const dr=Rm-ros,Lc=Math.max(P.hl3,dr+1);if(P.hl3<dr+1)warn.push(`Tragten er gjort ${f1n(Lc)} mm høj, så den kan printes uden support (højst 45°).`);
  // munding nederst (printes på pladen), muffe øverst
  revolve(o,[[Rm-w,0],[Rm,0],[Rm,P.hlip],[ros,P.hlip+Lc],[ros,P.hlip+Lc+P.sd2],[bore,P.hlip+Lc+P.sd2],[bore,P.hlip+Lc],[Math.max(bore-1.5,P.aid/2),P.hlip+Lc-1.5],[Rm-w,P.hlip+w*0.4]],P.seg||128);
  return {tris:o,warn,dims:[2*Rm,2*Rm,P.hlip+Lc+P.sd2]};}
function tf(tris,fn){const o=new Array(tris.length);for(let i=0;i<tris.length;i+=3){const p=fn(tris[i],tris[i+1],tris[i+2]);o[i]=p[0];o[i+1]=p[1];o[i+2]=p[2];}return o;}
function bboxOf(t){const mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];for(let i=0;i<t.length;i++){const k=i%3;mn[k]=Math.min(mn[k],t[i]);mx[k]=Math.max(mx[k],t[i]);}return {mn,mx};}
function buildArm(P){
  const ty=P.jtype;
  if(ty==='flange'){const m=buildFlange(P);return {...m,print:m.tris,view:m.tris,ghost:null};}
  if(ty==='hood'&&P.hshape==='square'){const m=buildHoodSquare(P);let print=m.tris;
    if(m.grille){const b=bboxOf(m.tris),g=bboxOf(m.grille);print=print.concat(tf(m.grille,(x,y,z)=>[x+b.mx[0]-g.mn[0]+8,y,z]));}
    return {...m,tris:print,print,view:m.tris,ghost:m.grille?tf(m.grille,(x,y,z)=>[x,y,z-P.gt2-0.5]):null};}
  if(ty==='hood'){const m=buildHood(P);return {...m,print:m.tris,view:m.tris,ghost:null};}
  if(ty==='elbow'){const m=buildElbow(P);return {...m,print:m.tris,view:m.tris,ghost:null};}
  if(ty==='mount'){const m=buildArmMount(P);let print=m.tris;
    if(m.knob){const b=bboxOf(m.tris),R=Math.max(36,P.nutAF8*2.6)/2;print=print.concat(tf(m.knob,(x,y,z)=>[x+b.mx[0]+R+8,y+b.mn[1]+R,z]));}
    return {...m,tris:print,print};}
  const D=armDims(P),warn=[];
  if(D.Rc<5)warn.push('Lysningen er meget lille.');
  if(P.aid>=P.aod)warn.push('Lysningen er større end rørets ydermål – tjek målene.');
  const M=buildArmMale(P,D),F=buildArmFemale(P,D);warn.push(...F.warn);
  // printlayout: hun, han og knop ved siden af hinanden
  const bf=bboxOf(F.tris),bm=bboxOf(M.tris),gapX=8;
  const fP=tf(F.tris,(x,y,z)=>[x-bf.mn[0],y,z]),wF=bf.mx[0]-bf.mn[0];
  const mP=tf(M.tris,(x,y,z)=>[x-bm.mn[0]+wF+gapX,y,z]),wM=bm.mx[0]-bm.mn[0];
  let print=fP.concat(mP);
  if(P.knob){const kn=buildKnob(P);print=print.concat(tf(kn,(x,y,z)=>[x+wF+wM+2*gapX+P.kd2/2,y,z]));}
  // samlet visning: hanen vendt om oven på hunnen og drejet
  const ph=P.vrot*Math.PI/180,c=Math.cos(ph),s=Math.sin(ph);
  const mV=tf(M.tris,(x,y,z)=>{const X=c*x-s*y,Y=s*x+c*y;return [X,-Y,D.Z0-z];});
  // rør som spøgelser i muffer
  const pipe=(e,len)=>{const t=[],st=[];const R=P.aod/2;for(let k=0;k<=1;k++){const cc=[e.end.c[0]+e.end.T[0]*(k*len-P.sd2+2),e.end.c[1],e.end.c[2]+e.end.T[2]*(k*len-P.sd2+2)];st.push({c:cc,T:e.end.T,N:e.end.N,B:e.end.B,ro:R,ri:Math.max(1,P.aid/2)});}sweepTube(t,st,48);return t;};
  const gF=pipe(F,120),gM=tf(pipe(M,120),(x,y,z)=>{const X=c*x-s*y,Y=s*x+c*y;return [X,-Y,D.Z0-z];});
  // vinkel mellem de to rør i den viste stilling
  const tF=F.end.T,tm=[M.end.T[0],M.end.T[1],M.end.T[2]],tM=[c*tm[0]-s*tm[1],-(s*tm[0]+c*tm[1]),-tm[2]];
  const bend=180-Math.acos(Math.max(-1,Math.min(1,tF[0]*tM[0]+tF[1]*tM[1]+tF[2]*tM[2])))*180/Math.PI;
  const bp=bboxOf(print);
  return {tris:print,print,view:F.tris.concat(mV),ghost:gF.concat(gM),warn,D,bend,maxBend:2*(ty==='swivel'?0:P.jang),
    dims:[bp.mx[0]-bp.mn[0],bp.mx[1]-bp.mn[1],bp.mx[2]-bp.mn[2]],hF:bf.mx[2],hM:bm.mx[2]};
}

// ---------- lukket skal ud fra ringe (yder + inder) med samme antal punkter ----------
function loftShell(o,OR,IR){const t=[],n=OR[0].pts.length,P3=(r,k)=>[r.pts[k][0],r.pts[k][1],r.z];
  for(let j=0;j+1<OR.length;j++)for(let k=0;k<n;k++){const k1=(k+1)%n;Q(t,P3(OR[j],k),P3(OR[j],k1),P3(OR[j+1],k1),P3(OR[j+1],k));}
  for(let j=0;j+1<IR.length;j++)for(let k=0;k<n;k++){const k1=(k+1)%n;Q(t,P3(IR[j],k),P3(IR[j+1],k),P3(IR[j+1],k1),P3(IR[j],k1));}
  const a=OR[0],b=IR[0],c=OR[OR.length-1],d=IR[IR.length-1];
  for(let k=0;k<n;k++){const k1=(k+1)%n;Q(t,P3(a,k),P3(b,k),P3(b,k1),P3(a,k1));Q(t,P3(c,k),P3(c,k1),P3(d,k1),P3(d,k));}
  let v=0;for(let i=0;i<t.length;i+=9)v+=t[i]*(t[i+4]*t[i+8]-t[i+5]*t[i+7])-t[i+1]*(t[i+3]*t[i+8]-t[i+5]*t[i+6])+t[i+2]*(t[i+3]*t[i+7]-t[i+4]*t[i+6]);
  if(v<0)for(let i=0;i<t.length;i+=9)for(let j=0;j<3;j++){const q=t[i+3+j];t[i+3+j]=t[i+6+j];t[i+6+j]=q;}
  for(const x of t)o.push(x);}
const toCircle=(pts,R)=>pts.map(([x,y])=>{const a=Math.atan2(y,x);return [R*Math.cos(a),R*Math.sin(a)];});
const lerpP=(A,B,f)=>A.map((p,i)=>[p[0]+(B[i][0]-p[0])*f,p[1]+(B[i][1]-p[1])*f]);
const maxShift=(A,B)=>Math.max(...A.map((p,i)=>Math.hypot(B[i][0]-p[0],B[i][1]-p[1])));

// ---------- firkantet sugetragt med filterkammer ----------
function buildHoodSquare(P){const o=[],warn=[],t=P.hw3,bore=P.aod/2+P.pc,ros=bore+P.sw2,Rc=Math.min(P.aid/2,bore-0.8),lw=P.flw;
  const Wi=P.fw+1,Hi=P.fh+1,ri=1.5,seg=6,hc=P.ft+P.fch;
  const NN=P.seg||96,rp=(w,h)=>[...Array(NN)].map((_,k)=>{const a=2*Math.PI*(k+0.5)/NN,c=Math.cos(a),q=Math.sin(a),R=Math.min(w/2/Math.max(1e-9,Math.abs(c)),h/2/Math.max(1e-9,Math.abs(q)));return [R*c,R*q];});
  const inR=rp(Wi,Hi),outR=rp(Wi+2*t,Hi+2*t),inL=rp(Wi-2*lw,Hi-2*lw);
  const cO=toCircle(outR,ros),cI=toCircle(inL,Rc);
  let Lt=Math.max(P.hl3,maxShift(outR,cO)+1,maxShift(inL,cI)+1);
  if(Lt>P.hl3+0.01)warn.push(`Tragten er gjort ${f1n(Lt)} mm høj, så den kan printes uden support (højst 45°).`);
  if(Math.min(Wi,Hi)-2*lw<2*Rc)warn.push('Filteret er mindre end røret – vælg et større filter eller mindre rør.');
  const z1=hc+lw,z2=z1+Lt,z3=z2+P.sd2,N=8;
  const OR=[{pts:outR,z:0},{pts:outR,z:z1}];for(let k=1;k<=N;k++)OR.push({pts:lerpP(outR,cO,k/N),z:z1+Lt*k/N});OR.push({pts:cO,z:z3});
  const IR=[{pts:inR,z:0},{pts:inR,z:hc},{pts:inL,z:z1}];for(let k=1;k<=N;k++)IR.push({pts:lerpP(inL,cI,k/N),z:z1+Lt*k/N});
  IR.push({pts:toCircle(inL,bore),z:z2});IR.push({pts:toCircle(inL,bore),z:z3});
  loftShell(o,OR,IR);
  let grille=null;
  if(P.grille){grille=[];const gw=Wi-2*P.gcl,gh=Hi-2*P.gcl,bar=2,cells=Math.max(2,Math.round(Math.min(gw,gh)/18)),holes=[];
    const cw=(gw-2*3-(cells-1)*bar)/cells,chh=(gh-2*3-(cells-1)*bar)/cells;
    for(let i=0;i<cells;i++)for(let j=0;j<cells;j++){const x=-gw/2+3+i*(cw+bar),y=-gh/2+3+j*(chh+bar);holes.push([[x,y],[x+cw,y],[x+cw,y+chh],[x,y+chh]]);}
    extrude(grille,[[-gw/2,-gh/2],[gw/2,-gh/2],[gw/2,gh/2],[-gw/2,gh/2]],holes,0,P.gt2,MAP_Z);}
  return {tris:o,grille,warn,dims:[Wi+2*t,Hi+2*t,z3]};}

// ---------- fast rørbøjning ----------
function buildElbow(P){const o=[],warn=[],bore=P.aod/2+P.pc,ros=bore+P.sw2,Rc=Math.min(P.aid/2,bore-0.8),al=P.eang*Math.PI/180,Rb=ros+1.5+P.erad;
  const path=bendPath(0,P.sd2+(bore-Rc)+1,al,Rb),La=al*Rb,hv=P.sd2+(bore-Rc)+1,S=[],add=(s,ro,ri)=>S.push({...path(s),ro,ri});
  add(0,ros,bore);add(P.sd2,ros,bore);add(P.sd2+(bore-Rc),ros,Rc);add(hv,ros,Rc);
  for(let k=1;k<=32&&La>0;k++)add(hv+La*k/32,ros,Rc);
  add(hv+La+1,ros,Rc);add(hv+La+1,ros,bore);add(hv+La+1+P.sd2,ros,bore);
  sweepTube(o,S,P.seg||96);
  if(P.eang>45)warn.push('Over 45° hænger den øverste muffe ud over – slå support til (kun fra printpladen).');
  const b=bboxOf(o);return {tris:o,warn,dims:[b.mx[0]-b.mn[0],b.mx[1]-b.mn[1],b.mx[2]-b.mn[2]]};}

// ---------- beslag: bordkant-klemme, skruet på bordet eller væg ----------
// profil i (x,y): x mod bordet/væggen (+), y op. Ekstruderes langs z (= bredden), printes liggende.
function buildArmMount(P){const o=[],warn=[],bore=P.aod/2+P.pc,ws=P.mws,Rob=bore+ws,Rc=Math.min(P.aid/2,bore-0.8);
  P={...P,bh:0.8,bp:5};const hose=P.mbot==='hose',hR=P.hoseD/2,hRi=Math.max(2,Math.min(Rc,hR-2.4)),hb=P.hbarb;
  const htop=Math.max(Rob,bore*Math.SQRT2+ws*0.8),Rs=Math.max(Rob,hose?hR+(hb?P.bh:0):0),W=Rs+htop,zc=Rs,mt=P.mmount;
  const sp=mt==='wall'?P.mtp:P.msp,xc=-(sp+P.mgap+Rob);
  const T=P.T,tj=P.nutT8+4,th=P.mth,J=P.mjaw;
  let yb,Lb=Math.max(P.mHs+3,mt==='clamp'?T+tj+th:mt==='screw'?P.mdrop+P.mtp:0);
  if(mt==='clamp')yb=-T-tj;else if(mt==='screw')yb=P.mtp-Lb;else yb=0;
  // hylster: firkantet klods med dråbeformet hul (spidsen opad i printretningen), slangestuds forneden
  const N=P.seg||96,ang=k=>2*Math.PI*k/N;
  const circR=(r,dv=0)=>[...Array(N)].map((_,k)=>[r*Math.cos(ang(k)),r*Math.sin(ang(k))+dv]);
  const tear=(r,dv=0)=>[...Array(N)].map((_,k)=>{const a=ang(k);let d=Math.abs(((a+Math.PI/2)%(2*Math.PI)+3*Math.PI)%(2*Math.PI)-Math.PI);
    const R=d<Math.PI/4?r/Math.cos(Math.PI/4-d):r;return [R*Math.cos(a),R*Math.sin(a)+dv];});   // spids mod -v (= op i print)
  const sq=(h)=>[...Array(N)].map((_,k)=>{const a=ang(k),c=Math.cos(a),q=Math.sin(a),R=Math.min(Rob/Math.max(1e-9,Math.abs(c)),q>0?Rs/q:q<0?htop/(-q):1e9);return [R*c,R*q];});
  const OR=[],IR=[],dv=hose?(Rs-hR-(hb?P.bh:0)):0;   // studsen flyttes ned, så den ligger på printpladen
  if(hose){const y0=yb-P.hoseL;OR.push({pts:circR(hR-(hb?0.6:0),dv),z:y0});
    if(hb){const n=Math.floor((P.hoseL-3)/P.bp);for(let k=0;k<n;k++){const a=y0+1+k*P.bp,b=a+P.bp;OR.push({pts:circR(hR,dv),z:a},{pts:circR(hR+P.bh,dv),z:b},{pts:circR(hR,dv),z:b});}}
    OR.push({pts:circR(hR,dv),z:yb},{pts:sq(Rob),z:yb},{pts:sq(Rob),z:yb+Lb});
    IR.push({pts:tear(hRi,dv),z:y0},{pts:tear(hRi,dv),z:yb+3},{pts:tear(bore),z:yb+3},{pts:tear(bore),z:yb+Lb});}
  else{OR.push({pts:sq(Rob),z:yb},{pts:sq(Rob),z:yb+Lb});IR.push({pts:tear(bore),z:yb},{pts:tear(bore),z:yb+Lb});}
  {const t=[];loftShell(t,OR,IR);for(const v of tf(t,(u,v,Y)=>[xc+u,Y,zc-v]))o.push(v);}
  // forbindelse fra hylster til monteringsdelen
  const xw0=xc+Rob-1,xw1=-sp+0.1;
  if(mt==='clamp'){
    extrude(o,[[-sp,-T-tj],[0,-T-tj],[0,th],[-sp,th]],[],0,W,MAP_Z);                  // ryg langs bordkanten
    extrude(o,[[-sp,0],[J,0],[J,th],[-sp,th]],[],0,W,MAP_Z);                           // overkæbe
    const xs=Math.min(J-P.nutAF8/Math.sqrt(3)-3,Math.max(8,J*0.6)),nr=(P.nutAF8+0.3)/Math.sqrt(3);
    if(J<2*nr+8)warn.push('Kæben er for kort til skruen – gør den længere.');
    layered(o,[[-sp,0],[J,0],[J,W],[-sp,W]],[{d:tj,hole:circ(xs,zc,P.sd8/2,32),g:'s'},{d:P.nutT8,hole:hexPoly(xs,zc,P.nutAF8+0.3),g:'s'}],T,T+tj,true,MAP_Y); // underkæbe med møtrikfælde
    extrude(o,[[xw0,Math.max(yb,-T-tj)],[xw1,Math.max(yb,-T-tj)],[xw1,Math.min(yb+Lb,th)],[xw0,Math.min(yb+Lb,th)]],[],0,W,MAP_Z);
  }else if(mt==='screw'){
    extrude(o,[[-sp,yb],[0,yb],[0,P.mtp],[-sp,P.mtp]],[],0,W,MAP_Z);                   // ryg langs bordkanten
    const Lp=P.mLp,feats=[];let nh=Math.max(1,P.mnh|0);
    while(nh>1&&Lp/(nh+0.6)<P.mshd+2)nh--;if(nh<(P.mnh|0))warn.push(`Der er kun plads til ${nh} skruehul${nh>1?'ler':''} i pladen – gør den længere for flere.`);
    if(Lp/(nh+0.6)<P.mshd/2+1.5||P.mshd+1>W)warn.push('Pladen er for kort/smal til skruerne.');
    for(let i=0;i<nh;i++){const x=Lp*(i+1)/(nh+0.6);feats.push(...screwFeats(x,zc,P.msd,P.mshd,P.mtp,'p'+i));}
    layered(o,[[-sp,0],[Lp,0],[Lp,W],[-sp,W]],feats,-P.mtp,0,false,MAP_Y);             // plade oven på bordet
    extrude(o,[[xw0,yb],[xw1,yb],[xw1,P.mtp],[xw0,P.mtp]],[],0,W,MAP_Z);
  }else{
    const e=Math.max(P.mshd+6,14),y0=yb-e,y1=yb+Lb+e;
    layered(o,[[y0,0],[y1,0],[y1,W],[y0,W]],[...screwFeats(y0+e/2,zc,P.msd,P.mshd,sp,'a'),...screwFeats(y1-e/2,zc,P.msd,P.mshd,sp,'b')],-sp,0,false,MAP_X);
    extrude(o,[[xw0,yb],[xw1,yb],[xw1,yb+Lb],[xw0,yb+Lb]],[],0,W,MAP_Z);
  }
  let knob=null;if(mt==='clamp'&&P.mknob)knob=buildKnob({kd2:Math.max(36,P.nutAF8*2.6),kh:12,sh2d:P.sd8,headAF:P.nutAF8,headH:P.nutT8+0.5});
  // visning: stående (y op). Bord/væg som spøgelse
  const view=tf(o,(x,y,z)=>[x,z-zc,y]),b=bboxOf(o);
  let ghost=[];if(mt==='wall')box(ghost,0.2,30,-150,150,yb-60,yb+Lb+60);else{const yt=mt==='clamp'?0:0;box(ghost,0.2,300,-150,150,mt==='clamp'?-T:-T,0);}
  ghost=mt==='wall'?ghost:tf(ghost,(x,y,z)=>[x,y,z]);
  return {tris:o,knob,view,ghost,warn,dims:[b.mx[0]-b.mn[0],b.mx[1]-b.mn[1],b.mx[2]-b.mn[2]],xc,yb,Lb,W};}
