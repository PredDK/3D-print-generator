// ================= SKÅDIS =================
// Pladen: 5 mm tyk, slidser 5×15 mm (R2,5), 40 mm mellem slidser i en række, rækker forskudt 20 mm.
// Krogene sidder fast på tilbehørets bagside: en afrundet krog øverst og evt. en tap 40 mm længere nede.
const SK={pitch:40,cl:0.3,hw:2.8,bh:4.2,Ld:5.6,tw:4.4,Ro:2.4,rf:0.25,bh2:3.8};
SK.dropB=2.5-Math.sqrt(2.5**2-(SK.tw/2)**2); // krogens flade underside hviler på slidsens runde bund
function skadisCols(W,edge){const k=Math.floor((W-2*edge-SK.tw)/SK.pitch);return k>=1?[-k*SK.pitch/2,k*SK.pitch/2]:[0];}
// profil (u,v): u = 0 ved tilbehørets bagside, + ind mod væggen (SKÅDIS-pladen er u∈[0,Tb]); A = startpunkt inde i bagpladen
function skHookProfile(A,top,Tb){
  const {cl,hw,bh,Ld,Ro,rf}=SK,B=Tb+cl,C=B+hw,sb=top-bh,tip=sb-Ld,p=[[A,sb]];
  for(let k=0;k<=6;k++){const a=Math.PI/2-Math.PI/2*k/6;p.push([B-rf+rf*Math.cos(a),sb-rf+rf*Math.sin(a)]);}
  p.push([B,tip+hw/2]);
  for(let k=1;k<=12;k++){const a=Math.PI+Math.PI*k/12;p.push([(B+C)/2+hw/2*Math.cos(a),tip+hw/2+hw/2*Math.sin(a)]);}
  p.push([C,top-Ro]);
  for(let k=1;k<=8;k++){const a=Math.PI/2*k/8;p.push([C-Ro+Ro*Math.cos(a),top-Ro+Ro*Math.sin(a)]);}
  p.push([A,top]);
  return p;
}
// tap (kile) der går ind i en slids længere nede; skrå overside så den kan printes på hovedet
function skStubProfile(A,vs,Tb){const e=Tb-0.5;return [[A,vs],[e,vs],[e,vs+2.5],[1,vs+2.5],[A,vs+2.5+(1-A)]];}
// nederste krog ("flueben"): som den øverste krog, men med skrå overside så den kan printes på hovedet
function skHook2Profile(A,top,Tb){
  const {cl,hw,Ld,rf}=SK,bh=SK.bh2,B=Tb+cl,C=B+hw,sb=top-bh,tip=sb-Ld,r2=1.2,p=[[A,sb]];
  // højden inde i slidsen skal kunne passere, mens tilbehøret er løftet (Ld+0,3) under isætning
  const h0=15-2*SK.dropB-(Ld+0.3)-0.3,us=Math.max(0,Math.min(Tb,h0-bh));
  for(let k=0;k<=6;k++){const a=Math.PI/2-Math.PI/2*k/6;p.push([B-rf+rf*Math.cos(a),sb-rf+rf*Math.sin(a)]);}
  p.push([B,tip+hw/2]);
  for(let k=1;k<=12;k++){const a=Math.PI+Math.PI*k/12;p.push([(B+C)/2+hw/2*Math.cos(a),tip+hw/2+hw/2*Math.sin(a)]);}
  p.push([C,top-r2]);
  for(let k=1;k<=6;k++){const a=Math.PI/2*k/6;p.push([C-r2+r2*Math.cos(a),top-r2+r2*Math.sin(a)]);}
  p.push([us,top],[A,top+(us-A)]);
  return p;
}
function skHook2V(top,lo){let best=null;for(let k=1;k<10;k++){const t2=top-SK.bh+SK.bh2-SK.pitch*k;if(t2-SK.bh2-SK.Ld<lo+0.5)break;best=t2;}return best;}
// placering: krog-top 'top'; returnerer tap-bund for nederste tap der kan være over 'lo'
function skStubV(top,lo){const slotBot=top-SK.bh-SK.dropB;let best=null;
  for(let k=1;k<10;k++){const vs=slotBot-SK.pitch*k+1.3;if(vs<lo)break;best=vs;}return best;}
// byg kroge (og tappe) i (x,y,z): kolonner xs, bagsiden ved y=yBack (væggen i +y), bagpladens tykkelse tb
// lower: 'hook' (krog med flueben), 'stub' (tap) eller 'none'
function skLowerProfile(A,top,Tb,lo,lower){
  if(lower==='hook'){const t2=skHook2V(top,lo);return t2!=null?skHook2Profile(A,t2,Tb):null;}
  if(lower==='stub'){const vs=skStubV(top,lo);return vs!=null?skStubProfile(A,vs,Tb):null;}
  return null;}
function skHooks(o,xs,top,tb,Tb,yBack,lo,lower){
  const A=-tb+0.3,hook=skHookProfile(A,top,Tb),low=skLowerProfile(A,top,Tb,lo,lower||'hook');
  for(const x of xs)for(const pr of low?[hook,low]:[hook]){const tmp=[];extrude(tmp,pr,[],x-SK.tw/2,x+SK.tw/2,MAP_X);
    for(let i=0;i<tmp.length;i+=3)o.push(tmp[i],tmp[i+1]+yBack,tmp[i+2]);}
  return {stub:!!low||lower==='none'};
}
// vend på hovedet (rotation 180° om x): top på printpladen
function flipZ(tr,H){const o=new Array(tr.length);for(let i=0;i<tr.length;i+=3){o[i]=tr[i];o[i+1]=-tr[i+1];o[i+2]=H-tr[i+2];}return o;}
const f1n=v=>(+v).toFixed(1).replace('.',',');

// ================= SKUFFER =================
// Almindelig: hylder, printes på ryggen.  SKÅDIS: ingen hylder – skufferne kører på skinner i sidevæggene, skabet printes på hovedet.
function drawerCalc(P){
  const n=Math.max(1,P.n|0),t=P.t,st=P.st,c=P.c,sk=!!P.skadis;
  let sw,sh,z,dh,rail=null;
  if(!sk){sw=P.W-2*t;sh=(P.H-2*t-(n-1)*st)/n;z=Array.from({length:n},(_,k)=>t+k*(sh+st));dh=sh-c;}
  else{const rd=1.6,hr=3,tsw=t+rd+c,g=Math.max(1,2*c);sw=P.W-2*tsw;sh=(P.H-t-c-(n-1)*g)/n;z=Array.from({length:n},(_,k)=>k*(sh+g));dh=sh;
    const G=2*c+0.2;rail={rd,hr,tsw,g,zr:dh-1.5,G,bC:G/2+0.2,bD:G/2+0.25};}
  const magT=P.mount==='magnet'&&!sk?Math.max(0,magNeed(P)-t):0,sd=P.D-t-(magT>0?magT+0.5:0),dw=sw-2*c,dd=sd-c;
  const iw=dw-2*P.dwt,id=dd-P.dwt-P.ft,ir=Math.max(0,Math.min(P.rd,dw/2-1,dd/2-1)-P.dwt),oy=(P.ft-P.dwt)/2;
  const nd=P.handle==='notch'?Math.min(dh*0.45,P.nd):0;
  return {n,sw,sh,sd,dw,dh,dd,iw,id,ir,oy,nd,z,rail,bumpD:c*0.45,bumpC:c*0.55+0.45};
}
function buildCabinet(P,C){
  const o=[],{W,D,H,t,st}=P;
  if(!C.rail){
    if(P.mount==='magnet'){
      const mr=P.magD/2+0.15,tm=Math.max(t,magNeed(P)),xs=W<70?[0]:[-W/4,W/4],zs=H>90?[H*0.25,H*0.75]:[H/2],pts=[];
      for(const x of xs)for(const z of zs)pts.push([x,z]);
      const f=magFeats(pts,P);
      layered(o,[[-W/2,0],[W/2,0],[W/2,H],[-W/2,H]],f,-D/2,-(D/2-t),false,MAP_Y);
      if(tm>t+1e-6)pts.forEach(([x,z],i)=>layered(o,circ(x,z,mr+1.6,32),[f[i]],-D/2,-(D/2-tm),false,MAP_Y));
    }else box(o,-W/2,W/2,D/2-t,D/2,0,H);
    box(o,-W/2,-W/2+t,-D/2,D/2,0,H);box(o,W/2-t,W/2,-D/2,D/2,0,H);
    box(o,-W/2,W/2,-D/2,D/2,0,t);box(o,-W/2,W/2,-D/2,D/2,H-t,H);
    for(let k=1;k<C.n;k++){const z0=t+k*C.sh+(k-1)*st;box(o,-W/2,W/2,-D/2,D/2,z0,z0+st);}
    if(P.stop){const sw2=Math.min(8,C.dw/4),ya=-D/2+1.2,yb=ya+2.6;
      for(let k=0;k<C.n;k++){const zt=C.z[k]+C.sh;extX(o,[[(ya+yb)/2,zt-C.bumpC],[yb,zt+0.05],[ya,zt+0.05]],-sw2,sw2);}}
    return {tris:o,hooks:null};
  }
  // SKÅDIS-skab
  const R=C.rail,xi=W/2-R.tsw,c=P.c;
  box(o,-W/2,W/2,D/2-t,D/2,0,H);
  box(o,-W/2,W/2,-D/2,D/2,H-t,H);
  // højre sidevæg som profil (x,z) med riller, ekstruderet i dybden
  const prof=[[xi,0],[W/2,0],[W/2,H],[xi,H]];
  for(let k=C.n-1;k>=0;k--){const zr=C.z[k]+R.zr;
    prof.push([xi,zr+R.G],[xi+R.rd,zr+R.G],[xi+R.rd,zr-R.hr+c],[xi,zr-R.hr-R.rd+c]);}
  extrude(o,prof,[],-D/2,D/2,MAP_Y);
  extrude(o,prof.map(([x,z])=>[-x,z]).reverse(),[],-D/2,D/2,MAP_Y);
  if(P.stop){const ya=-D/2+1.2,yb=ya+2.6;
    for(let k=0;k<C.n;k++){const zt=C.z[k]+R.zr+R.G;for(const s of [-1,1]){const a=s>0?xi-0.01:-xi-R.rd,b=s>0?xi+R.rd:-xi+0.01;
      extX(o,[[(ya+yb)/2,zt-R.bC],[yb,zt+0.05],[ya,zt+0.05]],a,b);}}}
  const hk=skHooks(o,skadisCols(W,R.tsw+3),H,t,P.Tb,D/2,1,P.skLow);
  return {tris:o,hooks:hk};
}
function buildDrawer(P,C,tb){
  const o=[],w2=C.dw/2,d2=C.dd/2,dwt=P.dwt,ft=P.ft,dh=C.dh;
  const rd=Math.max(0,Math.min(P.rd,w2-1,d2-1)),seg=rd>0.05?6:0,n1=seg+1;
  const lo=rr(C.dw,C.dd,rd,seg),li=rr(C.dw-2*dwt,C.dd-2*dwt,rd-dwt,seg);
  const O=[[w2,-d2],...lo.slice(0,2*n1),[-w2,-d2]];
  const I=[[w2-dwt,-d2+ft],...li.slice(0,2*n1),[-w2+dwt,-d2+ft]];
  prism(o,O,0,P.dfb);
  band(o,O,I,0,dh);
  let front;
  if(P.handle==='notch'&&C.nd>2){
    const nw=Math.min(P.nw,C.dw*0.6),r=nw/2,nd=C.nd;front=[[-w2,0],[w2,0],[w2,dh],[r,dh]];
    if(nd>r){const zb=dh-nd+r;front.push([r,zb]);for(let k=1;k<16;k++){const a=-Math.PI*k/16;front.push([r*Math.cos(a),zb+r*Math.sin(a)]);}front.push([-r,zb]);}
    else{for(let k=1;k<16;k++){const a=-Math.PI*k/16;front.push([r*Math.cos(a),dh+nd*Math.sin(a)]);}}
    front.push([-r,dh],[-w2,dh]);
  }else front=[[-w2,0],[w2,0],[w2,dh],[-w2,dh]];
  const feats=[];let tinfo=null;
  if(tb){const zc=(dh-C.nd)/2+0.5,x0=-tb.cols*tb.res/2,zt=zc+tb.rows*tb.res/2;
    feats.push({d:P.textDepth,hole:[[x0,zt-tb.rows*tb.res],[-x0,zt-tb.rows*tb.res],[-x0,zt],[x0,zt]]});tinfo={x0,zt};}
  layered(o,front,feats,d2-ft,d2,true,MAP_Y);
  if(tinfo)textFill(tb,(c0,c1,r0,r1)=>box(o,tinfo.x0+c0*tb.res,tinfo.x0+c1*tb.res,-d2,-d2+P.textDepth,tinfo.zt-r1*tb.res,tinfo.zt-r0*tb.res));
  if(P.handle==='tab'){const tw=Math.min(50,C.dw*0.5),p=Math.min(8,dh*0.3);
    extX(o,[[-d2+0.2,dh-2-p-0.2],[-d2+0.2,dh],[-d2-p,dh],[-d2-p,dh-2]],-tw/2,tw/2);}
  if(P.handle==='bar'){const bw=Math.min(60,C.dw*0.6),zt=Math.min(dh-2,dh/2+5),zb=zt-6;
    for(const s of [-1,1])box(o,s<0?-bw/2:bw/2-6,s<0?-bw/2+6:bw/2,-d2-12,-d2+0.2,zb,zt);
    box(o,-bw/2,bw/2,-d2-12,-d2-8,zb,zt);}
  const top=P.dfb+(dh-0.5-P.dfb)*Math.max(0.1,Math.min(1,(P.divH||100)/100));
  const cells=addDividers(o,P,C.iw,C.id,C.ir,P.dfb,top,0,C.oy);
  if(P.stop&&!C.rail){const sw2=Math.min(8,C.dw/4);extX(o,[[d2-dwt+0.15,dh-0.05],[d2-0.15,dh-0.05],[d2-dwt/2,dh+C.bumpD]],-sw2,sw2);}
  if(C.rail){const R=C.rail,zr=R.zr;
    for(const s of [1,-1]){const pr=[[w2-0.3,zr],[w2+R.rd,zr],[w2+R.rd,zr-R.hr],[w2-0.3,zr-R.hr-R.rd-0.3]].map(([x,z])=>[s*x,z]);
      extrude(o,pr,[],-d2,d2,MAP_Y);
      if(P.stop){const a=s>0?w2-0.01:-w2-R.rd,b=s>0?w2+R.rd:-w2+0.01;extX(o,[[d2-2.6,zr-0.05],[d2-0.2,zr-0.05],[d2-1.4,zr+R.bD]],a,b);}}}
  return {tris:o,cells};
}
function buildDrawers(P){
  const C=drawerCalc(P),warn=[];
  if(C.sh<(C.rail?14:12))warn.push('Skufferne bliver meget lave – færre skuffer eller større højde.');
  if(C.iw<10||C.id<10)warn.push('Skufferne bliver meget smalle – gør skabet større.');
  const cb=buildCabinet(P,C),cab=cb.tris;
  if(cb.hooks&&!cb.hooks.stub)warn.push('Skabet er for lavt til den nederste SKÅDIS-krog/tap (ca. 55 mm) – det hænger kun i de øverste kroge.');
  const labels=(P.labels||[]);const tbs=P.tbs||[];
  const drawers=[];const cache=new Map();
  for(let k=0;k<C.n;k++){const key=tbs[k]?'t'+k:'none';
    if(!cache.has(key))cache.set(key,buildDrawer(P,C,tbs[k]||null));drawers.push({...cache.get(key),key,label:labels[k]||''});}
  return {C,cab,drawers,warn};
}
// printretning: almindeligt skab på ryggen, SKÅDIS-skab på hovedet
function cabinetPrint(tr,P,C){if(C&&C.rail)return flipZ(tr,P.H);
  const D=P.D,o=new Array(tr.length);for(let i=0;i<tr.length;i+=3){o[i]=tr[i];o[i+1]=tr[i+2];o[i+2]=-tr[i+1]+D/2;}return o;}

// ================= HOLDER =================
// P.holes = [{s:'c'|'s', a, b, n}]  c = rundt hul (Ø a), s = slids (længde a, bredde b). P.sor: 'along' (slids langs væggen) | 'out' (ud fra væggen)
function holderLayout(P){
  const items=[];for(const h of (P.holes||[]))for(let i=0;i<Math.max(0,h.n|0);i++)items.push(h);
  const ext=h=>h.s==='s'?(P.sor==='out'?[h.b,h.a]:[h.a,h.b]):[h.a,h.a];
  const g=P.hgap,m=P.hm;const W=2*m+items.reduce((s,h)=>s+ext(h)[0],0)+Math.max(0,items.length-1)*g;
  let x=-W/2+m;const cs=items.map(h=>{const [ex,ez]=ext(h);const c=x+ex/2;x+=ex+g;return {cx:c,ex,ez,h};});
  return {W,cs,dmax:cs.length?Math.max(...cs.map(c=>c.ez)):10};
}
function holePoly(c,cz,g=0){const h=c.h;if(h.s!=='s')return circ(c.cx,cz,h.a/2+g,48);
  const ex=c.ex+2*g,ez=c.ez+2*g;return rr(ex,ez,Math.min(ex,ez)/2-0.01,8).map(([x,y])=>[x+c.cx,y+cz]);}
// tilspidsede huller: trin fra største (ved fladen) til nominel størrelse i bunden af tykkelsen 'th'
function taperFeats(cs,cz,th,deg,extra,maxG=Infinity){const n=deg>0.05?Math.max(4,Math.min(12,Math.ceil(th/0.8))):1,tn=Math.tan(deg*Math.PI/180),f=[];
  cs.forEach((c,i)=>{for(let k=0;k<n;k++)f.push({d:th*(k+1)/n,hole:holePoly(c,cz,Math.min(maxG,th*(n-1-k)/n*tn)),g:i});if(extra)extra(c,i,f);});return f;}
// rektangel (x fra -w/2..w/2, y fra 0..h) med valgfri radius pr. hjørne [nederst-venstre, nederst-højre, øverst-højre, øverst-venstre]
function rectR(w,h,rs,seg=8){const cs=[[-w/2,0,180],[w/2,0,270],[w/2,h,0],[-w/2,h,90]],p=[];
  cs.forEach(([x,y,a0],i)=>{const r=Math.max(0,Math.min(rs[i],w/2-0.01,h/2-0.01));if(r<0.05){p.push([x,y]);return;}
    const cx=x-Math.sign(x)*r,cy=y===0?r:h-r;for(let k=0;k<=seg;k++){const a=(a0+90*k/seg)*Math.PI/180;p.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]);}});
  return p;}
function buildHolder(P){
  const warn=[],o=[],L=holderLayout(P),W=Math.max(L.W,P.mount==='skadis'&&P.mode==='wall'?58:0),m=P.hm,R=Math.max(0,Math.min(P.R,W/2-1));
  const taper=P.taper||0;
  if(!L.cs.length)warn.push('Tilføj mindst ét hul.');
  if(P.mode==='block'){
    const D=L.dmax+2*m,H=P.bh,hd=Math.max(1,H-P.bfb);
    const out=rr(W,D,Math.min(R,D/2-1),8);
    const tn=Math.tan(taper*Math.PI/180);
    const gMax=Math.max(0,Math.min(P.hgap/2,m)-0.6);
    if(taper>0&&hd*tn>gMax)warn.push('Tilspidsningen er begrænset, så hullerne ikke løber sammen eller ud over kanten – mindsk vinklen eller øg afstanden/kanten.');
    const feats=taperFeats(L.cs,0,hd,taper,(c,i,f)=>{if(P.drain)f.push({d:H,hole:circ(c.cx,0,1.6,24),g:i});},gMax);
    if(P.bmag&&L.cs.length){
      if(P.drain)warn.push('Magneter og drænhuller kan ikke kombineres – slå det ene fra.');
      else if(P.bfb<magNeed(P)-1e-6)warn.push(`Bunden er for tynd til magneterne – øg bundtykkelsen til mindst ${f1n(magNeed(P))} mm.`);
      else{const pts=L.cs.length>1?[L.cs[0],L.cs[L.cs.length-1]]:[L.cs[0]];
        layered(o,out,magFeats(pts.map(c=>[c.cx,0]),P),0,P.bfb,false);layered(o,out,feats,P.bfb,H,true);
        return {tris:o,view:o,warn,dims:[W,D,H],print:o,count:L.cs.length};}}
    layered(o,out,feats,0,H,true);
    return {tris:o,view:o,warn,dims:[W,D,H],print:o,count:L.cs.length};
  }
  // vægholder – bygget i printretning (bagpladen på pladen): x = bredde, y = op, z = ud fra væggen
  const tb=P.wt,ts=P.st,Hb=P.wh,gap=P.wg,Dsh=tb+gap+L.dmax+m,skm=P.mount==='skadis';
  if(Hb<ts*(P.tray?2:1)+10)warn.push('Bagpladen er lav – gør den højere.');
  // bagpladen er firkantet hvor hylde og bakke sidder, afrundet ellers
  const rb=P.tray?0:R;
  const back=rectR(W,Hb,[rb,rb,0,0]);
  const sf=[];
  if(P.mount==='screw'){const ys=P.tray?Hb/2:(Hb-ts)/2,xs=W<55?[0]:[-W/4,W/4];
    xs.forEach((x,i)=>sf.push(...screwFeats(x,ys,P.sd,P.shd,tb,'s'+i)));}
  let bmag=false;
  if(P.mount==='magnet'){if(tb<magNeed(P)-1e-6)warn.push(`Bagpladen er for tynd til magneterne – øg den til mindst ${f1n(magNeed(P))} mm.`);
    else{const ys=P.tray?Hb/2:(Hb-ts)/2,xs=W<55?[0]:[-W/4,W/4];sf.push(...magFeats(xs.map(x=>[x,ys]),P));bmag=true;}}
  layered(o,back,sf,0,tb,!bmag);
  const shelf=rrFront(W,Dsh,R);
  // hylde med tilspidsede huller (bredest i oversiden)
  layered(o,shelf,taperFeats(L.cs,tb+gap+L.dmax/2,ts,taper,null,Math.max(0,Math.min(P.hgap/2,m,gap)-0.6)),-Hb,-(Hb-ts),false,MAP_Y);
  // hvor langt hylden når ud ved en given x (pga. afrundede forhjørner)
  const reach=x=>{const ax=Math.abs(x);if(R<0.05||ax<=W/2-R)return Dsh;const dx=ax-(W/2-R);return Dsh-R+Math.sqrt(Math.max(0,R*R-dx*dx));};
  const tt=P.trayT||2,sw=Math.max(1.6,ts);
  if(P.tray&&!skm){extrude(o,shelf,[],-tt,0,MAP_Y);
    box(o,-W/2+R,W/2-R,0,tt+P.lip,Dsh-2,Dsh);}
  let trayPart=null,trayView=null;
  if(skm&&P.tray){
    // sidevægge følger hyldens afrundede hjørner; løs drypbakke på 45°-skinner
    for(const s of [1,-1]){const pl=[[W/2-sw,0],[W/2,0]];for(let k=0;k<=8;k++){const x=W/2-sw*k/8;pl.push([x,reach(x)]);}
      extrude(o,pl.map(([x,z])=>[s*x,z]),[],-Hb,0,MAP_Y);}
    const xi=W/2-sw,Lg=2.6,Lc=2,c=0.3,Wt=2*(xi-c),ft=Math.max(Lc,tt),lipH=ft+P.lip,zr=reach(W/2)-0.5,Dt=zr-tb-0.5;
    for(const s of [1,-1])extrude(o,[[s*(xi+0.1),0],[s*(xi-Lg),0],[s*(xi+0.1),Lg+0.1]],[],tb,zr,MAP_Z);
    const t=[],w2=Wt/2;
    extrude(t,[[-w2+Lc,0],[w2-Lc,0],[w2,Lc],[w2,lipH],[w2-ft,lipH],[w2-ft,ft],[-w2+ft,ft],[-w2+ft,lipH],[-w2,lipH],[-w2,Lc]],[],-Dt/2,Dt/2,MAP_Y);
    for(const y of [-Dt/2,Dt/2-ft]){box(t,-w2+Lc,w2-Lc,y,y+ft,0,lipH);box(t,-w2,w2,y,y+ft,Lc,lipH);}
    trayPart=t;const zt=Lg-Lc-c,yc=-tb-0.25-Dt/2;trayView=t.map((v,i)=>i%3===1?v+yc:i%3===2?v+zt:v);
  }else{
    // støttetrekanter – holdes inden for hyldens afrundede hjørner
    const ys=Hb-ts,Dg=Math.max(4,Math.min(reach(W/2)-0.8,Dsh-1,(P.tray?Hb-2*ts:Hb-ts)*0.7,30));
    for(const [a,b] of [[-W/2,-W/2+sw],[W/2-sw,W/2]])extX(o,[[ys-Dg,0],[ys+0.1,0],[ys+0.1,Dg]],a,b);
  }
  const view=new Array(o.length);for(let i=0;i<o.length;i+=3){view[i]=o[i];view[i+1]=-o[i+2];view[i+2]=o[i+1];}
  let print=o,hk=null;
  if(skm){hk=skHooks(view,skadisCols(W,Math.max(R,3)+3),Hb,tb,P.Tb,0,1,P.skLow);print=flipZ(view,Hb);
    if(!hk.stub)warn.push('Bagpladen er for lav til den nederste SKÅDIS-krog/tap (ca. 55 mm) – holderen hænger kun i de øverste kroge.');}
  return {tris:print,view,warn,dims:[W,Dsh,Hb],print,count:L.cs.length,skadis:skm,flipped:skm,trayPart,trayView};
}

// ================= KABELCLIPS =================
// tyk "streg" langs en midterlinje (glat polyline) → lukket polygon
function strokePoly(path,t){const L=[],R=[],n=path.length;
  for(let i=0;i<n;i++){const a=path[Math.max(0,i-1)],b=path[Math.min(n-1,i+1)];let dx=b[0]-a[0],dy=b[1]-a[1];const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;
    L.push([path[i][0]-dy*t/2,path[i][1]+dx*t/2]);R.push([path[i][0]+dy*t/2,path[i][1]-dx*t/2]);}
  return L.concat(R.reverse());}
function arcPts(p,cx,cy,r,a0,a1,n){for(let k=1;k<=n;k++){const a=a0+(a1-a0)*k/n;p.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]);}}
// kabelbøjle: kammer med fjedrende spalte forneden. Profil i (f,y): f = fremad fra bagpladens inderside, y op.
// Bygges i (u,y) med u = -f-bt (u>0 ind mod væg/bord), ekstruderes langs z (= bredden) → printes med profilen fladt
function buildCableLoop(P){
  const o=[],warn=[],t=P.lt,bt=Math.max(P.lbt,t),D=P.lD,H=P.lH,g=P.lg,w=P.w,Ll=P.lL;
  const yT=H+t/2,Rc=Math.max(t/2+1,Math.min(Math.min(D,H)/3,(D+t)/2-0.01));
  let r1=Math.max(t/2+0.8,Math.min(4,(D-g)/2-0.3)),r2=r1;
  if(D-g<r1+r2+0.2)warn.push('Kammeret er for smalt i forhold til spalten – gør det bredere eller spalten mindre.');
  const yF=-t/2,yA=yF+r1,yl=yF-r2-Ll,th=0.6109,rf=4;
  const U=pts=>pts.map(([f,y])=>[-f-bt,y]);
  // top: fra bagpladen, over toppen og ned til forvæggens lige stykke
  const p1=[[-t/2,yT-Rc-0.3],[-t/2,yT-Rc]];arcPts(p1,-t/2+Rc,yT-Rc,Rc,Math.PI,Math.PI/2,12);
  p1.push([D+t/2-Rc,yT]);arcPts(p1,D+t/2-Rc,yT-Rc,Rc,Math.PI/2,0,12);p1.push([D+t/2,yT-Rc-0.3]);
  extrude(o,U(strokePoly(p1,t)),[],0,w,MAP_Z);
  // S-bøjning: bund ind mod bagpladen, læbe ned langs den og en udadbøjet indføring
  const p2=[[D+t/2,yA+0.3],[D+t/2,yA]];arcPts(p2,D+t/2-r1,yA,r1,0,-Math.PI/2,10);
  const xr=g+t/2+r2;if(D+t/2-r1>xr+0.05)p2.push([xr,yF]);arcPts(p2,xr,yF-r2,r2,Math.PI/2,Math.PI,10);
  p2.push([g+t/2,yl]);arcPts(p2,g+t/2+rf,yl,rf,Math.PI,Math.PI+th,8);
  extrude(o,U(strokePoly(p2,t)),[],0,w,MAP_Z);
  const yB=yl-rf*Math.sin(th)-0.5;
  // forvæg (lige stykke) med adgangshul til skruetrækker
  const mt=P.mount,scr=mt==='screw',mg=mt==='magnet',dk=mt==='desk',sk=mt==='skadis';
  const yW0=yA,yW1=yT-Rc,yh=(yW0+yW1)/2,hs=yW1-yW0,need=mg?P.magD+2.4:P.shd+2;
  let n=(scr||mg)?(P.nscrew===2?2:1):0;
  if(n===2&&w/2<need){n=1;warn.push('Clipsen er for smal til 2 huller – der er lavet ét i midten. Gør den bredere for at få 2.');}
  if(n===1&&w<need){n=0;warn.push(mg?'Clipsen er smallere end magneten – gør den bredere.':'Clipsen er smallere end skruehovedet – gør den bredere.');}
  const hr=mg?P.magD/2+0.15:Math.max(P.sd/2+0.45,P.shd/2+0.2);
  if(n&&hr+0.8>yW1-yh){n=0;warn.push(mg?'Kammeret er for lavt til magneterne – gør det højere eller brug mindre magneter.':'Kammeret er for lavt til skruehullet – gør det højere.');}
  const zs=n===2?[w/4,3*w/4]:n?[w/2]:[];
  const fw=[[yW0,0],[yW1,0],[yW1,w],[yW0,w]];
  let acc=[];if(scr&&n){let ar=Math.min(P.shd/2+1.2,hs/2-0.8,w/(2*n)-1);if(ar<P.shd/2+0.3)warn.push('Kammeret er lavt til adgangshullet – skruehovedet kan ikke komme igennem. Gør kammeret højere.');
    if(ar>1)acc=zs.map(z=>circ(yh,z,ar,32));}
  extrude(o,fw,acc,-D-t-bt,-D-bt,MAP_X);
  // bagplade
  const top=yW1;let vb=yB;
  if(sk&&(P.skLow||'none')!=='none')vb=Math.min(vb,top-SK.pitch-SK.bh-SK.Ld-1.5);
  if(sk)vb=Math.min(vb,top-SK.bh-SK.Ld-3);
  const bp=[[vb,0],[top,0],[top,w],[vb,w]];
  let ghost=null,Ydesk=null;
  if(scr)layered(o,bp,zs.flatMap((z,i)=>screwFeats(yh,z,P.sd,P.shd,bt,'s'+i)),-bt,0,false,MAP_X);
  else if(mg){if(bt<magNeed(P)-1e-6){warn.push(`Bagpladen er for tynd til magneterne – øg den til mindst ${f1n(magNeed(P))} mm.`);extrude(o,bp,[],-bt,0,MAP_X);}
    else layered(o,bp,magFeats(zs.map(z=>[yh,z]),P),-bt,0,true,MAP_X);}
  else if(dk){// klemme over kanten: bro bagud fra toppen og et ben ned på den anden side af pladen
    const T=P.T,tj=P.th,J=P.jaw,sq=P.sq,Yb=yT+t/2;
    extrude(o,bp,[],-bt,0,MAP_X);
    const cl=[[-bt,top-0.3],[0,top-0.3],[0,Yb],[T,Yb],[T-sq,Yb-J+2],[T-sq+1.2,Yb-J],[T+tj,Yb-J],[T+tj,Yb+tj],[-bt,Yb+tj]];
    extrude(o,cl,[],0,w,MAP_Z);
    if(J>Yb-vb+tj)warn.push('Klemmens ben er længere end bøjlen – det er fint, men bøjlen hænger så højere end benet.');
    ghost={x0:-w*2,x1:w*2,y0:0,y1:T,z0:Yb-90,z1:Yb};}
  else extrude(o,bp,[],-bt,0,MAP_X);
  let skInfo=null,needsSupport=false;
  if(sk){const zh=P.hookPos==='center'?w/2-SK.tw/2:0,A=-bt+0.3;
    extrude(o,skHookProfile(A,top,P.Tb),[],zh,zh+SK.tw,MAP_Z);
    const low=skLowerProfile(A,top,P.Tb,vb+0.5,P.skLow||'none');if(low)extrude(o,low,[],zh,zh+SK.tw,MAP_Z);
    needsSupport=zh>0;skInfo={Tb:P.Tb,hx:zh+SK.tw/2-w/2};}
  let mny=Infinity,mxy=-Infinity,mnu=Infinity,mxu=-Infinity;for(let i=0;i<o.length;i+=3){mny=Math.min(mny,o[i+1]);mxy=Math.max(mxy,o[i+1]);mnu=Math.min(mnu,o[i]);mxu=Math.max(mxu,o[i]);}
  const view=new Array(o.length);for(let i=0;i<o.length;i+=3){view[i]=o[i+2]-w/2;view[i+1]=o[i];view[i+2]=o[i+1]-mny;}
  if(ghost){ghost.z0-=mny;ghost.z1-=mny;}
  if(skInfo){skInfo.vOff=-mny;skInfo.top=top-mny;}
  return {tris:o,view,warn,ghost,skadis:skInfo,needsSupport,dims:[w,mxu-mnu,mxy-mny],loop:{yh:yh-mny,zs,acc:acc.length>0}};
}
function buildCable(P){
  if(P.ctype==='loop')return buildCableLoop(P);
  const warn=[],o=[],N=Math.max(1,P.cn|0),dc=P.cd,wc=P.cw,ri=dc/2+0.25,ro=ri+wc,ow=Math.max(1,dc*P.co),w=P.w;
  const pitch=2*ro-wc;
  if(P.ctype==='desk'){
    // profil i XY (x ind over bordet, y op), ekstruderet i z = clipsens bredde → printes fladt
    const T=P.T,th=P.th,Lt=P.jaw,sq=P.sq;
    let Lb=P.jaw;if(P.place==='under')Lb=Math.max(Lb,N*pitch+wc+2);
    const clamp=[[-th,-th],[Lb,-th],[Lb,sq],[Lb-1.5,sq+0.6],[0,0],[0,T],[Lt-1.5,T],[Lt,T+0.6],[Lt,T+th],[-th,T+th]];
    extrude(o,clamp,[],0,w,MAP_Z);
    for(let k=0;k<N;k++){
      if(P.place==='under')extrude(o,cRing(ro+k*pitch+1,-th-ro+0.8,ri,ro,-Math.PI/2,ow),[],0,w,MAP_Z);
      else extrude(o,cRing(-th-ro+0.8,T+th-ro-k*pitch,ri,ro,Math.PI,ow),[],0,w,MAP_Z);
    }
    // visning: kablet løber langs bordkanten (x), bordet går ind i +y
    const view=new Array(o.length);for(let i=0;i<o.length;i+=3){view[i]=o[i+2]-w/2;view[i+1]=o[i];view[i+2]=o[i+1];}
    return {tris:o,view,warn,ghost:{x0:-w*2,x1:w*2,y0:0,y1:60,z0:0,z1:T},dims:[w,Lb+th,T+2*th]};
  }
  if(P.mount==='skadis'){
    // flad profil (u = mod væggen, v = op) der printes liggende: bagstykke med krog øverst og kanaler foran
    const bt=Math.max(2.4,P.bt),top=0,A=-bt+0.3,cu=-bt-ro+0.8;
    const vlast=top-ro-1.2-(N-1)*pitch,lowSel=P.skLow||'none';let vb=Math.min(vlast-ro*0.6,top-SK.bh-SK.Ld-4);
    if(lowSel!=='none')vb=Math.min(vb,top-SK.pitch-SK.bh-SK.Ld-1.5);
    let bar=[[-bt,vb],[0,vb],[0,top],[-bt,top]];
    const zh=P.hookPos==='center'?w/2-SK.tw/2:0;
    extrude(o,bar,[],0,w,MAP_Z);
    extrude(o,skHookProfile(A,top,P.Tb),[],zh,zh+SK.tw,MAP_Z);
    const low=skLowerProfile(A,top,P.Tb,vb+0.5,lowSel);
    if(low)extrude(o,low,[],zh,zh+SK.tw,MAP_Z);
    for(let k=0;k<N;k++)extrude(o,cRing(cu,top-ro-1.2-k*pitch,ri,ro,Math.PI,ow),[],0,w,MAP_Z);
    const view=new Array(o.length);for(let i=0;i<o.length;i+=3){view[i]=o[i+2]-w/2;view[i+1]=o[i];view[i+2]=o[i+1]-vb;}
    let mnu=0;for(let i=0;i<o.length;i+=3)mnu=Math.min(mnu,o[i]);
    return {tris:o,view,warn,dims:[w,-mnu+P.Tb+SK.cl+SK.hw,top-vb],skadis:{Tb:P.Tb,vOff:-vb,top:top-vb,hx:zh+SK.tw/2-w/2},needsSupport:zh>0};
  }
  // vægclips: bundplade på pladen, kanaler ovenpå med åbning opad
  const bt=P.bt,zb=bt-0.8,cz=bt+ro-0.8,yc0=0,yN=(N-1)*pitch,mg=P.mount==='magnet',scr=P.mount==='screw'||mg,two=scr&&P.nscrew===2;
  const tab=scr?(mg?P.magD+4:P.shd+6):2;
  const y0=-ro-tab,y1=yN+ro+(two?tab:scr?0:2);
  const Rb=Math.min(3,w/2-0.5);
  const base=rr(w,y1-y0,Rb,6).map(([x,y])=>[x,y+(y0+y1)/2]);
  let feats=[];
  if(scr&&w<(mg?P.magD+1.3:P.shd+1.6)){warn.push(mg?'Clipsen er smallere end magneten – gør den bredere.':'Clipsen er smallere end skruehovedet – gør den bredere.');}
  else if(mg){if(bt<magNeed(P)-1e-6)warn.push(`Bundpladen er for tynd til magneterne – øg den til mindst ${f1n(magNeed(P))} mm.`);
    else feats=magFeats([[0,-ro-tab/2],...(two?[[0,yN+ro+tab/2]]:[])],P);}
  else if(scr){feats=screwFeats(0,-ro-tab/2,P.sd,P.shd,bt,'s');if(two)feats.push(...screwFeats(0,yN+ro+tab/2,P.sd,P.shd,bt,'s2'));}
  if(mg&&w<P.magD+2)warn.push('Clipsen er smal i forhold til magneterne – gør den bredere.');
  layered(o,base,feats,0,bt,!mg);
  for(let k=0;k<N;k++){const cy=yc0+k*pitch;
    const ao=Math.asin(Math.min(0.95,ow/2/ro)),ai=Math.asin(Math.min(0.95,ow/2/ri)),p=[];
    for(let j=0;j<=16;j++){const a=Math.PI/2+ao+(Math.PI/2-ao)*j/16;p.push([cy+ro*Math.cos(a),cz+ro*Math.sin(a)]);}
    p.push([cy-ro,zb],[cy+ro,zb]);
    for(let j=0;j<=16;j++){const a=(Math.PI/2-ao)*j/16;p.push([cy+ro*Math.cos(a),cz+ro*Math.sin(a)]);}
    for(let j=0;j<=32;j++){const a=Math.PI/2+2*Math.PI-ai-(2*Math.PI-2*ai)*j/32;p.push([cy+ri*Math.cos(a),cz+ri*Math.sin(a)]);}
    extrude(o,p,[],-w/2,w/2,MAP_X);
  }
  return {tris:o,view:o,warn,dims:[w,y1-y0,cz+ro]};
}

// ================= INDSATS (USB, SD …) =================
function buildInsert(P){
  const warn=[],o=[],W=P.W,D=P.D,H=P.H,R=Math.max(0,Math.min(P.R,W/2-1,D/2-1,3.4*(P.edge-1.2)-0.1));
  const sw=P.sw,st=P.stk,gx=P.gx,gy=P.gy,e=P.edge;
  const cols=Math.max(0,Math.floor((W-2*e+gx)/(sw+gx))),rows=Math.max(0,Math.floor((D-2*e+gy)/(st+gy)));
  const depth=Math.min(P.sd,H-P.fb);
  if(depth<P.sd-0.01)warn.push('Indsatsen er lavere end slidsdybden – slidserne er gjort lavere.');
  const out=rr(W,D,R,8);
  if(!cols||!rows){warn.push('Der er ikke plads til nogen slidser – gør indsatsen større.');prism(o,out,0,H);return {tris:o,warn,count:0,cols,rows};}
  const gw=cols*sw+(cols-1)*gx,gd=rows*st+(rows-1)*gy;
  const x0=-gw/2-1.2,x1=gw/2+1.2,y0=-gd/2-1.2,y1=gd/2+1.2;
  if(P.mag){const fl=H-depth,mr=P.magD/2+0.15,ex=W/2-mr-2.5,ey=D/2-mr-2.5;
    if(fl<magNeed(P)-1e-6){warn.push(`Bunden under slidserne er for tynd til magneter – gør indsatsen højere (mindst ${f1n(magNeed(P)+depth)} mm).`);prism(o,out,0,H-depth+0.01);}
    else layered(o,out,magFeats([[ex,ey],[-ex,ey],[-ex,-ey],[ex,-ey]],P),0,H-depth+0.01,false);}
  else prism(o,out,0,H-depth+0.01);
  // ring mellem afrundet kant og gitterets rektangel
  const inn=out.map(([px,py])=>{let tx=Infinity;
    if(Math.abs(px)>1e-9)tx=Math.min(tx,(px>0?x1:-x0)/Math.abs(px));
    if(Math.abs(py)>1e-9)tx=Math.min(tx,(py>0?y1:-y0)/Math.abs(py));return [px*tx,py*tx];});
  tube(o,out,inn,H-depth,H);
  // gitteret som kasser uden om slidserne
  const z0=H-depth,ys=[];for(let j=0;j<rows;j++){const a=-gd/2+j*(st+gy);ys.push([a,a+st]);}
  let prev=y0;
  for(const [a,b] of ys){box(o,x0,x1,prev,a,z0,H);
    let px=x0;for(let i=0;i<cols;i++){const c=-gw/2+i*(sw+gx);box(o,px,c,a,b,z0,H);px=c+sw;}box(o,px,x1,a,b,z0,H);prev=b;}
  box(o,x0,x1,prev,y1,z0,H);
  return {tris:o,warn,count:cols*rows,cols,rows,depth};
}

// ================= INDSATS: BITS OG BOR =================
function parseSizes(str){return String(str||'').split(/[\s;]+/).map(x=>parseFloat(x.replace(',','.'))).filter(x=>x>=0.5&&x<=30).slice(0,80);}
function hexPoly(cx,cy,af){const r=af/Math.sqrt(3),p=[];for(let k=0;k<6;k++){const a=Math.PI/3*k;p.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]);}return p;}
function buildBitInsert(P){
  const warn=[],o=[],e=P.edge,g=P.hg,cl=P.cl,bits=P.itype==='bits';
  const dep0=bits?P.bdep:P.ddep;
  // celler: [bredde, højde, d (huldiam./nøglevidde), label]
  let cells=[];
  if(bits){const af=P.baf+cl,hw=2*af/Math.sqrt(3);for(let i=0;i<Math.max(1,P.bn|0);i++)cells.push({w:hw,h:af,af});}
  else{const sz=parseSizes(P.dlist);if(!sz.length)warn.push('Skriv mindst én borstørrelse (fx 3 4 5 6).');
    sz.forEach((d,i)=>{const lb=P.lbl&&P.lbls?P.lbls[i]:null,lw=lb?lb.cols*lb.res:0,lh=lb?lb.rows*lb.res:0;
      cells.push({w:Math.max(d+cl,lw),h:d+cl+(lb?lh+0.6:0),d:d+cl,lb,lh});});}
  // pak i rækker inden for bredden
  let maxW=P.W-2*e;const rows=[];
  if(bits&&P.auto&&cells.length){const c0=cells[0],nc=Math.max(1,Math.round(Math.sqrt(cells.length*1.4)));maxW=Math.min(maxW,nc*c0.w+(nc-1)*g+1e-6);}let cur=[],cw=0;
  for(const c of cells){const add=(cur.length?g:0)+c.w;if(cur.length&&cw+add>maxW){rows.push({cells:cur,w:cw});cur=[];cw=0;}cw+=(cur.length?g:0)+c.w;cur.push(c);}
  if(cur.length)rows.push({cells:cur,w:cw});
  for(const r of rows)r.h=Math.max(...r.cells.map(c=>c.h));
  const needD=rows.reduce((a,r)=>a+r.h,0)+g*Math.max(0,rows.length-1)+2*e,needW=Math.max(0,...rows.map(r=>r.w))+2*e;
  let W=P.W,D=P.D;
  if(P.auto){W=Math.max(needW,15);D=Math.max(needD,10);}
  if(!P.auto&&W<needW-1e-6)warn.push('Mindst ét hul er bredere end indsatsen – gør den bredere.');
  const R=Math.max(0,Math.min(P.R,W/2-1,D/2-1,3.4*(e-0.6)));
  const H=P.H,dep=Math.min(dep0,H-P.fb);
  if(dep<dep0-0.01)warn.push(`Indsatsen er lavere end huldybden – hullerne er kun ${f1n(dep)} mm dybe. Gør den højere.`);
  // placér rækkerne oppefra og ned; drop dem der ikke kan være der
  const feats=[],fills=[];let y=D/2-e,placed=0,total=cells.length;const td=0.6;
  for(const r of rows){if(y-r.h<-D/2+e-1e-6)break;
    // fordel rækken jævnt over bredden
    const free=(W-2*e)-r.w,gx=g;let x=-W/2+e+free/2;
    for(const c of r.cells){const cx=x+c.w/2;
      if(bits)feats.push({d:dep,hole:hexPoly(cx,y-r.h/2,c.af)});
      else{const cy=y-c.d/2;feats.push({d:dep,hole:circ(cx,cy,c.d/2,Math.max(24,Math.min(64,Math.round(c.d*8))))});
        if(c.lb){const lw=c.lb.cols*c.lb.res,x0=cx-lw/2,yt=cy-c.d/2-0.6,yb=yt-c.lh;
          feats.push({d:td,hole:[[x0,yb],[x0+lw,yb],[x0+lw,yt],[x0,yt]]});fills.push({lb:c.lb,x0,yt});}}
      x+=c.w+gx;placed++;}
    y-=r.h+g;}
  if(placed<total)warn.push(`Der er kun plads til ${placed} af ${total} huller – gør indsatsen større eller slå “Tilpas størrelsen” til.`);
  const out=R<0.05?[[-W/2,-D/2],[W/2,-D/2],[W/2,D/2],[-W/2,D/2]]:rr(W,D,R,8);
  // magneter i bunden (lommer fra undersiden)
  const fl=H-dep;
  if(P.mag){if(fl<magNeed(P)-1e-6)warn.push(`Bunden under hullerne er for tynd til magneter – gør indsatsen højere (mindst ${f1n(magNeed(P)+dep)} mm).`);
    else{const mr=P.magD/2+0.15,ex=W/2-mr-2.5,ey=D/2-mr-2.5;layered(o,out,magFeats([[ex,ey],[-ex,ey],[-ex,-ey],[ex,-ey]],P),0,fl,false);}}
  if(!(P.mag&&fl>=magNeed(P)-1e-6))prism(o,out,0,fl);
  layered(o,out,feats,fl,H,true);
  for(const f of fills)textFill(f.lb,(c0,c1,r0,r1)=>box(o,f.x0+c0*f.lb.res,f.x0+c1*f.lb.res,f.yt-r1*f.lb.res,f.yt-r0*f.lb.res,H-td,H));
  return {tris:o,warn,count:placed,total,W,D,H,dep};
}

// ================= FYRFADSHOLDER =================
// keglestub om z-aksen: radius r0 i z0 (øverst) til r1 i z1 (nederst)
function frustum(o,r0,z0,r1,z1,s=48){
  const A=circ(0,0,r0,s),B=circ(0,0,Math.max(0.05,r1),s);
  for(let k=0;k<s;k++){const j=(k+1)%s,p=A[k],q=A[j],a=B[k],b=B[j];
    Q(o,[a[0],a[1],z1],[b[0],b[1],z1],[q[0],q[1],z0],[p[0],p[1],z0]);
    T(o,[0,0,z0],[p[0],p[1],z0],[q[0],q[1],z0]);
    T(o,[0,0,z1],[b[0],b[1],z1],[a[0],a[1],z1]);}
}
const rot2=(pts,a)=>pts.map(([x,y])=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)]);
function buildCandle(P){
  const o=[],warn=[],Ri=P.cd/2,Ro=Ri+P.t,fb=P.fb,Ht=fb+P.ch,s=96;
  if(P.mag&&P.type!=='spike'){if(fb<magNeed(P)-1e-6){warn.push(`Bunden er for tynd til magneten – øg bundtykkelsen til mindst ${f1n(magNeed(P))} mm.`);prism(o,circ(0,0,Ro,s),0,fb);}
    else layered(o,circ(0,0,Ro,s),magFeats([[0,0]],P),0,fb,false);}
  else prism(o,circ(0,0,Ro,s),0,fb);
  tube(o,circ(0,0,Ro,s),circ(0,0,Ri,s),0,Ht);
  let reach=Ro,depthBelow=0;
  if(P.type==='spike'){
    const rs=P.sd/2,f=Math.max(0.5,Math.min(4,Ro-rs-1));
    frustum(o,rs+f,0.5,rs,-f);
    frustum(o,rs,-f+0.3,P.tip/2,-P.sl);
    depthBelow=P.sl;
    if(P.sl<2*f+5)warn.push('Stilken er meget kort.');
  }
  if(P.type==='eyelet'){
    const ew=P.ew,hr=P.hd/2+0.15,ext=Math.max(P.ep,ew/2+hr+1.2),hx=Ro+ext-ew/2,x0=Ro-Math.min(1.5,P.t-0.1);
    const tab=[[x0,-ew/2],[hx,-ew/2]];for(let k=1;k<16;k++){const a=-Math.PI/2+Math.PI*k/16;tab.push([hx+ew/2*Math.cos(a),ew/2*Math.sin(a)]);}tab.push([hx,ew/2],[x0,ew/2]);
    const hole=circ(hx,0,hr,24);
    const sp=P.en===4?(ew+3)/(2*Ro):0,angs=P.en===4?[-sp,sp,Math.PI-sp,Math.PI+sp]:[0,Math.PI];
    for(const a of angs)plate(o,rot2(tab,a),[rot2(hole,a)],0,Math.min(P.et,Ht));
    reach=Ro+ext;
  }
  return {tris:o,warn,Ht,Ro,reach,depthBelow};
}
// flere stk. i printretning (med stilk: på hovedet)
function candlePrint(m,P){
  const one=P.type==='spike'?flipZ(m.tris,m.Ht):m.tris,n=Math.max(1,P.count|0),cols=Math.ceil(Math.sqrt(n)),pitch=2*m.reach+5,out=[];
  for(let i=0;i<n;i++){const cx=(i%cols-(cols-1)/2)*pitch,cy=(Math.floor(i/cols)-(Math.ceil(n/cols)-1)/2)*pitch;
    for(let k=0;k<one.length;k+=3)out.push(one[k]+cx,one[k+1]+cy,one[k+2]);}
  return out;
}

// ================= STIKDÅSE =================
// P.form: 'clip' (enkelte holdere), 'channel' (samlet holder), 'stand' (skrå stander til bordet)
function mapPts(tr,f){const o=new Array(tr.length);for(let i=0;i<tr.length;i+=3){const p=f(tr[i],tr[i+1],tr[i+2]);o[i]=p[0];o[i+1]=p[1];o[i+2]=p[2];}return o;}
function layout(one,n,pitchX){const out=[],cols=Math.ceil(Math.sqrt(n));let mnx=1e9,mxx=-1e9,mny=1e9,mxy=-1e9;
  for(let i=0;i<one.length;i+=3){mnx=Math.min(mnx,one[i]);mxx=Math.max(mxx,one[i]);mny=Math.min(mny,one[i+1]);mxy=Math.max(mxy,one[i+1]);}
  const px=mxx-mnx+5,py=mxy-mny+5;
  for(let k=0;k<n;k++){const dx=(k%cols)*px-(mnx+mxx)/2,dy=Math.floor(k/cols)*py-(mny+mxy)/2;for(let i=0;i<one.length;i+=3)out.push(one[i]+dx,one[i+1]+dy,one[i+2]);}
  return out;}
// fælles magnet-lommer (åbne mod en flade): punkter → layered-features
function magFeats(pts,P,pre='m'){const mr=P.magD/2+0.15,md=P.magH+0.2;return pts.map(([x,y],i)=>({d:md,hole:circ(x,y,mr,32),g:pre+i}));}
function magNeed(P){return P.magH+0.2+0.8;}
function stripDims(P){const c=0.5,Sw=P.sw+c,Sh=P.sh+c,tb=P.tb;return {c,Sw,Sh,tb,ta:P.ta,lip:P.lip,tl:P.tl,ys:Sw/2,yo:Sw/2+P.ta,top:tb+Sh};}
// arme med kanter i profil (u = højde over bundens bagside, v = på tværs). 'lead' = firkantet kant med indløb, '45' = skrå underside
function armPolys(S,style){const {tb,ys,yo,lip,tl,top}=S,ch=Math.min(1.5,tl*0.6,lip*0.6),res=[];
  for(const s of [1,-1]){const a=style==='lead'?[[tb-0.2,ys],[top,ys],[top,ys-lip],[top+tl-ch,ys-lip],[top+tl,ys-lip+ch],[top+tl,yo],[tb-0.2,yo]]
    :[[tb-0.2,ys],[top,ys],[top+lip,ys-lip],[top+lip+1.2,ys-lip],[top+lip+1.2,yo],[tb-0.2,yo]];
    res.push(a.map(([u,v])=>[u,s*v]));}
  return res;}
// bøjle under bordet med klemme om kanten: stykker i profil (X ind under bordet, Y op; bordets underside ved Y=0)
function underDeskPieces(S,P){const {tb,yo}=S,T=P.T,th=P.th,jaw=P.jaw,sq=P.sq;
  const mp=pl=>pl.map(([u,v])=>[yo+v,-u]);
  const base=mp([[0,-yo],[tb,-yo],[tb,yo],[0,yo]]),arms=armPolys(S,'lead').map(mp);
  const front=[[-th,-tb],[0.1,-tb],[0.1,T+th],[-th,T+th]];
  const top=[[-th,T],[jaw-1.5,T],[jaw,T+1.5],[jaw,T+th],[-th,T+th]];
  const bump=[[2*yo-9,-0.1],[2*yo-2,-0.1],[2*yo-4,sq]];
  return {base,arms,front,top,bump,T,th,jaw};}
function buildStrip(P){
  const warn=[],S=stripDims(P),{c,Sw,Sh,tb,ys,yo,top,lip,tl}=S;
  const magOK=()=>{if(tb<magNeed(P)-1e-6){warn.push(`Bunden er for tynd til magneterne – øg bundtykkelsen til mindst ${f1n(magNeed(P))} mm.`);return false;}return true;};
  if(P.form==='clip'){
    // profil i print-XY: X = ud fra væggen (bund X∈[0,tb]), Y = på tværs af dåsen; ekstruderet i Z = bøjlens bredde
    const o=[],cw=P.cw;
    if(P.mount==='desk'&&P.deskPos==='under'){
      const U=underDeskPieces(S,P);
      for(const pl of [U.base,...U.arms,U.front,U.top,U.bump])extrude(o,pl,[],0,cw,MAP_Z);
      const view=[],L=P.sl;
      for(const xo of [-(L/2-cw-10),L/2-cw-10])view.push(...mapPts(o,(X,Y,Z)=>[xo+Z-cw/2,X,Y]));
      const ghost=[];box(ghost,-L/2-40,L/2+40,0.3,2*yo+40,0,U.T);box(ghost,-L/2,L/2,yo-P.sw/2,yo+P.sw/2,-(tb+P.sh),-tb);
      return {view,ghost,print:layout(o,Math.max(1,P.count|0)),warn,dims:[cw,2*yo+U.th,tb+Sh+tl+U.T+U.th]};
    }
    // bordkant: klemme bag bunden, bordpladens overside i flugt med bøjlens top
    let vb=-yo;
    if(P.mount==='desk'){const T=P.T,th=P.th,jaw=P.jaw,sq=P.sq,yd=yo-th-T;vb=Math.min(-yo,yd-th);
      extrude(o,[[-jaw,yd+T],[0.2,yd+T],[0.2,yo],[-jaw+1.5,yo],[-jaw,yo-1]],[],0,cw,MAP_Z);
      extrude(o,[[0.2,yd-th],[0.2,yd],[-jaw+1.5,yd+sq+0.6],[-jaw,yd+sq],[-jaw,yd-th]],[],0,cw,MAP_Z);}
    let feats=[];
    if(P.mount==='screw'){feats=screwFeats(0,cw/2,P.sd,P.shd,tb,'s');if(cw<P.shd+3)warn.push('Bøjlen er smal i forhold til skruehovedet – gør den bredere.');}
    const useMag=P.mount==='magnet'&&magOK();
    if(useMag&&cw<P.magD+2)warn.push('Bøjlen er smal i forhold til magneterne – gør den bredere.');
    layered(o,[[vb,0],[yo,0],[yo,cw],[vb,cw]],useMag?magFeats([[-Sw/4,cw/2],[Sw/4,cw/2]],P):feats,0,tb,!useMag,MAP_X);
    for(const a of armPolys(S,'lead'))extrude(o,a,[],0,cw,MAP_Z);
    if(P.mount==='skadis'){
      const zh=P.hookPos==='center'?cw/2-SK.tw/2:0,A=-tb+0.3;
      const put=pr=>{const tmp=[];extrude(tmp,pr,[],-(zh+SK.tw),-zh,MAP_Z);o.push(...mapPts(tmp,(u,v,w)=>[-u,v,-w]));};
      put(skHookProfile(A,yo,P.Tb));const low=skLowerProfile(A,yo,P.Tb,-yo+0.5,P.skLow||'hook');if(low)put(low);
      if(!low&&P.skLow!=='none')warn.push('Holderen er for lav til den nederste SKÅDIS-krog – dåsen skal være mindst ca. 50 mm bred.');}
    const view=[],L=P.sl;
    for(const xo of [-(L/2-cw-10),L/2-cw-10])view.push(...mapPts(o,(X,Y,Z)=>[xo+cw/2-Z,-X,Y]));
    const ghost=[];box(ghost,-L/2,L/2,-(tb+Sh-0.3),-tb,-P.sw/2,P.sw/2);
    if(P.mount==='desk')box(ghost,-L/2-40,L/2+40,0,60,yo-P.th-P.T,yo-P.th);
    return {view,ghost,print:layout(o,Math.max(1,P.count|0)),warn,dims:[cw,tb+Sh+tl+(P.mount==='desk'?P.jaw:0),yo-vb]};
  }
  if(P.form==='channel'&&P.mount==='desk'&&P.deskPos==='under'){
    // under bordet: x = langs dåsen, y = ind under bordet, z = op. Printes stående med 45°-ribber under den øverste bøjle.
    const o=[],cw=P.cw,L=P.sl+c,x0=-L/2,x1=L/2,U=underDeskPieces(S,P),Ht=top+tl;
    const X=(pl,a,b)=>extrude(o,pl,[],a,b,MAP_X);
    for(const [a,b] of [[x0,x0+cw],[x1-cw,x1]])for(const pl of [...U.arms,U.top,U.bump])X(pl,a,b);
    X(U.base,x0,x1);X(U.front,x0,x1);
    const xa=x0+cw;
    // ribber: overkæben (ind over bordet), armene (ned) og kanterne
    const W=(y0,y1,z0,z1,toZ)=>{const h=Math.abs(z1-z0);extrude(o,[[xa-0.1,toZ],[xa-0.1,toZ===z0?z1:z0],[xa+h,toZ]],[],-y1,-y0,(u,v,w)=>[u,-w,v]);};
    W(-U.th,U.jaw,U.T,U.T+U.th,U.T);
    for(const [y0,y1] of [[0,S.ta],[2*yo-S.ta,2*yo]])W(y0,y1,-Ht,-tb+0.1,-tb+0.1);
    const print=mapPts(o,(x,y,z)=>[z,y,x1-x]);
    const ghost=[];box(ghost,-L/2-40,L/2+40,0.3,2*yo+40,0,U.T);box(ghost,-P.sl/2,P.sl/2,yo-P.sw/2,yo+P.sw/2,-(tb+P.sh),-tb);
    return {view:o,ghost,print,warn,dims:[L,2*yo+U.th,Ht+U.T+U.th],standing:true};
  }
  if(P.form==='channel'){
    // to bøjler forbundet af en bjælke bagpå. Bygget med bunden nedad: x = langs dåsen, y = på tværs, z = op fra bunden
    const o=[],cw=P.cw,L=P.sl+c,x0=-L/2,x1=L/2,sk=P.mount==='skadis',dk=P.mount==='desk',stand=sk||dk,Ht=top+lip+1.2;
    // bordkant: klemme bag bunden (z<0), bordpladens overside i flugt med holderens top
    const yd=dk?yo-P.th-P.T:0,vb=dk?Math.min(-yo,yd-P.th):-yo;
    const bw=stand?yo-vb:Math.min(2*yo,P.bw),bc=stand?(yo+vb)/2:0;
    const clips=[[x0,x0+cw],[x1-cw,x1]];
    const useMag=P.mount==='magnet'&&magOK();
    for(const [a,b] of clips){const cx=(a+b)/2;
      const f=P.mount==='screw'?screwFeats(cx,0,P.sd,P.shd,tb,'s'+a):useMag?magFeats([[cx,-Sw/4],[cx,Sw/4]],P,'m'+a):[];
      layered(o,[[a,vb],[b,vb],[b,yo],[a,yo]],f,0,tb,!useMag);
      for(const arm of armPolys(S,'45'))extrude(o,arm.map(([u,v])=>[v,u]),[],a,b,MAP_X);
      if(dk){const jaw=P.jaw,th=P.th,sq=P.sq,T=P.T;
        extrude(o,[[-jaw,yd+T],[0.2,yd+T],[0.2,yo],[-jaw+1.5,yo],[-jaw,yo-1]].map(([u,v])=>[v,u]),[],a,b,MAP_X);
        extrude(o,[[0.2,yd-th],[0.2,yd],[-jaw+1.5,yd+sq+0.6],[-jaw,yd+sq],[-jaw,yd-th]].map(([u,v])=>[v,u]),[],a,b,MAP_X);}}
    box(o,x0+cw-1,x1-cw+1,bc-bw/2,bc+bw/2,0,tb);
    let print=o,view=o;
    if(dk){
      // printes stående (x1-enden nedad); den øverste bøjle får 45°-ribber under armene og klemmerne
      const xa=x0+cw,jaw=P.jaw,th=P.th,T=P.T;
      for(const s of [1,-1]){
        extrude(o,[[xa-0.1,0],[xa+Ht,0],[xa-0.1,Ht+0.1]].map(([x,z])=>[z,x]),[],s>0?ys-0.05:-yo,s>0?yo:-ys+0.05,(u,v,w)=>[v,w,u]);
        extrude(o,[[xa-0.1,top],[xa+(Ht-top),top],[xa-0.1,Ht]].map(([x,z])=>[z,x]),[],s>0?ys-lip:-ys,s>0?ys:-ys+lip,(u,v,w)=>[v,w,u]);}
      for(const [y0,y1] of [[yd+T,yo],[yd-th,yd]])
        extrude(o,[[xa-0.1,-jaw],[xa-0.1,0.1],[xa+jaw,0.1]].map(([x,z])=>[z,x]),[],y0,y1,(u,v,w)=>[v,w,u]);
      print=mapPts(o,(x,y,z)=>[z,y,x1-x]);
      view=mapPts(o,(x,y,z)=>[x,-z,y]);
    }
    if(sk){
      // hænger lodret: kroge øverst (x = x1); printes stående med den ende nedad. Den nederste bøjle får 45°-ribber.
      const A=-tb+0.3,mp=(u,v,w)=>[v,-w,-u];
      const put=pr=>{const tmp=[];extrude(tmp,pr,[],-SK.tw/2,SK.tw/2,MAP_Z);o.push(...mapPts(tmp,mp));};
      put(skHookProfile(A,x1,P.Tb));const low=skLowerProfile(A,x1,P.Tb,x0+cw+Ht+1,P.skLow||'hook');if(low)put(low);
      const xa=x0+cw;
      for(const s of [1,-1]){
        extrude(o,[[xa-0.1,0],[xa+Ht,0],[xa-0.1,Ht+0.1]].map(([x,z])=>[z,x]),[],s>0?ys-0.05:-yo,s>0?yo:-ys+0.05,(u,v,w)=>[v,w,u]);
        extrude(o,[[xa-0.1,top],[xa+(Ht-top),top],[xa-0.1,Ht]].map(([x,z])=>[z,x]),[],s>0?ys-lip:-ys,s>0?ys:-ys+lip,(u,v,w)=>[v,w,u]);}
      print=mapPts(o,(x,y,z)=>[z,y,x1-x]);
      view=mapPts(o,(x,y,z)=>[y,-z,x-x0]);
    }
    const ghost=[];
    if(sk)box(ghost,-P.sw/2,P.sw/2,-(tb+P.sh),-tb,0.25,L-0.25);
    else if(dk){box(ghost,-P.sl/2,P.sl/2,-(tb+P.sh),-tb,-P.sw/2,P.sw/2);box(ghost,-L/2-40,L/2+40,0,60,yd,yd+P.T);}
    else box(ghost,-P.sl/2,P.sl/2,-P.sw/2,P.sw/2,tb,tb+P.sh);
    return {view,ghost,print,warn,dims:[L,yo-vb,Ht+(dk?P.jaw:0)],standing:stand};
  }
  // stander: en bøjle vippet i vinklen 'ang' på en hul trekant; profil i print-XY (x bagud, y op), ekstruderet i z = bredde
  const o=[],a=P.ang*Math.PI/180,d=[Math.cos(a),Math.sin(a)],n=[-Math.sin(a),Math.cos(a)],tw=P.tw,w=P.cw;
  const h0=tw,O=[yo*d[0]-Math.min(0,-yo*d[0])+0.5,h0+yo*d[1]];
  const W2=(s,t)=>[O[0]+s*d[0]+t*n[0],O[1]+s*d[1]+t*n[1]];
  const Pf=W2(-yo,0),Pb=W2(yo,0);
  // bøjlen (bund + arme med kanter)
  const loc=[[[0,-yo],[tb,-yo],[tb,yo],[0,yo]],...armPolys(S,'lead')];
  for(const pl of loc)extrude(o,pl.map(([u,v])=>W2(v,u)),[],0,w,MAP_Z);
  // hul støttetrekant – starter oven på bundpladen, så bundpladens huller ikke bliver fyldt ud
  const off=tw,bx=Pb[0]-off,yAt=x=>Pf[1]+(x-Pf[0])*Math.tan(a)-off/Math.cos(a),xa=Pf[0]+(off-Pf[1]+off/Math.cos(a))/Math.tan(a);
  const sup=[[Pf[0]+0.05,tw-0.05],[Pb[0],tw-0.05],Pb];
  const hb=tw+0.5,xh=Pf[0]+(hb-Pf[1]+off/Math.cos(a))/Math.tan(a);
  const holes=[];if(bx-xh>6&&yAt(bx)-hb>6)holes.push([[xh+0.5,hb],[bx,hb],[bx,yAt(bx)]]);
  extrude(o,sup,holes,0,w,MAP_Z);
  // fod fremad, så dåsens tyngdepunkt ligger over foden
  const cg=W2(0,tb+P.sh/2),xf=Math.min(Pf[0],cg[0]-12);
  let x0=Math.min(xf,Pf[0]),xEnd=Pb[0];
  const sk=P.mount==='skadis',dk=P.mount==='desk',dBack=dk&&P.standDesk!=='front';
  // SKÅDIS: bunden forlænges nedad (bagud), så der er plads til den nederste krog/tap
  if(sk&&(P.skLow||'hook')!=='none')xEnd=Math.max(xEnd,x0+SK.pitch+SK.bh+SK.Ld+2.5);
  // skruehul i en tap bag standeren, hvor man kan komme til med skruetrækkeren
  let screwX=null;
  if(P.mount==='screw'){const tab=P.shd+6;screwX=xEnd+tab/2;xEnd+=tab;if(w<P.shd+3)warn.push('Standeren er smal i forhold til skruehovedet – gør den bredere.');}
  // bundplade (y∈[0,tw]) hele vejen; skruehul ovenfra eller magneter nedefra
  const base=[[x0,0],[xEnd,0],[xEnd,w],[x0,w]],bmid=(Math.max(xa+1,x0+4)+bx)/2;
  if(screwX!=null)layered(o,base,screwFeats(screwX,w/2,P.sd,P.shd,tw,'s'),-tw,0,false,MAP_Y);
  else if(P.mount==='magnet'){
    if(tw<magNeed(P)-1e-6){warn.push(`Godstykkelsen er for tynd til magneterne – øg til mindst ${f1n(magNeed(P))} mm.`);layered(o,base,[],-tw,0,true,MAP_Y);}
    else{const sp=Math.min((bx-Math.max(xa+1,x0+4))/2-P.magD/2-1,12);layered(o,base,magFeats(sp>P.magD/2+1?[[bmid-sp,w/2],[bmid+sp,w/2]]:[[bmid,w/2]],P),-tw,0,true,MAP_Y);}}
  else layered(o,base,[],-tw,0,true,MAP_Y);
  // bordkant: bunden er overkæben; plade ned langs kanten og kæbe ind under bordet – bagpå (standard) eller forrest
  if(dk){const T=P.T,th=P.th,jaw=P.jaw,sq=P.sq;
    if(dBack){const xe=xEnd;
      extrude(o,[[xe-0.1,-T-th],[xe+th,-T-th],[xe+th,0.1],[xe-0.1,0.1]],[],0,w,MAP_Z);
      extrude(o,[[xe-jaw,-T+sq],[xe-jaw,-T-th],[xe+th,-T-th],[xe+th,-T],[xe,-T],[xe-jaw+1.5,-T+sq+0.6]],[],0,w,MAP_Z);}
    else{extrude(o,[[x0-th,-T-th],[x0+0.1,-T-th],[x0+0.1,0.1],[x0-th,0.1]],[],0,w,MAP_Z);
      extrude(o,[[x0-th,-T-th],[x0+jaw,-T-th],[x0+jaw,-T+sq],[x0+jaw-1.5,-T+sq+0.6],[x0,-T],[x0-th,-T]],[],0,w,MAP_Z);}}
  // SKÅDIS: bunden mod pladen, forkanten opad; krog i profilen ved forkanten
  if(sk){const zh=P.hookPos==='center'?w/2-SK.tw/2:0,A=-tw+0.3,topV=-x0;
    const put=pr=>{const tmp=[];extrude(tmp,pr,[],-(zh+SK.tw),-zh,MAP_Z);o.push(...mapPts(tmp,(u,v,ww)=>[-v,-u,-ww]));};
    put(skHookProfile(A,topV,P.Tb));const low=skLowerProfile(A,topV,P.Tb,-xEnd+0.5,P.skLow||'hook');if(low)put(low);}
  const view=[],L=P.sl,ws=w>=P.sl*0.6;
  const vmap=sk?(xo=>(X,Y,Z)=>[xo-(Z-w/2),-Y,-X]):(xo=>(X,Y,Z)=>[xo+Z-w/2,X,Y]);
  const place=xo=>view.push(...mapPts(o,vmap(xo)));
  if(ws)place(0);else for(const xo of [-(L/2-w/2-10),L/2-w/2-10])place(xo);
  const gb=[];box(gb,-L/2,L/2,-P.sw/2,P.sw/2,0,P.sh);
  let ghost=mapPts(gb,(x,v,t)=>{const p=W2(v,tb+t);return [x,p[0],p[1]];});
  if(sk)ghost=mapPts(ghost,(x,X,Y)=>[x,-Y,-X]);
  if(dk){if(dBack)box(ghost,-L/2-40,L/2+40,xEnd-150,xEnd-0.3,-P.T,0);else box(ghost,-L/2-40,L/2+40,x0+0.3,x0+150,-P.T,0);}
  if(P.ang>70||P.ang<15)warn.push('Vinklen er meget stejl/flad – tjek at dåsen kan stå stabilt.');
  let mxy=0;for(let i=1;i<o.length;i+=3)mxy=Math.max(mxy,o[i]);
  return {view,ghost,print:layout(o,ws?1:Math.max(1,P.count|0)),warn,dims:[w,xEnd-x0+(dk?P.th:0),mxy+(dk?P.T+P.th:0)],wall:sk,skTop:-x0,screwX,x0,xEnd};
}
