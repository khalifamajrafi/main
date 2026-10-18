/* Knowledge base and holiday calendar pages. */
(()=>{
 const {t,L,esc,omanDay,fmtDate,pill,person}=P;
 /* ---------- Knowledge base ---------- */
 const kb={q:'',cat:''};
 function knowledge(root,id){
  const def=M.byId.articles,admin=M.isAdmin();
  if(id){const a=Store.get('articles',id);if(!a){location.hash='#/kb';return}
   root.innerHTML=`<div class="pagehead"><div><a class="linkbtn" href="#/kb">${P.en()?'←':'→'} ${t('قاعدة المعرفة','Knowledge base')}</a><h1 style="margin-top:6px">${esc(a.title)}</h1><p>${esc(a.category||'')} · ${t('آخر تحديث ','Updated ')}${esc(fmtDate(a.updatedAt))} · ${esc(person(a.updatedBy))}</p></div><div class="actions">${E.display(def.fields.find(f=>f.k==='status'),a.status)}<a class="btn ghost" href="#/m/articles/${esc(a.id)}">${t('تعديل','Edit')}</a></div></div><section class="panel"><div class="article">${esc(a.body)}</div>${a.tags?`<p class="muted" style="margin:0">${esc(a.tags)}</p>`:''}</section>`;return}
  const all=Store.all('articles').filter(a=>a.status!=='archived'||admin),cats=[...new Set(all.map(a=>a.category).filter(Boolean))].sort();
  const list=all.filter(a=>(!kb.cat||a.category===kb.cat)&&(!kb.q||[a.title,a.body,a.tags].join(' ').toLowerCase().includes(kb.q.toLowerCase()))).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
  root.innerHTML=`<div class="pagehead"><div><h1>${esc(L(def.label))}</h1><p>${esc(L(def.desc))}</p></div><div class="actions"><a class="btn ghost" href="#/reports/articles">${t('تقرير','Report')}</a>${IO.buttons(def)}<a class="btn" href="#/m/articles/new">＋ ${t('مقالة جديدة','New article')}</a></div></div>
   <div class="toolbar"><label class="search" for="kbq" style="flex:1 1 320px;background:var(--surface)"><input id="kbq" placeholder="${t('ابحث عن مشكلة أو إجراء…','Search for a problem or procedure…')}" value="${esc(kb.q)}" autocomplete="off"></label><div class="chips"><button class="chip" type="button" data-cat="" aria-pressed="${!kb.cat}">${t('الكل','All')}</button>${cats.map(c=>`<button class="chip" type="button" data-cat="${esc(c)}" aria-pressed="${kb.cat===c}">${esc(c)}</button>`).join('')}</div></div>
   ${list.length?`<div class="cards">${list.map(a=>`<a class="card" href="#/kb/${esc(a.id)}" style="text-decoration:none"><h3>${esc(a.title)}</h3><p>${esc(String(a.body||'').slice(0,220))}</p><div class="meta">${pill(a.category||t('عام','General'),'accent')}${E.display(def.fields.find(f=>f.k==='status'),a.status)}${pill(L(M.optLabel(def.fields.find(f=>f.k==='audience').opts,a.audience)))}</div></a>`).join('')}</div>`:`<section class="panel"><p class="empty">${all.length?t('لا توجد مقالات مطابقة.','No articles match.'):t('لا توجد مقالات بعد. اكتب أول إجراء يحتاجه الفريق.','No articles yet. Write the first procedure the team needs.')}</p></section>`}`;
  IO.bind(root,def,()=>list);
  const q=root.querySelector('#kbq');q.oninput=()=>{kb.q=q.value;knowledge(root);const n=root.querySelector('#kbq');n.focus();n.setSelectionRange(n.value.length,n.value.length)};
  root.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{kb.cat=b.dataset.cat;knowledge(root)});
 }

 /* ---------- Holiday calendar ---------- */
 let calMonth=omanDay().slice(0,7);
 function holidays(root){
  const admin=M.isAdmin(),hol=Store.all('holidays'),lv=Store.all('leaves').filter(x=>x.status==='approved'||x.status==='planned'||x.status==='pending');
  const [y,m]=calMonth.split('-').map(Number),first=new Date(Date.UTC(y,m-1,1)),startDow=first.getUTCDay(),days=new Date(Date.UTC(y,m,0)).getUTCDate(),cal=P.calendar();
  const cells=[];for(let i=0;i<42;i++){const d=new Date(Date.UTC(y,m-1,1-startDow+i)).toISOString().slice(0,10);cells.push(d)}
  const dows=[...Array(7)].map((_,i)=>new Date(Date.UTC(2024,8,1+i)).toLocaleDateString(P.en()?'en-GB':'ar-OM',{weekday:'short',timeZone:'UTC'}));
  const shift=d=>{const dt=new Date(Date.UTC(y,m-1+d,1));calMonth=dt.toISOString().slice(0,7);holidays(root)};
  root.innerHTML=`<div class="pagehead"><div><h1>${t('تقويم العطلات','Holiday calendar')}</h1><p>${t('العطلات الرسمية لا تُحتسب في ساعات عمل اتفاقية الخدمة. أيام العمل: ','Public holidays are excluded from SLA working time. Working days: ')}${esc(cal.days.map(d=>dows[d]).join('، '))} · ${esc(cal.start)}–${esc(cal.end)}</p></div><div class="actions"><a class="btn ghost" href="#/reports/holidays">${t('تقرير','Report')}</a><a class="btn ghost" href="#/reports/leaves">${t('تقرير الإجازات','Leave report')}</a>${IO.buttons(M.byId.holidays)}${admin?`<a class="btn" href="#/m/holidays/new">＋ ${t('إضافة عطلة','Add holiday')}</a>`:''}</div></div>
   <section class="panel"><div class="panel-h"><h2>${esc(first.toLocaleDateString(P.en()?'en-GB':'ar-OM',{month:'long',year:'numeric',timeZone:'UTC'}))}</h2><div class="actions"><button class="btn ghost sm" type="button" data-m="-1">${t('السابق','Previous')}</button><button class="btn ghost sm" type="button" data-m="0">${t('هذا الشهر','This month')}</button><button class="btn ghost sm" type="button" data-m="1">${t('التالي','Next')}</button></div></div>
    <div class="tablewrap"><div class="cal" style="min-width:640px">${dows.map(d=>`<div class="dow">${esc(d)}</div>`).join('')}${cells.map(d=>{const h=hol.filter(x=>d>=x.start&&d<=(x.end||x.start)),l=lv.filter(x=>d>=x.start&&d<=x.end),dow=new Date(d+'T12:00:00Z').getUTCDay();return `<div class="d ${d.slice(0,7)!==calMonth?'out':''} ${!cal.days.includes(dow)?'we':''} ${d===omanDay()?'today':''}"><b>${Number(d.slice(8))}</b>${h.map(x=>`<a class="ev" href="#/m/holidays/${esc(x.id)}" title="${esc(L([x.nameAr,x.nameEn]))}">${esc(L([x.nameAr,x.nameEn]))}</a>`).join('')}${l.slice(0,3).map(x=>`<a class="ev leave" href="#/m/leaves/${esc(x.id)}" title="${esc(person(x.member))}">${esc(person(x.member))}</a>`).join('')}${l.length>3?`<span class="muted" style="font-size:11px">+${l.length-3}</span>`:''}</div>`}).join('')}</div></div>
    <div class="legend"><span><i style="background:var(--warn-soft);border:1px solid var(--warn)"></i>${t('عطلة رسمية','Public holiday')}</span><span><i style="background:var(--info-soft);border:1px solid var(--info)"></i>${t('إجازة عضو في الفريق','Team member on leave')}</span><span><i style="background:var(--surface-2)"></i>${t('عطلة نهاية الأسبوع','Weekend')}</span></div></section>
   <section class="panel"><div class="panel-h"><h2>${t('العطلات المسجلة','Recorded holidays')}</h2></div>${hol.length?`<div class="list">${[...hol].sort((a,b)=>a.start.localeCompare(b.start)).map(x=>`<a class="li" href="#/m/holidays/${esc(x.id)}"><span class="grow"><b>${esc(L([x.nameAr,x.nameEn]))}</b><small>${esc(fmtDate(x.start))}${x.end&&x.end!==x.start?' → '+esc(fmtDate(x.end)):''}</small></span>${x.end<omanDay()?pill(t('مضت','Past')):''}</a>`).join('')}</div>`:`<p class="empty">${t('التقويم فارغ. أضف العطلات المعتمدة قبل الاعتماد على حسابات اتفاقية الخدمة.','The calendar is empty. Add the approved holidays before relying on SLA calculations.')}</p>`}</section>`;
  IO.bind(root,M.byId.holidays,()=>Store.all('holidays'));
  root.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{const d=Number(b.dataset.m);if(!d){calMonth=omanDay().slice(0,7);holidays(root)}else shift(d)});
 }
 Object.assign(V,{knowledge,holidays});
})();
