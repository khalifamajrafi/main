/* Employee view: what a normal employee (role "Employee") sees after signing in.
   Help assistant (chatbot), their own requests, a new request form, help articles, and live chat with the ICT team.
   Employees never receive the ICT registers; everything comes from /api/employee/* and /api/chat. */
window.EMP=(()=>{
 const {t,L,esc,num,fmtDate,fmtDateTime,ago,toast,initials,pill}=P;
 let botBox=null,preview=false,fabEl=null;
 const inTeam=()=>!active;  /* the floating assistant inside the ICT team portal */
 let root=null,home={catalog:[],categories:[],articles:[],tickets:[],me:{}},active=false,loadedAt=0;
 const bot={log:[],pending:null};
 let draft=null;   /* prefilled new request (from the assistant) */
 let chatOpen='';

 async function load(){const r=await Store.api('employee/home'+(preview?'?view=employee':''));if(!r.ok)throw Object.assign(Error('load'),{status:r.status});home=r.body;loadedAt=Date.now()}
 const route=()=>(location.hash.replace(/^#\/?/,'').split('/')[0])||'help';
 const svcTitle=s=>L([s.titleAr||s.titleEn,s.titleEn]);

 /* ---------- Text matching for the assistant (English and Arabic) ---------- */
 const STOP=new Set('a an the to of in on for and or is are was be my me i it this that with can how do does what why when where please help need want have has not cannot cant dont من في على الى إلى عن هل كيف ماذا لماذا متى أين اين لا ما هذا هذه انا أنا عندي لدي اريد أريد ممكن يمكن و او أو مع'.split(' '));
 function norm(s){return String(s||'').toLowerCase().replace(/[ً-ْـ]/g,'').replace(/[إأآا]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[^\p{L}\p{N}\s-]/gu,' ')}
 const stem=w=>w.length>4&&w.startsWith('ال')?w.slice(2):w.replace(/(ing|ed|es|s)$/,m=>w.length-m.length>=3?'':m);
 const tokens=s=>norm(s).split(/\s+/).filter(w=>w.length>1&&!STOP.has(w)).map(stem);
 function score(q,fields){const qt=new Set(tokens(q));if(!qt.size)return 0;let sc=0;for(const [text,w] of fields){const tt=new Set(tokens(text));for(const x of qt){if(tt.has(x))sc+=w;else if(x.length>=4&&[...tt].some(y=>y.length>=4&&(y.startsWith(x)||x.startsWith(y))))sc+=w*.5}}return sc/Math.sqrt(qt.size)}
 function searchAll(q){
  const arts=home.articles.map(a=>({a,s:score(q,[[a.title,3],[a.tags,2.5],[a.category,1],[a.body,1]])})).filter(x=>x.s>=1.2).sort((x,y)=>y.s-x.s).slice(0,3);
  const svcs=home.catalog.map(s=>({s,sc:score(q,[[s.titleEn,2],[s.titleAr,2],[s.group,1]])})).filter(x=>x.sc>=1).sort((x,y)=>y.sc-x.sc).slice(0,3);
  return {arts,svcs}}

 /* ---------- Assistant ---------- */
 const say=(text,extra={})=>{bot.log.push({by:'bot',text,...extra});drawBot()};
 const you=text=>{bot.log.push({by:'me',text});drawBot()};
 const MENU=()=>[['problem',t('الإبلاغ عن مشكلة','Report a problem')],['service',t('طلب خدمة','Request a service')],['status',t('حالة طلباتي','My requests')],['human',t('التحدث مع فني','Talk to a technician')]];
 function greet(){bot.log=[];say(t(`مرحباً ${home.me.name||''}! أنا مساعد تقنية المعلومات. اكتب سؤالك أو مشكلتك، أو اختر:`,`Hello ${home.me.name||''}! I'm the ICT help assistant. Type your question or problem, or choose:`),{menu:MENU()})}
 function answer(q){bot.pending=q;
  const n=norm(q),num_=q.match(/SR-\d{4}-\d+/i);
  if(num_){const tk=home.tickets.find(x=>x.number.toLowerCase()===num_[0].toLowerCase());return tk?say(ticketLine(tk),{tickets:[tk.id]}):say(t('لم أجد طلباً بهذا الرقم باسمك.','I could not find a request with that number under your name.'),{menu:MENU()})}
  if(/^(hi|hello|hey|salam|good (morning|afternoon)|السلام|سلام|مرحبا|اهلا|هلا|صباح)/.test(n))return say(t('أهلاً بك! كيف أساعدك اليوم؟','Hello! How can I help you today?'),{menu:MENU()});
  if(/(thank|thanks|شكرا|مشكور|يعطيك)/.test(n))return say(t('العفو! هل هناك شيء آخر؟','You are welcome! Anything else?'),{menu:MENU()});
  if(/(status|track|my (request|ticket)|حاله|طلباتي|طلبي|متابعه)/.test(n))return showStatus();
  if(/(human|agent|person|technician|someone|talk to|speak|live chat|call me|فني|موظف|شخص|تحدث|كلم|محادثه|دعم مباشر)/.test(n))return handover();
  const {arts,svcs}=searchAll(q);
  bot.pending=q;
  if(!arts.length&&!svcs.length)return say(t('لم أجد إجابة جاهزة لهذا. يمكنني تسجيل طلب لك أو تحويلك إلى فني.','I could not find a ready answer for that. I can log a request for you or connect you to a technician.'),{menu:[['log',t('تسجيل طلب بهذا الوصف','Log a request with this description')],['human',t('التحدث مع فني','Talk to a technician')]]});
  say(arts.length?t('قد تساعدك هذه الإرشادات:','These instructions may help:'):t('هذه خدمات قد تناسب طلبك:','These services may match what you need:'),{articles:arts.map(x=>x.a.id),services:svcs.map(x=>x.s.id),menu:[['solved',t('نعم، حُلّت','Yes, solved')],['log',t('لا، سجّل طلباً','No, log a request')],['human',t('التحدث مع فني','Talk to a technician')]]});
 }
 function ticketLine(tk){return `${tk.number} · ${tk.title} — ${statusText(tk.status)}${tk.owner?t(' · الفني: ',' · Technician: ')+tk.owner:''}`}
 function showStatus(){const open=home.tickets.filter(x=>!['closed','cancelled'].includes(x.status));if(!home.tickets.length)return say(t('ليست لديك طلبات بعد.','You have no requests yet.'),{menu:MENU()});
  say(open.length?t(`لديك ${num(open.length)} طلب مفتوح:`,`You have ${open.length} open request${open.length>1?'s':''}:`):t('كل طلباتك مغلقة. آخرها:','All your requests are closed. The latest:'),{tickets:(open.length?open:home.tickets).slice(0,5).map(x=>x.id)})}
 function handover(){if(inTeam()||preview)return say(t('للتحدث مع الموظفين استخدم صفحة «المحادثة المباشرة». الموظفون يرون هذا الزر ويصلون إلى فني متصل.','Employees use this button to reach an online technician. As a team member, use the Live chat page.'),{menu:[['livechat',t('فتح المحادثة المباشرة','Open Live chat')]]});
  const on=C.team().filter(x=>x.state==='online'),busy=C.team().filter(x=>x.state==='busy');
  if(on.length||busy.length)say(t(`متصل الآن: ${on.map(x=>x.name).join('، ')||'—'}${busy.length?` · مشغول: ${busy.map(x=>x.name).join('، ')}`:''}. سأحوّلك مع ملخص هذه المحادثة.`,`Online now: ${on.map(x=>x.name).join(', ')||'—'}${busy.length?` · Busy: ${busy.map(x=>x.name).join(', ')}`:''}. I will pass on this conversation.`),{menu:[['connect',t('ابدأ المحادثة مع الفريق','Start a chat with the team')],['log',t('سجّل طلباً بدلاً من ذلك','Log a request instead')]]});
  else say(t('لا يوجد فني متصل الآن. اترك رسالة وسيرد الفريق عند الاتصال، أو سجّل طلباً.','No technician is online right now. Leave a message and the team will reply when they are back, or log a request.'),{menu:[['connect',t('اترك رسالة للفريق','Leave a message for the team')],['log',t('تسجيل طلب','Log a request')]]})}
 async function connect(){if(preview||inTeam())return handover();const text=bot.pending||t('أحتاج مساعدة من فني.','I need help from a technician.');
  try{const c=await C.startChat({text,topic:text.slice(0,100),transcript:bot.log.slice(-12).map(x=>({by:x.by==='bot'?'bot':'me',text:x.text}))});chatOpen=c.id;say(t('تم إرسال رسالتك إلى الفريق. تابع في «المحادثة مع الفريق».','Your message has been sent to the team. Continue in “Chat with ICT”.'));location.hash='#/chat'}catch(x){toast(x.message,true)}}
 function choose(k,label){you(label);
  if(k==='problem')return say(t('صف المشكلة بكلماتك (مثال: «الطابعة لا تطبع» أو «نسيت كلمة مرور البريد»).','Describe the problem in your own words (for example “the printer will not print” or “I forgot my email password”).'));
  if(k==='service')return say(t('ما الخدمة التي تحتاجها؟ اكتبها، أو اختر من دليل الخدمات.','What service do you need? Type it, or pick from the service catalog.'),{menu:[['catalog',t('فتح دليل الخدمات','Open the service catalog')]]});
  if(k==='livechat'){closeFab();location.hash='#/chat';return}
  if(k==='catalog'){if(inTeam()){closeFab();location.hash='#/m/catalog';return}location.hash='#/new';return}
  if(k==='status')return showStatus();
  if(k==='human')return handover();
  if(k==='connect')return connect();
  if(k==='solved')return say(t('رائع! سعيد أنني ساعدت.','Great, glad that helped!'),{menu:MENU()});
  if(k==='log'&&inTeam()){closeFab();location.hash='#/m/tickets/new';return}
  if(k==='log'){const q=bot.pending||'';draft={title:q.slice(0,90),details:q};location.hash='#/new';return}
 }
 function drawBot(){const box=(botBox||root)?.querySelector('#botLog');if(!box)return;
  box.innerHTML=bot.log.map((m,i)=>{if(m.by==='me')return `<div class="cmsg own"><div class="cb"><div>${esc(m.text)}</div></div></div>`;
   const arts=(m.articles||[]).map(id=>home.articles.find(a=>a.id===id)).filter(Boolean),svcs=(m.services||[]).map(id=>home.catalog.find(s=>s.id===id)).filter(Boolean),tks=(m.tickets||[]).map(id=>home.tickets.find(x=>x.id===id)).filter(Boolean);
   return `<div class="cmsg bot"><div class="cb"><small>${t('المساعد','Help assistant')}</small><div>${esc(m.text)}</div>
    ${arts.map(a=>`<details class="botart"><summary><b>${esc(a.title)}</b></summary><div class="artbody">${esc(a.body).replace(/\n/g,'<br>')}</div></details>`).join('')}
    ${svcs.length?`<div class="botsvc">${svcs.map(s=>`<button type="button" class="chip" data-svc="${esc(s.id)}">＋ ${esc(svcTitle(s))}</button>`).join('')}</div>`:''}
    ${tks.map(x=>`<a class="li" href="#/requests/${esc(x.id)}" style="padding:6px 0"><span class="grow"><b class="mono">${esc(x.number)}</b> ${esc(x.title)}<small>${esc(statusText(x.status))}${x.owner?' · '+esc(x.owner):''}</small></span></a>`).join('')}
    ${i===bot.log.length-1&&m.menu?`<div class="botmenu">${m.menu.map(([k,l])=>`<button type="button" class="btn ghost sm" data-k="${esc(k)}">${esc(l)}</button>`).join('')}</div>`:''}</div></div>`}).join('');
  box.scrollTop=box.scrollHeight;
  box.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>choose(b.dataset.k,b.textContent));
  box.querySelectorAll('[data-svc]').forEach(b=>b.onclick=()=>{if(inTeam()){closeFab();location.hash='#/m/tickets/new';return}const s=home.catalog.find(x=>x.id===b.dataset.svc);draft={serviceId:s.id,title:svcTitle(s),details:bot.pending||''};location.hash='#/new'});
 }

 /* ---------- Pages ---------- */
 const STATUS={open:['مفتوح','Open','warn'],'in-progress':['قيد التنفيذ','In progress','info'],waiting:['بانتظار معلومات منك','Waiting for your information',''],resolved:['تم الحل','Resolved','ok'],closed:['مغلق','Closed',''],cancelled:['ملغى','Cancelled','']};
 const statusText=s=>t(STATUS[s]?.[0]||s,STATUS[s]?.[1]||s);
 const statusPill=s=>pill(statusText(s),STATUS[s]?.[2]||'');
 const TABS=()=>[['help',t('المساعد','Help assistant')],['requests',t('طلباتي','My requests')],['new',t('طلب جديد','New request')],['articles',t('مقالات المساعدة','Help articles')],['chat',t('المحادثة مع الفريق','Chat with ICT')]];

 function shell(){
  root.innerHTML=`<div class="emp">${preview?`<div class="localbar" style="display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;padding:8px">${t('معاينة: هذا ما يراه الموظف. المحادثات لا تُرسل من المعاينة.','Preview: this is what employees see. Chats are not sent from the preview.')} <button class="btn sm" type="button" id="ePrevBack">${t('العودة إلى بوابة الفريق','Back to the ICT portal')}</button></div>`:''}<header class="emptop"><span class="brand">${logo()}<span><b>${t('خدمات تقنية المعلومات','ICT Services')}</b><small>${t('بوابة الموظفين','Employee portal')}</small></span></span>
   <span class="grow"></span><span class="muted" id="empOnline" style="font-size:12.5px"></span><button class="iconbtn" type="button" id="eTheme">${t('المظهر','Theme')}</button><button class="iconbtn" type="button" id="eLang">${P.en()?'العربية':'English'}</button><button class="iconbtn" type="button" id="eOut">${t('خروج','Sign out')}</button></header>
   <nav class="emptabs" id="empTabs"></nav><main class="empmain"><div id="empView"></div><aside class="panel empside"><div class="panel-h"><h2>${t('فريق تقنية المعلومات','ICT team')}</h2></div><div id="empTeam"></div><p class="muted" style="margin:0;font-size:12.5px">${t('أخضر = متصل الآن، أصفر = مشغول.','Green = online now, amber = busy.')}</p></aside></main></div>`;
  root.querySelector('#eLang').onclick=()=>{P.setLang(P.en()?'ar':'en');shell();render()};
  root.querySelector('#eTheme').onclick=()=>{const dark=document.documentElement.dataset.theme==='dark';try{localStorage.setItem('ictops.theme',dark?'light':'dark')}catch{}App.applyTheme()};
  root.querySelector('#ePrevBack')?.addEventListener('click',()=>{stop();preview=false;botBox=null;location.hash='#/';App.refresh()});
  root.querySelector('#eOut').onclick=async()=>{stop();await Store.logout();location.hash='';location.reload()};
 }
 function drawChrome(){if(!root?.querySelector('#empTabs'))return;const r=route(),unread=C.state.presence?.chat?.unread||0;
  root.querySelector('#empTabs').innerHTML=TABS().map(([k,l])=>`<a href="#/${k}" ${r===k?'aria-current="page"':''}>${esc(l)}${k==='chat'&&unread?` <span class="count">${num(unread)}</span>`:''}${k==='requests'?` <span class="muted mono">${num(home.tickets.filter(x=>!['closed','cancelled'].includes(x.status)).length)}</span>`:''}</a>`).join('');
  const c=C.counts();root.querySelector('#empOnline').innerHTML=`${C.dot(c.online?'online':'offline')} ${esc(c.online?t(`${num(c.online)} فني متصل`,`${c.online} technician${c.online>1?'s':''} online`):t('لا يوجد فني متصل','No technician online'))}`;
  root.querySelector('#empTeam').innerHTML=C.teamList();
  document.title=(unread?`(${unread}) `:'')+t('خدمات تقنية المعلومات','ICT Services');
 }
 function render(){if(!root)return;const v=root.querySelector('#empView');if(!v)return;const [r,arg]=location.hash.replace(/^#\/?/,'').split('/');const k=r||'help';
  drawChrome();
  if(k==='requests')return requests(v,arg);
  if(k==='new')return newRequest(v);
  if(k==='articles')return articles(v,arg);
  if(k==='chat')return chat(v);
  return assistant(v)}

 function assistant(v){botBox=v;if(!bot.log.length)greet();
  v.innerHTML=`<section class="panel botpanel"><div class="panel-h"><h2>${t('مساعد تقنية المعلومات','ICT help assistant')}</h2><button class="linkbtn" type="button" id="botReset">${t('بدء من جديد','Start over')}</button></div><div class="cthread" id="botLog"></div>
   <form class="ccomp" id="botForm"><textarea rows="2" maxlength="1000" placeholder="${esc(t('اكتب سؤالك… مثال: لا أستطيع الاتصال بالواي فاي','Type your question… e.g. I cannot connect to Wi-Fi'))}"></textarea><button class="btn" type="submit">${t('إرسال','Send')}</button></form></section>`;
  drawBot();const f=v.querySelector('#botForm'),ta=f.querySelector('textarea');
  ta.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();f.requestSubmit()}});
  f.onsubmit=e=>{e.preventDefault();const q=ta.value.trim();if(!q)return;ta.value='';you(q);setTimeout(()=>answer(q),250)};
  v.querySelector('#botReset').onclick=()=>{greet()};ta.focus()}

 function requests(v,id){const list=home.tickets;const tk=id&&list.find(x=>x.id===id);
  if(tk){v.innerHTML=`<section class="panel"><div class="panel-h"><h2><span class="mono">${esc(tk.number)}</span> · ${esc(tk.title)}</h2><a class="linkbtn" href="#/requests">${t('كل طلباتي','All my requests')}</a></div>
    <div class="actions">${statusPill(tk.status)}<span class="muted">${esc(t('سُجّل ','Logged ')+fmtDateTime(tk.createdAt))}${tk.owner?' · '+esc(t('الفني: ','Technician: ')+tk.owner):' · '+esc(t('بانتظار إسناده لفني','Waiting to be assigned'))}${tk.targetAt&&!['resolved','closed'].includes(tk.status)?' · '+esc(t('الموعد المتوقع ','Expected by ')+fmtDateTime(tk.targetAt)):''}</span></div>
    <p style="margin:0;white-space:pre-wrap">${esc(tk.details)}</p>
    ${tk.resolution&&["resolved","closed"].includes(tk.status)?`<div class="section-t">${t('الحل','Resolution')}</div><p style="margin:0;white-space:pre-wrap">${esc(tk.resolution)}</p>`:''}
    <div id="closeBox"></div>
    <div class="section-t">${t('التحديثات','Updates')}</div><div class="timeline">${tk.updates.length?tk.updates.map(u=>`<div class="ev"><div>${esc(u.text)}<small>${esc(u.by==='requester'?t('أنت','You'):u.by)} · ${esc(fmtDateTime(u.at))}</small></div></div>`).join(''):`<p class="muted" style="margin:0">${t('لا توجد تحديثات بعد.','No updates yet.')}</p>`}</div>
    ${['closed','cancelled'].includes(tk.status)?'':`<form class="ccomp" id="cmt"><textarea rows="2" maxlength="2000" placeholder="${esc(t('أضف معلومة أو سؤالاً للفني…','Add information or a question for the technician…'))}"></textarea><button class="btn" type="submit">${t('إرسال','Send')}</button></form>`}</section>`;
   drawClose(v.querySelector('#closeBox'),tk);
   v.querySelector('#cmt')?.addEventListener('submit',async e=>{e.preventDefault();const ta=e.target.querySelector('textarea'),tx=ta.value.trim();if(!tx)return;const r=await Store.api(`employee/tickets/${encodeURIComponent(tk.id)}/comment`,{method:'POST',body:JSON.stringify({text:tx})});if(!r.ok)return toast(r.body?.error||t('تعذر الإرسال','Could not send'),true);Object.assign(tk,r.body);toast(t('أُرسلت','Sent'));render()});return}
  v.innerHTML=`<section class="panel"><div class="panel-h"><h2>${t('طلباتي','My requests')}</h2><a class="btn" href="#/new">＋ ${t('طلب جديد','New request')}</a></div>
   ${list.length?`<div class="list">${list.map(x=>`<a class="li" href="#/requests/${esc(x.id)}"><span class="grow"><b><span class="mono">${esc(x.number)}</span> · ${esc(x.title)}</b><small>${esc(fmtDate(x.createdAt))}${x.owner?' · '+esc(x.owner):''}</small></span>${x.rating?`<span class="stars sm" title="${esc(t('تقييمك','Your rating'))}">${'★'.repeat(x.rating)}${'☆'.repeat(5-x.rating)}</span>`:x.status==='resolved'?pill(t('بانتظار تأكيدك','Needs your confirmation'),'warn'):x.status==='closed'?pill(t('قيّم الخدمة','Rate it'),'info'):''}${statusPill(x.status)}</a>`).join('')}</div>`:`<p class="empty">${t('ليست لديك طلبات بعد.','You have no requests yet.')}</p>`}</section>`}


 /* Close, confirm or reopen a request, and rate it 1–5 stars. */
 const starPicker=(name)=>`<div class="starpick" role="radiogroup" aria-label="${esc(t('التقييم من 1 إلى 5','Rating from 1 to 5'))}">${[1,2,3,4,5].map(n=>`<button type="button" role="radio" aria-checked="false" data-star="${n}" title="${n}/5" aria-label="${n}">★</button>`).join('')}<span class="muted" data-starlabel></span></div>`;
 const STARTXT=()=>['',t('سيئة جداً','Very poor'),t('سيئة','Poor'),t('مقبولة','OK'),t('جيدة','Good'),t('ممتازة','Excellent')];
 function wireStars(box){let val=0;const btns=[...box.querySelectorAll('[data-star]')],lab=box.querySelector('[data-starlabel]');
  const paint=n=>{btns.forEach(b=>{const on=Number(b.dataset.star)<=n;b.classList.toggle('on',on);b.setAttribute('aria-checked',String(Number(b.dataset.star)===val))});lab.textContent=n?`${n}/5 · ${STARTXT()[n]}`:''};
  btns.forEach(b=>{b.onclick=()=>{val=Number(b.dataset.star);paint(val)};b.onmouseenter=()=>paint(Number(b.dataset.star));b.onmouseleave=()=>paint(val)});return ()=>val}
 async function act(tk,body){const r=await Store.api(`employee/tickets/${encodeURIComponent(tk.id)}/act`,{method:'POST',body:JSON.stringify(body)});if(!r.ok){toast(r.body?.error||t('تعذر الحفظ','Could not save'),true);return false}Object.assign(tk,r.body);return true}
 function drawClose(box,tk){if(!box)return;const st=tk.status;
  if(st==='closed'&&tk.rating){box.innerHTML=`<div class="closecard"><b>${t('تقييمك','Your rating')}</b><span class="stars">${'★'.repeat(tk.rating)}${'☆'.repeat(5-tk.rating)}</span><span class="muted">${esc(STARTXT()[tk.rating])}</span>${tk.comment?`<p style="margin:0">“${esc(tk.comment)}”</p>`:''}<p class="muted" style="margin:0;font-size:12.5px">${t('شكراً لك على تقييمك.','Thank you for your feedback.')}</p></div>`;return}
  if(st==='cancelled'){box.innerHTML='';return}
  const mode=st==='closed'?'rate':st==='resolved'?'confirm':'close';
  box.innerHTML=`<form class="closecard" id="closeForm" novalidate>
   <b>${mode==='rate'?t('قيّم الخدمة التي حصلت عليها','Rate the service you received'):mode==='confirm'?t('هل حُلّت المشكلة؟','Is it fixed?'):t('إغلاق هذا الطلب','Close this request')}</b>
   ${mode==='confirm'?`<div class="chips"><label class="chip"><input type="radio" name="fx" value="yes" checked> ${t('نعم، أغلق الطلب','Yes, close the request')}</label><label class="chip"><input type="radio" name="fx" value="no"> ${t('لا، ما زالت المشكلة','No, it is still not working')}</label></div>`:''}
   ${mode==='close'?`<p class="muted" style="margin:0;font-size:12.5px">${t('إذا لم تعد بحاجة إلى المساعدة أو حُلّت المشكلة بطريقة أخرى.','If you no longer need help, or it was solved another way.')}</p>`:''}
   <div data-rate>${starPicker()}</div>
   <label class="field"><span data-txtlabel>${mode==='close'?t('السبب','Reason')+' *':t('تعليق (اختياري)','Comment (optional)')}</span><textarea rows="2" maxlength="1000" data-txt></textarea></label>
   <div class="actions"><button class="btn" type="submit">${mode==='rate'?t('إرسال التقييم','Send rating'):mode==='confirm'?t('تأكيد وإغلاق','Confirm and close'):t('إغلاق الطلب','Close the request')}</button></div></form>`;
  const getRating=wireStars(box),f=box.querySelector('#closeForm');
  const sync=()=>{const no=f.querySelector('input[name=fx]:checked')?.value==='no';f.querySelector('[data-rate]').hidden=no;f.querySelector('[data-txtlabel]').textContent=no?t('ما الذي لا يعمل؟','What is still not working?')+' *':mode==='close'?t('السبب','Reason')+' *':t('تعليق (اختياري)','Comment (optional)');f.querySelector('[type=submit]').textContent=no?t('إعادة فتح الطلب','Reopen the request'):mode==='rate'?t('إرسال التقييم','Send rating'):mode==='confirm'?t('تأكيد وإغلاق','Confirm and close'):t('إغلاق الطلب','Close the request')};
  f.querySelectorAll('input[name=fx]').forEach(x=>x.onchange=sync);
  f.onsubmit=async e=>{e.preventDefault();const txt=f.querySelector('[data-txt]').value.trim(),no=f.querySelector('input[name=fx]:checked')?.value==='no',rating=getRating();
   if(no){if(txt.length<3)return toast(t('اكتب ما الذي لا يعمل.','Tell us what is still not working.'),true);if(await act(tk,{action:'reopen',text:txt})){toast(t('أُعيد فتح الطلب وسيتابعه الفني.','The request was reopened; the technician will follow up.'));render()}return}
   if(!rating)return toast(t('اختر تقييماً من 1 إلى 5 نجوم.','Choose a rating from 1 to 5 stars.'),true);
   if(mode==='close'&&txt.length<3)return toast(t('اكتب سبب الإغلاق.','Write why you are closing it.'),true);
   const b=f.querySelector('[type=submit]');b.disabled=true;
   if(await act(tk,{action:mode==='rate'?'feedback':'close',rating,text:txt})){toast(t('شكراً لك! تم الحفظ.','Thank you! Saved.'));render()}else b.disabled=false}}

 function newRequest(v){const d=draft||{};draft=null;const groups=[...new Set(home.catalog.map(s=>s.group))];
  v.innerHTML=`<form class="panel" id="reqForm" novalidate><div class="panel-h"><h2>${t('طلب جديد','New request')}</h2></div><div class="form">
   <label class="field full" for="rSvc" style="grid-column:1/-1"><span>${t('الخدمة (اختياري)','Service (optional)')}</span><select id="rSvc"><option value="">${t('— مشكلة أو طلب آخر —','— A problem or something else —')}</option>${groups.map(g=>`<optgroup label="${esc(L(M.GROUPS.find(x=>x[0]===g)?.slice(1,3)||[g,g]))}">${home.catalog.filter(s=>s.group===g).map(s=>`<option value="${esc(s.id)}" ${d.serviceId===s.id?'selected':''}>${esc(svcTitle(s))}</option>`).join('')}</optgroup>`).join('')}</select></label>
   <label class="field" for="rType"><span>${t('النوع','Type')}</span><select id="rType"><option value="incident">${t('مشكلة / عطل','A problem / fault')}</option><option value="request">${t('طلب خدمة','A service request')}</option></select></label>
   <label class="field" for="rUrg"><span>${t('مدى الاستعجال','How urgent')}</span><select id="rUrg"><option value="low">${t('يمكن الانتظار','It can wait')}</option><option value="medium" selected>${t('عادي','Normal')}</option><option value="high">${t('عاجل — يوقف عملي','Urgent — I cannot work')}</option></select></label>
   <label class="field" for="rTitle" style="grid-column:1/-1"><span>${t('الموضوع','Subject')} *</span><input id="rTitle" maxlength="150" value="${esc(d.title||'')}" required></label>
   <label class="field" for="rDet" style="grid-column:1/-1"><span>${t('التفاصيل','Details')} *</span><textarea id="rDet" rows="5" maxlength="4000" required placeholder="${esc(t('ماذا حدث؟ متى؟ هل تظهر رسالة خطأ؟','What happened? Since when? Any error message?'))}">${esc(d.details||'')}</textarea></label>
   <label class="field" for="rLoc"><span>${t('الموقع / المكتب','Location / office')}</span><input id="rLoc" maxlength="80"></label>
   <label class="field" for="rAsset"><span>${t('رقم الجهاز (إن وجد)','Device / asset number (if any)')}</span><input id="rAsset" maxlength="60"></label>
   <label class="field" for="rPhone"><span>${t('رقم التواصل','Contact number')}</span><input id="rPhone" maxlength="40"></label>
   <label class="field" for="rDept"><span>${t('الإدارة','Department')}</span><input id="rDept" maxlength="80"></label></div>
   <p class="err" id="rErr" role="alert"></p><div class="actions"><button class="btn" type="submit">${t('إرسال الطلب','Send request')}</button></div></form>`;
  const svc=v.querySelector('#rSvc'),ty=v.querySelector('#rType');const sync=()=>{const s=home.catalog.find(x=>x.id===svc.value);if(s){ty.value=s.type==='request'?'request':'incident';if(!v.querySelector('#rTitle').value)v.querySelector('#rTitle').value=svcTitle(s)}};svc.onchange=sync;sync();
  v.querySelector('#reqForm').onsubmit=async e=>{e.preventDefault();const g=id=>v.querySelector(id).value.trim(),err=v.querySelector('#rErr');err.textContent='';
   const body={serviceId:svc.value,type:ty.value,urgency:g('#rUrg'),impact:g('#rUrg')==='high'?'medium':'medium',title:g('#rTitle'),details:g('#rDet'),location:g('#rLoc'),assetTag:g('#rAsset'),phone:g('#rPhone'),department:g('#rDept')};
   if(body.title.length<3||body.details.length<3){err.textContent=t('اكتب الموضوع والتفاصيل.','Write a subject and the details.');return}
   const b=e.target.querySelector('[type=submit]');b.disabled=true;const r=await Store.api('employee/requests',{method:'POST',body:JSON.stringify(body)});b.disabled=false;
   if(!r.ok){err.textContent=r.body?.error||t('تعذر الإرسال','Could not send');return}
   home.tickets.unshift(r.body);toast(t('أُرسل طلبك برقم ','Your request was sent as ')+r.body.number);location.hash='#/requests/'+r.body.id}}

 function articles(v,id){const a=id&&home.articles.find(x=>x.id===id);
  if(a){v.innerHTML=`<section class="panel"><div class="panel-h"><h2>${esc(a.title)}</h2><a class="linkbtn" href="#/articles">${t('كل المقالات','All articles')}</a></div><p class="muted" style="margin:0">${esc(a.category||'')}</p><div style="white-space:pre-wrap;line-height:1.7">${esc(a.body)}</div><div class="actions"><span class="muted">${t('لم يحل المشكلة؟','Still stuck?')}</span><a class="btn ghost" href="#/new">${t('سجّل طلباً','Log a request')}</a><a class="btn ghost" href="#/chat">${t('تحدث مع فني','Chat with a technician')}</a></div></section>`;return}
  v.innerHTML=`<section class="panel"><div class="panel-h"><h2>${t('مقالات المساعدة','Help articles')}</h2></div><input id="aq" placeholder="${esc(t('ابحث…','Search…'))}" aria-label="${esc(t('بحث في المقالات','Search articles'))}"><div class="list" id="alist"></div></section>`;
  const draw=q=>{const rows=q?home.articles.map(a=>({a,s:score(q,[[a.title,3],[a.tags,2],[a.body,1]])})).filter(x=>x.s>0).sort((x,y)=>y.s-x.s).map(x=>x.a):home.articles;
   v.querySelector('#alist').innerHTML=rows.length?rows.map(a=>`<a class="li" href="#/articles/${esc(a.id)}"><span class="grow"><b>${esc(a.title)}</b><small>${esc(a.category||'')} · ${esc(String(a.body).slice(0,110))}…</small></span></a>`).join(''):`<p class="empty">${t('لا توجد مقالات.','No articles.')}</p>`};
  v.querySelector('#aq').oninput=e=>draw(e.target.value.trim());draw('')}

 function chat(v){
  if(preview){v.innerHTML=`<section class="panel"><div class="panel-h"><h2>${t('المحادثة مع فريق تقنية المعلومات','Chat with the ICT team')}</h2></div><p class="muted" style="margin:0">${t('هنا يكتب الموظف للفريق ويختار فنياً متصلاً، ويرى ردودكم مباشرة. ترد عليهم من صفحة «المحادثة المباشرة».','Here employees write to the team, choose an online technician and see your replies live. You answer them from the Live chat page.')}</p><div class="actions"><a class="btn ghost" href="#/chat" id="toLive">${t('فتح المحادثة المباشرة','Open Live chat')}</a></div></section>`;v.querySelector('#toLive').onclick=e=>{e.preventDefault();stop();preview=false;location.hash='#/chat';App.refresh()};return}
  const draw=()=>{if(!v.isConnected||route()!=='chat'){off();C.stop();return}
   const list=C.sorted(),c=C.state.convs.get(chatOpen)||list.find(x=>x.status!=='closed')||list[0];if(c)chatOpen=c.id;
   const typing=v.querySelector('.ccomp textarea')?.value||'',focused=!!v.querySelector('.ccomp textarea:focus');
   v.innerHTML=`<section class="panel"><div class="panel-h"><h2>${t('المحادثة مع فريق تقنية المعلومات','Chat with the ICT team')}</h2>${list.length>1?`<select id="convSel" aria-label="${esc(t('المحادثات','Conversations'))}">${list.map(x=>`<option value="${esc(x.id)}" ${x.id===chatOpen?'selected':''}>${esc(fmtDate(x.createdAt))} · ${esc((x.topic||x.messages?.[0]?.text||'').slice(0,40))} · ${esc(x.status)}</option>`).join('')}</select>`:''}</div>
    ${c&&c.status!=='closed'?`<div class="muted" style="font-size:12.5px">${C.statusPill(c.status)} ${c.assigneeName?esc(t('مع ','With ')+c.assigneeName)+' '+C.dot(C.team().find(x=>x.email===c.assignee)?.state||'offline'):esc(t('سيرد أول فني متاح.','The first available technician will reply.'))}</div><div class="cthread">${C.bubbles(c)}</div>${C.composer(c.id,false)}`
    :`${c?`<div class="cthread">${C.bubbles(c)}</div><p class="muted" style="margin:0">${t('أُغلقت هذه المحادثة.','This conversation is closed.')}</p>`:''}
     <form class="ccomp" id="newConv"><textarea rows="2" maxlength="2000" placeholder="${esc(t('اكتب رسالتك للفريق…','Write your message to the team…'))}"></textarea>
     <select id="toTech" aria-label="${esc(t('إلى','To'))}"><option value="">${t('أي فني متاح','Any available technician')}</option>${C.team().filter(x=>x.state!=='offline').map(x=>`<option value="${esc(x.email)}">${esc(x.name)} · ${esc(C.stateLabel(x.state))}</option>`).join('')}</select><button class="btn" type="submit">${t('بدء المحادثة','Start chat')}</button></form>
     ${C.counts().online?'':`<p class="muted" style="margin:0;font-size:12.5px">${t('لا يوجد فني متصل الآن؛ سيصلهم إشعار برسالتك.','No technician is online now; the team will see your message when they are back.')}</p>`}`}</section>`;
   const ta=v.querySelector('.ccomp textarea');if(ta&&typing)ta.value=typing;if(ta&&focused)ta.focus();C.scrollEnd(v);RA.hydrate(v);
   C.wireComposer(v);
   v.querySelector('#convSel')?.addEventListener('change',e=>{chatOpen=e.target.value;draw()});
   v.querySelector('#newConv')?.addEventListener('submit',async e=>{e.preventDefault();const ta2=e.target.querySelector('textarea'),tx=ta2.value.trim();if(!tx)return;ta2.value='';try{const nc=await C.startChat({text:tx,to:v.querySelector('#toTech').value});chatOpen=nc.id}catch(x){const n=v.querySelector('#newConv textarea');if(n)n.value=tx;toast(x.message,true)}});
   if(c?.unread)C.action(c.id,'read').then(C.refreshPresence).catch(()=>{});
  };
  let sig='';const off=C.on(()=>{const c=C.state.convs.get(chatOpen);const s=[...C.state.convs.values()].map(x=>x.id+x.updatedAt).join()+C.team().map(x=>x.state).join();if(s!==sig){sig=s;draw()}});
  C.poll(4000);draw()}

 const logo=()=>`<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><rect width="30" height="30" rx="7" fill="#4fc3c9"/><path d="M7 19h4l2-7 3 11 2-7 1 3h4" stroke="#0f2a2c" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
 let tick=0;
 function stop(){active=false;clearInterval(tick);C.stop()}
 async function start(el,opt={}){root=el;active=true;preview=!!opt.preview;bot.log=[];closeFab(true);if(preview)history.replaceState(null,'','#/help');
  try{await load()}catch(x){root.innerHTML=`<main class="login"><form><h1>${t('تعذر التحميل','Could not load')}</h1></form></main>`;return}
  if(!location.hash||location.hash==='#/'||location.hash==='#')history.replaceState(null,'','#/help');
  shell();C.startPresence();C.on(drawChrome);render();
  clearInterval(tick);tick=setInterval(async()=>{if(document.hidden||P.printing)return;if(Date.now()-loadedAt>60000&&route()!=='new'){try{await load();if(route()==='requests')render();else drawChrome()}catch{}}},15000);
 }
 window.addEventListener('hashchange',()=>{if(!active)return;if(location.hash.startsWith('#/r/')){stop();V.requester(root,location.hash.slice(4));return}render()});
 /* Floating help assistant for the ICT team portal (and a quick way to try the chatbot). */
 function closeFab(remove){const p=document.getElementById('botFabPanel');if(p)p.hidden=true;if(remove){fabEl?.remove();fabEl=null;document.getElementById('botFabPanel')?.remove()}}
 async function fab(){if(active||Store.mode!=='server'||document.getElementById('botFab'))return;
  fabEl=document.createElement('button');fabEl.type='button';fabEl.id='botFab';fabEl.className='botfab';fabEl.title=t('مساعد تقنية المعلومات','ICT help assistant');fabEl.setAttribute('aria-label',fabEl.title);
  fabEl.innerHTML='<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg>';
  document.body.append(fabEl);
  fabEl.onclick=async()=>{let p=document.getElementById('botFabPanel');
   if(p&&!p.hidden){p.hidden=true;return}
   if(!loadedAt||Date.now()-loadedAt>120000){try{await load()}catch{toast(t('تعذر تحميل المساعد','Could not load the assistant'),true);return}}
   if(!p){p=document.createElement('div');p.id='botFabPanel';p.className='botfabpanel';document.body.append(p)}
   p.hidden=false;assistant(p);p.querySelector('.panel-h').insertAdjacentHTML('beforeend',`<button class="iconbtn" type="button" id="botFabX" aria-label="${esc(t('إغلاق','Close'))}">✕</button>`);p.querySelector('#botFabX').onclick=()=>closeFab()};
 }
 return {fab,closeFab,start,stop,get active(){return active},searchAll,score,norm};
})();
