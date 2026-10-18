/* Special pages, split across views/*.js: Home overview, My Work Today, notifications, management dashboard, knowledge base, holiday calendar, settings.
   This file comes first and holds what the pages share: the knowledge base and holiday registers, layout helpers, and alerts. */
window.V=(()=>{
 const {t,L,esc,num,daysUntil,fmtDate,person,H,D}=P;
 const o=(v,ar,en,tone='')=>[v,ar,en,tone];
 /* Two more registers that have their own pages */
 M.defs.push(
  {id:'articles',coll:'articles',group:'desk',icon:'book',page:'#/kb',label:['قاعدة المعرفة','Knowledge base'],one:['مقالة','Article'],desc:['إجراءات العمل وحلول المشكلات المتكررة.','Procedures and fixes for recurring problems.'],
   fields:[{k:'title',l:['العنوان','Title'],t:'text',req:true,full:true},{k:'category',l:['الفئة','Category'],t:'text',def:'General'},{k:'audience',l:['من يراها','Visible to'],t:'select',opts:[o('team','فريق تقنية المعلومات','ICT team','accent'),o('all','جميع الموظفين','All employees','info')],def:'team'},{k:'status',l:['الحالة','Status'],t:'select',opts:[o('draft','مسودة','Draft','warn'),o('published','منشورة','Published','ok'),o('archived','مؤرشفة','Archived','')],def:'draft'},{k:'body',l:['المحتوى','Content'],t:'textarea',req:true,full:true},{k:'tags',l:['كلمات مفتاحية','Keywords'],t:'text',full:true}],
   cols:['title','category','audience','status'],search:x=>[x.title,x.body,x.tags,x.category].join(' '),title:x=>x.title},
  {id:'holidays',coll:'holidays',group:'work',icon:'calendar',page:'#/holidays',label:['العطلات الرسمية','Public holidays'],one:['عطلة','Holiday'],desc:['أيام لا تُحتسب ضمن ساعات عمل اتفاقية الخدمة.','Days that do not count as SLA working time.'],
   fields:[{k:'nameEn',l:['الاسم بالإنجليزية','Name (English)'],t:'text',req:true},{k:'nameAr',l:['الاسم بالعربية','Name (Arabic)'],t:'text',req:true},{k:'start',l:['من','From'],t:'date',req:true},{k:'end',l:['إلى','To'],t:'date',req:true}],
   cols:['nameEn','start','end'],sort:(a,b)=>(a.start||'').localeCompare(b.start||''),title:x=>L([x.nameAr,x.nameEn]),editable:M.isAdmin,
   prepare(r){if(r.end<r.start)throw Error(t('تاريخ النهاية قبل البداية.','The end date is before the start date.'));return r}});
 M.byId.articles=M.defs.at(-2);M.byId.holidays=M.defs.at(-1);

 const active=x=>!M.terminal(x);
 const me=()=>Store.user?.email;
 const panel=(cls,title,body,more='')=>`<section class="panel ${cls}"><div class="panel-h"><h2>${esc(title)}</h2>${more}</div>${body}</section>`;
 const more=(href,label)=>`<a class="linkbtn" href="${esc(href)}">${esc(label)} ${P.en()?'→':'←'}</a>`;
 const kpi=(l,v,sub,tone='',href='',alert=false)=>`<${href?`a href="${esc(href)}"`:'div'} class="kpi${alert?' alert':''}"><span class="lbl">${esc(l)}</span><span class="val">${typeof v==='number'?num(v):esc(v)}</span><span class="sub ${tone}">${esc(sub)}</span></${href?'a':'div'}>`;

 /* ---------- Alerts (shared by Home, Notifications and the menu badge) ---------- */
 function alerts(scope='mine'){
  const now=Date.now(),mine=e=>scope==='team'||e===me(),out=[],admin=M.isAdmin();
  const add=a=>out.push(a);
  for(const x of Store.all('tickets').filter(active)){const d=M.ticketTarget(x);
   if(x.owner&&mine(x.owner)&&Number.isFinite(d)&&d-now<24*H)add({key:'t:'+x.id+':'+(d<now?'o':'d'),kind:['طلب خدمة','Ticket'],title:(x.number||'')+' · '+x.title,detail:d<now?t('تجاوز موعد اتفاقية الخدمة','SLA target missed'):t('يستحق خلال 24 ساعة','Due within 24 hours'),due:d,sev:d<now?'overdue':'due',owner:x.owner,url:'#/m/tickets/'+x.id});
   if(!x.owner&&(admin||scope==='team'))add({key:'tu:'+x.id,kind:['طلب خدمة','Ticket'],title:(x.number||'')+' · '+x.title,detail:t('غير معيّن لفني','Not assigned to a technician'),due:d,sev:'info',url:'#/m/tickets/'+x.id})}
  for(const x of Store.all('tasks').filter(x=>x.status!=='done'&&x.due&&mine(x.assignee))){const d=P.dayEnd(x.due);if(d-now<24*H)add({key:'k:'+x.id+':'+(d<now?'o':'d'),kind:['مهمة','Task'],title:x.title,detail:d<now?t('متأخرة','Overdue'):t('تستحق اليوم','Due today'),due:d,sev:d<now?'overdue':'due',owner:x.assignee,url:'#/m/tasks/'+x.id})}
  for(const x of Store.all('prs')){const i=M.prStage(x);if(i>=M.PR_STEPS.length||!mine(x.owner))continue;const d=M.prStepDue(x,i);if(Number.isFinite(d)&&d-now<2*D)add({key:'p:'+x.id+':'+i,kind:['طلب شراء','Purchase request'],title:(x.number||'')+' · '+x.title,detail:L(M.PR_STEPS[i])+' · '+(d<now?t('متأخرة','overdue'):t('تستحق قريباً','due soon')),due:d,sev:d<now?'overdue':'due',owner:x.owner,url:'#/m/prs/'+x.id})}
  for(const x of Store.all('maintenance').filter(x=>x.status==='active'&&mine(x.owner))){const n=daysUntil(x.nextDue);if(n!=null&&n<=1)add({key:'m:'+x.id+':'+x.nextDue,kind:['صيانة','Maintenance'],title:x.title,detail:n<0?t('موعد متأخر','Run overdue'):t('مستحقة','Due'),due:P.dayEnd(x.nextDue),sev:n<0?'overdue':'due',owner:x.owner,url:'#/m/maintenance/'+x.id})}
  for(const c of Store.all('lifecycle'))for(const s of c.steps||[])if(!['done','na'].includes(s.status)&&mine(s.assignee)&&s.due&&daysUntil(s.due)<=2)add({key:'l:'+c.id+':'+s.id,kind:['انضمام / مغادرة','Joiner / leaver'],title:c.employee+' · '+L([s.ar,s.en]),detail:s.status==='blocked'?t('متوقفة','Blocked'):daysUntil(s.due)<0?t('متأخرة','Overdue'):t('تستحق قريباً','Due soon'),due:P.dayEnd(s.due),sev:s.status==='blocked'||daysUntil(s.due)<0?'overdue':'due',owner:s.assignee,url:'#/m/lifecycle/'+c.id});
  const exp=(coll,kind,f,title,date,url)=>{for(const x of Store.all(coll).filter(f)){const n=daysUntil(date(x));if(n!=null&&n<=30)add({key:coll+':'+x.id+':'+date(x),kind,title:title(x),detail:n<0?t('منتهٍ','Expired'):t(`ينتهي خلال ${num(n)} يوم`,`Expires in ${n} days`),due:P.dayEnd(date(x)),sev:n<0?'overdue':'renewal',url:url(x)})}};
  exp('licenses',['ترخيص','License'],x=>x.renewal,x=>x.product,x=>x.renewal,x=>'#/m/licenses/'+x.id);
  exp('vendors',['عقد','Contract'],x=>x.status==='active'&&(scope==='team'||!x.owner||x.owner===me()),x=>x.title,x=>x.noticeDate||x.end,x=>'#/m/vendors/'+x.id);
  exp('cards',['بطاقة دخول','Access card'],x=>x.status==='active'&&x.expires,x=>x.number+' · '+x.holder,x=>x.expires,x=>'#/m/cards/'+x.id);
  for(const x of Store.all('stock').filter(x=>Number(x.quantity||0)<=Number(x.minimum||0)))add({key:'s:'+x.id+':'+x.quantity,kind:['المخزن','Store'],title:x.name,detail:Number(x.quantity||0)<=0?t('نفد من المخزن','Out of stock'):t('عند الحد الأدنى','At minimum level'),due:null,sev:'info',url:'#/m/stock/'+x.id});
  if(admin)for(const x of Store.all('leaves').filter(x=>x.status==='pending'))add({key:'lv:'+x.id,kind:['إجازة','Leave'],title:person(x.member)+' · '+fmtDate(x.start),detail:t('بانتظار المراجعة','Waiting for review'),due:null,sev:'info',url:'#/m/leaves/'+x.id});
  const rank={overdue:0,due:1,renewal:2,info:3};
  return out.sort((a,b)=>rank[a.sev]-rank[b.sev]||(a.due??Infinity)-(b.due??Infinity));
 }
 function noticeState(){return Store.get('notices',me())||{id:me(),read:{},dismissed:{}}}
 function unreadCount(){const s=noticeState();return alerts().filter(a=>!s.read?.[a.key]&&!s.dismissed?.[a.key]).length}
 async function markNotice(keys,field){const s=Store.clone(noticeState());s[field]={...(s[field]||{})};for(const k of keys)s[field][k]=Date.now();/* keep the state small */for(const f of ['read','dismissed'])s[f]=Object.fromEntries(Object.entries(s[f]||{}).sort((a,b)=>b[1]-a[1]).slice(0,600));await Store.save('notices',s)}
 /* Helpers the other views/ files use; not part of the public V interface. */
 return {alerts,unreadCount,_:{active,me,panel,more,kpi,noticeState,markNotice}};
})();
