// ---------- ZIP (uden komprimering, flere filer) ----------
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(u){let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=CRC[(c^u[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0;}
function zipFiles(files){
  const parts=[],cds=[];let off=0;
  for(const f of files){
    const nb=new TextEncoder().encode(f.name),data=f.data,crc=crc32(data);
    const lh=new DataView(new ArrayBuffer(30));
    lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint16(12,0x21,true);lh.setUint32(14,crc,true);
    lh.setUint32(18,data.length,true);lh.setUint32(22,data.length,true);lh.setUint16(26,nb.length,true);
    const cd=new DataView(new ArrayBuffer(46));
    cd.setUint32(0,0x02014b50,true);cd.setUint16(4,20,true);cd.setUint16(6,20,true);cd.setUint16(14,0x21,true);cd.setUint32(16,crc,true);
    cd.setUint32(20,data.length,true);cd.setUint32(24,data.length,true);cd.setUint16(28,nb.length,true);cd.setUint32(42,off,true);
    parts.push(lh,nb,data);cds.push(cd,nb);off+=30+nb.length+data.length;
  }
  const cdSize=cds.reduce((a,b)=>a+b.byteLength,0);
  const e=new DataView(new ArrayBuffer(22));
  e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cdSize,true);e.setUint32(16,off,true);
  return new Blob([...parts,...cds,e]);
}
const f1=v=>(+v).toFixed(1).replace('.',',');
const safe=s=>s.replace(/[Ææ]/g,'ae').replace(/[Øø]/g,'oe').replace(/[Åå]/g,'aa').normalize('NFKD').replace(/[^\w-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,30)||'x';

// ---------- Tekst → bitmap ----------
const tbCache=new Map();
function textBitmap(txt,size,maxW,maxH){
  txt=(txt||'').trim();if(!txt||maxW<4||maxH<2)return null;
  const key=[txt,size,maxW.toFixed(2),maxH.toFixed(2)].join('|');if(tbCache.has(key))return tbCache.get(key);
  const res=0.2;let fpx=size/res/0.72;
  const cv=document.createElement('canvas'),c=cv.getContext('2d');
  const font=px=>`700 ${px}px system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif`;
  c.font=font(fpx);let w=c.measureText(txt).width;
  if(w*res>maxW){fpx*=maxW/(w*res);c.font=font(fpx);w=c.measureText(txt).width;}
  if(fpx*1.25*res>maxH){fpx=maxH/(1.25*res);c.font=font(fpx);w=c.measureText(txt).width;}
  const cols=Math.max(4,Math.ceil(w)+6),rows=Math.max(4,Math.ceil(fpx*1.25)+4);
  let out=null;
  if(fpx*res*0.72>=1.5&&cols*res<=maxW+3){
    cv.width=cols;cv.height=rows;c.font=font(fpx);c.textAlign='center';c.textBaseline='middle';c.fillStyle='#000';
    c.fillText(txt,cols/2,rows/2+fpx*0.04);
    const img=c.getImageData(0,0,cols,rows).data,data=new Uint8Array(cols*rows);
    for(let i=0;i<cols*rows;i++)data[i]=img[i*4+3]>110?1:0;
    out={cols,rows,res,data};
  }
  tbCache.set(key,out);return out;
}

// ---------- Fælles indstillinger ----------
const PROF_L={std:'Standard (0,4 mm dyse)',precise:'Præcis (Bambu, Prusa MK4/Core)',budget:'Ældre/budget (Ender 3 m.fl.)',n06:'0,6 mm dyse'};
const profDef=vals=>({k:'prof',l:'Printerprofil',type:'select',opts:Object.entries(PROF_L).concat([['custom','Egne værdier']]),v:'std',noGeom:true,profVals:vals});
const roomDefs=()=>[
 {k:'tpl',l:'Skabelon',type:'select',opts:[['','Vælg skabelon …'],['empty','Ingen skillevægge'],['six','6 lige store (3×2)'],['bigsmall','1 stort + 4 små'],['twelve','12 små (4×3)'],['mixed','Sortering (blandet)'],['long','3 lange rum']],v:'',noGeom:true},
 {k:'divMode',l:'Retning',type:'select',opts:[['cols','Kolonner'],['rows','Rækker']],v:'cols'},
 {note:'Kolonner: de lodrette vægge går hele vejen, og hver kolonne deles for sig. Rækker: omvendt.'},
 {k:'dx',l:P=>P.divMode==='rows'?'Antal gennemgående vandrette vægge':'Antal gennemgående lodrette vægge',min:0,max:8,st:1,v:2},
 {k:'dt',l:'Skillevægstykkelse',min:0.8,max:4,st:0.1,v:1.2},
 {k:'divH',l:'Skillevæggenes højde (%)',min:20,max:100,st:5,v:100},
 {k:'scoop',l:'Fingergreb (radius, 0 = fra)',min:0,max:20,st:0.5,v:0},
];
const TPL={
  empty:{divMode:'cols',xs:[],cols:[[]]},
  six:{divMode:'cols',xs:[1/3,2/3],cols:[[0.5],[0.5],[0.5]]},
  bigsmall:{divMode:'cols',xs:[0.5],cols:[[],[0.25,0.5,0.75]]},
  twelve:{divMode:'cols',xs:[0.25,0.5,0.75],cols:[[1/3,2/3],[1/3,2/3],[1/3,2/3],[1/3,2/3]]},
  mixed:{divMode:'cols',xs:[0.2,0.42,0.58],cols:[[0.3,0.55,0.8],[0.2,0.4,0.6,0.8],[],[0.5]]},
  long:{divMode:'rows',xs:[1/3,2/3],cols:[[],[0.5],[]]},
};

// ---------- Værktøjer ----------
const TOOLS=[];
// ÆSKE
TOOLS.push({id:'aeske',name:'Æske',dl:'Download STL',hasPlan:true,
 init:{xs:[1/3,2/3],cols:[[1/3,2/3],[0.5],[]]},
 defs:[
  {sec:'Mål'},
  {k:'dimMode',l:'Målene angiver',type:'select',opts:[['outer','Udvendige mål'],['inner','Indvendige mål (rummet)']],v:'outer'},
  {k:'W',l:P=>P.dimMode==='inner'?'Indvendig bredde':'Bredde',min:15,max:250,st:1,v:80},
  {k:'D',l:P=>P.dimMode==='inner'?'Indvendig dybde':'Dybde',min:15,max:250,st:1,v:60},
  {k:'Hb',l:P=>P.dimMode==='inner'?'Indvendig højde (bund)':'Højde – bund',min:6,max:150,st:1,v:30},
  {k:'Hl',l:'Højde – låg',min:4,max:100,st:1,v:14},
  {k:'R',l:'Hjørneradius',min:0,max:30,st:0.5,v:5},
  {sec:'Printer'},
  profDef({std:{hc:0.4,fit:0.3},precise:{hc:0.3,fit:0.25},budget:{hc:0.5,fit:0.4},n06:{hc:0.5,fit:0.4,t:2.4,lipT:1.5,dt:1.6}}),
  {note:'Profilen indstiller frigang i hængsel og kant. Du kan finjustere nedenfor.'},
  {sec:'Vægge'},
  {k:'t',l:'Vægtykkelse',min:1.2,max:6,st:0.1,v:2},
  {k:'fb',l:'Bund-/toptykkelse',min:0.8,max:5,st:0.1,v:1.6},
  {sec:'Låg'},
  {k:'lip',l:'Indvendig kant, der holder låget på plads',type:'check',v:true},
  {k:'lipH',l:'Kanthøjde',min:1,max:10,st:0.5,v:3,show:P=>P.lip},
  {k:'lipT',l:'Kanttykkelse',min:0.8,max:3,st:0.1,v:1.2,show:P=>P.lip},
  {k:'fit',l:'Frigang ved kant',min:0.1,max:0.8,st:0.05,v:0.3,show:P=>P.lip,prof:true},
  {k:'latch',l:'Klik-lås foran',type:'check',v:true,show:P=>P.lip},
  {k:'latchS',l:'Låsestyrke',min:0.1,max:0.8,st:0.05,v:0.35,show:P=>P.lip&&P.latch},
  {k:'grip',l:'Greb foran på låget',type:'check',v:true},
  {sec:'Tekst'},
  {k:'text',l:'Tekst',type:'text',v:''},
  {k:'textPos',l:'Placering',type:'select',opts:[['top','På låget'],['front','På forsiden'],['both','Begge steder']],v:'both',show:P=>!!P.text.trim()},
  {k:'textSize',l:'Teksthøjde',min:3,max:30,st:0.5,v:8,show:P=>!!P.text.trim()},
  {k:'textDepth',l:'Dybde',min:0.4,max:1.2,st:0.1,v:0.6,show:P=>!!P.text.trim()},
  {note:'Teksten bliver fordybet. På forsiden kan den ses, når æskerne står stablet.'},
  {sec:'Stabling (magneter)'},
  {k:'mag',l:'Huller til magneter i hjørnerne',type:'check',v:false},
  {k:'magD',l:'Magnet-diameter',min:3,max:12,st:0.5,v:6,show:P=>P.mag},
  {k:'magH',l:'Magnet-højde',min:1,max:5,st:0.5,v:2,show:P=>P.mag},
  {note:'Hullerne sidder under bunden og i toppen af låget, så æskerne holder sammen, når de stables. De holder ikke låget lukket – det gør klik-låsen.',show:P=>P.mag},
  {sec:'Hængsel (print-in-place)'},
  {k:'n',l:'Antal led',type:'select',opts:[[3,'3'],[5,'5'],[7,'7'],[9,'9']],v:5,num:true},
  {k:'kr',l:'Ledradius',min:2.5,max:8,st:0.25,v:4},
  {k:'hc',l:'Frigang i hængsel',min:0.2,max:0.8,st:0.05,v:0.4,prof:true},
  {sec:'Rum'},...roomDefs()],
 onChange(T,k,v,old){if(k==='dimMode'&&v!==old){const P=T.P;const E=eff(Object.assign({},P,{dimMode:old}));
   if(v==='inner'){T.setCtl('W',+(E.W-2*P.t).toFixed(1));T.setCtl('D',+(E.D-2*P.t).toFixed(1));T.setCtl('Hb',+(E.Hb-E.fbB).toFixed(1));}
   else{T.setCtl('W',+E.W.toFixed(1));T.setCtl('D',+E.D.toFixed(1));T.setCtl('Hb',+E.Hb.toFixed(1));}}},
 interior(P){const E=eff(P);return {iw:E.W-2*E.t,id:E.D-2*E.t,ir:Math.max(0,E.R-E.t)};},
 make(P){
   const E0=eff(Object.assign({},P,{tb:null}));const iw=E0.W-2*E0.t,id=E0.D-2*E0.t;
   let maxW=iw-4;if(P.mag){const mc=magCenters(E0);maxW=Math.min(maxW,iw-2*(mc.m+E0.mr+0.8));}
   const onTop=P.textPos!=='front',onFront=P.textPos!=='top';
   P.tb=onTop?textBitmap(P.text,P.textSize,maxW,id-4):null;
   const R0=Math.max(0,Math.min(P.R,E0.W/2-0.5,E0.D/2-0.5));
   P.tbF=onFront&&P.textDepth<=P.t-0.6?textBitmap(P.text,P.textSize,E0.W-2*R0-6,E0.Hb-8):null;
   const m=build(P);
   if(P.text.trim()&&onTop&&!P.tb)m.warn.push('Der er ikke plads til teksten på låget.');
   if(P.text.trim()&&onFront&&P.textDepth>P.t-0.6)m.warn.push('Væggen er for tynd til tekst på forsiden – øg vægtykkelsen eller mindsk tekstdybden.');
   else if(P.text.trim()&&onFront&&!P.tbF)m.warn.push('Der er ikke plads til teksten på forsiden.');
   return m;},
 setup(m,S){S.mesh(m.B,0x2b7a78);const pv=S.pivot(0,m.ay,m.za,[0,m.ay,m.za]);S.mesh(m.L,0xd9622b,pv);S.state.pv=pv;},
 hud:{label:'Åbning',min:0,max:180,v:110,unit:'°',btn:'Printposition',btnV:180,apply(S,v){S.state.pv.rotation.x=-v*Math.PI/180;}},
 files(m,P){const E=m.E;return [{name:`haengslet-aeske_${Math.round(E.W)}x${Math.round(E.D)}x${Math.round(m.H)}mm`,tris:printTris(m)}];},
 extra:{label:'Download testhængsel (lille testprint)',files(P){return [{name:`testhaengsel_frigang-${String(P.hc).replace('.',',')}mm`,tris:printTris(build(hingeTestParams(P)))}];}},
 stats(m,P){const E=m.E;return [['Udvendigt (lukket)',m.outer.map(f1).join(' × ')],['Indvendigt rum (bund)',m.inner.map(f1).join(' × ')],
   ...((E.fbB>P.fb+1e-6||E.fbL>P.fb+1e-6)?[[`Bund / top (øget pga. ${P.mag?'magneter':'tekst'})`,f1(E.fbB)+' / '+f1(E.fbL)]]:[]),
   ['Fodaftryk på printpladen',f1(E.W)+' × '+f1(m.printLen)],['Rum',m.cells.length]];},
 tips:P=>['Printes som den ligger ved 180°: bund og låg fladt på pladen, hængslet imellem. Ingen support nødvendig.','Print testhængslet først for at finde den rigtige frigang til din printer.','Efter print: bræk forsigtigt hængslet løs ved at vippe låget et par gange.',...(P.mag?['Magneter: lim dem i med modsat pol opad i bund og låg, så æskerne kan stables.']:[])],
});
// SKUFFER
TOOLS.push({id:'skuffer',name:'Skuffer',dl:'Download STL-filer (ZIP)',hasPlan:true,
 init:{xs:[],cols:[[]]},
 defs:[
  {sec:'Skab (udvendige mål)'},
  {k:'W',l:'Bredde',min:40,max:300,st:1,v:120},
  {k:'D',l:'Dybde',min:30,max:300,st:1,v:100},
  {k:'H',l:'Højde',min:20,max:300,st:1,v:100},
  {k:'n',l:'Antal skuffer',type:'select',opts:[1,2,3,4,5,6].map(v=>[v,String(v)]),v:3,num:true},
  {k:'t',l:'Vægtykkelse',min:1.2,max:5,st:0.1,v:2},
  {k:'st',l:'Hyldetykkelse',min:1,max:4,st:0.1,v:1.6},
  {sec:'Printer'},
  profDef({std:{c:0.4},precise:{c:0.3},budget:{c:0.5},n06:{c:0.5,t:2.4,dwt:1.8,dt:1.6}}),
  {k:'c',l:'Frigang mellem skuffe og skab',min:0.2,max:1,st:0.05,v:0.4,prof:true},
  {sec:'Skuffer'},
  {k:'handle',l:'Greb',type:'select',opts:[['notch','Fingerhul'],['tab','Kant (lip)'],['bar','Håndtag'],['none','Intet']],v:'notch'},
  {k:'nw',l:'Fingerhullets bredde',min:12,max:70,st:1,v:30,show:P=>P.handle==='notch'},
  {k:'nd',l:'Fingerhullets dybde',min:4,max:30,st:0.5,v:12,show:P=>P.handle==='notch'},
  {k:'dwt',l:'Skuffens vægtykkelse',min:1.2,max:3,st:0.1,v:1.6},
  {k:'ft',l:'Forpladens tykkelse',min:1.6,max:5,st:0.1,v:2.4},
  {k:'dfb',l:'Skuffens bundtykkelse',min:0.8,max:3,st:0.1,v:1.2},
  {k:'rd',l:'Hjørneradius (bagest)',min:0,max:10,st:0.5,v:3},
  {k:'stop',l:'Stop, så skuffen ikke falder ud',type:'check',v:true},
  {sec:'Montering'},
  {k:'mount',l:'Montering',type:'select',opts:[['none','Ingen'],['skadis','IKEA SKÅDIS'],['magnet','Magneter på bagsiden']],v:'none'},
  {k:'magD',l:'Magnet-diameter',min:3,max:15,st:0.5,v:6,show:P=>P.mount==='magnet'},
  {k:'magH',l:'Magnet-højde',min:1,max:5,st:0.5,v:2,show:P=>P.mount==='magnet'},
  {k:'Tb',l:'SKÅDIS-pladens tykkelse',min:4,max:7,st:0.1,v:5,show:P=>P.mount==='skadis'},
  {k:'skLow',l:'Nederst på bagsiden',type:'select',opts:[['hook','Krog'],['stub','Tap'],['none','Ingen']],v:'hook',show:P=>P.mount==='skadis'},
  {note:'Skabet får faste kroge øverst på bagsiden. Det laves uden hylder – skufferne kører på skinner i sidevæggene – og printes på hovedet, så intet kræver support.',show:P=>P.mount==='skadis'},
  {sec:'Etiketter'},
  {k:'labels',l:'Tekst pr. skuffe (adskil med komma, øverste først)',type:'text',v:'',max:200,ph:'fx SKRUER, SØM, BITS'},
  {k:'textSize',l:'Teksthøjde',min:3,max:20,st:0.5,v:7,show:P=>!!P.labels.trim()},
  {k:'textDepth',l:'Dybde',min:0.4,max:1.2,st:0.1,v:0.6,show:P=>!!P.labels.trim()},
  {sec:'Rum i skufferne'},
  {note:'Opdelingen gælder alle skuffer.'},...roomDefs().map(d=>d.k==='dx'?{...d,v:0}:d)],
 interior(P){const C=drawerCalc(P);return {iw:C.iw,id:C.id,ir:C.ir};},
 after(T){const P=T.P,sk=P.mount==='skadis',min=sk?8:6;
   for(let H=P.H,k=0;k<200;k++){const C=drawerCalc({...P,H,skadis:sk});if(C.sh>=min){if(H>P.H)T.setCtl('H',Math.ceil(H));break;}H+=1;}},
 make(P){
   P.skadis=P.mount==='skadis';
   {const min=P.skadis?8:6;let k=0;while(drawerCalc(P).sh<min&&k++<300)P.H+=1;}
   const C=drawerCalc(P);const lab=P.labels.split(',').map(s=>s.trim());
   // øverste skuffe først i teksten; skuffe k=0 er nederst
   P.tbs=[];for(let k=0;k<C.n;k++){const s=lab[C.n-1-k]||'';P.tbs.push(s?textBitmap(s,P.textSize,C.dw-6,C.dh-C.nd-4):null);}
   const m=buildDrawers(P);
   if(lab.some(Boolean)&&P.tbs.some((t,k)=>!t&&lab[C.n-1-k]))m.warn.push('Der er ikke plads til al teksten på forpladerne.');
   return m;},
 setup(m,S,P){S.mesh(m.cab,0x2b7a78);if((P.mount==='skadis')){const o=[];box(o,-P.W/2-40,P.W/2+40,P.D/2,P.D/2+P.Tb,-40,P.H+20);S.mesh(o,0xe8e2d6,null,true);}const C=m.C;S.state.dr=m.drawers.map((d,k)=>{const g=S.pivot(0,-P.D/2+C.dd/2,C.z[k]);S.mesh(d.tris,0xd9622b,g);return g;});S.state.base=-P.D/2+C.dd/2;S.state.dd=C.dd;},
 hud:{label:'Træk ud',min:0,max:100,v:35,unit:'%',apply(S,v){for(const g of S.state.dr)g.position.y=S.state.base-v/100*(S.state.dd-6);}},
 files(m,P){const C=m.C,lab=P.labels.split(',').map(s=>s.trim()),out=[{name:(P.mount==='skadis')?'skab_skadis':'skab',tris:cabinetPrint(m.cab,P,C)}];
   const keys=[...new Set(m.drawers.map(d=>d.key))];
   if(keys.length===1)out.push({name:`skuffe_print-${C.n}-stk`,tris:m.drawers[0].tris});
   else m.drawers.forEach((d,k)=>{const s=lab[C.n-1-k]||'';out.push({name:`skuffe-${C.n-k}${s?'-'+safe(s):''}`,tris:d.tris});});
   return out;},
 stats(m,P){const C=m.C;return [['Skab (udvendigt)',[P.W,P.D,P.H].map(f1).join(' × ')],['Skuffe (udvendigt)',[C.dw,C.dd,C.dh].map(f1).join(' × ')],
   ['Indvendigt pr. skuffe',[C.iw,C.id,C.dh-P.dfb].map(f1).join(' × ')],['Rum pr. skuffe',m.drawers[0]?m.drawers[0].cells.length:0],...((P.mount==='skadis')?[['Montering','SKÅDIS, faste kroge']]:[])];},
 tips:P=>[(P.mount==='skadis')?'Skabet printes på hovedet (toppen på pladen), som det ligger i filen – krogene og rillerne kan så printes uden support.':'Skabet printes liggende på ryggen, så hylderne står lodret – ingen support.','Skufferne printes stående med åbningen opad.',...(P.mount==='magnet'?['Magnethullerne er åbne på bagsiden – lim magneterne i.']:[]),...((P.mount==='skadis')?['Hæng skabet op: vip krogene ind i slidserne og lad det glide ned, så tapperne går i slidserne nedenunder.']:[]),...(P.stop?['Første gang skuffen sættes i, skal den skubbes forbi stoppet med et lille tryk.']:[]),'Sidder skufferne for stramt, så øg frigangen.'],
});
// HOLDER
const HOLDER_PRESETS={
  tb:{holes:[{s:'c',a:14,b:3,n:4}],sor:'along',tray:true},
  tbp:{holes:[{s:'c',a:14,b:3,n:4},{s:'c',a:34,b:3,n:1}],sor:'along',tray:true},
  tools:{holes:[{s:'c',a:10,b:3,n:6}],sor:'along',tray:true},
  pens:{holes:[{s:'c',a:9,b:3,n:8}],sor:'along',tray:true},
  knives:{holes:[{s:'s',a:42,b:3.5,n:3},{s:'s',a:28,b:3,n:2}],sor:'out',tray:false,wg:4,wh:50},
  mixed:{holes:[{s:'c',a:22,b:3,n:1},{s:'c',a:12,b:3,n:3},{s:'s',a:30,b:4,n:1}],sor:'along',tray:true},
  drivers:{holes:[{s:'c',a:7,b:3,n:3},{s:'c',a:9,b:3,n:3},{s:'c',a:11,b:3,n:2}],sor:'along',tray:false,mount:'skadis',wg:6,hgap:8,wh:58,taper:8},
  pliers:{holes:[{s:'s',a:34,b:12,n:3}],sor:'out',tray:false,mount:'skadis',wg:5,hgap:10,wh:58,taper:0},
  workshop:{holes:[{s:'s',a:34,b:12,n:2},{s:'c',a:8,b:3,n:3},{s:'c',a:11,b:3,n:3}],sor:'out',tray:false,mount:'skadis',wg:5,hgap:8,wh:58,taper:6},
};
TOOLS.push({id:'holder',name:'Holder',dl:'Download STL',
 init:{},
 defs:[
  {sec:'Type'},
  {k:'mode',l:'Holder',type:'select',opts:[['wall','Til væg / SKÅDIS'],['block','Stående blok']],v:'wall'},
  {k:'preset',l:'Forslag',type:'select',opts:[['','Vælg forslag …'],['tb','4 tandbørster'],['tbp','4 tandbørster + tandpasta'],['knives','Knive (5 slidser)'],['drivers','Skruetrækkere (8, tre størrelser)'],['pliers','Tænger (3 slidser)'],['workshop','Værksted: tænger + skruetrækkere'],['tools','6 skruetrækkere (ens)'],['pens','8 pensler/kuglepenne'],['mixed','Blandede huller']],v:'',noGeom:true},
  {sec:'Huller'},
  {k:'holes',l:'Hvert hul eller hver gruppe af ens huller',type:'holes',v:[{s:'c',a:14,b:3,n:4}]},
  {k:'sor',l:'Slidser vender',type:'select',opts:[['along','Langs væggen'],['out','Ud fra væggen']],v:'along',show:P=>P.holes.some(h=>h.s==='s')},
  {k:'taper',l:'Tilspidsning af huller (°)',min:0,max:30,st:1,v:0},
  {note:'Hullerne bliver bredere foroven og smalner ind til den angivne størrelse i bunden.',show:P=>P.taper>0},
  {k:'hgap',l:'Afstand mellem huller',min:2,max:30,st:0.5,v:5},
  {k:'hm',l:'Kant omkring huller',min:3,max:20,st:0.5,v:6},
  {k:'R',l:'Hjørneradius',min:0,max:15,st:0.5,v:4},
  {sec:'Vægholder',show:P=>P.mode==='wall'},
  {k:'mount',l:'Montering',type:'select',opts:[['skadis','IKEA SKÅDIS'],['screw','Skruer'],['magnet','Magneter'],['tape','Dobbeltklæbende tape']],v:'skadis',show:P=>P.mode==='wall'},
  {k:'magD',l:'Magnet-diameter',min:3,max:15,st:0.5,v:6,show:P=>(P.mode==='wall'&&P.mount==='magnet')||(P.mode==='block'&&P.bmag)},
  {k:'magH',l:'Magnet-højde',min:1,max:5,st:0.5,v:2,show:P=>(P.mode==='wall'&&P.mount==='magnet')||(P.mode==='block'&&P.bmag)},
  {k:'Tb',l:'SKÅDIS-pladens tykkelse',min:4,max:7,st:0.1,v:5,show:P=>P.mode==='wall'&&P.mount==='skadis'},
  {k:'skLow',l:'Nederst på bagsiden',type:'select',opts:[['hook','Krog'],['stub','Tap'],['none','Ingen']],v:'hook',show:P=>P.mode==='wall'&&P.mount==='skadis'},
  {note:'Krogene sidder fast øverst på bagpladen, med en krog eller tap længere nede, når der er plads. Holderen printes på hovedet, så krogene ligger på printpladen.',show:P=>P.mode==='wall'&&P.mount==='skadis'},
  {k:'wh',l:'Bagpladens højde',min:20,max:200,st:1,v:80,show:P=>P.mode==='wall'},
  {k:'wt',l:'Bagpladens tykkelse',min:2,max:6,st:0.1,v:3,show:P=>P.mode==='wall'},
  {k:'st',l:'Hyldetykkelse',min:2,max:8,st:0.1,v:4,show:P=>P.mode==='wall'},
  {note:'Gælder hylden, sidevæggene og støtterne – bakken og bagpladen har deres egne indstillinger.',show:P=>P.mode==='wall'},
  {k:'wg',l:'Afstand fra væg til huller',min:2,max:40,st:0.5,v:6,show:P=>P.mode==='wall'},
  {k:'tray',l:'Bundbakke under hullerne',type:'check',v:true,show:P=>P.mode==='wall'},
  {note:'Med SKÅDIS bliver bakken en løs drypbakke, der skubbes ind på skinner – nem at tage ud og skylle.',show:P=>P.mode==='wall'&&P.mount==='skadis'&&P.tray},
  {k:'trayT',l:'Bakkens bundtykkelse',min:1.2,max:6,st:0.1,v:2,show:P=>P.mode==='wall'&&P.tray},
  {k:'lip',l:'Bakkens kant (højde over bunden)',min:2,max:20,st:0.5,v:6,show:P=>P.mode==='wall'&&P.tray},
  {k:'sd',l:'Skruediameter',min:2.5,max:6,st:0.5,v:4,show:P=>P.mode==='wall'&&P.mount==='screw'},
  {k:'shd',l:'Skruehovedets diameter',min:5,max:12,st:0.5,v:8,show:P=>P.mode==='wall'&&P.mount==='screw'},
  {sec:'Stående blok',show:P=>P.mode==='block'},
  {k:'bh',l:'Højde',min:15,max:250,st:1,v:60,show:P=>P.mode==='block'},
  {k:'bfb',l:'Bundtykkelse',min:1,max:20,st:0.5,v:3,show:P=>P.mode==='block'},
  {k:'drain',l:'Drænhul i bunden af hvert hul',type:'check',v:false,show:P=>P.mode==='block'},
  {k:'bmag',l:'Magneter i bunden',type:'check',v:false,show:P=>P.mode==='block'},
 ],
 onChange(T,k,v){if(k==='preset'){const p=HOLDER_PRESETS[v];
   if(p){if(T.P.mode!=='wall')T.setCtl('mode','wall');for(const [kk,vv] of Object.entries(p))T.setCtl(kk,kk==='holes'?vv.map(h=>({...h})):vv);}T.setCtl('preset','');}},
 after(T){const P=T.P,need=P.magH+1;if(P.mode==='wall'&&P.mount==='magnet'&&P.wt<need)T.setCtl('wt',need);if(P.mode==='block'&&P.bmag&&P.bfb<need)T.setCtl('bfb',need);},
 make(P){return buildHolder(P);},
 setup(m,S,P){S.mesh(m.view,0x2b7a78);if(m.trayView)S.mesh(m.trayView,0xd9622b);if(m.skadis){const W=m.dims[0],o=[];box(o,-W/2-40,W/2+40,0,P.Tb,-40,m.dims[2]+20);S.mesh(o,0xe8e2d6,null,true);}},
 files(m,P){const n=m.count,base=`holder_${P.mode==='wall'?'vaeg':'staaende'}_${n}-huller`;
   return [{name:base+(m.skadis?'_skadis':''),tris:m.print},...(m.trayPart?[{name:'drypbakke',tris:m.trayPart}]:[])];},
 stats(m,P){if(P.itype!=='slots'&&P.itype)return [['Mål',[m.W,m.D,m.H].map(f1).join(' × ')],['Huller',m.count<m.total?`${m.count} af ${m.total}`:String(m.count)],['Huldybde',`${f1(m.dep)} mm`]];return [['Mål (B × D × H)',m.dims.map(f1).join(' × ')],['Huller',m.count],...(m.skadis?[['Montering','SKÅDIS, faste kroge']]:[]),...(m.trayPart?[['Drypbakke','løs, printes for sig']]:[])];},
 tips:P=>P.mode==='wall'?[...(P.mount==='skadis'?[]:['Printes liggende på bagpladen – hylder og bakke står lodret, så der skal ingen support til.']),
   ...(P.mount==='skadis'?['Med SKÅDIS printes holderen på hovedet (toppen på pladen), som den ligger i filen – så kan krogene printes uden support.','Hæng den op: vip krogene ind i slidserne og lad holderen glide ned, så tappen går i slidsen nedenunder.',...(P.tray?['Drypbakken printes for sig og skubbes ind forfra.']:[])]:
   P.mount==='screw'?['Skruehullerne er forsænkede til undersænkhoveder.']:P.mount==='magnet'?['Magnethullerne er åbne mod væggen – lim magneterne i (fx med superlim).']:['Brug kraftig dobbeltklæbende monteringstape.']),
   ...(P.holes.some(h=>h.s==='s')?['Slidser til knive: mål bladets bredde og tykkelse lige under grebet, og læg 1–2 mm til.']:[])]
   :['Printes stående som den er.',...(P.drain?['Drænhullerne lader vand løbe ud – stil holderen på en lille bakke.']:[])],
});
// KABEL
TOOLS.push({id:'kabel',name:'Kabel',dl:'Download STL',
 init:{},
 defs:[
  {sec:'Type'},
  {k:'ctype',l:'Clips',type:'select',opts:[['desk','Til bordkanten'],['wall','Til væggen'],['loop','Kabelbøjle (bundt med klik-spalte)']],v:'desk'},
  {note:'Kabelbøjlen samler et bundt kabler i et kammer. Kablerne trykkes op gennem den smalle spalte forneden, hvor læben giver sig.',show:P=>P.ctype==='loop'},
  {sec:'Kammer',show:P=>P.ctype==='loop'},
  {k:'lD',l:'Kammerets dybde (ud fra væggen)',min:8,max:60,st:1,v:18,show:P=>P.ctype==='loop'},
  {k:'lH',l:'Kammerets højde',min:8,max:60,st:1,v:20,show:P=>P.ctype==='loop'},
  {k:'lg',l:'Spalte forneden',min:0.3,max:8,st:0.1,v:1.2,show:P=>P.ctype==='loop'},
  {note:'Lille spalte = kablerne bliver siddende. Sæt den lidt under det tyndeste kabels diameter.',show:P=>P.ctype==='loop'},
  {k:'lL',l:'Læbens længde',min:2,max:20,st:0.5,v:6,show:P=>P.ctype==='loop'},
  {k:'lt',l:'Vægtykkelse',min:1.2,max:4,st:0.1,v:2,show:P=>P.ctype==='loop'},
  {k:'lbt',l:'Bagpladens tykkelse',min:1.6,max:6,st:0.1,v:2.4,show:P=>P.ctype==='loop'},
  {sec:'Kabler',show:P=>P.ctype!=='loop'},
  {k:'cn',l:'Antal kabler',min:1,max:8,st:1,v:3,show:P=>P.ctype!=='loop'},
  {k:'cd',l:'Kabeldiameter',min:2,max:20,st:0.5,v:6,show:P=>P.ctype!=='loop'},
  {k:'co',l:'Åbning (andel af kabeldiameter)',min:0.5,max:0.95,st:0.05,v:0.7,show:P=>P.ctype!=='loop'},
  {note:'Mindre åbning = kablet sidder fastere, men er sværere at klikke i.',show:P=>P.ctype!=='loop'},
  {k:'cw',l:'Vægtykkelse',min:1.2,max:3,st:0.1,v:1.6,show:P=>P.ctype!=='loop'},
  {k:'w',l:'Clipsens bredde',min:6,max:80,st:1,v:12},
  {sec:'Bordkant',show:P=>P.ctype==='desk'||(P.ctype==='loop'&&P.mount==='desk')},
  {k:'T',l:P=>P.ctype==='loop'?'Pladens tykkelse':'Bordpladens tykkelse',min:8,max:60,st:0.5,v:20,show:P=>P.ctype==='desk'||(P.ctype==='loop'&&P.mount==='desk')},
  {k:'place',l:'Kablerne sidder',type:'select',opts:[['front','Foran på kanten'],['under','Under bordet']],v:'front',show:P=>P.ctype==='desk'},
  {k:'th',l:'Klemmens tykkelse',min:2.5,max:6,st:0.1,v:3.5,show:P=>P.ctype==='desk'||(P.ctype==='loop'&&P.mount==='desk')},
  {k:'jaw',l:'Klemmens længde',min:10,max:40,st:1,v:20,show:P=>P.ctype==='desk'||(P.ctype==='loop'&&P.mount==='desk')},
  {k:'sq',l:'Klemkraft',min:0.2,max:2,st:0.1,v:0.8,show:P=>P.ctype==='desk'||(P.ctype==='loop'&&P.mount==='desk')},
  {sec:'Montering',show:P=>P.ctype!=='desk'},
  {k:'bt',l:P=>P.mount==='skadis'?'Bagstykkets tykkelse':'Bundpladens tykkelse',min:1.6,max:5,st:0.1,v:2.4,show:P=>P.ctype==='wall'},
  {k:'mount',l:'Montering',type:'select',opts:[['skadis','IKEA SKÅDIS'],['screw','Skruer'],['magnet','Magneter'],['tape','Dobbeltklæbende tape'],['desk','Klemme over kanten (bagpå)']],v:'screw',optShow:(P,v)=>v!=='desk'||P.ctype==='loop',show:P=>(P.ctype==='wall'||P.ctype==='loop')},
  {k:'magD',l:'Magnet-diameter',min:3,max:15,st:0.5,v:6,show:P=>(P.ctype==='wall'||P.ctype==='loop')&&P.mount==='magnet'},
  {k:'magH',l:'Magnet-højde',min:1,max:5,st:0.5,v:2,show:P=>(P.ctype==='wall'||P.ctype==='loop')&&P.mount==='magnet'},
  {k:'nscrew',l:P=>P.mount==='magnet'?'Antal magneter':'Antal skruehuller',type:'select',opts:[[1,'1 (i den ene ende)'],[2,'2 (i begge ender)']],v:1,num:true,show:P=>(P.ctype==='wall'||P.ctype==='loop')&&(P.mount==='screw'||P.mount==='magnet')},
  {k:'Tb',l:'SKÅDIS-pladens tykkelse',min:4,max:7,st:0.1,v:5,show:P=>(P.ctype==='wall'||P.ctype==='loop')&&P.mount==='skadis'},
  {k:'hookPos',l:'Krogens placering',type:'select',opts:[['side','I siden (ingen support)'],['center','I midten (kræver support)']],v:'center',show:P=>(P.ctype==='wall'||P.ctype==='loop')&&P.mount==='skadis'},
  {note:'Med krogen i midten svæver den over printpladen – slå support til i slicer (kun fra printpladen).',show:P=>(P.ctype==='wall'||P.ctype==='loop')&&P.mount==='skadis'&&P.hookPos==='center'},
  {k:'skLow',l:'Ekstra krog længere nede',type:'select',opts:[['none','Ingen (lille clips)'],['hook','Krog'],['stub','Tap']],v:'none',show:P=>(P.ctype==='wall'||P.ctype==='loop')&&P.mount==='skadis'},
  {note:'SKÅDIS-clipsen er én flad profil med fast krog, der printes liggende, så den er stærk. Vælg en ekstra krog længere nede, hvis clipsen skal sidde helt fast – så bliver den højere.',show:P=>(P.ctype==='wall'||P.ctype==='loop')&&P.mount==='skadis'},
  {k:'sd',l:'Skruediameter',min:2.5,max:5,st:0.5,v:3.5,show:P=>(P.ctype==='wall'||P.ctype==='loop')&&P.mount==='screw'},
  {k:'shd',l:'Skruehovedets diameter',min:5,max:10,st:0.5,v:7,show:P=>(P.ctype==='wall'||P.ctype==='loop')&&P.mount==='screw'},
 ],
 after(T,k){const P=T.P,need=P.magH+1;if(P.ctype==='wall'&&P.mount==='magnet'&&P.bt<need)T.setCtl('bt',need);
  if(P.ctype==='loop'&&P.mount==='magnet'&&P.lbt<need)T.setCtl('lbt',need);if(P.ctype!=='loop'&&P.mount==='desk')T.setCtl('mount','screw');
  if(k==='ctype'&&P.ctype==='loop'&&P.w<25)T.setCtl('w',30);},
 make(P){return buildCable(P);},
 setup(m,S,P){S.mesh(m.view,0x2b7a78);if(m.skadis){const o=[];box(o,-40,40,0,m.skadis.Tb,-40,m.skadis.top+30);S.mesh(o,0xe8e2d6,null,true);}if(m.ghost){const g=m.ghost,o=[];box(o,g.x0,g.x1,g.y0,g.y1,g.z0,g.z1);S.mesh(o,0xc9bfae,null,true);}},
 files(m,P){if(P.ctype==='loop')return [{name:`kabelboejle_${P.mount}_${P.lD}x${P.lH}mm`,tris:m.tris}];return [{name:`kabelclips_${P.ctype==='desk'?'bordkant':P.mount==='skadis'?'skadis':'vaeg'}_${P.cn}x${String(P.cd).replace('.',',')}mm`,tris:m.tris}];},
 stats(m,P){return P.ctype==='loop'?[['Mål',m.dims.map(f1).join(' × ')],['Kammer',`${f1(P.lD)} × ${f1(P.lH)} mm`],['Spalte',`${f1(P.lg)} mm`]]:[['Mål',m.dims.map(f1).join(' × ')],['Kabler',`${P.cn} × Ø${f1(P.cd)} mm`]];},
 tips:P=>P.ctype==='loop'?['Printes liggende på siden, så profilen ligger fladt – så bliver læben fjedrende og stærk, og der skal ingen support til'+(P.mount==='skadis'&&P.hookPos==='center'?' (undtagen under krogen i midten)':'')+'.',
   ...(P.mount==='screw'?['Skru den fast gennem det store hul i forsiden – skruehovedet går igennem det.']:[]),
   ...(P.mount==='desk'?['Klemmen hægtes ned over kanten af en plade (fx bordplade, hylde eller skærmvæg); bøjlen hænger på den ene side og benet på den anden.']:[]),
   'Kablerne trykkes op i kammeret gennem spalten forneden.','Brug flere i træk langs væggen eller bordet for at føre et kabelbundt.']
  :[P.ctype==='desk'?'Printes liggende, så profilen ligger fladt – stærkest og ingen support.':P.mount==='skadis'?(P.hookPos==='center'?'Printes liggende. Krogen i midten skal have support under sig (kun fra printpladen).':'Printes liggende, så profilen ligger fladt – stærkest og ingen support.'):'Printes med bundpladen nedad.','Skal du bruge flere, så kopiér dem i slicerprogrammet.',P.ctype==='desk'?'Sidder den løst, så øg klemkraften eller mål bordpladen igen.':P.mount==='skadis'?'Kablerne klikkes ind i kanalerne forfra.':'Kablerne klikkes ned i kanalerne fra oven.'],
});

// INDSATS
const SLOTS={usba:{l:'USB-A (dongle/USB-stik)',sw:12.6,stk:4.9,sd:12,gx:5,gy:10},usbc:{l:'USB-C',sw:9,stk:3.6,sd:7,gx:5,gy:9},
  micro:{l:'Micro-USB',sw:8.2,stk:3.2,sd:6,gx:5,gy:9},sd:{l:'SD-kort',sw:24.6,stk:2.6,sd:18,gx:4,gy:4},microsd:{l:'microSD-kort',sw:11.4,stk:1.4,sd:8,gx:3,gy:3}};
TOOLS.push({id:'indsats',name:'Indsats',dl:'Download STL',
 init:{},
 defs:[
  {sec:'Type'},
  {k:'itype',l:'Indsats til',type:'select',opts:[['slots','USB, SD-kort m.m. (slidser)'],['bits','Bits (sekskant 1/4")'],['drill','Bor (runde huller)']],v:'slots'},
  {sec:'Slidser',show:P=>P.itype==='slots'},
  {k:'kind',l:'Til',type:'select',opts:Object.entries(SLOTS).map(([k,v])=>[k,v.l]).concat([['custom','Egne mål']]),v:'usba',show:P=>P.itype==='slots'},
  {k:'sw',l:'Slidsens længde',min:2,max:60,st:0.1,v:12.6,slot:true,show:P=>P.itype==='slots'},
  {k:'stk',l:'Slidsens bredde',min:0.8,max:20,st:0.1,v:4.9,slot:true,show:P=>P.itype==='slots'},
  {k:'sd',l:'Slidsens dybde',min:2,max:40,st:0.5,v:12,slot:true,show:P=>P.itype==='slots'},
  {k:'gx',l:'Afstand mellem slidser',min:1.5,max:30,st:0.5,v:5,slot:true,show:P=>P.itype==='slots'},
  {k:'gy',l:'Afstand mellem rækker',min:1.5,max:40,st:0.5,v:10,slot:true,show:P=>P.itype==='slots'},
  {note:'Afstanden mellem rækkerne skal give plads til selve donglen eller stikkets greb.',show:P=>P.itype==='slots'},
  {sec:'Bits',show:P=>P.itype==='bits'},
  {k:'bn',l:'Antal bits',min:1,max:80,st:1,v:12,show:P=>P.itype==='bits'},
  {k:'baf',l:'Sekskantens nøglevidde',min:3,max:14,st:0.05,v:6.35,show:P=>P.itype==='bits'},
  {note:'Almindelige bits er 1/4" = 6,35 mm målt mellem to flade sider.',show:P=>P.itype==='bits'},
  {k:'bdep',l:'Huldybde',min:3,max:50,st:0.5,v:10,show:P=>P.itype==='bits'},
  {sec:'Bor',show:P=>P.itype==='drill'},
  {k:'dlist',l:'Størrelser (mm)',type:'text',max:200,ph:'fx 2 3 4 5 6 8 10',v:'1 1,5 2 2,5 3 3,5 4 4,5 5 5,5 6 6,5 7 8 9 10',show:P=>P.itype==='drill'},
  {note:'Skriv borenes diameter adskilt af mellemrum. Komma eller punktum som decimaltegn.',show:P=>P.itype==='drill'},
  {k:'ddep',l:'Huldybde',min:3,max:50,st:0.5,v:15,show:P=>P.itype==='drill'},
  {k:'lbl',l:'Størrelsen skrevet under hvert hul',type:'check',v:true,show:P=>P.itype==='drill'},
  {k:'lsz',l:'Tekststørrelse',min:2,max:8,st:0.5,v:3.5,show:P=>P.itype==='drill'&&P.lbl},
  {sec:'Huller',show:P=>P.itype!=='slots'},
  {k:'cl',l:'Ekstra plads i hullerne',min:0,max:1.5,st:0.05,v:0.35,show:P=>P.itype!=='slots'},
  {k:'hg',l:'Afstand mellem hullerne',min:1.5,max:20,st:0.5,v:3,show:P=>P.itype!=='slots'},
  {k:'auto',l:'Tilpas størrelsen til hullerne',type:'check',v:true,show:P=>P.itype!=='slots'},
  {sec:'Mål'},
  {k:'fit',l:'Tilpas til',type:'select',opts:[['','Vælg …'],['skuffe','Skuffe fra Skuffer-fanen'],['aeske','Æske fra Æske-fanen']],v:'',noGeom:true},
  {note:'Fylder hele skuffen/æsken. Har den skillevægge, så skriv målene på ét rum i stedet.'},
  {k:'W',l:P=>P.itype!=='slots'&&P.auto?'Største bredde':'Bredde',min:15,max:300,st:0.5,v:100},
  {k:'D',l:'Dybde',min:10,max:300,st:0.5,v:80,show:P=>P.itype==='slots'||!P.auto},
  {k:'H',l:'Højde',min:3,max:60,st:0.5,v:14},
  {k:'edge',l:'Kant',min:2,max:15,st:0.5,v:3},
  {k:'R',l:'Hjørneradius',min:0,max:15,st:0.5,v:3},
  {k:'fb',l:'Bundtykkelse',min:0.8,max:5,st:0.1,v:1.2},
  {k:'mag',l:'Magneter i bunden (4 hjørner)',type:'check',v:false},
  {k:'magD',l:'Magnet-diameter',min:3,max:15,st:0.5,v:6,show:P=>P.mag},
  {k:'magH',l:'Magnet-højde',min:1,max:5,st:0.5,v:2,show:P=>P.mag},
 ],
 onChange(T,k,v){
   if(k==='kind'&&SLOTS[v])for(const kk of ['sw','stk','sd','gx','gy'])T.setCtl(kk,SLOTS[v][kk]);
   if(T.ctrls[k]&&T.ctrls[k].d.slot&&T.P.kind!=='custom')T.setCtl('kind','custom');
   if(k==='fit'){let w,d,h;
     if(v==='skuffe'){const P=TOOLS.find(t=>t.id==='skuffer').P,C=drawerCalc(P);w=C.iw-0.8;d=C.id-0.8;h=C.dh-P.dfb-1;}
     if(v==='aeske'){const P=TOOLS.find(t=>t.id==='aeske').P,E=eff(Object.assign({},P,{tb:null}));w=E.W-2*E.t-0.8;d=E.D-2*E.t-0.8;h=E.Hb-E.fbB-(E.lip?E.lipH+E.fit:0)-0.5;}
     if(w){const r=x=>Math.floor(x*2)/2,dp=T.P.itype==='bits'?T.P.bdep:T.P.itype==='drill'?T.P.ddep:T.P.sd;if(T.P.itype!=='slots')T.setCtl('auto',false);
       T.setCtl('W',r(w));T.setCtl('D',r(d));T.setCtl('H',Math.max(3,Math.min(60,r(Math.min(h,Math.max(dp+T.P.fb,T.P.H))))));}
     T.setCtl('fit','');}},
 after(T,k){const P=T.P,need=P.magH+1,dp=P.itype==='bits'?P.bdep:P.itype==='drill'?P.ddep:P.sd;
   if(P.mag&&P.H-Math.min(dp,P.H-P.fb)<need)T.setCtl('H',Math.min(60,Math.ceil((dp+need)*2)/2));
   else if(P.itype!=='slots'&&(k==='itype'||k==='bdep'||k==='ddep')&&P.H<dp+P.fb)T.setCtl('H',Math.min(60,Math.ceil((dp+P.fb+0.5)*2)/2));},
 make(P){if(P.itype==='slots'||!P.itype)return buildInsert(P);
   if(P.itype==='drill')P.lbls=P.lbl?parseSizes(P.dlist).map(d=>textBitmap(String(+d.toFixed(2)).replace('.',','),P.lsz,Math.max(d+P.cl,P.lsz*2.6),P.lsz*1.6)):null;
   const m=buildBitInsert(P);if(P.lbl&&P.lbls&&P.lbls.some(x=>!x))m.warn.push('Teksten er for lille til at blive printet – gør tekststørrelsen større.');return m;},
 setup(m,S){S.mesh(m.tris,0x2b7a78);},
 files(m,P){if(P.itype==='bits')return [{name:`indsats_bits_${m.count}stk`,tris:m.tris}];if(P.itype==='drill')return [{name:`indsats_bor_${m.count}stk`,tris:m.tris}];return [{name:`indsats_${P.kind}_${m.cols}x${m.rows}`,tris:m.tris}];},
 stats(m,P){return [['Mål',[P.W,P.D,P.H].map(f1).join(' × ')],['Slidser',`${m.count} (${m.cols} × ${m.rows})`],['Slids',`${f1(P.sw)} × ${f1(P.stk)} × ${f1(m.depth||P.sd)} mm`]];},
 tips:P=>P.itype==='bits'?['Printes som den ligger, med hullerne opad.','Sidder bitsene for stramt eller løst, så justér “Ekstra plads” med 0,05–0,1 mm.','Brug “Tilpas til” for at få den til at passe ned i en skuffe eller æske.']:P.itype==='drill'?['Printes som den ligger, med hullerne opad.','Små huller bliver ofte lidt for små i print – “Ekstra plads” på 0,3–0,5 mm plejer at passe.','Tallene er fordybet i toppen; skift evt. filamentfarve i laget lige under toppen, så de står tydeligt.']:['Printes som den ligger, med slidserne opad.','Sidder stikkene for stramt eller løst, så justér slidsens bredde med 0,1–0,2 mm.','Brug “Tilpas til” for at få den til at passe ned i en skuffe eller æske.'],
});

// LYS (fyrfadsholder)
const CANDLE={std:{cd:39.4,ch:12},maxi:{cd:59.6,ch:14}};
TOOLS.push({id:'lys',name:'Lys',dl:'Download STL',
 init:{},
 defs:[
  {sec:'Type'},
  {k:'type',l:'Model',type:'select',opts:[['spike','Med stilk (til ler/oasis)'],['eyelet','Med øskner til ståltråd'],['plain','Uden stilk og øskner']],v:'spike'},
  {k:'count',l:'Antal i filen',min:1,max:12,st:1,v:4},
  {sec:'Fyrfadslys'},
  {k:'size',l:'Størrelse',type:'select',opts:[['std','Almindeligt (Ø 38 mm)'],['maxi','Maxi (Ø 58 mm)'],['custom','Egne mål']],v:'std'},
  {k:'cd',l:'Indvendig diameter',min:20,max:80,st:0.1,v:39.4,csz:true},
  {k:'ch',l:'Indvendig højde',min:4,max:30,st:0.5,v:12,csz:true},
  {k:'t',l:'Vægtykkelse',min:1,max:4,st:0.1,v:1.6},
  {k:'fb',l:'Bundtykkelse',min:1,max:5,st:0.1,v:2},
  {k:'mag',l:'Magnet i bunden',type:'check',v:false,show:P=>P.type!=='spike'},
  {k:'magD',l:'Magnet-diameter',min:3,max:15,st:0.5,v:6,show:P=>P.type!=='spike'&&P.mag},
  {k:'magH',l:'Magnet-højde',min:1,max:5,st:0.5,v:2,show:P=>P.type!=='spike'&&P.mag},
  {sec:'Stilk',show:P=>P.type==='spike'},
  {k:'sl',l:'Længde',min:15,max:120,st:1,v:40,show:P=>P.type==='spike'},
  {k:'sd',l:'Tykkelse ved bunden',min:3,max:12,st:0.5,v:6,show:P=>P.type==='spike'},
  {k:'tip',l:'Spidsens tykkelse',min:0.4,max:4,st:0.1,v:1,show:P=>P.type==='spike'},
  {sec:'Øskner',show:P=>P.type==='eyelet'},
  {k:'en',l:'Antal øskner',type:'select',opts:[[2,'2 (én i hver side)'],[4,'4 (to i hver side)']],v:2,num:true,show:P=>P.type==='eyelet'},
  {k:'hd',l:'Hul til ståltråd (Ø)',min:0.8,max:4,st:0.1,v:1.8,show:P=>P.type==='eyelet'},
  {k:'ew',l:'Øskens bredde',min:4,max:14,st:0.5,v:7,show:P=>P.type==='eyelet'},
  {k:'ep',l:'Hvor langt den stikker ud',min:3,max:15,st:0.5,v:6,show:P=>P.type==='eyelet'},
  {k:'et',l:'Øskens tykkelse',min:1.5,max:6,st:0.1,v:3,show:P=>P.type==='eyelet'},
  {note:'Sikkerhed: brug LED-fyrfadslys. Et brændende fyrfadslys kan blive så varmt, at PLA bliver blødt. Skal der bruges levende lys, så print i PETG eller ASA, og lad aldrig lyset brænde uden opsyn.'},
 ],
 onChange(T,k,v){
   if(k==='size'&&CANDLE[v])for(const [kk,vv] of Object.entries(CANDLE[v]))T.setCtl(kk,vv);
   if(T.ctrls[k]&&T.ctrls[k].d.csz&&T.P.size!=='custom')T.setCtl('size','custom');},
 after(T){const P=T.P,need=P.magH+1;if(P.mag&&P.type!=='spike'&&P.fb<need)T.setCtl('fb',need);},
 make(P){return buildCandle(P);},
 setup(m,S,P){S.mesh(m.tris,0x2b7a78);const o=[],r=Math.max(5,P.cd/2-0.5),h=P.size==='maxi'?22:16;prism(o,circ(0,0,r,64),P.fb,P.fb+h);S.mesh(o,0xf3e7c9,null,true);},
 files(m,P){return [{name:`fyrfadsholder_${P.type==='spike'?'stilk':P.type==='eyelet'?'oesken':'enkel'}_${P.count}-stk`,tris:candlePrint(m,P)}];},
 stats(m,P){return [['Udvendig diameter',f1(2*m.Ro)+' mm'],['Højde',f1(m.Ht)+(P.type==='spike'?' + stilk '+f1(P.sl):'')+' mm'],['Antal i filen',P.count]];},
 tips:P=>[P.type==='spike'?'Printes på hovedet med kanten på pladen og stilken opad (som i filen). Bunden bygges som en bro – det klarer de fleste printere uden support.':'Printes stående som den er – ingen support.',
   ...(P.type==='eyelet'?['Træk ståltråden gennem øskerne og snor den om grenen eller kransen.']:[]),
   'Brug LED-fyrfadslys. Levende lys kan gøre PLA blødt – brug i så fald PETG eller ASA, og lad aldrig lyset brænde uden opsyn.'],
});


// BAKKER
TOOLS.push({id:'bakke',name:'Bakker',dl:'Download STL',
 init:{},
 defs:[
  {sec:'Mål (udvendigt)'},
  {k:'W',l:'Bredde',min:20,max:300,st:1,v:120},
  {k:'D',l:'Dybde',min:20,max:300,st:1,v:80},
  {k:'H',l:'Højde (uden fod)',min:10,max:150,st:1,v:40},
  {sec:'Rum'},
  {k:'cols',l:'Rum i bredden',min:1,max:10,st:1,v:3},
  {k:'rows',l:'Rum i dybden',min:1,max:10,st:1,v:2},
  {k:'dt',l:'Skillevæggenes tykkelse',min:0.8,max:4,st:0.1,v:1.2},
  {k:'dlow',l:'Skillevægge lavere end kanten',min:0,max:40,st:0.5,v:0},
  {sec:'Bakke'},
  {k:'t',l:'Vægtykkelse',min:0.8,max:4,st:0.1,v:1.6},
  {k:'fb',l:'Bundtykkelse',min:0.8,max:5,st:0.1,v:1.2},
  {k:'R',l:'Hjørneradius',min:0.5,max:30,st:0.5,v:5},
  {sec:'Stabling'},
  {k:'stack',l:'Stabelbar (fod der passer ned i bakken under)',type:'check',v:true},
  {k:'lipH',l:'Fodens højde',min:1.5,max:8,st:0.5,v:3,show:P=>P.stack},
  {k:'c',l:'Frigang',min:0.1,max:0.8,st:0.05,v:0.25,show:P=>P.stack},
  {note:'Foden er lidt mindre end bakkens åbning og har en skrå overgang, så bakkerne centrerer sig selv, når de stables. Lav bakker med samme bredde og dybde, så passer de alle oven i hinanden.',show:P=>P.stack},
 ],
 make(P){return buildBin(P);},
 setup(m,S,P){S.mesh(m.tris,0x2b7a78);if(P.stack){const dz=m.Htot-m.lipH-P.c,o=m.tris.map((v,i)=>i%3===2?v+dz:v);S.mesh(o,0x2b7a78,null,true);}},
 files(m,P){return [{name:`bakke_${P.cols}x${P.rows}-rum_${P.W}x${P.D}x${f1(m.Htot)}`,tris:m.tris}];},
 stats(m,P){return [['Mål (B × D × H)',[P.W,P.D,m.Htot].map(f1).join(' × ')],['Rum',m.cells],['Hvert rum',`${f1(m.cw)} × ${f1(m.cd)} mm`]];},
 tips:P=>['Printes som den står, med åbningen opad – ingen support.',...(P.stack?['Den skrå fod printer fint uden support. Den gennemsigtige bakke i visningen viser, hvordan næste bakke sidder.']:[]),'En vægtykkelse på 2 × din linjebredde (fx 0,8 eller 1,6 mm med 0,4-dyse) giver de pæneste vægge.'],
});

// SKILTE
TOOLS.push({id:'skilt',name:'Skilte',dl:'Download STL',
 init:{},
 defs:[
  {sec:'Tekst'},
  {k:'text',l:'Tekst',type:'text',max:40,ph:'fx SKRUER',v:'SKRUER'},
  {k:'size',l:'Tekststørrelse (versalhøjde)',min:3,max:40,st:0.5,v:9},
  {k:'style',l:'Tekst',type:'select',opts:[['raised','Hævet'],['recessed','Fordybet']],v:'raised',show:P=>P.mount!=='shelf'},
  {k:'th',l:P=>P.style==='raised'&&P.mount!=='shelf'?'Tekstens højde':'Tekstens dybde',min:0.4,max:2,st:0.1,v:0.8},
  {sec:'Skilt'},
  {k:'autoW',l:'Bredde efter teksten',type:'check',v:true},
  {k:'W',l:'Bredde',min:15,max:250,st:1,v:80,show:P=>!P.autoW},
  {k:'H',l:'Højde',min:8,max:100,st:0.5,v:20},
  {k:'pad',l:'Kant omkring teksten',min:1,max:20,st:0.5,v:4},
  {k:'T',l:'Tykkelse',min:1.2,max:8,st:0.1,v:2.4},
  {k:'R',l:'Hjørneradius',min:0,max:20,st:0.5,v:3},
  {k:'frame',l:'Hævet ramme',type:'check',v:true,show:P=>P.style==='raised'&&P.mount!=='shelf'},
  {k:'fw',l:'Rammens bredde',min:0.6,max:4,st:0.1,v:1.2,show:P=>P.style==='raised'&&P.mount!=='shelf'&&P.frame},
  {sec:'Montering'},
  {k:'mount',l:'Montering',type:'select',opts:[['none','Ingen / dobbeltklæbende tape'],['magnet','Magneter'],['screw','Skruer (2)'],['shelf','Klemme på hyldekant']],v:'none'},
  {k:'magD',l:'Magnet-diameter',min:3,max:15,st:0.5,v:6,show:P=>P.mount==='magnet'},
  {k:'magH',l:'Magnet-højde',min:1,max:5,st:0.5,v:2,show:P=>P.mount==='magnet'},
  {k:'sd',l:'Skruediameter',min:2,max:6,st:0.5,v:3.5,show:P=>P.mount==='screw'},
  {k:'shd',l:'Skruehovedets diameter',min:4,max:12,st:0.5,v:7,show:P=>P.mount==='screw'},
  {k:'Ts',l:'Hyldens tykkelse',min:4,max:40,st:0.5,v:18,show:P=>P.mount==='shelf'},
  {k:'ta',l:'Armenes tykkelse',min:2,max:6,st:0.1,v:3,show:P=>P.mount==='shelf'},
  {k:'jaw',l:'Armenes længde',min:8,max:40,st:1,v:15,show:P=>P.mount==='shelf'},
  {k:'sq',l:'Klemkraft',min:0,max:2,st:0.1,v:0.6,show:P=>P.mount==='shelf'},
  {note:'Skiltet sættes på forkanten af hylden: den øverste arm ligger på hylden, den nederste griber under. Det printes med forsiden nedad, så teksten bliver fordybet og forsiden helt glat.',show:P=>P.mount==='shelf'},
 ],
 after(T){const P=T.P;if(P.mount==='shelf'&&P.H<P.Ts+2*P.ta+1)T.setCtl('H',Math.ceil(P.Ts+2*P.ta+1));if(P.mount==='magnet'){const need=Math.ceil((P.magH+1+(P.style==='raised'?0:P.th)+0.4)*10)/10;if(P.T<need)T.setCtl('T',need);}},
 make(P){const scr=P.mount==='screw'?2*(P.shd+5):0;
   const tb=textBitmap(P.text,P.size,P.autoW?400:Math.max(4,P.W-2*P.pad),Math.max(2,P.H-2*P.pad));
   const m=buildSign(P,tb);if((P.text||'').trim()&&!tb)m.warn.push('Teksten kan ikke være der – gør skiltet større eller teksten mindre.');return m;},
 setup(m,S,P){S.mesh(m.tris,0x2b7a78);if(m.shelfBand){const o=[],[a,b]=m.shelfBand;box(o,-m.W/2-30,m.W/2+30,a,b,P.T+0.2,P.T+80);S.mesh(o,0xc9bfae,null,true);}},
 files(m,P){return [{name:`skilt_${safe(P.text||'tomt')}`,tris:m.tris}];},
 stats(m,P){return [['Mål',[m.W,m.H,m.T].map(f1).join(' × ')],['Tekst',(P.text||'').trim()?`${P.mount==='shelf'||P.style!=='raised'?'fordybet':'hævet'} ${f1(P.th)} mm`:'ingen']];},
 tips:P=>P.mount==='shelf'?['Printes med forsiden nedad (som i filen) – armene står lodret og printer uden support.','Vil du have farvet tekst, så fyld fordybningerne med maling eller voks, eller skift filament efter de første lag (ved '+f1(Math.min(P.th,P.T-0.8)).replace('.',',')+' mm).']
   :P.style==='raised'?['Printes fladt med teksten opad.',`Skift filamentfarve ved ${f1(P.T).replace('.',',')} mm (i slicerens lagvisning), så teksten${P.frame?' og rammen':''} får en anden farve.`,...(P.mount==='magnet'?['Magnethullerne sidder i bagsiden – lim magneterne i.']:[])]
   :['Printes fladt med teksten opad.',`Skift filament ved ${f1(P.T-Math.min(P.th,P.T-0.8)).replace('.',',')} mm, så bunden af bogstaverne får en anden farve – eller fyld dem med maling.`,...(P.mount==='magnet'?['Magnethullerne sidder i bagsiden – lim magneterne i.']:[])],
});

// BATTERIER
TOOLS.push({id:'batteri',name:'Batterier',dl:'Download STL',
 init:{},
 defs:[
  {sec:'Batterier (antal)'},
  {k:'n_AA',l:'AA',min:0,max:40,st:1,v:8},
  {k:'n_AAA',l:'AAA',min:0,max:40,st:1,v:8},
  {k:'n_C',l:'C',min:0,max:20,st:1,v:0},
  {k:'n_D',l:'D',min:0,max:20,st:1,v:0},
  {k:'n_b9V',l:'9V',min:0,max:20,st:1,v:2},
  {k:'n_b18650',l:'18650',min:0,max:20,st:1,v:0},
  {k:'n_CR2032',l:'CR2032 (knapcelle)',min:0,max:20,st:1,v:4},
  {k:'n_CR2025',l:'CR2025 (knapcelle)',min:0,max:20,st:1,v:0},
  {sec:'Holder'},
  {k:'pct',l:'Hvor dybt de står (% af længden)',min:25,max:80,st:5,v:45},
  {k:'W',l:'Største bredde',min:40,max:300,st:1,v:120},
  {k:'hg',l:'Afstand mellem batterierne',min:1.5,max:10,st:0.5,v:2.5},
  {k:'edge',l:'Kant',min:2,max:15,st:0.5,v:4},
  {k:'fb',l:'Bundtykkelse',min:1,max:8,st:0.5,v:2},
  {k:'R',l:'Hjørneradius',min:0,max:20,st:0.5,v:3},
  {k:'cl',l:'Ekstra plads i hullerne',min:0,max:1.5,st:0.05,v:0.4},
  {k:'lbl',l:'Typen skrevet ved hver række',type:'check',v:true},
  {k:'lsz',l:'Tekststørrelse',min:2,max:8,st:0.5,v:4,show:P=>P.lbl},
  {k:'mag',l:'Magneter i bunden',type:'check',v:false},
  {k:'magD',l:'Magnet-diameter',min:3,max:15,st:0.5,v:6,show:P=>P.mag},
  {k:'magH',l:'Magnet-højde',min:1,max:5,st:0.5,v:2,show:P=>P.mag},
 ],
 after(T){const P=T.P,need=P.magH+1;if(P.mag&&P.fb<need)T.setCtl('fb',need);},
 make(P){const labels=P.lbl?battCells(P).map(it=>textBitmap(it.b.n,P.lsz,P.lsz*5,P.lsz*1.6)):null;
   const m=buildBattery(P,labels);if(P.lbl&&labels&&labels.some(x=>!x))m.warn.push('Teksten er for lille til at blive printet – gør den større.');return m;},
 setup(m,S,P){S.mesh(m.tris,0x2b7a78);},
 files(m,P){return [{name:`batteriholder_${m.list.map(it=>it.n+'x'+it.b.n).join('_')||'tom'}`,tris:m.tris}];},
 stats(m,P){return [['Mål (B × D × H)',[m.W,m.D,m.H].map(f1).join(' × ')],['Batterier',m.list.map(it=>`${it.n} × ${it.b.n}`).join(', ')||'ingen']];},
 tips:P=>['Printes som den ligger, med hullerne opad – ingen support.','Sidder batterierne for stramt, så øg “Ekstra plads”.',...(P.lbl?['Skift evt. filamentfarve i det øverste lag, så typerne står tydeligt.']:[]),...(P.mag?['Lim magneterne i hullerne i bunden – så sidder holderen fast på køleskabet eller en metalhylde.']:[])],
});

// STIKDÅSE
TOOLS.push({id:'stik',name:'Stikdåse',dl:'Download STL',
 init:{},
 defs:[
  {sec:'Form'},
  {k:'form',l:'Model',type:'select',opts:[['clip','Enkelte holdere (bøjler)'],['channel','Samlet holder (2 bøjler + bjælke)'],['stand','Stander til bordet (skrå)']],v:'clip'},
  {k:'count',l:'Antal i filen',min:1,max:8,st:1,v:2,show:P=>P.form!=='channel'},
  {sec:'Stikdåsen (mål den)'},
  {k:'sw',l:'Bredde (på tværs)',min:20,max:120,st:0.5,v:55},
  {k:'sh',l:'Højde (tykkelse)',min:15,max:80,st:0.5,v:40},
  {k:'sl',l:'Længde',min:80,max:600,st:1,v:300},
  {note:'Der lægges automatisk 0,5 mm frigang til.'},
  {sec:'Holder'},
  {k:'cw',l:P=>P.form==='stand'?'Standerens bredde (langs dåsen)':'Bøjlens bredde',min:10,max:600,st:1,v:22},
  {note:'Sæt bredden til dåsens længde for at få én samlet stander.',show:P=>P.form==='stand'},
  {k:'bw',l:'Bjælkens højde',min:8,max:80,st:1,v:20,show:P=>P.form==='channel'&&P.mount!=='skadis'&&P.mount!=='desk'},
  {k:'tb',l:'Bundtykkelse',min:2,max:6,st:0.1,v:3},
  {k:'ta',l:'Sidernes tykkelse',min:1.6,max:6,st:0.1,v:3},
  {k:'lip',l:'Kantens greb over dåsen',min:1.5,max:10,st:0.5,v:4},
  {k:'tl',l:'Kantens tykkelse',min:1.6,max:6,st:0.1,v:3,show:P=>P.form!=='channel'},
  {k:'ang',l:'Vinkel (°)',min:15,max:80,st:1,v:45,show:P=>P.form==='stand'},
  {k:'tw',l:'Godstykkelse i foden',min:2,max:6,st:0.1,v:3,show:P=>P.form==='stand'},
  {sec:'Montering'},
  {k:'mount',l:'Montering',type:'select',opts:[['skadis','IKEA SKÅDIS'],['screw','Skruehuller'],['magnet','Magneter'],['desk','Bordkant (klemme)'],['none','Ingenting']],v:'screw'},
  {note:'Med SKÅDIS hænger standeren på væggen med bunden mod pladen, så dåsen vender skråt ud og op.',show:P=>P.form==='stand'&&P.mount==='skadis'},
  {k:'standDesk',l:'Klemmen sidder',type:'select',opts:[['back','Bagpå (ved bordets bagkant – dåsen vender mod dig)'],['front','Forrest (ved bordets forkant)']],v:'back',show:P=>P.form==='stand'&&P.mount==='desk'},
  {note:'Bunden ligger på bordet som overkæbe, og en plade går ned langs bordkanten med en kæbe ind under bordet.',show:P=>P.form==='stand'&&P.mount==='desk'},
  {note:'Skruehullet sidder i en tap bag standeren, så du kan komme til med skruetrækkeren.',show:P=>P.form==='stand'&&P.mount==='screw'},
  {k:'sd',l:'Skruediameter',min:2.5,max:6,st:0.5,v:4,show:P=>P.mount==='screw'},
  {k:'shd',l:'Skruehovedets diameter',min:5,max:12,st:0.5,v:8,show:P=>P.mount==='screw'},
  {k:'magD',l:'Magnet-diameter',min:3,max:15,st:0.5,v:6,show:P=>P.mount==='magnet'},
  {k:'magH',l:'Magnet-højde',min:1,max:5,st:0.5,v:2,show:P=>P.mount==='magnet'},
  {k:'deskPos',l:'Placering',type:'select',opts:[['front','Foran bordkanten'],['under','Under bordet']],v:'front',show:P=>P.mount==='desk'&&P.form!=='stand'},
  {k:'T',l:'Bordpladens tykkelse',min:8,max:55,st:0.5,v:20,show:P=>P.mount==='desk'},
  {k:'th',l:'Klemmens tykkelse',min:2.5,max:6,st:0.1,v:3.5,show:P=>P.mount==='desk'},
  {k:'jaw',l:'Klemmens længde',min:10,max:40,st:1,v:20,show:P=>P.mount==='desk'},
  {k:'sq',l:'Klemkraft',min:0.2,max:2,st:0.1,v:0.8,show:P=>P.mount==='desk'},
  {note:'Dåsen hænger foran bordkanten med toppen i flugt med bordpladen. Den samlede holder printes stående.',show:P=>P.mount==='desk'&&P.form!=='stand'&&P.deskPos!=='under'},
  {note:'Dåsen hænger under bordet og klikkes op i bøjlen nedefra. Klemmen griber om kanten, og en lille knast inderst giver klemkraft. Den samlede holder printes stående.',show:P=>P.mount==='desk'&&P.form!=='stand'&&P.deskPos==='under'},
  {k:'Tb',l:'SKÅDIS-pladens tykkelse',min:4,max:7,st:0.1,v:5,show:P=>P.mount==='skadis'},
  {k:'hookPos',l:'Krogens placering',type:'select',opts:[['side','I siden (ingen support)'],['center','I midten (kræver support)']],v:'side',show:P=>P.mount==='skadis'&&P.form!=='channel'},
  {k:'skLow',l:'Nederst på bagsiden',type:'select',opts:[['hook','Krog'],['stub','Tap'],['none','Ingen']],v:'hook',show:P=>P.mount==='skadis'},
  {note:'Med SKÅDIS hænger den samlede holder lodret og printes stående. Den nederste bøjle får 45°-ribber, så den kan printes uden support.',show:P=>P.mount==='skadis'&&P.form==='channel'},
 ],
 after(T){const f=T.P.form,m=T.P.mount;

   if(T.P.mount==='magnet'){const need=T.P.magH+1;if(T.P.tb<need)T.setCtl('tb',need);if(f==='stand'&&T.P.tw<need)T.setCtl('tw',need);}},
 make(P){return buildStrip(P);},
 setup(m,S,P){S.mesh(m.view,0x2b7a78);S.mesh(m.ghost,0xf2efe9,null,true);
   if(P.mount==='skadis'){const o=[];box(o,-P.sl/2-40,P.sl/2+40,0,P.Tb,-90,(P.form==='channel'?m.dims[0]:0)+60);S.mesh(o,0xe8e2d6,null,true);}},
 files(m,P){const nm={clip:'stikdaase-holder',channel:'stikdaase-holder_samlet',stand:'stikdaase-stander'}[P.form];
   return [{name:`${nm}_${Math.round(P.sw)}x${Math.round(P.sh)}${P.mount==='skadis'?'_skadis':''}`,tris:m.print}];},
 stats(m,P){return [['Mål',m.dims.map(f1).join(' × ')],...(P.form!=='channel'?[['Antal i filen',P.form==='stand'&&P.cw>=P.sl*0.6?1:P.count]]:[])];},
 tips:P=>[...(P.form==='clip'?['Bøjlerne printes liggende på siden (som i filen) – så er de stærkest og kan fjedre uden at knække.',P.mount==='skadis'&&P.hookPos==='center'?'Krogen i midten skal have support under sig (kun fra printpladen).':'Ingen support nødvendig.']
   :P.form==='channel'?[P.mount==='skadis'||P.mount==='desk'?'Printes stående med den øverste ende nedad (som i filen). Ribberne under den nederste bøjle gør, at der ikke skal bruges support.':'Printes med bunden nedad. Kanterne har skrå underside, så der skal ingen support til.']
   :['Printes liggende på siden (som i filen) – ingen support'+(P.mount==='skadis'&&P.hookPos==='center'?', bortset fra under krogen i midten.':'.'),...(P.mount==='skadis'||P.mount==='desk'?[]:['Standeren får automatisk en fod fremad, så den ikke vælter ved stejle vinkler.'])]),
   'Dåsen klikkes ned mellem kanterne. Er den for stram, så mindsk kantens greb.',...(P.mount==='magnet'?['Magnethullerne er åbne mod monteringsfladen – lim magneterne i.']:[])],
});

// ---------- Kontroller ----------
const ctl=document.getElementById('controls');
for(const T of TOOLS){
  T.P=Object.assign({},JSON.parse(JSON.stringify(T.init)));T.ctrls={};T.hudV=T.hud?T.hud.v:0;
  T.el=document.createElement('div');T.el.id='tool-'+T.id;T.el.style.display='none';ctl.appendChild(T.el);
  T.setCtl=(k,v)=>{T.P[k]=v;if(T.ctrls[k])T.ctrls[k].set(v);};
  T.secs=[];T.cards=[];let card=null;
  const newCard=()=>{card=document.createElement('div');card.className='card';T.el.appendChild(card);T.cards.push(card);return card;};
  for(const d of T.defs){
    if(d.sec){newCard();const s=document.createElement('div');s.className='sec';s.textContent=d.sec;card.appendChild(s);T.secs.push({el:s,d});continue;}
    if(!card)newCard();
    if(d.note){const s=document.createElement('div');s.className='note';s.textContent=d.note;card.appendChild(s);T.secs.push({el:s,d});continue;}
    T.P[d.k]=Array.isArray(d.v)?d.v.map(x=>({...x})):d.v;const r=document.createElement('div');r.className='row'+(d.type==='check'?' chk':'');r.dataset.k=d.k;
    let set,labEl;
    if(d.type==='check'){
      r.innerHTML=`<label><input type="checkbox"> <span></span></label>`;const i=r.querySelector('input');labEl=r.querySelector('span');
      i.checked=d.v;i.onchange=()=>change(T,d,i.checked);set=v=>{i.checked=v;};
    }else if(d.type==='select'){
      r.innerHTML=`<label><span></span><select>${d.opts.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label>`;
      const s=r.querySelector('select');labEl=r.querySelector('span');s.value=d.v;s.onchange=()=>change(T,d,d.num?+s.value:s.value);set=v=>{s.value=v;};
    }else if(d.type==='holes'){
      r.innerHTML=`<label><span></span></label><div class="hl"></div><button class="addhole">+ Tilføj hul</button>`;
      const hl=r.querySelector('.hl');labEl=r.querySelector('span');
      const render=()=>{hl.innerHTML='<div class="hhead"><span>Form</span><span>Størrelse (mm)</span><span>Antal</span><span></span></div>';
        T.P[d.k].forEach((h,i)=>{const row=document.createElement('div');row.className='hrow';
          row.innerHTML=`<select><option value="c">Rund</option><option value="s">Slids</option></select><span class="sz"><input type="number" class="a" step="0.5" min="2" max="150"><i>×</i><input type="number" class="b" step="0.5" min="0.8" max="40"></span><input type="number" class="nn" step="1" min="1" max="20"><button class="del" title="Fjern">✕</button>`;
          const [sel_,a,b,nn]=[row.querySelector('select'),row.querySelector('.a'),row.querySelector('.b'),row.querySelector('.nn')];
          sel_.value=h.s;a.value=h.a;b.value=h.b;nn.value=h.n;
          const vis=()=>{const sl=sel_.value==='s';b.style.display=row.querySelector('i').style.display=sl?'':'none';a.title=sl?'Længde':'Diameter';b.title='Bredde';};vis();
          const upd=()=>{const H=T.P[d.k].map(x=>({...x}));const c=(v,lo,hi,df)=>{v=+v;return isFinite(v)&&v>0?Math.min(hi,Math.max(lo,v)):df;};
            H[i]={s:sel_.value,a:c(a.value,2,150,h.a),b:c(b.value,0.8,40,h.b),n:Math.round(c(nn.value,1,20,h.n))};vis();change(T,d,H);};
          sel_.onchange=upd;a.onchange=upd;b.onchange=upd;nn.onchange=upd;
          row.querySelector('.del').onclick=()=>{const H=T.P[d.k].filter((_,j)=>j!==i);change(T,d,H);render();};
          hl.appendChild(row);});};
      r.querySelector('.addhole').onclick=()=>{const H=T.P[d.k].map(x=>({...x}));H.push({s:'c',a:14,b:3,n:1});change(T,d,H);render();};
      T.P[d.k]=d.v.map(x=>({...x}));set=v=>{T.P[d.k]=v.map(x=>({...x}));render();};render();
    }else if(d.type==='text'){
      r.innerHTML=`<label><span></span></label><input type="text">`;const i=r.querySelector('input');labEl=r.querySelector('span');
      i.maxLength=d.max||40;i.placeholder=d.ph||'fx SKRUER';i.value=d.v||'';i.oninput=()=>change(T,d,i.value);set=v=>{i.value=v;};
    }else{
      r.innerHTML=`<label><span></span><input type="number" min="${d.min}" max="${d.max}" step="${d.st}"></label><input type="range" min="${d.min}" max="${d.max}" step="${d.st}">`;
      labEl=r.querySelector('span');const [num,rng]=r.querySelectorAll('input');num.value=rng.value=d.v;
      const paint=()=>rng.style.setProperty('--p',((rng.value-d.min)/((d.max-d.min)||1)*100)+'%');paint();
      rng.oninput=()=>{num.value=rng.value;paint();change(T,d,+rng.value);};
      num.onchange=()=>{const v=Math.min(d.max,Math.max(d.min,isFinite(+num.value)&&num.value!==''?+num.value:T.P[d.k]));num.value=rng.value=v;paint();change(T,d,v);};
      set=v=>{num.value=v;rng.value=v;paint();};
    }
    labEl.textContent=typeof d.l==='function'?d.l(T.P):d.l;T.ctrls[d.k]={row:r,set,labEl,d};card.appendChild(r);
  }
}
function change(T,d,v){
  const old=T.P[d.k];
  if(d.k==='prof'){T.P.prof=v;const pv=d.profVals[v];if(pv)for(const [k,val] of Object.entries(pv))T.setCtl(k,val);refresh();sched();return;}
  if(d.k==='tpl'){applyTemplate(T,v);T.setCtl('tpl','');return;}
  if(T.onChange)T.onChange(T,d.k,v,old);
  if(d.k==='preset')return void(refresh(),sched());
  T.P[d.k]=v;
  if(T.after)T.after(T,d.k,v);
  if(d.prof&&T.P.prof!=='custom')T.setCtl('prof','custom');
  if(d.k==='divMode')sel=null;
  refresh();sched();
}
function refresh(){
  const T=cur;
  for(const k in T.ctrls){const c=T.ctrls[k];c.row.style.display=(!c.d.show||c.d.show(T.P))?'':'none';if(typeof c.d.l==='function')c.labEl.textContent=c.d.l(T.P);
    if(c.d.optShow)c.row.querySelectorAll('option').forEach(o=>{o.hidden=o.disabled=!c.d.optShow(T.P,o.value);});}
  for(const s of T.secs)s.el.style.display=(!s.d.show||s.d.show(T.P))?'':'none';
  for(const c of T.cards)c.style.display=[...c.children].some(ch=>!ch.classList.contains('sec')&&ch.style.display!=='none')?'':'none';
  document.getElementById('tips').innerHTML=T.tips(T.P).map(t=>`<li>${t}</li>`).join('');
}
function applyTemplate(T,k){const t=TPL[k];if(!t)return;
  T.setCtl('divMode',t.divMode);T.setCtl('dx',t.xs.length);T.P.xs=t.xs.slice();T.P.cols=t.cols.map(c=>c.slice());sel=null;selCol=0;refresh();sched();}

// ---------- Skillevægge: plantegning ----------
let sel=null,selCol=0;const TP=()=>cur.P;
function syncDiv(){
  const P=TP();
  if(P.xs.length!==P.dx){
    P.xs=Array.from({length:P.dx},(_,i)=>(i+1)/(P.dx+1));
    const old=P.cols;P.cols=Array.from({length:P.dx+1},(_,c)=>old[c]?old[c].slice():[]);
    sel=null;
  }
  while(P.cols.length<P.dx+1)P.cols.push([]);P.cols.length=P.dx+1;
  selCol=Math.min(selCol,P.dx);
}
const plan=document.getElementById('plan'),pctx=plan.getContext('2d');
let pm=null,DLc=null,IRc=0;
const bandName=()=>TP().divMode==='rows'?'række':'kolonne';
function planMap(){
  const I=cur.interior(TP());DLc=divLayout2(TP(),I.iw,I.id);IRc=I.ir;const {iw,id}=I;const cw=plan.clientWidth||300;const pad=22;
  const s=Math.max(0.1,Math.min((cw-2*pad)/iw,250/id));const ch=Math.round(id*s+2*pad);
  return {s,pad,cw,ch,iw,id,ox:(cw-iw*s)/2,oy:pad};
}
const toPx=(x,y)=>[pm.ox+(x+pm.iw/2)*pm.s,pm.oy+(pm.id/2-y)*pm.s];
const bandRange=(c)=>[c===0?-DLc.U/2:DLc.us[c-1],c===DLc.us.length?DLc.U/2:DLc.us[c]];
function drawRect(c,r){const [a,b]=toPx(r.x0,r.y1),[e,f]=toPx(r.x1,r.y0);c.fillRect(a,b,e-a,f-b);}
function drawPlan(){
  if(!cur.hasPlan)return;
  pm=planMap();const dpr=Math.min(2,devicePixelRatio||1);
  plan.width=pm.cw*dpr;plan.height=pm.ch*dpr;plan.style.height=pm.ch+'px';
  const c=pctx;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,pm.cw,pm.ch);
  const {iw,id,U,V,us,bands}=Object.assign({iw:pm.iw,id:pm.id},DLc),ir=Math.max(0,Math.min(IRc,iw/2,id/2)),dt=TP().dt;
  c.font='10.5px system-ui,sans-serif';c.textAlign='center';c.fillStyle='#6d6a63';
  c.fillText(cur.id==='skuffer'?'Bagside':'Bagside (hængsel)',pm.cw/2,13);c.fillText('Front',pm.cw/2,pm.ch-6);
  const [x0,y0]=toPx(-iw/2,id/2);
  const path=()=>{c.beginPath();if(c.roundRect)c.roundRect(x0,y0,iw*pm.s,id*pm.s,ir*pm.s);else c.rect(x0,y0,iw*pm.s,id*pm.s);};
  c.save();path();c.fillStyle='#eef5fb';c.fill();c.clip();
  {const [a,b]=bandRange(selCol);c.fillStyle='#d3e6f6';drawRect(c,DLc.rect(a,b,-V/2,V/2));}
  c.fillStyle='#6b8296';c.font='10px system-ui,sans-serif';
  for(let k=0;k<=us.length;k++){
    const [ua,ub]=bandRange(k);const vs=[-V/2,...bands[k].slice().sort((a,b)=>a-b),V/2];
    const wu=(ub-ua)-(k>0?dt/2:0)-(k<us.length?dt/2:0);
    for(let j=0;j<vs.length-1;j++){
      const wv=(vs[j+1]-vs[j])-(j>0?dt/2:0)-(j<vs.length-2?dt/2:0);
      const r=DLc.rect(ua,ub,vs[j],vs[j+1]);const [px,py]=toPx((r.x0+r.x1)/2,(r.y0+r.y1)/2);
      const wx=DLc.rows?wv:wu,wy=DLc.rows?wu:wv;
      if((r.x1-r.x0)*pm.s>34&&(r.y1-r.y0)*pm.s>13)c.fillText(Math.max(0,wx).toFixed(0)+'×'+Math.max(0,wy).toFixed(0),px,py+3.5);
    }
  }
  const blue='#2f7fc8',orange='#f08a24',lw=Math.max(3,dt*pm.s);
  const line=(r,on)=>{c.fillStyle=on?orange:blue;const cx=(r.x0+r.x1)/2,cy=(r.y0+r.y1)/2;
    if(r.x1-r.x0<r.y1-r.y0){const [px,a]=toPx(cx,r.y1),[,b]=toPx(cx,r.y0);c.fillRect(px-lw/2,a,lw,b-a);}
    else{const [a,py]=toPx(r.x0,cy),[b]=toPx(r.x1,cy);c.fillRect(a,py-lw/2,b-a,lw);}};
  for(let k=0;k<=us.length;k++){const [ua,ub]=bandRange(k);
    bands[k].forEach((v,j)=>line(DLc.rect(ua,ub,v,v),sel&&sel.t==='s'&&sel.c===k&&sel.j===j));}
  us.forEach((u,i)=>line(DLc.rect(u,u,-V/2,V/2),sel&&sel.t==='p'&&sel.i===i));
  c.restore();path();c.lineWidth=2.5;c.strokeStyle=blue;c.stroke();
  updSel();
}
function updSel(){
  const box=document.getElementById('selrow'),inp=document.getElementById('selval'),lab=document.getElementById('sellab');
  const bn=bandName(),P=TP();
  document.getElementById('planhint').innerHTML=`Rum-opdeling set oppefra. <b>Klik</b> i en ${bn} for at vælge den, <b>dobbeltklik</b> for at tilføje en væg dér. <b>Træk</b> i en væg for at flytte den. Vælg den og tryk <b>Slet</b> for at fjerne den.`;
  document.getElementById('delw').disabled=!sel;
  document.getElementById('even').textContent=sel&&sel.t==='p'?'Fordel gennemgående vægge jævnt':'Fordel '+bn+' '+(selCol+1)+' jævnt';
  document.getElementById('addh').textContent='+ Væg i '+bn+' '+(selCol+1);
  if(!sel){box.style.display='none';return;}
  box.style.display='flex';const {U,V}=DLc;const rows=DLc.rows;
  const fromLeft='mm fra venstre indervæg',fromFront='mm fra forreste indervæg';
  if(sel.t==='p'){lab.textContent='Valgt væg, '+(rows?fromFront:fromLeft);if(document.activeElement!==inp)inp.value=(P.xs[sel.i]*U).toFixed(1);}
  else{lab.textContent='Valgt væg, '+(rows?fromLeft:fromFront);if(document.activeElement!==inp)inp.value=(P.cols[sel.c][sel.j]*V).toFixed(1);}
}
const clampF=(f,a=0.02,b=0.98)=>Math.min(b,Math.max(a,isFinite(f)?f:0.5));
function pLimits(i){const P=TP(),g=(P.dt+3)/DLc.U;return [i>0?P.xs[i-1]+g:0.02,i<P.xs.length-1?P.xs[i+1]-g:0.98];}
document.getElementById('selval').onchange=e=>{if(!sel)return;const v=+e.target.value,P=TP();
  if(sel.t==='p'){const [a,b]=pLimits(sel.i);P.xs[sel.i]=clampF(v/DLc.U,a,b);}else P.cols[sel.c][sel.j]=clampF(v/DLc.V);sched();};
let drag=null;
function hit(e){
  const r=plan.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;
  const x=(mx-pm.ox)/pm.s-pm.iw/2,y=pm.id/2-(my-pm.oy)/pm.s,tol=8/pm.s;
  const u=DLc.rows?y:x,v=DLc.rows?x:y;const {us,bands,U,V}=DLc;
  let c=0;while(c<us.length&&u>us[c])c++;
  let best=null,bd=tol;
  us.forEach((uu,i)=>{const d=Math.abs(uu-u);if(d<bd&&Math.abs(v)<=V/2){bd=d;best={t:'p',i};}});
  let bsd=tol,bs=null;bands[c].forEach((vv,j)=>{const d=Math.abs(vv-v);if(d<bsd){bsd=d;bs={t:'s',c,j};}});
  if(bs&&(!best||bsd<bd))best=bs;
  return {best,c,u,v,mx,my,inside:Math.abs(u)<=U/2&&Math.abs(v)<=V/2};
}
plan.addEventListener('pointerdown',e=>{
  if(!pm)return;const h=hit(e);if(!h.inside&&!h.best)return;plan.focus();
  selCol=h.best&&h.best.t==='s'?h.best.c:h.c;sel=h.best;
  if(h.best){plan.setPointerCapture(e.pointerId);drag={...h.best,sx:h.mx,sy:h.my,moved:false};}
  drawPlan();
});
plan.addEventListener('pointermove',e=>{
  if(!pm)return;const h=hit(e);
  if(!drag){const horiz=h.best&&((h.best.t==='p')!==DLc.rows);plan.style.cursor=h.best?(horiz?'ew-resize':'ns-resize'):(h.inside?'copy':'default');return;}
  if(!drag.moved&&Math.hypot(h.mx-drag.sx,h.my-drag.sy)>3)drag.moved=true;
  if(!drag.moved)return;const P=TP();
  if(drag.t==='p'){const [a,b]=pLimits(drag.i);P.xs[drag.i]=clampF((h.u+DLc.U/2)/DLc.U,a,b);}
  else P.cols[drag.c][drag.j]=clampF((h.v+DLc.V/2)/DLc.V);
  sched();
});
plan.addEventListener('pointerup',()=>{drag=null;});plan.addEventListener('pointercancel',()=>{drag=null;});
plan.addEventListener('dblclick',e=>{const h=hit(e);if(!h.inside||h.best)return;const P=TP();
  P.cols[h.c].push(clampF((h.v+DLc.V/2)/DLc.V));selCol=h.c;sel={t:'s',c:h.c,j:P.cols[h.c].length-1};sched();});
function delSel(){if(!sel)return;const P=TP();
  if(sel.t==='s')P.cols[sel.c].splice(sel.j,1);
  else{const i=sel.i;P.xs.splice(i,1);const m=P.cols[i].concat(P.cols[i+1]);
    P.cols.splice(i,2,m.filter((f,k)=>m.findIndex(g=>Math.abs(g-f)<0.01)===k));cur.setCtl('dx',P.dx-1);selCol=Math.min(selCol,P.dx);}
  sel=null;sched();}
plan.addEventListener('keydown',e=>{if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();delSel();}});
document.getElementById('delw').onclick=delSel;
document.getElementById('addh').onclick=()=>{const P=TP();
  const a=[0,...P.cols[selCol].slice().sort((p,q)=>p-q),1];let gi=0,gs=0;
  for(let k=0;k<a.length-1;k++)if(a[k+1]-a[k]>gs){gs=a[k+1]-a[k];gi=k;}
  P.cols[selCol].push((a[gi]+a[gi+1])/2);sel={t:'s',c:selCol,j:P.cols[selCol].length-1};sched();};
document.getElementById('even').onclick=()=>{const P=TP();
  if(sel&&sel.t==='p')P.xs=P.xs.map((_,i)=>(i+1)/(P.dx+1));
  else{const n=P.cols[selCol].length;P.cols[selCol]=Array.from({length:n},(_,i)=>(i+1)/(n+1));sel=null;}
  sched();};
new ResizeObserver(()=>{if(pm&&cur&&cur.hasPlan)drawPlan();}).observe(document.getElementById('panel'));

// ---------- 3D ----------
const cv=document.getElementById('c');
const ren=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});ren.setPixelRatio(Math.min(2,devicePixelRatio));
ren.setClearColor(0x000000,0);
const scene=new THREE.Scene();
const cam=new THREE.PerspectiveCamera(35,1,1,5000);
scene.add(new THREE.HemisphereLight(0xffffff,0xb8b2a6,0.75));
const dl1=new THREE.DirectionalLight(0xffffff,0.65);dl1.position.set(1,2,1.5);scene.add(dl1);
const dl2=new THREE.DirectionalLight(0xffffff,0.25);dl2.position.set(-1.5,0.5,-1);scene.add(dl2);
const world=new THREE.Group();world.rotation.x=-Math.PI/2;scene.add(world);
{const gh=new THREE.GridHelper(600,60,0xcfc8bc,0xdfd9cf);gh.material.transparent=true;gh.material.opacity=0.7;scene.add(gh);}
const mats={};
function mat(col,ghost){const k=col+(ghost?'g':'');if(!mats[k])mats[k]=new THREE.MeshStandardMaterial({color:col,flatShading:true,roughness:.6,metalness:.05,side:THREE.DoubleSide,transparent:!!ghost,opacity:ghost?0.35:1});return mats[k];}
function geo(arr){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));g.computeVertexNormals();return g;}
const S={root:null,state:{},bounds:null,
  mesh(tris,col,parent,ghost){const m=new THREE.Mesh(geo(tris),mat(col,ghost));(parent||S.root).add(m);
    const off=parent&&parent.userData.off||[0,0,0];m.position.set(-off[0],-off[1],-off[2]);
    if(!ghost){const p=parent?parent.position:{x:0,y:0,z:0},b=S.bounds,ox=p.x-off[0],oy=p.y-off[1],oz=p.z-off[2];
      for(let i=0;i<tris.length;i+=3){b[0]=Math.min(b[0],tris[i]+ox);b[1]=Math.min(b[1],tris[i+1]+oy);b[2]=Math.min(b[2],tris[i+2]+oz);
        b[3]=Math.max(b[3],tris[i]+ox);b[4]=Math.max(b[4],tris[i+1]+oy);b[5]=Math.max(b[5],tris[i+2]+oz);}}
    return m;},
  // drejepunkt/gruppe i (x,y,z); off = forskydning af indholdet (fx hængselaksen)
  pivot(x,y,z,off){const g=new THREE.Group();g.position.set(x,y,z);g.userData.off=off||[0,0,0];S.root.add(g);return g;},
};
const orb={th:-0.75,ph:1.0,r:260,tx:0,ty:20,tz:0};
function place(){cam.position.set(orb.tx+orb.r*Math.sin(orb.ph)*Math.sin(orb.th),orb.ty+orb.r*Math.cos(orb.ph),orb.tz+orb.r*Math.sin(orb.ph)*Math.cos(orb.th));cam.lookAt(orb.tx,orb.ty,orb.tz);}
function resize(){const r=cv.parentElement.getBoundingClientRect();ren.setSize(r.width,r.height,false);cam.aspect=r.width/Math.max(1,r.height);cam.updateProjectionMatrix();}
new ResizeObserver(resize).observe(cv.parentElement);
const ptrs=new Map();let pinch0=0,r0=0;
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,[e.clientX,e.clientY]);if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch0=Math.hypot(a[0]-b[0],a[1]-b[1]);r0=orb.r;}});
cv.addEventListener('pointermove',e=>{
  if(!ptrs.has(e.pointerId))return;const p=ptrs.get(e.pointerId);const dx=e.clientX-p[0],dy=e.clientY-p[1];ptrs.set(e.pointerId,[e.clientX,e.clientY]);
  if(ptrs.size===1){orb.th-=dx*0.008;orb.ph=Math.max(0.08,Math.min(Math.PI-0.08,orb.ph-dy*0.008));}
  else if(ptrs.size===2){const [a,b]=[...ptrs.values()];const d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinch0)orb.r=Math.max(20,Math.min(3000,r0*pinch0/d));}
});
const up=e=>{ptrs.delete(e.pointerId);pinch0=0;};
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
cv.addEventListener('wheel',e=>{e.preventDefault();orb.r=Math.max(20,Math.min(3000,orb.r*Math.exp(e.deltaY*0.001)));},{passive:false});
(function loop(){place();ren.render(scene,cam);requestAnimationFrame(loop);})();

// ---------- Opbygning ----------
let cur=null,model=null;
function rebuild(){
  const T=cur,P=T.P;
  if(T.hasPlan){syncDiv();drawPlan();}
  model=T.make(P);T.model=model;
  if(S.root){world.remove(S.root);S.root.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
  S.root=new THREE.Group();world.add(S.root);S.state={};S.bounds=[1e9,1e9,1e9,-1e9,-1e9,-1e9];
  T.setup(model,S,P);
  if(!T.framed){frame();T.framed=true;}
  applyHud();
  const w=document.getElementById('warn');w.style.display=model.warn.length?'block':'none';w.innerHTML=model.warn.join('<br>');
  const tris=countTris();
  document.getElementById('stats').innerHTML=T.stats(model,P).concat([['Trekanter',tris.toLocaleString('da-DK')]]).map(([a,b])=>`<div><span>${a}</span><b>${b}</b></div>`).join('');
}
function countTris(){let n=0;S.root.traverse(o=>{if(o.geometry&&!o.material.transparent)n+=o.geometry.attributes.position.count/3;});return n;}
function frame(){const b=S.bounds;if(b[0]>b[3])return;
  const cx=(b[0]+b[3])/2,cy=(b[1]+b[4])/2,cz=(b[2]+b[5])/2,ext=Math.max(b[3]-b[0],b[4]-b[1],b[5]-b[2]);
  orb.tx=cx;orb.ty=cz*0.8;orb.tz=-cy;orb.r=Math.max(60,ext*2.4);}
document.getElementById('vFrame').onclick=()=>frame();
let pend=false;function sched(){if(!pend){pend=true;requestAnimationFrame(()=>{pend=false;rebuild();});}}
const hud=document.getElementById('hud'),ang=document.getElementById('ang'),angv=document.getElementById('angv'),hudLbl=document.getElementById('hudlbl'),pp=document.getElementById('pp');
function applyHud(){const T=cur;if(!T.hud){hud.style.display='none';return;}hud.style.display='flex';
  ang.min=T.hud.min;ang.max=T.hud.max;ang.value=T.hudV;angv.textContent=T.hudV+T.hud.unit;hudLbl.textContent=T.hud.label;
  pp.style.display=T.hud.btn?'':'none';if(T.hud.btn)pp.textContent=T.hud.btn;T.hud.apply(S,+T.hudV);}
ang.oninput=()=>{cur.hudV=+ang.value;applyHud();};
pp.onclick=()=>{cur.hudV=cur.hud.btnV;applyHud();};

// ---------- Faner ----------
{const ORDER=['aeske','skuffer','bakke','holder','indsats','batteri','kabel','stik','lys','skilt'];TOOLS.sort((a,b)=>(ORDER.indexOf(a.id)+99)%99-(ORDER.indexOf(b.id)+99)%99);}
const tabs=document.getElementById('tabs');
const ICONS={
 aeske:'<path d="M3.5 9h17v10.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z"/><path d="M3.5 9 5 4.5h14L20.5 9"/><path d="M10 13h4"/>',
 skuffer:'<rect x="4" y="3.5" width="16" height="17" rx="1.5"/><path d="M4 9.2h16M4 14.8h16M10.5 6.3h3M10.5 12h3M10.5 17.7h3"/>',
 bakke:'<path d="M3 8.5h18l-1.6 10a1.5 1.5 0 0 1-1.5 1.3H6.1a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M9 8.5v11M15 8.5v11M3.6 12.5h16.8"/><path d="M5 8.5 6 5h12l1 3.5"/>',
 holder:'<path d="M5 9h14l-1.3 10.6a1.5 1.5 0 0 1-1.5 1.4H7.8a1.5 1.5 0 0 1-1.5-1.4z"/><path d="M8.5 9 7.5 3M12 9V2.5M15.5 9l1.5-5.5"/>',
 indsats:'<rect x="3" y="5" width="18" height="14" rx="2"/><rect x="6" y="8" width="3" height="8" rx=".6"/><rect x="10.5" y="8" width="3" height="8" rx=".6"/><circle cx="17.2" cy="10" r="1.3"/><circle cx="17.2" cy="14.4" r="1.3"/>',
 batteri:'<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M19 10.3h1.6v3.4H19M7.5 12h3M9 10.5v3M13.5 12h2.5"/>',
 kabel:'<path d="M3 16c3 0 3-8 7-8s3 8 7 8c1.7 0 2.6-1.2 3-2.5"/><rect x="18" y="5" width="4" height="5" rx="1"/><path d="M19.2 5V3M20.8 5V3"/>',
 stik:'<rect x="2.5" y="8" width="19" height="8" rx="2.5"/><circle cx="7.5" cy="12" r="1.6"/><circle cx="12.5" cy="12" r="1.6"/><path d="M17.5 10.8v2.4"/>',
 lys:'<path d="M12 3c1.8 2.2 2.6 3.7 2.6 5.1a2.6 2.6 0 0 1-5.2 0C9.4 6.7 10.2 5.2 12 3z"/><path d="M5 14h14v3.5a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z"/><path d="M12 11v3"/>',
 skilt:'<path d="M3.5 7.5h12.7l4.3 4.5-4.3 4.5H3.5z"/><path d="M7 12h5.5"/>'};
const icon=id=>`<svg viewBox="0 0 24 24">${ICONS[id]||ICONS.aeske}</svg>`;
for(const T of TOOLS){const b=document.createElement('button');b.innerHTML=icon(T.id)+`<span>${T.name}</span>`;b.title=T.name;b.dataset.id=T.id;b.onclick=()=>{try{location.hash=T.id;}catch(e){}switchTool(T.id);};tabs.appendChild(b);T.tab=b;}
function switchTool(id){
  const T=TOOLS.find(t=>t.id===id)||TOOLS[0];if(cur===T)return;
  if(cur)cur.el.style.display='none';cur=T;T.el.style.display='';sel=null;selCol=0;
  for(const t of TOOLS)t.tab.classList.toggle('on',t===T);
  const pb=document.getElementById('planbox');if(T.hasPlan){T.el.appendChild(pb);pb.style.display='';}else pb.style.display='none';
  document.getElementById('dl').textContent=T.dl;document.getElementById('infoT').innerHTML=icon(T.id)+T.name;
  const ex=document.getElementById('dlExtra');ex.style.display=T.extra?'':'none';if(T.extra)ex.textContent=T.extra.label;
  document.getElementById('msg').textContent='';
  refresh();rebuild();
}
window.addEventListener('hashchange',()=>switchTool(location.hash.slice(1)));

// ---------- Download ----------
let dlCap=null;
(async()=>{try{if(window.claude&&typeof window.claude.use==='function')dlCap=await window.claude.use('downloads');}catch(e){dlCap=null;}})();
const msg=document.getElementById('msg');
async function offer(files,zipName){
  const fl=files.map(f=>({name:f.name+'.stl',data:stl(f.tris)}));
  if(dlCap){
    try{await dlCap.save({filename:zipName+'.zip',data:zipFiles(fl)});msg.textContent=fl.length>1?`Gemt som ZIP med ${fl.length} STL-filer.`:'Gemt som ZIP med STL-filen indeni.';}
    catch(e){msg.textContent=e&&e.code==='declined'?'Download annulleret.':'Download kunne ikke gennemføres her ('+(e&&e.code||'fejl')+').';}
    return;
  }
  const blob=fl.length>1?zipFiles(fl):new Blob([fl[0].data],{type:'model/stl'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fl.length>1?zipName+'.zip':fl[0].name;document.body.appendChild(a);a.click();a.remove();
  msg.textContent=fl.length>1?`ZIP med ${fl.length} STL-filer genereret.`:'STL-fil genereret.';
}
document.getElementById('dl').onclick=()=>{const T=cur,P=T.P;const fs=T.files(T.make(P),P);offer(fs,fs.length>1?cur.id+'_'+new Date().toISOString().slice(0,10):fs[0].name);};
document.getElementById('dlExtra').onclick=()=>{const fs=cur.extra.files(cur.P);offer(fs,fs[0].name);};

// ---------- Gem og del ----------
const SKEY='haengselaeske.gemte';
function stateOf(T){const s={tool:T.id};for(const d of T.defs)if(d.k&&!d.noGeom)s[d.k]=Array.isArray(T.P[d.k])?T.P[d.k].map(x=>({...x})):T.P[d.k];if(T.hasPlan){s.xs=T.P.xs.slice();s.cols=T.P.cols.map(c=>c.slice());}s.prof=T.P.prof;return s;}
function applyState(s){
  if(!s||typeof s!=='object')throw new Error('ugyldig');
  const T=TOOLS.find(t=>t.id===(s.tool||'aeske'));if(!T)throw new Error('ukendt');
  for(const d of T.defs){if(!d.k||!(d.k in s))continue;let v=s[d.k];
    if(d.type==='holes'){if(!Array.isArray(v))continue;v=v.slice(0,30).map(h=>({s:h.s==='s'?'s':'c',a:Math.min(150,Math.max(2,+h.a||10)),b:Math.min(40,Math.max(0.8,+h.b||3)),n:Math.min(20,Math.max(1,Math.round(+h.n||1)))}));}
    else if(d.type==='check')v=!!v;else if(d.type==='text')v=String(v).slice(0,d.max||40);else if(d.type==='select'){if(!d.opts.some(o=>String(o[0])===String(v)))continue;if(d.num)v=+v;}
    else{v=+v;if(!isFinite(v))continue;v=Math.min(d.max,Math.max(d.min,v));}
    T.setCtl(d.k,v);}
  if(T.hasPlan&&Array.isArray(s.xs)&&Array.isArray(s.cols)&&s.xs.length===T.P.dx){T.P.xs=s.xs.map(f=>clampF(+f));T.P.cols=s.cols.slice(0,T.P.dx+1).map(c=>(Array.isArray(c)?c:[]).map(f=>clampF(+f)));}
  T.framed=false;
  if(cur!==T){try{location.hash=T.id;}catch(e){}switchTool(T.id);}else{sel=null;selCol=0;refresh();sched();}
}
function loadSaves(){try{return JSON.parse(localStorage.getItem(SKEY)||'{}')||{};}catch(e){return {};}}
function storeSaves(o){try{localStorage.setItem(SKEY,JSON.stringify(o));return true;}catch(e){return false;}}
const saveMsg=document.getElementById('saveMsg'),loadSel=document.getElementById('loadSel');
const toolName=s=>(TOOLS.find(t=>t.id===((s&&s.tool)||'aeske'))||TOOLS[0]).name;
function fillSaves(){const o=loadSaves();const names=Object.keys(o).sort((a,b)=>a.localeCompare(b,'da'));
  loadSel.innerHTML=`<option value="">${names.length?'Hent gemt …':'Intet gemt endnu'}</option>`+names.map(n=>`<option value="${n.replace(/"/g,'&quot;')}">${toolName(o[n])}: ${n.replace(/</g,'&lt;')}</option>`).join('');}
document.getElementById('saveBtn').onclick=()=>{const n=document.getElementById('saveName').value.trim()||(cur.name+' '+new Date().toLocaleString('da-DK'));
  const o=loadSaves();o[n]=stateOf(cur);saveMsg.textContent=storeSaves(o)?`Gemt som “${n}” i denne browser.`:'Kunne ikke gemme her – brug delekoden i stedet.';fillSaves();};
loadSel.onchange=()=>{const n=loadSel.value;if(!n)return;const o=loadSaves();try{applyState(o[n]);saveMsg.textContent=`Hentede “${n}”.`;}catch(e){saveMsg.textContent='Kunne ikke hente.';}loadSel.value='';};
document.getElementById('delSave').onclick=()=>{const o=loadSaves();
  const n=loadSel.value||document.getElementById('saveName').value.trim();
  if(!n||!o[n]){saveMsg.textContent='Vælg det gemte i listen (eller skriv navnet) for at slette det.';return;}
  delete o[n];storeSaves(o);fillSaves();saveMsg.textContent=`Slettede “${n}”.`;};
const enc=s=>btoa(unescape(encodeURIComponent(JSON.stringify(s)))),dec=c=>JSON.parse(decodeURIComponent(escape(atob(c.trim()))));
document.getElementById('copyCode').onclick=async()=>{const code='AESKE1:'+enc(stateOf(cur));
  try{await navigator.clipboard.writeText(code);saveMsg.textContent='Delekoden er kopieret. Send den til en anden, som kan indlæse den her.';}
  catch(e){document.getElementById('pasteBox').style.display='block';const ta=document.getElementById('codeTa');ta.value=code;ta.select();saveMsg.textContent='Kunne ikke kopiere automatisk – koden står i feltet, kopiér den selv.';}};
document.getElementById('showPaste').onclick=()=>{const b=document.getElementById('pasteBox');b.style.display=b.style.display==='none'?'block':'none';};
document.getElementById('loadCode').onclick=()=>{const t=document.getElementById('codeTa').value.trim().replace(/^AESKE1:/,'');
  try{applyState(dec(t));saveMsg.textContent='Delekoden er indlæst.';}catch(e){saveMsg.textContent='Det ligner ikke en gyldig delekode.';}};

fillSaves();resize();
switchTool((location.hash||'').slice(1));
