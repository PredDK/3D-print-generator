
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
  if(ty==='hood'){const m=buildHood(P);return {...m,print:m.tris,view:m.tris,ghost:null};}
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
