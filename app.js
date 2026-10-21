/* MyMint — screens, coin records, search & filters, Numista lookups, albums, wants, reports. */
"use strict";

/* ================= state ================= */
const S={coins:[],wanted:[],settings:[],meta:{},urls:{},tab:"coins",q:"",f:{},stack:[],moreView:null,readOnly:false};
const FDEF={grp:[],denom:"",coll:"",series:"",yFrom:"",yTo:"",mint:"",grade:"",finish:"",pack:"",colour:"",how:"",storage:"",photos:"",status:"owned",todo:false,dupes:false,sets:false};
S.f=clone(FDEF);
const view=()=>S.meta.view||(S.meta.view={mode:"grid",size:"m",sort:"year-desc",group:"denom"});

/* ================= reference lists ================= */
const DENOMS=[
  {k:"$10",face:"$10",grp:"big",metal:"silver"},{k:"$5",face:"$5",grp:"big",metal:"silver"},
  {k:"$2",face:"$2",grp:"dollar",metal:"gold"},{k:"$1",face:"$1",grp:"dollar",metal:"gold"},
  {k:"50c",face:"50c",grp:"fifty",metal:"silver",shape:"dodeca"},{k:"20c",face:"20c",grp:"twenty",metal:"silver"},
  {k:"10c",face:"10c",grp:"small",metal:"silver"},{k:"5c",face:"5c",grp:"small",metal:"silver"},
  {k:"2c",face:"2c",grp:"bronze",metal:"copper"},{k:"1c",face:"1c",grp:"bronze",metal:"copper"},
  {k:"Crown",face:"5/-",grp:"pre",metal:"silver"},{k:"Florin",face:"2/-",grp:"pre",metal:"silver"},{k:"Shilling",face:"1/-",grp:"pre",metal:"silver"},
  {k:"Sixpence",face:"6d",grp:"pre",metal:"silver"},{k:"Threepence",face:"3d",grp:"pre",metal:"silver"},{k:"Penny",face:"1d",grp:"pre",metal:"copper"},{k:"Halfpenny",face:"½d",grp:"pre",metal:"copper"},
  {k:"Other",face:"?",grp:"other",metal:"silver"}];
const GROUPS={
  big:{label:"$5 & up",solid:"#DB2777",tint:"#FCE7F3",text:"#9D174D",badge:"$5+"},
  dollar:{label:"Dollars",solid:"#D97706",tint:"#FFF4DB",text:"#92400E",badge:"$"},
  fifty:{label:"50 cents",solid:"#0D9488",tint:"#DDF5F2",text:"#115E59",badge:"50"},
  twenty:{label:"20 cents",solid:"#7C3AED",tint:"#EDE9FE",text:"#5B21B6",badge:"20"},
  small:{label:"10c & 5c",solid:"#0284C7",tint:"#E0F2FE",text:"#075985",badge:"10"},
  bronze:{label:"2c & 1c",solid:"#B45309",tint:"#FDECD8",text:"#7C2D12",badge:"1c"},
  pre:{label:"Pre-decimal",solid:"#E8553B",tint:"#FFE8E1",text:"#9A3412",badge:"d"},
  other:{label:"Other",solid:"#475569",tint:"#E2E8F0",text:"#1E293B",badge:"?"}};
const GRP_ORDER=["big","dollar","fifty","twenty","small","bronze","pre","other"];
const GRADES=["G","VG","F","VF","EF","aUNC","UNC","BU"];
const GRADE_NAMES={G:"Good",VG:"Very Good",F:"Fine",VF:"Very Fine",EF:"Extremely Fine",aUNC:"About Uncirculated",UNC:"Uncirculated",BU:"Brilliant Uncirculated"};
const FINISHES=["Circulating","Uncirculated","Frosted uncirculated","Proof","Specimen"];
const PACKS=["Loose","Card","RAM card","DCPL card","Set / folder","Capsule","Flip","2x2 holder","Slab","Album"];
const HOWS=["Bought","Noodled","Gift","Swapped","Inherited"];
const STATUSES=["In collection","Sold","Traded"];
const SIDES=["Obverse","Reverse","Card / packaging","Edge","Slab label","Certificate","Other"];
const SOURCES=["Numista","Royal Australian Mint","Perth Mint","Dealer","Other"];
const COLLS=["Decimal","Pre-decimal","World"];
const MINTS=["None","C","S","M","P","B","A","Privy mark"];

const dInfo=k=>DENOMS.find(d=>d.k===k)||DENOMS[DENOMS.length-1];
const grpOf=c=>c.denom?dInfo(c.denom).grp:"other";
const themeOf=c=>GROUPS[grpOf(c)];
const isOwned=c=>!["Sold","Traded"].includes(c.status);
const qtyOf=c=>Math.max(1,+c.qty||1);
const collOf=c=>c.collection||(grpOf(c)==="pre"?"Pre-decimal":(c.country&&!/australia/i.test(c.country))?"World":"Decimal");
function autoTitle(c){ return [c.year,c.denom,c.series].filter(x=>!blank(x)).join(" "); }
function titleOf(c){ return (c.title||"").trim()||autoTitle(c)||"Untitled coin"; }
const yearNum=c=>{ const m=String(c.year||"").match(/\d{4}/); return m?+m[0]:null; };
function gradeText(c){ return c.grade?(c.grade+(c.sheldon?"-"+c.sheldon:"")):""; }
function gradeStyle(g){ g=String(g||""); if(/UNC|BU/.test(g)) return "background:#DCFCE7;color:#166534"; if(/^EF/.test(g)) return "background:#DBEAFE;color:#1E40AF"; if(/^VF/.test(g)) return "background:#FEF3C7;color:#92400E"; return "background:#E5E7EB;color:#374151"; }
function gradePill(c){ const g=gradeText(c); if(g) return `<span class="grade" style="${gradeStyle(c.grade)}">${esc(g)}</span>`; if(c.finish==="Proof") return `<span class="grade" style="background:#F3E8FF;color:#6B21A8">Proof</span>`; return ""; }
const mine=c=>(c.photos||[]).filter(p=>p.mine);
function coverOf(c){ const ph=c.photos||[]; return ph.find(p=>p.id===c.coverId)||ph.find(p=>p.mine&&p.side==="Obverse")||ph.find(p=>p.mine)||ph.find(p=>p.side==="Obverse")||ph[0]||null; }
function todoOf(c){ const t=[]; if(blank(c.year)) t.push("year"); if(!c.grade&&c.finish!=="Proof") t.push("grade"); if(!mine(c).length) t.push("your photos"); if(blank(c.storage)) t.push("storage location"); if(c.acqHow==="Bought"&&blank(c.price)) t.push("price paid"); return t; }
function imgTag(p,attrs){ return p.url?`<img src="${esc(p.url)}" alt="" referrerpolicy="no-referrer" onerror="this.style.opacity=0" ${attrs||""}>`:`<img data-fid="${esc(p.id)}" alt="" ${attrs||""}>`; }
function drawnCoin(c){ const d=dInfo(c.denom); return `<div class="coin m-${d.metal} ${d.shape||""}">${esc(c.denom?d.face:"?")}</div>`; }
function faceHTML(c){ const p=coverOf(c); return `<div class="face">${p?imgTag(p):drawnCoin(c)}</div>`; }
const fmtNum=n=>blank(n)?"":isNaN(+n)?String(n):Number(n).toLocaleString("en-AU");
const unit=(v,u)=>blank(v)?"":`${v}${/[a-z]$/i.test(String(v))?"":" "+u}`;

/* ================= search & filters ================= */
const norm=s=>String(s??"").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9$½]+/g," ").trim();
function denomWords(d){ if(!d) return ""; let m=d.match(/^\$(\d+)/); if(m) return `${m[1]} dollar dollars`; m=d.match(/^(\d+)c$/); if(m) return `${m[1]} cent cents`; return "pre decimal predecimal"; }
function hay(c){ if(c._h&&c._hv===c.updatedAt) return c._h;
  const parts=[titleOf(c),c.country,c.denom,denomWords(c.denom),c.year,c.mint&&("mint "+c.mint),c.series,c.variety,c.effigy,c.reverseDesigner,c.colourised?"coloured colour colourised color":"",c.isSet?"set":"",c.grade,GRADE_NAMES[c.grade],c.finish,c.packaging,c.serial,c.source,c.acqHow,c.storage,c.status,c.composition,c.edge,collOf(c),c.notes,c.history,c.ns&&c.ns.id?("n"+c.ns.id+" "+c.ns.id):"",c.ns&&c.ns.refs,c.setContents];
  const h=" "+norm(parts.filter(Boolean).join(" "))+" "; Object.defineProperty(c,"_h",{value:h,writable:true,enumerable:false,configurable:true}); Object.defineProperty(c,"_hv",{value:c.updatedAt,writable:true,enumerable:false,configurable:true}); return h; }
function matchQuery(c,q){
  if(!q.trim()) return true; let rest=q;
  const rng=[...q.matchAll(/(\d{4})\s*(?:-|–|to|\.\.)\s*(\d{4})/g)];
  for(const m of rng){ const y=yearNum(c); if(y==null||y<+m[1]||y>+m[2]) return false; rest=rest.replace(m[0]," "); }
  const h=hay(c);
  for(const t of norm(rest).split(" ").filter(Boolean)){
    if(/^\d{4}$/.test(t)){ if(String(yearNum(c))===t) continue; if(h.includes(" "+t)) continue; return false; }
    if(/^\d+$/.test(t)){ if(!h.includes(" "+t+" ")) return false; continue; }
    if(!h.includes(" "+t)) return false;
  }
  return true;
}
function passFilters(c,f,skip){
  const sk=k=>skip===k;
  if(f.status==="owned"&&!isOwned(c)) return false; if(f.status==="sold"&&isOwned(c)) return false;
  if(!sk("grp")&&f.grp.length&&!f.grp.includes(grpOf(c))) return false;
  if(f.denom&&c.denom!==f.denom) return false;
  if(f.coll&&collOf(c)!==f.coll) return false;
  if(f.series&&(c.series||"")!==f.series) return false;
  const y=yearNum(c); if(f.yFrom&&(y==null||y<+f.yFrom)) return false; if(f.yTo&&(y==null||y>+f.yTo)) return false;
  if(f.mint&&(c.mint||"")!==f.mint) return false;
  if(f.grade&&c.grade!==f.grade) return false;
  if(f.finish&&c.finish!==f.finish) return false;
  if(f.pack&&c.packaging!==f.pack) return false;
  if(f.colour==="yes"&&c.colourised!==true) return false; if(f.colour==="no"&&c.colourised===true) return false;
  if(f.how&&c.acqHow!==f.how) return false;
  if(f.storage&&(c.storage||"")!==f.storage) return false;
  if(f.photos==="mine"&&!mine(c).length) return false; if(f.photos==="none"&&mine(c).length) return false;
  if(!sk("todo")&&f.todo&&!todoOf(c).length) return false;
  if(!sk("dupes")&&f.dupes&&qtyOf(c)<2) return false;
  if(f.sets&&!c.isSet) return false;
  return true;
}
function activeFilters(){ const f=S.f, a=[];
  const add=(k,label)=>a.push({k,label});
  if(f.denom) add("denom",f.denom); if(f.coll) add("coll",f.coll); if(f.series) add("series","Series: "+f.series);
  if(f.yFrom||f.yTo) add("year",f.yFrom&&f.yTo?`${f.yFrom}–${f.yTo}`:f.yFrom?`From ${f.yFrom}`:`Up to ${f.yTo}`);
  if(f.mint) add("mint","Mint mark: "+f.mint); if(f.grade) add("grade","Grade: "+f.grade); if(f.finish) add("finish",f.finish); if(f.pack) add("pack",f.pack);
  if(f.colour) add("colour",f.colour==="yes"?"Coloured":"Not coloured"); if(f.how) add("how",f.how); if(f.storage) add("storage","In: "+f.storage);
  if(f.photos) add("photos",f.photos==="mine"?"Has my photos":"No photos yet"); if(f.status!=="owned") add("status",f.status==="all"?"Incl. sold":"Sold / traded");
  if(f.sets) add("sets","Sets only");
  return a; }
function clearFilter(k){ const f=S.f; if(k==="year"){ f.yFrom=""; f.yTo=""; } else if(k==="status") f.status="owned"; else f[k]=FDEF[k]; }
function sorted(list){ const s=view().sort, by=(fn,dir)=>list.sort((a,b)=>{ const x=fn(a),y=fn(b); if(x==null&&y==null) return 0; if(x==null) return 1; if(y==null) return -1; return (x<y?-1:x>y?1:0)*dir; });
  const dIdx=c=>DENOMS.indexOf(dInfo(c.denom));
  if(s==="year-asc") by(yearNum,1); else if(s==="year-desc") by(yearNum,-1);
  else if(s==="title") list.sort((a,b)=>titleOf(a).localeCompare(titleOf(b)));
  else if(s==="added") by(c=>c.addedAt||"",-1);
  else if(s==="value") by(c=>blank(c.value)?null:+c.value,-1);
  else if(s==="mintage") by(c=>blank(c.mintage)?null:+c.mintage,1);
  else if(s==="denom") list.sort((a,b)=>dIdx(a)-dIdx(b)||((yearNum(b)||0)-(yearNum(a)||0)));
  return list; }
function results(){ return sorted(S.coins.filter(c=>passFilters(c,S.f)&&matchQuery(c,S.q))); }
function groupsOf(list){ const g=view().group; if(g==="none") return [{key:"all",label:"",items:list}];
  const map=new Map(); const keyOf=c=>g==="denom"?grpOf(c):g==="series"?(c.series||""):g==="decade"?(yearNum(c)?Math.floor(yearNum(c)/10)*10+"s":""):g==="storage"?(c.storage||""):g==="collection"?collOf(c):"";
  for(const c of list){ const k=keyOf(c); if(!map.has(k)) map.set(k,[]); map.get(k).push(c); }
  let keys=[...map.keys()];
  if(g==="denom") keys.sort((a,b)=>GRP_ORDER.indexOf(a)-GRP_ORDER.indexOf(b));
  else if(g==="decade") keys.sort((a,b)=>(b||"0").localeCompare(a||"0"));
  else keys.sort((a,b)=>(a===""?1:b===""?-1:a.localeCompare(b)));
  const blankLbl={series:"No series",decade:"Year not recorded",storage:"Storage not recorded"}[g]||"Other";
  return keys.map(k=>({key:k,label:g==="denom"?GROUPS[k].label:(k||blankLbl),theme:g==="denom"?GROUPS[k]:null,items:map.get(k)})); }

/* ================= render: main tabs ================= */
function render(){
  document.querySelectorAll("nav.tabs [data-tab]").forEach(b=>b.setAttribute("aria-current",b.dataset.tab===S.tab?"page":"false"));
  const wb=$("#wantBadge"), wn=S.wanted.filter(w=>!w.got).length; wb.hidden=!wn; wb.textContent=wn;
  const m=$("#main");
  m.innerHTML=S.tab==="coins"?viewCoins():S.tab==="albums"?viewAlbums():S.tab==="wants"?viewWants():viewMore();
  hydrateImages(m); hdrStatus();
}
function backupBanner(){
  if(S.readOnly) return `<div class="banner"><span>View only — another ${devWord()} is now the main one.</span><button type="button" class="btn sm" data-more-go="backup">Details</button></div>`;
  const ch=S.meta.changes||0, last=S.meta.lastBackup, dx=S.meta.dbx||{};
  if(dbxOn()){ if(dx.lastError&&ch) return `<div class="banner"><span>Dropbox sync didn't work: ${esc(dx.lastError)}</span><button type="button" class="btn sm" data-more-go="backup">Fix</button></div>`; return ""; }
  if(!S.coins.length) return "";
  const days=last?Math.floor((Date.now()-new Date(last))/864e5):null;
  if(!last) return `<div class="banner"><span>Your collection lives only on this ${devWord()}. Connect Dropbox so it's kept safe automatically.</span><button type="button" class="btn sm amber" data-more-go="backup">Set up</button></div>`;
  if(ch&&days>=30) return `<div class="banner"><span>${ch} changes since your last backup ${days} days ago.</span><button type="button" class="btn sm amber" data-more-go="backup">Back up</button></div>`;
  return "";
}
function viewCoins(){
  const v=view(), owned=S.coins.filter(isOwned), nCoins=owned.reduce((a,c)=>a+qtyOf(c),0);
  const val=owned.reduce((a,c)=>a+(blank(c.value)?0:+c.value*qtyOf(c)),0), paid=owned.reduce((a,c)=>{ const p=priceAUD(c); return a+(p==null?0:p*qtyOf(c)); },0);
  const wants=S.wanted.filter(w=>!w.got).length;
  if(!S.coins.length) return `<section class="view"><div class="hero"><div class="stats"><div class="stat"><b>0</b><span>Coins</span></div><div class="stat"><b>—</b><span>Value</span></div><div class="stat"><b>${wants}</b><span>Wanted</span></div></div></div>${backupBanner()}
    <div class="empty"><b>No coins on this ${devWord()} yet</b><span>${dbxOn()?"Connected to Dropbox, but there's no collection there yet.":"New phone, or cleared Chrome? Connect Dropbox and your collection downloads automatically. To load your starter list, restore the backup file you were given."}</span>
    <div class="row" style="justify-content:center">${dbxOn()?"":`<button type="button" class="btn primary" data-dbxconnect>Get my collection from Dropbox</button>`}<button type="button" class="btn" data-restore>Restore backup file</button><button type="button" class="btn amber" data-add>Add a coin</button></div></div></section>`;
  const present=GRP_ORDER.filter(g=>S.coins.some(c=>grpOf(c)===g&&passFilters(c,S.f,"grp")));
  const nTodo=S.coins.filter(c=>passFilters(c,{...S.f,todo:false},"todo")&&todoOf(c).length).length;
  const nDup=S.coins.filter(c=>passFilters(c,{...S.f,dupes:false},"dupes")&&qtyOf(c)>1).length;
  const act=activeFilters();
  return `<section class="view">
  <div class="hero">
    <div class="stats">
      <button type="button" class="stat" data-more-go="stats"><b style="color:#4338CA">${nCoins}</b><span>Coins</span></button>
      <button type="button" class="stat" data-more-go="stats"><b style="color:#0F766E">${val?aud(Math.round(val)):paid?aud(Math.round(paid)):"—"}</b><span>${val?"Current value":"Paid"}</span></button>
      <button type="button" class="stat" data-tab="wants"><b style="color:#C2410C">${wants}</b><span>Wanted</span></button>
    </div>
    <div class="searchbar"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4B5563" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <label for="q" class="sr">Search coins</label><input id="q" type="search" enterkeyhint="search" autocomplete="off" placeholder="Search: 2022 bee, Vietnam, safe, 1966-1970…" value="${esc(S.q)}">
      <button type="button" class="clear" data-clearq aria-label="Clear search" ${S.q?"":"hidden"}>×</button></div>
  </div>
  ${backupBanner()}
  <div class="tools">
    <div class="seg" role="group" aria-label="View"><button type="button" data-mode="grid" aria-pressed="${v.mode==="grid"}">Grid</button><button type="button" data-mode="list" aria-pressed="${v.mode==="list"}">List</button><button type="button" data-tab="albums" aria-pressed="false">Albums</button></div>
    ${v.mode==="grid"?`<div class="seg light" role="group" aria-label="Tile size">${["s","m","l"].map(s=>`<button type="button" data-size="${s}" aria-pressed="${v.size===s}" aria-label="${{s:"Small",m:"Medium",l:"Large"}[s]} tiles">${s.toUpperCase()}</button>`).join("")}</div>`:""}
  </div>
  <div class="chips">
    <button type="button" class="fbtn" data-filters><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>Filters${act.length?`<b>${act.length}</b>`:""}</button>
    ${present.map(g=>`<button type="button" class="chip" data-grp="${g}" aria-pressed="${S.f.grp.includes(g)}"><i style="background:${GROUPS[g].solid}"></i>${GROUPS[g].label}</button>`).join("")}
    ${nTodo||S.f.todo?`<button type="button" class="chip" data-qf="todo" aria-pressed="${S.f.todo}">To finish · ${nTodo}</button>`:""}
    ${nDup||S.f.dupes?`<button type="button" class="chip" data-qf="dupes" aria-pressed="${S.f.dupes}">Duplicates · ${nDup}</button>`:""}
  </div>
  ${act.length?`<div class="chips wrapy">${act.map(a=>`<button type="button" class="chip x" data-unf="${a.k}" aria-label="Remove filter ${esc(a.label)}">${esc(a.label)} ×</button>`).join("")}<button type="button" class="chip" data-clearall>Clear all</button></div>`:""}
  <div id="results">${resultsHTML()}</div>
  </section>`;
}
function resultsHTML(){
  const v=view(), list=results(), n=list.reduce((a,c)=>a+qtyOf(c),0);
  const filtered=!!(S.q.trim()||activeFilters().length||S.f.grp.length||S.f.todo||S.f.dupes);
  const meta=`<div class="metarow"><span class="count">${filtered?`${list.length} match${list.length===1?"":"es"}`:`${list.length} record${list.length===1?"":"s"}`}${n!==list.length?` · ${n} coins`:""}</span>
    <span class="row" style="gap:6px"><label class="sr" for="sortSel">Sort</label><select id="sortSel">${[["year-desc","Newest year"],["year-asc","Oldest year"],["denom","Denomination"],["title","Name A–Z"],["added","Recently added"],["value","Highest value"],["mintage","Lowest mintage"]].map(([k,l])=>`<option value="${k}" ${v.sort===k?"selected":""}>${l}</option>`).join("")}</select>
    <label class="sr" for="groupSel">Group by</label><select id="groupSel">${[["denom","Group: denomination"],["series","Group: series"],["decade","Group: decade"],["storage","Group: storage"],["collection","Group: collection"],["none","No groups"]].map(([k,l])=>`<option value="${k}" ${v.group===k?"selected":""}>${l}</option>`).join("")}</select></span></div>`;
  if(!list.length) return meta+`<div class="empty"><b>No coins match</b><span>Try fewer words, or clear a filter.</span>${activeFilters().length||S.q||S.f.grp.length||S.f.todo||S.f.dupes?`<button type="button" class="btn" data-clearall>Clear search &amp; filters</button>`:""}</div>`;
  return meta+groupsOf(list).map(g=>`${g.label?`<div class="ghead"><h2>${g.theme?`<span class="gico" style="background:${g.theme.solid}">${esc(g.theme.badge)}</span>`:""}${esc(g.label)}</h2><span class="gcount" style="${g.theme?`background:${g.theme.tint};color:${g.theme.text}`:"background:#E6E8F2;color:#374151"}">${g.items.length}</span></div>`:""}
    ${v.mode==="list"?`<div class="listbox">${g.items.map(rowHTML).join("")}</div>`:`<div class="tiles ${v.size==="m"?"":v.size}">${g.items.map(tileHTML).join("")}</div>`}`).join("");
}
function tileHTML(c){ const t=themeOf(c), p=coverOf(c);
  return `<button type="button" class="tile" style="background:${t.tint}" data-open="${c.id}">${faceHTML(c)}${p&&!p.mine?`<span class="reftag">REF</span>`:""}${qtyOf(c)>1?`<span class="qty">×${qtyOf(c)}</span>`:""}
    <span class="yr" style="color:${t.text}">${esc(c.year||"—")}</span><span class="nm">${esc(shortName(c))}</span>${gradePill(c)}</button>`; }
function shortName(c){ const t=titleOf(c); let s=t.replace(new RegExp("^"+String(c.year||"").replace(/[^\d]/g,"")+"\\s*"),""); return s||t; }
function rowHTML(c){ const p=coverOf(c), t=themeOf(c);
  return `<button type="button" class="lrow" data-open="${c.id}">${faceHTML(c)}<span class="tx"><span class="t1">${esc(titleOf(c))}</span><span class="t2">${esc([c.denom,c.mint&&c.mint!=="None"?"Mint "+c.mint:"",c.packaging,c.storage].filter(Boolean).join(" · ")||"Tap to add details")}</span></span>
    <span class="rt">${gradePill(c)}${qtyOf(c)>1?`<span>×${qtyOf(c)}</span>`:""}${p&&!p.mine?`<span style="color:var(--ref);font-size:10px;font-weight:800">REF PHOTO</span>`:""}<i style="width:8px;height:8px;border-radius:4px;background:${t.solid}"></i></span></button>`; }

/* ---------- albums ---------- */
function albumData(){
  const map=new Map(); const get=k=>{ if(!map.has(k)) map.set(k,{key:k,coins:[],wants:[]}); return map.get(k); };
  for(const c of S.coins.filter(isOwned)) if(c.series) get(c.series).coins.push(c);
  for(const w of S.wanted.filter(w=>!w.got)) if(w.series) get(w.series).wants.push(w);
  return [...map.values()].sort((a,b)=>a.key.localeCompare(b.key));
}
function typeLists(){ const m=new Map(); for(const c of S.coins.filter(isOwned)){ const ns=c.ns; if(ns&&ns.id&&(ns.issues||[]).length>1){ if(!m.has(ns.id)) m.set(ns.id,{id:ns.id,title:ns.title||titleOf(c),issues:ns.issues,coins:[]}); m.get(ns.id).coins.push(c); } } return [...m.values()]; }
function progBar(o,w,t){ const T=Math.max(1,t); return `<div class="prog" role="progressbar" aria-valuenow="${o}" aria-valuemin="0" aria-valuemax="${t}" aria-label="Owned ${o} of ${t}"><i style="width:${o/T*100}%;background:#0D9488"></i><i style="width:${w/T*100}%;background:#F59E0B"></i></div>`; }
function viewAlbums(){
  const al=albumData(), tl=typeLists();
  return `<section class="view"><div class="hero" style="padding-top:12px"><h1 style="color:#fff;font-size:22px">Albums</h1><p class="m0" style="color:var(--on-indigo);font-size:13px">Coins grouped by theme or series, with gaps for the ones on your want list.</p></div>
  ${al.length?`<div class="listbox">${al.map(a=>{ const o=a.coins.length,w=a.wants.length; const c0=a.coins[0]; return `<button type="button" class="alb" data-album="${esc(a.key)}">${c0?faceHTML(c0).replace('class="face"','class="face" style="width:48px;height:48px;--face:48px"'):`<span class="gico" style="background:#F59E0B;width:48px;height:48px;border-radius:24px">♡</span>`}<span class="tx"><b>${esc(a.key)}</b><span class="muted small">${o} owned${w?` · ${w} wanted`:""}</span>${w?progBar(o,0,o+w):""}</span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4B5563" stroke-width="2"><path d="m9 6 6 6-6 6"/></svg></button>`; }).join("")}</div>`
   :`<div class="empty"><b>No albums yet</b><span>Give coins a Theme / series (for example "Australian Dinosaurs") and they gather here. Add wants with the same series to see the gaps.</span></div>`}
  ${tl.length?`<h2 style="font-size:16px;font-weight:800;margin-top:6px">Year checklists</h2><p class="m0 muted small">Every year and mint mark Numista lists for these coin types.</p><div class="listbox">${tl.map(t=>{ const own=t.issues.filter(i=>ownsIssue(t.id,i)).length; return `<button type="button" class="alb" data-tlist="${t.id}"><span class="tx"><b>${esc(t.title)}</b><span class="muted small">${own} of ${t.issues.length} issues</span>${progBar(own,0,t.issues.length)}</span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4B5563" stroke-width="2"><path d="m9 6 6 6-6 6"/></svg></button>`; }).join("")}</div>`:""}
  </section>`;
}
const ownsIssue=(nsId,i)=>S.coins.some(c=>isOwned(c)&&c.ns&&String(c.ns.id)===String(nsId)&&String(yearNum(c))===String(i.year)&&((c.mint||"None")===(i.mint||"None")||(!i.mint&&(!c.mint||c.mint==="None"))));

/* ---------- wants ---------- */
function viewWants(){
  const open=S.wanted.filter(w=>!w.got), got=S.wanted.filter(w=>w.got);
  return `<section class="view"><div class="hero" style="padding-top:12px"><h1 style="color:#fff;font-size:22px">Want list</h1><p class="m0" style="color:var(--on-indigo);font-size:13px">Coins you're hunting for. Tap "Got it" to turn one into a coin record.</p></div>
  <details class="fsec" ${open.length?"":"open"}><summary><span class="ico" style="background:#F59E0B"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span>Add a want<span class="sp"></span></summary>
   <form id="wantForm" class="grid2">
    <div class="field full"><label for="w_title">What is it?</label><input id="w_title" name="title" required placeholder="e.g. 2023 $2 Coronation, mint mark C"></div>
    <div class="field"><label for="w_denom">Denomination</label><select id="w_denom" name="denom"><option value="">—</option>${DENOMS.map(d=>`<option>${d.k}</option>`).join("")}</select></div>
    <div class="field"><label for="w_year">Year</label><input id="w_year" name="year" inputmode="numeric" placeholder="e.g. 2023"></div>
    <div class="field full"><label for="w_series">Theme / series <span class="hint">puts it in that album</span></label><input id="w_series" name="series" list="dl_series" placeholder="e.g. Australian Dinosaurs"></div>
    <div class="field"><label for="w_target">Happy to pay up to (A$)</label><input id="w_target" name="target" inputmode="decimal"></div>
    <div class="field"><label for="w_notes">Notes</label><input id="w_notes" name="notes"></div>
    <div class="full"><button class="btn primary block" type="submit">Add to want list</button></div></form>${datalists()}</details>
  ${open.length?`<div class="lst">${open.map(w=>`<div class="item"><span class="gico" style="background:${GROUPS[w.denom?dInfo(w.denom).grp:"other"].solid}">${esc(w.denom?dInfo(w.denom).face:"?")}</span><div><b>${esc(w.title)}</b><div class="muted small">${esc([w.year,w.series,w.target?"up to "+aud(w.target):"",w.notes].filter(Boolean).join(" · "))}</div></div><button type="button" class="btn sm primary" data-wgot="${w.id}">Got it</button><button type="button" class="btn sm ghost" data-wdel="${w.id}" aria-label="Remove ${esc(w.title)}">×</button></div>`).join("")}</div>`:`<div class="empty"><b>Nothing on your want list</b><span>Add the coins you're looking for — they also show as gaps in your albums.</span></div>`}
  ${got.length?`<details class="fsec"><summary>Found (${got.length})<span class="sp"></span></summary><div class="lst">${got.map(w=>`<div class="item"><div><b>${esc(w.title)}</b><div class="muted small">Found${w.gotAt?" "+fmtDate(w.gotAt.slice(0,10)):""}</div></div><button type="button" class="btn sm ghost" data-wdel="${w.id}" aria-label="Remove">×</button></div>`).join("")}</div></details>`:""}
  </section>`;
}

/* ---------- more ---------- */
const backMore=`<button type="button" class="btn sm" data-more="" style="align-self:flex-start">‹ More</button>`;
function menuIco(bg,path){ return `<span class="ico" style="background:${bg};width:40px;height:40px;border-radius:12px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px">${path}</svg></span>`; }
function viewMore(){
  const mv=S.moreView;
  if(mv==="backup") return viewBackup(); if(mv==="numista") return viewNumista(); if(mv==="stats") return viewStats(); if(mv==="export") return viewExport(); if(mv==="report") return viewReport(); if(mv==="about") return viewAbout();
  const k=nsKey();
  return `<section class="view"><div class="hero" style="padding-top:12px"><h1 style="color:#fff;font-size:22px">More</h1></div><div class="menu">
    <button type="button" data-more="backup">${menuIco("#4338CA",'<path d="M7 18a4 4 0 0 1-.6-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z"/>')}<span class="tx"><b>Backup &amp; restore</b><span class="muted small">${S.readOnly?"View only":dbxOn()?"Kept in Dropbox":"Connect Dropbox, or make a backup file"}${S.meta.changes?` · ${S.meta.changes} not backed up`:""}</span></span></button>
    <button type="button" data-more="numista">${menuIco("#0D9488",'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>')}<span class="tx"><b>Numista lookups</b><span class="muted small">${k?"Key saved · "+nsUsage():"Add your free API key"}</span></span></button>
    <button type="button" data-more="stats">${menuIco("#D97706",'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>')}<span class="tx"><b>Statistics</b><span class="muted small">Totals, value, by denomination</span></span></button>
    <button type="button" data-more="report">${menuIco("#7C3AED",'<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>')}<span class="tx"><b>Insurance report</b><span class="muted small">PDF listing with photos and values</span></span></button>
    <button type="button" data-more="export">${menuIco("#0284C7",'<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>')}<span class="tx"><b>Export CSV</b><span class="muted small">Spreadsheet copy for Excel</span></span></button>
    <button type="button" data-more="about">${menuIco("#475569",'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>')}<span class="tx"><b>About MyMint</b><span class="muted small">Version ${APP_VERSION} · where your data lives</span></span></button>
  </div><p class="muted small" style="text-align:center;margin:4px 0 0">MyMint · Version ${APP_VERSION}</p></section>`;
}
const SITE_DATA_WARN=`<div class="banner"><span><b>Warning:</b> clearing Chrome's <b>"Cookies and site data"</b> (or uninstalling Chrome) <b>deletes the collection on this ${devWord()}</b>. With Dropbox connected it comes back when you reconnect; without it, only a backup file can bring it back.</span></div>`;
function viewBackup(){
  return `<section class="view">${backMore}${SITE_DATA_WARN}${dbxPanel()}
  <div class="panel"><h3>Backup file</h3><p class="m0">Makes one .zip file with every coin, photo and want, and saves it to your Downloads. Never upload a backup to GitHub — the repository is public.</p>
    <div class="row"><button type="button" class="btn ${dbxOn()?"":"primary"}" data-backup>Make backup file</button><span class="muted small" id="bkStat"></span></div><div id="bkOut" class="row"></div></div>
  <div class="panel"><h3>Restore</h3><p class="m0">Loads a backup onto this ${devWord()}. It <b>replaces</b> everything currently in the app. ${dbxOn()?"A snapshot of what's here now is saved to Dropbox first, so a restore can be undone.":"Use it on a new phone, to load your starter list, or to undo mistakes."}</p>
    <div class="row"><button type="button" class="btn" data-restore>Choose backup file…</button>${dbxOn()?`<button type="button" class="btn" data-dbxlist>Restore a Dropbox snapshot…</button>`:""}<span class="muted small" id="rsStat"></span></div><div id="dbxList"></div><div id="rsConfirm"></div></div></section>`;
}
function viewStats(){
  const owned=S.coins.filter(isOwned); const n=owned.reduce((a,c)=>a+qtyOf(c),0);
  const paid=owned.reduce((a,c)=>{ const p=priceAUD(c); return a+(p==null?0:p*qtyOf(c)); },0);
  const val=owned.reduce((a,c)=>a+(blank(c.value)?0:+c.value*qtyOf(c)),0);
  const both=owned.filter(c=>!blank(c.value)&&priceAUD(c)!=null); const bp=both.reduce((a,c)=>a+priceAUD(c)*qtyOf(c),0), bv=both.reduce((a,c)=>a+(+c.value)*qtyOf(c),0);
  const by={}; for(const c of owned){ const g=grpOf(c); by[g]=(by[g]||0)+qtyOf(c); }
  const bars=(entries,colorFn)=>{ const max=Math.max(1,...entries.map(e=>e[1])); return `<div class="bars">${entries.map(([k,v])=>`<div class="bar"><span>${esc(k)}</span><div class="track"><div class="fill" style="width:${v/max*100}%;background:${colorFn(k)}"></div></div><span class="v">${v}</span></div>`).join("")}</div>`; };
  const ser={}; for(const c of owned) if(c.series) ser[c.series]=(ser[c.series]||0)+qtyOf(c);
  const sto={}; for(const c of owned) sto[c.storage||"Not recorded"]=(sto[c.storage||"Not recorded"]||0)+qtyOf(c);
  const todo=owned.filter(c=>todoOf(c).length).length;
  return `<section class="view">${backMore}
  <div class="stats"><div class="stat"><b style="color:#4338CA">${n}</b><span>Coins (${owned.length} records)</span></div><div class="stat"><b style="color:#0F766E">${val?aud(Math.round(val)):"—"}</b><span>Current value</span></div><div class="stat"><b style="color:#B45309">${paid?aud(Math.round(paid)):"—"}</b><span>Paid</span></div></div>
  ${both.length?`<div class="panel"><h3>Gain on coins with both a price and a value</h3><p class="m0"><b style="font-size:22px;color:${bv>=bp?"#15803D":"#B91C1C"}">${bv>=bp?"+":"−"}${aud(Math.abs(Math.round(bv-bp)))}</b> <span class="muted">across ${both.length} record${both.length===1?"":"s"} (paid ${aud(Math.round(bp))}, now ${aud(Math.round(bv))})</span></p></div>`:""}
  <div class="panel"><h3>By denomination</h3>${bars(GRP_ORDER.filter(g=>by[g]).map(g=>[GROUPS[g].label,by[g]]),k=>(Object.values(GROUPS).find(x=>x.label===k)||{}).solid)}</div>
  ${Object.keys(ser).length?`<div class="panel"><h3>By series</h3>${bars(Object.entries(ser).sort((a,b)=>b[1]-a[1]).slice(0,12),()=>"#4338CA")}</div>`:""}
  <div class="panel"><h3>Where they're kept</h3>${bars(Object.entries(sto).sort((a,b)=>b[1]-a[1]),k=>k==="Not recorded"?"#A5ABB8":"#7C3AED")}</div>
  ${todo?`<div class="todo"><span>${todo} record${todo===1?"":"s"} still need details (year, grade, photos or storage).</span><button type="button" class="btn sm" data-showtodo>Show them</button></div>`:""}
  </section>`;
}
const CSV_COLS=[["title",titleOf],["denomination",c=>c.denom],["year"],["mintMark",c=>c.mint],["series"],["country"],["collection",collOf],["colourised",c=>c.colourised===true?"Yes":c.colourised===false?"No":""],["isSet",c=>c.isSet?"Yes":""],["coinsInSet",c=>c.setCount],["grade"],["sheldon"],["finish"],["packaging"],["serial"],["quantity",qtyOf],["howAcquired",c=>c.acqHow],["dateAcquired",c=>c.acqDate],["source"],["priceEach",c=>c.price],["priceCurrency",c=>curOf(c.priceCur)],["priceEachAUD",c=>priceAUD(c)],["valueEachAUD",c=>c.value],["valueDate"],["storage"],["status",c=>c.status||"In collection"],["composition"],["massG",c=>c.mass],["diameterMm",c=>c.diameter],["thicknessMm",c=>c.thickness],["edge"],["mintage"],["effigy"],["reverseDesigner"],["variety"],["numistaId",c=>c.ns&&c.ns.id],["catalogueRefs",c=>c.ns&&c.ns.refs],["myPhotos",c=>mine(c).length],["referencePhotos",c=>(c.photos||[]).filter(p=>!p.mine).length],["historicalContext",c=>c.history],["notes"]];
function toCSV(){ const q=v=>{ v=v==null?"":String(v); return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }; return "﻿"+[CSV_COLS.map(c=>c[0]).join(","),...S.coins.map(c=>CSV_COLS.map(([k,fn])=>q(fn?fn(c):c[k])).join(","))].join("\r\n"); }
function viewExport(){ const url=URL.createObjectURL(new Blob([toCSV()],{type:"text/csv"})); return `<section class="view">${backMore}<div class="panel"><h3>Export CSV</h3><p class="m0">${S.coins.length} coins, ${CSV_COLS.length} columns. Opens in Excel. This is a spreadsheet copy, not a backup — photos aren't included and it can't be restored.</p><div class="row"><a class="btn primary" href="${url}" download="mymint-coins-${todayISO()}.csv">Save CSV</a><button type="button" class="btn" data-copycsv>Copy CSV text</button></div><textarea class="csv" id="csvText" readonly aria-label="CSV text">${esc(toCSV().slice(1))}</textarea></div></section>`; }
function viewReport(){ const o=S.rep||(S.rep={photos:true,sold:false,sort:"denom",by:""});
  return `<section class="view">${backMore}<div class="panel"><h3>Insurance report</h3><p class="m0">A printable list of your coins with photos, grade, quantity, price paid, current value and where each is kept, with totals. On the next screen choose <b>Save as PDF</b>.</p>
  <label class="check-inline"><input type="checkbox" id="rPhotos" ${o.photos?"checked":""}><span>Include cover photos (your own photos only)</span></label>
  <label class="check-inline"><input type="checkbox" id="rSold" ${o.sold?"checked":""}><span>Include sold and traded coins</span></label>
  <div class="field"><label for="rBy">Prepared for (optional)</label><input id="rBy" value="${esc(o.by)}" placeholder="e.g. Home & contents insurer"></div>
  <button type="button" class="btn primary" data-mkreport>Create PDF</button></div></section>`; }
async function makeReport(){
  const o=S.rep; const list=sorted(S.coins.filter(c=>o.sold||isOwned(c)).slice()); const totP=list.reduce((a,c)=>{ const p=priceAUD(c); return a+(p==null?0:p*qtyOf(c)); },0), totV=list.reduce((a,c)=>a+(blank(c.value)?0:+c.value*qtyOf(c)),0);
  const rows=[]; for(const c of list){ let img=""; if(o.photos){ const p=mine(c).find(p=>p.id===c.coverId)||mine(c)[0]; if(p) img=`<img src="${await urlFor(p.id)}" alt="">`; }
    rows.push(`<tr>${o.photos?`<td>${img}</td>`:""}<td><b>${esc(titleOf(c))}</b><br>${esc([c.denom,c.year,c.mint&&c.mint!=="None"?"Mint "+c.mint:"",c.serial?"Serial "+c.serial:""].filter(Boolean).join(" · "))}</td><td>${esc(gradeText(c)||c.finish||"")}</td><td>${qtyOf(c)}</td><td>${priceAUD(c)!=null?aud(priceAUD(c)):""}</td><td>${blank(c.value)?"":aud(c.value)}</td><td>${esc(c.storage||"")}</td></tr>`); }
  $("#report").innerHTML=`<h1 style="font-size:18pt;margin:0 0 4px">Coin collection — insurance listing</h1><p style="margin:0 0 10px">${o.by?"Prepared for "+esc(o.by)+" · ":""}${fmtDate(todayISO())} · ${list.length} records, ${list.reduce((a,c)=>a+qtyOf(c),0)} coins · Paid ${aud(Math.round(totP))} · Current value ${aud(Math.round(totV))}</p>
  <table><thead><tr>${o.photos?"<th></th>":""}<th>Coin</th><th>Grade</th><th>Qty</th><th>Paid (each)</th><th>Value (each)</th><th>Kept in</th></tr></thead><tbody>${rows.join("")}</tbody></table><p style="font-size:9pt;margin-top:10px">Values are the owner's own estimates. Generated by MyMint ${APP_VERSION}.</p>`;
  setTimeout(()=>window.print(),300);
}
window.addEventListener("afterprint",()=>{ const el=$("#report"); if(el) el.innerHTML=""; });
function viewAbout(){ return `<section class="view">${backMore}<div class="panel"><h3>Where your data lives</h3><p class="m0"><b>Version ${APP_VERSION}</b>.</p><p class="m0">Everything — coins, photos and wants — is stored in this browser on this ${devWord()}${dbxOn()?", and a live copy is kept in your own Dropbox":""}. Catalogue details come from Numista when you look a coin up (catalogue data provided by Numista). Exchange rates come from Frankfurter. The app works offline once installed.</p><dl class="dbxst" id="storeInfo"><dt>Storage used</dt><dd>…</dd></dl></div></section>`; }
async function fillStoreInfo(){ const el=$("#storeInfo"); if(!el) return; let used="Unknown",prot="Unknown"; try{ const e=await navigator.storage.estimate(); used=(e.usage/1048576).toFixed(1)+" MB"; }catch{} try{ prot=(await navigator.storage.persisted())?"Yes — the browser won't clear it to save space":"Not yet — it's requested when you save"; }catch{} el.innerHTML=`<dt>Storage used</dt><dd>${used}</dd><dt>Protected storage</dt><dd>${prot}</dd>`; }

/* ================= Numista ================= */
const NS_API="https://api.numista.com/v3";
const asList=x=>Array.isArray(x)?x:(x&&(x.issues||x.items||x.types))||[];
const nsSet=()=>S.settings.find(x=>x.id==="numista")||{id:"numista"};
const nsKey=()=>nsSet().key||"";
function nsUsage(){ const u=S.meta.nsCalls||{}; const m=todayISO().slice(0,7); return `${u.month===m?u.n:0} of 2,000 lookups used this month`; }
async function nsFetch(path){
  const key=nsKey(); if(!key) throw new Error("Add your Numista API key first (More › Numista lookups).");
  if(navigator.onLine===false) throw new Error("No internet connection — Numista lookups need to be online.");
  let r; try{ r=await fetch(NS_API+path+(path.includes("?")?"&":"?")+"lang=en",{headers:{"Numista-API-Key":key}}); }catch(e){ throw new Error("Couldn't reach Numista (no connection, or the request was blocked)."); }
  const m=todayISO().slice(0,7); const u=S.meta.nsCalls||{}; S.meta.nsCalls={month:m,n:(u.month===m?u.n:0)+1}; saveMeta().catch(()=>{});
  if(r.status===401) throw new Error("Numista didn't accept the API key — check it in More › Numista lookups.");
  if(r.status===429) throw new Error("Numista's monthly lookup limit has been reached.");
  if(r.status===404) throw new Error("Numista doesn't have that entry.");
  if(!r.ok){ let m=""; try{ const j=await r.json(); m=j.error_message||j.message||j.error||""; }catch{} const e=new Error("Numista error "+r.status+(m?": "+String(m).slice(0,140):"")); e.status=r.status; throw e; }
  return r.json();
}
const stripHtml=h=>{ if(!h) return ""; const d=document.createElement("div"); d.innerHTML=String(h).replace(/<br\s*\/?>/gi,"\n").replace(/<\/p>/gi,"\n\n"); return d.textContent.replace(/\n{3,}/g,"\n\n").trim(); };
const nameList=a=>[...new Set((a||[]).map(x=>typeof x==="string"?x:(x&&x.name)||"").filter(Boolean))];
function denomFromValue(v){ if(!v) return ""; const t=String(v.text||"").toLowerCase(), n=v.numeric_value;
  if(/cent/.test(t)){ const k=(n<1?Math.round(n*100):n)+"c"; return DENOMS.some(d=>d.k===k)?k:"Other"; }
  if(/dollar/.test(t)){ const k="$"+(+n); return DENOMS.some(d=>d.k===k)?k:"Other"; }
  if(/halfpenny|half penny|½ penny/.test(t)) return "Halfpenny"; if(/penny/.test(t)&&!/pence/.test(t)) return "Penny";
  if(/threepence|3 pence/.test(t)) return "Threepence"; if(/sixpence|6 pence/.test(t)) return "Sixpence";
  if(/florin|2 shillings/.test(t)) return "Florin"; if(/crown|5 shillings/.test(t)) return "Crown"; if(/shilling/.test(t)) return "Shilling";
  return "Other"; }
function fromNumista(t,issue){
  const o={};
  o.title=t.title||""; o.country=t.issuer&&t.issuer.name||""; o.denom=denomFromValue(t.value);
  if(issue){ o.year=issue.year!=null?String(issue.year):issue.gregorian_year!=null?String(issue.gregorian_year):""; o.mint=issue.mint_letter||""; if(issue.mintage) o.mintage=String(issue.mintage); }
  else if(t.min_year&&t.min_year===t.max_year) o.year=String(t.min_year);
  o.composition=t.composition&&t.composition.text||""; o.mass=t.weight!=null?String(t.weight):""; o.diameter=t.size!=null?String(t.size):""; o.thickness=t.thickness!=null?String(t.thickness):"";
  o.edge=t.edge&&t.edge.description||"";
  const ob=t.obverse||{}, rv=t.reverse||{}; o.effigy=nameList([...(ob.designers||[]),...(ob.engravers||[])]).join(", "); o.reverseDesigner=nameList([...(rv.designers||[]),...(rv.engravers||[])]).join(", ");
  o.series=typeof t.series==="string"?t.series:(t.series&&t.series.name)||t.commemorated_topic||"";
  o.history=stripHtml(t.comments);
  for(const k of Object.keys(o)) if(blank(o[k])) delete o[k];
  return o;
}
function nsInfo(t,issues){ return {id:t.id,url:t.url||`https://en.numista.com/${t.id}`,title:t.title||"",refs:(t.references||[]).map(r=>`${(r.catalogue&&r.catalogue.code)||""} ${r.number||""}`.trim()).filter(Boolean).join(", "),
  issues:(issues||[]).map(i=>({year:i.year!=null?i.year:i.gregorian_year,mint:i.mint_letter||"",mintage:i.mintage||null,id:i.id})).filter(i=>i.year!=null),fetchedAt:new Date().toISOString()}; }
async function nsImage(url){ if(!url) return null;
  try{ const r=await fetch(url,{mode:"cors"}); if(!r.ok) throw 0; const b=await r.blob(); if(!/^image\//.test(b.type)) throw 0; const small=await resizeImage(b,1200); const id=uid("f"); await dbPut("files",{id,blob:small,type:"image/jpeg",name:id+".jpg"}); return {id}; }
  catch{ return {id:uid("r"),url}; } }
function applyNs(draft,o,overwriteAll){ draft.nsFilled=draft.nsFilled||{}; for(const [k,v] of Object.entries(o)){ if(overwriteAll||blank(draft[k])||draft.nsFilled[k]===draft[k]){ draft[k]=v; draft.nsFilled[k]=v; } } }
async function nsRefresh(id){
  const c=clone(S.coins.find(x=>x.id===id)); if(!c||!c.ns) return;
  toast("Checking Numista…");
  try{ const t=await nsFetch(`/types/${c.ns.id}`); let issues=[]; try{ issues=asList(await nsFetch(`/types/${c.ns.id}/issues`)); }catch{}
    const issue=(issues||[]).find(i=>String(i.year)===String(yearNum(c))&&(i.mint_letter||"")===((c.mint&&c.mint!=="None")?c.mint:""))||null;
    const before=JSON.stringify(c); applyNs(c,fromNumista(t,issue),false); c.ns=nsInfo(t,issues);
    c.updatedAt=new Date().toISOString(); await dbPut("coins",c); await reload(); drawTop();
    toast(JSON.stringify(c)!==before?"Updated from Numista — your own edits were kept":"Already up to date");
  }catch(e){ toast(e.message||String(e)); }
}

/* ================= sheets: a small stack so the phone's Back button works ================= */
function openView(d){ const sh=$("#sheet"); if(S.stack.length){ S.stack[S.stack.length-1].scroll=sh.scrollTop; } else { history.pushState({mm:1},""); } S.stack.push(d); drawTop(true); }
function replaceView(d){ S.stack[S.stack.length-1]=d; drawTop(true); }
async function popView(){ const d=S.stack.pop(); await cleanupView(d); if(!S.stack.length){ S._ignorePop=true; history.back(); } drawTop(); }
async function cleanupView(d){ if(d&&d.kind==="edit"&&!d.saved&&d.newFiles){ for(const f of d.newFiles) await dbDel("files",f); } }
window.addEventListener("popstate",async()=>{
  if(S._ignorePop){ S._ignorePop=false; return; }
  const z=$("#zoom"); if(z){ z.remove(); history.pushState({mm:1},""); return; }
  if(S.stack.length){ const d=S.stack.pop(); await cleanupView(d); if(S.stack.length) history.pushState({mm:1},""); drawTop(); }
});
function drawTop(fresh){
  const sh=$("#sheet"), d=S.stack[S.stack.length-1];
  if(!d){ sh.hidden=true; sh.innerHTML=""; document.body.style.overflow=""; render(); return; }
  const keep=fresh?0:(d.scroll!=null?d.scroll:sh.scrollTop);
  sh.innerHTML=d.kind==="detail"?detailHTML(d):d.kind==="edit"?editHTML(d):d.kind==="add"?addHTML(d):d.kind==="filters"?filtersHTML(d):d.kind==="album"?albumHTML(d):d.kind==="tlist"?tlistHTML(d):d.kind==="nsfind"?nsfindHTML(d):"";
  sh.hidden=false; document.body.style.overflow="hidden"; sh.scrollTop=keep; d.scroll=null; hydrateImages(sh);
  sh.querySelectorAll(".pick.scroll").forEach(row=>{ const on=row.querySelector('[aria-pressed="true"]'); if(on) row.scrollLeft=Math.max(0,on.offsetLeft-row.clientWidth/2+on.offsetWidth/2); });
  if(d.kind==="add"&&fresh){ const i=$("#nsq"); if(i&&!d.results) setTimeout(()=>i.focus(),60); }
}
const topV=()=>S.stack[S.stack.length-1];
const backBtn=(label)=>`<button type="button" class="back" data-back><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg>${esc(label||"Back")}</button>`;

/* ---------- coin record ---------- */
function photoOrder(c){ const ph=(c.photos||[]).slice(); const cv=coverOf(c); ph.sort((a,b)=>(b===cv)-(a===cv)||(b.mine-a.mine)); return ph; }
function kv(label,val){ return blank(val)||val===false?"":`<div class="kv"><span>${esc(label)}</span><span>${val===true?"Yes":esc(val)}</span></div>`; }
function kvH(label,html){ return html?`<div class="kv"><span>${esc(label)}</span><span>${html}</span></div>`:""; }
function cardH(title,bg,icon,body,extra){ return body.trim()?`<section class="card"><h3><span class="ico" style="background:${bg}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg></span>${esc(title)}<span class="sp"></span>${extra||""}</h3>${body}</section>`:""; }
function detailHTML(d){
  const c=S.coins.find(x=>x.id===d.id); if(!c) return `<div class="shead"><div class="wrap">${backBtn()}</div></div>`;
  const t=themeOf(c), ph=photoOrder(c); if(d.sel==null||d.sel>=ph.length) d.sel=0; const p=ph[d.sel], cv=coverOf(c);
  const todo=todoOf(c), pa=priceAUD(c);
  const stage=p?`<div class="stage ${p.mine?"mine":"ref"}">${imgTag(p,'data-zoom')}${p.mine?`<span class="mybadge"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>MY COIN · ${esc(p.side||"")}</span>`:`<span class="sidetag">${esc(p.side||"")}</span><div class="refbanner">REFERENCE · ${esc(p.source||"Other")} — not your coin</div>`}
      <button type="button" class="coverbtn" data-cover="${esc(p.id)}" aria-pressed="${p===cv}"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="${p===cv?"#111827":"none"}" stroke="#111827" stroke-width="2" stroke-linejoin="round"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>${p===cv?"Cover photo":"Make cover"}</button></div>`
    :`<div class="stage" style="flex-direction:column;gap:10px"><div class="face" style="--face:150px;width:150px;height:150px">${drawnCoin(c)}</div><span class="muted small">No photos yet</span></div>`;
  const thumbs=`<div class="thumbs">${ph.map((q,i)=>`<div class="th ${q.mine?"mine":"ref"} ${i===d.sel?"sel":""}"><button type="button" data-sel="${i}" aria-label="${q.mine?"My photo":"Reference photo"}, ${esc(q.side||"")}">${imgTag(q)}${q.mine?"":`<span class="rb">REF · ${esc(shortSrc(q.source))}</span>`}</button>${q===cv?`<span class="star" aria-label="Cover photo"><svg width="12" height="12" viewBox="0 0 24 24" fill="#111827"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg></span>`:""}</div>`).join("")}<button type="button" class="addph" data-addphoto="${c.id}" aria-label="Add photos"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button></div>`;
  const ns=c.ns;
  const issues=ns&&(ns.issues||[]).length>1?ns.issues:null;
  return `<div class="shead"><div class="wrap">${backBtn("Back")}<span style="flex:1"></span>${S.readOnly?"":`<button type="button" class="btn sm light" data-edit="${c.id}">Edit</button>`}</div></div>
  <div class="dhero"><div class="wrap">
    <div class="row" style="gap:6px">${c.denom?`<span class="pill" style="background:${t.solid};color:#fff">${esc(c.denom)}</span>`:""}${gradeText(c)?`<span class="pill" style="${gradeStyle(c.grade)}">${esc(gradeText(c))}</span>`:""}${c.colourised?`<span class="pill" style="background:#FDE68A;color:#78350F">Coloured</span>`:""}${c.isSet?`<span class="pill" style="background:#E0E7FF;color:#3730A3">Set${c.setCount?" of "+esc(c.setCount):""}</span>`:""}${qtyOf(c)>1?`<span class="pill" style="background:#fff;color:#111827">×${qtyOf(c)}</span>`:""}${!isOwned(c)?`<span class="pill" style="background:#FEE2E2;color:#991B1B">${esc(c.status)}</span>`:""}</div>
    <h1>${esc(titleOf(c))}</h1><div class="sub">${esc([c.country||"",collOf(c),c.mint&&c.mint!=="None"?"Mint mark "+c.mint:c.mint==="None"?"No mint mark":""].filter(Boolean).join(" · "))}</div></div></div>
  <div class="wrap sbody">
    ${todo.length&&!S.readOnly?`<div class="todo"><span><b>To finish:</b> ${esc(todo.join(", "))}</span><button type="button" class="btn sm" data-edit="${c.id}">Add</button></div>`:""}
    <section class="card" style="padding:14px">${stage}${thumbs}<p class="m0 muted small">Tap a photo to view it; tap the big photo to zoom. The star picks the photo shown in your coin list.</p></section>
    ${c.storage?`<div class="todo" style="background:#EDE9FE"><span class="ico" style="background:#7C3AED"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg></span><span><b>Kept in:</b> ${esc(c.storage)}</span></div>`:""}
    ${cardH("Identity","#4338CA",'<circle cx="12" cy="12" r="8"/><path d="M9 12h6"/>',kv("Denomination",c.denom)+kv("Year",c.year)+kv("Mint / privy mark",c.mint)+kv("Theme / series",c.series)+kv("Country",c.country)+kv("Variety / error",c.variety)+(c.isSet?kv("Coins in set",c.setCount)+kv("Set contents",c.setContents):""))}
    ${cardH("Design","#DB2777",'<path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z"/>',kv("Effigy",c.effigy)+kv("Reverse designer",c.reverseDesigner)+(c.colourised!=null?kv("Colourised",c.colourised?"Yes":"No"):""))}
    ${cardH("Condition","#2563EB",'<path d="M4 18h16M7 14l3-4 3 3 4-6"/>',kvH("Grade",gradeText(c)?`<span class="grade" style="${gradeStyle(c.grade)}">${esc(gradeText(c))}${GRADE_NAMES[c.grade]?" · "+esc(GRADE_NAMES[c.grade]):""}</span>`:"")+kv("Finish",c.finish)+kv("Packaging",c.packaging)+kv("Serial / certificate no.",c.serial))}
    ${cardH("Specifications","#0D9488",'<path d="M12 3v18M3 12h18"/>',kv("Composition",c.composition)+kv("Mass",unit(c.mass,"g"))+kv("Diameter",unit(c.diameter,"mm"))+kv("Thickness",unit(c.thickness,"mm"))+kv("Edge",c.edge)+kvH("Mintage",blank(c.mintage)?"":`${esc(fmtNum(c.mintage))}${+c.mintage&&+c.mintage<=50000?` <span class="grade" style="background:#FEF3C7;color:#92400E">Low mintage</span>`:""}`)+(!ns&&nsKey()&&!S.readOnly?`<div class="nsbar"><span>Not linked to Numista yet</span><button type="button" class="btn sm" style="background:#0D9488;border-color:#0D9488;color:#fff" data-nsfind="${c.id}">Find in Numista</button></div>`:"")+(ns?`<div class="nsbar"><span>Catalogue data provided by Numista · <a href="${esc(ns.url)}" target="_blank" rel="noopener">N# ${esc(ns.id)}</a>${ns.refs?" · "+esc(ns.refs):""}</span>${nsKey()&&!S.readOnly?`<button type="button" class="btn sm" style="background:#0D9488;border-color:#0D9488;color:#fff" data-nsrefresh="${c.id}">Refresh</button>`:""}</div>`:""))}
    ${cardH("Ownership","#D97706",'<path d="M4 7h16v12H4z"/><path d="M4 11h16"/>',kv("Quantity",qtyOf(c)>1?String(qtyOf(c)):"")+kv("How acquired",c.acqHow)+kv("Date acquired",fmtDate(c.acqDate))+kv("Source",c.source)+kv("Price paid (each)",blank(c.price)?"":(curOf(c.priceCur)==="AUD"?aud(c.price):`${fmtMoney(c.price,c.priceCur)}${pa!=null?" ("+aud(pa)+")":" (AUD pending)"}`))+kvH("Current value (each)",blank(c.value)?"":`${esc(aud(c.value))}${pa!=null&&+c.value!==pa?` <span class="grade" style="${+c.value>=pa?"background:#DCFCE7;color:#166534":"background:#FEE2E2;color:#991B1B"}">${+c.value>=pa?"+":"−"}${esc(aud(Math.abs(+c.value-pa)))}</span>`:""}${c.valueDate?`<br><span class="muted small">as at ${esc(fmtDate(c.valueDate))}</span>`:""}`)+kv("Status",isOwned(c)?"":c.status))}
    ${issues?`<section class="card"><h3><span class="ico" style="background:#0F766E"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg></span>All years of this type<span class="sp"></span><span class="muted small">${issues.filter(i=>ownsIssue(ns.id,i)).length}/${issues.length}</span></h3><div class="chips wrapy" style="padding-bottom:14px">${issues.map(i=>{ const o=ownsIssue(ns.id,i); return `<span class="chip" style="${o?"background:#DDF5F2;border-color:#0D9488;color:#115E59":""}">${o?"✓ ":""}${esc(i.year)}${i.mint?" "+esc(i.mint):""}${i.mintage?` <span class="muted" style="font-weight:600">· ${esc(fmtNum(i.mintage))}</span>`:""}</span>`; }).join("")}</div></section>`:""}
    ${c.history?`<section class="card"><h3><span class="ico" style="background:#7C3AED"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 4h11l3 3v13H5z"/><path d="M9 10h6M9 14h6"/></svg></span>Historical context</h3><p class="story">${esc(c.history)}</p></section>`:""}
    ${c.notes?`<section class="card"><h3><span class="ico" style="background:#475569"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></span>Notes</h3><p class="story">${esc(c.notes)}</p></section>`:""}
    ${S.readOnly?"":`<div class="row" style="justify-content:center;margin-top:6px"><button type="button" class="btn" data-dup="${c.id}">Duplicate as new</button><button type="button" class="btn" data-sold="${c.id}">${isOwned(c)?"Mark as sold":"Back in collection"}</button><button type="button" class="btn danger" data-delcoin="${c.id}">${d.confirmDel?"Tap again to delete":"Delete"}</button></div>`}
    <p class="muted small" style="text-align:center;margin:0">Added ${fmtDate((c.addedAt||"").slice(0,10))||"—"}${c.updatedAt?` · updated ${fmtWhen(c.updatedAt)}`:""}</p>
  </div>`;
}
const shortSrc=s=>({"Royal Australian Mint":"RAM","Perth Mint":"Perth"}[s]||s||"Other");

/* ---------- add: Numista search / manual / copy ---------- */
function nsSearchBlock(d){ return `<form id="nsForm" class="searchbar" style="border:2px solid #4338CA"><label class="sr" for="nsq">Search Numista</label><input id="nsq" type="search" enterkeyhint="search" autocomplete="off" placeholder="e.g. 2022 2 dollars honey bee" value="${esc(d.q||"")}"><button class="btn sm primary" type="submit">Search</button></form>
      <label class="check-inline"><input type="checkbox" id="nsAus" ${nsSet().ausOnly!==false?"checked":""}><span>Australian coins only</span></label>
      ${d.busy?`<p class="muted m0">${esc(d.busy)}</p>`:""}${d.err?`<p class="warnTxt m0">${esc(d.err)}</p>`:""}${d.tried&&!d.busy&&!d.issues?`<p class="muted small m0">No exact match — showing results for "${esc(d.tried)}".</p>`:""}
      ${d.issues?issuePicker(d):d.results?(d.results.length?`<div class="listbox">${d.results.map(r=>`<button type="button" class="nsres" data-nspick="${r.id}">${r.obverse_thumbnail?`<img src="${esc(r.obverse_thumbnail)}" alt="" referrerpolicy="no-referrer">`:`<span class="face" style="--face:48px;width:48px;height:48px"><span class="coin m-silver">?</span></span>`}<span class="tx"><b>${esc(r.title)}</b><span>${esc([r.issuer&&r.issuer.name,r.min_year===r.max_year?r.min_year:`${r.min_year||"?"}–${r.max_year||"?"}`,"N# "+r.id].filter(Boolean).join(" · "))}</span></span></button>`).join("")}<p class="m0 muted small" style="padding:8px 14px">Source: Numista</p></div>`:`<p class="muted m0">Nothing found — try fewer words, e.g. "2 dollars 2022".</p>`):`<p class="muted small m0">Tip: type the year, value and a word from the design. Picking a match fills in the specifications and reference photos.</p>`}`
; }
const NS_SETUP=`<div class="panel"><p class="m0">Add your free Numista API key and MyMint fills in composition, mass, diameter, mintage, designers and reference photos for you.</p><button type="button" class="btn primary" data-more-go="numista">Set up Numista</button></div>`;
function addHTML(d){
  const key=nsKey();
  return `<div class="shead"><div class="wrap">${backBtn("Cancel")}<h2>Add a coin</h2></div></div>
  <div class="wrap sbody">
    <div class="step"><i style="background:#4338CA">1</i><h2>Find it in the Numista catalogue</h2></div>
    ${key?nsSearchBlock(d):NS_SETUP}
    <div class="step" style="margin-top:6px"><i style="background:#D97706">2</i><h2>Or start another way</h2></div>
    <div class="row"><button type="button" class="btn" data-manual>Enter manually</button><button type="button" class="btn" data-copyfrom>${d.copy?"Hide":"Copy an existing coin"}</button></div>
    ${d.copy?`<div class="field"><label for="cpq">Find the coin to copy</label><input id="cpq" type="search" value="${esc(d.cq||"")}" placeholder="e.g. 2021 $2"></div><div class="listbox" id="cpList">${copyList(d.cq||"")}</div>`:""}
  </div>`;
}
function nsfindHTML(d){
  const c=d.target.draft;
  return `<div class="shead"><div class="wrap">${backBtn("Back")}<h2>Find in Numista</h2></div></div>
  <div class="wrap sbody">
    <div class="todo" style="background:#DDF5F2"><span><b>${esc(titleOf(c))}</b><br><span class="muted">Pick the matching coin. Only empty details are filled in — anything you've entered is kept.</span></span></div>
    ${nsKey()?nsSearchBlock(d):NS_SETUP}
  </div>`;
}
function nsQueryFor(c){
  const dq=c.denom?(c.denom.match(/^\$(\d+)/)?`${RegExp.$1} dollar${RegExp.$1==="1"?"":"s"}`:c.denom.match(/^(\d+)c$/)?`${RegExp.$1} cents`:c.denom):"";
  let words=c.series||titleOf(c);
  words=words.replace(/\b(19|20)\d\d(\s*[-–]\s*(19|20)\d\d)?\b/g," ").replace(/\$\d+|\b\d+c\b/gi," ").replace(/\b(uncirculated|circulating|circulated|coloured|colour|color|coin|coins|card|ram|dcpl|on|in|the|of|and|al-br|frosted|silver|set|collection|privy|mark|four|seven|\d+-coin|volume|1|anniversary|australian|australia|end|50th|centenary|commemorative)\b/gi," ").replace(/[–\-:()]/g," ").replace(/\s+/g," ").trim();
  return [yearNum(c)||"",dq,words].filter(Boolean).join(" ");
}
async function nsLink(d,issue){
  const t=d.type, tgt=d.target, c=tgt.draft; d.busy="Filling in details and reference photos…"; d.issues=null; drawTop();
  applyNs(c,fromNumista(t,issue),false); c.ns=nsInfo(t,d.typeIssues);
  if(!(c.photos||[]).some(p=>!p.mine&&p.source==="Numista")){ c.photos=c.photos||[];
    for(const [side,obj] of [["Obverse",t.obverse],["Reverse",t.reverse]]){ const pic=obj&&(obj.picture||obj.thumbnail); if(!pic) continue; const r=await nsImage(pic); if(!r) continue; if(!r.url) tgt.newFiles.push(r.id); c.photos.push({id:r.id,url:r.url,mine:false,side,source:"Numista",link:c.ns.url}); } }
  d.busy=""; await popView(); toast("Filled from Numista — check the details, then Save");
}
function copyList(q){ const l=sorted(S.coins.filter(c=>matchQuery(c,q)).slice()).slice(0,40); return l.length?l.map(c=>`<button type="button" class="lrow" data-copy="${c.id}">${faceHTML(c)}<span class="tx"><span class="t1">${esc(titleOf(c))}</span><span class="t2">Copies the coin details, not the photos or purchase</span></span></button>`).join(""):`<p class="muted small" style="padding:12px">No coins match.</p>`; }
function issuePicker(d){ return `<div class="panel"><h3>${esc(d.type.title)}</h3><p class="m0 muted small">Which year and mint mark is yours?</p><div class="pick">${d.issues.map((i,k)=>`<button type="button" data-issue="${k}">${esc(i.year!=null?i.year:i.gregorian_year)}${i.mint_letter?" "+esc(i.mint_letter):""}${i.mintage?` <span style="font-weight:500;opacity:.8">· ${esc(fmtNum(i.mintage))}</span>`:""}</button>`).join("")}</div><button type="button" class="btn ghost" data-issue="-1">Not sure — choose later</button></div>`; }
function nsAttempts(q){
  const yrs=(q.match(/\b(19|20)\d\d\b/g)||[]); const noY=q.replace(/\b(19|20)\d\d\b/g," ").replace(/\s+/g," ").trim();
  const dm=noY.match(/^\d+\s+(dollars?|cents?)\b/i); const dq=dm?dm[0]:""; const words=(dm?noY.slice(dm[0].length):noY).trim().split(" ").filter(w=>w.length>2);
  const longest=words.slice().sort((a,b)=>b.length-a.length)[0]||"";
  const list=[q,noY,[dq,...words.slice(-2)].join(" ").trim(),[dq,longest].join(" ").trim(),words.slice(-2).join(" "),longest];
  return {list:[...new Set(list.map(x=>x.trim()).filter(Boolean))],year:yrs[0]?+yrs[0]:null};
}
async function nsAusCode(){
  if(S.meta.nsAus!==undefined) return S.meta.nsAus;
  let code=null;
  try{ const j=await nsFetch(`/issuers`); const list=asList(j.issuers?j.issuers:j); const hit=list.find(i=>/^australia$/i.test((i.name||"").trim()))||list.find(i=>/^australia\b/i.test((i.name||"").trim())&&!/state|colony|territor|antarctic/i.test(i.name||"")); code=hit?hit.code:null; }catch(e){ if(/key|limit|connection|reach/i.test(e.message)) throw e; }
  S.meta.nsAus=code; saveMeta().catch(()=>{}); return code;
}
async function nsQuery(q,aus){
  let list=null;
  const code=aus?await nsAusCode():null;
  if(code){ try{ list=(await nsFetch(`/types?q=${encodeURIComponent(q)}&category=coin&count=50&issuer=${encodeURIComponent(code)}`)).types||[]; }catch(e){ if(/key|limit|connection|reach/i.test(e.message)) throw e; if(e.status===400){ S.meta.nsAus=null; saveMeta().catch(()=>{}); } list=null; } }
  if(!list||!list.length){ list=(await nsFetch(`/types?q=${encodeURIComponent(q)}&category=coin&count=50`)).types||[]; if(aus){ const au=list.filter(r=>/australia/i.test((r.issuer&&r.issuer.name)||"")); list=au; } }
  return list;
}
async function nsSearch(d){
  const q=(d.q||"").trim(); if(!q) return; d.busy="Searching Numista…"; d.err=""; d.issues=null; d.tried=null; drawTop();
  try{ const aus=nsSet().ausOnly!==false; const {list:tries,year}=nsAttempts(q); let res=[], used=q;
    for(const t of tries.slice(0,4)){ res=await nsQuery(t,aus); used=t; if(res.length) break; }
    if(year) res.sort((a,b)=>{ const ina=(a.min_year||0)<=year&&year<=(a.max_year||9999), inb=(b.min_year||0)<=year&&year<=(b.max_year||9999); return inb-ina; });
    d.results=res; if(used!==q&&res.length) d.tried=used; }
  catch(e){ d.err=e.message||String(e); d.results=null; }
  d.busy=""; if(topV()===d) drawTop();
}
async function nsPick(d,id){
  d.busy="Getting details from Numista…"; d.err=""; drawTop();
  try{ const t=await nsFetch(`/types/${id}`); let issues=[]; try{ issues=asList(await nsFetch(`/types/${id}/issues`)); }catch{}
    d.type=t; d.typeIssues=issues||[]; d.busy="";
    if(d.kind==="nsfind"&&(issues||[]).length){ const c=d.target.draft, y=String(yearNum(c)||""), m=(c.mint&&c.mint!=="None"&&c.mint!=="Privy mark")?c.mint:null;
      let hits=issues.filter(i=>String(i.year!=null?i.year:i.gregorian_year)===y); if(m) hits=hits.filter(i=>(i.mint_letter||"")===m); else if(c.mint==="None") hits=hits.filter(i=>!i.mint_letter);
      if(hits.length===1){ await nsLink(d,hits[0]); return; } }
    if((issues||[]).length>1){ d.issues=issues; drawTop(); return; }
    if(d.kind==="nsfind"){ await nsLink(d,(issues||[])[0]||null); return; }
    await nsBuild(d,(issues||[])[0]||null);
  }catch(e){ d.busy=""; d.err=e.message||String(e); drawTop(); }
}
async function nsBuild(d,issue){
  d.busy="Saving reference photos…"; d.issues=null; drawTop();
  const t=d.type, draft=blankCoin(); applyNs(draft,fromNumista(t,issue),true); draft.ns=nsInfo(t,d.typeIssues);
  const newFiles=[];
  for(const [side,obj] of [["Obverse",t.obverse],["Reverse",t.reverse]]){ const pic=obj&&(obj.picture||obj.thumbnail); if(!pic) continue; const r=await nsImage(pic); if(!r) continue; if(!r.url) newFiles.push(r.id); draft.photos.push({id:r.id,url:r.url,mine:false,side,source:"Numista",link:draft.ns.url}); }
  d.busy=""; replaceView({kind:"edit",id:null,draft,newFiles,removedFiles:[],fromNs:true});
}

/* ---------- edit form ---------- */
function blankCoin(){ return {country:"Australia",priceCur:"AUD",qty:1,status:"In collection",photos:[],acqDate:todayISO()}; }
function datalists(){ const vals=k=>[...new Set(S.coins.map(c=>c[k]).concat(S.wanted.map(w=>w[k])).filter(v=>!blank(v)))].sort();
  return ["series","effigy","reverseDesigner","source","storage","country","composition","edge"].map(k=>`<datalist id="dl_${k}">${vals(k).map(v=>`<option value="${esc(v)}">`).join("")}</datalist>`).join("")+`<datalist id="dl_mint">${MINTS.map(m=>`<option value="${m}">`).join("")}</datalist>`; }
function pick(field,opts,cur,labels,scroll){ return `<div class="pick ${scroll?"scroll":""}" role="group">${opts.map((o,i)=>`<button type="button" data-pk="${field}" data-pv="${esc(o)}" aria-pressed="${String(cur)===String(o)}">${esc(labels?labels[i]:o)}</button>`).join("")}</div>`; }
function inp(field,label,draft,o={}){ return `<div class="field ${o.full?"full":""}"><label for="f_${field}">${esc(label)}${o.hint?` <span class="hint">${esc(o.hint)}</span>`:""}</label>${o.area?`<textarea id="f_${field}" data-f="${field}" placeholder="${esc(o.ph||"")}">${esc(draft[field]||"")}</textarea>`:`<input id="f_${field}" data-f="${field}" value="${esc(draft[field]??"")}" ${o.list?`list="dl_${o.list}"`:""} ${o.num?`inputmode="${o.num}"`:""} ${o.type?`type="${o.type}"`:""} placeholder="${esc(o.ph||"")}" autocomplete="off">`}</div>`; }
function editHTML(d){
  const c=d.draft, isNew=!d.id, specN=["composition","mass","diameter","thickness","edge","mintage"].filter(k=>!blank(c[k])).length, desN=["effigy","reverseDesigner","variety"].filter(k=>!blank(c[k])).length;
  return `<div class="shead"><div class="wrap">${backBtn("Cancel")}<h2>${isNew?"New coin":"Edit coin"}</h2><button type="button" class="btn sm amber" data-save>Save</button></div></div>
  <div class="wrap sbody">${datalists()}
  ${c.ns?`<div class="nsbar" style="margin:0"><span>Linked to Numista · N# ${esc(c.ns.id)}. Check the details and add your own below.</span>${nsKey()?`<button type="button" class="btn sm" data-nsfind="edit">Change</button>`:""}</div>`:nsKey()?`<div class="nsbar" style="margin:0"><span>Not linked to Numista yet — find it to fill in specs, designers, mintage and reference photos.</span><button type="button" class="btn sm" style="background:#0D9488;border-color:#0D9488;color:#fff" data-nsfind="edit">Find in Numista</button></div>`:""}
  <section class="fsec"><h3><span class="ico" style="background:#4338CA"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="8"/></svg></span>The coin</h3>
    <div class="field"><span class="flabel">Denomination</span>${pick("denom",DENOMS.map(d=>d.k),c.denom,null,true)}</div>
    <div class="grid2">${inp("year","Year",c,{num:"numeric",ph:"e.g. 2022"})}${inp("mint","Mint / privy mark",c,{list:"mint",ph:"C, S, None…"})}</div>
    ${inp("series","Theme / series",c,{list:"series",ph:"e.g. Australian Dinosaurs",hint:"groups coins into albums"})}
    ${inp("title","Name",c,{ph:autoTitle(c)||"e.g. 2022 $2 Honey Bee",hint:"leave blank to use year, value and series"})}
    <div class="field"><span class="flabel">Coloured coin?</span>${pick("colourised",["yes","no"],c.colourised===true?"yes":c.colourised===false?"no":"",["Coloured","Not coloured"])}</div>
    <label class="check-inline"><input type="checkbox" id="f_isSet" ${c.isSet?"checked":""}><span>This is a set of several coins (e.g. a 4-coin collection)</span></label>
    <div class="grid2" id="setFields" ${c.isSet?"":"hidden"}>${inp("setCount","Coins in set",c,{num:"numeric"})}<div></div>${inp("setContents","What's in the set",c,{area:true,full:true,ph:"One coin per line"})}</div>
  </section>
  <section class="fsec"><h3><span class="ico" style="background:#2563EB"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 18h16M7 14l3-4 3 3 4-6"/></svg></span>Condition</h3>
    <div class="field"><span class="flabel">Grade</span>${pick("grade",GRADES,c.grade)}</div>
    <div class="grid2">${inp("sheldon","Sheldon number",c,{num:"numeric",ph:"1–70, optional"})}${inp("serial","Serial / certificate no.",c,{ph:"if it has one"})}</div>
    <div class="field"><span class="flabel">Finish</span>${pick("finish",FINISHES,c.finish)}</div>
    <div class="field"><span class="flabel">Packaging</span>${pick("packaging",PACKS,c.packaging)}</div>
  </section>
  <section class="fsec"><h3><span class="ico" style="background:#D97706"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 7h16v12H4z"/><path d="M4 11h16"/></svg></span>Ownership</h3>
    <div class="field"><span class="flabel">How you got it</span>${pick("acqHow",HOWS,c.acqHow)}</div>
    <div class="row" style="align-items:flex-end;gap:16px"><div class="field"><span class="flabel">Quantity</span><div class="stepper"><button type="button" data-qty="-1" aria-label="One fewer">−</button><input id="f_qty" data-f="qty" inputmode="numeric" value="${esc(c.qty||1)}" aria-label="Quantity"><button type="button" data-qty="1" aria-label="One more">+</button></div></div>
      <div class="field" style="flex:1">${`<label for="f_acqDate">Date acquired</label><input id="f_acqDate" data-f="acqDate" type="date" value="${esc(c.acqDate||"")}">`}</div></div>
    ${inp("source","Source",c,{list:"source",ph:"e.g. Royal Australian Mint, coin fair, change"})}
    <div class="field"><label for="f_price">Price paid (each)</label><div class="inrow"><input id="f_price" data-f="price" inputmode="decimal" value="${esc(c.price??"")}" placeholder="0.00" style="flex:1"><select id="f_priceCur" data-f="priceCur" style="width:96px" aria-label="Currency">${CURRENCIES.map(x=>`<option ${curOf(c.priceCur)===x?"selected":""}>${x}</option>`).join("")}</select></div><span class="hint" id="audNote">${curOf(c.priceCur)!=="AUD"?(c.priceAud!=null&&c.priceAud!==""?`About ${aud(c.priceAud)} — converted at the rate on the purchase date`:"Converted to AUD when you save (needs internet)"):""}</span></div>
    <div class="grid2">${inp("value","Current value (each, A$)",c,{num:"decimal",ph:"your estimate"})}<div class="field"><label for="f_valueDate">Value as at</label><input id="f_valueDate" data-f="valueDate" type="date" value="${esc(c.valueDate||"")}"></div></div>
    ${inp("storage","Storage location",c,{list:"storage",ph:"e.g. Safe, Album 1 page 3, Red box"})}
    ${isNew?"":`<div class="field"><span class="flabel">Status</span>${pick("status",STATUSES,c.status||"In collection")}</div>`}
  </section>
  <section class="fsec" id="phSec">${photosSec(d)}</section>
  <details class="fsec" ${specN?"":""}><summary><span class="ico" style="background:#0D9488"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 3v18M3 12h18"/></svg></span>Specifications<span class="sp"></span><span class="hint">${specN?specN+" filled":c.ns?"":"Numista fills these"}</span></summary>
    <div class="grid2">${inp("country","Country",c,{list:"country"})}<div class="field"><span class="flabel">Collection</span>${pick("collection",COLLS,c.collection||"",null)}</div>
    ${inp("composition","Composition",c,{list:"composition",full:true,ph:"e.g. Aluminium-bronze"})}${inp("mass","Mass (g)",c,{num:"decimal"})}${inp("diameter","Diameter (mm)",c,{num:"decimal"})}${inp("thickness","Thickness (mm)",c,{num:"decimal"})}${inp("mintage","Mintage",c,{num:"numeric"})}${inp("edge","Edge",c,{list:"edge",full:true,ph:"e.g. Reeded, Plain"})}</div></details>
  <details class="fsec"><summary><span class="ico" style="background:#DB2777"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z"/></svg></span>Design<span class="sp"></span><span class="hint">${desN?desN+" filled":""}</span></summary>
    ${inp("effigy","Effigy (portrait and designer)",c,{list:"effigy",ph:"e.g. Jody Clark 2019–2023"})}${inp("reverseDesigner","Reverse designer",c,{list:"reverseDesigner"})}${inp("variety","Variety / error",c,{ph:"if any"})}</details>
  <details class="fsec" ${c.history||c.notes?"":""}><summary><span class="ico" style="background:#7C3AED"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 4h11l3 3v13H5z"/></svg></span>Story &amp; notes<span class="sp"></span><span class="hint">${[c.history?"context":"",c.notes?"notes":""].filter(Boolean).join(", ")}</span></summary>
    ${inp("history","Historical context",c,{area:true,ph:"The background story of the coin"})}${inp("notes","Notes",c,{area:true,ph:"Your own remarks"})}</details>
  <details class="fsec"><summary><span class="ico" style="background:#475569"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></span>Catalogue link<span class="sp"></span><span class="hint">${c.ns?"N# "+esc(c.ns.id):""}</span></summary>
    ${nsKey()?`<button type="button" class="btn primary" data-nsfind="edit">Find in Numista</button><p class="m0 muted small">Or, if you already know its number:</p>`:""}<div class="field"><label for="f_nsid">Numista number (N#)</label><div class="inrow"><input id="f_nsid" inputmode="numeric" value="${esc(c.ns?c.ns.id:"")}" placeholder="e.g. 351234" style="flex:1">${nsKey()?`<button type="button" class="btn" data-nslink>Fill from Numista</button>`:""}</div><span class="hint">Fills empty fields only — anything you've typed is kept.</span></div></details>
  ${!isNew?"":`<p class="muted small m0" style="text-align:center">Only the denomination or a name is needed to save — you can add the rest later.</p>`}
  </div>
  <div class="savebar"><div class="wrap"><button type="button" class="btn" data-back>Cancel</button><button type="button" class="btn primary" data-save>Save coin</button></div></div>`;
}
function photosSec(d){
  const c=d.draft, ph=c.photos||[], cv=coverOf(c);
  return `<h3><span class="ico" style="background:#15803D"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></span>Photos<span class="sp" style="flex:1"></span><span class="muted small">${ph.length}</span></h3>
  <div class="row"><button type="button" class="btn primary" data-cam><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>Take photo</button><button type="button" class="btn" data-pickph>Choose from phone</button></div>
  <p class="m0 muted small">New photos are labelled <b style="color:var(--mine)">MY COIN</b> and take turns as obverse, reverse, then card. Switch a mint or catalogue picture to <b>Reference</b> and say where it's from.</p>
  ${ph.map((p,i)=>`<div class="phedit ${p.mine?"mine":"ref"}">${imgTag(p,'class="pimg"')}<div class="pc">
    <div class="whose" role="group" aria-label="Whose photo"><button type="button" data-whose="${i}:mine" class="${p.mine?"on-mine":""}" aria-pressed="${!!p.mine}">My coin</button><button type="button" data-whose="${i}:ref" class="${p.mine?"":"on-ref"}" aria-pressed="${!p.mine}">Reference</button></div>
    <select data-pside="${i}" aria-label="Side">${SIDES.map(s=>`<option ${p.side===s?"selected":""}>${s}</option>`).join("")}</select>
    ${p.mine?"":`<select data-psrc="${i}" aria-label="Source">${SOURCES.map(s=>`<option ${p.source===s?"selected":""}>${s}</option>`).join("")}</select><input data-plink="${i}" type="url" placeholder="Web link (optional)" value="${esc(p.link||"")}" aria-label="Web link">`}
    <div class="phbtns"><button type="button" class="btn sm ${p===cv?"amber":""}" data-pcover="${i}">${p===cv?"★ Cover":"☆ Make cover"}</button><button type="button" class="btn sm ghost" data-prm="${i}">Remove</button></div></div></div>`).join("")}`;
}
function drawPhotos(){ const d=topV(); const el=$("#phSec"); if(el){ el.innerHTML=photosSec(d); hydrateImages(el); } }
function readForm(){ const d=topV(); if(!d||d.kind!=="edit") return null; const c=d.draft;
  document.querySelectorAll("#sheet [data-f]").forEach(el=>{ c[el.dataset.f]=el.value; });
  const s=$("#f_isSet"); if(s) c.isSet=s.checked;
  return c; }
function nextSide(c){ const used=new Set((c.photos||[]).filter(p=>p.mine).map(p=>p.side)); return ["Obverse","Reverse","Card / packaging"].find(s=>!used.has(s))||"Other"; }
async function addPhotoFiles(files){
  const d=topV(); if(!d||d.kind!=="edit") return; readForm(); const c=d.draft; let n=0;
  toast(files.length>1?`Adding ${files.length} photos…`:"Adding photo…");
  for(const f of files){ try{ const blob=await resizeImage(f,1600); const id=uid("f"); await dbPut("files",{id,blob,type:"image/jpeg",name:id+".jpg"}); d.newFiles.push(id); c.photos.push({id,mine:true,side:nextSide(c)}); n++; }catch(e){ toast("A photo couldn't be read: "+(e.message||e)); } }
  if(!c.coverId){ const cv=c.photos.find(p=>p.mine&&p.side==="Obverse")||c.photos.find(p=>p.mine); if(cv) c.coverId=cv.id; }
  drawPhotos(); if(n) toast(n===1?"Photo added":`${n} photos added`);
}
function clean(c){
  for(const k of Object.keys(c)) if(typeof c[k]==="string") c[k]=c[k].trim();
  for(const k of ["price","value","priceAud"]) if(!blank(c[k])){ const n=Number(String(c[k]).replace(/[$,\s]/g,"")); c[k]=isNaN(n)?c[k]:n; }
  if(!blank(c.mintage)) c.mintage=String(c.mintage).replace(/[,\s]/g,"");
  c.qty=Math.max(1,parseInt(c.qty,10)||1);
  if(c.sheldon&&!/^\d{1,2}$/.test(c.sheldon)) c.sheldon="";
  if(!c.isSet){ delete c.isSet; delete c.setCount; delete c.setContents; }
  if(curOf(c.priceCur)==="AUD"){ delete c.priceAud; delete c.priceRate; }
  for(const k of Object.keys(c)) if(c[k]===""||c[k]==null) delete c[k];
  return c;
}
async function saveCoin(){
  const d=topV(); readForm(); const c=d.draft;
  const nsid=($("#f_nsid")||{}).value; if(nsid&&(!c.ns||String(c.ns.id)!==nsid.trim())&&/^\d+$/.test(nsid.trim())) c.ns={id:+nsid.trim(),url:`https://en.numista.com/${nsid.trim()}`};
  if(!c.denom&&blank(c.title)&&blank(c.series)){ toast("Pick a denomination or give it a name first"); return; }
  if(!blank(c.year)&&!/^\d{4}(\s*[-–]\s*\d{4})?$/.test(String(c.year).trim())){ toast("Year should look like 2022 (or 2020-2021)"); return; }
  clean(c);
  const prev=d.id?S.coins.find(x=>x.id===d.id):null;
  if(prev&&!blank(c.value)&&String(c.value)!==String(prev.value??"")&&!c.valueDate) c.valueDate=todayISO();
  if(!prev&&!blank(c.value)&&!c.valueDate) c.valueDate=todayISO();
  if(pendingConv(c)||(prev&&(prev.price!==c.price||prev.priceCur!==c.priceCur||prev.acqDate!==c.acqDate)&&curOf(c.priceCur)!=="AUD")){ delete c.priceAud; try{ await convertCoin(c); }catch{} }
  c.id=d.id||uid("c"); c.addedAt=c.addedAt||new Date().toISOString(); c.updatedAt=new Date().toISOString();
  if(c.photos&&c.coverId&&!c.photos.some(p=>p.id===c.coverId)) delete c.coverId;
  await dbPut("coins",c); d.saved=true;
  for(const f of (d.removedFiles||[])) await dbDel("files",f);
  if(d.fromWant){ const w=S.wanted.find(x=>x.id===d.fromWant); if(w){ await dbPut("wanted",{...w,got:true,gotAt:new Date().toISOString(),coinId:c.id}); } }
  await reload(); askPersist();
  if(d.id){ toast("Saved"); await popView(); }
  else { S.stack=[{kind:"detail",id:c.id}]; drawTop(true); toast("Coin added"); }
}
async function deleteCoin(id){ const c=S.coins.find(x=>x.id===id); for(const p of (c.photos||[])) if(!p.url){ const shared=S.coins.some(o=>o.id!==id&&(o.photos||[]).some(q=>q.id===p.id)); if(!shared) await dbDel("files",p.id); } await dbDel("coins",id); await reload(); toast("Coin deleted"); await popView(); }

/* ---------- filters sheet ---------- */
function fsel(id,label,opts,cur,anyLabel){ return `<div class="field"><label for="${id}">${esc(label)}</label><select id="${id}" data-ff="${id.slice(3)}"><option value="">${esc(anyLabel||"Any")}</option>${opts.map(o=>Array.isArray(o)?`<option value="${esc(o[0])}" ${cur===o[0]?"selected":""}>${esc(o[1])}</option>`:`<option ${cur===o?"selected":""}>${esc(o)}</option>`).join("")}</select></div>`; }
function filtersHTML(){
  const f=S.f, vals=k=>[...new Set(S.coins.map(c=>c[k]).filter(v=>!blank(v)))].sort((a,b)=>String(a).localeCompare(String(b)));
  const n=results().length;
  return `<div class="shead"><div class="wrap">${backBtn("Done")}<h2>Filters</h2><button type="button" class="btn sm" data-clearall>Clear all</button></div></div>
  <div class="wrap sbody">
   <section class="fsec"><h3>Denomination</h3><div class="pick">${GRP_ORDER.filter(g=>S.coins.some(c=>grpOf(c)===g)).map(g=>`<button type="button" data-grp="${g}" aria-pressed="${f.grp.includes(g)}">${GROUPS[g].label}</button>`).join("")}</div>
     ${fsel("ff_denom","Exact value",DENOMS.filter(d=>S.coins.some(c=>c.denom===d.k)).map(d=>d.k),f.denom)}</section>
   <section class="fsec"><h3>Year</h3><div class="grid2"><div class="field"><label for="ff_yFrom">From</label><input id="ff_yFrom" data-ff="yFrom" inputmode="numeric" value="${esc(f.yFrom)}" placeholder="e.g. 1966"></div><div class="field"><label for="ff_yTo">To</label><input id="ff_yTo" data-ff="yTo" inputmode="numeric" value="${esc(f.yTo)}" placeholder="e.g. 2023"></div></div></section>
   <section class="fsec"><h3>About the coin</h3><div class="grid2">
     ${fsel("ff_series","Theme / series",vals("series"),f.series)}${fsel("ff_coll","Collection",COLLS,f.coll)}
     ${fsel("ff_mint","Mint / privy mark",vals("mint"),f.mint)}${fsel("ff_colour","Coloured",[["yes","Coloured"],["no","Not coloured"]],f.colour)}
     ${fsel("ff_grade","Grade",GRADES,f.grade)}${fsel("ff_finish","Finish",FINISHES,f.finish)}
     ${fsel("ff_pack","Packaging",PACKS,f.pack)}${fsel("ff_how","How acquired",HOWS,f.how)}</div>
     <label class="check-inline"><input type="checkbox" data-ffc="sets" ${f.sets?"checked":""}><span>Sets only</span></label></section>
   <section class="fsec"><h3>Finding it</h3><div class="grid2">${fsel("ff_storage","Storage location",vals("storage"),f.storage)}${fsel("ff_photos","Photos",[["mine","Has my photos"],["none","No photos of mine yet"]],f.photos)}</div>
     <label class="check-inline"><input type="checkbox" data-ffc="todo" ${f.todo?"checked":""}><span>Still needs details (to finish)</span></label>
     <label class="check-inline"><input type="checkbox" data-ffc="dupes" ${f.dupes?"checked":""}><span>Duplicates (quantity 2 or more)</span></label>
     ${fsel("ff_status","Show",[["all","All, including sold"],["sold","Sold / traded only"]],f.status==="owned"?"":f.status,"In my collection")}</section>
  </div>
  <div class="savebar"><div class="wrap"><button type="button" class="btn primary" data-back>Show ${n} coin${n===1?"":"s"}</button></div></div>`;
}
function updFilterCount(){ const b=document.querySelector("#sheet .savebar [data-back]"); if(b&&topV()&&topV().kind==="filters"){ const n=results().length; b.textContent=`Show ${n} coin${n===1?"":"s"}`; } }
/* ---------- album and year checklist sheets ---------- */
function albumHTML(d){
  const a=albumData().find(x=>x.key===d.key)||{key:d.key,coins:[],wants:[]}; const o=a.coins.length,w=a.wants.length;
  const coins=a.coins.slice().sort((x,y)=>(yearNum(x)||0)-(yearNum(y)||0)||titleOf(x).localeCompare(titleOf(y)));
  return `<div class="shead"><div class="wrap">${backBtn("Albums")}<h2>${esc(a.key)}</h2></div></div>
  <div class="wrap sbody">
    <div class="stats"><div class="stat" style="background:#DDF5F2"><b style="color:#115E59">${o}</b><span>Owned</span></div><div class="stat" style="background:#FFF4DB"><b style="color:#92400E">${w}</b><span>Wanted</span></div><div class="stat"><b>${o+w?Math.round(o/(o+w)*100)+"%":"—"}</b><span>Complete</span></div></div>
    ${w?progBar(o,0,o+w):""}
    <section class="card" style="padding:16px 8px 8px"><div class="slots">
      ${coins.map(c=>`<button type="button" class="slot" data-open="${c.id}"><span class="ring" style="background:${themeOf(c).tint}">${faceHTML(c).replace('class="face"','class="face" style="--face:52px;width:52px;height:52px"')}</span><b style="color:${themeOf(c).text}">${esc(c.year||"—")}</b><span>${esc(shortName(c).replace(a.key,"").replace(/^[\s–\-:,]+/,"").trim()||c.denom||"")}</span></button>`).join("")}
      ${a.wants.map(x=>`<button type="button" class="slot" data-wgot="${x.id}"><span class="empty-c want">Want</span><b>${esc(x.year||"—")}</b><span>${esc(x.title)}</span></button>`).join("")}
      <button type="button" class="slot" data-addwant="${esc(a.key)}"><span class="empty-c">+</span><b>Add</b><span>a want</span></button>
    </div></section>
    <p class="m0 muted small">Tap a coin to open it. Tap an amber "Want" when you get it — it becomes a coin record.</p>
  </div>`;
}
function tlistHTML(d){
  const t=typeLists().find(x=>String(x.id)===String(d.id)); if(!t) return `<div class="shead"><div class="wrap">${backBtn()}</div></div>`;
  const own=t.issues.filter(i=>ownsIssue(t.id,i)).length;
  return `<div class="shead"><div class="wrap">${backBtn("Albums")}<h2>${esc(t.title)}</h2></div></div>
  <div class="wrap sbody"><div class="stats"><div class="stat" style="background:#DDF5F2"><b style="color:#115E59">${own}</b><span>Owned</span></div><div class="stat"><b>${t.issues.length-own}</b><span>Missing</span></div><div class="stat"><b>${Math.round(own/t.issues.length*100)}%</b><span>Complete</span></div></div>${progBar(own,0,t.issues.length)}
  <section class="card" style="padding:16px 8px 8px"><div class="slots">${t.issues.map(i=>{ const c=S.coins.find(c=>isOwned(c)&&c.ns&&String(c.ns.id)===String(t.id)&&String(yearNum(c))===String(i.year)&&((c.mint||"")===(i.mint||"")||(!i.mint&&c.mint==="None"))); return c?`<button type="button" class="slot" data-open="${c.id}"><span class="ring" style="background:#DDF5F2">${faceHTML(c).replace('class="face"','class="face" style="--face:52px;width:52px;height:52px"')}</span><b style="color:#115E59">${esc(i.year)}${i.mint?" "+esc(i.mint):""}</b><span>${i.mintage?esc(fmtNum(i.mintage)):""}</span></button>`:`<button type="button" class="slot" data-wantissue="${esc(t.id)}|${esc(i.year)}|${esc(i.mint||"")}"><span class="empty-c">+</span><b>${esc(i.year)}${i.mint?" "+esc(i.mint):""}</b><span>${i.mintage?esc(fmtNum(i.mintage)):""}</span></button>`; }).join("")}</div></section>
  <p class="m0 muted small">Year and mint list from Numista. Tap a gap to put it on your want list.</p></div>`;
}

/* ================= Numista settings screen ================= */
function viewNumista(){ const s=nsSet();
  return `<section class="view">${backMore}<div class="panel"><h3>Numista lookups</h3>
  <p class="m0">With a free Numista API key, adding a coin can fill in its specifications, designers, mintage and reference photos for you. The key is kept in this app and its backups only — never in the public GitHub files.</p>
  <div class="field"><label for="nsKeyIn">Numista API key</label><input id="nsKeyIn" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(s.key||"")}" placeholder="paste your key here"></div>
  <label class="check-inline"><input type="checkbox" id="nsAusSet" ${s.ausOnly!==false?"checked":""}><span>Search Australian coins only by default</span></label>
  <div class="row"><button type="button" class="btn primary" data-nssave>Save key</button><button type="button" class="btn" data-nstest ${s.key?"":"disabled"}>Test it</button><span class="muted small" id="nsStat">${s.key?esc(nsUsage()):""}</span></div></div>
  <div class="panel"><h3>Getting a key (once, free)</h3><ol class="m0" style="padding-left:20px;display:flex;flex-direction:column;gap:6px">
    <li>Sign in (or join free) at <b>en.numista.com</b>.</li><li>Open <b>en.numista.com/api</b> and choose the <b>Free plan</b> (2,000 lookups a month).</li><li>Copy the API key it shows, paste it above and tap <b>Save key</b>.</li></ol>
    <p class="m0 muted small">Numista asks apps to show its N# numbers and say the data comes from Numista — MyMint does both.</p></div></section>`; }

/* ================= events ================= */
document.addEventListener("click",async e=>{
  const z=e.target.closest("#zoom"); if(z){ z.remove(); return; }
  const b=e.target.closest("button,a[data-dlbk],img[data-zoom]"); if(!b) return; const d=b.dataset;
  if("zoom" in d){ const el=document.createElement("div"); el.id="zoom"; el.innerHTML=`<img src="${b.src}" alt=""><button type="button" class="btn">Close</button>`; document.body.appendChild(el); return; }
  if("back" in d){ await popView(); return; }
  if(d.tab){ S.tab=d.tab; if(d.tab==="more") S.moreView=null; render(); scrollTo(0,0); return; }
  if("add" in d){ if(S.readOnly){ toast(RO_MSG); return; } openView({kind:"add"}); return; }
  if(d.open){ openView({kind:"detail",id:d.open}); return; }
  if(d.mode){ view().mode=d.mode; saveMeta(); render(); return; }
  if(d.size){ view().size=d.size; saveMeta(); render(); return; }
  if(d.grp){ const g=S.f.grp; S.f.grp=g.includes(d.grp)?g.filter(x=>x!==d.grp):[...g,d.grp]; if(topV()&&topV().kind==="filters"){ b.setAttribute("aria-pressed",String(S.f.grp.includes(d.grp))); updFilterCount(); return; } render(); return; }
  if(d.qf){ S.f[d.qf]=!S.f[d.qf]; render(); return; }
  if(d.unf){ clearFilter(d.unf); render(); return; }
  if("clearall" in d){ S.f=clone(FDEF); S.q=""; if(topV()&&topV().kind==="filters"){ drawTop(); return; } render(); return; }
  if("clearq" in d){ S.q=""; render(); $("#q").focus(); return; }
  if("filters" in d){ openView({kind:"filters"}); return; }
  if("showtodo" in d){ S.f=clone(FDEF); S.f.todo=true; S.tab="coins"; render(); scrollTo(0,0); return; }
  if(d.album){ openView({kind:"album",key:d.album}); return; }
  if(d.tlist){ openView({kind:"tlist",id:d.tlist}); return; }
  if(d.more!=null){ S.moreView=d.more||null; render(); scrollTo(0,0); if(d.more==="about") fillStoreInfo(); return; }
  if(d.moreGo){ while(S.stack.length){ const x=S.stack.pop(); await cleanupView(x); } if($("#sheet").hidden===false){ S._ignorePop=true; history.back(); } $("#sheet").hidden=true; document.body.style.overflow=""; S.tab="more"; S.moreView=d.moreGo; render(); scrollTo(0,0); return; }
  /* coin record */
  if(d.sel!=null){ const t=topV(); t.sel=+d.sel; drawTop(); return; }
  if(d.cover){ const c=clone(S.coins.find(x=>x.id===topV().id)); c.coverId=d.cover; c.updatedAt=new Date().toISOString(); await dbPut("coins",c); await reload(); topV().sel=0; drawTop(); toast("Cover photo set"); return; }
  if(d.edit){ const c=S.coins.find(x=>x.id===d.edit); openView({kind:"edit",id:c.id,draft:clone(c),newFiles:[],removedFiles:[]}); return; }
  if(d.addphoto){ const c=S.coins.find(x=>x.id===d.addphoto); openView({kind:"edit",id:c.id,draft:clone(c),newFiles:[],removedFiles:[]}); setTimeout(()=>{ const el=$("#phSec"); if(el) el.scrollIntoView({block:"start"}); },50); return; }
  if(d.dup){ const c=clone(S.coins.find(x=>x.id===d.dup)); for(const k of ["id","addedAt","updatedAt","photos","coverId","serial","price","priceAud","priceRate","acqDate","source","value","valueDate","notes","status","qty"]) delete c[k]; c.photos=[]; c.qty=1; c.acqDate=todayISO(); c.status="In collection"; openView({kind:"edit",id:null,draft:c,newFiles:[],removedFiles:[]}); toast("Copied — change what's different and Save"); return; }
  if(d.sold){ const c=clone(S.coins.find(x=>x.id===d.sold)); c.status=isOwned(c)?"Sold":"In collection"; c.updatedAt=new Date().toISOString(); await dbPut("coins",c); await reload(); drawTop(); toast(isOwned(c)?"Back in your collection":"Marked as sold"); return; }
  if(d.delcoin){ const t=topV(); if(!t.confirmDel){ t.confirmDel=true; drawTop(); return; } await deleteCoin(d.delcoin); return; }
  if(d.nsrefresh){ await nsRefresh(d.nsrefresh); return; }
  /* add */
  if("manual" in d){ replaceView({kind:"edit",id:null,draft:blankCoin(),newFiles:[],removedFiles:[]}); return; }
  if("copyfrom" in d){ const t=topV(); t.copy=!t.copy; drawTop(); return; }
  if(d.copy){ const c=clone(S.coins.find(x=>x.id===d.copy)); for(const k of ["id","addedAt","updatedAt","photos","coverId","serial","price","priceAud","priceRate","acqDate","source","value","valueDate","notes","status","qty","year","mintage"]) delete c[k]; c.photos=[]; c.qty=1; c.acqDate=todayISO(); c.status="In collection"; replaceView({kind:"edit",id:null,draft:c,newFiles:[],removedFiles:[]}); toast("Copied — fill in the year and what's different"); return; }
  if(d.nspick){ await nsPick(topV(),d.nspick); return; }
  if(d.issue!=null){ const t=topV(); const is=+d.issue<0?null:t.issues[+d.issue]; if(t.kind==="nsfind") await nsLink(t,is); else await nsBuild(t,is); return; }
  if(d.nsfind!=null){ if(d.nsfind==="edit"){ readForm(); const tg=topV(); const v={kind:"nsfind",target:tg,q:nsQueryFor(tg.draft)}; openView(v); if(nsKey()) nsSearch(v); return; }
    const c=S.coins.find(x=>x.id===d.nsfind); const ed={kind:"edit",id:c.id,draft:clone(c),newFiles:[],removedFiles:[]}; openView(ed); const v={kind:"nsfind",target:ed,q:nsQueryFor(ed.draft)}; openView(v); if(nsKey()) nsSearch(v); return; }
  /* edit form */
  if(d.pk){ const t=topV(); const c=t.draft; let v=d.pv; const on=b.getAttribute("aria-pressed")==="true";
    if(d.pk==="status"&&on) return;
    b.parentElement.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed","false"));
    if(on){ v=""; } else b.setAttribute("aria-pressed","true");
    if(d.pk==="colourised") c.colourised=v==="yes"?true:v==="no"?false:null; else c[d.pk]=v;
    if(d.pk==="denom"){ const ti=$("#f_title"); if(ti){ readForm(); ti.placeholder=autoTitle(c)||"e.g. 2022 $2 Honey Bee"; } if(!c.collection){} }
    return; }
  if(d.qty){ const i=$("#f_qty"); i.value=Math.max(1,(parseInt(i.value,10)||1)+(+d.qty)); return; }
  if("cam" in d){ $("#camIn").click(); return; }
  if("pickph" in d){ $("#phIn").click(); return; }
  if(d.whose){ readForm(); const [i,w]=d.whose.split(":"); const p=topV().draft.photos[+i]; p.mine=w==="mine"; if(!p.mine&&!p.source) p.source="Royal Australian Mint"; drawPhotos(); return; }
  if(d.pcover!=null){ readForm(); const c=topV().draft; c.coverId=c.photos[+d.pcover].id; drawPhotos(); return; }
  if(d.prm!=null){ readForm(); const t=topV(); const [p]=t.draft.photos.splice(+d.prm,1); if(!p.url){ if(t.newFiles.includes(p.id)){ t.newFiles=t.newFiles.filter(x=>x!==p.id); await dbDel("files",p.id); } else t.removedFiles.push(p.id); } if(t.draft.coverId===p.id) delete t.draft.coverId; drawPhotos(); return; }
  if("save" in d){ b.disabled=true; try{ await saveCoin(); }catch(err){ toast("Couldn't save: "+(err&&err.message||err)); } b.disabled=false; return; }
  if("nslink" in d){ const id=($("#f_nsid").value||"").trim(); if(!/^\d+$/.test(id)){ toast("Type the Numista number first"); return; } readForm(); const t=topV(); toast("Getting details from Numista…");
    try{ const ty=await nsFetch(`/types/${id}`); let issues=[]; try{ issues=asList(await nsFetch(`/types/${id}/issues`)); }catch{} const c=t.draft; const issue=issues.find(i=>String(i.year)===String(yearNum(c))&&(i.mint_letter||"")===((c.mint&&c.mint!=="None")?c.mint:""))||null; applyNs(c,fromNumista(ty,issue),false); c.ns=nsInfo(ty,issues);
      if(!(c.photos||[]).some(p=>!p.mine&&p.source==="Numista")) for(const [side,obj] of [["Obverse",ty.obverse],["Reverse",ty.reverse]]){ const pic=obj&&(obj.picture||obj.thumbnail); if(!pic) continue; const r=await nsImage(pic); if(!r) continue; if(!r.url) t.newFiles.push(r.id); c.photos.push({id:r.id,url:r.url,mine:false,side,source:"Numista",link:c.ns.url}); }
      drawTop(); toast("Filled from Numista — your own entries were kept"); }catch(err){ toast(err.message||String(err)); } return; }
  /* wants */
  if(d.wgot){ const w=S.wanted.find(x=>x.id===d.wgot); const draft=blankCoin(); draft.denom=w.denom||""; draft.year=w.year||""; draft.series=w.series||""; draft.title=w.title||""; openView({kind:"edit",id:null,draft,newFiles:[],removedFiles:[],fromWant:w.id}); return; }
  if(d.wdel){ await dbDel("wanted",d.wdel); await reload(); render(); toast("Removed from want list"); return; }
  if(d.addwant!=null){ const had=S.stack.length; while(S.stack.length){ const x=S.stack.pop(); await cleanupView(x); } if(had){ S._ignorePop=true; history.back(); } $("#sheet").hidden=true; document.body.style.overflow=""; S.tab="wants"; render(); scrollTo(0,0); const det=document.querySelector("details.fsec"); if(det) det.open=true; const sr=$("#w_series"); if(sr){ sr.value=d.addwant; $("#w_title").focus(); } return; }
  if(d.wantissue){ const [id,yr,mt]=d.wantissue.split("|"); const t=typeLists().find(x=>String(x.id)===id); const c0=t.coins[0]; await dbPut("wanted",{id:uid("w"),title:`${yr} ${c0.denom||""} ${t.title}${mt?" ("+mt+")":""}`.replace(/\s+/g," ").trim(),denom:c0.denom||"",year:yr,series:c0.series||"",got:false,addedAt:new Date().toISOString()}); await reload(); toast("Added to your want list"); drawTop(); return; }
  /* numista settings */
  if("nssave" in d){ const s={...nsSet(),key:$("#nsKeyIn").value.trim(),ausOnly:$("#nsAusSet").checked}; await dbPut("settings",s); await reload(); render(); toast(s.key?"Numista key saved":"Numista key removed"); return; }
  if("nstest" in d){ $("#nsStat").textContent="Testing…"; try{ const code=await nsAusCode(); const j=await nsFetch(`/types?q=${encodeURIComponent("2 dollars")}&category=coin&count=1${code?"&issuer="+encodeURIComponent(code):""}`); $("#nsStat").textContent=`Working ✓ — Numista found ${fmtNum(j.count||0)} ${code?"Australian ":""}matches for "2 dollars"${code?"":" (Australia filter not found — results are filtered in the app instead)"}. ${nsUsage()}`; }catch(err){ $("#nsStat").textContent=err.message||String(err); } return; }
  /* more */
  if("mkreport" in d){ S.rep.photos=$("#rPhotos").checked; S.rep.sold=$("#rSold").checked; S.rep.by=$("#rBy").value.trim(); b.disabled=true; try{ await makeReport(); }catch(err){ toast("Couldn't create the report: "+(err&&err.message||err)); } b.disabled=false; return; }
  if("copycsv" in d){ const ta=$("#csvText"); try{ await navigator.clipboard.writeText(ta.value); toast("CSV copied"); }catch{ ta.focus(); ta.select(); toast("Text selected — copy it from here"); } return; }
  if("backup" in d){ b.disabled=true; try{ await makeBackup(); }catch(err){ toast("Backup failed: "+(err&&err.message||err)); } b.disabled=false; return; }
  if("dlbk" in d){ setTimeout(markBackedUp,500); toast("Backup saved — check your Downloads"); return; }
  if("dbxconnect" in d){ b.disabled=true; try{ await dbxConnect(); }catch(err){ toast("Couldn't start Dropbox sign-in: "+(err.message||err)); } b.disabled=false; return; }
  if("dbxsync" in d){ await syncNow({manual:true}); return; }
  if("dbxcheck" in d){ await syncNow({check:true}); const v=S.meta.verify; if(v&&!S.meta.dbx.lastError) toast(v.fixed?`Checked: fixed ${v.fixed} item${v.fixed===1?"":"s"} in Dropbox`:`Checked: ${v.coins} coins and ${v.files} photos all match ✓`); return; }
  if("dbxsnap" in d){ b.disabled=true; try{ await maybeSnapshot(true); }catch(err){ toast("Snapshot failed: "+(err.message||err)); } b.disabled=false; return; }
  if("dbxtake" in d){ if(!b.dataset.sure){ b.dataset.sure="1"; b.textContent="Tap again to download and take over"; return; } b.disabled=true; try{ await dbxTakeOver(); }catch(err){ toast("Couldn't take over: "+(err.message||err)); b.disabled=false; } return; }
  if("dbxoff" in d){ if(!b.dataset.sure){ b.dataset.sure="1"; b.textContent="Tap again to disconnect"; return; } await dbxDisconnect(); return; }
  if("dbxlist" in d){ await dbxListBackups(); return; }
  if(d.dbxget){ b.disabled=true; b.textContent="Downloading…"; try{ const blob=await dbxDownload(d.dbxget); $("#dbxList").innerHTML=""; await readRestore(new File([blob],d.dbxget.split("/").pop(),{type:"application/zip"})); }catch(err){ toast("Download failed: "+(err.message||err)); b.disabled=false; b.textContent="Use this"; } return; }
  if("restore" in d){ $("#restoreIn").click(); return; }
  if("rsyes" in d){ b.disabled=true; try{ await doRestore(); }catch(err){ toast("Restore failed: "+(err&&err.message||err)); } return; }
  if("rsno" in d){ _restore=null; $("#rsConfirm").innerHTML=""; return; }
});
let _qT=null;
document.addEventListener("input",e=>{
  const el=e.target;
  if(el.id==="q"){ S.q=el.value; const cb=document.querySelector("[data-clearq]"); if(cb) cb.hidden=!S.q; clearTimeout(_qT); _qT=setTimeout(()=>{ const r=$("#results"); if(r){ r.innerHTML=resultsHTML(); hydrateImages(r); } },120); return; }
  if(el.id==="nsq"){ topV().q=el.value; return; }
  if(el.id==="cpq"){ const t=topV(); t.cq=el.value; const l=$("#cpList"); if(l){ l.innerHTML=copyList(el.value); hydrateImages(l); } return; }
  if(el.dataset.ff){ const k=el.dataset.ff; S.f[k]=el.value.trim(); updFilterCount(); return; }
  if(el.dataset.plink!=null){ topV().draft.photos[+el.dataset.plink].link=el.value; return; }
  if(["f_year","f_series"].includes(el.id)){ const c=readForm(); const ti=$("#f_title"); if(ti) ti.placeholder=autoTitle(c)||"e.g. 2022 $2 Honey Bee"; return; }
  if(el.id==="f_price"){ const c=readForm(); delete c.priceAud; const n=$("#audNote"); if(n&&curOf(c.priceCur)!=="AUD") n.textContent="Converted to AUD when you save (needs internet)"; return; }
});
document.addEventListener("change",async e=>{
  const el=e.target;
  if(el.id==="dbxWifi"){ await setDbx({wifiOnly:el.checked}); refreshDbxPanel(); return; }
  if(el.id==="sortSel"){ view().sort=el.value; saveMeta(); const r=$("#results"); r.innerHTML=resultsHTML(); hydrateImages(r); return; }
  if(el.id==="groupSel"){ view().group=el.value; saveMeta(); const r=$("#results"); r.innerHTML=resultsHTML(); hydrateImages(r); return; }
  if(el.dataset.ff){ const k=el.dataset.ff; if(k==="status") S.f.status=el.value||"owned"; else S.f[k]=el.value.trim(); updFilterCount(); return; }
  if(el.dataset.ffc){ S.f[el.dataset.ffc]=el.checked; updFilterCount(); return; }
  if(el.id==="f_isSet"){ $("#setFields").hidden=!el.checked; topV().draft.isSet=el.checked; return; }
  if(el.id==="f_priceCur"){ const c=readForm(); delete c.priceAud; const n=$("#audNote"); if(n) n.textContent=curOf(c.priceCur)!=="AUD"?"Converted to AUD when you save (needs internet)":""; return; }
  if(el.dataset.pside!=null){ readForm(); topV().draft.photos[+el.dataset.pside].side=el.value; return; }
  if(el.dataset.psrc!=null){ readForm(); topV().draft.photos[+el.dataset.psrc].source=el.value; drawPhotos(); return; }
  if(el.id==="nsAus"){ await dbPut("settings",{...nsSet(),ausOnly:el.checked}); await reload(); return; }
  if((el.id==="camIn"||el.id==="phIn")&&el.files.length){ const fs=[...el.files]; el.value=""; await addPhotoFiles(fs); return; }
  if(el.id==="restoreIn"&&el.files.length){ await readRestore(el.files[0]); el.value=""; return; }
});
document.addEventListener("submit",async e=>{
  e.preventDefault();
  if(e.target.id==="nsForm"){ const t=topV(); t.q=$("#nsq").value; $("#nsq").blur(); await nsSearch(t); return; }
  if(e.target.id==="wantForm"){ const fd=new FormData(e.target); const title=(fd.get("title")||"").trim(); if(!title) return; const tg=String(fd.get("target")||"").replace(/[$,\s]/g,"");
    await dbPut("wanted",{id:uid("w"),title,denom:fd.get("denom")||"",year:(fd.get("year")||"").trim(),series:(fd.get("series")||"").trim(),target:tg===""||isNaN(+tg)?null:+tg,notes:(fd.get("notes")||"").trim(),got:false,addedAt:new Date().toISOString()});
    await reload(); render(); toast("Added to want list"); }
});
document.addEventListener("keydown",e=>{ if(e.key==="Escape"){ const z=$("#zoom"); if(z){ z.remove(); return; } if(S.stack.length) popView(); } });
window.addEventListener("unhandledrejection",e=>{ if(e.reason&&e.reason.message===RO_MSG){ e.preventDefault(); toast(RO_MSG); } });

/* ================= boot ================= */
async function reload(){ [S.coins,S.wanted,S.settings]=await Promise.all(["coins","wanted","settings"].map(dbAll)); const m=await dbGet("meta","main"); S.meta=m?(({id,...r})=>r)(m):{}; view(); }
let _converting=false;
async function convertPending(){ if(S.readOnly||_converting||navigator.onLine===false) return; _converting=true; let n=0;
  try{ for(const c of S.coins.filter(pendingConv)){ const x=clone(c); if(await convertCoin(x)){ await dbPut("coins",x); n++; } } }finally{ _converting=false; }
  if(n){ await reload(); if(!S.stack.length) render(); toast(`${n} foreign-currency price${n===1?"":"s"} converted to AUD`); } }
(async()=>{
  try{ _dbP=openDB(); await _dbP; }catch(e){ $("#main").innerHTML=`<section class="view"><div class="empty">This browser can't store data for the app (private mode or storage blocked). Open it in normal Chrome.</div></section>`; return; }
  await reload();
  S.readOnly=!!S.meta.readOnly; if(!S.meta.deviceSince){ S.meta.deviceSince=todayStr(); await saveMeta(); } deviceId();
  render();
  await dbxFinish();
  convertPending();
  if(dbxOn()) scheduleSync(1500);
  document.addEventListener("visibilitychange",()=>{ if(!dbxOn()) return; if(document.visibilityState==="hidden"){ if(S.meta.changes) syncNow(); } else scheduleSync(1500); });
  window.addEventListener("pagehide",()=>{ if(dbxOn()&&S.meta.changes) syncNow(); });
  window.addEventListener("online",()=>{ convertPending(); if(dbxOn()) scheduleSync(2000); });
  if("serviceWorker" in navigator && location.protocol!=="file:"){ navigator.serviceWorker.register("sw.js").catch(()=>{}); }
})();
