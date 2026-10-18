/* Generic register page (list + filters + record drawer) used by every module. */
window.E=(()=>{
 const {t,L,esc,num,money,fmtDate,fmtDateTime,pill,person,toast}=P;
 const state={};
 const opts=f=>typeof f.opts==='function'?f.opts():f.opts||[];
 const isMemberField=f=>f.opts===M.members;
 const fieldOf=(def,k)=>def.fields.find(f=>f.k===k);
 const def0=f=>typeof f.def==='function'?f.def():f.def;
 const ro=(f,r)=>typeof f.ro==='function'?f.ro(r):!!f.ro;
 function display(f,v){
  if(!f)return esc(v??'');
  if(v===''||v==null)return f.t==='bool'?esc(M.yes(false)):f.opts===M.members?`<span class="muted">${esc(t('غير معيّن','Unassigned'))}</span>`:'<span class="muted">—</span>';
  switch(f.t){
   case 'select':if(isMemberField(f))return esc(person(v));{const tone=M.optTone(f.opts,v),hasTones=opts(f).some(o=>o[3]);return hasTones?pill(M.optLabel(f.opts,v),tone):esc(M.optLabel(f.opts,v))}
   case 'date':return `<span class="nowrap">${fmtDate(v)}</span>`;
   case 'datetime':return fmtDateTime(v);
   case 'money':return esc(money(v));
   case 'number':return esc(num(v,Number.isInteger(Number(v))?0:2));
   case 'bool':return v?pill(M.yes(true),'ok'):pill(M.yes(false),'');
   case 'days':return esc(num(Number(v)/480,Number(v)%480?1:0)+t(' يوم',' d'));
   default:return esc(v);
  }}
 function plain(f,v){if(!f)return v??'';if(v===''||v==null)return '';if(f.t==='select')return isMemberField(f)?person(v):M.optLabel(f.opts,v);if(f.t==='bool')return M.yes(v);if(f.t==='days')return Number(v)/480;return v}
 const lc=v=>String(v).split(' ').map(w=>/^[A-Z]{2,}/.test(w)?w:w.toLowerCase()).join(' ');
 const toLocalInput=v=>{const d=new Date(v);if(!v||isNaN(d))return '';const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`};
 const st=id=>state[id]||(state[id]={view:null,q:'',filters:{},sort:null,page:0});

 function rowsFor(def){
  const s=st(def.id),view=(def.views||[]).find(v=>v.id===s.view)||(def.views||[])[0];
  let rows=Store.all(def.coll).filter(r=>!view||view.f(r));
  for(const [k,v] of Object.entries(s.filters))if(v)rows=rows.filter(r=>String(r[k]??'')===v);
  if(s.q){const q=s.q.toLowerCase();rows=rows.filter(r=>String(def.search?def.search(r):JSON.stringify(r)).toLowerCase().includes(q))}
  if(s.sort){const c=def.cols.find(c=>(c.k||c)===s.sort.k),f=fieldOf(def,s.sort.k),val=c?.sort||(r=>{const v=r[s.sort.k];return f?.t==='number'||f?.t==='money'||f?.t==='days'?Number(v||0):String(plain(f,v)).toLowerCase()});rows=[...rows].sort((a,b)=>{const x=val(a),y=val(b);return (x>y?1:x<y?-1:0)*s.sort.dir})}
  else if(def.sort)rows=[...rows].sort(def.sort);
  else rows=[...rows].sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
  return rows;
 }
 function render(def,root){
  const s=st(def.id);if(!s.view&&def.views)s.view=def.views[0].id;
  const all=Store.all(def.coll),rows=rowsFor(def),per=50,pages=Math.max(1,Math.ceil(rows.length/per));if(s.page>=pages)s.page=pages-1;
  const canEdit=!def.editable||def.editable();
  const cols=def.cols.map(c=>typeof c==='string'?{k:c}:c);
  const kp=def.kpis?def.kpis(all):[];
  root.innerHTML=`
   <div class="pagehead"><div><h1>${esc(L(def.label))}</h1><p>${esc(L(def.desc))}</p></div>
    <div class="actions"><a class="btn ghost" href="#/reports/${def.id}">${t('تقرير','Report')}</a>${IO.buttons(def)}${canEdit?`<button class="btn" type="button" data-act="new">＋ ${esc(t('إضافة ','New ')+lc(L(def.one)))}</button>`:''}</div></div>
   ${kp.length?`<div class="kpis">${kp.map(k=>`<${k.view?'button type="button" data-view="'+esc(k.view)+'" aria-pressed="'+(s.view===k.view)+'"':'div'} class="kpi${k.alert?' alert':''}"><span class="lbl">${esc(L(k.l))}</span><span class="val">${typeof k.v==='number'?num(k.v):esc(k.v)}</span>${k.sub?`<span class="sub ${k.tone||''}">${esc(L(k.sub))}</span>`:''}</${k.view?'button':'div'}>`).join('')}</div>`:''}
   <section class="panel">
    <div class="toolbar">
     ${def.views?`<div class="chips" role="group" aria-label="${t('العرض','View')}">${def.views.map(v=>`<button class="chip" type="button" data-view="${esc(v.id)}" aria-pressed="${s.view===v.id}">${esc(L(v.l))}<span class="n">${num(all.filter(v.f).length)}</span></button>`).join('')}</div>`:''}
    </div>
    <div class="toolbar">
     <label class="search" for="q_${def.id}"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="q_${def.id}" placeholder="${esc(t('بحث في ','Search ')+lc(L(def.label)))}" value="${esc(s.q)}" autocomplete="off"></label>
     ${(def.filters||[]).map(k=>{const f=fieldOf(def,k);if(!f)return '';const values=f.t==='select'?opts(f).map(o=>[o[0],P.en()?o[2]:o[1]]):[...new Set(all.map(r=>r[k]).filter(Boolean))].sort().map(v=>[v,v]);return `<select id="flt_${def.id}_${k}" data-filter="${esc(k)}" aria-label="${esc(L(f.l))}"><option value="">${esc(t('كل ','All: ')+L(f.l))}</option>${values.map(([v,lb])=>`<option value="${esc(v)}" ${s.filters[k]===v?'selected':''}>${esc(lb)}</option>`).join('')}</select>`}).join('')}
     ${Object.values(s.filters).some(Boolean)||s.q?`<button class="linkbtn" type="button" data-act="clear">${t('مسح عوامل التصفية','Clear filters')}</button>`:''}
    </div>
    ${rows.length?`<div class="tablewrap"><table><thead><tr>${cols.map(c=>{const f=fieldOf(def,c.k),lb=c.l?L(c.l):f?L(f.l):c.k,on=s.sort?.k===c.k;return `<th class="${c.cls?.includes('num')?'num':''}"><button type="button" data-sort="${esc(c.k)}" aria-label="${esc(t('ترتيب حسب ','Sort by ')+lb)}">${esc(lb)}${on?(s.sort.dir>0?' ↑':' ↓'):''}</button></th>`}).join('')}</tr></thead><tbody>
     ${rows.slice(s.page*per,s.page*per+per).map(r=>`<tr class="click" tabindex="0" data-id="${esc(r.id)}">${cols.map(c=>`<td class="${esc(c.cls||'')}">${c.render?c.render(r):display(fieldOf(def,c.k),r[c.k])}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div>
    <div class="pager"><span>${t(`${num(rows.length)} سجل`,`${num(rows.length)} records`)}${pages>1?' · '+t(`صفحة ${num(s.page+1)} من ${num(pages)}`,`page ${s.page+1} of ${pages}`):''}</span>${pages>1?`<span class="actions"><button class="btn ghost sm" type="button" data-page="-1" ${s.page?'':'disabled'}>${t('السابق','Previous')}</button><button class="btn ghost sm" type="button" data-page="1" ${s.page<pages-1?'':'disabled'}>${t('التالي','Next')}</button></span>`:''}</div>`
    :`<p class="empty">${all.length?t('لا توجد سجلات مطابقة.','No records match.'):esc(t('لا توجد سجلات بعد. ','Nothing here yet. '))+(canEdit?`<button class="linkbtn" type="button" data-act="new">${esc(t('أضف أول ','Add the first ')+lc(L(def.one)))}</button>`:'')}</p>`}
   </section>`;
  root.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{s.view=b.dataset.view;s.page=0;render(def,root)});
  root.querySelectorAll('[data-filter]').forEach(sel=>sel.onchange=()=>{s.filters[sel.dataset.filter]=sel.value;s.page=0;render(def,root)});
  root.querySelectorAll('[data-sort]').forEach(b=>b.onclick=()=>{const k=b.dataset.sort;s.sort=s.sort?.k===k?(s.sort.dir>0?{k,dir:-1}:null):{k,dir:1};render(def,root)});
  root.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{s.page+=Number(b.dataset.page);render(def,root)});
  const q=root.querySelector('#q_'+def.id);let tm;q.oninput=()=>{clearTimeout(tm);tm=setTimeout(()=>{s.q=q.value;s.page=0;render(def,root);const n=root.querySelector('#q_'+def.id);n.focus();n.setSelectionRange(n.value.length,n.value.length)},180)};
  root.querySelectorAll('tr[data-id]').forEach(tr=>{tr.onclick=()=>location.hash='#/m/'+def.id+'/'+tr.dataset.id;tr.onkeydown=e=>{if(e.key==='Enter')tr.onclick()}});
  root.querySelectorAll('[data-act="new"]').forEach(b=>b.onclick=()=>location.hash='#/m/'+def.id+'/new');
  root.querySelector('[data-act="clear"]')?.addEventListener('click',()=>{s.q='';s.filters={};render(def,root)});
  IO.bind(root,def,()=>rowsFor(def));
 }

 /* ---------- Drawer ---------- */
 let open=null;
 function close(){if(!open)return;open.scrim.remove();open.el.remove();document.removeEventListener('keydown',open.key);const back=open.back;open=null;if(location.hash.split('/').length>3)history.replaceState(null,'',back);back&&window.dispatchEvent(new HashChangeEvent('hashchange'))}
 function drawer(def,id){
  if(open){open.scrim.remove();open.el.remove();document.removeEventListener('keydown',open.key);open=null}
  const old=id==='new'?null:Store.get(def.coll,id);
  if(id!=='new'&&!old){toast(t('لم يُعثر على السجل.','That record was not found.'),true);location.hash='#/m/'+def.id;return}
  const canEdit=!def.editable||def.editable();
  const rec=old?Store.clone(old):Object.fromEntries(def.fields.filter(f=>f.def!==undefined).map(f=>[f.k,def0(f)]));
  const scrim=document.createElement('div');scrim.className='scrim';
  const el=document.createElement('aside');el.className='drawer';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','drawerTitle');
  document.body.append(scrim,el);
  const key=e=>{if(e.key==='Escape')close()};document.addEventListener('keydown',key);
  open={el,scrim,key,back:def.page||'#/m/'+def.id,id:def.id+'/'+id};scrim.onclick=close;
  function input(f){
   const v=rec[f.k],dis=!canEdit||ro(f,rec)?'disabled':'',id='f_'+f.k,req=f.req?'required':'';
   let control;
   switch(f.t){
    case 'textarea':control=`<textarea id="${id}" ${dis} ${req}>${esc(v)}</textarea>`;break;
    case 'select':control=`<select id="${id}" ${dis} ${req}>${f.blank||!f.req?`<option value="">${f.opts===M.members?esc(t('غير معيّن','Unassigned')):'—'}</option>`:''}${opts(f).map(o=>`<option value="${esc(o[0])}" ${String(v??'')===String(o[0])?'selected':''}>${esc(P.en()?o[2]:o[1])}</option>`).join('')}${v&&!opts(f).some(o=>String(o[0])===String(v))?`<option value="${esc(v)}" selected>${esc(f.opts===M.members?person(v):v)}</option>`:''}</select>`;break;
    case 'bool':return `<label class="field check ${f.full?'full':''}" data-k="${esc(f.k)}"><input type="checkbox" id="${id}" ${v?'checked':''} ${dis}> ${esc(L(f.l))}</label>`;
    case 'days':control=`<input id="${id}" type="number" min="0.25" step="0.25" value="${v===''||v==null?'':Number(v)/480}" ${dis} ${req}>`;break;
    case 'number':control=`<input id="${id}" type="number" step="any" value="${esc(v)}" ${dis} ${req}>`;break;
    case 'money':control=`<input id="${id}" type="number" step="0.001" min="0" value="${esc(v)}" ${dis} ${req}>`;break;
    case 'datetime':control=`<input id="${id}" type="datetime-local" value="${esc(toLocalInput(v))}" ${dis} ${req}>`;break;
    case 'date':case 'time':case 'email':control=`<input id="${id}" type="${f.t}" value="${esc(v)}" ${dis} ${req}>`;break;
    default:control=`<input id="${id}" type="text" value="${esc(v)}" ${dis} ${req} autocomplete="off">`;
   }
   return `<label class="field ${f.full?'full':''}" data-k="${esc(f.k)}" for="${id}"><span>${esc(L(f.l))}${f.req?' <b>*</b>':''}</span>${control}${f.hint?`<span class="hint">${esc(L(f.hint))}</span>`:''}</label>`;
  }
  let xctx=null;
  function read(){const r=Store.clone(rec);for(const f of def.fields){const n=el.querySelector('#f_'+f.k);if(!n||n.disabled)continue;if(f.t==='bool')r[f.k]=n.checked;else if(f.t==='days')r[f.k]=n.value===''?'':Math.round(Number(n.value)*480);else if(['number','money'].includes(f.t))r[f.k]=n.value===''?'':Number(n.value);else if(f.t==='datetime'){r[f.k]=n.value?(toLocalInput(rec[f.k])===n.value?rec[f.k]:new Date(n.value).toISOString()):''}else r[f.k]=n.value.trim?n.value.trim():n.value}return r}
  function vis(){const r=read();for(const f of def.fields)if(f.show){const w=el.querySelector(`[data-k="${f.k}"]`);if(w)w.hidden=!f.show(r)}}
  function paint(){
   const title=old?(def.title?def.title(rec):L(def.one)):t('إضافة ','New ')+lc(L(def.one));
   el.innerHTML=`<div class="drawer-h"><div><small>${esc(L(def.label))}</small><h2 id="drawerTitle">${esc(title)}</h2>${old?`<small>${esc(t('آخر تحديث ','Updated '))}${esc(P.ago(old.updatedAt))}${old.updatedBy?' · '+esc(person(old.updatedBy)):''}</small>`:''}</div><button class="iconbtn" type="button" data-close aria-label="${t('إغلاق','Close')}">✕</button></div>
    <form class="drawer-b" novalidate id="recForm"><div class="form">${def.fields.map(input).join('')}</div><p class="err" id="formErr" role="alert"></p><div id="extra"></div>
     ${old?.history?.length?`<div class="section-t">${t('السجل','History')}</div><div class="timeline">${[...old.history].reverse().slice(0,15).map(h=>`<div class="ev"><div>${esc(h.action)}<small>${esc(person(h.by))} · ${esc(fmtDateTime(h.at))}</small></div></div>`).join('')}</div>`:''}</form>
    <div class="drawer-f"><div class="actions">${canEdit?`<button class="btn" type="submit" form="recForm">${old?t('حفظ التغييرات','Save changes'):t('حفظ','Save')}</button>`:''}<button class="btn ghost" type="button" data-close>${canEdit?t('إلغاء','Cancel'):t('إغلاق','Close')}</button></div>${old&&canEdit&&M.isAdmin()&&(!def.deletable||def.deletable())?`<button class="btn danger" type="button" data-del>${t('حذف','Delete')}</button>`:''}</div>`;
   el.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);
   el.querySelector('#recForm').addEventListener('change',vis);vis();
   el.querySelector('#recForm').onsubmit=async e=>{e.preventDefault();if(!canEdit)return;const err=el.querySelector('#formErr');err.textContent='';
    let r=read();if(xctx?.extraValues)Object.assign(r,xctx.extraValues());const miss=def.fields.filter(f=>f.req&&(!f.show||f.show(r))&&(r[f.k]===''||r[f.k]==null));if(miss.length){err.textContent=t('أكمل الحقول المطلوبة: ','Complete the required fields: ')+miss.map(f=>L(f.l)).join('، ');el.querySelector('#f_'+miss[0].k)?.focus();return}
    try{if(def.prepare)r=def.prepare(r,old)||r}catch(x){err.textContent=x.message;return}
    const changes=old?def.fields.filter(f=>f.t!=='textarea'&&String(old[f.k]??'')!==String(r[f.k]??'')).map(f=>`${L(f.l)}: ${plain(f,old[f.k])||'—'} → ${plain(f,r[f.k])||'—'}`):[];
    if(old&&r.pages&&JSON.stringify(old.pages||[])!==JSON.stringify(r.pages))changes.push(t('تغيير الصفحات المسموحة','Page access changed')+': '+r.pages.length);
    const btn=el.querySelector('[type="submit"]');btn.disabled=true;
    try{const saved=await Store.save(def.coll,r,old?(changes.length?changes.join(' · '):t('تحديث التفاصيل','Details updated')):t('أُنشئ السجل','Created'),old);toast(old?t('تم الحفظ','Saved'):t('تمت الإضافة','Added'));
     if(!old&&def.extra){history.replaceState(null,'','#/m/'+def.id+'/'+saved.id);drawer(def,saved.id)}else close()}
    catch(x){err.textContent=x.message;btn.disabled=false}};
   const del=el.querySelector('[data-del]');if(del)del.onclick=async()=>{if(del.dataset.armed){try{await Store.remove(def.coll,old.id);toast(t('تم الحذف','Deleted'));close()}catch(x){el.querySelector('#formErr').textContent=x.message}}else{del.dataset.armed='1';del.textContent=t('تأكيد الحذف','Confirm delete')}};
   if(def.extra&&X[def.extra])X[def.extra](el.querySelector('#extra'),old||null,xctx={def,read,canEdit,reopen:()=>drawer(def,old.id)});
   setTimeout(()=>{const first=el.querySelector('.form input:not([disabled]),.form select:not([disabled]),.form textarea:not([disabled])');(first||el.querySelector('[data-close]')).focus()},30);
  }
  paint();
 }

 /* ---------- Ticket closure and feedback links ---------- */
 const T={
  base:()=>location.origin+location.pathname,
  token:()=>Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b=>b.toString(16).padStart(2,'0')).join(''),
  link(token){return T.base()+'#/r/'+token},
  async requestClosure(rec){
   if(Store.mode==='server'){const r=await Store.api('tickets/'+encodeURIComponent(rec.id)+'/request-closure',{method:'POST',body:JSON.stringify({baseUrl:T.base(),send:true})});if(!r.ok)throw Error(r.body?.error||'Could not request closure.');await Store.load();return r.body}
   const x=Store.clone(Store.get('tickets',rec.id));if(x.status!=='resolved')throw Error(t('حل الطلب أولاً.','Resolve the ticket first.'));x.publicToken=x.publicToken||T.token();x.closureRequestedAt=new Date().toISOString();x.closureRequestedBy=Store.user?.email;await Store.save('tickets',x,t('طُلب من الموظف تأكيد الإغلاق','Closure confirmation requested from the requester'));return {link:T.link(x.publicToken),emailed:false}},
  async feedbackLink(rec,send){
   if(Store.mode==='server'){const r=await Store.api('tickets/'+encodeURIComponent(rec.id)+'/feedback-link',{method:'POST',body:JSON.stringify({baseUrl:T.base(),send:!!send})});if(!r.ok)throw Error(r.body?.error||'Could not create the link.');await Store.load();return r.body}
   const x=Store.clone(Store.get('tickets',rec.id));x.publicToken=x.publicToken||T.token();x.feedbackRequestedAt=x.feedbackRequestedAt||new Date().toISOString();await Store.save('tickets',x);return {link:T.link(x.publicToken),emailed:false}},
  /* Local mode only: the server does this every five minutes. */
  async autoCloseLocal(){if(Store.mode!=='local')return;for(const x of Store.all('tickets')){const at=M.autoCloseAt(x);if(Number.isFinite(at)&&at<=Date.now()){const r=Store.clone(x);r.status='closed';r.closedAt=new Date().toISOString();r.closedBy='system';r.feedbackRequestedAt=r.closedAt;r.publicToken=r.publicToken||T.token();await Store.save('tickets',r,t(`أُغلق تلقائياً بعد ${M.autoCloseDays()} أيام دون رد من الموظف`,`Closed automatically: no reply from the requester within ${M.autoCloseDays()} days`))}}}
 };

 /* ---------- Drawer extras for special modules ---------- */
 const X={
  /* Team member drawer: choose the pages a member can open (administrators always see everything). */
  pageAccess(box,rec,ctx){const form=box.closest('form');
   const draw=()=>{let r;try{r={...rec,...ctx.read()}}catch{r=rec}
    if(r.role==='member'){box.innerHTML=`<div class="section-t">${t('الصفحات المسموحة','Page access')}</div><p class="muted" style="margin:0;font-size:12.5px">${t('الموظف يرى بوابة الموظفين فقط ولا يصل إلى سجلات فريق تقنية المعلومات.','Employees see only the employee portal and never the ICT team registers.')}</p>`;return}
    if(r.role==='admin'){box.innerHTML=`<div class="section-t">${t('الصفحات المسموحة','Page access')}</div><p class="muted" style="margin:0;font-size:12.5px">${t('المسؤول يرى كل الصفحات.','Administrators see every page.')}</p>`;return}
    if(r.access!=='custom'){box.innerHTML=`<div class="section-t">${t('الصفحات المسموحة','Page access')}</div><p class="muted" style="margin:0;font-size:12.5px">${t('يرى هذا العضو كل الصفحات. لتقييده اختر «الصفحات التي أختارها فقط» في حقل الصفحات المسموحة.','This member sees every page. To limit them, set Page access to “Only the pages I choose”.')}</p>`;return}
    const cur=new Set(Array.isArray(rec.pages)?rec.pages:[]);
    box.innerHTML=`<div class="section-t">${t('الصفحات المسموحة','Page access')}</div>
     <p class="muted" style="margin:0;font-size:12.5px">${t('الرئيسية وعملي اليوم والإشعارات والإعدادات الشخصية متاحة للجميع. يمنع الخادم أيضاً قراءة أو تعديل بيانات الصفحات غير المختارة.','Home, My Work Today, Notifications and personal settings are always available. The server also blocks reading or changing the data of pages that are not ticked.')}</p>
     <div class="chips" id="pgList">${M.PAGE_PERMS.map(p=>`<label class="chip"><input type="checkbox" data-pg="${esc(p[0])}" ${cur.has(p[0])?'checked':''}> ${esc(P.en()?p[2]:p[1])}</label>`).join('')}</div>
     <div class="actions"><button class="linkbtn" type="button" id="pgAll">${t('تحديد الكل','Tick all')}</button><button class="linkbtn" type="button" id="pgNone">${t('إلغاء الكل','Clear all')}</button><span class="muted" style="font-size:12.5px">${t('تُحفظ مع «حفظ التغييرات».','Saved with Save changes.')}</span></div>`;
    box.querySelector('#pgAll').onclick=()=>box.querySelectorAll('[data-pg]').forEach(c=>c.checked=true);
    box.querySelector('#pgNone').onclick=()=>box.querySelectorAll('[data-pg]').forEach(c=>c.checked=false);
   };
   draw();form?.addEventListener('change',e=>{if(!box.contains(e.target))draw()});
   ctx.extraValues=()=>{const list=box.querySelectorAll('[data-pg]');return list.length?{pages:[...list].filter(c=>c.checked).map(c=>c.dataset.pg)}:{}};
  },
  /* Leave form: annual leave balance for this request, plus overlaps with the team. */
  leaveCheck(box,rec,ctx){box.innerHTML='<div></div><div></div>';const bx=box.children[0];X.leaveOverlap(box.children[1],rec,ctx);
   const draw=()=>{const r=ctx.read();if(!r.member||!r.start||!r.end||r.end<r.start||!M.deducts(r)){bx.innerHTML='';return}
    const y=Number(r.start.slice(0,4)),b=M.leaveBalance(r.member,y),days=M.leaveDays(r,y),was=rec&&rec.member===r.member&&M.deducts(rec)?{approved:rec.status==='approved'?M.leaveDays(rec,y):0,booked:['pending','planned'].includes(rec.status)?M.leaveDays(rec,y):0}:{approved:0,booked:0};
    const taken=b.taken-was.approved,booked=b.booked-was.booked,after=b.total-taken-days,next=r.end.slice(0,4)!==r.start.slice(0,4)?M.leaveDays(r,y+1):0,D=M.dnum;
    bx.innerHTML=`<div class="section-t">${t('رصيد الإجازة السنوية','Annual leave balance')} · ${y}</div>${b.has?`
     <div class="budgetbox${after<0?' over':''}"><div><span>${b.monthly?t('المكتسب حتى الآن','Earned so far'):t('الإجمالي','Total')}</span><b>${D(b.total)}</b></div><div><span>${t('مأخوذ (معتمد)','Taken (approved)')}</span><b>${D(taken)}</b></div><div><span>${t('هذا الطلب','This request')}</span><b>${D(days)}</b></div><div><span>${t('المتبقي بعده','Left after this')}</span><b>${D(after)}</b></div></div>
     <p class="muted" style="margin:0;font-size:12.5px">${M.leaveCfg().mode==='working'?t('تُحسب أيام العمل فقط (دون العطل الأسبوعية والرسمية).','Working days only (weekends and public holidays are not counted).'):t('تُحسب الأيام التقويمية.','Calendar days are counted.')} ${booked>0?t(`طلبات أخرى بانتظار الاعتماد: ${D(booked)} يوم.`,`Other pending or planned leave: ${D(booked)} days.`):''} ${next?t(`و${D(next)} يوم من رصيد ${y+1}.`,`Plus ${D(next)} days from the ${y+1} balance.`):''} ${b.monthly?t(`يُضاف ${D(b.rate)} يوم كل شهر حتى ${D(b.full)} يوم للسنة.`,`${D(b.rate)} days are added each month, up to ${D(b.full)} for the year.`):''} ${after<0?(b.full-taken-days>=0&&b.monthly?P.pill(t(`أكثر من المكتسب حتى الآن بـ ${D(-after)} يوم`,`${D(-after)} days more than earned so far`),'warn'):P.pill(t(`يتجاوز الرصيد بـ ${D(-after)} يوم`,`Exceeds the balance by ${D(-after)} days`),'crit')):''} ${r.status==='approved'?'':t('يُخصم عند الاعتماد.','Deducted when approved.')}</p>`
     :`<p class="muted" style="margin:0;font-size:12.5px">${t(`لا يوجد رصيد لهذا العضو في ${y}. يضيفه المسؤول من أرصدة الإجازات أو الإعدادات.`,`No ${y} balance for this member yet. An administrator adds it in Leave balances or Settings.`)} (${t('هذا الطلب','This request')}: ${D(days)} ${t('يوم','days')})</p>`}`};
   draw();box.closest('form').addEventListener('change',draw)},
  /* Leave balance record: the leave that counts against it. */
  leaveHistory(box,rec){if(!rec){box.innerHTML='';return}const b=M.leaveBalance(rec.member,rec.year),D=M.dnum,st=M.byId.leaves.fields.find(f=>f.k==='status');
   box.innerHTML=`<div class="section-t">${t('الإجازات المحتسبة','Leave counted')} · ${esc(rec.year)}</div>
    <div class="budgetbox${b.remaining<0?' over':''}"><div><span>${b.monthly?t('المكتسب حتى الآن','Earned so far'):t('الإجمالي','Total')}</span><b>${D(b.total)}</b></div><div><span>${t('مأخوذ','Taken')}</span><b>${D(b.taken)}</b></div><div><span>${t('بانتظار الاعتماد','Pending / planned')}</span><b>${D(b.booked)}</b></div><div><span>${t('المتبقي','Remaining')}</span><b>${D(b.remaining)}</b></div></div>
    ${b.monthly?`<p class="muted" style="margin:0;font-size:12.5px">${t(`يُضاف ${D(b.rate)} يوم في أول كل شهر: ${num(b.months)} شهر حتى الآن = ${D(b.accrued)} يوم${b.carried?` + ${D(b.carried)} مرحّل`:''}. استحقاق السنة كاملة ${D(b.full)} يوم، المتبقي منه ${D(b.yearLeft)}.`,`${D(b.rate)} days are added on the 1st of each month: ${b.months} months so far = ${D(b.accrued)} days${b.carried?` + ${D(b.carried)} carried over`:''}. Full-year entitlement ${D(b.full)} days, ${D(b.yearLeft)} of it left.`)}</p>`:''}
    ${b.leaves.length?`<div class="list">${b.leaves.sort((a,c)=>a.start.localeCompare(c.start)).map(x=>`<a class="li" href="#/m/leaves/${esc(x.id)}"><span class="grow"><b>${esc(fmtDate(x.start))} → ${esc(fmtDate(x.end))}</b><small>${esc(M.optLabel(M.byId.leaves.fields.find(f=>f.k==='kind').opts,x.kind))}${x.notes?' · '+esc(String(x.notes).slice(0,60)):''}</small></span>${display(st,x.status)}<span class="mono">${D(M.leaveDays(x,rec.year))} ${t('يوم','d')}</span></a>`).join('')}</div>`:`<p class="muted" style="margin:0">${t('لا توجد إجازات سنوية في هذه السنة بعد.','No annual leave in this year yet.')}</p>`}`},
  /* Budget line on purchase requests, licences, contracts and assets: what this record does to its charge account's budget. */
  budgetCheck(box,rec,ctx){const coll=ctx.def.coll,form=box.closest('form');
   const draw=()=>{let r;try{r={...(rec||{}),...ctx.read()}}catch{r=rec||{}}
    if(!r.chargeAccount){box.innerHTML=`<div class="section-t">${t('الميزانية','Budget')}</div><p class="muted" style="margin:0;font-size:12.5px">${t('اختر حساب التكلفة ليُحتسب المبلغ على ميزانيته.','Choose a charge account to count this amount against its budget.')}</p>`;return}
    const y=M.spendYear(coll,r),st=M.accountStatus(r.chargeAccount,y),mine=M.spendOf(coll,r),prev=rec?st.lines.find(l=>l.coll===coll&&l.rec.id===rec.id):null;
    const spent=st.spent-(prev?.spent||0)+mine.spent,committed=st.committed-(prev?.committed||0)+mine.committed,avail=st.budget-spent-committed;
    const acc=Store.all('accounts').find(a=>M.sameAcc(a.code,r.chargeAccount));
    const note=mine.committed?t(`يحجز هذا الطلب ${money(mine.committed)} حتى يُدخل المبلغ المدفوع.`,`This request holds ${money(mine.committed)} until the amount paid is entered.`):mine.spent?t(`يُخصم ${money(mine.spent)} من هذا الحساب.`,`${money(mine.spent)} is charged to this account.`):t('لا يوجد مبلغ بعد.','No amount yet.');
    box.innerHTML=`<div class="section-t">${t('الميزانية','Budget')} · ${esc(r.chargeAccount)} · ${y}</div>
     <div class="budgetbox${avail<0?' over':''}"><div><span>${t('الميزانية','Budget')}</span><b>${esc(money(st.budget))}</b></div><div><span>${t('المصروف','Spent')}</span><b>${esc(money(spent))}</b></div><div><span>${t('المحجوز','Committed')}</span><b>${esc(money(committed))}</b></div><div><span>${t('المتاح','Available')}</span><b>${esc(money(avail))}</b></div></div>
     <p class="muted" style="margin:0;font-size:12.5px">${esc(note)} ${!st.budget?pill(t(`لا توجد ميزانية لسنة ${y}`,`No ${y} budget set`),'warn'):avail<0?pill(t(`يتجاوز الميزانية بـ ${money(-avail)}`,`Over budget by ${money(-avail)}`),'crit'):''} ${acc?`<a href="#/m/accounts/${esc(acc.id)}">${t('عرض الحساب','Open the account')}</a>`:''}</p>`};
   draw();if(form){form.addEventListener('change',e=>{if(!box.contains(e.target))draw()});form.addEventListener('input',e=>{if(e.target.type==='number')draw()})}
  },
  /* Charge account drawer: budget per year, spending and holds, and the records behind them. */
  accountBudget(box,rec,ctx){if(!rec){box.innerHTML=`<p class="muted">${t('بعد الحفظ أضف ميزانية لكل سنة هنا.','After saving, add a budget for each year here.')}</p>`;return}
   let year=M.thisYear();
   const draw=()=>{const code=rec.code,budgets=Store.all('budgets').filter(b=>M.sameAcc(b.account,code)),all=M.accountLines(code);
    const years=[...new Set([M.thisYear(),...budgets.map(b=>Number(b.budgetYear)),...all.map(l=>l.year)])].filter(Boolean).sort((a,b)=>b-a);
    const st=M.accountStatus(code,year),admin=M.isAdmin();
    const kind={prs:t('طلب شراء','Purchase request'),licenses:t('ترخيص','Licence'),vendors:t('عقد','Contract'),assets:t('أصل','Asset')};
    box.innerHTML=`<div class="section-t">${t('الميزانية والصرف','Budget and spending')}</div>
     <label class="field" for="byYear" style="max-width:180px"><span>${t('السنة','Year')}</span><select id="byYear">${years.map(y=>`<option ${y===year?'selected':''}>${y}</option>`).join('')}</select></label>
     <div class="budgetbox${st.available<0?' over':''}"><div><span>${t('الميزانية','Budget')}</span><b>${esc(money(st.budget))}</b></div><div><span>${t('المصروف','Spent')}</span><b>${esc(money(st.spent))}</b></div><div><span>${t('المحجوز','Committed')}</span><b>${esc(money(st.committed))}</b></div><div><span>${t('المتاح','Available')}</span><b>${esc(money(st.available))}</b></div></div>
     ${M.budgetMeter(st)}
     <p class="muted" style="margin:0;font-size:12.5px">${t('المحجوز = القيمة التقديرية لطلبات الشراء التي لم يُدخل مبلغها المدفوع بعد.','Committed = estimates of purchase requests whose amount paid is not entered yet.')}</p>
     ${admin?`<div class="form" style="align-items:end"><label class="field" for="bAmt"><span>${t(`ميزانية ${year}`,`${year} budget`)}</span><input id="bAmt" type="number" min="0" step="0.001" value="${esc(budgets.find(b=>Number(b.budgetYear)===year)?.amount??'')}"></label><div class="actions"><button class="btn" type="button" id="bSave">${t('حفظ الميزانية','Save budget')}</button></div></div>`:''}
     <div class="section-t">${t('حسب السنة','By year')}</div>
     <div class="tablewrap"><table><thead><tr><th>${t('السنة','Year')}</th><th class="num">${t('الميزانية','Budget')}</th><th class="num">${t('المصروف','Spent')}</th><th class="num">${t('المحجوز','Committed')}</th><th class="num">${t('المتاح','Available')}</th></tr></thead><tbody>${years.map(y=>{const s=M.accountStatus(code,y);return `<tr class="click" data-y="${y}"${y===year?' aria-current="true"':''}><td>${y===year?`<b>${y}</b>`:y}</td><td class="num">${esc(money(s.budget))}</td><td class="num">${esc(money(s.spent))}</td><td class="num">${esc(money(s.committed))}</td><td class="num"${s.available<0?' style="color:var(--crit);font-weight:600"':''}>${esc(money(s.available))}</td></tr>`}).join('')}</tbody></table></div>
     <div class="section-t">${t(`السجلات المحتسبة في ${year}`,`Charged in ${year}`)} (${num(st.lines.length)})</div>
     ${st.lines.length?`<div class="list">${st.lines.sort((a,b)=>(b.spent+b.committed)-(a.spent+a.committed)).map(l=>`<a class="li" href="#/m/${l.coll}/${esc(l.rec.id)}"><span class="grow"><b>${esc(M.byId[l.coll].title(l.rec))}</b><small>${esc(kind[l.coll])}</small></span>${l.committed?pill(t('محجوز','Committed'),'warn'):pill(t('مصروف','Spent'),'ok')}<span class="mono">${esc(money(l.spent+l.committed))}</span></a>`).join('')}</div>`:`<p class="muted" style="margin:0">${t('لا يوجد صرف في هذه السنة.','Nothing charged in this year.')}</p>`}`;
    box.querySelector('#byYear').onchange=e=>{year=Number(e.target.value);draw()};
    box.querySelectorAll('[data-y]').forEach(tr=>tr.onclick=()=>{year=Number(tr.dataset.y);draw()});
    box.querySelector('#bSave')?.addEventListener('click',async()=>{const v=box.querySelector('#bAmt').value;if(v===''||!(Number(v)>=0))return toast(t('أدخل مبلغاً صحيحاً.','Enter a valid amount.'),true);
     const cur=Store.all('budgets').find(b=>M.sameAcc(b.account,code)&&Number(b.budgetYear)===year);
     try{await Store.save('budgets',cur?{...cur,amount:Number(v)}:{account:code,budgetYear:String(year),amount:Number(v)},t(`ميزانية ${year}: `,`${year} budget: `)+money(Number(v)));toast(t('تم الحفظ','Saved'));draw()}catch(x){toast(x.message,true)}});
   };
   draw();
  },
  ticketThread(box,rec,ctx){if(!rec)return;
   const notes=rec.updates||[],steps=rec.sopSteps||[],sop=rec.sopId&&Store.get('sops',rec.sopId),done=steps.filter(x=>x.done).length;
   const closeAt=M.autoCloseAt(rec),fb=rec.feedback;
   const stars=n=>'★'.repeat(n)+'☆'.repeat(5-n);
   box.innerHTML=`
    ${ctx.canEdit?`<div class="actions"><button class="btn ghost sm" type="button" id="copyTicket">${t('نسخ الطلب','Copy ticket')}</button>${Store.mode==='server'&&M.can('chat')&&rec.requesterEmail&&Store.all('members').some(m=>m.email===String(rec.requesterEmail).toLowerCase()&&m.role==='member'&&m.active!==false)?`<button class="btn ghost sm" type="button" id="remoteIt">${t('مساعدة عن بعد / محادثة','Remote help / chat')}</button>`:''}${!rec.owner&&Store.user?`<button class="btn ghost sm" type="button" id="takeIt">${t('إسناده لي','Assign to me')}</button>`:''}</div>`:''}
    ${rec.copiedFrom?`<p class="muted" style="margin:0">${t('نُسخ من ','Copied from ')}<span class="ref">${esc(rec.copiedFrom)}</span></p>`:''}
    ${rec.status==='resolved'?`<div class="section-t">${t('الإغلاق','Closure')}</div>
     <div class="panel" style="padding:12px;gap:8px">
      <p style="margin:0">${rec.closureRequestedAt?esc(t('طُلب من الموظف تأكيد الحل في ','The requester was asked to confirm the fix on ')+fmtDateTime(rec.closureRequestedAt)+'.'):esc(t('لم يُطلب من الموظف التأكيد بعد.','The requester has not been asked to confirm yet.'))} ${Number.isFinite(closeAt)?esc(t('يُغلق تلقائياً في ','Closes automatically on ')+fmtDateTime(new Date(closeAt).toISOString())+(rec.closeOn?t(' (تاريخ حدده المسؤول).',' (date set by an administrator).'):t(` (بعد ${num(M.autoCloseDays())} أيام من الحل).`,` (${M.autoCloseDays()} days after resolution).`))):''}</p>
      ${ctx.canEdit?`<div class="actions"><button class="btn sm" type="button" id="askClose">${rec.closureRequestedAt?t('إعادة إرسال طلب التأكيد','Ask again'):t('طلب الإغلاق من الموظف','Ask the requester to confirm')}</button></div>`:''}
      <div id="linkOut"></div></div>`:''}
    ${rec.status==='closed'?`<div class="section-t">${t('رأي الموظف في الخدمة','Requester feedback')}</div>
     <div class="panel" style="padding:12px;gap:8px">${fb?`<p style="margin:0"><span style="color:var(--warn);font-size:18px;letter-spacing:2px" aria-label="${num(fb.rating)} / 5">${stars(Number(fb.rating))}</span> <b class="mono">${num(fb.rating)}/5</b> · ${esc(fmtDateTime(fb.at))}</p>${fb.comment?`<p style="margin:0">“${esc(fb.comment)}”</p>`:''}`
      :`<p style="margin:0">${rec.feedbackRequestedAt?esc(t('طُلب التقييم في ','Feedback requested on ')+fmtDateTime(rec.feedbackRequestedAt))+(rec.feedbackEmailedAt?esc(t(' وأُرسل بالبريد.',' and emailed.')):esc(t('. أرسل الرابط للموظف.','. Send the link to the requester.'))):esc(t('سيُطلب التقييم من الموظف تلقائياً.','The requester will be asked for feedback automatically.'))}${rec.closedBy==='system'?' '+esc(t('(أُغلق تلقائياً)','(closed automatically)')):rec.closedBy==='requester'?' '+esc(t('(أكد الموظف الحل)','(the requester confirmed the fix)')):''}</p>${ctx.canEdit?`<div class="actions"><button class="btn ghost sm" type="button" id="fbLink">${t('رابط التقييم','Feedback link')}</button>${Store.mode==='server'&&rec.requesterEmail?`<button class="btn ghost sm" type="button" id="fbSend">${t('إرسال طلب التقييم بالبريد','Email the feedback request')}</button>`:''}</div>`:''}<div id="linkOut"></div>`}</div>`:''}
    ${steps.length?`<div class="section-t">${t('إجراء العمل','Procedure')}${sop?' · '+esc(L([sop.nameAr||sop.nameEn,sop.nameEn])):''} · ${num(done)}/${num(steps.length)}</div><div class="steps">${steps.map((x,i)=>`<label class="check step ${x.done?'done':''}" for="sop${i}"><input type="checkbox" id="sop${i}" data-sop="${i}" ${x.done?'checked':''} ${ctx.canEdit?'':'disabled'}> <span>${esc(L([x.ar,x.en]))}${x.done&&x.by?`<small>${esc(person(x.by))} · ${esc(fmtDateTime(x.at))}</small>`:''}</span></label>`).join('')}</div>`:''}
    <div class="section-t">${t('التحديثات والملاحظات','Updates and notes')}</div>
    <div class="timeline">${notes.length?notes.map(n=>`<div class="ev"><div>${esc(n.text)}<small>${esc(n.by==='requester'?t('الموظف','Requester'):person(n.by))} · ${esc(fmtDateTime(n.at))}${n.public?' · '+esc(t('يراه الموظف','visible to employee')):''}</small></div></div>`).join(''):`<p class="muted" style="margin:0">${t('لا توجد تحديثات بعد.','No updates yet.')}</p>`}</div>
    ${ctx.canEdit?`<div class="field"><label for="noteText" class="sr">${t('تحديث جديد','New update')}</label><textarea id="noteText" placeholder="${esc(t('اكتب تحديثاً للفريق أو للموظف…','Write an update for the team or the employee…'))}"></textarea></div><div class="actions"><label class="chip"><input type="checkbox" id="notePublic"> ${t('يراه الموظف في بوابته','Visible to the employee in their portal')}</label><button class="btn ghost" type="button" id="addNote">${t('إضافة تحديث','Add update')}</button></div>`:''}
    <div class="section-t">${t('اتفاقية الخدمة','SLA')}</div>
    <div class="form"><div class="field"><span>${t('موعد الاستجابة','Response target')}</span><b>${esc(fmtDateTime(rec.responseTargetAt))}</b><span class="hint">${rec.firstResponseAt?esc(t('تمت الاستجابة ','Responded ')+fmtDateTime(rec.firstResponseAt)):''}</span></div><div class="field"><span>${t('موعد الحل','Resolution target')}</span><b>${esc(fmtDateTime(rec.targetAt))}</b><span class="hint">${M.slaCell(rec)}${rec.slaManual?' · '+esc(t('حدده المسؤول','set by an administrator')):''}</span></div></div>`;
   const fresh=()=>Store.clone(Store.get('tickets',rec.id));
   const showLink=(res,kind)=>{const out=box.querySelector('#linkOut');if(!out)return;out.innerHTML=`<p class="muted" style="margin:0;font-size:12.5px">${res.emailed?esc(t('أُرسل بالبريد إلى ','Emailed to ')+(rec.requesterEmail||'')+'. '):esc(t('انسخ الرابط وأرسله للموظف (بريد أو واتساب):','Copy this link and send it to the requester (email or WhatsApp):'))}</p><div class="toolbar"><input id="pubLink" readonly value="${esc(res.link)}" style="flex:1;min-width:0"><button class="btn ghost sm" type="button" id="copyLink">${t('نسخ','Copy')}</button><a class="linkbtn" href="${esc(res.link)}" target="_blank" rel="noopener">${t('فتح','Open')}</a></div>`;
    out.querySelector('#copyLink').onclick=async()=>{const i=out.querySelector('#pubLink');try{await navigator.clipboard.writeText(i.value);toast(t('نُسخ الرابط','Link copied'))}catch{i.select()}}};
   box.querySelectorAll('[data-sop]').forEach(c=>c.onchange=async()=>{const r=fresh(),i=Number(c.dataset.sop),x=r.sopSteps[i];x.done=c.checked;x.by=c.checked?Store.user?.email:'';x.at=c.checked?new Date().toISOString():'';if(!r.firstResponseAt&&c.checked)r.firstResponseAt=new Date().toISOString();await Store.save('tickets',r,(c.checked?t('اكتملت خطوة: ','Step done: '):t('أُعيد فتح خطوة: ','Step reopened: '))+L([x.ar,x.en]));ctx.reopen()});
   box.querySelector('#addNote')?.addEventListener('click',async()=>{const tx=box.querySelector('#noteText').value.trim();if(!tx)return;const r=fresh();r.updates=[...(r.updates||[]),{at:new Date().toISOString(),by:Store.user?.email,text:tx,...(box.querySelector('#notePublic')?.checked?{public:true}:{})}];if(!r.firstResponseAt)r.firstResponseAt=new Date().toISOString();await Store.save('tickets',r);toast(t('أُضيف التحديث','Update added'));ctx.reopen()});
   box.querySelector('#remoteIt')?.addEventListener('click',async()=>{try{const c=await C.convWith(String(rec.requesterEmail).toLowerCase(),t(`مرحباً، بخصوص طلبك ${rec.number}: فريق تقنية المعلومات يرغب بمساعدتك.`,`Hello, about your request ${rec.number}: the ICT team would like to help you.`));C.state.open=c.id;C.state.filter='mine';close();location.hash='#/chat'}catch(x){toast(x.message,true)}});
   box.querySelector('#takeIt')?.addEventListener('click',async()=>{const r=fresh();r.owner=Store.user.email;if(r.status==='open')r.status='in-progress';if(!r.firstResponseAt)r.firstResponseAt=new Date().toISOString();await Store.save('tickets',r,t('أُسند إلى ','Assigned to ')+person(r.owner));ctx.reopen()});
   box.querySelector('#copyTicket')?.addEventListener('click',async()=>{const src=fresh(),def=M.byId.tickets;let c={};for(const k of ['title','serviceId','type','category','sopId','price','requesterName','department','requesterEmail','requesterPhone','location','assetTag','channel','impact','urgency','details'])c[k]=src[k]??'';
    c.status='open';c.owner=Store.user?.email||'';c.copiedFrom=src.number||'';
    try{c=def.prepare(c,null);const saved=await Store.save('tickets',c,t('نُسخ من ','Copied from ')+(src.number||''),null);await Store.save('tickets',fresh(),t('نُسخ إلى ','Copied to ')+saved.number);toast(t('أُنشئت نسخة ','Created copy ')+saved.number);location.hash='#/m/tickets/'+saved.id;drawer(def,saved.id)}catch(x){toast(x.message,true)}});
   box.querySelector('#askClose')?.addEventListener('click',async e=>{e.target.disabled=true;try{showLink(await T.requestClosure(rec),'close')}catch(x){toast(x.message,true);e.target.disabled=false}});
   box.querySelector('#fbLink')?.addEventListener('click',async()=>{try{showLink(await T.feedbackLink(rec,false))}catch(x){toast(x.message,true)}});
   box.querySelector('#fbSend')?.addEventListener('click',async()=>{try{const r=await T.feedbackLink(rec,true);showLink(r);if(!r.emailed)toast(t('البريد غير مُعد على الخادم. انسخ الرابط وأرسله.','Email is not set up on the server. Copy the link and send it.'),true)}catch(x){toast(x.message,true)}});
  },
  prSteps(box,rec,ctx){box.innerHTML='<div></div><div></div>';X.budgetCheck(box.children[0],rec,ctx);X.prStepsCore(box.children[1],rec,ctx)},
  prStepsCore(box,rec,ctx){if(!rec){box.innerHTML=`<p class="muted">${t('بعد الحفظ تظهر الخطوات العشر ومواعيدها.','After saving, the ten steps and their deadlines appear here.')}</p>`;return}
   const cur=M.prStage(rec),done=rec.stageDone||{};
   box.innerHTML=`<div class="section-t">${t('خطوات طلب الشراء','Purchase request steps')}</div><div class="steps">${M.PR_STEPS.map((s,i)=>{const d=M.prStepDue(rec,i),isDone=!!done[i]||!!(rec.skipped||{})[i],late=!isDone&&i===cur&&d<Date.now();return `<div class="step ${isDone?'done':i===cur?'current':''} ${late?'blocked':''}"><span class="dot">${isDone?'✓':i+1}</span><div>${esc(L(s))}<small>${isDone?esc(t('اكتملت ','Done ')+(done[i]?fmtDateTime(done[i]):t('(تم تخطيها)','(skipped)'))):Number.isFinite(d)?esc(t('الموعد ','Due ')+fmtDate(P.omanDay(d)))+(late?' · '+esc(t('متأخرة','overdue')):''):esc(typeof s[2]==='string'?t('أدخل التاريخ في الحقول أعلاه','Enter the date in the fields above'):t('يبدأ بعد الخطوة السابقة','Starts after the previous step'))}</small></div>${i===cur&&ctx.canEdit?`<button class="btn sm" type="button" data-step="${i}">${t('إكمال','Complete')}</button>`:i===cur-1&&ctx.canEdit&&done[i]?`<button class="linkbtn" type="button" data-undo="${i}">${t('تراجع','Undo')}</button>`:''}</div>`}).join('')}</div>`;
   box.querySelector('[data-step]')?.addEventListener('click',async e=>{const i=Number(e.target.dataset.step),r=Store.clone(Store.get('prs',rec.id));if(M.PR_STEPS[i][2]==='payment'&&!r.invoiceDate){toast(t('أدخل تاريخ الفاتورة أولاً.','Enter the invoice date first.'),true);return}r.stageDone={...(r.stageDone||{}),[i]:new Date().toISOString()};if(i===M.PR_STEPS.length-1)r.paid=true;await Store.save('prs',r,t('اكتملت خطوة: ','Step completed: ')+L(M.PR_STEPS[i]));ctx.reopen()});
   box.querySelector('[data-undo]')?.addEventListener('click',async e=>{const i=Number(e.target.dataset.undo),r=Store.clone(Store.get('prs',rec.id));delete r.stageDone[i];r.paid=false;await Store.save('prs',r,t('تراجع عن خطوة: ','Step reopened: ')+L(M.PR_STEPS[i]));ctx.reopen()});
  },
  stockMoves(box,rec,ctx){if(!rec)return;const moves=Store.all('movements').filter(m=>m.itemId===rec.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
   box.innerHTML=`<div class="section-t">${t('استلام وصرف','Receive and issue')}</div>${ctx.canEdit?`<div class="form"><label class="field" for="mvQty"><span>${t('الكمية','Quantity')}</span><input id="mvQty" type="number" min="1" step="1" value="1"></label><label class="field" for="mvRef"><span>${t('إلى / من / المرجع','To / from / reference')}</span><input id="mvRef" type="text" autocomplete="off"></label></div><div class="actions"><button class="btn ghost" type="button" data-mv="1">${t('استلام إلى المخزن','Receive into store')}</button><button class="btn ghost" type="button" data-mv="-1">${t('صرف من المخزن','Issue from store')}</button></div>`:''}
    <div class="timeline">${moves.slice(0,20).map(m=>`<div class="ev"><div>${m.delta>0?t('استلام','Received'):t('صرف','Issued')} <b class="mono">${num(Math.abs(m.delta))}</b> ${esc(rec.unit||'')}${m.ref?' · '+esc(m.ref):''}<small>${esc(person(m.createdBy))} · ${esc(fmtDateTime(m.createdAt))}</small></div></div>`).join('')||`<p class="muted" style="margin:0">${t('لا توجد حركات بعد.','No movements yet.')}</p>`}</div>`;
   box.querySelectorAll('[data-mv]').forEach(b=>b.onclick=async()=>{const q=Math.round(Number(box.querySelector('#mvQty').value)),dir=Number(b.dataset.mv);if(!(q>0))return toast(t('أدخل كمية صحيحة.','Enter a valid quantity.'),true);const item=Store.clone(Store.get('stock',rec.id));if(dir<0&&q>Number(item.quantity||0))return toast(t('الكمية المتوفرة لا تكفي.','Not enough stock on hand.'),true);const ref=box.querySelector('#mvRef').value.trim();
    await Store.save('movements',{itemId:rec.id,delta:dir*q,ref});item.quantity=Number(item.quantity||0)+dir*q;await Store.save('stock',item,(dir>0?t('استلام ','Received '):t('صرف ','Issued '))+q+(ref?' · '+ref:''));toast(t('تم تحديث الكمية','Quantity updated'));ctx.reopen()});
  },
  maintRun(box,rec,ctx){if(!rec)return;const items=String(rec.checklist||'').split('\n').map(s=>s.trim()).filter(Boolean),runs=rec.runs||[];
   box.innerHTML=`<div class="section-t">${t('تنفيذ الموعد الحالي','Complete the current run')} · ${esc(fmtDate(rec.nextDue))}</div>
    ${ctx.canEdit&&rec.status==='active'?`<div class="steps">${items.map((s,i)=>`<label class="check step" for="ck${i}"><input type="checkbox" id="ck${i}"> ${esc(s)}</label>`).join('')||`<p class="muted" style="margin:0">${t('لا توجد بنود في قائمة التحقق.','No checklist items.')}</p>`}</div><label class="field" for="runNote"><span>${t('ملاحظات العمل','Work notes')} <b>*</b></span><textarea id="runNote"></textarea></label><div class="actions"><button class="btn" type="button" id="runDone">${t('تسجيل التنفيذ','Record as done')}</button><button class="btn ghost" type="button" id="runSkip">${t('تخطي هذا الموعد','Skip this run')}</button></div>`:''}
    <div class="section-t">${t('التنفيذات السابقة','Previous runs')}</div><div class="timeline">${[...runs].reverse().slice(0,12).map(r=>`<div class="ev"><div>${r.skipped?t('تم التخطي','Skipped'):t('تم التنفيذ','Done')} · ${esc(t('موعد ','due '))}${esc(fmtDate(r.due))}${r.note?' — '+esc(r.note):''}<small>${esc(person(r.by))} · ${esc(fmtDateTime(r.at))}</small></div></div>`).join('')||`<p class="muted" style="margin:0">${t('لا يوجد بعد.','None yet.')}</p>`}</div>`;
   const run=async skip=>{const note=box.querySelector('#runNote').value.trim();if(!note)return toast(skip?t('اكتب سبب التخطي.','Write the reason for skipping.'):t('اكتب ملاحظات العمل.','Write the work notes.'),true);if(!skip&&[...box.querySelectorAll('[id^=ck]')].some(c=>!c.checked))return toast(t('أكمل كل بنود قائمة التحقق.','Tick every checklist item.'),true);const r=Store.clone(Store.get('maintenance',rec.id));r.runs=[...(r.runs||[]),{due:r.nextDue,at:new Date().toISOString(),by:Store.user?.email,note,skipped:skip}].slice(-60);const was=r.nextDue;r.nextDue=M.advance(r.nextDue,r.frequency,r.interval);await Store.save('maintenance',r,(skip?t('تخطي موعد ','Skipped run ')+was:t('تنفيذ موعد ','Completed run ')+was)+' → '+r.nextDue);toast(t('تم التسجيل. الموعد القادم ','Recorded. Next due ')+fmtDate(r.nextDue));ctx.reopen()};
   box.querySelector('#runDone')?.addEventListener('click',()=>run(false));box.querySelector('#runSkip')?.addEventListener('click',()=>run(true));
  },
  leaveOverlap(box,rec,ctx){const draw=()=>{const r=ctx.read();if(!r.start||!r.end){box.innerHTML='';return}const over=Store.all('leaves').filter(x=>x.id!==r.id&&x.status!=='declined'&&x.start<=r.end&&x.end>=r.start);box.innerHTML=over.length?`<div class="section-t">${t('يتداخل مع','Overlaps with')}</div><div class="list">${over.map(x=>`<div class="li"><span class="avatar">${esc(P.initials(person(x.member)))}</span><div class="grow"><b>${esc(person(x.member))}</b><small>${esc(fmtDate(x.start))} → ${esc(fmtDate(x.end))}</small></div>${display(M.byId.leaves.fields.find(f=>f.k==='status'),x.status)}</div>`).join('')}</div>`:''};draw();box.closest('form').addEventListener('change',draw)},
  lifeSteps(box,rec,ctx){if(!rec){box.innerHTML=`<p class="muted">${t('بعد الحفظ تُنشأ خطوات قائمة التحقق تلقائياً.','After saving, the checklist steps are created automatically.')}</p>`;return}
   const steps=rec.steps||[];
   box.innerHTML=`<div class="section-t">${t('قائمة التحقق','Checklist')}</div><div class="steps">${steps.map((s,i)=>`<div class="step ${s.status==='done'?'done':s.status==='blocked'?'blocked':s.status==='in-progress'?'current':''}"><span class="dot">${s.status==='done'?'✓':i+1}</span><div>${esc(L([s.ar,s.en]))}<small>${esc(person(s.assignee))}${s.due?' · '+esc(fmtDate(s.due)):''}${s.note?' — '+esc(s.note):''}</small></div>${ctx.canEdit?`<select data-step="${i}" aria-label="${esc(t('حالة الخطوة','Step status'))}">${M.STEP_STATUS.map(o=>`<option value="${o[0]}" ${s.status===o[0]?'selected':''}>${esc(P.en()?o[2]:o[1])}</option>`).join('')}</select>`:display({t:'select',opts:M.STEP_STATUS},s.status)}</div>`).join('')}</div>
    ${ctx.canEdit?`<div class="form"><label class="field full" for="stepNote"><span>${t('ملاحظة للخطوة التي تحدّثها','Note for the step you update')}</span><input id="stepNote" type="text" autocomplete="off" placeholder="${esc(t('مطلوبة عند التوقف','Required when a step is blocked'))}"></label><label class="field full" for="stepAdd"><span>${t('إضافة خطوة','Add a step')}</span><input id="stepAdd" type="text" autocomplete="off" placeholder="${esc(t('مثال: إعداد صلاحيات نظام الموارد','e.g. Set up ERP access'))}"></label></div><div class="actions"><button class="btn ghost" type="button" id="stepAddBtn">${t('إضافة','Add')}</button></div>`:''}`;
   box.querySelectorAll('select[data-step]').forEach(sel=>sel.onchange=async()=>{const i=Number(sel.dataset.step),r=Store.clone(Store.get('lifecycle',rec.id)),s=r.steps[i];const note=(box.querySelector('#stepNote')?.value||'').trim();if(sel.value==='blocked'&&!note){toast(t('اكتب سبب التوقف في خانة الملاحظة أولاً.','Write the blocker in the step note box first.'),true);sel.value=s.status;box.querySelector('#stepNote')?.focus();return}s.status=sel.value;if(note)s.note=note;s.updatedAt=new Date().toISOString();await Store.save('lifecycle',r,L([s.ar,s.en])+': '+M.optLabel(M.STEP_STATUS,s.status));ctx.reopen()});
   box.querySelector('#stepAddBtn')?.addEventListener('click',async()=>{const v=box.querySelector('#stepAdd').value.trim();if(!v)return;const r=Store.clone(Store.get('lifecycle',rec.id));r.steps=[...(r.steps||[]),{id:Store.uid(),ar:v,en:v,status:'pending',assignee:r.coordinator||'',due:r.date}];await Store.save('lifecycle',r,t('أُضيفت خطوة: ','Step added: ')+v);ctx.reopen()});
  },
  memberTools(box,rec,ctx){if(!rec||!M.isAdmin())return;box.innerHTML='<div id="accBox" style="display:flex;flex-direction:column;gap:12px"></div><div id="signBox" style="display:flex;flex-direction:column;gap:12px;margin-top:14px"></div>';X.pageAccess(box.querySelector('#accBox'),rec,ctx);if(Store.mode!=='server')return;box=box.querySelector('#signBox');
   box.innerHTML=`<div class="section-t">${t('الدخول','Sign-in')}</div><p class="muted" style="margin:0">${t('أنشئ رمز دخول لمرة واحدة وأعطه للعضو. يستخدمه في أول دخول ليختار كلمة مروره. الرمز صالح 7 أيام. إنشاء رمز جديد يلغي كلمة المرور الحالية ويُخرج العضو من كل الأجهزة، لذا استخدمه أيضاً عند نسيان كلمة المرور.','Create a one-time sign-in code and give it to the member. They use it the first time to choose their password. The code works for 7 days. A new code also cancels the current password and signs the member out everywhere, so use it when someone forgets their password.')}</p><div class="actions"><button class="btn ghost" type="button" id="mkCode">${t('إنشاء رمز دخول','Create sign-in code')}</button></div><div id="codeOut"></div>`;
   box.querySelector('#mkCode').onclick=async e=>{if(!e.target.dataset.armed&&rec.email===Store.user?.email){e.target.dataset.armed='1';e.target.textContent=t('تأكيد: سيُلغى دخولك الحالي','Confirm: this signs you out');return}try{const r=await Store.setupCode(rec.email);box.querySelector('#codeOut').innerHTML=`<div class="panel" style="padding:12px;gap:6px"><span class="muted" style="font-size:12.5px">${esc(t('رمز الدخول لـ ','Sign-in code for ')+rec.email)}</span><b class="mono" style="font-size:22px;letter-spacing:.08em">${esc(r.code)}</b><span class="muted" style="font-size:12.5px">${t('يظهر مرة واحدة فقط. أرسله للعضو مع عنوان البوابة، ويفضل شخصياً أو برسالة خاصة.','Shown only once. Send it to the member with the portal address, ideally in person or by private message.')}</span></div>`;toast(t('أُنشئ الرمز','Code created'))}catch(x){toast(x.message,true)}};
  },
 };
 return {T,render,drawer,close,display,plain,X,isOpen:()=>!!open,openKey:()=>open?.id||''};
})();
