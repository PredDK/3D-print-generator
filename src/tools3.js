
// ================= GRIDFINITY =================
// Mål efter Gridfinity-standarden: 42 mm gitter, 7 mm højdeenheder, fod 4,75 mm, bakke 0,5 mm mindre end gitteret.
const GF={P:42,U:7,R:3.75,foot:[[2.95,0],[2.15,0.8],[2.15,2.6],[0,4.75]],footH:4.75};
function ccw(p){let a=0;for(let i=0;i<p.length;i++){const q=p[i],r=p[(i+1)%p.length];a+=q[0]*r[1]-r[0]*q[1];}return a>0?p:p.slice().reverse();}
function shiftP(p,dx,dy){return p.map(([x,y])=>[x+dx,y+dy]);}
// strimmel mellem to ringe (samme antal punkter). out=true: normal væk fra ringens akse
function strip(o,A,za,B,zb,out){const n=A.length;for(let k=0;k<n;k++){const k1=(k+1)%n,a=[A[k][0],A[k][1],za],a1=[A[k1][0],A[k1][1],za],b=[B[k][0],B[k][1],zb],b1=[B[k1][0],B[k1][1],zb];
  if(out===(zb>za))Q(o,a,a1,b1,b);else Q(o,a,b,b1,a1);}}
function capT(o,outer,holes,z,up){for(const [a,b,c] of triangulate(ccw(outer),holes.map(h=>ccw(h).slice().reverse()))){if(up)T(o,[a[0],a[1],z],[b[0],b[1],z],[c[0],c[1],z]);else T(o,[a[0],a[1],z],[c[0],c[1],z],[b[0],b[1],z]);}}
// én Gridfinity-fod med evt. magnetlommer nedefra
function gfFoot(o,cx,cy,P){const s=GF.P-0.5,ch=GF.foot.concat([[0,GF.footH+0.2]]);
  const rings=ch.map(([i])=>shiftP(ccw(rr(s-2*i,s-2*i,Math.max(0.3,GF.R-i),8)),cx,cy));
  const holes=[];
  if(P.mag){const mr=P.magD/2,o13=13;for(const [sx,sy] of [[1,1],[-1,1],[-1,-1],[1,-1]])holes.push(ccw(circ(cx+sx*o13,cy+sy*o13,mr,32)));}
  capT(o,rings[0],holes,0,false);
  for(let r=0;r+1<rings.length;r++)strip(o,rings[r],ch[r][1],rings[r+1],ch[r+1][1],true);
  capT(o,rings[rings.length-1],[],ch[ch.length-1][1],true);
  for(const h of holes){strip(o,h,0,h,P.magH,false);capT(o,h,[],P.magH,false);}
}
function buildGfBin(P){
  const warn=[],o=[],nx=P.gx|0,ny=P.gy|0,W=nx*GF.P-0.5,D=ny*GF.P-0.5,t=P.t,R=GF.R;
  const Z=GF.U*P.hu,lip=!!P.lip,zf=GF.footH+P.fb;
  if(P.mag&&P.magH>GF.footH-1.2)warn.push('Magneterne er for høje til foden.');
  for(let i=0;i<nx;i++)for(let j=0;j<ny;j++)gfFoot(o,-W/2+GF.P/2-0.25+i*GF.P,-D/2+GF.P/2-0.25+j*GF.P,P);
  let chain;
  if(lip){const Zt=Z+4.4,zs=Z-(2.7-t);
    if(zs<zf+2)warn.push('Bakken er for lav til stabelkanten – vælg flere højdeenheder eller slå kanten fra.');
    chain=[[0,GF.footH],[0,Zt],[0.1,Zt],[2.0,Zt-1.9],[2.0,Zt-3.7],[2.7,Z],[t,zs],[t,zf]];}
  else chain=[[0,GF.footH],[0,Z],[t,Z],[t,zf]];
  loftChain(o,W,D,R,chain);
  const iw=W-2*t,id=D-2*t,Ri=Math.max(0.3,R-t),top=lip?Z-0.6:Z-P.dlow;
  // skillevægge
  const cols=Math.max(1,P.cols|0),rows=Math.max(1,P.rows|0),dt=P.dt,ov=Math.min(0.3,t/2);
  if(top>zf+1){
    for(let i=1;i<cols;i++){const x=-iw/2+iw*i/cols;box(o,x-dt/2,x+dt/2,-id/2-ov,id/2+ov,zf-0.3,top);}
    for(let j=1;j<rows;j++){const y=-id/2+id*j/rows;box(o,-iw/2-ov,iw/2+ov,y-dt/2,y+dt/2,zf-0.3,top);}}
  const xr=iw/2-Ri;
  // gribekant (hulkehl) langs forvæggen – én pr. rumrække
  if(P.scoop){const rs=Math.min(P.rs,(id/rows)*0.6,top-zf-0.5);
    if(rs>2)for(let j=0;j<rows;j++){const y0=(j===0?-id/2:-id/2+id*j/rows+dt/2),pr=[[y0-ov,zf-0.3],[y0+rs,zf-0.3]];
      for(let k=0;k<=12;k++){const a=-Math.PI/2-k/12*Math.PI/2;pr.push([y0+rs+rs*Math.cos(a),zf+rs+rs*Math.sin(a)]);}
      pr[pr.length-1]=[y0-ov,zf+rs];
      extrude(o,pr,[],j===0?-xr:-iw/2,j===0?xr:iw/2,MAP_X);}}
  // etiketkant bagerst (45° underside)
  if(P.label){const lw=Math.min(P.lw,id/rows-4),yb=id/2,lt=1.0;
    if(lw>3)extrude(o,[[yb+ov,top],[yb-lw,top],[yb-lw,top-lt],[yb+ov,top-lt-lw-ov]],[],-xr,xr,MAP_X);}
  const cw=(iw-(cols-1)*dt)/cols,cd=(id-(rows-1)*dt)/rows;
  return {tris:o,warn,W,D,H:lip?Z+4.4:Z,cw,cd,cells:cols*rows,Z};
}
function buildGfBase(P){
  const warn=[],o=[],nx=P.gx|0,ny=P.gy|0,gw=nx*GF.P,gd=ny*GF.P,H=4.65;
  let W=gw,D=gd,ox=0,oy=0;
  if(P.fit){W=Math.max(gw,P.fW-0.5);D=Math.max(gd,P.fD-0.5);
    if(P.align==='corner'){ox=-(W-gw)/2;oy=-(D-gd)/2;}}
  const Ro=Math.min(4,W/2-0.1,D/2-0.1),outer=ccw(rr(W,D,Ro,8));
  const ch=[[2.85,0],[2.15,0.7],[2.15,2.5],[0.05,H]];
  const pockets=[];
  for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){const cx=ox-gw/2+GF.P/2+i*GF.P,cy=oy-gd/2+GF.P/2+j*GF.P;
    pockets.push(ch.map(([ins])=>shiftP(ccw(rr(GF.P-2*ins,GF.P-2*ins,Math.max(0.3,4-ins),8)),cx,cy)));}
  capT(o,outer,pockets.map(p=>p[p.length-1]),H,true);
  capT(o,outer,pockets.map(p=>p[0]),0,false);
  strip(o,outer,0,outer,H,true);
  for(const p of pockets)for(let r=0;r+1<p.length;r++)strip(o,p[r],ch[r][1],p[r+1],ch[r+1][1],false);
  if(Math.max(W,D)>P.bed)warn.push(`Bundpladen er ${f1n(Math.max(W,D))} mm – større end din printplade (${P.bed} mm). Lav den i flere stykker (færre felter ad gangen).`);
  return {tris:o,warn,W,D,H,nx,ny};
}

// ================= BESLAG =================
function buildHinge(P){
  const warn=[],o=[],L=P.hl,hw=P.hw,lt=P.lt,Rk=P.kd/2,c=P.c,n=Math.max(3,P.kn|0|1);
  const rp=Rk-Math.max(1.0,P.kw)-c;
  if(rp<0.9){warn.push('Knæk-diameteren er for lille til en stift – gør den større eller væggen tyndere.');}
  if(lt>2*Rk-0.4)warn.push('Pladerne er tykkere end knækket – gør knækket større.');
  const sl=(L-(n-1)*c)/n,seg=k=>[-L/2+k*(sl+c),-L/2+k*(sl+c)+sl];
  const cyl=(y0,y1,ro,ri)=>{const out=circ(0,Rk,ro,48);extrude(o,out,ri?[circ(0,Rk,ri,40)]:[],-y1,-y0,MAP_Y);};
  for(let k=0;k<n;k++){const [y0,y1]=seg(k);if(k%2===0)cyl(y0,y1,Rk,0);else cyl(y0,y1,Rk,rp+c);}
  if(rp>=0.9)cyl(-L/2,L/2,rp,0);
  // plader med skruehuller (forsænket opadtil)
  const xa=Rk+c,lw=hw-xa,nh=Math.max(0,P.nh|0),hr=P.shd/2+0.2;
  if(nh&&hr>lw/2-0.4)warn.push('Pladerne er for smalle til skruehullerne – gør dem bredere eller brug mindre skruer.');
  const ys=[...Array(nh)].map((_,i)=>-L/2+L*(i+0.5)/nh);
  for(const s of [-1,1]){const x0=s<0?-hw:xa,x1=s<0?-xa:hw,xc=(x0+x1)/2;
    const feats=nh&&hr<=lw/2-0.4?ys.flatMap((y,i)=>screwFeats(xc,y,P.sd,P.shd,lt,'h'+s+i)):[];
    layered(o,[[x0,-L/2],[x1,-L/2],[x1,L/2],[x0,L/2]],feats,0,lt,true);
    // tappe ind til egne knæk: A (venstre) ejer lige led, B (højre) ulige
    for(let k=0;k<n;k++){if((k%2===0)!==(s<0))continue;const [y0,y1]=seg(k);
      if(s<0)box(o,-xa-0.1,0,y0,y1,0,Math.min(lt,Rk));else box(o,rp+c+0.45,xa+0.1,y0,y1,0,lt);}}
  return {tris:o,warn,dims:[2*hw,L,Math.max(lt,2*Rk)]};
}
function buildAngle(P){
  const warn=[],o=[],a=P.la,b=P.lb,W=P.bw,t=P.bt,hr=P.shd/2+0.2,gt=P.gt;let nh=Math.max(0,P.nh|0);
  const fit=Math.floor(W/(2*hr+1.2));if(nh>fit){nh=fit;warn.push(nh?`Der er kun plads til ${nh} hul${nh>1?'ler':''} i bredden.`:'Beslaget er for smalt til skruehuller.');}
  const zs=[...Array(nh)].map((_,i)=>W*(i+0.5)/nh);
  const okA=(a-t)>2*hr+1.5,okB=(b-t)>2*hr+1.5;if(nh&&(!okA||!okB))warn.push('Benene er for korte til skruehullerne – gør dem længere.');
  const fa=nh&&okA?zs.flatMap((y,i)=>screwFeats(t+(a-t)/2,y,P.sd,P.shd,t,'a'+i)):[];
  layered(o,[[0,0],[a,0],[a,W],[0,W]],fa,0,t,true);
  const fb=nh&&okB?zs.flatMap((y,i)=>screwFeats(y,t+(b-t)/2,P.sd,P.shd,t,'b'+i)):[];
  layered(o,[[0,0],[W,0],[W,b],[0,b]],fb,0,t,true,MAP_X);
  if(P.gus){const gs=Math.min(a,b)-t-0.5;
    // afstivning: i kanterne ved 1 hul, i midten (eller mellem hullerne) ved flere
    const pos=nh<=1?[[0,gt],[W-gt,W]]:[...Array(nh-1)].map((_,i)=>{const m=W*(i+1)/nh;return [m-gt/2,m+gt/2];});
    if(nh>1&&(W/nh)/2-hr<gt/2+0.4)warn.push('Afstivningen kommer tæt på skruehullerne – brug færre huller eller et bredere beslag.');
    for(const [y0,y1] of pos)extrude(o,[[t-0.1,t-0.1],[t+gs,t-0.1],[t-0.1,t+gs]],[],-y1,-y0,MAP_Y);}
  return {tris:o,warn,dims:[a,W,b]};
}
function buildFlatPlate(P){
  const warn=[],o=[],aw=P.aw,t=P.bt,hr=P.shd/2+0.2,ty=P.btype,h=aw/2;let nh=Math.max(0,P.nh|0),al=P.al;
  if(al<h+2){al=h+2;warn.push(`Armene er gjort ${f1n(al)} mm lange, så de er længere end pladen er bred.`);}
  if(hr>h-0.6)warn.push('Pladen er for smal til skruerne – gør den bredere.');
  let poly,arms;
  if(ty==='flatI'){poly=[[-al,-h],[al,-h],[al,h],[-al,h]];arms=[[1,0],[-1,0]];}
  else if(ty==='flatL'){poly=[[-h,-h],[al,-h],[al,h],[h,h],[h,al],[-h,al]];arms=[[1,0],[0,1]];}
  else if(ty==='flatT'){poly=[[-al,-h],[al,-h],[al,h],[h,h],[h,al],[-h,al],[-h,h],[-al,h]];arms=[[1,0],[-1,0],[0,1]];}
  else{poly=[[-al,-h],[-h,-h],[-h,-al],[h,-al],[h,-h],[al,-h],[al,h],[h,h],[h,al],[-h,al],[-h,h],[-al,h]];arms=[[1,0],[-1,0],[0,1],[0,-1]];}
  const feats=[];let k=0;
  const start=ty==='flatI'?Math.max(hr+0.8,4):h+hr+1.5,span=al-start-hr-1;
  if(nh>1){const fitN=Math.floor(span/(2*hr+1))+1;if(nh>fitN){nh=Math.max(1,fitN);warn.push(`Der er kun plads til ${nh} hul${nh>1?'ler':''} pr. arm.`);}}
  if(nh&&span<0)warn.push('Armene er for korte til skruehullerne – gør dem længere.');
  else if(nh)for(const [dx,dy] of arms)for(let i=0;i<nh;i++){const d=nh===1?start+span/2:start+span*i/(nh-1);feats.push(...screwFeats(dx*d,dy*d,P.sd,P.shd,t,'f'+(k++)));}
  if(feats.length&&hr<=h-0.6&&span>=0)layered(o,poly,feats,0,t,true);else prism(o,poly,0,t);
  const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]);
  return {tris:o,warn,dims:[Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys),t]};
}
function buildBracket(P){
  if(P.btype==='hinge')return buildHinge(P);
  if(P.btype==='angle')return buildAngle(P);
  return buildFlatPlate(P);
}
