
// ================= FÆLLES: RINGE / PROFIL-LOFT =================
// lukket skal ud fra en kæde af (inset, z): ringe af afrundede rektangler med samme antal punkter.
// Kæden går fra bunden udvendigt, op, over kanten og ned indvendigt til bunden af hulrummet.
function ringRR(W,D,R,ins,seg){return rr(W-2*ins,D-2*ins,Math.max(0.3,R-ins),seg);}
function loftChain(o,W,D,R,chain,seg=8){
  const rings=chain.map(([i,z])=>ringRR(W,D,R,i,seg).map(([x,y])=>[x,y,z]));
  const n=rings[0].length,t=[];
  const fan=(ring,up)=>{let cx=0,cy=0;ring.forEach(p=>{cx+=p[0];cy+=p[1];});cx/=n;cy/=n;const c=[cx,cy,ring[0][2]];
    for(let k=0;k<n;k++){const a=ring[k],b=ring[(k+1)%n];if(up)T(t,c,a,b);else T(t,c,b,a);}};
  fan(rings[0],false);
  for(let r=0;r+1<rings.length;r++){const A=rings[r],B=rings[r+1];
    for(let k=0;k<n;k++){const k1=(k+1)%n;Q(t,A[k],A[k1],B[k1],B[k]);}}
  fan(rings[rings.length-1],true);
  // orientering: positivt volumen = normaler udad
  let v=0;for(let i=0;i<t.length;i+=9){const ax=t[i],ay=t[i+1],az=t[i+2],bx=t[i+3],by=t[i+4],bz=t[i+5],cx=t[i+6],cy=t[i+7],cz=t[i+8];
    v+=ax*(by*cz-bz*cy)-ay*(bx*cz-bz*cx)+az*(bx*cy-by*cx);}
  if(v<0)for(let i=0;i<t.length;i+=9){for(let j=0;j<3;j++){const a=t[i+3+j];t[i+3+j]=t[i+6+j];t[i+6+j]=a;}}
  for(const x of t)o.push(x);
}
// sammenhængende løb af "blæk"-pixels (modsat textFill)
function textInk(tb,cb){const open=new Map();
  for(let r=0;r<=tb.rows;r++){const runs=new Set();
    if(r<tb.rows){let c=0;while(c<tb.cols){if(!tb.data[r*tb.cols+c]){c++;continue;}let c1=c;while(c1<tb.cols&&tb.data[r*tb.cols+c1])c1++;runs.add(c+'-'+c1);c=c1;}}
    for(const k of [...open.keys()])if(!runs.has(k)){const o=open.get(k);cb(o.c0,o.c1,o.r0,r);open.delete(k);}
    for(const k of runs)if(!open.has(k)){const [c0,c1]=k.split('-').map(Number);open.set(k,{c0,c1,r0:r});}}
}

// ================= STABELBARE BAKKER =================
function buildBin(P){
  const warn=[],o=[],W=P.W,D=P.D,t=P.t,R=Math.max(0.5,Math.min(P.R,W/2-1,D/2-1)),c=P.c,st=!!P.stack;
  const lipH=st?P.lipH:0,H=P.H,Htot=H+lipH,fb=P.fb,zf=lipH+fb;
  if(zf>Htot-3)warn.push('Bakken er for lav – gør den højere.');
  const iF=t+c;
  const chain=st?[[iF,0],[iF,lipH],[0,lipH+iF],[0,Htot],[t,Htot],[t,zf]]:[[0,0],[0,Htot],[t,Htot],[t,zf]];
  loftChain(o,W,D,R,chain);
  // skillevægge
  const iw=W-2*t,id=D-2*t,cols=Math.max(1,P.cols|0),rows=Math.max(1,P.rows|0),dt=P.dt;
  const dTop=Htot-(st?lipH+0.6:0)-P.dlow;
  if(dTop>zf+1){
    for(let i=1;i<cols;i++){const x=-iw/2+iw*i/cols;box(o,x-dt/2,x+dt/2,-id/2-Math.min(0.3,t/2),id/2+Math.min(0.3,t/2),zf-0.3,dTop);}
    for(let j=1;j<rows;j++){const y=-id/2+id*j/rows;box(o,-iw/2-Math.min(0.3,t/2),iw/2+Math.min(0.3,t/2),y-dt/2,y+dt/2,zf-0.3,dTop);}
  }
  const cw=(iw-(cols-1)*dt)/cols,cd=(id-(rows-1)*dt)/rows;
  if(cw<8||cd<8)warn.push('Rummene bliver meget små – færre rum eller større bakke.');
  return {tris:o,warn,Htot,cw,cd,cells:cols*rows,lipH};
}

// ================= SKILTE =================
function buildSign(P,tb){
  const warn=[],o=[],T=P.T,pad=P.pad,mt=P.mount,shelf=mt==='shelf',raised=P.style==='raised'&&!shelf;
  const td=raised?P.th:Math.min(P.th,T-0.8);
  let tw=tb?tb.cols*tb.res:0,th=tb?tb.rows*tb.res:0;
  let W=P.autoW&&tb?tw+2*pad:P.W,H=P.H;
  const scr=mt==='screw',ex=scr?P.shd+5:0;W+=2*ex;
  if(shelf){const need=P.Ts+2*P.ta+1;if(H<need){H=need;warn.push(`Skiltet er gjort ${f1n(H)} mm højt, så klemmen kan være der.`);}}
  const R=Math.max(0,Math.min(P.R,W/2-0.5,H/2-0.5));
  const out=R<0.05?[[-W/2,-H/2],[W/2,-H/2],[W/2,H/2],[-W/2,H/2]]:rr(W,H,R,8);
  if(tb&&tw>W-2*ex-2*0.8+1e-6)warn.push('Teksten er bredere end skiltet – gør skiltet bredere eller teksten mindre.');
  const x0=-tw/2,yt=th/2;
  const feats=[];
  // beslag i bagsiden
  let back=[],backTop=false;
  if(scr){for(const s of [-1,1])back.push(...screwFeats(s*(W/2-ex/2),0,P.sd,P.shd,T,'s'+(s>0?1:0)));}
  if(mt==='magnet'){if(T<magNeed(P)+(raised?0:td)-1e-6)warn.push(`Skiltet er for tyndt til magneterne – gør det mindst ${f1n(magNeed(P)+(raised?0:td))} mm tykt.`);
    else{const n=W>P.magD*4+20?2:1,xs=n===2?[-W/4,W/4]:[0];back=magFeats(xs.map(x=>[x,0]),P);}}
  if(!tb&&!scr&&mt!=='magnet'){prism(o,out,0,T);}
  if(shelf){
    // printes med forsiden nedad: forsiden er z=0, bagsiden z=T. Fordybet tekst åben mod z=0.
    if(tb)layered(o,out,[{d:td,hole:[[x0,yt-th],[x0+tw,yt-th],[x0+tw,yt],[x0,yt]]}],0,T,false);else prism(o,out,0,T);
    if(tb)textFill(tb,(c0,c1,r0,r1)=>box(o,x0+c0*tb.res,x0+c1*tb.res,yt-r1*tb.res,yt-r0*tb.res,0,td));
    const Ts=P.Ts,ta=P.ta,J=P.jaw,sq=P.sq,yb=-Ts/2;
    // to arme (finner) der rejser sig fra bagsiden; den øverste ligger oven på hylden, den nederste griber under
    const arm=(y0,y1,bump)=>{const pr=[[y0,T-0.1],[y1,T-0.1],[y1,T+J],[y0,T+J]];
      extrude(o,pr,[],-W/2+Math.min(R,3),W/2-Math.min(R,3),MAP_X);
      if(bump&&sq>0.05){const by=bump>0?y1:y0,s=bump;const b=[[by,T+J-6],[by+s*sq,T+J-3],[by,T+J-0.5]];if(s>0)b.reverse();extrude(o,b,[],-W/2+Math.min(R,3),W/2-Math.min(R,3),MAP_X);}};
    arm(yb+Ts,yb+Ts+ta,0);arm(yb-ta,yb,1);
    return {tris:o,warn,W,H,T:T+J,face:'down',shelfBand:[yb,yb+Ts]};
  }
  // forsiden opad (z=T)
  const recFeats=!raised&&tb?[{d:td,hole:[[x0,yt-th],[x0+tw,yt-th],[x0+tw,yt],[x0,yt]]}]:[];
  if(back.length||recFeats.length){
    if(back.length&&recFeats.length){const zb=Math.max(...back.map(f=>f.d))+0.4;
      layered(o,out,back,0,zb,false);layered(o,out,recFeats,zb,T,true);}
    else if(back.length)layered(o,out,back,0,T,false);
    else layered(o,out,recFeats,0,T,true);
  }else if(tb||scr||mt==='magnet')prism(o,out,0,T);
  if(tb&&!raised)textFill(tb,(c0,c1,r0,r1)=>box(o,x0+c0*tb.res,x0+c1*tb.res,yt-r1*tb.res,yt-r0*tb.res,T-td,T));
  if(tb&&raised)textInk(tb,(c0,c1,r0,r1)=>box(o,x0+c0*tb.res,x0+c1*tb.res,yt-r1*tb.res,yt-r0*tb.res,T-0.01,T+td));
  if(raised&&P.frame){const fw=P.fw,FW=W-2*ex,Rf=scr?Math.min(R,2):R;
    const sq=(w,h)=>[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]];
    const fo=Rf<0.05?sq(FW,H):rr(FW,H,Rf,8),fi=Rf-fw<0.05?sq(FW-2*fw,H-2*fw):rr(FW-2*fw,H-2*fw,Rf-fw,8);
    if(scr){const fo2=rr(FW-1,H-1,Math.max(0.3,Rf),8),fi2=rr(FW-1-2*fw,H-1-2*fw,Math.max(0.3,Rf-fw),8);extrude(o,fo2,[fi2],T-0.01,T+td,MAP_Z);}
    else extrude(o,fo,[fi],T-0.01,T+td,MAP_Z);}
  return {tris:o,warn,W,H,T:T+(raised?td:0),face:'up'};
}

// ================= BATTERIHOLDER =================
const BATT={
  AA:{n:'AA',d:14.5,L:50.5},AAA:{n:'AAA',d:10.5,L:44.5},C:{n:'C',d:26.2,L:50},D:{n:'D',d:34.2,L:61.5},
  b18650:{n:'18650',d:18.6,L:65.2},b9V:{n:'9V',rect:[26.5,17.5],L:48.5},CR2032:{n:'CR2032',coin:[20,3.2],L:20},CR2025:{n:'CR2025',coin:[20,2.5],L:20}};
function battCells(P){const list=[];for(const k of Object.keys(BATT)){const n=Math.max(0,(P['n_'+k]|0));if(n)list.push({k,n,b:BATT[k]});}return list;}
function buildBattery(P,labels){
  const warn=[],o=[],cl=P.cl,g=P.hg,e=P.edge,pct=P.pct/100,list=battCells(P);
  if(!list.length)warn.push('Vælg mindst ét batteri.');
  const maxW=P.W-2*e,rows=[];
  list.forEach((it,gi)=>{const b=it.b,lb=P.lbl&&labels?labels[gi]:null,lw=lb?lb.cols*lb.res:0;
    const cw=b.d?b.d+cl:b.rect?b.rect[0]+cl:b.coin[0]+cl,ch=b.d?b.d+cl:b.rect?b.rect[1]+cl:b.coin[1]+cl+0.2;
    const dep=b.coin?Math.min(b.L*0.6,12):b.L*pct;
    let cur={cells:[],w:0,h:ch,dep,lb,lw,first:true};
    const start=()=>{if(cur.lb&&cur.first){cur.w=lw+g;}};start();
    for(let i=0;i<it.n;i++){const add=(cur.cells.length?g:0)+cw;
      if(cur.cells.length&&cur.w+add>maxW){rows.push(cur);cur={cells:[],w:lb?lw+g:0,h:ch,dep,lb,lw,first:false};}
      cur.w+=(cur.cells.length?g:0)+cw;cur.cells.push({w:cw,h:ch,b});}
    rows.push(cur);});
  for(const r of rows)r.h=Math.max(r.h,r.first&&r.lb?r.lb.rows*r.lb.res:0);
  const needW=Math.max(10,...rows.map(r=>r.w))+2*e,needD=rows.reduce((a,r)=>a+r.h,0)+g*Math.max(0,rows.length-1)+2*e;
  const W=Math.max(needW,20),D=Math.max(needD,15);
  const depMax=Math.max(5,...rows.map(r=>r.dep)),H=Math.max(depMax+P.fb,P.Hmin||0);
  const R=Math.max(0,Math.min(P.R,W/2-1,D/2-1,3.4*(e-0.6)));
  const out=R<0.05?[[-W/2,-D/2],[W/2,-D/2],[W/2,D/2],[-W/2,D/2]]:rr(W,D,R,8);
  const feats=[],fills=[],td=0.6;let y=D/2-e,count=0;
  rows.forEach((r,ri)=>{let x=-W/2+e;const cy=y-r.h/2;
    if(r.lb){if(r.first){const lw=r.lw,lh=r.lb.rows*r.lb.res,yt=cy+lh/2;
        feats.push({d:td,hole:[[x,yt-lh],[x+lw,yt-lh],[x+lw,yt],[x,yt]],g:'l'+ri});fills.push({lb:r.lb,x0:x,yt});}
      x+=r.lw+g;}
    for(const c of r.cells){const cx=x+c.w/2,b=c.b;let hole;
      if(b.d)hole=circ(cx,cy,c.w/2,Math.max(32,Math.round(c.w*4)));
      else{const rr_=b.rect?Math.min(2,c.h/2-0.01):Math.min(0.8,c.h/2-0.01);hole=rr(c.w,c.h,rr_,6).map(([a,bb])=>[a+cx,bb+cy]);}
      feats.push({d:r.dep,hole,g:'b'+count});count++;x+=c.w+g;}
    y-=r.h+g;});
  // fingergreb: rille på tværs af hver række (valgfri) – udelades for at holde det enkelt
  const fl=H-depMax;let mag=false;
  if(P.mag){if(fl<magNeed(P)-1e-6)warn.push(`Bunden er for tynd til magneterne – øg bundtykkelsen til mindst ${f1n(magNeed(P))} mm.`);
    else{const mr=P.magD/2+0.15,mx=W/2-mr-2.5,my=D/2-mr-2.5;layered(o,out,magFeats([[mx,my],[-mx,my],[-mx,-my],[mx,-my]],P),0,fl,false);mag=true;}}
  if(!mag)prism(o,out,0,fl);
  layered(o,out,feats,fl,H,true);
  for(const f of fills)textFill(f.lb,(c0,c1,r0,r1)=>box(o,f.x0+c0*f.lb.res,f.x0+c1*f.lb.res,f.yt-r1*f.lb.res,f.yt-r0*f.lb.res,H-td,H));
  return {tris:o,warn,W,D,H,count,rows,list};
}
