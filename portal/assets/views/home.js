/* Home page and its customisable dashboard (team default, personal layouts, extra widgets). */
(()=>{
 const {t,L,esc,num,omanDay,addDays,daysUntil,fmtDate,fmtDateTime,pill,person,initials,H,D}=P;
 const {active,me,panel,more,kpi}=V._;
 /* ---------- Home ---------- */
 function home(root){
  const now=Date.now(),tickets=Store.all('tickets'),open=tickets.filter(active),br=open.filter(x=>M.breached(x)),soon=open.filter(x=>{const d=M.ticketTarget(x)-now;return d>0&&d<4*H});
  const tasks=Store.all('tasks').filter(x=>x.status!=='done'),late=tasks.filter(x=>x.due&&x.due<omanDay());
  const prs=Store.all('prs').filter(x=>M.prStage(x)<M.PR_STEPS.length),prLate=prs.filter(x=>M.prStepDue(x,M.prStage(x))<now);
  const ren=[];
  for(const x of Store.all('licenses'))if(x.renewal)ren.push({k:t('ترخيص','License'),title:x.product,sub:x.vendor,date:x.renewal,url:'#/m/licenses/'+x.id});
  for(const x of Store.all('vendors'))if(x.status==='active'&&x.end)ren.push({k:t('عقد','Contract'),title:x.title,sub:x.supplier,date:x.end,url:'#/m/vendors/'+x.id});
  for(const x of Store.all('cards'))if(x.status==='active'&&x.expires)ren.push({k:t('بطاقة دخول','Access card'),title:x.holder,sub:x.number,date:x.expires,url:'#/m/cards/'+x.id});
  for(const x of Store.all('assets'))if(x.status!=='retired'&&x.warrantyEnd)ren.push({k:t('ضمان','Warranty'),title:x.tag,sub:x.model,date:x.warrantyEnd,url:'#/m/assets/'+x.id});
  const expiring=ren.filter(r=>daysUntil(r.date)<=60&&daysUntil(r.date)>=-30).sort((a,b)=>a.date.localeCompare(b.date));
  const in30=expiring.filter(r=>daysUntil(r.date)>=0&&daysUntil(r.date)<=30).length,lapsed=expiring.filter(r=>daysUntil(r.date)<0).length;
  const today=omanDay(),wk=addDays(today,6),away=Store.all('leaves').filter(x=>x.status!=='declined'&&x.start<=wk&&x.end>=today).sort((a,b)=>a.start.localeCompare(b.start));
  const days=[...Array(30)].map((_,i)=>addDays(today,i-29)),idx=Object.fromEntries(days.map((d,i)=>[d,i])),opened=days.map(()=>0),closed=days.map(()=>0);
  const dayOf=v=>v?omanDay(Date.parse(v)):'',openedToday=tickets.filter(x=>dayOf(x.createdAt)===today).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')),closedToday=tickets.filter(x=>x.status==='closed'&&dayOf(x.closedAt)===today).sort((a,b)=>(b.closedAt||'').localeCompare(a.closedAt||'')),resolvedToday=tickets.filter(x=>dayOf(x.resolvedAt)===today);
  for(const x of tickets){const a=x.createdAt&&idx[omanDay(Date.parse(x.createdAt))];if(a!=null)opened[a]++;const c=x.resolvedAt&&idx[omanDay(Date.parse(x.resolvedAt))];if(c!=null)closed[c]++}
  const byCat={};for(const x of open){const s=x.serviceId&&Store.get('catalog',x.serviceId),k=s?L([s.titleAr,s.titleEn]):M.optLabel(M.cats,x.category||'other');byCat[k]=(byCat[k]||0)+1}
  const upcoming=[...tasks.filter(x=>x.assignee===me()&&x.due&&x.due<=addDays(today,7)).map(x=>({title:x.title,date:x.due,sub:t('مهمة','Task'),url:'#/m/tasks/'+x.id})),...Store.all('maintenance').filter(x=>x.status==='active'&&x.owner===me()&&x.nextDue<=addDays(today,7)).map(x=>({title:x.title,date:x.nextDue,sub:t('صيانة','Maintenance'),url:'#/m/maintenance/'+x.id}))].sort((a,b)=>a.date.localeCompare(b.date));
  const sorted=[...open].sort((a,b)=>(M.ticketTarget(a)||Infinity)-(M.ticketTarget(b)||Infinity)).slice(0,8);
  const tf=M.byId.tickets.fields,fld=k=>tf.find(f=>f.k===k);
  const hello=new Date().toLocaleTimeString('en-GB',{hour:'2-digit',hour12:false,timeZone:P.TZ});const hr=Number(hello);
  root.innerHTML=`
   <div class="pagehead"><div><h1>${esc(hr<12?t('صباح الخير','Good morning'):hr<17?t('مساء الخير','Good afternoon'):t('مساء الخير','Good evening'))}${t('، ',', ')}${esc(Store.user?.name||'')}</h1><p>${esc(new Date().toLocaleDateString(P.en()?'en-GB':'ar-OM',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:P.TZ}))}</p></div>
    <div class="actions" id="dashActions"><a class="btn ghost" href="#/mywork">${t('عملي اليوم','My Work Today')}</a><a class="btn" href="#/m/tickets/new">＋ ${t('طلب خدمة','New ticket')}</a></div></div>
   <div class="grid" id="dashGrid"></div>`;
  const W={
   kpis:{t:['أرقام سريعة','Key numbers'],html:cls=>`<div class="${cls}"><div class="kpis six">
    ${kpi(t('طلبات مفتوحة','Open tickets'),open.length,open.some(x=>!x.owner)?t(`${num(open.filter(x=>!x.owner).length)} غير معيّنة`,`${open.filter(x=>!x.owner).length} unassigned`):t('جميعها معيّنة','All assigned'),open.some(x=>!x.owner)?'bad':'good','#/m/tickets')}
    ${kpi(t('تجاوز اتفاقية الخدمة','SLA breached'),br.length,soon.length?t(`${num(soon.length)} تستحق خلال 4 ساعات`,`${soon.length} due within 4 h`):t('لا شيء يستحق قريباً','Nothing due soon'),soon.length?'bad':'','#/m/tickets',br.length>0)}
    ${kpi(t('حرجة وعالية','Critical and high'),open.filter(x=>['critical','high'].includes(x.priority)).length,t('طلبات مفتوحة','open tickets'),'','#/m/tickets')}
    ${kpi(t('مهام متأخرة','Overdue tasks'),late.length,t(`من ${num(tasks.length)} مهمة مفتوحة`,`of ${tasks.length} open tasks`),late.length?'bad':'','#/m/tasks')}
    ${kpi(t('طلبات الشراء','Purchase requests'),prs.length,prLate.length?t(`${num(prLate.length)} خطوة متأخرة`,`${prLate.length} overdue steps`):t('لا خطوات متأخرة','No overdue steps'),prLate.length?'bad':'','#/m/prs')}
    ${kpi(t('تجديدات خلال 30 يوماً','Renewals in 30 days'),in30,lapsed?t(`${num(lapsed)} منتهية`,`${lapsed} already expired`):t('تراخيص وعقود وبطاقات','Licenses, contracts, cards'),lapsed?'bad':'','#/notifications')}
   </div></div>`},
   sla:{t:['الطلبات المفتوحة حسب موعد الاستحقاق','Open tickets by SLA'],html:cls=>panel(cls,t('الطلبات المفتوحة حسب موعد الاستحقاق','Open tickets by SLA'),sorted.length?`<div class="tablewrap"><table><thead><tr><th>${t('المرجع','Ref')}</th><th>${t('الموضوع','Subject')}</th><th>${t('الأولوية','Priority')}</th><th>${t('الموظف','Employee')}</th><th>${t('الفني','Technician')}</th><th>${t('الحالة','Status')}</th><th>${t('المتبقي','Time left')}</th></tr></thead><tbody>${sorted.map(x=>`<tr class="click" tabindex="0" data-href="#/m/tickets/${esc(x.id)}"><td class="ref nowrap">${esc(x.number)}</td><td class="wrap">${esc(x.title)}</td><td>${E.display(fld('priority'),x.priority)}</td><td class="nowrap">${esc(x.requesterName)}</td><td class="nowrap">${esc(person(x.owner))}</td><td>${E.display(fld('status'),x.status)}</td><td data-sla="${esc(x.id)}">${M.slaCell(x)}</td></tr>`).join('')}</tbody></table></div>`:`<p class="empty">${t('لا توجد طلبات مفتوحة.','No open tickets.')}</p>`,more('#/m/tickets',t('كل الطلبات','All tickets')))},
   trend:{t:['الطلبات خلال 30 يوماً','Tickets · last 30 days'],html:cls=>panel('chart '+cls,t('الطلبات خلال 30 يوماً','Tickets · last 30 days'),`<div class="todaybox"><button type="button" class="tday" data-today="opened" aria-pressed="true"><span>${t('فُتحت اليوم','Opened today')}</span><b>${num(openedToday.length)}</b></button><button type="button" class="tday" data-today="closed" aria-pressed="false"><span>${t('أُغلقت اليوم','Closed today')}</span><b>${num(closedToday.length)}</b><small>${t(`حُلّت اليوم: ${num(resolvedToday.length)}`,`Resolved today: ${resolvedToday.length}`)}</small></button></div><div id="todayList"></div>`+P.barChart({labels:days.map(d=>d.slice(8)+'/'+d.slice(5,7)),series:[opened,closed],colors:['var(--accent)','var(--warn)']}),`<div class="legend"><span><i style="background:var(--accent)"></i>${t('فُتحت','Opened')} ${num(opened.reduce((a,b)=>a+b,0))}</span><span><i style="background:var(--warn)"></i>${t('حُلّت','Resolved')} ${num(closed.reduce((a,b)=>a+b,0))}</span></div>`)},
   away:{t:['خارج المكتب هذا الأسبوع','Out of office this week'],html:cls=>panel(cls,t('خارج المكتب هذا الأسبوع','Out of office this week'),away.length?`<div class="list">${away.slice(0,6).map(x=>{const nowAway=x.start<=today;return `<a class="li" href="#/m/leaves/${esc(x.id)}"><span class="avatar">${esc(initials(person(x.member)))}</span><span class="grow"><b>${esc(person(x.member))}</b><small>${esc(fmtDate(x.start))} → ${esc(fmtDate(x.end))}${x.cover?' · '+esc(t('البديل: ','Cover: ')+person(x.cover)):''}</small></span>${pill(nowAway?t('غائب اليوم','Away today'):x.status==='pending'?t('بانتظار المراجعة','Pending'):t('قادمة','Upcoming'),nowAway?'warn':'')}</a>`}).join('')}</div>`:`<p class="empty">${t('الفريق كامل هذا الأسبوع.','Everyone is in this week.')}</p>`,more('#/m/leaves',t('الإجازات','Team leave')))},
   expiring:{t:['ينتهي قريباً','Expiring soon'],html:cls=>panel(cls,t('ينتهي قريباً','Expiring soon'),expiring.length?`<div class="list">${expiring.slice(0,6).map(r=>{const n=daysUntil(r.date);return `<a class="li" href="${esc(r.url)}"><span class="grow"><b>${esc(r.title||'—')}</b><small>${esc(r.k)}${r.sub?' · '+esc(r.sub):''}</small></span>${pill(n<0?t('منتهٍ','Expired'):num(n)+t(' يوم',' d'),n<=14?'crit':n<=30?'warn':'')}</a>`}).join('')}</div>`:`<p class="empty">${t('لا شيء ينتهي خلال 60 يوماً.','Nothing expires in the next 60 days.')}</p>`,`<span class="muted" style="font-size:12px">${t('خلال 60 يوماً','next 60 days')}</span>`)},
   byService:{t:['الطلبات المفتوحة حسب الخدمة','Open tickets by service'],html:cls=>panel(cls,t('الطلبات المفتوحة حسب الخدمة','Open tickets by service'),P.bars(Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,7)))},
   deadlines:{t:['مواعيدي خلال 7 أيام','My deadlines in 7 days'],html:cls=>panel(cls,t('مواعيدي خلال 7 أيام','My deadlines in 7 days'),upcoming.length?`<div class="list">${upcoming.slice(0,6).map(x=>{const d=new Date(Date.parse(x.date+'T12:00:00Z'));return `<a class="li" href="${esc(x.url)}"><span class="datebox"><b>${esc(d.toLocaleDateString(P.en()?'en-GB':'ar-OM',{day:'2-digit',timeZone:'UTC'}))}</b><small>${esc(d.toLocaleDateString(P.en()?'en-GB':'ar-OM',{month:'short',timeZone:'UTC'}))}</small></span><span class="grow"><b>${esc(x.title)}</b><small>${esc(x.sub)}</small></span>${x.date<today?pill(t('متأخرة','Overdue'),'crit'):''}</a>`}).join('')}</div>`:`<p class="empty">${t('لا مواعيد لك هذا الأسبوع.','No deadlines for you this week.')}</p>`,more('#/mywork',t('عملي اليوم','My Work Today')))},
  };
  const after=()=>{
  const drawToday=k=>{const list=k==='closed'?closedToday:openedToday,box=root.querySelector('#todayList');if(!box)return;root.querySelectorAll('[data-today]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.today===k)));
   box.innerHTML=list.length?`<div class="list">${list.slice(0,8).map(x=>`<a class="li" href="#/m/tickets/${esc(x.id)}"><span class="grow"><b><span class="mono">${esc(x.number||'')}</span> · ${esc(x.title||'')}</b><small>${esc(x.requesterName||'')}${x.owner?' · '+esc(person(x.owner)):''} · ${esc(fmtDateTime(k==='closed'?x.closedAt:x.createdAt))}</small></span>${E.display(M.byId.tickets.fields.find(f=>f.k==='status'),x.status)}</a>`).join('')}${list.length>8?`<a class="linkbtn" href="#/m/tickets">${t(`و${num(list.length-8)} أخرى`,`and ${list.length-8} more`)}</a>`:''}</div>`
    :`<p class="empty" style="padding:6px 0">${k==='closed'?t('لم يُغلق أي طلب اليوم.','No tickets closed today.'):t('لم يُفتح أي طلب اليوم.','No tickets opened today.')}</p>`};
  root.querySelectorAll('[data-today]').forEach(b=>b.onclick=()=>drawToday(b.dataset.today));drawToday('opened');
  root.querySelectorAll('tr[data-href]').forEach(r=>{r.onclick=()=>location.hash=r.dataset.href;r.onkeydown=e=>{if(e.key==='Enter')r.onclick()}});
  };
  dashboard(root,W,after);
 }


 /* ---------- Customisable Home dashboard ----------
    Layout = list of {id,size}. Order of use: my own layout → team default (set by an administrator) → built-in default.
    Administrators, and members with the "Customize the Home dashboard" page permission, can change it. */
 const DASH_DEFAULT=[{id:'kpis',size:'s12'},{id:'sla',size:'s12'},{id:'trend',size:'s7'},{id:'away',size:'s5'},{id:'expiring',size:'s4'},{id:'byService',size:'s4'},{id:'deadlines',size:'s4'}];
 const SIZES=()=>[['s4',t('صغير','Small')],['s6',t('نصف العرض','Half')],['s8',t('كبير','Large')],['s12',t('كامل العرض','Full width')],['s5',t('5/12','5/12')],['s7',t('7/12','7/12')]];
 const dash={mine:undefined,edit:null,loading:false};
 const canCustomize=()=>Store.mode==='server'?(M.isAdmin()||M.can('dashboard')):true;
 function teamLayout(){const d=(Store.get('settings','main')||{}).dashboard;return Array.isArray(d)&&d.length?d:null}
 function currentLayout(){return dash.edit||(Array.isArray(dash.mine)&&dash.mine.length?dash.mine:null)||teamLayout()||DASH_DEFAULT}
 async function loadMine(){if(Store.mode!=='server'){try{dash.mine=JSON.parse(localStorage.getItem('ictops.dash')||'null')}catch{dash.mine=null}return}
  if(dash.loading)return;dash.loading=true;const r=await Store.api('me/dashboard');dash.mine=r.ok?r.body.layout:null;dash.loading=false}
 async function saveMine(layout){if(Store.mode!=='server'){try{localStorage.setItem('ictops.dash',JSON.stringify(layout))}catch{}dash.mine=layout;return true}
  const r=await Store.api('me/dashboard',{method:'PUT',body:JSON.stringify({layout})});if(!r.ok){P.toast(r.body?.error||t('تعذر الحفظ','Could not save'),true);return false}dash.mine=layout;return true}

 /* Extra widgets anyone can add */
 function extraWidgets(){
  const tk=Store.all('tickets'),open=tk.filter(active),bars=(o,max)=>P.bars(Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,8),max);
  const st=M.byId.tickets.fields.find(f=>f.k==='status');
  return {
   byTech:{t:['الطلبات المفتوحة لكل فني','Open tickets per technician'],perm:'tickets',html:cls=>{const o={};for(const x of open){const k=x.owner?person(x.owner):t('غير معيّن','Unassigned');o[k]=(o[k]||0)+1}return panel(cls,t('الطلبات المفتوحة لكل فني','Open tickets per technician'),bars(o))}},
   byCategory:{t:['الطلبات المفتوحة حسب الفئة','Open tickets by category'],perm:'tickets',html:cls=>{const o={};for(const x of open){const k=M.optLabel(M.cats,x.category||'other');o[k]=(o[k]||0)+1}return panel(cls,t('الطلبات المفتوحة حسب الفئة','Open tickets by category'),bars(o))}},
   byPriority:{t:['المفتوحة حسب الأولوية','Open by priority'],perm:'tickets',html:cls=>panel(cls,t('المفتوحة حسب الأولوية','Open by priority'),P.bars(M.PRIORITY.map((p,i)=>[P.en()?p[2]:p[1],open.filter(x=>x.priority===p[0]).length,['cr','hi','',''][i]])))},
   recent:{t:['أحدث الطلبات','Latest tickets'],perm:'tickets',html:cls=>{const l=[...tk].sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')).slice(0,7);return panel(cls,t('أحدث الطلبات','Latest tickets'),l.length?`<div class="list">${l.map(x=>`<a class="li" href="#/m/tickets/${esc(x.id)}"><span class="grow"><b><span class="mono">${esc(x.number||'')}</span> · ${esc(x.title||'')}</b><small>${esc(x.requesterName||'')} · ${esc(P.ago(x.createdAt))}</small></span>${E.display(st,x.status)}</a>`).join('')}</div>`:`<p class="empty">${t('لا توجد طلبات.','No tickets.')}</p>`,`<a class="linkbtn" href="#/m/tickets">${t('الكل','All')} →</a>`)}},
   mine:{t:['طلباتي المسندة','My assigned tickets'],perm:'tickets',html:cls=>{const l=open.filter(x=>x.owner===me()).sort((a,b)=>(M.ticketTarget(a)||Infinity)-(M.ticketTarget(b)||Infinity)).slice(0,7);return panel(cls,t('طلباتي المسندة','My assigned tickets'),l.length?`<div class="list">${l.map(x=>`<a class="li" href="#/m/tickets/${esc(x.id)}"><span class="grow"><b><span class="mono">${esc(x.number||'')}</span> · ${esc(x.title||'')}</b><small>${esc(x.requesterName||'')}</small></span>${M.slaCell(x)}</a>`).join('')}</div>`:`<p class="empty">${t('لا توجد طلبات مسندة لك.','Nothing assigned to you.')}</p>`)}},
   satisfaction:{t:['رضا الموظفين','Requester satisfaction'],perm:'tickets',html:cls=>{const fb=tk.filter(x=>x.feedback?.rating&&Date.parse(x.feedback.at||x.closedAt||0)>Date.now()-90*D),avg=fb.length?fb.reduce((a,x)=>a+Number(x.feedback.rating),0)/fb.length:0;
     return panel(cls,t('رضا الموظفين · 90 يوماً','Requester satisfaction · 90 days'),fb.length?`<div style="display:flex;align-items:baseline;gap:8px"><b style="font-family:var(--f-display);font-size:32px">${num(avg,1)}</b><span class="stars">${'★'.repeat(Math.round(avg))}${'☆'.repeat(5-Math.round(avg))}</span><span class="muted">${t(`${num(fb.length)} تقييم`,`${fb.length} ratings`)}</span></div>${P.bars([5,4,3,2,1].map(n=>['★'.repeat(n),fb.filter(x=>Number(x.feedback.rating)===n).length,n<=2?'cr':n===3?'hi':'']))}`:`<p class="empty">${t('لا توجد تقييمات بعد.','No ratings yet.')}</p>`)}},
   online:{t:['فريق تقنية المعلومات المتصل','ICT team online'],perm:'chat',server:true,html:cls=>{const w=C.state.presence?.chat?.waiting||0;return panel(cls,t('فريق تقنية المعلومات','ICT team online'),C.teamList(),`<a class="linkbtn" href="#/chat">${w?t(`${num(w)} محادثة بانتظار فني`,`${w} chats waiting`):t('المحادثة المباشرة','Live chat')} →</a>`)}},
   budget:{t:['الميزانية حسب حساب التكلفة','Budget by charge account'],perm:'accounts',html:cls=>{const y=M.thisYear(),acc=Store.all('accounts').filter(x=>x.active!==false).map(x=>({x,st:M.accountStatus(x.code,y)})).filter(a=>a.st.budget||a.st.spent||a.st.committed).sort((a,b)=>(b.st.used??999)-(a.st.used??999));
     return panel(cls,t(`الميزانية · ${y}`,`Budget · ${y}`),acc.length?`<div class="list">${acc.slice(0,6).map(a=>`<a class="li" href="#/m/accounts/${esc(a.x.id)}"><span class="grow"><b>${esc(a.x.code)}</b><small>${esc(a.x.name||'')}</small></span><span style="width:45%">${M.budgetMeter(a.st)}</span></a>`).join('')}</div>`:`<p class="empty">${t('لا توجد ميزانيات.','No budgets yet.')}</p>`)}},
   leave:{t:['أرصدة الإجازات','Leave balances'],perm:'leaves',html:cls=>{const y=M.thisYear(),bs=[...new Set(Store.all('balances').filter(x=>Number(x.year)===y).map(x=>x.member))].map(m=>({m,b:M.leaveBalance(m,y)})).sort((a,b)=>a.b.remaining-b.b.remaining);
     return panel(cls,t(`أرصدة الإجازات · ${y}`,`Leave balances · ${y}`),bs.length?`<div class="list">${bs.slice(0,7).map(({m,b})=>`<div class="li"><span class="avatar">${esc(initials(person(m)))}</span><span class="grow"><b>${esc(person(m))}</b><small>${t('مأخوذ','Taken')} ${M.dnum(b.taken)} · ${t('بانتظار','Pending')} ${M.dnum(b.booked)}</small></span><b class="mono">${M.dnum(b.remaining)}</b></div>`).join('')}</div>`:`<p class="empty">${t('لا توجد أرصدة.','No balances yet.')}</p>`,`<a class="linkbtn" href="#/m/balances">${t('الكل','All')} →</a>`)}},
   lowStock:{t:['أصناف المخزن المنخفضة','Low stock'],perm:'stock',html:cls=>{const l=Store.all('stock').filter(x=>Number(x.quantity||0)<=Number(x.minimum||0)).sort((a,b)=>Number(a.quantity||0)-Number(b.quantity||0));
     return panel(cls,t('أصناف المخزن المنخفضة','Low stock'),l.length?`<div class="list">${l.slice(0,7).map(x=>`<a class="li" href="#/m/stock/${esc(x.id)}"><span class="grow"><b>${esc(x.name)}</b><small>${esc(x.sku)} · ${t('الحد الأدنى','Minimum')} ${num(x.minimum)}</small></span>${pill(num(x.quantity),Number(x.quantity||0)<=0?'crit':'warn')}</a>`).join('')}</div>`:`<p class="empty">${t('كل الأصناف فوق الحد الأدنى.','Everything is above its minimum.')}</p>`)}},
   licenses:{t:['استخدام التراخيص','License use'],perm:'licenses',html:cls=>panel(cls,t('استخدام التراخيص','License use'),P.bars(Store.all('licenses').map(x=>[x.product,M.util(x)??0,(M.util(x)||0)>=90?'cr':(M.util(x)||0)>=75?'hi':'']).sort((a,b)=>b[1]-a[1]).slice(0,8),100))},
   prSteps:{t:['طلبات الشراء حسب الخطوة','Purchase requests by step'],perm:'prs',html:cls=>{const o={};for(const x of Store.all('prs')){const i=M.prStage(x);if(i>=M.PR_STEPS.length)continue;const k=L(M.PR_STEPS[i]);o[k]=(o[k]||0)+1}return panel(cls,t('طلبات الشراء حسب الخطوة','Purchase requests by step'),bars(o))}},
   tasks:{t:['مهامي المفتوحة','My open tasks'],perm:'tasks',html:cls=>{const l=Store.all('tasks').filter(x=>x.status!=='done'&&x.assignee===me()).sort((a,b)=>(a.due||'9').localeCompare(b.due||'9')).slice(0,7);return panel(cls,t('مهامي المفتوحة','My open tasks'),l.length?`<div class="list">${l.map(x=>`<a class="li" href="#/m/tasks/${esc(x.id)}"><span class="grow"><b>${esc(x.title)}</b><small>${x.due?esc(fmtDate(x.due)):''}</small></span>${x.due?M.due(x.due,2):''}</a>`).join('')}</div>`:`<p class="empty">${t('لا توجد مهام مفتوحة.','No open tasks.')}</p>`)}},
   links:{t:['روابط سريعة','Quick links'],html:cls=>panel(cls,t('روابط سريعة','Quick links'),`<div class="actions">${[['#/m/tickets/new',t('طلب جديد','New ticket'),'tickets'],['#/m/tasks/new',t('مهمة جديدة','New task'),'tasks'],['#/m/prs/new',t('طلب شراء','Purchase request'),'prs'],['#/chat',t('المحادثة المباشرة','Live chat'),'chat'],['#/remote',t('المساعدة عن بعد','Remote help'),'chat'],['#/reports',t('التقارير','Reports'),'reports'],['#/management',t('لوحة الإدارة','Management'),'management']].filter(x=>M.can(x[2])).map(x=>`<a class="btn ghost sm" href="${x[0]}">${esc(x[1])}</a>`).join('')}</div>`)},
  }}

 function dashboard(root,base,after){
  const W={...base,...extraWidgets()},grid=root.querySelector('#dashGrid'),acts=root.querySelector('#dashActions');
  const allowed=id=>W[id]&&(!W[id].perm||M.can(W[id].perm))&&(!W[id].server||Store.mode==='server');
  if(dash.mine===undefined&&!dash.loading){loadMine().then(()=>{if(root.isConnected&&root.querySelector('#dashGrid'))dashboard(root,base,after)})}
  const layout=currentLayout().filter(w=>allowed(w.id));
  grid.innerHTML=layout.map(w=>{try{return W[w.id].html(`${w.size||'s6'} wdg" data-wid="${w.id}`)}catch(e){console.error(e);return ''}}).join('')||`<p class="empty s12">${t('لا توجد عناصر. أضف عنصراً.','No widgets. Add one.')}</p>`;
  /* header buttons */
  acts.querySelectorAll('.dashbtn').forEach(b=>b.remove());
  if(canCustomize()){
   if(!dash.edit)acts.insertAdjacentHTML('afterbegin',`<button class="btn ghost dashbtn" type="button" id="dashEdit">${t('تخصيص اللوحة','Customize')}</button>`);
   else acts.insertAdjacentHTML('afterbegin',`<button class="btn ghost dashbtn" type="button" id="dashAdd">＋ ${t('إضافة عنصر','Add widget')}</button><button class="btn ghost dashbtn" type="button" id="dashReset">${t('الافتراضي','Reset')}</button><button class="btn ghost dashbtn" type="button" id="dashCancel">${t('إلغاء','Cancel')}</button>${M.isAdmin()&&Store.mode==='server'?`<select class="dashbtn" id="dashScope" aria-label="${esc(t('حفظ لـ','Save for'))}" style="font:inherit;padding:7px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--fg)"><option value="me">${t('لي فقط','Just me')}</option><option value="team">${t('الافتراضي لكل الفريق','Team default for everyone')}</option></select>`:''}<button class="btn dashbtn" type="button" id="dashSave">${t('حفظ اللوحة','Save dashboard')}</button>`);
  }
  root.classList.toggle('dash-editing',!!dash.edit);
  if(dash.edit){
   grid.querySelectorAll('[data-wid]').forEach((el,i)=>{const id=el.dataset.wid,w=dash.edit.find(x=>x.id===id);
    el.insertAdjacentHTML('afterbegin',`<div class="wtools"><span class="wgrip" title="${esc(t('اسحب لإعادة الترتيب','Drag to reorder'))}">⠿</span><b>${esc(L(W[id].t))}</b><span class="grow"></span><button type="button" class="iconbtn" data-mv="-1" aria-label="${esc(t('نقل للأمام','Move earlier'))}">${P.en()?'←':'→'}</button><button type="button" class="iconbtn" data-mv="1" aria-label="${esc(t('نقل للخلف','Move later'))}">${P.en()?'→':'←'}</button><select data-size aria-label="${esc(t('الحجم','Size'))}">${SIZES().map(([v,l])=>`<option value="${v}" ${w.size===v?'selected':''}>${esc(l)}</option>`).join('')}</select><button type="button" class="iconbtn" data-rm aria-label="${esc(t('إزالة','Remove'))}">✕</button></div>`);
    el.draggable=true;
    el.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',id);el.classList.add('dragging')});
    el.addEventListener('dragend',()=>el.classList.remove('dragging'));
    el.addEventListener('dragover',e=>{e.preventDefault();el.classList.add('dropto')});
    el.addEventListener('dragleave',()=>el.classList.remove('dropto'));
    el.addEventListener('drop',e=>{e.preventDefault();el.classList.remove('dropto');const from=e.dataTransfer.getData('text/plain');if(!from||from===id)return;const a=dash.edit.findIndex(x=>x.id===from),item=dash.edit.splice(a,1)[0],b=dash.edit.findIndex(x=>x.id===id);dash.edit.splice(b,0,item);dashboard(root,base,after)});
    el.querySelectorAll('[data-mv]').forEach(b=>b.onclick=()=>{const a=dash.edit.findIndex(x=>x.id===id),to=a+Number(b.dataset.mv);if(to<0||to>=dash.edit.length)return;[dash.edit[a],dash.edit[to]]=[dash.edit[to],dash.edit[a]];dashboard(root,base,after)});
    el.querySelector('[data-size]').onchange=e=>{w.size=e.target.value;dashboard(root,base,after)};
    el.querySelector('[data-rm]').onclick=()=>{dash.edit=dash.edit.filter(x=>x.id!==id);dashboard(root,base,after)};
    el.querySelectorAll('a,button:not(.iconbtn),input,select:not([data-size])').forEach(x=>{if(!x.closest('.wtools'))x.tabIndex=-1});
   });
   acts.querySelector('#dashAdd').onclick=()=>{const avail=Object.keys(W).filter(id=>allowed(id)&&!dash.edit.some(x=>x.id===id));
    const d=document.createElement('div');d.className='scrim';d.innerHTML=`<div class="panel" style="max-width:640px;margin:8vh auto;max-height:80vh;overflow:auto"><div class="panel-h"><h2>${t('إضافة عنصر إلى اللوحة','Add a widget')}</h2><button class="btn ghost sm" type="button" data-x>${t('إغلاق','Close')}</button></div>${avail.length?`<div class="cards">${avail.map(id=>`<button type="button" class="card" data-add="${id}"><h3>${esc(L(W[id].t))}</h3><p class="muted" style="margin:0;font-size:12.5px">${t('اضغط للإضافة','Click to add')}</p></button>`).join('')}</div>`:`<p class="empty">${t('كل العناصر مضافة.','Every widget is already on the dashboard.')}</p>`}</div>`;
    document.body.append(d);const close=()=>d.remove();d.querySelector('[data-x]').onclick=close;d.onclick=e=>{if(e.target===d)close()};
    d.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{dash.edit.push({id:b.dataset.add,size:b.dataset.add==='kpis'?'s12':'s6'});close();dashboard(root,base,after);grid.lastElementChild?.scrollIntoView({behavior:'smooth',block:'center'})})};
   acts.querySelector('#dashCancel').onclick=()=>{dash.resetMine=false;dash.edit=null;dashboard(root,base,after)};
   acts.querySelector('#dashReset').onclick=()=>{dash.resetMine=acts.querySelector('#dashScope')?.value!=='team';dash.edit=(acts.querySelector('#dashScope')?.value==='team'?DASH_DEFAULT:(teamLayout()||DASH_DEFAULT)).map(x=>({...x}));dashboard(root,base,after)};
   acts.querySelector('#dashSave').onclick=async()=>{const layout=dash.edit.map(x=>({id:x.id,size:x.size}));
    if(acts.querySelector('#dashScope')?.value==='team'){await Store.save('settings',{...(Store.get('settings','main')||{id:'main'}),id:'main',dashboard:layout},t('تحديث لوحة الفريق الافتراضية','Team default dashboard updated'));P.toast(t('حُفظت كلوحة افتراضية لكل الفريق. من لديه لوحة خاصة يمكنه اختيار «الافتراضي».','Saved as the team default. People with their own layout can press Reset to use it.'))}
    else{if(!await saveMine(dash.resetMine?null:layout))return;P.toast(dash.resetMine?t('تستخدم الآن لوحة الفريق الافتراضية','You now use the team default dashboard'):t('حُفظت لوحتك','Your dashboard was saved'))}
    dash.resetMine=false;
    dash.edit=null;dashboard(root,base,after)};
  }else acts.querySelector('#dashEdit')?.addEventListener('click',()=>{dash.edit=currentLayout().filter(w=>allowed(w.id)).map(x=>({...x}));dashboard(root,base,after)});
  after?.();
 }
 Object.assign(V,{home});
})();
