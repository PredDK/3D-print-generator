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
  const sd=P.D-t,dw=sw-2*c,dd=sd-c;
  const iw=dw-2*P.dwt,id=dd-P.dwt-P.ft,ir=Math.max(0,Math.min(P.rd,dw/2-1,dd/2-1)-P.dwt),oy=(P.ft-P.dwt)/2;
  const nd=P.handle==='notch'?Math.min(dh*0.45,P.nd):0;
  return {n,sw,sh,sd,dw,dh,dd,iw,id,ir,oy,nd,z,rail,bumpD:c*0.45,bumpC:c*0.55+0.45};
}
function buildCabinet(P,C){
  const o=[],{W,D,H,t,st}=P;
  if(!C.rail){
    box(o,-W/2,W/2,D/2-t,D/2,0,H);
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
function taperFeats(cs,cz,th,deg,extra){const n=deg>0.05?Math.max(4,Math.min(12,Math.ceil(th/0.8))):1,tn=Math.tan(deg*Math.PI/180),f=[];
  cs.forEach((c,i)=>{for(let k=0;k<n;k++)f.push({d:th*(k+1)/n,hole:holePoly(c,cz,th*(n-1-k)/n*tn),g:i});if(extra)extra(c,i,f);});return f;}
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
    if(taper>0&&hd*tn>Math.min(P.hgap,m)*0.9)warn.push('Tilspidsningen er så stor, at hullerne næsten løber sammen i toppen – mindsk vinklen eller øg afstanden.');
    const feats=taperFeats(L.cs,0,hd,taper,(c,i,f)=>{if(P.drain)f.push({d:H,hole:circ(c.cx,0,1.6,24),g:i});});
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
  layered(o,back,sf,0,tb,true);
  const shelf=rrFront(W,Dsh,R);
  // hylde med tilspidsede huller (bredest i oversiden)
  layered(o,shelf,taperFeats(L.cs,tb+gap+L.dmax/2,ts,taper),-Hb,-(Hb-ts),false,MAP_Y);
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
function buildCable(P){
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
  const bt=P.bt,zb=bt-0.8,cz=bt+ro-0.8,yc0=0,yN=(N-1)*pitch,scr=P.mount==='screw',two=scr&&P.nscrew===2;
  const tab=scr?P.shd+6:2;
  const y0=-ro-tab,y1=yN+ro+(two?tab:scr?0:2);
  const Rb=Math.min(3,w/2-0.5);
  const base=rr(w,y1-y0,Rb,6).map(([x,y])=>[x,y+(y0+y1)/2]);
  const feats=scr?screwFeats(0,-ro-tab/2,P.sd,P.shd,bt,'s'):[];
  if(two)feats.push(...screwFeats(0,yN+ro+tab/2,P.sd,P.shd,bt,'s2'));
  layered(o,base,feats,0,bt,true);
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
  prism(o,out,0,H-depth+0.01);
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
  prism(o,circ(0,0,Ro,s),0,fb);
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
function buildStrip(P){
  const warn=[],c=0.5,Sw=P.sw+c,Sh=P.sh+c,tb=P.tb,ta=P.ta,lip=P.lip,tl=P.tl;
  const ys=Sw/2,yo=Sw/2+ta;
  if(P.form==='clip'){
    // profil i print-XY: X = ud fra væggen (bund X∈[0,tb]), Y = på tværs af dåsen; ekstruderet i Z = bøjlens bredde
    const o=[],cw=P.cw,top=tb+Sh,ch=Math.min(1.5,tl*0.6,lip*0.6);
    // bund med evt. forsænket skruehul (hovedet inde i bøjlen)
    const feats=P.mount==='screw'?screwFeats(0,cw/2,P.sd,P.shd,tb,'s'):[];
    if(P.mount==='screw'&&cw<P.shd+3)warn.push('Bøjlen er smal i forhold til skruehovedet – gør den bredere.');
    layered(o,[[-yo,0],[yo,0],[yo,cw],[-yo,cw]],feats,0,tb,true,MAP_X);
    // arme med kanter (afrundet indløb foroven)
    for(const s of [1,-1]){const arm=[[tb-0.2,ys],[top,ys],[top,ys-lip],[top+tl-ch,ys-lip],[top+tl,ys-lip+ch],[top+tl,yo],[tb-0.2,yo]].map(([x,y])=>[x,s*y]);
      extrude(o,arm,[],0,cw,MAP_Z);}
    let hooks=false;
    if(P.mount==='skadis'){
      const zh=P.hookPos==='center'?cw/2-SK.tw/2:0,A=-tb+0.3;
      const put=pr=>{const tmp=[];extrude(tmp,pr,[],-(zh+SK.tw),-zh,MAP_Z);o.push(...mapPts(tmp,(u,v,w)=>[-u,v,-w]));};
      put(skHookProfile(A,yo,P.Tb));const low=skLowerProfile(A,yo,P.Tb,-yo+0.5,P.skLow||'hook');if(low)put(low);hooks=true;
      if(!low&&P.skLow!=='none')warn.push('Holderen er for lav til den nederste SKÅDIS-krog – dåsen skal være mindst ca. 50 mm bred.');}
    // visning: væggen bag (−y), dåsen vandret
    const view=[],L=P.sl;
    for(const xo of [-(L/2-cw-10),L/2-cw-10])view.push(...mapPts(o,(X,Y,Z)=>[xo+cw/2-Z,-X,Y]));
    const ghost=[];box(ghost,-L/2,L/2,-(tb+Sh-0.3),-tb,-P.sw/2,P.sw/2);
    return {view,ghost,print:layout(o,Math.max(1,P.count|0)),warn,dims:[cw,tb+Sh+tl,2*yo],needsSupport:P.mount==='skadis'&&P.hookPos==='center',board:P.mount==='skadis'?{y:0,axis:'y'}:null};
  }
  if(P.form==='channel'){
    // bygget med bunden nedad: x = langs dåsen, y = på tværs, z = op fra bunden
    const o=[],L=P.sl+2*c+(P.ends==='stop'?2*P.te:0),x0=-L/2,x1=L/2,top=tb+Sh;
    const holes=[];
    if(P.mount==='screw'){const n=Math.max(2,Math.round(L/120)+1);for(let i=0;i<n;i++){const x=x0+20+(L-40)*i/(n-1);holes.push(...screwFeats(x,0,P.sd,P.shd,tb,'s'+i));}}
    layered(o,[[x0,-yo],[x1,-yo],[x1,yo],[x0,yo]],holes,0,tb,true);
    for(const s of [1,-1]){const arm=[[ys,tb-0.2],[ys,top],[ys-lip,top+lip],[ys-lip,top+lip+1.2],[yo,top+lip+1.2],[yo,tb-0.2]].map(([y,z])=>[s*y,z]);
      extrude(o,arm,[],x0,x1,MAP_X);}
    if(P.ends==='stop'){const zt=top+lip+1.2,cn=Math.min(P.cn,Sw-4);
      for(const [a,b,notch] of [[x0,x0+P.te,true],[x1-P.te,x1,false]]){
        const pr=notch?[[-yo,0],[yo,0],[yo,zt],[cn/2,zt],[cn/2,tb+Math.min(8,Sh/3)],[-cn/2,tb+Math.min(8,Sh/3)],[-cn/2,zt],[-yo,zt]]:[[-yo,0],[yo,0],[yo,zt],[-yo,zt]];
        extrude(o,pr,[],a,b,MAP_X);}}
    let print=o,view=o,hooks=false;
    if(P.mount==='skadis'){
      // hænger lodret: kroge for enden (x = x1 er øverst), printes stående med den ende nedad
      const A=-tb+0.3,mp=(u,v,w)=>[v,-w,-u];
      const put=pr=>{const tmp=[];extrude(tmp,pr,[],-SK.tw/2,SK.tw/2,MAP_Z);o.push(...mapPts(tmp,mp));};
      put(skHookProfile(A,x1,P.Tb));const low=skLowerProfile(A,x1,P.Tb,x0+0.5,P.skLow||'hook');if(low)put(low);hooks=true;
      print=mapPts(o,(x,y,z)=>[z,y,x1-x]);
      view=mapPts(o,(x,y,z)=>[y,-z,x-x0]);
    }
    const ghost=[];
    if(P.mount==='skadis')box(ghost,-P.sw/2,P.sw/2,-(tb+P.sh),-tb,(L-P.sl)/2,(L+P.sl)/2);
    else box(ghost,-P.sl/2,P.sl/2,-P.sw/2,P.sw/2,tb,tb+P.sh);
    return {view,ghost,print,warn,dims:[L,2*yo,top+lip+1.2],standing:P.mount==='skadis'};
  }
  // stander: profil i print-XY (x bagud, y op), ekstruderet i z = bredde (langs dåsen)
  const o=[],a=P.ang*Math.PI/180,d=[Math.cos(a),Math.sin(a)],n=[-Math.sin(a),Math.cos(a)],tw=P.tw,w=P.cw;
  const tlp=tl,lipH=Math.max(4,P.lipS),h0=tw,S0=[tlp*Math.cos(a)+0.5,h0],Ls=Sw+2,S1=[S0[0]+d[0]*Ls,S0[1]+d[1]*Ls];
  const L0=[S0[0]-d[0]*tlp,S0[1]-d[1]*tlp];
  const prof=[[L0[0],0],[S1[0],0],S1,S0,[S0[0]+n[0]*lipH,S0[1]+n[1]*lipH],[L0[0]+n[0]*lipH,L0[1]+n[1]*lipH],L0];
  // fjern punkter med samme x på bunden og sørg for at forkanten går lodret ned
  const outer=prof.filter((p,i)=>i===0||Math.hypot(p[0]-prof[i-1][0],p[1]-prof[i-1][1])>1e-6);
  // hult inderst: trekant forskudt tw ind fra bund, bagkant og sæde
  const off=tw,bx=S1[0]-off;
  const yAt=x=>S0[1]+(x-S0[0])*Math.tan(a)-off/Math.cos(a);
  const xa=(off-S0[1]+off/Math.cos(a))/Math.tan(a)+S0[0];
  const holes=[];
  if(bx-xa>6&&yAt(bx)-off>6)holes.push([[xa+1,off],[bx,off],[bx,yAt(bx)]]);
  // bundens skruehuller laves som separat plade (X,Z) gennem y∈[0,tw]
  const base=[[L0[0],0],[S1[0],0],[S1[0],w],[L0[0],w]];
  if(P.mount==='screw'){const bmid=(Math.max(xa+1,4)+bx)/2;
    layered(o,base,screwFeats(bmid,w/2,P.sd,P.shd,tw,'s'),-tw,0,false,MAP_Y);
    if(w<P.shd+3)warn.push('Standeren er smal i forhold til skruehovedet – gør den bredere.');}
  extrude(o,outer,holes,0,w,MAP_Z);
  // fod fremad, så dåsens tyngdepunkt altid ligger over foden (ellers vælter den ved stejle vinkler)
  const cx=S0[0]+d[0]*(Sw/2)+n[0]*(P.sh/2),xf=Math.min(L0[0],cx-12);
  if(xf<L0[0]-0.5)extrude(o,[[xf,0],[L0[0]+1,0],[L0[0]+1,tw],[xf+tw*0.5,tw]],[],0,w,MAP_Z);
  const view=[],L=P.sl,ws=w>=P.sl*0.6;
  const place=(xo)=>view.push(...mapPts(o,(X,Y,Z)=>[xo+Z-w/2,X,Y]));
  if(ws)place(0);else for(const xo of [-(L/2-w/2-10),L/2-w/2-10])place(xo);
  // dåsen på sædet (til visning)
  const ghost=[];const gb=[];box(gb,-L/2,L/2,0,Sw-c,0,P.sh);
  ghost.push(...mapPts(gb,(x,y,z)=>{const px=S0[0]+d[0]*(y+0.5)+n[0]*z,py=S0[1]+d[1]*(y+0.5)+n[1]*z;return [x,px,py];}));
  if(P.ang>70||P.ang<15)warn.push('Vinklen er meget stejl/flad – tjek at dåsen kan ligge stabilt.');
  return {view,ghost,print:layout(o,ws?1:Math.max(1,P.count|0)),warn,dims:[w,S1[0]-Math.min(xf,L0[0]),Math.max(S1[1],S0[1]+n[1]*lipH)]};
}
