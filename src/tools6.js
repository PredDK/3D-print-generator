
// ================= JULELYS-KROGE =================
// Profil i (x,y): x = udad (væk fra huset), y = op. Ekstruderes langs z (bredden) og printes med profilen fladt.
const DEG=Math.PI/180;
const dedupe=(a,eps=0.3)=>a.filter((p,i)=>i===0||Math.hypot(p[0]-a[i-1][0],p[1]-a[i-1][1])>eps);
const stroke2=(pts,t)=>strokePoly(dedupe(pts),t);
// krog/clips under et punkt (x0,y0): lige stykke ned og en J-krog eller en klik-ring til kablet
function lightHookPath(x0,y0,P,dir=1){
  const pts=[],t=P.t,L=Math.max(P.drop,t+1);
  pts.push([x0,y0]);
  if(P.htype==='clip'){const rc=P.cd/2+0.2+t/2,cy=y0-L-rc;pts.push([x0,cy+rc]);
    // ring rundt om kablet med åbning udad/opad
    const a0=90*DEG,op=P.open*DEG;arcPts(pts,x0+0*dir,cy,rc,a0,a0+dir*(360*DEG-op),48);
    return {pts,low:cy-rc-t/2};}
  const rh=P.hr+t/2,yb=y0-L;pts.push([x0,yb]);
  arcPts(pts,x0+dir*rh,yb,rh,dir>0?Math.PI:0,dir>0?2*Math.PI:-Math.PI,24);
  if(P.tip>0.5)pts.push([x0+dir*2*rh,yb+P.tip]);
  return {pts,low:yb-rh-t/2};
}
function buildGutterHook(P){
  const o=[],warn=[],t=P.t,w=P.w,rb=P.bd/2,rm=rb+P.c+t/2,op=P.gop*DEG,mid=P.gdir*DEG;
  // C-ring om den rullede kant, åbning mod renden
  const a1=mid-op/2,a0=mid+op/2-2*Math.PI;const ring=[];ring.push([rm*Math.cos(a1),rm*Math.sin(a1)]);
  arcPts(ring,0,0,rm,a1,a0,64);   // med uret hele vejen rundt til den anden side af åbningen
  // krogen udgår fra ringens yderste punkt forneden (vinkel -60°)
  const ah=-60*DEG,hx=rm*Math.cos(ah),hy=rm*Math.sin(ah);
  const H=lightHookPath(hx,hy,P,1);
  extrude(o,stroke2(ring,t),[],0,w,MAP_Z);
  extrude(o,stroke2(H.pts,t),[],0,w,MAP_Z);
  // indføringsflige på åbningens kanter, så den klikker let på
  if(op>=150*DEG)warn.push('Åbningen er stor – clipsen kan falde af. Brug 90–130°.');
  if(op<70*DEG)warn.push('Åbningen er lille – den bliver svær at klikke på kanten.');
  // spøgelse: rullet kant + halvrund rende
  const g=[],R=P.gR;extrude(g,circ(0,0,rb-0.05,48),[circ(0,0,Math.max(0.5,rb-1.2),48)],-60,w+60,MAP_Z);
  const cx=-rb-R+0.6,hp=[];for(let k=0;k<=48;k++){const a=Math.PI+k/48*Math.PI;hp.push([cx+R*Math.cos(a),R*Math.sin(a)]);}
  for(let k=48;k>=0;k--){const a=Math.PI+k/48*Math.PI;hp.push([cx+(R-0.8)*Math.cos(a),(R-0.8)*Math.sin(a)]);}
  extrude(g,hp,[],-60,w+60,MAP_Z);
  return {o,g,warn};
}
function buildRoofClip(P){
  const o=[],warn=[],t=P.ct,w=P.w,E=P.E+P.c2,Lg=P.Lg,sq=P.sq2,hw=E/2;
  // U over kanten
  extrude(o,[[-hw-t,0],[hw+t,0],[hw+t,t],[-hw-t,t]].map(([x,y])=>[x,y]),[],0,w,MAP_Z);
  for(const s of [-1,1]){const xi=s*hw,xo=s*(hw+t);
    extrude(o,(s<0?[[xo,-Lg],[xi,-Lg],[xi,0.1],[xo,0.1]]:[[xi,-Lg],[xo,-Lg],[xo,0.1],[xi,0.1]]),[],0,w,MAP_Z);
    // klemvulst og udadbøjet indføring forneden
    const yb=-Lg,vb=[[xi,yb+6],[xi-s*sq,yb+3.5],[xi,yb+1]];if(sq>0.05)extrude(o,s<0?vb.slice().reverse():vb,[],0,w,MAP_Z);
    const fl=[[xi,yb],[xo,yb],[xo+s*1.6,yb-2.5],[xi+s*1.6,yb-2.5]];extrude(o,s<0?fl:fl.slice().reverse(),[],0,w,MAP_Z);
    if(P.side==='both'||(P.side==='out'&&s>0)||(P.side==='in'&&s<0)){
      const P2={...P,t:Math.max(P.t,2)},y0=-Lg*P.hpos,H=lightHookPath(xo+s*(P2.t/2+0.5),y0,P2,s);
      const pts=[[xo-s*t/2,y0],...H.pts];
      extrude(o,stroke2(pts,P2.t),[],0,w,MAP_Z);}
  }
  if(E<6)warn.push('Kanten er meget smal.');
  const g=[];box(g,-P.E/2,P.E/2,-150,0,-60,w+60);
  return {o,g,warn};
}
function buildXmasHook(P){
  const r=P.ltype==='roof'?buildRoofClip(P):buildGutterHook(P),w=P.w;
  const v=t=>{const out=[];for(let i=0;i<t.length;i+=3)out.push(t[i+2]-w/2,-t[i],t[i+1]);return out;};
  const b=bboxOf(r.o);
  // printfil: flere stk ved siden af hinanden
  const n=Math.max(1,P.count|0),cols=Math.ceil(Math.sqrt(n)),dx=b.mx[0]-b.mn[0]+5,dy=b.mx[1]-b.mn[1]+5;let print=[];
  for(let i=0;i<n;i++){const cx=(i%cols)*dx-b.mn[0],cy=Math.floor(i/cols)*dy-b.mn[1];print=print.concat(tf(r.o,(x,y,z)=>[x+cx,y+cy,z]));}
  return {tris:print,view:v(r.o),ghost:v(r.g),warn:r.warn,dims:[b.mx[0]-b.mn[0],b.mx[1]-b.mn[1],w],count:n};
}
