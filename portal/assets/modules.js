/* Module definitions: fields, columns, filters and business rules for each register. */
window.M=(()=>{
 const {t,L,esc,num,money,omanDay,addDays,daysUntil,fmtDate,pill,person,addWorking,H,D}=P;
 const o=(v,ar,en,tone='')=>[v,ar,en,tone];
 const optLabel=(opts,v)=>{const x=(typeof opts==='function'?opts():opts).find(z=>z[0]===v);return x?(P.en()?x[2]:x[1]):(v||'—')};
 const optTone=(opts,v)=>{const x=(typeof opts==='function'?opts():opts).find(z=>z[0]===v);return x?.[3]||''};
 const today=()=>omanDay();
 const isAdmin=()=>Store.user?.role==='admin';

 /* ---------- Shared option lists ---------- */
 const PRIORITY=[o('critical','حرجة','Critical','solid'),o('high','عالية','High','warn'),o('normal','عادية','Normal','info'),o('low','منخفضة','Low','')];
 const LEVELS=[o('low','منخفض','Low'),o('medium','متوسط','Medium'),o('high','مرتفع','High')];
 const TICKET_STATUS=[o('open','مفتوح','Open','warn'),o('in-progress','قيد التنفيذ','In progress','info'),o('waiting','بانتظار معلومات','Waiting for information',''),o('resolved','تم الحل','Resolved','ok'),o('closed','مغلق','Closed',''),o('cancelled','ملغى','Cancelled','')];
 const CATEGORY=[o('hardware','الأجهزة','Hardware'),o('software','البرامج','Software'),o('network','الشبكة والاتصال','Network and connectivity'),o('email','البريد والتعاون','Email and collaboration'),o('access','الحسابات والصلاحيات','Accounts and access'),o('telephony','الهواتف','Telephony'),o('printing','الطباعة','Printing'),o('other','أخرى','Other')];
 const TYPES=[o('incident','بلاغ عطل','Incident'),o('request','طلب خدمة','Service request')];
 const CHANNEL=[o('portal','البوابة','Portal'),o('email','بريد إلكتروني','Email'),o('phone','هاتف','Phone'),o('in-person','مباشر','In person'),o('other','أخرى','Other')];
 const GROUPS=[o('New hardware','أجهزة جديدة','New hardware'),o('Hardware repair','إصلاح الأجهزة','Hardware repair'),o('Access requests','طلبات الصلاحيات','Access requests'),o('New software','برامج جديدة','New software'),o('Software repair','إصلاح البرامج','Software repair')];
 const members=()=>Store.all('members').filter(m=>m.active!==false).map(m=>[m.email,m.name||m.email,m.name||m.email]);
 const cats=()=>{const c=Store.all('categories').filter(x=>x.active!==false).sort((a,b)=>L([a.nameAr,a.nameEn]).localeCompare(L([b.nameAr,b.nameEn])));return c.length?c.map(x=>[x.id,x.nameAr,x.nameEn]):CATEGORY};
 const sopOpts=()=>Store.all('sops').filter(x=>x.active!==false).map(x=>[x.id,x.nameAr||x.nameEn,x.nameEn]);
 const adminRo=r=>!!r.id&&!isAdmin(),notAdmin=()=>!isAdmin();
 const lines=v=>String(v||'').split('\n').map(x=>x.trim()).filter(Boolean);
 function sopSteps(id){const s=Store.get('sops',id);if(!s)return [];const en=lines(s.stepsEn),ar=lines(s.stepsAr);return en.map((x,i)=>({id:Store.uid(),en:x,ar:ar[i]||x,done:false}))}
 const awaiting=x=>x.status==='resolved'&&!!x.closureRequestedAt;
 const terminal=x=>['resolved','closed','cancelled'].includes(x.status);

 /* ---------- Service desk rules ---------- */
 function priorityOf(impact,urgency){const n={low:1,medium:2,high:3}[impact||'medium']+{low:1,medium:2,high:3}[urgency||'medium'];return n===6?'critical':n===5?'high':n>=3?'normal':'low'}
 const DEFAULT_SLA={critical:[60,240],high:[120,480],normal:[480,960],low:[480,2400]};/* [response, resolution] working minutes */
 function slaDefaults(){const s=Store.get('settings','main')?.sla;const out={};for(const p of Object.keys(DEFAULT_SLA)){const v=s?.[p];out[p]=v&&v[0]>0&&v[1]>0?[Number(v[0]),Number(v[1])]:DEFAULT_SLA[p]}return out}
 function slaFor(x){const s=x.serviceId&&Store.get('catalog',x.serviceId);if(s)return [Number(s.responseMinutes)||480,Number(s.slaMinutes)||960];const d=slaDefaults();return d[x.priority]||d.normal}
 const autoCloseDays=()=>{const d=Number(Store.get('settings','main')?.autoCloseDays);return d>=1&&d<=30?d:3};
 function autoCloseAt(x){if(x.status!=='resolved')return NaN;if(x.closeOn)return P.dayEnd(x.closeOn);const r=Date.parse(x.resolvedAt);return Number.isFinite(r)?r+autoCloseDays()*D:NaN}
 function ticketTarget(x){const a=[x.targetAt,!x.firstResponseAt?x.responseTargetAt:''].filter(Boolean).map(Date.parse).filter(Number.isFinite);return a.length?Math.min(...a):NaN}
 function breached(x,now=Date.now()){return !terminal(x)&&ticketTarget(x)<now}
 function slaCell(x){
  if(terminal(x)){const late=x.targetAt&&x.resolvedAt&&Date.parse(x.resolvedAt)>Date.parse(x.targetAt);return `<span class="sla">${late?t('حُل متأخراً','Resolved late'):t('ضمن المدة','Met')}</span>`}
  const due=ticketTarget(x);if(!Number.isFinite(due))return '<span class="sla">—</span>';const d=due-Date.now();
  const which=!x.firstResponseAt&&x.responseTargetAt&&Date.parse(x.responseTargetAt)===due?t('الاستجابة','response'):t('الحل','resolution');
  if(d<0)return `<span class="sla breach" title="${esc(t('تجاوز موعد ','Missed ')+which)}">${t('متجاوز','Breached')} · ${P.short(d)}</span>`;
  return `<span class="sla ${d<4*H?'near':''}" title="${esc(t('الوقت المتبقي حتى موعد ','Time left to ')+which)}">${P.dur(d)}</span>`}
 function nextNumber(coll,prefix){const year=omanDay().slice(0,4),p=prefix+'-'+year+'-';const n=Store.all(coll).reduce((m,x)=>String(x.number||'').startsWith(p)?Math.max(m,Number(String(x.number).slice(p.length))||0):m,0)+1;return p+String(n).padStart(prefix==='SR'?5:3,'0')}

 /* ---------- Purchase request steps ---------- */
 const PR_STEPS=[['كتابة طلب تقديم العروض','Write the RFP',2],['إنشاء طلب الشراء','Create PR',1],['إرسال قائمة الموردين لسلسلة التوريد','Send supplier list to Supply Chain',0],['استلام العروض من سلسلة التوريد','Receive proposals from Supply Chain',14],['تقييم العروض','Evaluate proposals',3],['اعتماد التقييم','Evaluation approval',2],['استلام أمر الشراء','Receive PO from Supply Chain',2],['استلام الأصناف من المورد','Receive items from supplier','delivery'],['إكمال المشروع','Project completion','project'],['الدفع','Payment','payment']];
 function prStepDue(x,i){
  const kind=PR_STEPS[i][2],done=x.stageDone||{};
  if(kind==='delivery')return x.deliveryDue?P.dayEnd(x.deliveryDue):NaN;
  if(kind==='project')return x.projectDue?P.dayEnd(x.projectDue):NaN;
  if(kind==='payment')return x.invoiceDate?P.dayEnd(addDays(x.invoiceDate,x.supplierType==='sme'?14:45)):NaN;
  const prev=i===0?x.createdAt:done[i-1];if(!prev)return NaN;
  const ext=i===3&&x.tenderExtended?7:0;return P.dayEnd(addDays(omanDay(Date.parse(prev)),kind+ext));
 }
 const prStage=x=>{const d=x.stageDone||{};let i=0;while(i<PR_STEPS.length&&(d[i]||(x.skipped||{})[i]))i++;return i};

 /* ---------- Lifecycle default steps ---------- */
 const JOIN=[['إنشاء الحساب والبريد','Create account and email'],['تجهيز الجهاز وتسليمه','Prepare and hand over device'],['تخصيص التراخيص','Assign licenses'],['إصدار بطاقة الدخول','Issue access card'],['تخصيص الرقم الداخلي','Assign extension'],['منح الصلاحيات المطلوبة','Grant required access'],['التعريف بالخدمات والتسليم','Service orientation and handover']];
 const LEAVE=[['تأكيد موعد المغادرة','Confirm leaving date'],['إيقاف الحساب والوصول','Disable account and access'],['تسليم البريد والملفات حسب التوجيه','Hand over email and files as instructed'],['استرجاع الأجهزة والعهد','Recover devices and assets'],['تحرير التراخيص','Release licenses'],['استرجاع أو إيقاف بطاقة الدخول','Recover or suspend access card'],['تحرير الرقم الداخلي','Release extension'],['تأكيد التسليم النهائي','Confirm final handover']];
 const STEP_STATUS=[o('pending','لم يبدأ','Pending',''),o('in-progress','قيد التنفيذ','In progress','info'),o('blocked','متوقف','Blocked','crit'),o('done','مكتمل','Completed','ok'),o('na','غير مطلوب','Not applicable','')];

 /* ---------- Maintenance scheduling ---------- */
 function advance(ymd,freq,n){n=Math.max(1,Number(n)||1);const d=new Date(ymd+'T12:00:00Z');if(freq==='daily')return addDays(ymd,n);if(freq==='weekly')return addDays(ymd,7*n);const months=freq==='monthly'?n:freq==='quarterly'?3*n:12*n;const y=d.getUTCFullYear(),m=d.getUTCMonth()+months,day=d.getUTCDate(),last=new Date(Date.UTC(y,m+1,0)).getUTCDate();return new Date(Date.UTC(y,m,Math.min(day,last),12)).toISOString().slice(0,10)}


 /* ---------- Charge accounts and budgets ----------
    Spending is charged to a charge account (by code) in a budget year.
    Purchase requests: the estimate is committed (held) until the actual amount paid is entered or the PR is paid; then the paid amount is spent.
    Licences (cost), contracts (value) and assets (cost) are spent when recorded. */
 const SPEND=['prs','licenses','vendors','assets'];
 const thisYear=()=>Number(omanDay().slice(0,4));
 const yearOf=v=>{const y=Number(String(v||'').slice(0,4));return y>1990&&y<2200?y:NaN};
 const yearOpts=()=>{const y=thisYear(),set=new Set();for(let i=y-3;i<=y+2;i++)set.add(i);for(const b of Store.all('budgets'))if(yearOf(b.budgetYear))set.add(yearOf(b.budgetYear));return [...set].sort((a,b)=>b-a).map(v=>[String(v),String(v),String(v)])};
 function spendYear(coll,x){if(yearOf(x.budgetYear))return yearOf(x.budgetYear);for(const v of ({vendors:[x.start,x.createdAt],assets:[x.purchaseDate,x.createdAt]}[coll]||[x.createdAt])){const y=yearOf(v);if(y)return y}return thisYear()}
 const accountOpts=()=>Store.all('accounts').filter(x=>x.active!==false).sort((a,b)=>String(a.code).localeCompare(String(b.code))).map(x=>[x.code,x.code+' · '+(x.name||''),x.code+' · '+(x.name||'')]);
 const sameAcc=(a,b)=>String(a||'').trim().toLowerCase()===String(b||'').trim().toLowerCase()&&String(a||'').trim()!=='';
 function spendOf(coll,x){const n=v=>Number(v)||0;
  if(coll==='prs'){if(n(x.actualPaid)>0)return {spent:n(x.actualPaid),committed:0};if(prStage(x)>=PR_STEPS.length)return {spent:n(x.estimate),committed:0};return {spent:0,committed:n(x.estimate)}}
  return {spent:n({licenses:x.cost,vendors:x.value,assets:x.cost}[coll]),committed:0}}
 function accountLines(code,year){const out=[];for(const c of SPEND)for(const x of Store.all(c)){if(!sameAcc(x.chargeAccount,code))continue;const y=spendYear(c,x);if(year&&y!==Number(year))continue;const s=spendOf(c,x);if(s.spent||s.committed)out.push({coll:c,rec:x,year:y,...s})}return out}
 const budgetOf=(code,year)=>Store.all('budgets').filter(b=>sameAcc(b.account,code)&&yearOf(b.budgetYear)===Number(year)).reduce((s,b)=>s+(Number(b.amount)||0),0);
 function accountStatus(code,year){year=Number(year)||thisYear();const lines=accountLines(code,year),spent=lines.reduce((s,x)=>s+x.spent,0),committed=lines.reduce((s,x)=>s+x.committed,0),budget=budgetOf(code,year);return {year,budget,spent,committed,available:budget-spent-committed,used:budget?Math.round((spent+committed)/budget*100):(spent+committed?null:0),lines}}
 function budgetMeter(st){if(!st.budget)return st.spent+st.committed?pill(t('بدون ميزانية','No budget'),'warn'):'<span class="muted">—</span>';const sp=Math.min(100,st.spent/st.budget*100),cm=Math.min(100-sp,st.committed/st.budget*100),over=st.available<0;
  return `<div style="display:flex;align-items:center;gap:8px;min-width:150px" title="${esc(t('مصروف ','Spent ')+money(st.spent)+' · '+t('محجوز ','Committed ')+money(st.committed))}"><div class="meter" style="flex:1;display:flex"><i class="${over?'cr':st.used>=90?'hi':''}" style="width:${sp}%"></i><i style="width:${cm}%;opacity:.45" class="${over?'cr':'hi'}"></i></div><span class="mono" style="font-size:12px">${num(st.used)}%</span></div>`}
 const chargeFields=[{k:'chargeAccount',l:['حساب التكلفة','Charge account'],t:'select',opts:accountOpts,blank:true,hint:['يُخصم المبلغ من ميزانية هذا الحساب.','The amount is charged to this account’s budget.']},{k:'budgetYear',l:['سنة الميزانية','Budget year'],t:'select',opts:yearOpts,def:()=>String(thisYear())}];


 /* ---------- Annual leave balances ----------
    Each member gets an entitlement per year (plus days carried over). Approved annual leave is deducted;
    pending and planned annual leave is shown as booked. Days are working days (weekends and public holidays skipped)
    unless Settings say calendar days. */
 const leaveCfg=()=>{const s=Store.get('settings','main')||{},n=(v,d)=>v!==''&&v!=null&&Number(v)>=0?Number(v):d;return {days:n(s.leaveDays,30),mode:s.leaveCount==='calendar'?'calendar':'working',kinds:Array.isArray(s.leaveKinds)&&s.leaveKinds.length?s.leaveKinds:['annual'],accrual:s.leaveAccrual==='yearly'?'yearly':'monthly',monthly:n(s.leaveMonthly,2.5),auto:s.leaveAuto!==false,carryMax:n(s.leaveCarryMax,0)}};
 /* Months credited in a year: monthly accrual adds the monthly days on the 1st of each month (from the accrual start date, for new joiners). */
 function monthsCredited(year,from){const today_=omanDay(),y=Number(year),cy=Number(today_.slice(0,4));let first=1;if(from){const fy=Number(String(from).slice(0,4)),fm=Number(String(from).slice(5,7));if(fy>y)return 0;if(fy===y)first=fm||1}
  const last=y<cy?12:y>cy?0:Number(today_.slice(5,7));return Math.max(0,last-first+1)}
 function leaveDays(x,year){if(!x.start||!x.end||x.end<x.start)return 0;let a=x.start,b=x.end;if(year){const y=String(year);if(a<y+'-01-01')a=y+'-01-01';if(b>y+'-12-31')b=y+'-12-31';if(b<a)return 0}
  const cal=leaveCfg().mode==='working'?null:'calendar';let n=0;for(let d=a,i=0;d<=b&&i<800;d=addDays(d,1),i++)if(cal||P.isWorkDay(d))n++;return x.half&&n>0?n-0.5:n}
 const deducts=x=>leaveCfg().kinds.includes(x.kind||'annual');
 function leaveBalance(member,year){year=Number(year)||thisYear();const b=Store.all('balances').filter(z=>z.member===member&&Number(z.year)===year),cfg=leaveCfg();
  const entitled=b.reduce((s,z)=>s+(Number(z.entitled)||0),0),carried=b.reduce((s,z)=>s+(Number(z.carried)||0),0);
  let accrued=entitled,months=12,rate=0;
  if(cfg.accrual==='monthly'&&b.length){const z=b[0];rate=z.monthly!==''&&z.monthly!=null&&Number(z.monthly)>=0?Number(z.monthly):cfg.monthly;months=monthsCredited(year,z.accrueFrom);accrued=Math.min(entitled,Math.round(rate*months*100)/100)}
  const mine=Store.all('leaves').filter(x=>x.member===member&&deducts(x)&&x.start<=year+'-12-31'&&x.end>=year+'-01-01');
  const taken=mine.filter(x=>x.status==='approved').reduce((s,x)=>s+leaveDays(x,year),0),booked=mine.filter(x=>x.status==='pending'||x.status==='planned').reduce((s,x)=>s+leaveDays(x,year),0);
  const total=accrued+carried,full=entitled+carried;
  return {year,has:b.length>0,monthly:cfg.accrual==='monthly',rate,months,entitled,accrued,carried,total,full,taken,booked,remaining:total-taken,yearLeft:full-taken,after:total-taken-booked,leaves:mine}}
 /* Create missing balances for active members (Settings button, and automatically for administrators when "auto" is on).
    When the year already has balances, a newly added member starts earning from the day they were added. */
 async function createBalances(year,carryCap){const cfg=leaveCfg(),y=Number(year),now=new Date().toISOString(),by=Store.user?.email||'',existing=Store.all('balances').filter(b=>Number(b.year)===y),have=new Set(existing.map(b=>b.member));
  const list=Store.all('members').filter(m=>m.active!==false&&!have.has(m.email));if(!list.length)return 0;
  const add=list.map(m=>{const prev=leaveBalance(m.email,y-1),carried=carryCap&&prev.has?Math.max(0,Math.min(carryCap,prev.remaining)):0,joined=m.createdAt?omanDay(Date.parse(m.createdAt)):'';
   const rec={id:Store.uid(),member:m.email,year:String(y),entitled:cfg.accrual==='monthly'?Math.round(cfg.monthly*12*100)/100:cfg.days,carried,createdAt:now,createdBy:by,updatedAt:now,updatedBy:by};
   if(existing.length&&joined.startsWith(String(y)))rec.accrueFrom=joined;return rec});
  await Store.bulk('balances',items=>[...items,...add]);return add.length}
 const dnum=v=>num(v,Number.isInteger(Number(v))?0:1);


 /* ---------- Page access ----------
    Administrators see every page. Other members see every page unless an administrator chose "Only the pages I choose".
    The server applies the same rules to the data, so hidden pages cannot be read or changed. */
 const PAGE_PERMS=[o('tickets','طلبات الخدمة','Service desk (tickets)'),o('catalog','دليل الخدمات والفئات والإجراءات','Service catalog, categories and procedures'),o('kb','قاعدة المعرفة','Knowledge base'),o('tasks','المهام','Tasks'),o('holidays','تقويم العطلات','Holiday calendar'),
  o('prs','طلبات الشراء','Purchase requests'),o('accounts','حسابات التكلفة والميزانيات','Charge accounts and budgets'),o('licenses','التراخيص','Licences'),o('assets','الأصول التقنية','ICT assets'),o('stock','المخزن','Store'),o('vendors','الموردون والعقود','Vendors and contracts'),o('maintenance','الصيانة الدورية','Recurring maintenance'),
  o('leaves','إجازات الفريق والأرصدة','Team leave and leave balances'),o('cards','بطاقات الدخول','Access cards'),o('phones','الأرقام الداخلية','Telephone extensions'),o('lifecycle','انضمام ومغادرة الموظفين','Joiners and leavers'),
  o('management','لوحة الإدارة','Management dashboard'),o('reports','التقارير','Reports'),o('kpis','مؤشرات الأداء','KPIs'),o('members','أعضاء الفريق','Team members'),o('chat','المحادثة المباشرة','Live chat'),o('dashboard','تخصيص لوحة الرئيسية','Customize the Home dashboard')];
 const COLL_PERM={tickets:'tickets',catalog:'catalog',categories:'catalog',sops:'catalog',articles:'kb',tasks:'tasks',holidays:'holidays',prs:'prs',accounts:'accounts',budgets:'accounts',licenses:'licenses',assets:'assets',stock:'stock',movements:'stock',vendors:'vendors',maintenance:'maintenance',leaves:'leaves',balances:'leaves',cards:'cards',phones:'phones',lifecycle:'lifecycle',kpis:'kpis',members:'members'};
 function myPages(){const u=Store.user;if(!u)return [];if(u.role==='admin')return null;const m=Store.all('members').find(x=>x.email===u.email);if(m)return m.access==='custom'?(Array.isArray(m.pages)?m.pages:[]):null;return u.pages??null}
 const can=perm=>{if(!perm)return true;const p=myPages();return !p||p.includes(perm)};
 const canColl=coll=>can(COLL_PERM[coll]);

 /* ---------- Module list ---------- */
 const due=(ymd,warn=30)=>{if(!ymd)return '—';const n=daysUntil(ymd);const tone=n<0?'crit':n<=warn?'warn':'';return `<span class="nowrap">${fmtDate(ymd)}</span>${n<0?' '+pill(t('منتهٍ','Expired'),'crit'):n<=warn?' '+pill(num(n)+t(' يوم',' d'),tone):''}`};
 const yes=v=>v?t('نعم','Yes'):t('لا','No');

 const defs=[
 {id:'tickets',coll:'tickets',group:'desk',icon:'ticket',label:['طلبات الخدمة','Service desk'],one:['طلب','Ticket'],
  desc:['سجّل طلبات وبلاغات الموظفين، عيّن الفني، وتابع اتفاقية الخدمة حتى الإغلاق.','Log employee incidents and requests, assign a technician and track the SLA through to closure.'],
  fields:[
   {k:'number',l:['المرجع','Ref'],t:'text',ro:true,show:r=>!!r.number},
   {k:'title',l:['الموضوع','Subject'],t:'text',req:true,full:true},
   {k:'serviceId',l:['الخدمة من الدليل','Catalog service'],t:'select',ro:adminRo,opts:()=>Store.all('catalog').filter(s=>s.active!==false).sort((a,b)=>(a.group||'').localeCompare(b.group||'')||L([a.titleAr,a.titleEn]).localeCompare(L([b.titleAr,b.titleEn]))).map(s=>[s.id,s.titleAr,s.titleEn]),blank:true,full:true,hint:['يحدد الفئة ومدة اتفاقية الخدمة تلقائياً.','Sets the category and SLA automatically.']},
   {k:'type',l:['النوع','Type'],t:'select',opts:TYPES,def:'incident'},
   {k:'category',l:['الفئة','Category'],t:'select',opts:cats,def:'other',ro:adminRo},
   {k:'sopId',l:['إجراء العمل (SOP)','Procedure (SOP)'],t:'select',opts:sopOpts,blank:true,ro:adminRo,hint:['الخطوات التي يتبعها الفني.','The steps the technician follows.']},
   {k:'price',l:['السعر','Price'],t:'money',ro:notAdmin,show:r=>r.type==='request'||(r.price!==''&&r.price!=null),hint:['يُؤخذ من دليل الخدمات؛ يعدّله المسؤول.','Taken from the service catalog; administrators can change it.']},
   {k:'requesterName',l:['اسم الموظف','Employee name'],t:'text',req:true},
   {k:'department',l:['الإدارة','Department'],t:'text'},
   {k:'requesterEmail',l:['البريد','Email'],t:'email'},
   {k:'requesterPhone',l:['الهاتف','Phone'],t:'text'},
   {k:'location',l:['الموقع','Location'],t:'text'},
   {k:'assetTag',l:['رقم الأصل / الجهاز','Asset / device'],t:'text'},
   {k:'channel',l:['طريقة الاستلام','Received via'],t:'select',opts:CHANNEL,def:'phone'},
   {k:'impact',l:['التأثير','Impact'],t:'select',opts:LEVELS,def:'medium'},
   {k:'urgency',l:['الاستعجال','Urgency'],t:'select',opts:LEVELS,def:'medium'},
   {k:'priority',l:['الأولوية','Priority'],t:'select',opts:PRIORITY,ro:true,hint:['تُحسب من التأثير والاستعجال.','Calculated from impact and urgency.']},
   {k:'owner',l:['الفني المسؤول','Technician'],t:'select',opts:members,blank:true},
   {k:'status',l:['الحالة','Status'],t:'select',opts:TICKET_STATUS,def:'open'},
   {k:'responseTargetAt',l:['موعد الاستجابة','Response target'],t:'datetime',ro:notAdmin,show:r=>!!r.id},
   {k:'targetAt',l:['موعد الحل','Resolution target'],t:'datetime',ro:notAdmin,show:r=>!!r.id,hint:['يحدده المسؤول؛ يُحسب تلقائياً من الخدمة أو الأولوية.','Set by administrators; calculated from the service or priority.']},
   {k:'closeOn',l:['تاريخ الإغلاق','Closing date'],t:'date',ro:notAdmin,show:r=>r.status==='resolved'||!!r.closeOn,hint:['اتركه فارغاً ليُغلق تلقائياً بعد مدة الانتظار.','Leave empty to close automatically after the waiting period.']},
   {k:'details',l:['التفاصيل','Details'],t:'textarea',req:true,full:true},
   {k:'resolution',l:['الحل','Resolution'],t:'textarea',full:true,show:r=>['resolved','closed'].includes(r.status)},
  ],
  cols:[{k:'number',cls:'ref nowrap'},{k:'title',cls:'wrap'},{k:'priority'},{k:'requesterName'},{k:'owner'},{k:'status',render:x=>awaiting(x)?pill(t('بانتظار تأكيد الموظف','Awaiting requester'),'warn'):x.status==='closed'&&x.feedback?pill(t('مغلق','Closed'))+' <span class="mono" title="'+esc(t('تقييم الموظف','Requester rating'))+'">★'+num(x.feedback.rating)+'</span>':E.display(defs[0].fields.find(f=>f.k==='status'),x.status),sort:x=>x.status},{k:'sla',l:['اتفاقية الخدمة','SLA'],render:slaCell,sort:x=>terminal(x)?Infinity:ticketTarget(x)}],
  views:[
   {id:'active',l:['النشطة','Active'],f:x=>!terminal(x)},
   {id:'mine',l:['المسندة لي','Assigned to me'],f:x=>!terminal(x)&&x.owner===Store.user?.email},
   {id:'unassigned',l:['غير معيّنة','Unassigned'],f:x=>!terminal(x)&&!x.owner},
   {id:'overdue',l:['متجاوزة','Breached'],f:x=>breached(x)},
   {id:'waiting',l:['بانتظار معلومات','Waiting'],f:x=>x.status==='waiting'},
   {id:'confirm',l:['بانتظار الإغلاق','Awaiting closure'],f:x=>x.status==='resolved'},
   {id:'done',l:['محلولة ومغلقة','Resolved and closed'],f:x=>terminal(x)},
   {id:'all',l:['الكل','All'],f:()=>true}],
  filters:['priority','category','owner'],
  search:x=>[x.number,x.title,x.requesterName,x.department,x.assetTag,x.requesterEmail].join(' '),
  sort:(a,b)=>(terminal(a)-terminal(b))||((ticketTarget(a)||Infinity)-(ticketTarget(b)||Infinity)),
  title:x=>(x.number?x.number+' · ':'')+(x.title||''),
  kpis:rows=>{const act=rows.filter(x=>!terminal(x)),b=act.filter(x=>breached(x)),todayOpened=rows.filter(x=>x.createdAt&&omanDay(Date.parse(x.createdAt))===today()).length,todayClosed=rows.filter(x=>x.resolvedAt&&omanDay(Date.parse(x.resolvedAt))===today()).length;
   return [{l:['نشطة','Active'],v:act.length,view:'active'},{l:['غير معيّنة','Unassigned'],v:act.filter(x=>!x.owner).length,view:'unassigned',tone:act.some(x=>!x.owner)?'bad':''},{l:['متجاوزة','Breached'],v:b.length,view:'overdue',alert:b.length>0},{l:['بانتظار الإغلاق','Awaiting closure'],v:rows.filter(x=>x.status==='resolved').length,view:'confirm'},{l:['فُتحت اليوم','Opened today'],v:todayOpened},{l:['رضا الموظفين','Satisfaction'],v:(()=>{const f=rows.filter(x=>x.feedback?.rating);return f.length?num(f.reduce((s,x)=>s+Number(x.feedback.rating),0)/f.length,1)+' / 5':'—'})(),sub:(()=>{const f=rows.filter(x=>x.feedback?.rating).length,c=rows.filter(x=>x.status==='closed').length;return c?[`${num(f)} تقييم من ${num(c)} مغلق`,`${f} ratings from ${c} closed`]:''})()}]},
  prepare(r,old){
   const admin=isAdmin(),s=r.serviceId&&Store.get('catalog',r.serviceId);
   if(s&&(!old||old.serviceId!==r.serviceId)){r.category=s.category||r.category;r.type=s.type||r.type;if(s.sopId)r.sopId=s.sopId;if(s.price!==''&&s.price!=null)r.price=s.price}
   r.priority=priorityOf(r.impact,r.urgency);
   const now=new Date().toISOString(),setSla=start=>{const [resp,res]=slaFor(r);r.responseTargetAt=new Date(addWorking(start,resp)).toISOString();r.targetAt=new Date(addWorking(start,res)).toISOString()};
   if(!old){r.number=nextNumber('tickets','SR');setSla(Date.now())}
   else if(!admin){r.targetAt=old.targetAt;r.responseTargetAt=old.responseTargetAt}
   else if(r.targetAt!==old.targetAt||r.responseTargetAt!==old.responseTargetAt){r.slaManual=true}
   else if((old.priority!==r.priority||old.serviceId!==r.serviceId)&&!old.slaManual)setSla(Date.parse(old.createdAt)||Date.now());
   if(r.sopId&&(!old||old.sopId!==r.sopId))r.sopSteps=sopSteps(r.sopId);
   if(!r.sopId)r.sopSteps=[];
   if(old&&['resolved','closed'].includes(old.status)&&!['resolved','closed'].includes(r.status)){r.closureRequestedAt='';r.reopenCount=(Number(old.reopenCount)||0)+1}
   if(r.status==='resolved'&&old?.status!=='resolved')r.closureRequestedAt='';
   if(r.status==='closed'&&old?.status!=='closed')r.closedBy=Store.user?.email||'';
   if(!r.firstResponseAt&&old&&r.status!=='open')r.firstResponseAt=now;
   if(['resolved','closed'].includes(r.status)){if(!String(r.resolution||'').trim())throw Error(t('اكتب الحل قبل إغلاق الطلب.','Describe the resolution before resolving the ticket.'));if(!r.resolvedAt)r.resolvedAt=now;if(!r.firstResponseAt)r.firstResponseAt=now}
   else r.resolvedAt='';
   if(r.status==='closed'&&!r.closedAt)r.closedAt=now;if(r.status!=='closed')r.closedAt='';
   return r},
  deletable:isAdmin,extra:'ticketThread'},

 {id:'catalog',coll:'catalog',group:'desk',icon:'book',label:['دليل الخدمات','Service catalog'],one:['خدمة','Service'],
  desc:['الخدمات التي يطلبها الموظفون ومدد الاستجابة والحل المتفق عليها (يوم العمل = 8 ساعات).','Services employees can request, with agreed response and resolution times (one working day = 8 hours).'],
  fields:[{k:'titleEn',l:['الاسم بالإنجليزية','Name (English)'],t:'text',req:true},{k:'titleAr',l:['الاسم بالعربية','Name (Arabic)'],t:'text',req:true},
   {k:'group',l:['المجموعة','Group'],t:'select',opts:GROUPS,req:true},{k:'category',l:['الفئة','Category'],t:'select',opts:cats,def:'hardware'},{k:'type',l:['النوع','Type'],t:'select',opts:TYPES,def:'request'},
   {k:'sopId',l:['إجراء العمل (SOP)','Procedure (SOP)'],t:'select',opts:sopOpts,blank:true},{k:'price',l:['السعر','Price'],t:'money',hint:['يُنسخ إلى كل طلب جديد لهذه الخدمة.','Copied to every new ticket for this service.']},
   {k:'responseMinutes',l:['الاستجابة (أيام عمل)','Response (working days)'],t:'days',def:480},{k:'slaMinutes',l:['الحل (أيام عمل)','Resolution (working days)'],t:'days',def:960},
   {k:'active',l:['متاحة','Available'],t:'bool',def:true}],
  cols:[{k:'title',l:['الخدمة','Service'],render:x=>esc(L([x.titleAr,x.titleEn])),sort:x=>L([x.titleAr,x.titleEn])},{k:'group'},{k:'type'},{k:'responseMinutes'},{k:'slaMinutes'},{k:'price',cls:'num'},{k:'active'}],
  filters:['group','type'],views:[{id:'on',l:['المتاحة','Available'],f:x=>x.active!==false},{id:'all',l:['الكل','All'],f:()=>true}],
  search:x=>[x.titleAr,x.titleEn,x.group].join(' '),title:x=>L([x.titleAr,x.titleEn]),editable:isAdmin,
  prepare(r){if(Number(r.responseMinutes)>Number(r.slaMinutes))throw Error(t('مدة الاستجابة لا تتجاوز مدة الحل.','Response time cannot exceed resolution time.'));return r}},

 {id:'categories',coll:'categories',group:'desk',icon:'tag',label:['فئات الطلبات','Ticket categories'],one:['فئة','Category'],desc:['الفئات التي تُصنَّف بها الطلبات. يديرها المسؤول.','The categories tickets are filed under. Managed by administrators.'],
  fields:[{k:'nameEn',l:['الاسم بالإنجليزية','Name (English)'],t:'text',req:true},{k:'nameAr',l:['الاسم بالعربية','Name (Arabic)'],t:'text',req:true},{k:'active',l:['متاحة','Available'],t:'bool',def:true}],
  cols:[{k:'name',l:['الفئة','Category'],render:x=>esc(L([x.nameAr,x.nameEn])),sort:x=>L([x.nameAr,x.nameEn])},{k:'used',l:['طلبات مفتوحة','Open tickets'],cls:'num',render:x=>num(Store.all('tickets').filter(y=>y.category===x.id&&!terminal(y)).length)},{k:'active'}],
  search:x=>[x.nameEn,x.nameAr].join(' '),title:x=>L([x.nameAr,x.nameEn]),editable:isAdmin},
 {id:'sops',coll:'sops',group:'desk',icon:'list',label:['إجراءات العمل (SOP)','Procedures (SOP)'],one:['إجراء','Procedure'],desc:['خطوات العمل لكل نوع طلب. تُنسخ إلى الطلب ويؤشر عليها الفني.','Work steps for each kind of request. They are copied to the ticket and the technician ticks them off.'],
  fields:[{k:'nameEn',l:['الاسم بالإنجليزية','Name (English)'],t:'text',req:true},{k:'nameAr',l:['الاسم بالعربية','Name (Arabic)'],t:'text'},{k:'stepsEn',l:['الخطوات بالإنجليزية (خطوة في كل سطر)','Steps in English (one per line)'],t:'textarea',req:true,full:true},{k:'stepsAr',l:['الخطوات بالعربية (بنفس الترتيب)','Steps in Arabic (same order)'],t:'textarea',full:true},{k:'active',l:['متاح','Available'],t:'bool',def:true}],
  cols:[{k:'name',l:['الإجراء','Procedure'],render:x=>esc(L([x.nameAr||x.nameEn,x.nameEn])),sort:x=>x.nameEn},{k:'steps',l:['الخطوات','Steps'],cls:'num',render:x=>num(lines(x.stepsEn).length)},{k:'services',l:['خدمات تستخدمه','Services using it'],cls:'num',render:x=>num(Store.all('catalog').filter(y=>y.sopId===x.id).length)},{k:'active'}],
  search:x=>[x.nameEn,x.nameAr,x.stepsEn].join(' '),title:x=>L([x.nameAr||x.nameEn,x.nameEn]),editable:isAdmin,
  prepare(r){const ar=lines(r.stepsAr);if(ar.length&&ar.length!==lines(r.stepsEn).length)throw Error(t('عدد الخطوات العربية يجب أن يساوي الإنجليزية.','Use the same number of Arabic and English steps.'));return r}},

 {id:'tasks',coll:'tasks',group:'work',icon:'check',label:['المهام','Tasks'],one:['مهمة','Task'],desc:['مهام الفريق ومواعيدها ومسؤوليها.','Team tasks, owners and due dates.'],
  fields:[{k:'title',l:['المهمة','Task'],t:'text',req:true,full:true},{k:'assignee',l:['المسؤول','Owner'],t:'select',opts:members,blank:true,def:()=>Store.user?.email},{k:'priority',l:['الأولوية','Priority'],t:'select',opts:[o('high','عالية','High','warn'),o('normal','عادية','Normal','info'),o('low','منخفضة','Low','')],def:'normal'},
   {k:'due',l:['تاريخ الاستحقاق','Due date'],t:'date'},{k:'time',l:['الوقت','Time'],t:'time'},{k:'status',l:['الحالة','Status'],t:'select',opts:[o('todo','لم تبدأ','To do','warn'),o('in-progress','قيد التنفيذ','In progress','info'),o('done','مكتملة','Done','ok')],def:'todo'},{k:'notes',l:['ملاحظات','Notes'],t:'textarea',full:true}],
  cols:[{k:'title',cls:'wrap'},{k:'assignee'},{k:'priority'},{k:'due',render:x=>x.status==='done'?fmtDate(x.due):due(x.due,2)},{k:'status'}],
  views:[{id:'open',l:['المفتوحة','Open'],f:x=>x.status!=='done'},{id:'mine',l:['مهامي','Mine'],f:x=>x.status!=='done'&&x.assignee===Store.user?.email},{id:'late',l:['المتأخرة','Overdue'],f:x=>x.status!=='done'&&x.due&&x.due<today()},{id:'done',l:['المكتملة','Done'],f:x=>x.status==='done'},{id:'all',l:['الكل','All'],f:()=>true}],
  filters:['assignee','priority'],search:x=>[x.title,x.notes].join(' '),sort:(a,b)=>(a.status==='done')-(b.status==='done')||(a.due||'9').localeCompare(b.due||'9'),title:x=>x.title,
  kpis:rows=>{const open=rows.filter(x=>x.status!=='done');return [{l:['مفتوحة','Open'],v:open.length,view:'open'},{l:['متأخرة','Overdue'],v:open.filter(x=>x.due&&x.due<today()).length,view:'late',alert:open.some(x=>x.due&&x.due<today())},{l:['تستحق هذا الأسبوع','Due this week'],v:open.filter(x=>x.due&&x.due>=today()&&x.due<=addDays(today(),7)).length},{l:['مكتملة','Done'],v:rows.length-open.length,view:'done',tone:'good'}]},
  prepare(r){if(r.status==='done'&&!r.doneAt)r.doneAt=new Date().toISOString();if(r.status!=='done')r.doneAt='';return r}},

 {id:'prs',coll:'prs',group:'resources',icon:'cart',label:['طلبات الشراء','Purchase requests'],one:['طلب شراء','Purchase request'],desc:['متابعة طلبات الشراء خطوة بخطوة مع المواعيد والمسؤولين.','Track purchase requests step by step, with deadlines and owners.'],
  fields:[{k:'number',l:['المرجع','Ref'],t:'text',ro:true,show:r=>!!r.number},{k:'title',l:['العنوان','Title'],t:'text',req:true,full:true},{k:'owner',l:['المسؤول','Owner'],t:'select',opts:members,blank:true,def:()=>Store.user?.email},...chargeFields,
   {k:'estimate',l:['القيمة التقديرية','Estimated value'],t:'money',hint:['تُحجز من ميزانية الحساب حتى يُدخل المبلغ المدفوع.','Held against the account budget until the amount paid is entered.']},{k:'supplier',l:['المورد','Supplier'],t:'text'},{k:'supplierType',l:['نوع المورد','Supplier type'],t:'select',opts:[o('other','مورد آخر','Other supplier'),o('sme','مؤسسة صغيرة ومتوسطة','SME')],def:'other',hint:['الدفع خلال 14 يوماً للمؤسسات الصغيرة و45 يوماً لغيرها.','Payment due 14 days after invoice for SMEs, 45 for others.']},
   {k:'tenderExtended',l:['تمديد استلام العروض 7 أيام','Proposal period extended by 7 days'],t:'bool'},{k:'deliveryDue',l:['موعد التسليم (من أمر الشراء)','Delivery deadline (from PO)'],t:'date'},{k:'projectDue',l:['موعد إكمال المشروع','Project deadline'],t:'date'},{k:'invoiceDate',l:['تاريخ استلام الفاتورة','Invoice received'],t:'date'},{k:'actualPaid',l:['المبلغ المدفوع فعلياً','Actual amount paid'],t:'money',hint:['عند إدخاله يُخصم من الميزانية ويُفك الحجز.','Once entered, it is charged to the budget and the hold is released.']},{k:'notes',l:['ملاحظات','Notes'],t:'textarea',full:true}],
  cols:[{k:'number',cls:'ref nowrap'},{k:'title',cls:'wrap'},{k:'stage',l:['الخطوة الحالية','Current step'],render:x=>{const i=prStage(x);return i>=PR_STEPS.length?pill(t('مدفوع','Paid'),'ok'):esc(L(PR_STEPS[i]))},sort:x=>prStage(x)},{k:'stepdue',l:['موعد الخطوة','Step due'],render:x=>{const i=prStage(x);if(i>=PR_STEPS.length)return '—';const d=prStepDue(x,i);if(!Number.isFinite(d))return `<span class="muted">${t('بانتظار التاريخ','Needs a date')}</span>`;const left=d-Date.now();return left<0?`<span class="sla breach">${t('متأخر','Overdue')} · ${P.short(left)}</span>`:`<span class="sla ${left<2*D?'near':''}">${fmtDate(omanDay(d))}</span>`},sort:x=>prStepDue(x,prStage(x))||Infinity},{k:'owner'},{k:'estimate',cls:'num'}],
  views:[{id:'open',l:['الجارية','In progress'],f:x=>prStage(x)<PR_STEPS.length},{id:'late',l:['متأخرة','Overdue'],f:x=>{const i=prStage(x);return i<PR_STEPS.length&&prStepDue(x,i)<Date.now()}},{id:'paid',l:['مدفوعة','Paid'],f:x=>prStage(x)>=PR_STEPS.length},{id:'all',l:['الكل','All'],f:()=>true}],
  filters:['owner','chargeAccount'],search:x=>[x.number,x.title,x.supplier,x.chargeAccount].join(' '),title:x=>(x.number?x.number+' · ':'')+x.title,
  kpis:rows=>{const open=rows.filter(x=>prStage(x)<PR_STEPS.length),late=open.filter(x=>prStepDue(x,prStage(x))<Date.now());return [{l:['جارية','In progress'],v:open.length,view:'open'},{l:['خطوات متأخرة','Overdue steps'],v:late.length,view:'late',alert:late.length>0},{l:['القيمة الجارية','Open value'],v:money(open.reduce((s,x)=>s+(Number(x.estimate)||0),0))},{l:['مدفوعة','Paid'],v:rows.length-open.length,view:'paid',tone:'good'}]},
  prepare(r,old){if(!old)r.number=nextNumber('prs','PR');r.stageDone=r.stageDone||{};return r},extra:'prSteps'},

 {id:'licenses',coll:'licenses',group:'resources',icon:'key',label:['التراخيص','Licenses'],one:['ترخيص','License'],desc:['المقاعد المشتراة والمخصصة والمتاحة، والتكاليف والتجديدات.','Purchased, assigned and available seats, costs and renewals.'],
  fields:[{k:'product',l:['المنتج','Product'],t:'text',req:true},{k:'vendor',l:['المجموعة / المورد','Group / vendor'],t:'text',req:true},{k:'licenseType',l:['نوع الترخيص','License type'],t:'select',opts:[o('subscription','اشتراك','Subscription'),o('annual','سنوي','Annual'),o('perpetual','دائم','Perpetual')],def:'subscription'},
   {k:'quantity',l:['العدد المشترى','Purchased'],t:'number',req:true},{k:'assigned',l:['المخصص','Assigned'],t:'number',def:0},{k:'expired',l:['المنتهي','Expired'],t:'number',def:0},{k:'cost',l:['التكلفة','Cost'],t:'money'},{k:'renewal',l:['تاريخ التجديد','Renewal date'],t:'date'},
   {k:'priority',l:['الأهمية','Priority'],t:'select',opts:[o('mandate','إلزامي','Mandate','crit'),o('important','مهم','Important','warn'),o('optional','اختياري','Optional','')],def:'important'},{k:'reference',l:['المرجع','Reference'],t:'text'},...chargeFields,{k:'notes',l:['ملاحظات','Notes'],t:'textarea',full:true}],
  cols:[{k:'product',cls:'wrap'},{k:'vendor'},{k:'use',l:['الاستخدام','Use'],render:x=>{const u=util(x);return u==null?'—':`<div style="display:flex;align-items:center;gap:8px;min-width:150px"><div class="meter" style="flex:1"><i class="${u>=90?'cr':u>=75?'hi':''}" style="width:${Math.min(100,u)}%"></i></div><span class="mono" style="font-size:12px">${num(x.assigned)}/${num(usable(x))}</span></div>`},sort:x=>util(x)??-1},{k:'available',l:['المتاح','Available'],render:x=>num(Math.max(0,usable(x)-Number(x.assigned||0))),cls:'num',sort:x=>usable(x)-Number(x.assigned||0)},{k:'renewal',render:x=>due(x.renewal)},{k:'cost',cls:'num'}],
  views:[{id:'all',l:['الكل','All'],f:()=>true},{id:'soon',l:['تجديد خلال 30 يوماً','Renewing in 30 days'],f:x=>x.renewal&&daysUntil(x.renewal)<=30},{id:'high',l:['استخدام 90%+','90%+ used'],f:x=>util(x)>=90},{id:'low',l:['استخدام أقل من 50%','Under 50% used'],f:x=>util(x)!=null&&util(x)<50}],
  filters:['vendor','licenseType'],search:x=>[x.product,x.vendor,x.reference].join(' '),title:x=>x.product,
  kpis:rows=>{const q=rows.reduce((s,x)=>s+usable(x),0),a=rows.reduce((s,x)=>s+Number(x.assigned||0),0);return [{l:['المنتجات','Products'],v:rows.length},{l:['المقاعد القابلة للاستخدام','Usable seats'],v:num(q)},{l:['نسبة الاستخدام','Utilization'],v:q?num(a/q*100,0)+'%':'—'},{l:['تجديد خلال 30 يوماً','Renewing in 30 days'],v:rows.filter(x=>x.renewal&&daysUntil(x.renewal)<=30).length,view:'soon',alert:rows.some(x=>x.renewal&&daysUntil(x.renewal)<0)},{l:['التكلفة المسجلة','Recorded cost'],v:money(rows.reduce((s,x)=>s+(Number(x.cost)||0),0))}]},
  prepare(r){if(Number(r.assigned||0)+Number(r.expired||0)>Number(r.quantity||0))throw Error(t('المخصص والمنتهي أكثر من العدد المشترى.','Assigned plus expired is more than purchased.'));return r},extra:'budgetCheck'},

 {id:'assets',coll:'assets',group:'resources',icon:'monitor',label:['الأصول التقنية','ICT assets'],one:['أصل','Asset'],desc:['سجل الأجهزة والمعدات، المستخدم الحالي، الحالة والضمان.','Devices and equipment, current user, condition and warranty.'],
  fields:[{k:'tag',l:['رقم الأصل','Asset tag'],t:'text',req:true},{k:'category',l:['الفئة','Category'],t:'select',opts:[o('laptop','حاسوب محمول','Laptop'),o('desktop','حاسوب مكتبي','Desktop'),o('monitor','شاشة','Monitor'),o('printer','طابعة','Printer'),o('phone','هاتف','Phone'),o('server','خادم','Server'),o('network','معدات شبكة','Network'),o('other','أخرى','Other')],def:'laptop'},
   {k:'model',l:['الطراز','Model'],t:'text'},{k:'serial',l:['الرقم التسلسلي','Serial number'],t:'text'},{k:'status',l:['الحالة','Status'],t:'select',opts:[o('available','متاح','Available','ok'),o('assigned','مسلّم','Assigned','info'),o('repair','قيد الإصلاح','In repair','warn'),o('retired','مستبعد','Retired','')],def:'available'},
   {k:'assignedTo',l:['مسلّم إلى','Assigned to'],t:'text',show:r=>r.status==='assigned'},{k:'department',l:['الإدارة','Department'],t:'text'},{k:'location',l:['الموقع','Location'],t:'text'},{k:'purchaseDate',l:['تاريخ الشراء','Purchase date'],t:'date'},{k:'warrantyEnd',l:['نهاية الضمان','Warranty end'],t:'date'},{k:'cost',l:['التكلفة','Cost'],t:'money'},...chargeFields,{k:'notes',l:['ملاحظات','Notes'],t:'textarea',full:true}],
  cols:[{k:'tag',cls:'ref nowrap'},{k:'category'},{k:'model',cls:'wrap'},{k:'status'},{k:'assignedTo'},{k:'location'},{k:'warrantyEnd',render:x=>x.status==='retired'?fmtDate(x.warrantyEnd):due(x.warrantyEnd,60)}],
  views:[{id:'all',l:['الكل','All'],f:x=>x.status!=='retired'},{id:'available',l:['المتاحة','Available'],f:x=>x.status==='available'},{id:'repair',l:['قيد الإصلاح','In repair'],f:x=>x.status==='repair'},{id:'warranty',l:['ضمان ينتهي خلال 60 يوماً','Warranty ending in 60 days'],f:x=>x.status!=='retired'&&x.warrantyEnd&&daysUntil(x.warrantyEnd)<=60},{id:'retired',l:['المستبعدة','Retired'],f:x=>x.status==='retired'}],
  filters:['category','location'],search:x=>[x.tag,x.model,x.serial,x.assignedTo,x.department,x.location].join(' '),title:x=>x.tag+(x.model?' · '+x.model:''),
  kpis:rows=>{const live=rows.filter(x=>x.status!=='retired');return [{l:['الأصول','Assets'],v:live.length,view:'all'},{l:['مسلّمة','Assigned'],v:live.filter(x=>x.status==='assigned').length},{l:['متاحة','Available'],v:live.filter(x=>x.status==='available').length,view:'available',tone:'good'},{l:['قيد الإصلاح','In repair'],v:live.filter(x=>x.status==='repair').length,view:'repair'},{l:['ضمان ينتهي قريباً','Warranty ending'],v:live.filter(x=>x.warrantyEnd&&daysUntil(x.warrantyEnd)<=60).length,view:'warranty'}]},
  prepare(r,old){const dup=Store.all('assets').find(x=>x.tag?.toLowerCase()===String(r.tag).trim().toLowerCase()&&x.id!==r.id);if(dup)throw Error(t('رقم الأصل مستخدم من قبل.','This asset tag is already in use.'));if(r.status!=='assigned')r.assignedTo='';return r},extra:'budgetCheck'},

 {id:'stock',coll:'stock',group:'resources',icon:'box',label:['المخزن','Store'],one:['صنف','Item'],desc:['أصناف المخزن والكميات والحد الأدنى، مع سجل الصرف والاستلام.','Store items, quantities and minimum levels, with issue and receipt history.'],
  fields:[{k:'sku',l:['رمز الصنف','Item code'],t:'text',req:true},{k:'name',l:['الصنف','Item'],t:'text',req:true},{k:'category',l:['الفئة','Category'],t:'text'},{k:'unit',l:['الوحدة','Unit'],t:'text',def:'pcs'},{k:'quantity',l:['الكمية الحالية','Quantity on hand'],t:'number',def:0,ro:r=>!!r.id,hint:['تتغير من خلال الاستلام والصرف بعد الحفظ.','After saving, change it with Receive and Issue.']},{k:'minimum',l:['الحد الأدنى','Minimum level'],t:'number',def:0},{k:'location',l:['مكان التخزين','Storage location'],t:'text'}],
  cols:[{k:'sku',cls:'ref nowrap'},{k:'name',cls:'wrap'},{k:'category'},{k:'quantity',cls:'num',render:x=>`<b class="mono">${num(x.quantity)}</b> <span class="muted">${esc(x.unit||'')}</span>`},{k:'minimum',cls:'num'},{k:'level',l:['المستوى','Level'],render:x=>{const q=Number(x.quantity||0),m=Number(x.minimum||0);return q<=0?pill(t('نفد','Out of stock'),'crit'):q<=m?pill(t('منخفض','Low'),'warn'):pill(t('جيد','OK'),'ok')},sort:x=>Number(x.quantity||0)-Number(x.minimum||0)}],
  views:[{id:'all',l:['الكل','All'],f:()=>true},{id:'low',l:['عند الحد الأدنى أو أقل','At or below minimum'],f:x=>Number(x.quantity||0)<=Number(x.minimum||0)}],
  filters:['category'],search:x=>[x.sku,x.name,x.category,x.location].join(' '),title:x=>x.name,
  kpis:rows=>[{l:['الأصناف','Items'],v:rows.length},{l:['منخفضة','Low'],v:rows.filter(x=>Number(x.quantity||0)>0&&Number(x.quantity||0)<=Number(x.minimum||0)).length,view:'low'},{l:['نفدت','Out of stock'],v:rows.filter(x=>Number(x.quantity||0)<=0).length,view:'low',alert:rows.some(x=>Number(x.quantity||0)<=0)}],
  prepare(r){const dup=Store.all('stock').find(x=>x.sku?.toLowerCase()===String(r.sku).trim().toLowerCase()&&x.id!==r.id);if(dup)throw Error(t('رمز الصنف مستخدم من قبل.','This item code is already in use.'));return r},extra:'stockMoves'},

 {id:'vendors',coll:'vendors',group:'resources',icon:'file',label:['الموردون والعقود','Vendors and contracts'],one:['عقد','Contract'],desc:['عقود الدعم والتراخيص والخدمات ومواعيد الإشعار والتجديد.','Support, license and service contracts, with notice and renewal dates.'],
  fields:[{k:'title',l:['العقد','Contract'],t:'text',req:true,full:true},{k:'supplier',l:['المورد','Supplier'],t:'text',req:true},{k:'kind',l:['النوع','Type'],t:'select',opts:[o('support','دعم وصيانة','Support and maintenance'),o('license','تراخيص','Licensing'),o('service','خدمات','Services'),o('lease','إيجار','Lease'),o('other','أخرى','Other')],def:'support'},{k:'owner',l:['المسؤول','Owner'],t:'select',opts:members,blank:true},
   {k:'start',l:['البداية','Start'],t:'date'},{k:'end',l:['النهاية','End'],t:'date',req:true},{k:'noticeDate',l:['آخر موعد للإشعار','Notice deadline'],t:'date'},{k:'value',l:['القيمة','Value'],t:'money'},{k:'contact',l:['جهة الاتصال لدى المورد','Supplier contact'],t:'text'},{k:'status',l:['الحالة','Status'],t:'select',opts:[o('active','ساري','Active','ok'),o('ended','منتهٍ','Ended','')],def:'active'},...chargeFields,{k:'notes',l:['ملاحظات','Notes'],t:'textarea',full:true}],
  cols:[{k:'title',cls:'wrap'},{k:'supplier'},{k:'kind'},{k:'owner'},{k:'end',render:x=>x.status==='active'?due(x.end,60):fmtDate(x.end)},{k:'value',cls:'num'},{k:'status'}],
  views:[{id:'active',l:['السارية','Active'],f:x=>x.status==='active'},{id:'soon',l:['تنتهي خلال 60 يوماً','Ending in 60 days'],f:x=>x.status==='active'&&daysUntil(x.end)<=60},{id:'all',l:['الكل','All'],f:()=>true}],
  filters:['kind','owner'],search:x=>[x.title,x.supplier,x.contact].join(' '),title:x=>x.title,
  kpis:rows=>{const a=rows.filter(x=>x.status==='active');return [{l:['سارية','Active'],v:a.length,view:'active'},{l:['تنتهي خلال 60 يوماً','Ending in 60 days'],v:a.filter(x=>daysUntil(x.end)<=60).length,view:'soon',alert:a.some(x=>daysUntil(x.end)<0)},{l:['القيمة السنوية المسجلة','Recorded value'],v:money(a.reduce((s,x)=>s+(Number(x.value)||0),0))}]},extra:'budgetCheck'},

 {id:'maintenance',coll:'maintenance',group:'resources',icon:'wrench',label:['الصيانة الدورية','Recurring maintenance'],one:['خطة صيانة','Maintenance plan'],desc:['خطط صيانة متكررة بقائمة تحقق، وسجل كل تنفيذ.','Recurring maintenance plans with a checklist and a record of every run.'],
  fields:[{k:'title',l:['الخطة','Plan'],t:'text',req:true,full:true},{k:'owner',l:['الفني','Technician'],t:'select',opts:members,blank:true},{k:'assetTag',l:['الأصل المرتبط','Related asset'],t:'text'},{k:'frequency',l:['التكرار','Repeats'],t:'select',opts:[o('daily','يومياً','Daily'),o('weekly','أسبوعياً','Weekly'),o('monthly','شهرياً','Monthly'),o('quarterly','ربع سنوي','Quarterly'),o('yearly','سنوياً','Yearly')],def:'monthly'},{k:'interval',l:['كل','Every'],t:'number',def:1},
   {k:'nextDue',l:['الموعد القادم','Next due'],t:'date',req:true},{k:'status',l:['الحالة','Status'],t:'select',opts:[o('active','نشطة','Active','ok'),o('paused','موقوفة','Paused','')],def:'active'},{k:'checklist',l:['قائمة التحقق (بند في كل سطر)','Checklist (one item per line)'],t:'textarea',full:true}],
  cols:[{k:'title',cls:'wrap'},{k:'owner'},{k:'frequency'},{k:'nextDue',render:x=>x.status==='active'?due(x.nextDue,7):fmtDate(x.nextDue)},{k:'lastRun',l:['آخر تنفيذ','Last run'],render:x=>{const r=(x.runs||[]).at(-1);return r?fmtDate(r.at):'—'}},{k:'status'}],
  views:[{id:'active',l:['النشطة','Active'],f:x=>x.status==='active'},{id:'due',l:['مستحقة خلال 7 أيام','Due in 7 days'],f:x=>x.status==='active'&&daysUntil(x.nextDue)<=7},{id:'all',l:['الكل','All'],f:()=>true}],
  filters:['owner','frequency'],search:x=>[x.title,x.assetTag,x.checklist].join(' '),title:x=>x.title,
  kpis:rows=>{const a=rows.filter(x=>x.status==='active');return [{l:['خطط نشطة','Active plans'],v:a.length,view:'active'},{l:['مستحقة خلال 7 أيام','Due in 7 days'],v:a.filter(x=>daysUntil(x.nextDue)<=7&&daysUntil(x.nextDue)>=0).length,view:'due'},{l:['متأخرة','Overdue'],v:a.filter(x=>daysUntil(x.nextDue)<0).length,view:'due',alert:a.some(x=>daysUntil(x.nextDue)<0)}]},extra:'maintRun'},

 {id:'accounts',coll:'accounts',group:'resources',icon:'wallet',label:['حسابات التكلفة','Charge accounts'],one:['حساب تكلفة','Charge account'],desc:['حسابات التكلفة وميزانية كل سنة، وما صُرف وما هو محجوز منها.','Charge accounts with a budget for each year, and how much is spent and held.'],
  fields:[{k:'code',l:['رمز الحساب','Account code'],t:'text',req:true},{k:'name',l:['اسم الحساب','Account name'],t:'text',req:true},{k:'department',l:['الإدارة / القسم','Department'],t:'text'},{k:'owner',l:['المسؤول عن الميزانية','Budget owner'],t:'select',opts:members,blank:true},{k:'active',l:['متاح للاختيار','Available to choose'],t:'bool',def:true},{k:'notes',l:['ملاحظات','Notes'],t:'textarea',full:true}],
  cols:[{k:'code',cls:'ref nowrap'},{k:'name',cls:'wrap'},{k:'department'},
   {k:'_budget',l:[`الميزانية`,`Budget`],cls:'num',render:x=>money(accountStatus(x.code).budget),sort:x=>accountStatus(x.code).budget},
   {k:'_spent',l:['المصروف','Spent'],cls:'num',render:x=>money(accountStatus(x.code).spent),sort:x=>accountStatus(x.code).spent},
   {k:'_committed',l:['المحجوز','Committed'],cls:'num',render:x=>money(accountStatus(x.code).committed),sort:x=>accountStatus(x.code).committed},
   {k:'_available',l:['المتاح','Available'],cls:'num',render:x=>{const a=accountStatus(x.code).available;return a<0?`<b style="color:var(--crit)">${esc(money(a))}</b>`:esc(money(a))},sort:x=>accountStatus(x.code).available},
   {k:'_used',l:['المستخدم (هذه السنة)','Used (this year)'],render:x=>budgetMeter(accountStatus(x.code)),sort:x=>accountStatus(x.code).used??999}],
  views:[{id:'active',l:['المتاحة','Available'],f:x=>x.active!==false},{id:'over',l:['تجاوزت الميزانية','Over budget'],f:x=>accountStatus(x.code).available<0},{id:'all',l:['الكل','All'],f:()=>true}],
  filters:['department','owner'],search:x=>[x.code,x.name,x.department].join(' '),title:x=>x.code+' · '+x.name,editable:isAdmin,
  kpis:rows=>{const st=rows.map(x=>accountStatus(x.code)),sum=k=>st.reduce((s,x)=>s+x[k],0),y=thisYear();return [{l:[`ميزانية ${y}`,`${y} budget`],v:money(sum('budget'))},{l:['المصروف','Spent'],v:money(sum('spent'))},{l:['المحجوز','Committed'],v:money(sum('committed'))},{l:['المتاح','Available'],v:money(sum('available')),tone:sum('available')>=0?'good':'',alert:sum('available')<0},{l:['تجاوزت الميزانية','Over budget'],v:st.filter(x=>x.available<0).length,view:'over',alert:st.some(x=>x.available<0)}]},
  prepare(r,old){r.code=String(r.code||'').trim().toUpperCase();if(!/^[A-Z0-9][A-Z0-9 ._\/-]{0,39}$/.test(r.code))throw Error(t('استخدم حروفاً إنجليزية وأرقاماً في رمز الحساب.','Use letters, numbers, dots, dashes or slashes in the account code.'));
   if(Store.all('accounts').some(x=>x.id!==r.id&&sameAcc(x.code,r.code)))throw Error(t('رمز الحساب مستخدم من قبل.','This account code is already in use.'));
   if(old&&!sameAcc(old.code,r.code)){const n=accountLines(old.code).length+Store.all('budgets').filter(b=>sameAcc(b.account,old.code)).length;if(n)throw Error(t(`لا يمكن تغيير الرمز لأنه مستخدم في ${num(n)} سجل.`,`The code cannot change because ${n} records use it. Add a new account instead.`))}return r},extra:'accountBudget'},

 {id:'budgets',coll:'budgets',group:'resources',icon:'chart',label:['الميزانيات','Budgets'],one:['ميزانية','Budget'],desc:['ميزانية كل حساب تكلفة لكل سنة.','The budget of each charge account for each year.'],
  fields:[{k:'account',l:['حساب التكلفة','Charge account'],t:'select',opts:accountOpts,req:true},{k:'budgetYear',l:['السنة','Year'],t:'select',opts:yearOpts,req:true,def:()=>String(thisYear())},{k:'amount',l:['مبلغ الميزانية','Budget amount'],t:'money',req:true},{k:'notes',l:['ملاحظات','Notes'],t:'textarea',full:true}],
  cols:[{k:'account'},{k:'budgetYear',cls:'nowrap'},{k:'amount',cls:'num'},
   {k:'_spent',l:['المصروف','Spent'],cls:'num',render:x=>money(accountStatus(x.account,x.budgetYear).spent),sort:x=>accountStatus(x.account,x.budgetYear).spent},
   {k:'_committed',l:['المحجوز','Committed'],cls:'num',render:x=>money(accountStatus(x.account,x.budgetYear).committed),sort:x=>accountStatus(x.account,x.budgetYear).committed},
   {k:'_available',l:['المتاح','Available'],cls:'num',render:x=>{const a=accountStatus(x.account,x.budgetYear).available;return a<0?`<b style="color:var(--crit)">${esc(money(a))}</b>`:esc(money(a))},sort:x=>accountStatus(x.account,x.budgetYear).available},
   {k:'_used',l:['المستخدم','Used'],render:x=>budgetMeter(accountStatus(x.account,x.budgetYear)),sort:x=>accountStatus(x.account,x.budgetYear).used??999}],
  views:[{id:'year',l:['هذه السنة','This year'],f:x=>yearOf(x.budgetYear)===thisYear()},{id:'all',l:['الكل','All'],f:()=>true}],
  filters:['account','budgetYear'],search:x=>[x.account,x.budgetYear,x.notes].join(' '),title:x=>x.account+' · '+x.budgetYear,editable:isAdmin,
  kpis:rows=>{const y=rows.filter(x=>yearOf(x.budgetYear)===thisYear());return [{l:['ميزانيات هذه السنة','Budgets this year'],v:y.length,view:'year'},{l:['المجموع','Total'],v:money(y.reduce((s,x)=>s+(Number(x.amount)||0),0))}]},
  prepare(r){r.budgetYear=String(r.budgetYear);if(!(Number(r.amount)>=0))throw Error(t('أدخل مبلغاً صحيحاً.','Enter a valid amount.'));if(Store.all('budgets').some(x=>x.id!==r.id&&sameAcc(x.account,r.account)&&String(x.budgetYear)===r.budgetYear))throw Error(t('توجد ميزانية لهذا الحساب في هذه السنة. عدّلها بدلاً من إضافة أخرى.','This account already has a budget for that year. Change it instead of adding another.'));return r}},

 {id:'leaves',coll:'leaves',group:'people',icon:'sun',label:['إجازات الفريق','Team leave'],one:['إجازة','Leave'],desc:['إجازات الفريق والبديل والمراجعة، مع التنبيه عند التداخل.','Team leave, cover and review, with overlap warnings.'],
  fields:[{k:'member',l:['عضو الفريق','Team member'],t:'select',opts:members,req:true,def:()=>Store.user?.email},{k:'kind',l:['النوع','Type'],t:'select',opts:[o('annual','سنوية','Annual'),o('sick','مرضية','Sick'),o('emergency','طارئة','Emergency'),o('training','تدريب','Training'),o('other','أخرى','Other')],def:'annual'},{k:'start',l:['من','From'],t:'date',req:true},{k:'end',l:['إلى','To'],t:'date',req:true},{k:'half',l:['نصف يوم (يُخصم نصف يوم)','Includes a half day (deduct half a day)'],t:'bool'},{k:'cover',l:['البديل','Cover'],t:'select',opts:members,blank:true},{k:'status',l:['الحالة','Status'],t:'select',opts:[o('planned','مخططة','Planned',''),o('pending','بانتظار المراجعة','Pending review','warn'),o('approved','معتمدة','Approved','ok'),o('declined','مرفوضة','Declined','crit')],def:'pending'},{k:'notes',l:['ملاحظات','Notes'],t:'textarea',full:true}],
  cols:[{k:'member'},{k:'kind'},{k:'start'},{k:'end'},{k:'days',l:['الأيام','Days'],cls:'num',render:x=>dnum(leaveDays(x)),sort:x=>leaveDays(x)},{k:'left',l:['الرصيد المتبقي','Balance left'],cls:'num',render:x=>{if(!deducts(x))return '<span class="muted">—</span>';const y=Number(String(x.start).slice(0,4)),b=leaveBalance(x.member,y);return b.has?(b.remaining<0?`<b style="color:var(--crit)">${dnum(b.remaining)}</b>`:dnum(b.remaining)):'<span class="muted">—</span>'}},{k:'cover'},{k:'status'}],
  views:[{id:'upcoming',l:['الحالية والقادمة','Current and upcoming'],f:x=>x.end>=today()&&x.status!=='declined'},{id:'pending',l:['بانتظار المراجعة','Pending review'],f:x=>x.status==='pending'},{id:'all',l:['الكل','All'],f:()=>true}],
  filters:['member','kind'],search:x=>[P.person(x.member),x.notes].join(' '),sort:(a,b)=>(a.start||'').localeCompare(b.start||''),title:x=>P.person(x.member)+' · '+fmtDate(x.start),
  kpis:rows=>{const now=today();return [{l:['غائبون اليوم','Away today'],v:rows.filter(x=>x.status!=='declined'&&x.start<=now&&x.end>=now).length},{l:['بانتظار المراجعة','Pending review'],v:rows.filter(x=>x.status==='pending').length,view:'pending'},{l:['قادمة خلال 30 يوماً','Starting in 30 days'],v:rows.filter(x=>x.status!=='declined'&&x.start>now&&x.start<=addDays(now,30)).length},...(()=>{const b=leaveBalance(Store.user?.email);return b.has?[{l:[`رصيدك ${b.year}`,`Your ${b.year} balance`],v:dnum(b.remaining)+t(' يوم',' days'),sub:[`من ${dnum(b.total)} · محجوز ${dnum(b.booked)}`,`of ${dnum(b.total)} · ${dnum(b.booked)} booked`],tone:b.remaining<0?'bad':''}]:[]})()]},
  prepare(r){if(r.end<r.start)throw Error(t('تاريخ النهاية قبل البداية.','The end date is before the start date.'));if(r.cover&&r.cover===r.member)throw Error(t('اختر بديلاً غير صاحب الإجازة.','Choose a cover other than the person on leave.'));if(r.cover){const busy=Store.all('leaves').some(x=>x.id!==r.id&&x.member===r.cover&&x.status!=='declined'&&x.start<=r.end&&x.end>=r.start);if(busy)throw Error(t('البديل في إجازة خلال نفس الفترة.','The cover is on leave during these dates.'))}if(r.status==='declined'&&!String(r.notes||'').trim())throw Error(t('اكتب سبب الرفض في الملاحظات.','Add the reason for declining in Notes.'));if(['approved','declined'].includes(r.status)&&!isAdmin())throw Error(t('يعتمد المسؤول الإجازات فقط.','Only an administrator can approve or decline leave.'));return r},extra:'leaveCheck'},

 {id:'balances',coll:'balances',group:'people',icon:'calendar',label:['أرصدة الإجازات','Leave balances'],one:['رصيد إجازة','Leave balance'],desc:['رصيد الإجازة السنوية لكل عضو. يُضاف الرصيد شهرياً حسب الإعدادات، وتُخصم الإجازات المعتمدة تلقائياً.','Each member’s annual leave. Days are added every month (see Settings) and approved leave is deducted automatically.'],
  fields:[{k:'member',l:['عضو الفريق','Team member'],t:'select',opts:members,req:true},{k:'year',l:['السنة','Year'],t:'select',opts:yearOpts,req:true,def:()=>String(thisYear())},{k:'entitled',l:['الاستحقاق السنوي (أيام)','Annual entitlement (days)'],t:'number',req:true,def:()=>leaveCfg().days,hint:['مع الإضافة الشهرية: الحد الأقصى للسنة.','With monthly adding: the most that can be earned in the year.']},{k:'carried',l:['مرحّل من السنة السابقة (أيام)','Carried over from last year (days)'],t:'number',def:0},{k:'monthly',l:['يُضاف كل شهر (أيام)','Added each month (days)'],t:'number',show:()=>leaveCfg().accrual==='monthly',hint:['فارغ = حسب الإعدادات.','Empty = the amount in Settings.']},{k:'accrueFrom',l:['يبدأ الاحتساب من','Start adding from'],t:'date',show:()=>leaveCfg().accrual==='monthly',hint:['للموظف الجديد: تاريخ الانضمام. فارغ = من يناير.','For a new joiner: the joining date. Empty = from January.']},{k:'notes',l:['ملاحظات','Notes'],t:'textarea',full:true}],
  cols:[{k:'member'},{k:'year',cls:'nowrap'},{k:'full',l:['استحقاق السنة','Year entitlement'],cls:'num',render:x=>dnum(leaveBalance(x.member,x.year).full),sort:x=>leaveBalance(x.member,x.year).full},{k:'total',l:['المكتسب حتى الآن','Earned so far'],cls:'num',render:x=>{const b=leaveBalance(x.member,x.year);return dnum(b.total)+(b.monthly?` <span class="muted" style="font-size:11.5px">${num(b.months)}×${dnum(b.rate)}</span>`:'')},sort:x=>leaveBalance(x.member,x.year).total},
   {k:'taken',l:['المأخوذ (معتمد)','Taken (approved)'],cls:'num',render:x=>dnum(leaveBalance(x.member,x.year).taken),sort:x=>leaveBalance(x.member,x.year).taken},
   {k:'booked',l:['بانتظار الاعتماد','Pending / planned'],cls:'num',render:x=>dnum(leaveBalance(x.member,x.year).booked),sort:x=>leaveBalance(x.member,x.year).booked},
   {k:'remaining',l:['المتبقي','Remaining'],cls:'num',render:x=>{const b=leaveBalance(x.member,x.year);return b.remaining<0?`<b style="color:var(--crit)">${dnum(b.remaining)}</b>`:`<b>${dnum(b.remaining)}</b>`},sort:x=>leaveBalance(x.member,x.year).remaining},
   {k:'use',l:['المستخدم من السنة','Used of the year'],render:x=>{const b=leaveBalance(x.member,x.year),u=b.full?Math.round(b.taken/b.full*100):0,bk=b.full?Math.min(100-Math.min(100,u),b.booked/b.full*100):0;return `<div style="display:flex;align-items:center;gap:8px;min-width:140px"><div class="meter" style="flex:1;display:flex"><i class="${b.remaining<0?'cr':''}" style="width:${Math.min(100,u)}%"></i><i class="hi" style="width:${bk}%;opacity:.45"></i></div><span class="mono" style="font-size:12px">${u}%</span></div>`},sort:x=>{const b=leaveBalance(x.member,x.year);return b.full?b.taken/b.full:0}}],
  views:[{id:'year',l:['هذه السنة','This year'],f:x=>Number(x.year)===thisYear()},{id:'low',l:['5 أيام أو أقل','5 days or fewer left'],f:x=>Number(x.year)===thisYear()&&leaveBalance(x.member,x.year).remaining<=5},{id:'all',l:['الكل','All'],f:()=>true}],
  filters:['member','year'],search:x=>[P.person(x.member),x.year,x.notes].join(' '),title:x=>P.person(x.member)+' · '+x.year,editable:isAdmin,
  kpis:rows=>{const y=thisYear(),bs=[...new Set(rows.filter(x=>Number(x.year)===y).map(x=>x.member))].map(m=>leaveBalance(m,y)),sum=k=>bs.reduce((s,b)=>s+b[k],0);return [{l:[`إجازات الفريق المكتسبة ${y}`,`Team leave earned ${y}`],v:dnum(sum('total'))+t(' يوم',' days'),sub:[`من ${dnum(sum('full'))} للسنة · ${num(bs.length)} عضو`,`of ${dnum(sum('full'))} for the year · ${bs.length} members`]},{l:['المأخوذ','Taken'],v:dnum(sum('taken'))},{l:['بانتظار الاعتماد','Pending / planned'],v:dnum(sum('booked'))},{l:['المتبقي للفريق','Team days left'],v:dnum(sum('remaining')),tone:'good'},{l:['5 أيام أو أقل','5 days or fewer'],v:bs.filter(b=>b.remaining<=5).length,view:'low'}]},
  prepare(r){r.year=String(r.year);if(!(Number(r.entitled)>=0&&Number(r.entitled)<=365))throw Error(t('أدخل عدد أيام بين 0 و365.','Enter between 0 and 365 days.'));if(r.carried!==''&&r.carried!=null&&!(Math.abs(Number(r.carried))<=365))throw Error(t('أيام الترحيل غير صحيحة.','Carried-over days are not valid.'));if(Store.all('balances').some(x=>x.id!==r.id&&x.member===r.member&&String(x.year)===r.year))throw Error(t('لهذا العضو رصيد في هذه السنة. عدّله بدلاً من إضافة آخر.','This member already has a balance for that year. Change it instead.'));return r},extra:'leaveHistory'},

 {id:'cards',coll:'cards',group:'people',icon:'card',label:['بطاقات الدخول','Access cards'],one:['بطاقة','Card'],desc:['بطاقات الدخول وحامليها وتواريخ الانتهاء وحالتها.','Access cards, holders, expiry dates and status.'],
  fields:[{k:'number',l:['رقم البطاقة','Card number'],t:'text',req:true},{k:'holder',l:['حامل البطاقة','Holder'],t:'text',req:true},{k:'holderId',l:['الرقم الوظيفي','Employee ID'],t:'text'},{k:'cardType',l:['نوع البطاقة','Card type'],t:'select',opts:[o('employee','موظف','Employee'),o('consultant','استشاري','Consultant'),o('visitor','زائر','Visitor'),o('trainee','متدرب','Trainee'),o('secondee','منتدب','Secondee'),o('outsource','تعهيد','Outsource'),o('office-boy','عامل مكتب','Office Boy'),o('bod','مجلس الإدارة','BoD'),o('stat-audit','التدقيق القانوني','Stat Audit'),o('other','أخرى','Others')],def:'employee'},
   {k:'department',l:['الإدارة','Department'],t:'text'},{k:'issued',l:['تاريخ الإصدار','Issued'],t:'date'},{k:'expires',l:['تاريخ الانتهاء','Expires'],t:'date'},{k:'status',l:['الحالة','Status'],t:'select',opts:[o('active','فعّالة','Active','ok'),o('suspended','موقوفة','Suspended','warn'),o('lost','مفقودة','Lost','crit'),o('returned','مُعادة','Returned','')],def:'active'},{k:'notes',l:['ملاحظات','Notes'],t:'textarea',full:true}],
  cols:[{k:'number',cls:'ref nowrap'},{k:'holder'},{k:'cardType'},{k:'department'},{k:'expires',render:x=>x.status==='active'?due(x.expires,30):fmtDate(x.expires)},{k:'status'}],
  views:[{id:'active',l:['الفعّالة','Active'],f:x=>x.status==='active'},{id:'soon',l:['تنتهي خلال 30 يوماً','Expiring in 30 days'],f:x=>x.status==='active'&&x.expires&&daysUntil(x.expires)<=30},{id:'all',l:['الكل','All'],f:()=>true}],
  filters:['cardType','department'],search:x=>[x.number,x.holder,x.holderId,x.department].join(' '),title:x=>x.number+' · '+x.holder,
  kpis:rows=>{const a=rows.filter(x=>x.status==='active');return [{l:['فعّالة','Active'],v:a.length,view:'active'},{l:['تنتهي خلال 30 يوماً','Expiring in 30 days'],v:a.filter(x=>x.expires&&daysUntil(x.expires)<=30).length,view:'soon',alert:a.some(x=>x.expires&&daysUntil(x.expires)<0)},{l:['مفقودة أو موقوفة','Lost or suspended'],v:rows.filter(x=>['lost','suspended'].includes(x.status)).length}]},
  prepare(r){const dup=Store.all('cards').find(x=>String(x.number).trim()===String(r.number).trim()&&x.id!==r.id);if(dup)throw Error(t('رقم البطاقة مستخدم من قبل.','This card number is already registered.'));return r}},

 {id:'phones',coll:'phones',group:'people',icon:'phone',label:['الأرقام الداخلية','Telephone extensions'],one:['رقم داخلي','Extension'],desc:['الأرقام الداخلية وأصحابها والأجهزة.','Extensions, who uses them and their devices.'],
  fields:[{k:'extension',l:['الرقم الداخلي','Extension'],t:'text',req:true},{k:'line',l:['الخط','Line'],t:'text'},{k:'status',l:['الحالة','Status'],t:'select',opts:[o('assigned','مخصص','Assigned','info'),o('unused','غير مستخدم','Unused','')],def:'assigned'},{k:'holder',l:['المستخدم','User'],t:'text',show:r=>r.status==='assigned'},{k:'holderId',l:['الرقم الوظيفي','Employee ID'],t:'text',show:r=>r.status==='assigned'},{k:'department',l:['الإدارة','Department'],t:'text'},{k:'location',l:['الموقع','Location'],t:'text'},{k:'deviceType',l:['نوع الجهاز','Device type'],t:'text'},{k:'deviceName',l:['اسم الجهاز','Device name'],t:'text',hint:['مثال: SEP001122334455 أو اسم الجهاز في نظام الاتصالات.','For example SEP001122334455, or the device name in the call manager.']},{k:'notes',l:['ملاحظات','Notes'],t:'textarea',full:true}],
  cols:[{k:'extension',cls:'ref nowrap'},{k:'holder'},{k:'department'},{k:'location'},{k:'deviceType'},{k:'deviceName',cls:'mono'},{k:'status'}],
  views:[{id:'all',l:['الكل','All'],f:()=>true},{id:'unused',l:['غير المستخدمة','Unused'],f:x=>x.status==='unused'}],
  filters:['department','location'],search:x=>[x.extension,x.holder,x.holderId,x.department,x.location,x.deviceName].join(' '),sort:(a,b)=>String(a.extension).localeCompare(String(b.extension),undefined,{numeric:true}),title:x=>x.extension+(x.holder?' · '+x.holder:''),
  kpis:rows=>[{l:['الأرقام','Extensions'],v:rows.length},{l:['مخصصة','Assigned'],v:rows.filter(x=>x.status==='assigned').length},{l:['غير مستخدمة','Unused'],v:rows.filter(x=>x.status==='unused').length,view:'unused',tone:'good'}],
  prepare(r){r.extension=String(r.extension).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).trim();const dup=Store.all('phones').find(x=>x.extension===r.extension&&x.id!==r.id);if(dup)throw Error(t('الرقم الداخلي مسجل من قبل.','This extension is already registered.'));if(r.status==='assigned'&&!String(r.holder||'').trim())throw Error(t('أدخل اسم المستخدم للرقم المخصص.','Enter the user for an assigned extension.'));if(r.status==='unused'){r.holder='';r.holderId=''}return r}},

 {id:'lifecycle',coll:'lifecycle',group:'people',icon:'users',label:['انضمام ومغادرة الموظفين','Joiners and leavers'],one:['حالة','Case'],desc:['قوائم مهام تقنية المعلومات عند انضمام الموظف أو مغادرته.','ICT checklists for employees joining or leaving.'],
  fields:[{k:'kind',l:['النوع','Type'],t:'select',opts:[o('joining','انضمام','Joining','info'),o('leaving','مغادرة','Leaving','warn')],def:'joining',ro:r=>!!r.id},{k:'employee',l:['الموظف','Employee'],t:'text',req:true},{k:'employeeId',l:['الرقم الوظيفي','Employee ID'],t:'text'},{k:'department',l:['الإدارة','Department'],t:'text'},{k:'jobTitle',l:['المسمى الوظيفي','Job title'],t:'text'},{k:'date',l:['تاريخ الانضمام / المغادرة','Joining / leaving date'],t:'date',req:true},{k:'coordinator',l:['المنسق','Coordinator'],t:'select',opts:members,blank:true,def:()=>Store.user?.email},{k:'notes',l:['ملاحظات','Notes'],t:'textarea',full:true}],
  cols:[{k:'employee'},{k:'kind'},{k:'department'},{k:'date'},{k:'coordinator'},{k:'progress',l:['التقدم','Progress'],render:x=>{const s=(x.steps||[]).filter(z=>z.status!=='na'),d=s.filter(z=>z.status==='done').length;return `<div class="progress" style="min-width:140px"><div class="meter"><i class="${d===s.length?'ok':''}" style="width:${s.length?d/s.length*100:0}%"></i></div><span class="mono">${num(d)}/${num(s.length)}</span></div>`},sort:x=>{const s=(x.steps||[]).filter(z=>z.status!=='na');return s.length?s.filter(z=>z.status==='done').length/s.length:0}}],
  views:[{id:'open',l:['المفتوحة','Open'],f:x=>(x.steps||[]).some(z=>!['done','na'].includes(z.status))},{id:'done',l:['المكتملة','Completed'],f:x=>!(x.steps||[]).some(z=>!['done','na'].includes(z.status))},{id:'all',l:['الكل','All'],f:()=>true}],
  filters:['kind','coordinator'],search:x=>[x.employee,x.employeeId,x.department,x.jobTitle].join(' '),sort:(a,b)=>(a.date||'').localeCompare(b.date||''),title:x=>x.employee,
  kpis:rows=>{const open=rows.filter(x=>(x.steps||[]).some(z=>!['done','na'].includes(z.status)));return [{l:['حالات مفتوحة','Open cases'],v:open.length,view:'open'},{l:['خطوات متوقفة','Blocked steps'],v:rows.reduce((s,x)=>s+(x.steps||[]).filter(z=>z.status==='blocked').length,0),alert:rows.some(x=>(x.steps||[]).some(z=>z.status==='blocked'))},{l:['خلال 14 يوماً','In the next 14 days'],v:open.filter(x=>x.date>=today()&&x.date<=addDays(today(),14)).length}]},
  prepare(r,old){if(!old){r.steps=(r.kind==='leaving'?LEAVE:JOIN).map(([ar,en])=>({id:Store.uid(),ar,en,status:'pending',assignee:r.coordinator||'',due:r.date}))}return r},extra:'lifeSteps'},

 {id:'kpis',coll:'kpis',group:'reports',icon:'target',label:['مؤشرات الأداء','KPIs'],one:['مؤشر','KPI'],desc:['مؤشرات أداء الفريق مقارنة بأهدافها.','Team KPIs measured against their targets.'],
  fields:[{k:'name',l:['المؤشر','KPI'],t:'text',req:true,full:true},{k:'owner',l:['المسؤول','Owner'],t:'select',opts:members,blank:true},{k:'period',l:['الفترة','Period'],t:'select',opts:[o('monthly','شهري','Monthly'),o('quarterly','ربع سنوي','Quarterly'),o('yearly','سنوي','Yearly')],def:'monthly'},{k:'unit',l:['الوحدة','Unit'],t:'text',def:'%'},{k:'target',l:['الهدف','Target'],t:'number',req:true},{k:'value',l:['القيمة الحالية','Current value'],t:'number'},{k:'lower',l:['الأقل أفضل','Lower is better'],t:'bool'},{k:'notes',l:['ملاحظات','Notes'],t:'textarea',full:true}],
  cols:[{k:'name',cls:'wrap'},{k:'owner'},{k:'period'},{k:'value',cls:'num',render:x=>x.value===''||x.value==null?'—':`<b class="mono">${num(x.value,Number.isInteger(Number(x.value))?0:1)}</b> ${esc(x.unit||'')}`},{k:'target',cls:'num',render:x=>`${x.lower?'≤ ':'≥ '}${num(x.target,Number.isInteger(Number(x.target))?0:1)} ${esc(x.unit||'')}`},{k:'state',l:['الحالة','Status'],render:x=>{const s=kpiState(x);return s==='met'?pill(t('محقق','Met'),'ok'):s==='below'?pill(t('دون الهدف','Below target'),'crit'):pill(t('لا قيمة','No value'),'')},sort:x=>kpiState(x)}],
  views:[{id:'all',l:['الكل','All'],f:()=>true},{id:'below',l:['دون الهدف','Below target'],f:x=>kpiState(x)==='below'}],
  filters:['owner','period'],search:x=>[x.name,x.notes].join(' '),title:x=>x.name,
  kpis:rows=>[{l:['المؤشرات','KPIs'],v:rows.length},{l:['محققة','Met'],v:rows.filter(x=>kpiState(x)==='met').length,tone:'good'},{l:['دون الهدف','Below target'],v:rows.filter(x=>kpiState(x)==='below').length,view:'below',alert:rows.some(x=>kpiState(x)==='below')}]},

 {id:'members',coll:'members',group:'admin',icon:'shield',label:['أعضاء الفريق','Team members'],one:['عضو','Member'],desc:['من يمكنه الدخول إلى البوابة وصلاحياته.','Who can sign in to the portal, and their role.'],
  fields:[{k:'name',l:['الاسم الكامل','Full name'],t:'text',req:true},{k:'email',l:['البريد الإلكتروني','Email'],t:'email',req:true,ro:r=>!!r.id},{k:'role',l:['الدور','Role'],t:'select',opts:[o('admin','مسؤول','Administrator','accent'),o('technician','فني','Technician','info'),o('member','موظف (مستخدم نهائي)','Employee (end user)','')],def:'technician',hint:['الموظف يرى بوابة الموظفين فقط: المساعد، طلباته، طلب جديد، مقالات المساعدة، والمحادثة مع الفريق.','An employee sees only the employee portal: the assistant, their requests, new request, help articles and chat with ICT.']},{k:'department',l:['القسم','Section'],t:'text'},{k:'phone',l:['الهاتف','Phone'],t:'text'},{k:'active',l:['الحساب فعّال','Account active'],t:'bool',def:true},{k:'access',l:['الصفحات المسموحة','Page access'],t:'select',opts:[o('all','كل الصفحات','All pages'),o('custom','الصفحات التي أختارها فقط','Only the pages I choose','warn')],def:'all',show:r=>r.role==='technician',hint:['اختر الصفحات أسفل النموذج. المسؤول يرى كل الصفحات دائماً.','Tick the pages below. Administrators always see every page.']}],
  cols:[{k:'name'},{k:'email',cls:'mono'},{k:'role'},{k:'department'},{k:'access',render:x=>x.role==='admin'?esc(t('كل الصفحات','All pages')):x.access==='custom'?pill(t(`${num((x.pages||[]).length)} صفحة`,`${(x.pages||[]).length} pages`),'warn'):esc(t('كل الصفحات','All pages'))},{k:'active'}],
  views:[{id:'active',l:['الفعّالون','Active'],f:x=>x.active!==false},{id:'all',l:['الكل','All'],f:()=>true}],
  filters:['role'],search:x=>[x.name,x.email,x.department].join(' '),title:x=>x.name,editable:isAdmin,
  prepare(r){r.email=String(r.email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email))throw Error(t('أدخل بريداً صحيحاً.','Enter a valid email address.'));const dup=Store.all('members').find(x=>x.email===r.email&&x.id!==r.id);if(dup)throw Error(t('هذا البريد مسجل من قبل.','This email is already on the team list.'));return r},extra:'memberTools'},
 ];
 function usable(x){return Math.max(0,Number(x.quantity||0)-Number(x.expired||0))}
 function util(x){const u=usable(x);return u?Math.round(Number(x.assigned||0)/u*100):null}
 function kpiState(x){if(x.value===''||x.value==null||isNaN(Number(x.value)))return 'none';const v=Number(x.value),tg=Number(x.target);return (x.lower?v<=tg:v>=tg)?'met':'below'}
 const byId=Object.fromEntries(defs.map(d=>[d.id,d]));
 return {PAGE_PERMS,COLL_PERM,can,canColl,myPages,createBalances,monthsCredited,leaveCfg,leaveDays,leaveBalance,deducts,dnum,SPEND,thisYear,yearOpts,spendYear,spendOf,accountLines,accountStatus,budgetMeter,budgetOf,sameAcc,slaFor,cats,sopOpts,sopSteps,slaDefaults,DEFAULT_SLA,autoCloseDays,autoCloseAt,awaiting,lines,defs,byId,optLabel,optTone,PRIORITY,TICKET_STATUS,CATEGORY,GROUPS,PR_STEPS,STEP_STATUS,priorityOf,ticketTarget,breached,slaCell,terminal,prStage,prStepDue,advance,usable,util,kpiState,isAdmin,members,due,yes,nextNumber};
})();
