/* Live chat and presence (who in the ICT team is online). Shared by the team portal and the employee view. */
window.C=(()=>{
 const {t,esc,num,fmtDateTime,ago,toast,initials}=P;
 const state={presence:null,convs:new Map(),since:'',open:'',filter:'waiting',timer:0,listeners:new Set()};
 const me=()=>Store.user?.email;
 const isTeam=()=>['admin','technician'].includes(Store.user?.role);
 const api=(path,opt)=>Store.api(path,opt);
 const post=(path,body)=>api(path,{method:'POST',body:JSON.stringify(body||{})});
 let heldEmit=false;
 const emit=()=>{if(P.printing){heldEmit=true;return}state.listeners.forEach(f=>{try{f()}catch(e){console.error(e)}})};
 P.afterPrint(()=>{if(heldEmit){heldEmit=false;emit()}});
 const on=f=>{state.listeners.add(f);return()=>state.listeners.delete(f)};

 /* ---------- Presence ---------- */
 const STATES={online:['متصل','Online','ok'],busy:['مشغول','Busy','warn'],offline:['غير متصل','Offline','']};
 const dot=s=>`<span class="pdot ${esc(s)}" aria-hidden="true"></span>`;
 const stateLabel=s=>t(STATES[s]?.[0]||'',STATES[s]?.[1]||s);
 async function refreshPresence(){if(Store.mode!=='server'||!Store.user)return;const r=await api('presence');if(r.ok){state.presence=r.body;emit()}}
 let pTimer=0;
 function startPresence(){clearInterval(pTimer);refreshPresence();pTimer=setInterval(()=>{if(!document.hidden||Date.now()%4===0)refreshPresence()},25000)}
 async function setStatus(s){const r=await post('presence',{status:s});if(r.ok){await refreshPresence();toast(t('تم تحديث حالتك','Status updated'))}}
 const team=()=>state.presence?.team||[];
 const counts=()=>({online:team().filter(x=>x.state==='online').length,busy:team().filter(x=>x.state==='busy').length});
 const badge=()=>{const c=state.presence?.chat||{};return (c.waiting||0)+(c.unread||0)};
 function teamList(){const list=team();if(!list.length)return `<p class="muted" style="margin:0">${t('لا يوجد أعضاء في فريق تقنية المعلومات.','No ICT team members yet.')}</p>`;
  return `<div class="list">${list.map(x=>`<div class="li"><span class="avatar" style="position:relative">${esc(initials(x.name||x.email))}${dot(x.state)}</span><span class="grow"><b>${esc(x.name||x.email)}</b><small>${esc(stateLabel(x.state))}${x.state==='offline'&&x.lastSeen?' · '+esc(t('آخر ظهور ','last seen ')+ago(x.lastSeen)):''}</small></span></div>`).join('')}</div>`}
 function statusControl(){if(!isTeam()||Store.mode!=='server')return '';const s=state.presence?.me?.status||'available';
  return `<label class="statussel" title="${esc(t('حالتك في المحادثة','Your chat status'))}">${dot(s==='available'?'online':s==='busy'?'busy':'offline')}<select id="myStatus" aria-label="${esc(t('حالتك','Your status'))}"><option value="available" ${s==='available'?'selected':''}>${t('متاح','Available')}</option><option value="busy" ${s==='busy'?'selected':''}>${t('مشغول','Busy')}</option><option value="offline" ${s==='offline'?'selected':''}>${t('الظهور غير متصل','Appear offline')}</option></select></label>`}

 /* ---------- Conversations ---------- */
 async function sync(full){if(Store.mode!=='server')return;const r=await api('chat'+(full||!state.since?'':'?since='+encodeURIComponent(state.since)));if(!r.ok)return;if(full)state.convs.clear();for(const c of r.body.items)state.convs.set(c.id,c);state.since=r.body.now;emit()}
 const sorted=()=>[...state.convs.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
 const put=c=>{if(c?.id){state.convs.set(c.id,{...state.convs.get(c.id),...c,unread:0});emit()}return c};
 async function send(id,text){const r=await post(`chat/${encodeURIComponent(id)}/messages`,{text});if(!r.ok)throw Error(r.body?.error||t('تعذر الإرسال','Could not send'));return put(r.body)}
 async function action(id,act,to){const r=await post(`chat/${encodeURIComponent(id)}/action`,{action:act,to});if(!r.ok)throw Error(r.body?.error||t('تعذر التنفيذ','Could not do that'));return put(r.body)}
 async function startChat(body){const r=await post('chat',body);if(!r.ok)throw Error(r.body?.error||t('تعذر بدء المحادثة','Could not start the conversation'));return put(r.body)}
 function poll(ms){clearInterval(state.timer);sync(true);state.timer=setInterval(()=>{if(!document.hidden)sync()},ms||4000)}
 const stop=()=>clearInterval(state.timer);

 const STATUS={waiting:['بانتظار فني','Waiting for a technician','warn'],open:['جارية','In progress','info'],closed:['مغلقة','Closed','']};
 const statusPill=s=>P.pill(t(STATUS[s]?.[0]||s,STATUS[s]?.[1]||s),STATUS[s]?.[2]||'');
 function bubbles(c){const mine=me();return (c.messages||[]).map(m=>{
   if(m.kind==='system')return `<div class="cmsg sys"><span>${esc(m.text)}</span></div>`;
   if(m.kind==='remote')return `<div class="cmsg sys rmt"><div class="racard" data-ra="${esc(m.session||'')}"><b>${esc(m.text)}</b><small>${esc(fmtDateTime(m.at))}</small><div class="ra-act"></div></div></div>`;
   const own=m.by===mine,bot=m.by==='bot';
   return `<div class="cmsg ${own?'own':''} ${bot?'bot':''} ${m.kind==='transcript'?'tr':''}"><div class="cb"><small>${esc(bot?t('المساعد','Help assistant'):own?t('أنت','You'):m.name||m.by)} · ${esc(fmtDateTime(m.at))}</small><div>${esc(m.text).replace(/\n/g,'<br>')}</div></div></div>`}).join('')}
 function composer(id,disabled){return `<form class="ccomp" data-conv="${esc(id)}"><textarea rows="2" maxlength="2000" placeholder="${esc(t('اكتب رسالة… (Enter للإرسال)','Write a message… (Enter to send)'))}" ${disabled?'disabled':''}></textarea><button class="btn" type="submit" ${disabled?'disabled':''}>${t('إرسال','Send')}</button></form>`}
 function wireComposer(root,onSent){root.querySelectorAll('form.ccomp[data-conv]').forEach(f=>{const ta=f.querySelector('textarea');
  ta.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();f.requestSubmit()}});
  f.onsubmit=async e=>{e.preventDefault();const v=ta.value.trim();if(!v)return;ta.value='';try{await send(f.dataset.conv,v);onSent?.();refreshPresence()}catch(x){const now=f.isConnected?ta:document.querySelector(`form.ccomp[data-conv="${f.dataset.conv}"] textarea`);if(now)now.value=v;toast(x.message,true)}const live=document.querySelector(`form.ccomp[data-conv="${f.dataset.conv}"] textarea`);live?.focus()}})}
 const scrollEnd=el=>{const b=el?.querySelector('.cthread');if(b)b.scrollTop=b.scrollHeight};

 /* ---------- Team page: #/chat ---------- */
 function page(view){
  const FILTERS=[['waiting',t('بانتظار فني','Waiting')],['mine',t('محادثاتي','Mine')],['open',t('كل الجارية','All open')],['closed',t('المغلقة','Closed')]];
  const match=c=>state.filter==='waiting'?c.status==='waiting':state.filter==='mine'?c.assignee===me()&&c.status!=='closed':state.filter==='open'?c.status!=='closed':c.status==='closed';
  view.innerHTML=`<div class="pagehead"><div><h1>${t('المحادثة المباشرة','Live chat')}</h1><p>${t('محادثات الموظفين مع فريق تقنية المعلومات. تظهر حالتك للموظفين.','Conversations between employees and the ICT team. Employees see your status.')}</p></div><div class="actions"><button class="btn ghost" type="button" id="newChat">${t('محادثة جديدة مع موظف','New chat with an employee')}</button></div></div>
   <div class="chatgrid"><section class="panel chatlist"><div class="chips" id="cf"></div><div id="clist" class="list"></div></section><section class="panel chatmain" id="cmain"></section><section class="panel chatteam"><div class="panel-h"><h2>${t('فريق تقنية المعلومات','ICT team')}</h2></div><div id="cteam"></div></section></div>`;
  const draw=()=>{if(!view.isConnected||!location.hash.startsWith('#/chat')){off();stop();return}
   const all=sorted(),n=k=>all.filter(c=>{const f=state.filter;state.filter=k;const r=match(c);state.filter=f;return r}).length;
   view.querySelector('#cf').innerHTML=FILTERS.map(([k,l])=>`<button type="button" class="chip" data-f="${k}" aria-pressed="${state.filter===k}">${esc(l)} <span class="mono">${num(n(k))}</span></button>`).join('');
   view.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{state.filter=b.dataset.f;draw()});
   const list=all.filter(match);
   view.querySelector('#clist').innerHTML=list.length?list.map(c=>{const last=(c.messages||[]).filter(m=>m.kind!=='system').at(-1);return `<button type="button" class="li cli ${c.id===state.open?'on':''}" data-c="${esc(c.id)}"><span class="avatar">${esc(initials(c.employeeName||c.employee))}</span><span class="grow"><b>${esc(c.employeeName||c.employee)}</b><small>${esc((last?.text||'').slice(0,70))}</small><small>${esc(ago(c.updatedAt))}${c.assigneeName?' · '+esc(c.assigneeName):''}</small></span>${c.unread?`<span class="count">${num(c.unread)}</span>`:''}</button>`}).join(''):`<p class="empty">${t('لا توجد محادثات هنا.','No conversations here.')}</p>`;
   view.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{state.open=b.dataset.c;draw();openConv()});
   view.querySelector('#cteam').innerHTML=teamList();
   drawMain();
  };
  let lastDrawn='';
  const drawMain=()=>{const box=view.querySelector('#cmain'),c=state.convs.get(state.open);
   if(!c){box.innerHTML=`<p class="empty">${t('اختر محادثة من القائمة.','Choose a conversation from the list.')}</p><p class="muted" style="margin:0;font-size:12.5px;text-align:center">${t('أزرار «رؤية الشاشة» و«تحكم عن بعد» و«صلاحيات المسؤول» تظهر أعلى المحادثة. للبدء مع أي موظف افتح ','The See screen, Remote control and Admin rights buttons appear at the top of a conversation. To start with any employee, open ')}<a href="#/remote">${t('المساعدة عن بعد','Remote help')}</a>.</p>`;lastDrawn='';return}
   const sig=c.id+c.updatedAt+c.status+c.assignee+(c.ticket||'');if(sig===lastDrawn)return;
   const typing=box.querySelector('textarea')?.value||'',focused=!!box.querySelector('textarea:focus');lastDrawn=sig;
   const techs=team().filter(x=>x.email!==me());
   box.innerHTML=`<div class="chead"><div><b>${esc(c.employeeName||c.employee)}</b> <span class="muted mono" style="font-size:12px">${esc(c.employee)}</span><div class="muted" style="font-size:12.5px">${statusPill(c.status)} ${c.assigneeName?esc(t('مع ','With ')+c.assigneeName):esc(t('لم يُسند بعد','Not taken yet'))}${c.ticket?' · '+esc(t('طلب ','Ticket ')+c.ticket):''}</div></div>
    <div class="actions">${c.status!=='closed'&&c.assignee!==me()?`<button class="btn sm" type="button" data-a="take">${t('استلام','Take it')}</button>`:''}
     ${c.status!=='closed'&&techs.length?`<select id="tr" aria-label="${esc(t('تحويل إلى','Transfer to'))}"><option value="">${t('تحويل إلى…','Transfer to…')}</option>${techs.map(x=>`<option value="${esc(x.email)}">${esc(x.name)} · ${esc(stateLabel(x.state))}</option>`).join('')}</select>`:''}
     ${c.status!=='closed'?`<button class="btn ghost sm" type="button" data-a="screen" title="${esc(t('يطلب من الموظف مشاركة شاشته (عرض فقط)','Asks the employee to share their screen (view only)'))}">${t('رؤية الشاشة','See screen')}</button><button class="btn ghost sm" type="button" data-a="admin" title="${esc(t('تثبيت أو إزالة أو تحديث برامج بصلاحيات المسؤول','Install, remove or update apps with administrator rights'))}">${t('صلاحيات المسؤول','Admin rights')}</button><button class="btn ghost sm" type="button" data-a="qa" title="${esc(t('تحكم عن بعد عبر Windows Remote Assistance (msra)','Remote control with Windows Remote Assistance (msra)'))}">${t('تحكم عن بعد','Remote control')}</button>`:''}
     ${c.ticket?`<a class="btn ghost sm" href="#/m/tickets/${esc(c.ticketId||'')}">${esc(c.ticket)}</a>`:M.can('tickets')?`<button class="btn ghost sm" type="button" data-a="ticket">${t('إنشاء طلب','Create ticket')}</button>`:''}
     ${c.status==='closed'?`<button class="btn ghost sm" type="button" data-a="reopen">${t('إعادة فتح','Reopen')}</button>`:`<button class="btn ghost sm" type="button" data-a="close">${t('إغلاق','Close')}</button>`}</div></div>
    <div class="cthread">${bubbles(c)}</div>${composer(c.id,c.status==='closed')}`;
   const ta=box.querySelector('textarea');ta.value=typing;if(focused)ta.focus();scrollEnd(box);RA.hydrate(box);
   wireComposer(box,()=>{if(state.filter==='waiting'){state.filter='mine';draw()}});
   box.querySelectorAll('[data-a]').forEach(b=>b.onclick=async()=>{try{if(b.dataset.a==='screen'){await RA.request(c.id,'screen');await sync();return}if(b.dataset.a==='qa'){RA.msraDialog(c.id,c.employee);return}if(b.dataset.a==='admin'){RA.adminDialog(c.id);return}if(b.dataset.a==='ticket'){const r=await post(`chat/${encodeURIComponent(c.id)}/ticket`);if(!r.ok)throw Error(r.body?.error||'');toast(t('أُنشئ الطلب ','Ticket created ')+r.body.number);await sync();await Store.load().catch(()=>{});}else{await action(c.id,b.dataset.a);if(b.dataset.a==='take'){state.filter='mine';draw()}refreshPresence()}}catch(x){toast(x.message||t('تعذر التنفيذ','Could not do that'),true)}});
   box.querySelector('#tr')?.addEventListener('change',async e=>{if(!e.target.value)return;try{await action(c.id,'transfer',e.target.value);toast(t('تم التحويل','Transferred'))}catch(x){toast(x.message,true)}});
   if(c.unread)action(c.id,'read').then(refreshPresence).catch(()=>{});
  };
  const openConv=()=>{lastDrawn='';drawMain()};
  view.querySelector('#newChat').onclick=()=>newChatDialog();
  if(state.filter==='waiting'&&!sorted().some(c=>c.status==='waiting'))state.filter='open';
  const off=on(draw);poll(4000);refreshPresence();draw();
 }
 function newChatDialog(){const emps=Store.all('members').filter(m=>m.active!==false&&m.email!==me()).sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  const d=document.createElement('div');d.className='scrim';d.innerHTML=`<form class="panel dialog" style="max-width:460px;margin:12vh auto;gap:12px"><h2 style="margin:0">${t('محادثة جديدة','New chat')}</h2>
   <label class="field" for="ncTo"><span>${t('مع','With')}</span><select id="ncTo" required>${emps.map(m=>`<option value="${esc(m.email)}">${esc(m.name||m.email)} — ${esc(m.email)}</option>`).join('')}</select></label>
   <label class="field" for="ncText"><span>${t('الرسالة','Message')}</span><textarea id="ncText" rows="3" maxlength="2000" required></textarea></label>
   <div class="actions"><button class="btn" type="submit">${t('بدء','Start')}</button><button class="btn ghost" type="button" data-x>${t('إلغاء','Cancel')}</button></div></form>`;
  document.body.append(d);const close=()=>d.remove();d.querySelector('[data-x]').onclick=close;d.onclick=e=>{if(e.target===d)close()};
  d.querySelector('form').onsubmit=async e=>{e.preventDefault();try{const c=await startChat({employee:d.querySelector('#ncTo').value,text:d.querySelector('#ncText').value});state.open=c.id;state.filter='mine';close();emit()}catch(x){toast(x.message,true)}}}


 /* ---------- Remote help page: #/remote ---------- */
 const employees=()=>state.presence?.employees||[];
 /* Finds the open conversation with this employee, or starts one, then opens it in Live chat. */
 async function convWith(email,text){await sync(true);let c=sorted().find(x=>x.employee===email&&x.status!=='closed');
  if(!c)c=await startChat({employee:email,text:text||t('مرحباً، فريق تقنية المعلومات يرغب بمساعدتك عن بعد. ستظهر لك رسالة هنا للموافقة.','Hello, the ICT team would like to help you remotely. A request will appear here for you to accept.')});
  return c}
 function remotePage(view){
  view.innerHTML=`<div class="pagehead"><div><h1>${t('المساعدة عن بعد','Remote help')}</h1><p>${t('ساعد الموظف على جهازه بموافقته: رؤية الشاشة، أو التحكم عبر Windows Remote Assistance، أو استخدام صلاحيات المسؤول للتثبيت والتحديث.','Help an employee on their computer, with their consent: see their screen, take control with Windows Remote Assistance, or use administrator rights to install and update.')}</p></div></div>
   <div class="grid">
    <section class="panel s4"><div class="panel-h"><h2>${t('رؤية الشاشة','See screen')}</h2></div><p class="muted" style="margin:0;font-size:13px">${t('مدمج في البوابة، عرض فقط. يحتاج البوابة على https:// وأن يكون الموظف مسجلاً الدخول.','Built into the portal, view only. Needs the portal on https:// and the employee signed in.')}</p></section>
    <section class="panel s4"><div class="panel-h"><h2>${t('تحكم عن بعد','Remote control')}</h2></div><p class="muted" style="margin:0;font-size:13px">${t('عبر Windows Remote Assistance (msra /offerRA) باسم جهاز الموظف، بعد موافقته.','With Windows Remote Assistance (msra /offerRA) to the employee’s computer name, after they agree.')}</p></section>
    <section class="panel s4"><div class="panel-h"><h2>${t('صلاحيات المسؤول','Admin rights')}</h2></div><p class="muted" style="margin:0;font-size:13px">${t('لتثبيت البرامج أو إزالتها أو تحديثها: حساب الدعم أو LAPS أو صلاحية مؤقتة، مع إبلاغ الموظف.','To install, remove or update apps: your support account, LAPS or temporary rights, with the employee told.')}</p></section>
    <section class="panel s12"><div class="panel-h"><h2>${t('الموظفون','Employees')}</h2><input id="remQ" placeholder="${esc(t('ابحث بالاسم أو البريد…','Search name or email…'))}" style="font:inherit;padding:7px 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--fg);min-width:240px"></div><div id="remList"></div>
     <p class="muted" style="margin:0;font-size:12.5px">${t('يظهر هنا الأعضاء بدور «موظف». الموظف المتصل (أخضر) يرى طلبك فوراً؛ غير المتصل يراه عند فتح البوابة.','People with the Employee role are listed. An online employee (green) sees your request at once; an offline one sees it when they open the portal.')}</p></section>
   </div>`;
  const draw=()=>{if(!view.isConnected||!location.hash.startsWith('#/remote')){off();return}const q=(view.querySelector('#remQ').value||'').toLowerCase(),list=employees().filter(x=>!q||(x.name+' '+x.email).toLowerCase().includes(q));
   view.querySelector('#remList').innerHTML=list.length?`<div class="list">${list.slice(0,200).map(x=>`<div class="li"><span class="avatar" style="position:relative">${esc(initials(x.name||x.email))}${dot(x.state)}</span><span class="grow"><b>${esc(x.name||x.email)}</b><small>${esc(x.email)} · ${esc(stateLabel(x.state))}${x.state==='offline'&&x.lastSeen?' · '+esc(t('آخر ظهور ','last seen ')+ago(x.lastSeen)):''}</small></span><div class="actions"><button class="btn ghost sm" type="button" data-r="screen" data-e="${esc(x.email)}">${t('رؤية الشاشة','See screen')}</button><button class="btn ghost sm" type="button" data-r="qa" data-e="${esc(x.email)}">${t('تحكم عن بعد','Remote control')}</button><button class="btn ghost sm" type="button" data-r="admin" data-e="${esc(x.email)}">${t('صلاحيات المسؤول','Admin rights')}</button><button class="btn ghost sm" type="button" data-r="chat" data-e="${esc(x.email)}">${t('محادثة','Chat')}</button></div></div>`).join('')}</div>`
    :`<p class="empty">${t('لا يوجد موظفون بعد. أضفهم في أعضاء الفريق بدور «موظف»، أو فعّل الإضافة التلقائية مع تسجيل الدخول بحساب Microsoft.','No employees yet. Add them in Team members with the Employee role, or turn on automatic adding with Microsoft sign-in.')}</p>`;
   view.querySelectorAll('[data-r]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const c=await convWith(b.dataset.e);state.open=c.id;state.filter='mine';
     if(b.dataset.r==='screen'){await RA.request(c.id,'screen');toast(t('أُرسل الطلب للموظف','Request sent to the employee'))}
     else if(b.dataset.r==='qa')RA.msraDialog(c.id,b.dataset.e);
     else if(b.dataset.r==='admin')RA.adminDialog(c.id);
     else location.hash='#/chat'}catch(x){toast(x.message,true)}b.disabled=false})};
  view.querySelector('#remQ').oninput=draw;
  const off=on(draw);refreshPresence();draw()}
 return {remotePage,convWith,state,on,emit,refreshPresence,startPresence,setStatus,team,counts,badge,teamList,statusControl,dot,stateLabel,sync,sorted,send,action,startChat,poll,stop,bubbles,composer,wireComposer,scrollEnd,statusPill,page,isTeam};
})();
