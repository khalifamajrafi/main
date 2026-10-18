/* Core helpers: language, Oman time, working calendar, formatting and small UI pieces. */
window.P=(()=>{
 const H=3600000,D=86400000,OMAN=4*H,TZ='Asia/Muscat';
 let lang=(()=>{try{return localStorage.getItem('ictops.lang')||'en'}catch{return 'en'}})();
 const en=()=>lang==='en';
 const t=(ar,english)=>en()?english:ar;
 const L=pair=>Array.isArray(pair)?(en()?pair[1]:pair[0]):String(pair??'');
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const loc=()=>en()?'en-GB':'ar-OM';
 const num=(n,d=0)=>Number(n||0).toLocaleString(loc(),{minimumFractionDigits:d,maximumFractionDigits:d});
 const money=n=>n===''||n==null||isNaN(n)?'—':num(n,3)+' '+t('ر.ع','OMR');
 /* Oman calendar (UTC+4, no daylight saving) */
 const omanDay=(ms=Date.now())=>new Date(ms+OMAN).toISOString().slice(0,10);
 const dayStart=ymd=>Date.parse(ymd+'T00:00:00Z')-OMAN;
 const dayEnd=ymd=>dayStart(ymd)+D-1000;
 const addDays=(ymd,n)=>new Date(Date.parse(ymd+'T00:00:00Z')+n*D).toISOString().slice(0,10);
 const daysUntil=ymd=>ymd?Math.round((Date.parse(ymd+'T00:00:00Z')-Date.parse(omanDay()+'T00:00:00Z'))/D):null;
 function fmtDate(v,opt){if(!v)return '—';const ms=/^\d{4}-\d{2}-\d{2}$/.test(v)?Date.parse(v+'T12:00:00Z')-OMAN:Date.parse(v);if(!Number.isFinite(ms))return esc(v);return new Date(ms).toLocaleDateString(loc(),{day:'numeric',month:'short',year:'numeric',timeZone:TZ,...opt})}
 function fmtDateTime(v){if(!v)return '—';const ms=Date.parse(v);if(!Number.isFinite(ms))return esc(v);return new Date(ms).toLocaleString(loc(),{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:TZ})}
 function ago(v){const ms=Date.now()-Date.parse(v);if(!Number.isFinite(ms))return '';const m=Math.round(ms/60000);if(m<1)return t('الآن','just now');if(m<60)return t(`قبل ${num(m)} د`,`${m} min ago`);const h=Math.round(m/60);if(h<48)return t(`قبل ${num(h)} س`,`${h} h ago`);return fmtDate(v)}
 function dur(ms){const a=Math.abs(ms),d=Math.floor(a/D),h=Math.floor(a%D/H),m=Math.floor(a%H/60000),s=Math.floor(a%60000/1000),n2=v=>Number(v).toLocaleString(loc(),{minimumIntegerDigits:2});
  if(d>=2)return num(d)+t(' ي ','d ')+num(h)+t(' س','h');if(a>=H)return num(Math.floor(a/H))+t(' س ','h ')+n2(m)+t(' د','m');return n2(m)+t(' د ','m ')+n2(s)+t(' ث','s')}
 function short(ms){const a=Math.abs(ms);return a>=2*D?num(Math.floor(a/D))+t(' يوم',' d'):a>=H?num(Math.floor(a/H))+t(' س',' h'):num(Math.max(1,Math.floor(a/60000)))+t(' د',' min')}
 /* Working calendar: settings.workDays (0=Sunday), start/end "HH:MM", and holiday ranges */
 function calendar(){const s=Store.get('settings','main')||{};return {days:Array.isArray(s.workDays)?s.workDays:[0,1,2,3,4],start:s.workStart||'07:30',end:s.workEnd||'15:30',holidays:Store.all('holidays')}}
 const hm=v=>{const [h,m]=String(v).split(':').map(Number);return (h||0)*H+(m||0)*60000};
 function isWorkDay(ymd,cal=calendar()){const dow=new Date(ymd+'T12:00:00Z').getUTCDay();if(!cal.days.includes(dow))return false;return !cal.holidays.some(x=>x.start&&ymd>=x.start&&ymd<=(x.end||x.start))}
 function addWorking(startMs,minutes){const cal=calendar();let tms=startMs,left=minutes*60000;for(let i=0;i<800&&left>0;i++){const ymd=omanDay(tms),ds=dayStart(ymd);if(isWorkDay(ymd,cal)){const ws=ds+hm(cal.start),we=ds+hm(cal.end);if(tms<ws)tms=ws;if(tms<we){const avail=we-tms;if(left<=avail)return tms+left;left-=avail}}tms=ds+D}return tms}
 /* UI */
 function pill(text,tone=''){return `<span class="pill ${esc(tone)}">${esc(text)}</span>`}
 let toastTimer;function toast(msg,bad){let el=document.getElementById('toast');if(!el){el=document.createElement('div');el.id='toast';el.setAttribute('role','status');document.body.append(el)}el.className='toast'+(bad?' bad':'');el.textContent=msg;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,3200)}
 const initials=n=>String(n||'?').split(/[\s._@-]+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('');
 function member(email){if(!email)return null;return Store.all('members').find(m=>m.email===email)||null}
 function person(email){if(!email)return t('غير معيّن','Unassigned');const m=member(email);if(m?.name)return m.name;return String(email).split('@')[0].split(/[._-]+/).map(w=>w&&w[0].toUpperCase()+w.slice(1)).join(' ')}
 function csv(rows,cols,filename){const q=v=>{const s=String(v??'');return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};const text='﻿'+[cols.map(c=>q(c.l)).join(','),...rows.map(r=>cols.map(c=>q(c.v(r))).join(','))].join('\r\n');download(new Blob([text],{type:'text/csv;charset=utf-8'}),filename)}
 function download(blob,filename){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
 function barChart({labels,series,colors,height=210,stacked=false}){/* vertical bars, series=[[...]] */
  const W=640,Hh=height,pl=34,pr=8,pt=12,pb=28,n=labels.length,max=Math.max(4,...(stacked?labels.map((_,i)=>series.reduce((s,a)=>s+(a[i]||0),0)):series.flat())),step=max<=8?2:max<=20?5:max<=50?10:max<=100?20:Math.ceil(max/50)*10,top=Math.ceil(max/step)*step,bw=(W-pl-pr)/n,y=v=>pt+(Hh-pt-pb)*(1-v/top);
  let g='';for(let v=0;v<=top;v+=step)g+=`<line x1="${pl}" x2="${W-pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${pl-6}" y="${y(v)+4}" text-anchor="end" font-size="10" fill="var(--muted)" font-family="JetBrains Mono,monospace">${v}</text>`;
  let b='';labels.forEach((lb,i)=>{const x=pl+i*bw;if(stacked){let acc=0;series.forEach((s,k)=>{const v=s[i]||0;if(!v)return;b+=`<rect x="${x+bw*.2}" y="${y(acc+v)}" width="${bw*.6}" height="${y(acc)-y(acc+v)}" fill="${colors[k]}"><title>${esc(lb)}: ${v}</title></rect>`;acc+=v})}else{const k=series.length,w=bw*.7/k;series.forEach((s,j)=>{const v=s[i]||0;b+=`<rect x="${x+bw*.15+j*w}" y="${y(v)}" width="${w-1}" height="${y(0)-y(v)}" rx="2" fill="${colors[j]}"><title>${esc(lb)}: ${v}</title></rect>`})}});
  const every=Math.ceil(n/8);const xl=labels.map((lb,i)=>(i%every&&i!==n-1)||(i!==n-1&&n-1-i<every*.75)?'':`<text x="${pl+i*bw+bw/2}" y="${Hh-8}" text-anchor="middle" font-size="10" fill="var(--muted)">${esc(lb)}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${Hh}" role="img" style="direction:ltr">${g}${b}${xl}</svg>`}
 function donut(parts,size=120){/* parts=[[label,value,color]] */const total=parts.reduce((s,p)=>s+p[1],0)||1;let off=25,c='';for(const [lb,v,col] of parts){if(!v)continue;const pct=v/total*100;c+=`<circle cx="21" cy="21" r="15.9" fill="none" stroke="${col}" stroke-width="5.5" stroke-dasharray="${pct} ${100-pct}" stroke-dashoffset="${off}"><title>${esc(lb)}: ${v}</title></circle>`;off-=pct}
  return `<svg width="${size}" height="${size}" viewBox="0 0 42 42" role="img"><circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--surface-2)" stroke-width="5.5"/>${c}</svg>`}
 function legend(parts){return `<div class="legend" style="flex-direction:column;gap:4px">${parts.map(([lb,v,col])=>`<span><i style="background:${col}"></i>${esc(lb)} · <b class="mono">${num(v)}</b></span>`).join('')}</div>`}
 function bars(rows,max){max=max||Math.max(1,...rows.map(r=>r[1]));return rows.length?rows.map(([lb,v,tone])=>`<div class="barrow"><span title="${esc(lb)}">${esc(lb)}</span><div class="meter"><i class="${tone||''}" style="width:${Math.round(v/max*100)}%"></i></div><span class="n">${num(v)}</span></div>`).join(''):`<p class="empty">${t('لا توجد بيانات بعد.','No data yet.')}</p>`}
 function setLang(v){lang=v==='ar'?'ar':'en';try{localStorage.setItem('ictops.lang',lang)}catch{}document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr'}
 setLang(lang);
 /* Printing / Save as PDF: while the print dialog is open the page must not change, otherwise the browser
    rebuilds the print preview on every change and freezes. Live updates check P.printing. */
 let printing=false,printTimer=0;const printHooks=new Set();
 function setPrinting(v){if(printing===v)return;printing=v;document.documentElement.classList.toggle('printing',v);if(!v)printHooks.forEach(f=>{try{f()}catch(e){console.error(e)}})}
 window.addEventListener('beforeprint',()=>setPrinting(true));
 window.addEventListener('afterprint',()=>{clearTimeout(printTimer);printTimer=setTimeout(()=>setPrinting(false),300)});
 try{matchMedia('print').addEventListener('change',e=>{if(e.matches)setPrinting(true)})}catch{}
 /* Print a still copy of the current page in a hidden frame: no scripts, timers or sticky layout,
    so the print preview cannot freeze and the portal itself stays responsive. */
 function print(){
  const src=document.querySelector('#view')||document.querySelector('#empView')||document.querySelector('main')||document.body;
  const clone=src.cloneNode(true);
  clone.querySelectorAll('input,textarea,select').forEach((el,i)=>{const orig=src.querySelectorAll('input,textarea,select')[i];if(!orig)return;
   if(el.tagName==='SELECT'){const v=orig.value;el.querySelectorAll('option').forEach(o=>{if(o.value===v)o.setAttribute('selected','')})}
   else if(el.type==='checkbox'||el.type==='radio'){if(orig.checked)el.setAttribute('checked','')}
   else if(el.tagName==='TEXTAREA')el.textContent=orig.value;else el.setAttribute('value',orig.value)});
  clone.querySelectorAll('script,iframe,video,.wtools,.botfab,.botfabpanel').forEach(x=>x.remove());
  const css=[...document.querySelectorAll('link[rel=stylesheet]')].map(l=>`<link rel="stylesheet" href="${l.href}">`).join('');
  document.getElementById('printFrame')?.remove();
  const f=document.createElement('iframe');f.id='printFrame';f.setAttribute('aria-hidden','true');f.tabIndex=-1;
  f.style.cssText='position:fixed;inset-inline-end:0;bottom:0;width:1200px;height:800px;border:0;opacity:0;pointer-events:none;z-index:-1';
  document.body.append(f);
  const d=f.contentDocument,h=document.documentElement;
  d.open();d.write(`<!doctype html><html lang="${h.lang}" dir="${h.dir}" data-theme="light"><head><meta charset="utf-8"><title>${esc(document.title)}</title>${css}<style>body{background:#fff;margin:0}.printdoc{padding:12px 16px}.printdoc .grid{display:grid}.wdg{outline:0!important}</style></head><body><main class="content printdoc">${clone.innerHTML}</main></body></html>`);d.close();
  setPrinting(true);
  let done=false;const go=async()=>{if(done)return;done=true;try{await d.fonts?.ready}catch{}
   const w=f.contentWindow;const finish=()=>{setPrinting(false);setTimeout(()=>f.remove(),500)};
   w.addEventListener('afterprint',finish,{once:true});try{w.focus();w.print()}catch(e){console.error(e);window.print()}setTimeout(()=>{if(printing)finish()},60000)};
  const links=[...d.querySelectorAll('link[rel=stylesheet]')];let left=links.length;if(!left)setTimeout(go,50);
  links.forEach(l=>{const ok=()=>{if(--left<=0)setTimeout(go,50)};l.addEventListener('load',ok,{once:true});l.addEventListener('error',ok,{once:true})});
  setTimeout(go,3000);   // safety: print even if a stylesheet never reports loading
 }
 /* Ctrl+P / Cmd+P uses the same still copy. */
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&!e.altKey&&(e.key==='p'||e.key==='P')){e.preventDefault();print()}},true);
 return {print,get printing(){return printing},afterPrint:f=>printHooks.add(f),H,D,TZ,t,L,en,esc,num,money,omanDay,dayStart,dayEnd,addDays,daysUntil,fmtDate,fmtDateTime,ago,dur,short,calendar,isWorkDay,addWorking,pill,toast,initials,member,person,csv,download,barChart,donut,legend,bars,setLang,get lang(){return lang}};
})();
