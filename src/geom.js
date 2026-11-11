// ---------- Geometri (Z op, mm) ----------
function T(o,a,b,c){o.push(a[0],a[1],a[2],b[0],b[1],b[2],c[0],c[1],c[2]);}
function Q(o,a,b,c,d){T(o,a,b,c);T(o,a,c,d);}
function rr(w,d,r,seg){
  r=Math.max(0,Math.min(r,w/2-0.01,d/2-0.01));
  const pts=[],cs=[[w/2-r,d/2-r,0],[-w/2+r,d/2-r,90],[-w/2+r,-d/2+r,180],[w/2-r,-d/2+r,270]];
  for(const [cx,cy,a0] of cs){for(let i=0;i<=seg;i++){const a=(a0+90*(seg?i/seg:0))*Math.PI/180;pts.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]);}}
  return pts;
}
function prism(o,pts,z0,z1){
  if(z1<=z0)return;const n=pts.length;let cx=0,cy=0;pts.forEach(p=>{cx+=p[0];cy+=p[1]});cx/=n;cy/=n;
  for(let i=0;i<n;i++){const p=pts[i],q=pts[(i+1)%n];
    Q(o,[p[0],p[1],z0],[q[0],q[1],z0],[q[0],q[1],z1],[p[0],p[1],z1]);
    T(o,[cx,cy,z1],[p[0],p[1],z1],[q[0],q[1],z1]);
    T(o,[cx,cy,z0],[q[0],q[1],z0],[p[0],p[1],z0]);}
}
function tube(o,out,inn,z0,z1){
  if(z1<=z0)return;const n=out.length;
  for(let i=0;i<n;i++){const j=(i+1)%n,p=out[i],q=out[j],a=inn[i],b=inn[j];
    Q(o,[p[0],p[1],z0],[q[0],q[1],z0],[q[0],q[1],z1],[p[0],p[1],z1]);
    Q(o,[b[0],b[1],z0],[a[0],a[1],z0],[a[0],a[1],z1],[b[0],b[1],z1]);
    Q(o,[p[0],p[1],z1],[q[0],q[1],z1],[b[0],b[1],z1],[a[0],a[1],z1]);
    Q(o,[a[0],a[1],z0],[b[0],b[1],z0],[q[0],q[1],z0],[p[0],p[1],z0]);}
}
// afrundet rektangel som åben bane uden den forreste lige kant (starter ved hjørne 3, slutter ved hjørne 2)
function lo_(pts,n1){return pts.slice(3*n1).concat(pts.slice(0,3*n1));}
function band(o,O,I,z0,z1){
  const m=O.length;
  for(let i=0;i<m-1;i++){const p=O[i],q=O[i+1],a=I[i],b=I[i+1];
    Q(o,[p[0],p[1],z0],[q[0],q[1],z0],[q[0],q[1],z1],[p[0],p[1],z1]);
    Q(o,[b[0],b[1],z0],[a[0],a[1],z0],[a[0],a[1],z1],[b[0],b[1],z1]);
    Q(o,[p[0],p[1],z1],[q[0],q[1],z1],[b[0],b[1],z1],[a[0],a[1],z1]);
    Q(o,[a[0],a[1],z0],[b[0],b[1],z0],[q[0],q[1],z0],[p[0],p[1],z0]);}
  let p=O[0],a=I[0];Q(o,[a[0],a[1],z0],[p[0],p[1],z0],[p[0],p[1],z1],[a[0],a[1],z1]);
  p=O[m-1];a=I[m-1];Q(o,[p[0],p[1],z0],[a[0],a[1],z0],[a[0],a[1],z1],[p[0],p[1],z1]);
}
function box(o,x0,x1,y0,y1,z0,z1){if(x1<=x0||y1<=y0||z1<=z0)return;prism(o,[[x0,y0],[x1,y0],[x1,y1],[x0,y1]],z0,z1);}
function circ(cy,cz,r,s){const p=[];for(let k=0;k<s;k++){const a=2*Math.PI*k/s;p.push([cy+r*Math.cos(a),cz+r*Math.sin(a)]);}return p;}
function cylX(o,x0,x1,cy,cz,r,s=48){
  if(x1<=x0)return;const c=circ(cy,cz,r,s);
  for(let k=0;k<s;k++){const p=c[k],q=c[(k+1)%s];
    Q(o,[x1,p[0],p[1]],[x0,p[0],p[1]],[x0,q[0],q[1]],[x1,q[0],q[1]]);
    T(o,[x1,cy,cz],[x1,p[0],p[1]],[x1,q[0],q[1]]);
    T(o,[x0,cy,cz],[x0,q[0],q[1]],[x0,p[0],p[1]]);}
}
function tubeX(o,x0,x1,cy,cz,ro,ri,s=48){
  if(x1<=x0)return;const A=circ(cy,cz,ro,s),B=circ(cy,cz,ri,s);
  for(let k=0;k<s;k++){const j=(k+1)%s,p=A[k],q=A[j],a=B[k],b=B[j];
    Q(o,[x1,p[0],p[1]],[x0,p[0],p[1]],[x0,q[0],q[1]],[x1,q[0],q[1]]);
    Q(o,[x0,a[0],a[1]],[x1,a[0],a[1]],[x1,b[0],b[1]],[x0,b[0],b[1]]);
    Q(o,[x1,p[0],p[1]],[x1,q[0],q[1]],[x1,b[0],b[1]],[x1,a[0],a[1]]);
    Q(o,[x0,a[0],a[1]],[x0,b[0],b[1]],[x0,q[0],q[1]],[x0,p[0],p[1]]);}
}
// Stjerneformet polygon i (y,z) ekstruderet langs X; første punkt skal kunne "se" alle andre (vifte-triangulering)
function extX(o,pts,x0,x1){
  if(x1<=x0)return;const n=pts.length;
  for(let k=0;k<n;k++){const p=pts[k],q=pts[(k+1)%n];Q(o,[x1,p[0],p[1]],[x0,p[0],p[1]],[x0,q[0],q[1]],[x1,q[0],q[1]]);}
  for(let k=1;k<n-1;k++){const a=pts[0],p=pts[k],q=pts[k+1];T(o,[x1,a[0],a[1]],[x1,p[0],p[1]],[x1,q[0],q[1]]);T(o,[x0,a[0],a[1]],[x0,q[0],q[1]],[x0,p[0],p[1]]);}
}
function halfAt(x,hw,hd,r){r=Math.max(0,Math.min(r,hw,hd));const ax=Math.abs(x);if(ax<=hw-r)return hd;if(ax>=hw)return hd-r;const dx=ax-(hw-r);return hd-r+Math.sqrt(Math.max(0,r*r-dx*dx));}

// --- Triangulering af polygon med huller (øre-klipning med broer) ---
function inTri(p,a,b,c){
  const d1=(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]),d2=(c[0]-b[0])*(p[1]-b[1])-(c[1]-b[1])*(p[0]-b[0]),d3=(a[0]-c[0])*(p[1]-c[1])-(a[1]-c[1])*(p[0]-c[0]);
  return d1>=-1e-12&&d2>=-1e-12&&d3>=-1e-12;
}
const same=(p,q)=>Math.abs(p[0]-q[0])<1e-9&&Math.abs(p[1]-q[1])<1e-9;
function triangulate(outer,holes){
  let poly=outer.map(p=>p.slice());
  const hs=holes.map(h=>h.map(p=>p.slice())).sort((a,b)=>Math.max(...b.map(p=>p[0]))-Math.max(...a.map(p=>p[0])));
  for(const h of hs){
    let hi=0;for(let i=1;i<h.length;i++)if(h[i][0]>h[hi][0])hi=i;
    const M=h[hi];let best=Infinity,bi=-1;const n=poly.length;
    for(let i=0;i<n;i++){const a=poly[i],b=poly[(i+1)%n];
      if((a[1]>M[1])!==(b[1]>M[1])){const x=a[0]+(M[1]-a[1])*(b[0]-a[0])/(b[1]-a[1]);if(x>M[0]&&x<best){best=x;bi=a[0]>b[0]?i:(i+1)%n;}}}
    const I=[best,M[1]],Pp=poly[bi];let pick=bi,minA=Infinity;
    for(let i=0;i<n;i++){const v=poly[i];if(v[0]<M[0])continue;
      if(i===bi||inTri(v,M,I,Pp)||inTri(v,M,Pp,I)){const ang=Math.abs(Math.atan2(v[1]-M[1],v[0]-M[0]));
        if(ang<minA-1e-12||(Math.abs(ang-minA)<1e-12&&v[0]<poly[pick][0])){minA=ang;pick=i;}}}
    // Hvis punktet allerede bruges af en tidligere bro, vælg den forekomst hvis indvendige vinkel indeholder M
    const dups=[];for(let i=0;i<n;i++)if(same(poly[i],poly[pick]))dups.push(i);
    if(dups.length>1){
      const ang=(v,b)=>{let a=Math.atan2(v[1]-b[1],v[0]-b[0]);return a<0?a+2*Math.PI:a;};
      for(const i of dups){const b=poly[i],a=poly[(i+n-1)%n],c=poly[(i+1)%n];
        const a0=ang(c,b),rel=x=>{let r=x-a0;while(r<0)r+=2*Math.PI;while(r>=2*Math.PI)r-=2*Math.PI;return r;};
        if(rel(ang(M,b))<rel(ang(a,b))){pick=i;break;}}
    }
    const ring=h.slice(hi).concat(h.slice(0,hi+1)).map(p=>p.slice());
    poly=poly.slice(0,pick+1).concat(ring,[poly[pick].slice()],poly.slice(pick+1));
  }
  const tris=[];const idx=poly.map((_,i)=>i);let guard=0;
  while(idx.length>3&&guard++<200000){
    let found=false;const L=idx.length;
    for(let k=0;k<L;k++){
      const ia=idx[(k+L-1)%L],ib=idx[k],ic=idx[(k+1)%L],a=poly[ia],b=poly[ib],c=poly[ic];
      const cr=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(cr<=1e-10)continue;
      let ok=true;
      for(const j of idx){if(j===ia||j===ib||j===ic)continue;const p=poly[j];if(same(p,a)||same(p,b)||same(p,c))continue;if(inTri(p,a,b,c)){ok=false;break;}}
      if(ok){tris.push([a,b,c]);idx.splice(k,1);found=true;break;}
    }
    if(!found){ // fjern et kollineært/degenereret punkt
      let rm=-1;for(let k=0;k<L;k++){const a=poly[idx[(k+L-1)%L]],b=poly[idx[k]],c=poly[idx[(k+1)%L]];
        const cr=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(Math.abs(cr)<=1e-10){rm=k;break;}}
      if(rm<0)break;idx.splice(rm,1);
    }
  }
  if(idx.length===3){const [a,b,c]=idx.map(i=>poly[i]);if((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])>0)tris.push([a,b,c]);}
  return tris;
}
// plade med huller (huller angives i vilkårlig retning)
function plate(o,outer,holes,z0,z1){
  if(z1<=z0)return;
  const area=p=>{let a=0;for(let i=0;i<p.length;i++){const q=p[i],r=p[(i+1)%p.length];a+=q[0]*r[1]-r[0]*q[1];}return a;};
  const out=area(outer)>0?outer:outer.slice().reverse();
  const hs=holes.map(h=>area(h)<0?h:h.slice().reverse());
  for(const [a,b,c] of triangulate(out,hs)){T(o,[a[0],a[1],z1],[b[0],b[1],z1],[c[0],c[1],z1]);T(o,[a[0],a[1],z0],[c[0],c[1],z0],[b[0],b[1],z0]);}
  for(const L of [out,...hs])for(let i=0;i<L.length;i++){const p=L[i],q=L[(i+1)%L.length];
    Q(o,[p[0],p[1],z0],[q[0],q[1],z0],[q[0],q[1],z1],[p[0],p[1],z1]);}
}
// plade i lag: feats=[{d,hole}] hvor d er dybden målt fra den ene flade (top=true: fra oversiden)
function layered(o,outer,feats,zA,zB,top,map){
  const dst=map?[]:o;
  const th=zB-zA;const ds=[0,th,...feats.map(f=>Math.min(f.d,th))].sort((a,b)=>a-b).filter((v,i,a)=>i===0||v-a[i-1]>1e-6);
  for(let i=0;i<ds.length-1;i++){const d0=ds[i],d1=ds[i+1];
    const app=feats.filter(f=>f.d>=d1-1e-9),holes=[],grp=new Map();
    for(const f of app){if(f.g==null){holes.push(f.hole);continue;}const c=grp.get(f.g);if(!c||f.d<c.d)grp.set(f.g,f);}
    for(const f of grp.values())holes.push(f.hole);
    const z0=top?zB-d1:zA+d0,z1=top?zB-d0:zA+d1;
    if(holes.length)plate(dst,outer,holes,z0,z1);else plate(dst,outer,[],z0,z1);}
  if(map)pushMapped(o,dst,map);
}
// ekstrudering af en 2D-profil (u,v) langs w; map(u,v,w) skal være en rotation
const MAP_Z=(u,v,w)=>[u,v,w],MAP_X=(u,v,w)=>[w,u,v],MAP_Y=(u,v,w)=>[u,-w,v];
function pushMapped(o,src,map){for(let i=0;i<src.length;i+=3){const p=map(src[i],src[i+1],src[i+2]);o.push(p[0],p[1],p[2]);}}
function extrude(o,poly,holes,a0,a1,map){if(a1<=a0)return;const tmp=[];plate(tmp,poly,holes||[],a0,a1);pushMapped(o,tmp,map||MAP_Z);}
// C-formet ring (kabelkanal) med åbning i retning phi
function cRing(cx,cy,ri,ro,phi,ow,seg=48){
  const ao=Math.asin(Math.min(0.95,ow/2/ro)),ai=Math.asin(Math.min(0.95,ow/2/ri)),p=[];
  for(let k=0;k<=seg;k++){const a=phi+ao+(2*Math.PI-2*ao)*k/seg;p.push([cx+ro*Math.cos(a),cy+ro*Math.sin(a)]);}
  for(let k=0;k<=seg;k++){const a=phi+2*Math.PI-ai-(2*Math.PI-2*ai)*k/seg;p.push([cx+ri*Math.cos(a),cy+ri*Math.sin(a)]);}
  return p;
}
// rektangel med afrundede forhjørner (v fra 0 til d)
function rrFront(w,d,r,seg=8){r=Math.max(0,Math.min(r,w/2-0.01,d-0.01));const p=[[-w/2,0],[w/2,0]];
  if(r<0.05){p.push([w/2,d],[-w/2,d]);return p;}
  for(let k=0;k<=seg;k++){const a=Math.PI/2*k/seg;p.push([w/2-r+r*Math.cos(a),d-r+r*Math.sin(a)]);}
  for(let k=0;k<=seg;k++){const a=Math.PI/2+Math.PI/2*k/seg;p.push([-w/2+r+r*Math.cos(a),d-r+r*Math.sin(a)]);}
  return p;}
// forsænket skruehul (90°) som lag-features, gruppe g
function screwFeats(x,y,sd,hd,th,g){
  const sr=sd/2+0.15,hr=Math.max(sr+0.3,hd/2+0.2),cd=Math.min(hr-sr,th-0.8),f=[{d:th,hole:circ(x,y,sr,32),g}];
  for(let k=0;k<4;k++)f.push({d:cd*(k+1)/4,hole:circ(x,y,hr-(hr-sr)*k/4,32),g});
  return f;}
// tekst-bitmap → fyldkasser uden om bogstaverne (bogstaver bliver fordybninger)
function textFill(tb,cb){const open=new Map();
  for(let r=0;r<=tb.rows;r++){const runs=new Set();
    if(r<tb.rows){let c=0;while(c<tb.cols){if(tb.data[r*tb.cols+c]){c++;continue;}let c1=c;while(c1<tb.cols&&!tb.data[r*tb.cols+c1])c1++;runs.add(c+'-'+c1);c=c1;}}
    for(const k of [...open.keys()])if(!runs.has(k)){const o=open.get(k);cb(o.c0,o.c1,o.r0,r);open.delete(k);}
    for(const k of runs)if(!open.has(k)){const [c0,c1]=k.split('-').map(Number);open.set(k,{c0,c1,r0:r});}}
}

// ---------- Skillevægge ----------
// Tilføjer skillevægge og fingergreb i et indvendigt rum (iw×id, centreret i (ox,oy)), bund i z0, top i 'top'
function addDividers(o,S,iw,id,ir,z0,top,ox,oy){
  const dt=S.dt,DL=divLayout2(S,iw,id),{us,bands,U,V}=DL;
  const tmp=[];const wallBox=r=>box(tmp,r.x0,r.x1,r.y0,r.y1,z0-0.1,top);
  for(const u of us){const h=halfAt(u,U/2,V/2,ir)+0.3;wallBox(DL.rect(u-dt/2,u+dt/2,-h,h));}
  const cells=[];
  for(let c=0;c<=us.length;c++){
    for(const v of bands[c]){const h=halfAt(v,V/2,U/2,ir)+0.3;wallBox(DL.rect(c===0?-h:us[c-1],c===us.length?h:us[c],v-dt/2,v+dt/2));}
    const ua=c===0?-U/2:us[c-1]+dt/2,ub=c===us.length?U/2:us[c]-dt/2;
    const vs=[-V/2,...bands[c].slice().sort((a,b)=>a-b),V/2];
    for(let j=0;j<vs.length-1;j++){const va=j===0?-V/2:vs[j]+dt/2,vb=j===vs.length-2?V/2:vs[j+1]-dt/2;cells.push(DL.rect(ua,ub,va,vb));}
  }
  if(S.scoop>0){
    for(const cl of cells){
      const depth=cl.y1-cl.y0;let r=Math.min(S.scoop,depth*0.6,top-z0);if(r<1.5)continue;
      let x0=cl.x0,x1=cl.x1;
      const atFront=cl.y0<=-id/2+1e-6;
      if(atFront){x0=Math.max(x0,-(iw/2-ir));x1=Math.min(x1,iw/2-ir);}
      const leftWall=cl.x0<=-iw/2+1e-6,rightWall=cl.x1>=iw/2-1e-6;
      x0-=leftWall?0:0.1;x1+=rightWall?0:0.1;
      if(leftWall&&!atFront)x0=Math.max(x0,-halfAt(cl.y0+r,id/2,iw/2,ir));
      if(rightWall&&!atFront)x1=Math.min(x1,halfAt(cl.y0+r,id/2,iw/2,ir));
      if(x1-x0<2)continue;
      const y0=cl.y0,pts=[[y0-0.2,z0-0.1],[y0+r,z0-0.1]];
      for(let k=0;k<=12;k++){const a=(270-90*k/12)*Math.PI/180;pts.push([y0+r+r*Math.cos(a),z0+r+r*Math.sin(a)]);}
      pts.push([y0-0.2,z0+r]);
      extX(tmp,pts,x0,x1);
    }
  }
  for(let i=0;i<tmp.length;i+=3)o.push(tmp[i]+ox,tmp[i+1]+oy,tmp[i+2]);
  return cells.map(c=>({x0:c.x0+ox,x1:c.x1+ox,y0:c.y0+oy,y1:c.y1+oy}));
}
// P.divMode 'cols': primære vægge lodrette (langs dybden), sekundære vandrette pr. kolonne.
// P.divMode 'rows': primære vægge vandrette (langs bredden), sekundære lodrette pr. række.
// P.xs = primære positioner (brøkdel 0..1), P.cols[c] = sekundære i bånd c (brøkdel 0..1)
function divLayout(E){return divLayout2(E,E.W-2*E.t,E.D-2*E.t);}
function divLayout2(E,iw,id){
  const rows=E.divMode==='rows';
  const U=rows?id:iw,V=rows?iw:id;
  const us=(E.xs||[]).map(f=>-U/2+f*U).sort((a,b)=>a-b);
  const bands=us.concat([0]).map((_,c)=>((E.cols||[])[c]||[]).map(f=>-V/2+f*V));
  const toXY=(u,v)=>rows?[v,u]:[u,v];
  const rect=(u0,u1,v0,v1)=>rows?{x0:v0,x1:v1,y0:u0,y1:u1}:{x0:u0,x1:u1,y0:v0,y1:v1};
  return {iw,id,U,V,us,bands,rows,toXY,rect};
}
function eff(P){
  const E=Object.assign({},P);
  E.mr=P.magD/2+0.15;E.md=P.magH+0.2;
  const hasText=!!(P.tb&&P.text&&P.text.trim());
  E.fbB=P.mag?Math.max(P.fb,E.md+0.8):P.fb;
  E.fbL=Math.max(P.fb,P.mag?E.md+0.8:0,hasText?P.textDepth+0.8:0);
  E.hasText=hasText;
  if(P.dimMode==='inner'){E.W=P.W+2*P.t;E.D=P.D+2*P.t;E.Hb=P.Hb+E.fbB;}
  return E;
}
function magCenters(E){
  const iw=E.W-2*E.t,id=E.D-2*E.t,ir=Math.max(0,E.R-E.t),mr=E.mr;
  const m=Math.max(mr+0.6,ir-(ir-mr-0.6)/Math.SQRT2);
  const cx=iw/2-m,cy=id/2-m;
  return {pts:[[cx,cy],[-cx,cy],[-cx,-cy],[cx,-cy]],m,ok:cx>mr+1&&cy>mr+1};
}

function build(P){
  const E=eff(P);
  const warn=[],B=[],L=[];
  const {W,D,Hb,Hl,t,kr,hc}=E,fbB=E.fbB,fbL=E.fbL;
  const R=Math.max(0,Math.min(E.R,W/2-0.5,D/2-0.5));
  const H=Hb+Hl,za=H/2,ay=D/2+kr+hc;
  const pr=Math.max(1.0,kr*0.5),ri=pr+hc;
  if(kr-ri<1.0)warn.push('Ledradius er lille i forhold til frigangen – leddene bliver tynde. Øg ledradius.');
  if(za-kr<0)warn.push('Ledradius er større end halvdelen af den samlede højde. Gør æsken højere eller leddene mindre.');
  const seg=R>0.05?8:0;
  const out=rr(W,D,R,seg),inn=rr(W-2*t,D-2*t,R-t,seg);
  const iw=W-2*t,id=D-2*t,ir=Math.max(0,R-t);
  if(Hb-fbB<3)warn.push('Bunden er meget lav i forhold til bundtykkelsen.');
  if(Hl-fbL<1.5)warn.push('Låget er for lavt til lågets toptykkelse – gør låget højere.');

  // magneter
  let magHoles=[];
  if(E.mag){const mc=magCenters(E);
    if(!mc.ok)warn.push('Der er ikke plads til magneterne – gør æsken større eller magneterne mindre.');
    else magHoles=mc.pts.map(([x,y])=>circ(x,y,E.mr,32));}

  // ---- bund ----
  layered(B,out,magHoles.map(h=>({d:E.md,hole:h})),0,fbB,false);
  if(P.tbF){
    // forvæggen som separat plade med fordybet tekst; resten af væggen som en åben bane
    const n1=seg+1,tbF=P.tbF,xs=W/2-R;
    band(B,lo_(out,n1),lo_(inn,n1),0,Hb);
    const x0=-tbF.cols*tbF.res/2,zt=Hb/2+tbF.rows*tbF.res/2,zb=zt-tbF.rows*tbF.res;
    layered(B,[[-xs,0],[xs,0],[xs,Hb],[-xs,Hb]],[{d:E.textDepth,hole:[[x0,zb],[-x0,zb],[-x0,zt],[x0,zt]]}],D/2-t,D/2,true,MAP_Y);
    textFill(tbF,(c0,c1,r0,r1)=>box(B,x0+c0*tbF.res,x0+c1*tbF.res,-D/2,-D/2+E.textDepth,zt-r1*tbF.res,zt-r0*tbF.res));
  }else tube(B,out,inn,0,Hb);

  // ---- låg ----
  const lidFeats=magHoles.map(h=>({d:E.md,hole:h}));
  let tb=null;
  if(E.hasText){
    tb=P.tb;const x0=-tb.cols*tb.res/2,y1=tb.rows*tb.res/2;
    lidFeats.push({d:E.textDepth,hole:[[x0,-y1],[-x0,-y1],[-x0,y1],[x0,y1]]});
    // fyld uden om bogstaverne (bogstaverne bliver fordybninger)
    const zt0=H-E.textDepth,open=new Map();
    const flush=(k,r)=>{const o=open.get(k);box(L,x0+o.c0*tb.res,x0+o.c1*tb.res,y1-r*tb.res,y1-o.r0*tb.res,zt0,H);open.delete(k);};
    for(let r=0;r<=tb.rows;r++){
      const runs=new Set();
      if(r<tb.rows){let c=0;while(c<tb.cols){if(tb.data[r*tb.cols+c]){c++;continue;}let c1=c;while(c1<tb.cols&&!tb.data[r*tb.cols+c1])c1++;runs.add(c+'-'+c1);c=c1;}}
      for(const k of [...open.keys()])if(!runs.has(k))flush(k,r);
      for(const k of runs)if(!open.has(k)){const [c0,c1]=k.split('-').map(Number);open.set(k,{c0,c1,r0:r});}
    }
  }
  layered(L,out,lidFeats,H-fbL,H,true);
  tube(L,out,inn,Hb,H);

  let lipH=0,lipInfo=null;
  if(E.lip){
    lipH=Math.min(E.lipH,Hb-fbB-1);
    if(lipH<E.lipH)warn.push('Kanthøjden er gjort mindre, så den kan være i bunden.');
    const lb=Math.max(0.6,Math.min(1.5,Hl-fbL));
    const ow=W-2*t-2*E.fit,od=D-2*t-2*E.fit,orr=R-t-E.fit;
    const lo=rr(ow,od,orr,seg),li=rr(ow-2*E.lipT,od-2*E.lipT,orr-E.lipT,seg);
    if(za>=Hb-1e-6){
      tube(L,lo,li,Hb-lipH,Hb+lb);
    }else{
      const yw=halfAt(ow/2,(W-2*t)/2,(D-2*t)/2,Math.max(0,R-t))-E.fit;
      const y1f=(y,z)=>{const dy=y-ay,dz=z-za,rho=Math.hypot(dy,dz);const s=(Hb-za)/rho;if(s>=1)return y;const f=Math.PI-Math.asin(s);return Math.max(y,ay+rho*Math.cos(f));};
      let lo_=-od/2,hi_=od/2;
      for(let it=0;it<50;it++){const m=(lo_+hi_)/2;let ok=true;for(let k=0;k<=6;k++){if(y1f(m,Hb-lipH*k/6)>yw){ok=false;break;}}if(ok)lo_=m;else hi_=m;}
      const rc=Math.max(0,Math.min(orr,ow/2-0.01,od/2-0.01));
      const ye=Math.min(lo_,od/2-rc-0.01,od/2-E.lipT-0.01);
      if(ye>-od/2+rc+2){
        const n1=seg+1,ow2=ow/2,iw2=ow/2-E.lipT;
        const O=[[-ow2,ye],...lo.slice(2*n1,4*n1),[ow2,ye]],I=[[-iw2,ye],...li.slice(2*n1,4*n1),[iw2,ye]];
        band(L,O,I,Hb-lipH,Hb+lb);
      }else warn.push('Hængslet sidder for langt fra kanten til at låget kan få en indvendig kant – slå den fra eller gør låget højere.');
    }
    tube(L,rr(W-t,D-t,R-t/2,seg),li,Hb,Hb+lb);
    lipInfo={od,ow,rc:Math.max(0,Math.min(orr,ow/2-0.01,od/2-0.01))};
  }
  // klik-lås: en lille knast på lågets kant, der klikker forbi en tilsvarende knast på bundens forvæg
  if(E.latch&&E.lip&&lipInfo){
    const avail=lipH-0.6,bh=Math.min(1.2,avail/2-0.05);
    if(bh<0.5)warn.push('Kanthøjden er for lav til klik-låsen – øg kanthøjden til mindst 2,5 mm.');
    else{
      const lw=Math.min(20,lipInfo.ow-2*lipInfo.rc-4);
      if(lw>4){
        const b=(E.latchS+E.fit)/2,yf=-lipInfo.od/2,yw=-id/2;
        const za1=Hb-lipH+0.3,zc1=za1+bh,za2=zc1+0.1,zc2=za2+bh;
        extX(L,[[yf+0.05,za1],[yf+0.05,zc1],[yf-b,(za1+zc1)/2]],-lw/2,lw/2);
        extX(B,[[yw-0.05,za2],[yw+b,(za2+zc2)/2],[yw-0.05,zc2]],-lw/2-2,lw/2+2);
      }
    }
  }
  if(E.grip){const gw=Math.min(24,W-2*R-4);if(gw>4)box(L,-gw/2,gw/2,-D/2-2.5,-D/2+t/2,Hb,H);}

  // ---- skillevægge ----
  const dt=E.dt;
  const topFull=E.lip?Hb-lipH-E.fit-0.2:Hb-0.2;
  const top=fbB+(topFull-fbB)*Math.max(0.1,Math.min(1,(E.divH||100)/100));
  const cells=addDividers(B,E,iw,id,ir,fbB,top,0,0);

  // ---- hængsel ----
  const n=E.n,g=hc,Lh=W-2*Math.max(R,t)-2,sl=(Lh-(n-1)*g)/n;
  if(sl<3)warn.push('For mange led til bredden – vælg færre led.');
  else{
    for(let i=0;i<n;i++){const x0=-Lh/2+i*(sl+g),x1=x0+sl;
      if(i%2===0){
        cylX(B,x0,x1,ay,za,kr);
        box(B,x0,x1,D/2-t/2,ay,0,Math.min(za,Hb));
        if(za>Hb)box(B,x0,x1,D/2+hc,ay,0,za);
      }else{
        tubeX(L,x0,x1,ay,za,kr,ri);
        const ym=ay-(ri+kr)/2;
        box(L,x0,x1,D/2-t/2,ym,Math.max(za,Hb),H);
        if(za<Hb)box(L,x0,x1,D/2+hc,ym,za,H);
      }
    }
    cylX(B,-Lh/2+sl/2,Lh/2-sl/2,ay,za,pr,32);
  }
  return {B,L,ay,za,H,E,warn,cells,inner:[iw,id,Hb-fbB],outer:[W,ay+kr+D/2,H],printLen:2*ay+D};
}
// Lille testprint af hængslet med samme frigang og ledstørrelse
function hingeTestParams(P){
  const h=Math.max(2*P.kr+2,8);
  return {W:34,D:12,Hb:h,Hl:h,R:0,t:P.t,fb:P.fb,lip:false,lipH:3,lipT:1.2,fit:P.fit,grip:false,latch:false,latchS:0.4,
    n:3,kr:P.kr,hc:P.hc,divMode:'cols',xs:[],cols:[[]],dt:1.2,divH:100,scoop:0,mag:false,magD:6,magH:2,text:'',textDepth:0.6,textSize:8,dimMode:'outer'};
}
function rotLid(L,ay,za,deg){
  const th=deg*Math.PI/180,c=Math.cos(th),s=Math.sin(th),o=new Array(L.length);
  for(let i=0;i<L.length;i+=3){const dy=L[i+1]-ay,dz=L[i+2]-za;o[i]=L[i];o[i+1]=ay+dy*c+dz*s;o[i+2]=za-dy*s+dz*c;}
  return o;
}
function printTris(m){const all=m.B.concat(rotLid(m.L,m.ay,m.za,180));for(let i=1;i<all.length;i+=3)all[i]-=m.ay;return all;}
function stl(tris){
  const n=tris.length/9,buf=new ArrayBuffer(84+n*50),dv=new DataView(buf);
  const hdr='Haengslet aeske - print-in-place';for(let i=0;i<hdr.length;i++)dv.setUint8(i,hdr.charCodeAt(i));
  dv.setUint32(80,n,true);let o=84;
  for(let i=0;i<tris.length;i+=9){
    const ax=tris[i],ayy=tris[i+1],az=tris[i+2],bx=tris[i+3],by=tris[i+4],bz=tris[i+5],cx=tris[i+6],cy=tris[i+7],cz=tris[i+8];
    let nx=(by-ayy)*(cz-az)-(bz-az)*(cy-ayy),ny=(bz-az)*(cx-ax)-(bx-ax)*(cz-az),nz=(bx-ax)*(cy-ayy)-(by-ayy)*(cx-ax);
    const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
    dv.setFloat32(o,nx,true);dv.setFloat32(o+4,ny,true);dv.setFloat32(o+8,nz,true);o+=12;
    for(let k=0;k<9;k++){dv.setFloat32(o,tris[i+k],true);o+=4;}
    dv.setUint16(o,0,true);o+=2;
  }
  return new Uint8Array(buf);
}
