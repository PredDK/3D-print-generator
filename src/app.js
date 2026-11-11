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
 make(P){
   P.skadis=P.mount==='skadis';
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
};
TOOLS.push({id:'holder',name:'Holder',dl:'Download STL',
 init:{},
 defs:[
  {sec:'Type'},
  {k:'mode',l:'Holder',type:'select',opts:[['wall','Til væg / SKÅDIS'],['block','Stående blok']],v:'wall'},
  {k:'preset',l:'Forslag',type:'select',opts:[['','Vælg forslag …'],['tb','4 tandbørster'],['tbp','4 tandbørster + tandpasta'],['knives','Knive (5 slidser)'],['tools','6 skruetrækkere'],['pens','8 pensler/kuglepenne'],['mixed','Blandede huller']],v:'',noGeom:true},
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
 stats(m,P){return [['Mål (B × D × H)',m.dims.map(f1).join(' × ')],['Huller',m.count],...(m.skadis?[['Montering','SKÅDIS, faste kroge']]:[]),...(m.trayPart?[['Drypbakke','løs, printes for sig']]:[])];},
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
  {k:'ctype',l:'Clips',type:'select',opts:[['desk','Til bordkanten'],['wall','Til væggen']],v:'desk'},
  {sec:'Kabler'},
  {k:'cn',l:'Antal kabler',min:1,max:8,st:1,v:3},
  {k:'cd',l:'Kabeldiameter',min:2,max:20,st:0.5,v:6},
  {k:'co',l:'Åbning (andel af kabeldiameter)',min:0.5,max:0.95,st:0.05,v:0.7},
  {note:'Mindre åbning = kablet sidder fastere, men er sværere at klikke i.'},
  {k:'cw',l:'Vægtykkelse',min:1.2,max:3,st:0.1,v:1.6},
  {k:'w',l:'Clipsens bredde',min:6,max:40,st:1,v:12},
  {sec:'Bordkant',show:P=>P.ctype==='desk'},
  {k:'T',l:'Bordpladens tykkelse',min:8,max:60,st:0.5,v:20,show:P=>P.ctype==='desk'},
  {k:'place',l:'Kablerne sidder',type:'select',opts:[['front','Foran på kanten'],['under','Under bordet']],v:'front',show:P=>P.ctype==='desk'},
  {k:'th',l:'Klemmens tykkelse',min:2.5,max:6,st:0.1,v:3.5,show:P=>P.ctype==='desk'},
  {k:'jaw',l:'Klemmens længde',min:10,max:40,st:1,v:20,show:P=>P.ctype==='desk'},
  {k:'sq',l:'Klemkraft',min:0.2,max:2,st:0.1,v:0.8,show:P=>P.ctype==='desk'},
  {sec:'Væg',show:P=>P.ctype==='wall'},
  {k:'bt',l:P=>P.mount==='skadis'?'Bagstykkets tykkelse':'Bundpladens tykkelse',min:1.6,max:5,st:0.1,v:2.4,show:P=>P.ctype==='wall'},
  {k:'mount',l:'Montering',type:'select',opts:[['skadis','IKEA SKÅDIS'],['screw','Skruer'],['magnet','Magneter'],['tape','Dobbeltklæbende tape']],v:'screw',show:P=>P.ctype==='wall'},
  {k:'magD',l:'Magnet-diameter',min:3,max:15,st:0.5,v:6,show:P=>P.ctype==='wall'&&P.mount==='magnet'},
  {k:'magH',l:'Magnet-højde',min:1,max:5,st:0.5,v:2,show:P=>P.ctype==='wall'&&P.mount==='magnet'},
  {k:'nscrew',l:P=>P.mount==='magnet'?'Antal magneter':'Antal skruehuller',type:'select',opts:[[1,'1 (i den ene ende)'],[2,'2 (i begge ender)']],v:1,num:true,show:P=>P.ctype==='wall'&&(P.mount==='screw'||P.mount==='magnet')},
  {k:'Tb',l:'SKÅDIS-pladens tykkelse',min:4,max:7,st:0.1,v:5,show:P=>P.ctype==='wall'&&P.mount==='skadis'},
  {k:'hookPos',l:'Krogens placering',type:'select',opts:[['side','I siden (ingen support)'],['center','I midten (kræver support)']],v:'center',show:P=>P.ctype==='wall'&&P.mount==='skadis'},
  {note:'Med krogen i midten svæver den over printpladen – slå support til i slicer (kun fra printpladen).',show:P=>P.ctype==='wall'&&P.mount==='skadis'&&P.hookPos==='center'},
  {k:'skLow',l:'Ekstra krog længere nede',type:'select',opts:[['none','Ingen (lille clips)'],['hook','Krog'],['stub','Tap']],v:'none',show:P=>P.ctype==='wall'&&P.mount==='skadis'},
  {note:'SKÅDIS-clipsen er én flad profil med fast krog, der printes liggende, så den er stærk. Vælg en ekstra krog længere nede, hvis clipsen skal sidde helt fast – så bliver den højere.',show:P=>P.ctype==='wall'&&P.mount==='skadis'},
  {k:'sd',l:'Skruediameter',min:2.5,max:5,st:0.5,v:3.5,show:P=>P.ctype==='wall'&&P.mount==='screw'},
  {k:'shd',l:'Skruehovedets diameter',min:5,max:10,st:0.5,v:7,show:P=>P.ctype==='wall'&&P.mount==='screw'},
 ],
 after(T){const P=T.P,need=P.magH+1;if(P.ctype==='wall'&&P.mount==='magnet'&&P.bt<need)T.setCtl('bt',need);},
 make(P){return buildCable(P);},
 setup(m,S,P){S.mesh(m.view,0x2b7a78);if(m.skadis){const o=[];box(o,-40,40,0,m.skadis.Tb,-40,m.skadis.top+30);S.mesh(o,0xe8e2d6,null,true);}if(m.ghost){const g=m.ghost,o=[];box(o,g.x0,g.x1,g.y0,g.y1,g.z0,g.z1);S.mesh(o,0xc9bfae,null,true);}},
 files(m,P){return [{name:`kabelclips_${P.ctype==='desk'?'bordkant':P.mount==='skadis'?'skadis':'vaeg'}_${P.cn}x${String(P.cd).replace('.',',')}mm`,tris:m.tris}];},
 stats(m,P){return [['Mål',m.dims.map(f1).join(' × ')],['Kabler',`${P.cn} × Ø${f1(P.cd)} mm`]];},
 tips:P=>[P.ctype==='desk'?'Printes liggende, så profilen ligger fladt – stærkest og ingen support.':P.mount==='skadis'?(P.hookPos==='center'?'Printes liggende. Krogen i midten skal have support under sig (kun fra printpladen).':'Printes liggende, så profilen ligger fladt – stærkest og ingen support.'):'Printes med bundpladen nedad.','Skal du bruge flere, så kopiér dem i slicerprogrammet.',P.ctype==='desk'?'Sidder den løst, så øg klemkraften eller mål bordpladen igen.':P.mount==='skadis'?'Kablerne klikkes ind i kanalerne forfra.':'Kablerne klikkes ned i kanalerne fra oven.'],
});

// INDSATS
const SLOTS={usba:{l:'USB-A (dongle/USB-stik)',sw:12.6,stk:4.9,sd:12,gx:5,gy:10},usbc:{l:'USB-C',sw:9,stk:3.6,sd:7,gx:5,gy:9},
  micro:{l:'Micro-USB',sw:8.2,stk:3.2,sd:6,gx:5,gy:9},sd:{l:'SD-kort',sw:24.6,stk:2.6,sd:18,gx:4,gy:4},microsd:{l:'microSD-kort',sw:11.4,stk:1.4,sd:8,gx:3,gy:3}};
TOOLS.push({id:'indsats',name:'Indsats',dl:'Download STL',
 init:{},
 defs:[
  {sec:'Slidser'},
  {k:'kind',l:'Til',type:'select',opts:Object.entries(SLOTS).map(([k,v])=>[k,v.l]).concat([['custom','Egne mål']]),v:'usba'},
  {k:'sw',l:'Slidsens længde',min:2,max:60,st:0.1,v:12.6,slot:true},
  {k:'stk',l:'Slidsens bredde',min:0.8,max:20,st:0.1,v:4.9,slot:true},
  {k:'sd',l:'Slidsens dybde',min:2,max:40,st:0.5,v:12,slot:true},
  {k:'gx',l:'Afstand mellem slidser',min:1.5,max:30,st:0.5,v:5,slot:true},
  {k:'gy',l:'Afstand mellem rækker',min:1.5,max:40,st:0.5,v:10,slot:true},
  {note:'Afstanden mellem rækkerne skal give plads til selve donglen eller stikkets greb.'},
  {sec:'Mål'},
  {k:'fit',l:'Tilpas til',type:'select',opts:[['','Vælg …'],['skuffe','Skuffe fra Skuffer-fanen'],['aeske','Æske fra Æske-fanen']],v:'',noGeom:true},
  {note:'Fylder hele skuffen/æsken. Har den skillevægge, så skriv målene på ét rum i stedet.'},
  {k:'W',l:'Bredde',min:15,max:300,st:0.5,v:100},
  {k:'D',l:'Dybde',min:10,max:300,st:0.5,v:80},
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
     if(w){const r=x=>Math.floor(x*2)/2;T.setCtl('W',r(w));T.setCtl('D',r(d));T.setCtl('H',Math.max(3,Math.min(60,r(Math.min(h,Math.max(T.P.sd+T.P.fb,T.P.H))))));}
     T.setCtl('fit','');}},
 after(T){const P=T.P,need=P.magH+1;if(P.mag&&P.H-Math.min(P.sd,P.H-P.fb)<need)T.setCtl('H',Math.min(60,Math.ceil((P.sd+need)*2)/2));},
 make(P){return buildInsert(P);},
 setup(m,S){S.mesh(m.tris,0x2b7a78);},
 files(m,P){return [{name:`indsats_${P.kind}_${m.cols}x${m.rows}`,tris:m.tris}];},
 stats(m,P){return [['Mål',[P.W,P.D,P.H].map(f1).join(' × ')],['Slidser',`${m.count} (${m.cols} × ${m.rows})`],['Slids',`${f1(P.sw)} × ${f1(P.stk)} × ${f1(m.depth||P.sd)} mm`]];},
 tips:P=>['Printes som den ligger, med slidserne opad.','Sidder stikkene for stramt eller løst, så justér slidsens bredde med 0,1–0,2 mm.','Brug “Tilpas til” for at få den til at passe ned i en skuffe eller æske.'],
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
  {k:'bw',l:'Bjælkens højde',min:8,max:80,st:1,v:20,show:P=>P.form==='channel'&&P.mount!=='skadis'},
  {k:'tb',l:'Bundtykkelse',min:2,max:6,st:0.1,v:3},
  {k:'ta',l:'Sidernes tykkelse',min:1.6,max:6,st:0.1,v:3},
  {k:'lip',l:'Kantens greb over dåsen',min:1.5,max:10,st:0.5,v:4},
  {k:'tl',l:'Kantens tykkelse',min:1.6,max:6,st:0.1,v:3,show:P=>P.form!=='channel'},
  {k:'ang',l:'Vinkel (°)',min:15,max:80,st:1,v:45,show:P=>P.form==='stand'},
  {k:'tw',l:'Godstykkelse i foden',min:2,max:6,st:0.1,v:3,show:P=>P.form==='stand'},
  {sec:'Montering'},
  {k:'mount',l:'Montering',type:'select',opts:[['skadis','IKEA SKÅDIS'],['screw','Skruehuller'],['magnet','Magneter'],['desk','Bordkant (klemme)'],['none','Ingenting']],v:'screw'},
  {note:'Standeren står på bordet – vælg skruehuller, magneter eller ingenting.',show:P=>P.form==='stand'&&(P.mount==='skadis'||P.mount==='desk')},
  {note:'Bordkant-klemmen findes kun på de enkelte holdere.',show:P=>P.form==='channel'&&P.mount==='desk'},
  {k:'sd',l:'Skruediameter',min:2.5,max:6,st:0.5,v:4,show:P=>P.mount==='screw'},
  {k:'shd',l:'Skruehovedets diameter',min:5,max:12,st:0.5,v:8,show:P=>P.mount==='screw'},
  {k:'magD',l:'Magnet-diameter',min:3,max:15,st:0.5,v:6,show:P=>P.mount==='magnet'},
  {k:'magH',l:'Magnet-højde',min:1,max:5,st:0.5,v:2,show:P=>P.mount==='magnet'},
  {k:'T',l:'Bordpladens tykkelse',min:8,max:55,st:0.5,v:20,show:P=>P.mount==='desk'&&P.form==='clip'},
  {k:'th',l:'Klemmens tykkelse',min:2.5,max:6,st:0.1,v:3.5,show:P=>P.mount==='desk'&&P.form==='clip'},
  {k:'jaw',l:'Klemmens længde',min:10,max:40,st:1,v:20,show:P=>P.mount==='desk'&&P.form==='clip'},
  {k:'sq',l:'Klemkraft',min:0.2,max:2,st:0.1,v:0.8,show:P=>P.mount==='desk'&&P.form==='clip'},
  {note:'Dåsen hænger foran bordkanten med toppen i flugt med bordpladen.',show:P=>P.mount==='desk'&&P.form==='clip'},
  {k:'Tb',l:'SKÅDIS-pladens tykkelse',min:4,max:7,st:0.1,v:5,show:P=>P.mount==='skadis'&&P.form!=='stand'},
  {k:'hookPos',l:'Krogens placering',type:'select',opts:[['side','I siden (ingen support)'],['center','I midten (kræver support)']],v:'side',show:P=>P.mount==='skadis'&&P.form==='clip'},
  {k:'skLow',l:'Nederst på bagsiden',type:'select',opts:[['hook','Krog'],['stub','Tap'],['none','Ingen']],v:'hook',show:P=>P.mount==='skadis'&&P.form!=='stand'},
  {note:'Med SKÅDIS hænger den samlede holder lodret og printes stående. Den nederste bøjle får 45°-ribber, så den kan printes uden support.',show:P=>P.mount==='skadis'&&P.form==='channel'},
 ],
 after(T){const f=T.P.form,m=T.P.mount;
   if(f==='stand'&&(m==='skadis'||m==='desk'))T.setCtl('mount','none');
   else if(f==='channel'&&m==='desk')T.setCtl('mount','screw');
   if(T.P.mount==='magnet'){const need=T.P.magH+1;if(T.P.tb<need)T.setCtl('tb',need);if(f==='stand'&&T.P.tw<need)T.setCtl('tw',need);}},
 make(P){const Q=Object.assign({},P);if(Q.form==='stand'&&(Q.mount==='skadis'||Q.mount==='desk'))Q.mount='none';if(Q.form==='channel'&&Q.mount==='desk')Q.mount='screw';return buildStrip(Q);},
 setup(m,S,P){S.mesh(m.view,0x2b7a78);S.mesh(m.ghost,0xf2efe9,null,true);
   if(P.mount==='skadis'&&P.form!=='stand'){const o=[];box(o,-P.sl/2-40,P.sl/2+40,0,P.Tb,-60,(P.form==='channel'?m.dims[0]:0)+60);S.mesh(o,0xe8e2d6,null,true);}},
 files(m,P){const nm={clip:'stikdaase-holder',channel:'stikdaase-holder_samlet',stand:'stikdaase-stander'}[P.form];
   return [{name:`${nm}_${Math.round(P.sw)}x${Math.round(P.sh)}${P.mount==='skadis'?'_skadis':''}`,tris:m.print}];},
 stats(m,P){return [['Mål',m.dims.map(f1).join(' × ')],...(P.form!=='channel'?[['Antal i filen',P.form==='stand'&&P.cw>=P.sl*0.6?1:P.count]]:[])];},
 tips:P=>[...(P.form==='clip'?['Bøjlerne printes liggende på siden (som i filen) – så er de stærkest og kan fjedre uden at knække.',P.mount==='skadis'&&P.hookPos==='center'?'Krogen i midten skal have support under sig (kun fra printpladen).':'Ingen support nødvendig.']
   :P.form==='channel'?[P.mount==='skadis'?'Printes stående med den øverste ende nedad (som i filen). Ribberne under den nederste bøjle gør, at der ikke skal bruges support.':'Printes med bunden nedad. Kanterne har skrå underside, så der skal ingen support til.']
   :['Printes liggende på siden (som i filen) – ingen support.','Standeren får automatisk en fod fremad, så den ikke vælter ved stejle vinkler.']),
   'Dåsen klikkes ned mellem kanterne. Er den for stram, så mindsk kantens greb.',...(P.mount==='magnet'?['Magnethullerne er åbne mod monteringsfladen – lim magneterne i.']:[])],
});

// ---------- Kontroller ----------
const ctl=document.getElementById('controls');
for(const T of TOOLS){
  T.P=Object.assign({},JSON.parse(JSON.stringify(T.init)));T.ctrls={};T.hudV=T.hud?T.hud.v:0;
  T.el=document.createElement('div');T.el.id='tool-'+T.id;T.el.style.display='none';ctl.appendChild(T.el);
  T.setCtl=(k,v)=>{T.P[k]=v;if(T.ctrls[k])T.ctrls[k].set(v);};
  T.secs=[];
  for(const d of T.defs){
    if(d.sec){const s=document.createElement('div');s.className='sec';s.textContent=d.sec;T.el.appendChild(s);T.secs.push({el:s,d});continue;}
    if(d.note){const s=document.createElement('div');s.className='note';s.textContent=d.note;T.el.appendChild(s);T.secs.push({el:s,d});continue;}
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
      i.maxLength=d.max||40;i.placeholder=d.ph||'fx SKRUER';i.oninput=()=>change(T,d,i.value);set=v=>{i.value=v;};
    }else{
      r.innerHTML=`<label><span></span><input type="number" min="${d.min}" max="${d.max}" step="${d.st}"></label><input type="range" min="${d.min}" max="${d.max}" step="${d.st}">`;
      labEl=r.querySelector('span');const [num,rng]=r.querySelectorAll('input');num.value=rng.value=d.v;
      rng.oninput=()=>{num.value=rng.value;change(T,d,+rng.value);};
      num.onchange=()=>{const v=Math.min(d.max,Math.max(d.min,isFinite(+num.value)&&num.value!==''?+num.value:T.P[d.k]));num.value=rng.value=v;change(T,d,v);};
      set=v=>{num.value=v;rng.value=v;};
    }
    labEl.textContent=typeof d.l==='function'?d.l(T.P):d.l;T.ctrls[d.k]={row:r,set,labEl,d};T.el.appendChild(r);
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
  for(const k in T.ctrls){const c=T.ctrls[k];c.row.style.display=(!c.d.show||c.d.show(T.P))?'':'none';if(typeof c.d.l==='function')c.labEl.textContent=c.d.l(T.P);}
  for(const s of T.secs)s.el.style.display=(!s.d.show||s.d.show(T.P))?'':'none';
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
const ren=new THREE.WebGLRenderer({canvas:cv,antialias:true});ren.setPixelRatio(Math.min(2,devicePixelRatio));
ren.setClearColor(0xf4f2ee);
const scene=new THREE.Scene();
const cam=new THREE.PerspectiveCamera(35,1,1,5000);
scene.add(new THREE.HemisphereLight(0xffffff,0xb8b2a6,0.75));
const dl1=new THREE.DirectionalLight(0xffffff,0.65);dl1.position.set(1,2,1.5);scene.add(dl1);
const dl2=new THREE.DirectionalLight(0xffffff,0.25);dl2.position.set(-1.5,0.5,-1);scene.add(dl2);
const world=new THREE.Group();world.rotation.x=-Math.PI/2;scene.add(world);
scene.add(new THREE.GridHelper(600,60,0xd6d1c7,0xe6e2da));
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
let pend=false;function sched(){if(!pend){pend=true;requestAnimationFrame(()=>{pend=false;rebuild();});}}
const hud=document.getElementById('hud'),ang=document.getElementById('ang'),angv=document.getElementById('angv'),hudLbl=document.getElementById('hudlbl'),pp=document.getElementById('pp');
function applyHud(){const T=cur;if(!T.hud){hud.style.display='none';return;}hud.style.display='flex';
  ang.min=T.hud.min;ang.max=T.hud.max;ang.value=T.hudV;angv.textContent=T.hudV+T.hud.unit;hudLbl.textContent=T.hud.label;
  pp.style.display=T.hud.btn?'':'none';if(T.hud.btn)pp.textContent=T.hud.btn;T.hud.apply(S,+T.hudV);}
ang.oninput=()=>{cur.hudV=+ang.value;applyHud();};
pp.onclick=()=>{cur.hudV=cur.hud.btnV;applyHud();};

// ---------- Faner ----------
const tabs=document.getElementById('tabs');
for(const T of TOOLS){const b=document.createElement('button');b.textContent=T.name;b.dataset.id=T.id;b.onclick=()=>{try{location.hash=T.id;}catch(e){}switchTool(T.id);};tabs.appendChild(b);T.tab=b;}
function switchTool(id){
  const T=TOOLS.find(t=>t.id===id)||TOOLS[0];if(cur===T)return;
  if(cur)cur.el.style.display='none';cur=T;T.el.style.display='';sel=null;selCol=0;
  for(const t of TOOLS)t.tab.classList.toggle('on',t===T);
  const pb=document.getElementById('planbox');if(T.hasPlan){T.el.appendChild(pb);pb.style.display='';}else pb.style.display='none';
  document.getElementById('dl').textContent=T.dl;
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
