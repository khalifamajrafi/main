/* App shell: sign-in, side menu, search, routing and live refresh. */
window.App=(()=>{
 const {t,L,esc,num}=P;
 const ICON={home:'<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',today:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',bell:'<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',ticket:'<path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z"/><path d="M10 7v10"/>',book:'<path d="M4 4h10a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4Z"/><path d="M8 8h6M8 12h6"/>',check:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 3 3 5-6"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',cart:'<path d="M3 4h2l2 12h12l2-8H7"/><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/>',key:'<circle cx="8" cy="14" r="4"/><path d="m11 11 9-9M17 5l2 2M15 7l2 2"/>',monitor:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',box:'<path d="M3 7 12 3l9 4v10l-9 4-9-4z"/><path d="m3 7 9 4 9-4M12 11v10"/>',file:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',wrench:'<path d="M14 6a4 4 0 0 0 5 5L11 19a2 2 0 0 1-3-3z"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',card:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 14h4"/><circle cx="16" cy="12" r="2"/>',phone:'<path d="M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',users:'<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M22 20a7 7 0 0 0-4-6.3"/>',target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',shield:'<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',tag:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',list:'<path d="M9 6h12M9 12h12M9 18h12"/><path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17"/>',sliders:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',wallet:'<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/><path d="M6 6V4h12v2"/>',chat:'<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>'};
 const icon=n=>`<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[n]||ICON.file}</svg>`;
 const GROUPS=[['top',null],['desk',['مكتب الخدمات','Service desk']],['work',['العمل اليومي','Daily work']],['resources',['الأصول والمشتريات','Assets and purchasing']],['people',['خدمات الموظفين','Employee services']],['reports',['التقارير والأداء','Reports and performance']],['admin',['الإدارة','Administration']]];
 const PAGES=[
  {href:'#/',key:'home',group:'top',icon:'home',l:['الرئيسية','Home']},
  {href:'#/mywork',key:'mywork',group:'top',icon:'today',l:['عملي اليوم','My Work Today']},
  {href:'#/notifications',key:'notifications',group:'top',icon:'bell',l:['الإشعارات','Notifications'],badge:()=>V.unreadCount()},
  {href:'#/m/tickets',key:'m/tickets',group:'desk',icon:'ticket',l:M.byId.tickets.label,badge:()=>Store.all('tickets').filter(x=>M.breached(x)).length},
  {href:'#/chat',key:'chat',group:'desk',icon:'chat',l:['المحادثة المباشرة','Live chat'],badge:()=>C.badge()},
  {href:'#/remote',key:'remote',group:'desk',icon:'monitor',l:['المساعدة عن بعد','Remote help']},
  {href:'#/employee-view',key:'employee-view',group:'desk',icon:'users',l:['بوابة الموظفين والمساعد (معاينة)','Employee portal and assistant (preview)']},
  {href:'#/m/catalog',key:'m/catalog',group:'desk',icon:'book',l:M.byId.catalog.label},
  {href:'#/kb',key:'kb',group:'desk',icon:'file',l:['قاعدة المعرفة','Knowledge base']},
  {href:'#/desk-setup',key:'desk-setup',group:'desk',icon:'sliders',l:['إعداد مكتب الخدمات','Service desk setup']},
  {href:'#/m/categories',key:'m/categories',group:'desk',icon:'tag',l:M.byId.categories.label},
  {href:'#/m/sops',key:'m/sops',group:'desk',icon:'list',l:M.byId.sops.label},
  {href:'#/m/tasks',key:'m/tasks',group:'work',icon:'check',l:M.byId.tasks.label},
  {href:'#/holidays',key:'holidays',group:'work',icon:'calendar',l:['تقويم العطلات','Holiday calendar']},
  ...['prs','accounts','budgets','licenses','assets','stock','vendors','maintenance'].map(id=>({href:'#/m/'+id,key:'m/'+id,group:'resources',icon:M.byId[id].icon,l:M.byId[id].label})),
  ...['leaves','balances','cards','phones','lifecycle'].map(id=>({href:'#/m/'+id,key:'m/'+id,group:'people',icon:M.byId[id].icon,l:M.byId[id].label})),
  {href:'#/management',key:'management',group:'reports',icon:'chart',l:['لوحة الإدارة','Management dashboard']},
  {href:'#/reports',key:'reports',group:'reports',icon:'file',l:['التقارير','Reports']},
  {href:'#/m/kpis',key:'m/kpis',group:'reports',icon:'target',l:M.byId.kpis.label},
  {href:'#/m/members',key:'m/members',group:'admin',icon:'shield',l:M.byId.members.label},
  {href:'#/integrations',key:'integrations',group:'admin',icon:'key',l:['التكامل (البريد والدخول الموحد)','Integrations (email, SSO)'],admin:true},
  {href:'#/settings',key:'settings',group:'admin',icon:'gear',l:['الإعدادات','Settings']}];
 const PERM={'m/tickets':'tickets','m/catalog':'catalog','desk-setup':'catalog','m/categories':'catalog','m/sops':'catalog',kb:'kb','m/articles':'kb','m/tasks':'tasks',holidays:'holidays','m/holidays':'holidays','m/prs':'prs','m/accounts':'accounts','m/budgets':'accounts','m/licenses':'licenses','m/assets':'assets','m/stock':'stock','m/vendors':'vendors','m/maintenance':'maintenance','m/leaves':'leaves','m/balances':'leaves','m/cards':'cards','m/phones':'phones','m/lifecycle':'lifecycle',management:'management',reports:'reports','m/kpis':'kpis','m/members':'members',chat:'chat',remote:'chat'};
 const allowed=key=>M.can(PERM[key]);
 const root=document.getElementById('root');
 let collapsed=(()=>{try{return JSON.parse(localStorage.getItem('ictops.nav')||'{}')}catch{return {}}})();
 function applyTheme(){let th='light';try{th=localStorage.getItem('ictops.theme')||'light'}catch{}if(th==='system')th=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=th}
 applyTheme();matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',applyTheme);

 /* ---------- Sign in ---------- */
 async function loginPage(msg=''){
  const opt=await Store.loginOptions(),server=Store.mode==='server',boot=opt.bootstrap,bootBlocked=boot&&server&&!opt.local;
  document.title=t('بوابة عمليات تقنية المعلومات · تسجيل الدخول','ICT Operations Portal · Sign in');
  const picker=!server&&!boot;
  const SSOERR={disabled:t('تسجيل الدخول بحساب Microsoft غير مفعّل.','Sign in with Microsoft is not turned on.'),unreachable:t('تعذر الوصول إلى Microsoft. حاول لاحقاً.','Could not reach Microsoft. Try again later.'),expired:t('انتهت مهلة تسجيل الدخول. حاول مرة أخرى.','The sign-in took too long or was interrupted. Try again.'),denied:t('لم يكتمل تسجيل الدخول في Microsoft.','The sign-in was cancelled or refused at Microsoft.'),failed:t('تعذر التحقق من تسجيل الدخول. اطلب من المسؤول مراجعة الإعدادات.','The sign-in could not be verified. Ask your administrator to check the settings.'),'no-email':t('حساب Microsoft هذا ليس له بريد.','This Microsoft account has no email address.'),domain:t('استخدم حساب العمل الخاص بالشركة.','Use your company work account.'),'not-member':t('حسابك غير مضاف إلى البوابة أو غير فعّال. اطلب من مسؤول البوابة إضافتك.','Your account is not on the portal team list or is inactive. Ask a portal administrator to add you.')};
  const sp=new URLSearchParams(location.search);if(sp.has('sso')){msg=SSOERR[sp.get('sso')]||SSOERR.failed;history.replaceState(null,'',location.pathname+location.hash)}
  const sso=server&&!boot&&opt.sso,pwHidden=sso&&opt.passwordMode!=='all';
  root.innerHTML=`<main class="login"><form id="loginForm" novalidate>
   <div class="login-top"><span class="brand">${logo()}<span><b>${t('عمليات تقنية المعلومات','ICT Operations')}</b><small>${t('بوابة الفريق','Team portal')}</small></span></span><button class="iconbtn" type="button" id="lg">${P.en()?'العربية':'English'}</button></div>
   <h1>${boot?t('إعداد البوابة','Set up the portal'):t('تسجيل الدخول','Sign in')}</h1>
   ${bootBlocked?`<p>${t('لم يتم إعداد البوابة بعد. يجب إنشاء حساب المسؤول الأول من جهاز الخادم نفسه عبر http://localhost.','The portal has not been set up yet. The first administrator account must be created on the server PC itself, at http://localhost.')}</p></form></main>`:`
   ${sso?`<a class="sso-btn" href="api/sso/start" id="ssoBtn"><svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>${t('الدخول بحساب Microsoft','Sign in with Microsoft')}</a>
   ${pwHidden?`<button class="linkbtn" type="button" id="showPw" style="align-self:center">${opt.passwordMode==='none'?t('الدخول برمز استرداد على جهاز الخادم','Use a recovery code on the server PC'):t('المسؤولون: الدخول بكلمة مرور البوابة','Administrators: sign in with a portal password')}</button>`:`<div class="sso-or">${t('أو','or')}</div>`}<div id="pwArea" style="display:${pwHidden?'none':'contents'}">`:''}
   <p>${boot?t('أنت أول مستخدم. سيصبح هذا الحساب مسؤول البوابة ويمكنه إضافة بقية الفريق.','You are the first user. This account becomes the portal administrator and can add the rest of the team.'):server?t('أدخل بريدك الإلكتروني للعمل وكلمة المرور.','Enter your work email and password.'):t('اختر حسابك للمتابعة.','Choose your account to continue.')}</p>
   ${boot?`<label class="field" for="lgName"><span>${t('الاسم الكامل','Full name')}</span><input id="lgName" autocomplete="name" required></label>`:''}
   ${picker?`<label class="field" for="lgEmail"><span>${t('عضو الفريق','Team member')}</span><select id="lgEmail">${(opt.members||[]).map(m=>`<option value="${esc(m.email)}">${esc(m.name||m.email)} — ${esc(m.email)}</option>`).join('')}</select></label>`
    :`<label class="field" for="lgEmail"><span>${t('البريد الإلكتروني للعمل','Work email')}</span><input id="lgEmail" type="email" autocomplete="username" required></label>`}
   ${server?`<label class="field" for="lgCode" id="codeBox" hidden><span>${t('رمز الدخول (من المسؤول أو رمز الاسترداد)','Sign-in code (from your administrator, or a recovery code)')}</span><input id="lgCode" autocomplete="one-time-code" placeholder="XXXXX-XXXXX" style="font-family:var(--f-mono);letter-spacing:.08em"><span class="hint">${t('مطلوب مرة واحدة فقط عند أول دخول.','Needed only the first time you sign in.')}</span></label>
    <label class="field" for="lgPw"><span id="pwLabel">${boot?t('أنشئ كلمة مرور','Create a password'):t('كلمة المرور','Password')}</span><input id="lgPw" type="password" minlength="8" maxlength="256" required autocomplete="${boot?'new-password':'current-password'}"><span class="hint" id="pwHint">${boot?t('10 أحرف على الأقل، حروف ورقم واحد على الأقل.','At least 10 characters, with letters and at least one number.'):''}</span></label>`:''}
   <p class="err" id="lgErr" role="alert">${esc(msg)}</p>
   <button class="btn" type="submit" style="justify-content:center">${boot?t('إنشاء الحساب والدخول','Create account and sign in'):t('دخول','Sign in')}</button>
   ${server&&!boot?`<button class="linkbtn" type="button" id="firstTime">${t('أول مرة تدخل؟ لدي رمز دخول','First time here? I have a sign-in code')}</button>`:''}
   ${sso?'</div>':''}
   ${server?'':`<p style="font-size:12px">${t('وضع محلي: البيانات تُحفظ في هذا المتصفح فقط ولا تُشارك مع الفريق. شغّل البوابة على خادم IIS لمشاركة البيانات.','Local mode: data is saved in this browser only and is not shared. Run the portal on the IIS server to share data with the team.')}</p>`}
  </form></main>`}`;
  root.querySelector('#lg')?.addEventListener('click',()=>{P.setLang(P.en()?'ar':'en');loginPage()});
  const showCode=()=>{const b=root.querySelector('#codeBox');if(!b)return;b.hidden=false;root.querySelector('#pwLabel').textContent=t('اختر كلمة مرور','Choose a password');root.querySelector('#pwHint').textContent=t('10 أحرف على الأقل، حروف ورقم. ستستخدمها في كل دخول بعد ذلك.','At least 10 characters, with letters and a number. You will use it from now on.');root.querySelector('#lgPw').autocomplete='new-password';root.querySelector('#firstTime')?.remove();root.querySelector('#lgCode').focus()};
  root.querySelector('#firstTime')?.addEventListener('click',showCode);
  root.querySelector('#showPw')?.addEventListener('click',e=>{const a=root.querySelector('#pwArea');a.style.display='contents';e.target.remove();if(opt.passwordMode==='none')showCode();root.querySelector('#lgEmail').focus()});
  if(pwHidden){if(msg)root.querySelector('#ssoBtn').insertAdjacentHTML('afterend',`<p class="err" role="alert" style="color:var(--crit)">${esc(msg)}</p>`)}
  const form=root.querySelector('#loginForm');if(bootBlocked||!root.querySelector('#lgEmail'))return;
  form.onsubmit=async e=>{e.preventDefault();const err=root.querySelector('#lgErr');err.textContent='';const email=root.querySelector('#lgEmail').value.trim(),pw=root.querySelector('#lgPw')?.value||'',name=root.querySelector('#lgName')?.value.trim(),code=root.querySelector('#lgCode')?.value.trim()||'';
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||(boot&&!name)){err.textContent=boot?t('أدخل الاسم وبريداً صحيحاً.','Enter your name and a valid email.'):t('أدخل بريداً صحيحاً.','Enter a valid email address.');return}
   const setting=boot||!root.querySelector('#codeBox')?.hidden;
   if(server&&pw.length<(setting?10:8)){err.textContent=setting?t('كلمة المرور الجديدة 10 أحرف على الأقل.','The new password needs at least 10 characters.'):t('أدخل كلمة المرور.','Enter your password.');return}
   const btn=form.querySelector('[type=submit]');btn.disabled=true;
   try{await Store.login(email,pw,name,code);await start()}catch(x){err.textContent=x.message;if(x.needCode)showCode();btn.disabled=false}};
  if(!pwHidden)setTimeout(()=>root.querySelector('input,select')?.focus(),30);
 }
 const logo=()=>`<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><rect width="30" height="30" rx="7" fill="#4fc3c9"/><path d="M7 19h4l2-7 3 11 2-7 1 3h4" stroke="#0f2a2c" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

 /* ---------- Shell ---------- */
 function shell(){
  root.innerHTML=`<div class="app" id="app">
   <aside class="rail" id="rail" aria-label="${t('القائمة','Menu')}">
    <a class="brand" href="#/">${logo()}<span><b>${t('عمليات تقنية المعلومات','ICT Operations')}</b><small>${t('بوابة الفريق','Team portal')}</small></span></a>
    <nav id="nav"></nav>
    <div class="rail-foot"><b id="whoName"></b><span id="whoRole"></span><span class="modebadge">${Store.mode==='server'?t('بيانات مشتركة على الخادم','Shared data on server'):t('وضع محلي · هذا المتصفح فقط','Local mode · this browser only')}</span><button class="linkbtn" type="button" id="logout" style="color:var(--rail-fg);margin-top:6px;text-align:start">${t('تسجيل الخروج','Sign out')}</button></div>
   </aside>
   <div class="main">
    <header class="topbar">
     <button class="iconbtn menuBtn" type="button" id="menuBtn" aria-label="${t('القائمة','Menu')}">☰</button>
     <div class="search" role="search"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="gs" placeholder="${t('ابحث في الطلبات والأصول والتراخيص والمقالات…','Search tickets, assets, licenses, articles…')}" autocomplete="off" aria-label="${t('بحث في البوابة','Search the portal')}"><div class="results" id="gsr" hidden></div></div>
     <span id="statusBox"></span><span class="clock" id="clock"></span>
     <button class="iconbtn" type="button" id="themeBtn">${t('المظهر','Theme')}</button>
     <button class="iconbtn" type="button" id="langBtn">${P.en()?'العربية':'English'}</button>
     ${M.can('tickets')?`<a class="btn" href="#/m/tickets/new">＋ ${t('طلب','Ticket')}</a>`:''}
    </header>
    ${Store.mode==='local'?`<div class="localbar" role="note">${t('وضع محلي: البيانات محفوظة في هذا المتصفح فقط. لمشاركة البيانات مع الفريق شغّل البوابة على خادم IIS.','Local mode: data is saved in this browser only. To share data with the team, run the portal on the IIS server.')}</div>`:''}
    <main class="content" id="view" tabindex="-1"></main>
   </div></div>`;
  root.querySelector('#logout').onclick=async()=>{await Store.logout();loginPage()};
  root.querySelector('#menuBtn').onclick=()=>root.querySelector('#app').classList.toggle('menu-open');
  root.querySelector('#app').addEventListener('click',e=>{if(e.target.id==='app'||e.target.closest('#rail a'))root.querySelector('#app').classList.remove('menu-open')});
  root.querySelector('#langBtn').onclick=()=>{P.setLang(P.en()?'ar':'en');refresh()};
  root.querySelector('#themeBtn').onclick=()=>{const dark=document.documentElement.dataset.theme==='dark';try{localStorage.setItem('ictops.theme',dark?'light':'dark')}catch{}applyTheme()};
  search();drawStatus();EMP.fab();
 }
 function nav(){
  const n=root.querySelector('#nav');if(!n)return;const cur=routeKey();
  const visible=p=>!(p.admin&&!M.isAdmin())&&allowed(p.key);
  n.innerHTML=GROUPS.map(([g,label])=>{const items=PAGES.filter(p=>p.group===g&&visible(p));if(!items.length)return '';const links=`<div class="nav">${items.map(p=>{const b=p.badge?p.badge():0;return `<a href="${p.href}" ${cur===p.key?'aria-current="page"':''}>${icon(p.icon)}<span>${esc(L(p.l))}</span>${b?`<span class="count">${num(b)}</span>`:''}</a>`}).join('')}</div>`;
   if(!label)return links;const hasCur=items.some(p=>p.key===cur),closed=collapsed[g]&&!hasCur;return `<div class="navgroup ${closed?'closed':''}"><button type="button" data-g="${g}" aria-expanded="${!closed}">${esc(L(label))}</button>${links}</div>`}).join('');
  n.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{collapsed[b.dataset.g]=!b.parentElement.classList.contains('closed');try{localStorage.setItem('ictops.nav',JSON.stringify(collapsed))}catch{}nav()});
  const u=Store.user;root.querySelector('#whoName').textContent=u?.name||u?.email||'';root.querySelector('#whoRole').textContent=u?M.optLabel(M.byId.members.fields.find(f=>f.k==='role').opts,u.role):'';
 }
 function search(){
  const box=root.querySelector('#gs'),out=root.querySelector('#gsr');let tm;
  const run=()=>{const q=box.value.trim().toLowerCase();if(q.length<2){out.hidden=true;return}const hits=[];
   for(const d of M.defs.filter(d=>M.canColl(d.coll))){for(const r of Store.all(d.coll)){if(hits.length>=14)break;const s=(d.search?d.search(r):JSON.stringify(r)).toLowerCase();if(s.includes(q))hits.push({href:d.page&&d.id==='articles'?'#/kb/'+r.id:'#/m/'+d.id+'/'+r.id,title:d.title?d.title(r):r.id,mod:L(d.label)})}}
   out.innerHTML=hits.length?hits.map(h=>`<a href="${esc(h.href)}"><span>${esc(h.title)}</span><small>${esc(h.mod)}</small></a>`).join(''):`<p class="empty">${t('لا نتائج.','No results.')}</p>`;out.hidden=false};
  box.oninput=()=>{clearTimeout(tm);tm=setTimeout(run,150)};
  box.onkeydown=e=>{if(e.key==='Enter'){const a=out.querySelector('a');if(a){location.hash=a.getAttribute('href');out.hidden=true;box.value=''}}if(e.key==='Escape'){out.hidden=true;box.blur()}if(e.key==='ArrowDown'){out.querySelector('a')?.focus();e.preventDefault()}};
  out.addEventListener('click',e=>{if(e.target.closest('a')){out.hidden=true;box.value=''}});
  document.addEventListener('click',e=>{if(!e.target.closest('.search'))out.hidden=true});
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!/input|textarea|select/i.test(document.activeElement.tagName)){e.preventDefault();box.focus()}});
 }
 function tick(){if(P.printing)return;const c=root.querySelector('#clock');if(c)c.textContent=new Date().toLocaleString(P.en()?'en-GB':'ar-OM',{weekday:'short',hour:'2-digit',minute:'2-digit',timeZone:P.TZ})+t(' · مسقط',' · Muscat');
  document.querySelectorAll('[data-sla]').forEach(td=>{const x=Store.get('tickets',td.dataset.sla);if(x)td.innerHTML=M.slaCell(x)})}

 /* ---------- Routing ---------- */
 const parts=()=>location.hash.replace(/^#\/?/,'').split('/').filter(Boolean);
 function routeKey(){const p=parts();if(!p.length)return 'home';if(p[0]==='m')return 'm/'+p[1];return p[0]}
 function render(keepScroll){
  const view=root.querySelector('#view');if(!view)return;const p=parts(),y=window.scrollY;
  try{
   if(!allowed(routeKey())){view.innerHTML=`<section class="panel"><p class="empty">${t('ليست لديك صلاحية لهذه الصفحة. اطلب من مسؤول البوابة إضافتها لك.','You do not have access to this page. Ask a portal administrator to add it for you.')} <a href="#/">${t('الرئيسية','Home')}</a></p></section>`}
   else if(!p.length||p[0]==='home')V.home(view);
   else if(p[0]==='mywork')V.mywork(view);
   else if(p[0]==='notifications')V.notifications(view);
   else if(p[0]==='management')V.management(view);
   else if(p[0]==='kb')V.knowledge(view,p[1]);
   else if(p[0]==='holidays')V.holidays(view);
   else if(p[0]==='settings')V.settings(view);
   else if(p[0]==='integrations')V.integrations(view);
   else if(p[0]==='chat')C.page(view);
   else if(p[0]==='remote')C.remotePage(view);
   else if(p[0]==='employee-view'){if(Store.mode==='server'){EMP.start(root,{preview:true});return}view.innerHTML=`<section class="panel"><p class="empty">${t('متاح عند التشغيل على الخادم.','Available when the portal runs on the server.')}</p></section>`}
   else if(p[0]==='desk-setup')V.deskSetup(view);
   else if(p[0]==='reports')R.page(view,p[1]);
   else if(p[0]==='m'&&M.byId[p[1]]){const d=M.byId[p[1]];if(d.page&&!p[2]){location.replace(d.page);return}if(d.page){(d.id==='articles'?V.knowledge:V.holidays)(view)}else E.render(d,view);if(p[2]&&E.openKey()!==d.id+'/'+p[2]&&!(p[2]==='new'&&E.openKey()===d.id+'/new'))E.drawer(d,p[2])}
   else{view.innerHTML=`<section class="panel"><p class="empty">${t('الصفحة غير موجودة.','Page not found.')} <a href="#/">${t('الرئيسية','Home')}</a></p></section>`}
  }catch(x){console.error(x);view.innerHTML=`<section class="panel"><p class="err">${esc(x.message)}</p></section>`}
  const page=PAGES.find(z=>z.key===routeKey());document.title=(page?L(page.l)+' · ':'')+t('بوابة عمليات تقنية المعلومات','ICT Operations Portal');
  nav();tick();if(keepScroll)window.scrollTo(0,y);
 }
 let last='';
 window.addEventListener('hashchange',()=>{if(EMP.active)return;if(Store.user?.role==='member'&&Store.mode==='server'){if(location.hash.startsWith('#/r/'))V.requester(root,location.hash.slice(4));else EMP.start(root);return}if(location.hash.startsWith('#/r/')){E.close();V.requester(root,location.hash.slice(4));return}if(!root.querySelector('#view')&&Store.user){shell()}const p=parts(),k=routeKey();const drawerOnly=p[0]==='m'&&p[2]&&last===k;
  if(!(p[0]==='m'&&p[2])&&E.isOpen())E.close();
  if(drawerOnly){if(E.openKey()!==p[1]+'/'+p[2])E.drawer(M.byId[p[1]],p[2]);return}
  last=k;render();if(!(p[0]==='m'&&p[2]))document.getElementById('view')?.focus({preventScroll:true});window.scrollTo(0,0)});
 let pending=false;Store.on(name=>{if(name==='unauthorized'){loginPage(t('انتهت الجلسة. سجّل الدخول مجدداً.','Your session ended. Sign in again.'));return}if(name==='*'&&document.activeElement?.closest?.('#view')&&/input|textarea|select/i.test(document.activeElement.tagName))return;if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;if(!root.querySelector('#view'))return;Store.refreshUser();render(true)})});
 function refresh(keep){if(!root.querySelector('#view')){start();return}shell();render(keep)}

 async function start(){
  if(location.hash.startsWith('#/r/')){if(Store.mode==='local')await Store.load();return V.requester(root,location.hash.slice(4))}
  try{await Store.load()}catch(x){if(x.status===401){return loginPage()}if(x.status===403){const u=await Store.session();if(u?.role==='member')return EMP.start(root)}root.innerHTML=`<main class="login"><form><h1>${t('تعذر الاتصال بالخادم','Cannot reach the server')}</h1><p>${t('تحقق من تشغيل موقع IIS ثم أعد تحميل الصفحة.','Check that the IIS site is running, then reload the page.')}</p></form></main>`;return}
  if(window.PORTAL_PREVIEW&&Store.mode==='local'&&!Store.all('members').length){try{await Store.login('khalifa@example.om','','Khalifa Muhanna')}catch(x){console.error(x)}}
  const u=await Store.session();if(!u)return loginPage();
  if(u.role==='member'&&Store.mode==='server')return EMP.start(root);
  if(!Store.all('catalog').length&&M.isAdmin()&&window.DEFAULT_CATALOG){try{await Store.replace('catalog',DEFAULT_CATALOG)}catch{}}
  if(!Store.get('settings','main')&&M.isAdmin()){try{await Store.save('settings',{id:'main',workDays:[0,1,2,3,4],workStart:'07:30',workEnd:'15:30',autoCloseDays:3,portalUrl:location.origin+location.pathname})}catch{}}
  if(M.isAdmin()){const c=M.leaveCfg();if(c.auto&&Store.all('balances').length){try{await M.createBalances(M.thisYear(),c.carryMax)}catch(x){console.warn(x)}}}
  if(M.isAdmin())await seedDesk();
  if(window.PORTAL_PREVIEW&&Store.mode==='local'&&!Store.all('tickets').length){try{await Sample.load()}catch(x){console.error(x)}}
  await E.T.autoCloseLocal();
  last=routeKey();shell();render();
  if(Store.mode==='server'){C.startPresence();if(!presenceHooked){presenceHooked=true;C.on(()=>{if(EMP.active)return;nav();drawStatus();const w=C.state.presence?.chat?.waiting||0;if(w>lastWaiting&&M.can('chat')&&!location.hash.startsWith('#/chat'))P.toast(t('محادثة جديدة بانتظار فني','A new chat is waiting for a technician'));lastWaiting=w;const b=C.badge();document.title=document.title.replace(/^\(\d+\) /,'');if(b)document.title=`(${b}) `+document.title})}}
  fillSla();
  if(!slaHooked){slaHooked=true;Store.on(n=>{if(n==='tickets'||n==='*')setTimeout(fillSla,800)})}
 }
 let presenceHooked=false,slaHooked=false,lastWaiting=0;
 function drawStatus(){const b=root.querySelector('#statusBox');if(!b)return;if(b.querySelector('select:focus'))return;b.innerHTML=C.statusControl();const s=b.querySelector('#myStatus');if(s)s.onchange=()=>C.setStatus(s.value)}
 /* Requests from the employee portal and chat arrive without SLA targets; the team's browsers fill them from the working calendar. */
 let filling=false;
 async function fillSla(){if(filling||!M.can('tickets')||!Store.user||Store.user.role==='member')return;const list=Store.all('tickets').filter(x=>x.needsSla);if(!list.length)return;filling=true;
  try{for(const x of list){const r=Store.clone(x),s=r.serviceId&&Store.get('catalog',r.serviceId);if(s&&s.sopId&&!r.sopId)r.sopId=s.sopId;const [resp,res]=M.slaFor(r),start=Date.parse(r.createdAt)||Date.now();r.responseTargetAt=new Date(P.addWorking(start,resp)).toISOString();r.targetAt=new Date(P.addWorking(start,res)).toISOString();if(r.sopId&&!(r.sopSteps||[]).length)r.sopSteps=M.sopSteps(r.sopId);r.needsSla=false;await Store.save('tickets',r)}}catch(e){console.warn(e)}filling=false}
 /* First-run defaults for categories and procedures (from the original helpdesk SOP), linked to the catalog. */
 async function seedDesk(){try{
  if(!Store.all('categories').length)await Store.replace('categories',M.CATEGORY.map(c=>({id:c[0],nameAr:c[1],nameEn:c[2],active:true,createdAt:new Date().toISOString()})));
  if(!Store.all('sops').length){await Store.replace('sops',[
   {id:'sop-support',nameEn:'Technical support',nameAr:'دعم فني',active:true,stepsEn:'Log the incident or request\nAssess and diagnose\nResolve or escalate\nDocument the resolution and tell the user\nClose the ticket and collect feedback',stepsAr:'تسجيل البلاغ\nتحديد المشكلة وتشخيصها\nالحل أو التصعيد\nتوثيق الحل وإبلاغ المستخدم\nإغلاق التذكرة وجمع الملاحظات'},
   {id:'sop-access',nameEn:'Access request',nameAr:'طلب صلاحية',active:true,stepsEn:'User contacts the helpdesk via the portal\nLog the access request\nGet the manager’s approval\nGrant the access or escalate\nDocument the resolution and tell the user\nClose the ticket and collect feedback',stepsAr:'تقديم الطلب عبر البوابة\nتسجيل طلب الصلاحية\nالحصول على موافقة المدير\nمنح الصلاحية أو التصعيد\nتوثيق الحل وإبلاغ المستخدم\nإغلاق التذكرة وجمع الملاحظات'},
   {id:'sop-device',nameEn:'New device',nameAr:'جهاز جديد',active:true,stepsEn:'Confirm the request and budget\nCheck stock or raise a purchase request\nPrepare and image the device\nHand over and record the asset\nClose the ticket and collect feedback',stepsAr:'تأكيد الطلب والميزانية\nالتحقق من المخزن أو رفع طلب شراء\nتجهيز الجهاز وتثبيت النظام\nالتسليم وتسجيل الأصل\nإغلاق التذكرة وجمع الملاحظات'}]);
   const cat=Store.all('catalog');if(cat.some(x=>!x.sopId))await Store.replace('catalog',cat.map(x=>x.sopId?x:{...x,sopId:x.group==='Access requests'?'sop-access':x.group==='New hardware'?'sop-device':'sop-support'}))}
 }catch(x){console.error(x)}}
 /* Pick up colleagues' changes every minute while the page is open and no record is being edited. */
 setInterval(async()=>{if(P.printing||Store.mode!=='server'||!Store.user||EMP.active||Store.user.role==='member'||E.isOpen()||document.hidden)return;try{await Store.load();fillSla()}catch{}},60000);
 setInterval(tick,1000);
 setInterval(()=>{if(Store.user&&!P.printing&&!E.isOpen())E.T.autoCloseLocal().catch(()=>{})},60000);
 (async()=>{await Store.detect();await start()})();
 return {refresh,applyTheme,start};
})();
