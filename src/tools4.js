
// ================= FÆLLES: ARM MED OPBUKKET SPIDS =================
// profil (u,v): bagplade u∈[-bt,0], armen går ud til -u fra bunden vb. ang = hældning opad (grader)
function armProfile(o,bt,vb,L,at,tip,ang,w,z0=0){
  const a=ang*Math.PI/180,d=[-Math.cos(a),Math.sin(a)],n=[Math.sin(a),Math.cos(a)];
  const P3=[-bt+0.1,vb+at*Math.cos(a)],P0=[P3[0]-at*n[0],P3[1]-at*n[1]];
  const P1=[P0[0]+L*d[0],P0[1]+L*d[1]],P2=[P1[0]+at*n[0],P1[1]+at*n[1]];
  extrude(o,[P0,P1,P2,P3],[],z0,z0+w,MAP_Z);
  extrude(o,[[-bt+0.1,P0[1]],P0,P3],[],z0,z0+w,MAP_Z);
  if(tip>0)extrude(o,[P1,[P1[0]+at,P1[1]],[P1[0]+at,P2[1]+tip],[P1[0],P2[1]+tip]],[],z0,z0+w,MAP_Z);
  // hulkehl mellem arm og bagplade
  const f=Math.min(6,L/3);if(f>1)extrude(o,[[-bt+0.1,P3[1]-0.1],[-bt-f,P3[1]-0.1+f*Math.tan(a)],[-bt+0.1,P3[1]+f]],[],z0,z0+w,MAP_Z);
  return {tipTop:P2[1]+tip,end:P1[0]};
}
// SKÅDIS-bagplade med krog(e). Returnerer den nødvendige bund (vb) og om der skal support
function skNeedVb(P,top){let v=top-SK.bh-SK.Ld-3;if((P.skLow||'none')!=='none')v=Math.min(v,top-SK.pitch-SK.bh-SK.Ld-1.5);return v;}
function skHooks(o,P,top,vb,w){
  const bt=P.sbt,A=-bt+0.3,pos=P.hookPos||'side';
  let zs=[0];if(pos==='center')zs=[w/2-SK.tw/2];
  else if(pos==='both'){const k=Math.floor((w-SK.tw)/SK.pitch);zs=k>=1?[0,k*SK.pitch]:[0];}
  for(const zh of zs){extrude(o,skHookProfile(A,top,P.Tb),[],zh,zh+SK.tw,MAP_Z);
    const low=skLowerProfile(A,top,P.Tb,vb+0.5,P.skLow||'none');if(low)extrude(o,low,[],zh,zh+SK.tw,MAP_Z);}
  return {support:zs.some(z=>z>0),n:zs.length};
}
// visning: stående med væggen bagved (y = mod væggen)
function wallView(o,w){let mny=Infinity;for(let i=1;i<o.length;i+=3)mny=Math.min(mny,o[i]);
  const v=new Array(o.length);for(let i=0;i<o.length;i+=3){v[i]=o[i+2]-w/2;v[i+1]=o[i];v[i+2]=o[i+1]-mny;}return {view:v,mny};}
function dimsOf(o){const mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];for(let i=0;i<o.length;i++){const k=i%3;mn[k]=Math.min(mn[k],o[i]);mx[k]=Math.max(mx[k],o[i]);}return mx.map((v,k)=>v-mn[k]);}

// ================= SKÅDIS-TILBEHØR =================
function buildSkadisItem(P){
  const warn=[],o=[],bt=P.sbt,ty=P.stype,top=0;
  let w=P.sw,vb,extra={};
  if(ty==='roll')w=P.ad;
  if(P.hookPos==='both'&&w<SK.pitch+SK.tw){warn.push(`Clipsen skal være mindst ${f1n(SK.pitch+SK.tw)} mm bred for at få kroge i begge sider – der er lavet én.`);}
  const need=skNeedVb(P,top);
  if(ty==='hook'||ty==='dhook'){
    vb=Math.min(-P.hp,need);
    armProfile(o,bt,vb,P.L,P.at,P.tip,P.ang,w);
    if(ty==='dhook'){const v2=vb+P.at+P.gap;if(v2+P.at>top-SK.bh-1)warn.push('Den øverste krog rammer SKÅDIS-krogen – gør bagpladen højere eller afstanden mindre.');
      armProfile(o,bt,v2,P.L2,P.at,P.tip,P.ang,w);}
  }else if(ty==='shelf'){
    const gd=Math.min(P.D*0.45,22),st=P.st;
    vb=Math.min(-P.hp,need);const vs=vb+gd;
    extrude(o,[[-bt-P.D,vs],[-bt+0.1,vs],[-bt+0.1,vs+st],[-bt-P.D,vs+st]],[],0,w,MAP_Z);
    if(P.lh>0)extrude(o,[[-bt-P.D,vs],[-bt-P.D+P.lt,vs],[-bt-P.D+P.lt,vs+st+P.lh],[-bt-P.D,vs+st+P.lh]],[],0,w,MAP_Z);
    extrude(o,[[-bt+0.1,vs+0.1],[-bt-gd,vs+0.1],[-bt+0.1,vs-gd+0.1]],[],0,w,MAP_Z);
    if(vs+st+1>top-SK.bh)warn.push('Hylden sidder for højt – gør bagpladen højere.');
  }else if(ty==='roll'){
    const r=P.ad/2;vb=Math.min(-P.hp,need);const va=vb+r;
    extrude(o,circ(va,r,r,64),[],-bt-P.L,-bt+0.1,MAP_X);
    extrude(o,[[-bt-P.L-P.sst,vb],[-bt-P.L+0.1,vb],[-bt-P.L+0.1,vb+P.ad+P.sh],[-bt-P.L-P.sst,vb+P.ad+P.sh]],[],0,w,MAP_Z);
    extra.rod=P.L;
  }else if(ty==='tray'){
    const t=P.tt,D=P.D,hf=P.hf;vb=Math.min(-P.hp,need);
    const u0=-bt-D,u1=-bt,v0=vb+t,v1=vb+hf;
    extrude(o,[[u0,vb],[u1+0.1,vb],[u1+0.1,vb+t],[u0,vb+t]],[],0,w,MAP_Z);           // bund
    extrude(o,[[u0,vb],[u0+t,vb],[u0+t,v1],[u0,v1]],[],0,w,MAP_Z);                     // forkant
    extrude(o,[[u0,vb],[u1+0.1,vb],[u1+0.1,v1],[u0,v1]],[],0,t,MAP_Z);                 // ende på pladen
    const zc=w-t-(v1-v0);
    if(zc<t+8)warn.push(`Bakken er for kort i forhold til højden – gør den mindst ${f1n(2*t+(v1-v0)+8)} mm bred.`);
    else extrude(o,[[v0-0.1,zc],[v1,zc+(v1-v0)],[v1,w],[v0-0.1,w]],[],u0+t-0.1,u1+0.1,MAP_X); // skrå ende (45°)
    // hulkehl forrest, så man kan skubbe skruerne op
    const rs=Math.min(P.rs,D-2*t-2,hf-t-1);
    if(rs>2){const yb=u0+t;
      const arc=[[yb-0.1,v0-0.1],[yb+rs,v0-0.1]];for(let k=0;k<=12;k++){const a=-Math.PI/2-k/12*Math.PI/2;arc.push([yb+rs+rs*Math.cos(a),v0+rs+rs*Math.sin(a)]);}
      arc[arc.length-1]=[yb-0.1,v0+rs];extrude(o,arc,[],0,w,MAP_Z);}
    // skillevægge (45° skrå, så de printer uden support)
    const n=Math.max(1,P.trn|0);
    if(n>1){const L0=t,L1=zc>t+8?zc:w-t,dt=1.2;
      for(let i=1;i<n;i++){const a=L0+(L1-L0)*i/n-dt/2;if(a+dt+(v1-v0)>w-t)continue;
        extrude(o,[[v0-0.1,a],[v0-0.1,a+dt],[v1,a+dt+(v1-v0)],[v1,a+(v1-v0)]],[],u0+t-0.1,u1+0.1,MAP_X);}}
  }
  // bagplade + kroge
  extrude(o,[[-bt,vb],[0,vb],[0,top],[-bt,top]],[],0,w,MAP_Z);
  const hk=skHooks(o,P,top,vb,w);
  const {view,mny}=wallView(o,w);
  return {tris:o,view,warn,needsSupport:hk.support,skadis:{Tb:P.Tb,top:top-mny},dims:dimsOf(o),w,...extra};
}

// ================= SKRIVEBORD =================
function buildPhone(P){
  const warn=[],o=[],a=P.pa*Math.PI/180,d=[Math.sin(a),Math.cos(a)],n=[Math.cos(a),-Math.sin(a)];
  const lt=P.plt,dt=P.pdt+0.6,st=P.pst,bt=P.pbt,w=P.pw;
  let hl=Math.max(P.phl,bt+st*Math.sin(a)+2);
  const xs=lt+dt,S0=[xs,hl],S1=[xs+P.pls*d[0],hl+P.pls*d[1]];
  const B0=[S0[0]+st*n[0],S0[1]+st*n[1]],B1=[S1[0]+st*n[0],S1[1]+st*n[1]];
  // bagsidens linje forlænget ned til y=0
  const sY=B0[1]/d[1],A=[Math.max(B0[0]-sY*d[0],xs+1),0];
  const M=[B0[0]+(B1[0]-B0[0])*0.62,B0[1]+(B1[1]-B0[1])*0.62];
  const Lb=Math.max(P.plb,M[0]+12,A[0]+10);
  const lipTop=hl+P.plh;
  const full=[[0,0],[Lb,0],[Lb,bt],M,B1,S1,S0,[lt,hl],[lt,lipTop],[0,lipTop]];
  // let-hul i trekanten bag støtten
  const tri=[A,[Lb,0],M].map(p=>p.slice());
  const ed=(p,q)=>Math.hypot(q[0]-p[0],q[1]-p[1]),la=ed(tri[1],tri[2]),lb=ed(tri[0],tri[2]),lc=ed(tri[0],tri[1]),per=la+lb+lc;
  const I=[(la*tri[0][0]+lb*tri[1][0]+lc*tri[2][0])/per,(la*tri[0][1]+lb*tri[1][1]+lc*tri[2][1])/per];
  const area=Math.abs((tri[1][0]-tri[0][0])*(tri[2][1]-tri[0][1])-(tri[2][0]-tri[0][0])*(tri[1][1]-tri[0][1]))/2,rIn=2*area/per,sw=Math.max(bt,3);
  const holes=rIn>sw+3?[tri.map(p=>[I[0]+(p[0]-I[0])*(rIn-sw)/rIn,I[1]+(p[1]-I[1])*(rIn-sw)/rIn])]:[];
  const cut=P.pcable&&P.pcw>2&&P.pcw<w-8;
  const red=[[0,0],[Lb,0],[Lb,bt],M,B1,S1,S0,[xs,bt],[0,bt]];
  if(cut){const z1=w/2-P.pcw/2,z2=w/2+P.pcw/2;
    extrude(o,full,holes,0,z1,MAP_Z);extrude(o,red,holes,z1-0.01,z2+0.01,MAP_Z);extrude(o,full,holes,z2,w,MAP_Z);}
  else extrude(o,full,holes,0,w,MAP_Z);
  // enhed som spøgelse
  const Hd=P.pdev,dv=[[lt+0.3,hl],[xs-0.3,hl],[xs-0.3+Hd*d[0],hl+Hd*d[1]],[lt+0.3+Hd*d[0],hl+Hd*d[1]]];
  const g=[];extrude(g,dv,[],-10,w+10,MAP_Z);
  if(P.phl<bt+st*Math.sin(a)+2)warn.push(`Hylden er hævet til ${f1n(hl)} mm, så støtten kan nå ned til bunden.`);
  const vv=[];for(let i=0;i<o.length;i+=3)vv.push(o[i+2]-w/2,o[i],o[i+1]);
  const gv=[];for(let i=0;i<g.length;i+=3)gv.push(g[i+2]-w/2,g[i],g[i+1]);
  return {tris:o,view:vv,ghost:gv,warn,dims:[w,Lb,Math.max(lipTop,S1[1],B1[1])]};
}
function buildHeadphone(P){
  const warn=[],o=[],w=P.hw2,L=P.hL,at=P.hat,tip=P.htip;
  if(P.hmount==='skadis'){
    const Q={...P,sbt:P.hbt},need=skNeedVb(Q,0),vb=Math.min(-P.hhp,need);
    armProfile(o,P.hbt,vb,L,at,tip,P.hang,w);
    extrude(o,[[-P.hbt,vb],[0,vb],[0,0],[-P.hbt,0]],[],0,w,MAP_Z);
    const hk=skHooks(o,Q,0,vb,w);const {view,mny}=wallView(o,w);
    return {tris:o,view,warn,needsSupport:hk.support,skadis:{Tb:P.Tb,top:-mny},dims:dimsOf(o)};
  }
  // bordkant: klemme over kanten, krogen hænger under bordpladen
  const T=P.T,th=P.th,J=P.jaw,sq=P.sq,dh=P.hdrop;
  const cl=[[-th,-T-th],[J,-T-th],[J,-T+sq],[J-1.5,-T+sq+0.6],[0,-T],[0,0],[J-1.5,0],[J,0.6],[J,th],[-th,th]];
  extrude(o,cl,[],0,w,MAP_Z);
  const vb=-T-th-dh;
  extrude(o,[[-th,vb],[0,vb],[0,-T-th+0.1],[-th,-T-th+0.1]],[],0,w,MAP_Z);
  armProfile(o,th,vb,L,at,tip,P.hang,w);
  let mny=Infinity;for(let i=1;i<o.length;i+=3)mny=Math.min(mny,o[i]);
  const view=[];for(let i=0;i<o.length;i+=3)view.push(o[i+2]-w/2,o[i],o[i+1]-mny);
  return {tris:o,view,warn,ghost:{x0:-w*2-40,x1:w*2+40,y0:0.3,y1:220,z0:-T-mny,z1:-mny},dims:dimsOf(o)};
}
function buildPens(P){
  const warn=[],o=[],t=P.pt,fb=P.pfb,H=P.ph,D=P.pd,sh=P.pshape;
  const cup=(out,inn,h)=>{prism(o,out,0,fb);extrude(o,out,[inn],fb-0.01,h,MAP_Z);};
  let n=1;
  if(sh==='round')cup(circ(0,0,D/2,96),circ(0,0,D/2-t,96),H);
  else if(sh==='hex')cup(hexPoly(0,0,D),hexPoly(0,0,D-2*t),H);
  else if(sh==='square'){const R=Math.min(P.pr,D/2-1);cup(rr(D,D,R,8),rr(D-2*t,D-2*t,Math.max(0.3,R-t),8),H);}
  else{const a=P.pcell,p=a-t,dirs=[30,90,150,210,270,330].map(g=>g*Math.PI/180);
    const sets={3:[[0,0],dirs[0],dirs[1]],4:[[0,0],dirs[0],dirs[1],dirs[2]],7:[[0,0],...dirs]};
    const cs=(sets[P.pcells]||sets[7]).map(c=>Array.isArray(c)?c:[p*Math.cos(c),p*Math.sin(c)]);
    const hf=[1,0.78,0.9,0.66,0.84,0.72,0.6];n=cs.length;
    cs.forEach(([x,y],i)=>cup(hexPoly(x,y,a),hexPoly(x,y,a-2*t),Math.max(fb+5,H*hf[i])));}
  if(P.pdiv&&sh!=='honey'){const iw=(sh==='hex'?D:D)-2*t;box(o,-iw/2-0.2,iw/2+0.2,-t/2*0.8,t/2*0.8,fb-0.2,H*0.75);box(o,-t/2*0.8,t/2*0.8,-iw/2-0.2,iw/2+0.2,fb-0.2,H*0.75);n=4;}
  return {tris:o,warn,dims:dimsOf(o),n};
}
function buildLaptop(P){
  const warn=[],o=[],L=P.lL,Hb=P.lHb,a=P.lang*Math.PI/180,lt=4,lip=P.llip,w=P.lw;
  const Hf=Hb-(L-lt)*Math.tan(a);
  if(Hf<4)warn.push('Vinklen er for stejl til den højde og længde – fronten bliver for lav. Mindsk vinklen eller gør foden højere.');
  const hf=Math.max(4,Hf);
  const poly=[[0,0],[L,0],[L,Hb+lip],[L-lt,Hb+lip],[L-lt,Hb],[0,hf]];
  const m=6,holes=[];
  if(L-lt-2*m>10&&hf-2*m>4){const yt=x=>hf+x*Math.tan(a)-m/Math.cos(a);holes.push([[m,m],[L-lt-m,m],[L-lt-m,yt(L-lt-m)],[m,yt(m)]]);}
  const cnt=Math.max(1,P.lcount|0);
  for(let i=0;i<cnt;i++){const t=[];extrude(t,poly,holes,0,w,MAP_Z);for(let k=0;k<t.length;k+=3){t[k]+=i*(L+8);}for(const v of t)o.push(v);}
  return {tris:o,warn,dims:[L,Hb+lip,w],Hf:hf,cnt};
}
function buildDesk(P){
  if(P.dtype==='phone')return buildPhone(P);
  if(P.dtype==='head')return buildHeadphone(P);
  if(P.dtype==='pens')return buildPens(P);
  return buildLaptop(P);
}
