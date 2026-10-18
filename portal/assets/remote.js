/* Remote help, always with the employee's consent.
   Screen sharing: the employee's browser shares the screen (WebRTC, view only) directly with the technician's browser;
   the portal only relays the set-up messages. Remote control: Windows Remote Assistance (msra /offerRA) by computer name. */
window.RA=(()=>{
 const {t,esc,toast}=P;
 const cache=new Map();          /* session id -> {s, at} */
 let share=null;                 /* employee side: {id, pc, stream, timer, n} */
 let view=null;                  /* technician side: {id, pc, timer, n, el} */
 let iceServers=null;
 const api=(p,o)=>Store.api(p,o),post=(p,b)=>api(p,{method:'POST',body:JSON.stringify(b||{})});
 const isTeam=()=>['admin','technician'].includes(Store.user?.role);
 async function ice(){if(iceServers)return iceServers;const r=await api('remote/config');iceServers=r.ok?(r.body.iceServers||[]):[];return iceServers}
 async function get(id,fresh){const c=cache.get(id);if(!fresh&&c&&Date.now()-c.at<4000)return c.s;const r=await api('remote/'+encodeURIComponent(id));if(!r.ok)return null;cache.set(id,{s:r.body.session,at:Date.now()});return r.body.session}
 const signal=(id,type,data)=>post(`remote/${encodeURIComponent(id)}/signal`,{type,data});
 const secure=()=>window.isSecureContext&&navigator.mediaDevices?.getDisplayMedia;

 /* ---------- Technician: ask ---------- */
 async function request(conv,kind,computer){const r=await post('remote',{conversation:conv,kind,computer});if(!r.ok)throw Error(r.body?.error||t('تعذر الإرسال','Could not send'));cache.set(r.body.id,{s:r.body,at:Date.now()});if(kind==='screen')openViewer(r.body.id);return r.body}
 /* Windows Remote Assistance (msra.exe /offerRA). The browser cannot start programs by itself, so "Connect" uses the
    ictops-msra: link that install-msra-link.ps1 registers on technicians' PCs; the command can also be copied. */
 const PCRX=/^[A-Za-z0-9][A-Za-z0-9-]{0,62}(\.[A-Za-z0-9-]{1,63}){0,5}$/;
 const msraCmd=pc=>`msra.exe /offerRA ${pc}`;
 const remembered=key=>{try{return localStorage.getItem('ictops.pc.'+key)||''}catch{return ''}};
 const remember=(key,pc)=>{try{if(pc)localStorage.setItem('ictops.pc.'+key,pc)}catch{}};
 function msraDialog(conv,employee){const d=document.createElement('div');d.className='scrim';const pc0=remembered(employee||conv);
  d.innerHTML=`<form class="panel" style="max-width:540px;margin:10vh auto;gap:12px"><h2 style="margin:0">${t('تحكم عن بعد — Windows Remote Assistance','Remote control — Windows Remote Assistance')}</h2>
   <ol style="margin:0;padding-inline-start:20px;line-height:1.8;font-size:13.5px"><li>${t('يوافق الموظف في البوابة (ويكتب اسم جهازه إن لم تعرفه).','The employee agrees in the portal (and types their computer name if you leave it empty).')}</li><li>${t('اضغط «اتصال» ليفتح msra.exe /offerRA على جهازك.','Press Connect to start msra.exe /offerRA on your PC.')}</li><li>${t('يقبل الموظف نافذة Windows، ثم تطلب «طلب التحكم» ويوافق.','The employee accepts the Windows prompt; then you choose Request control and they approve.')}</li></ol>
   <label class="field" for="raPc"><span>${t('اسم جهاز الموظف (اختياري)','Employee’s computer name (optional)')}</span><input id="raPc" value="${esc(pc0)}" placeholder="OMR-LT-0123" spellcheck="false" dir="ltr" autocomplete="off"><span class="hint">${t('اتركه فارغاً ليكتبه الموظف.','Leave empty and the employee types it.')}</span></label>
   <div class="actions"><button class="btn" type="submit">${t('إرسال الطلب للموظف','Send the request to the employee')}</button><button class="btn ghost" type="button" data-x>${t('إلغاء','Cancel')}</button></div></form>`;
  document.body.append(d);const close=()=>d.remove();d.querySelector('[data-x]').onclick=close;d.onclick=e=>{if(e.target===d)close()};d.querySelector('#raPc').focus();
  d.querySelector('form').onsubmit=async e=>{e.preventDefault();const pc=d.querySelector('#raPc').value.trim();if(pc&&!PCRX.test(pc))return toast(t('اسم جهاز غير صحيح.','That is not a valid computer name.'),true);
   try{remember(employee||conv,pc);await request(conv,'msra',pc);close();toast(t('أُرسل الطلب للموظف','Request sent to the employee'));C.sync?.()}catch(x){toast(x.message,true)}}}
 function connectButtons(pc){return `<a class="btn sm" href="ictops-msra:${encodeURIComponent(pc)}" title="${esc(t('يحتاج install-msra-link.ps1 مرة واحدة على جهازك','Needs install-msra-link.ps1 once on your PC'))}">${t('اتصال','Connect')} · ${esc(pc)}</a><button class="btn ghost sm" type="button" data-copy="${esc(msraCmd(pc))}">${t('نسخ الأمر','Copy command')}</button>`}

 /* ---------- Technician: viewer ----------
    First a direct browser-to-browser connection (WebRTC). If no picture arrives within a few seconds
    (for example a firewall or hidden local addresses), it switches to relay: the employee's browser sends
    compressed snapshots through the portal several times a second. */
 const RELAY_AFTER=7000;
 function openViewer(id){closeViewer(true);
  const el=document.createElement('div');el.className='raview';el.innerHTML=`<div class="raview-h"><b>${t('شاشة الموظف','Employee screen')}</b><span class="muted" id="raState">${t('بانتظار موافقة الموظف…','Waiting for the employee to accept…')}</span><span class="grow"></span><span class="pill" id="raMode" hidden></span><button class="btn ghost sm" type="button" id="raRelay" hidden>${t('استخدام الترحيل','Use relay')}</button><button class="btn ghost sm" type="button" id="raMin">${t('تصغير','Minimise')}</button><button class="btn ghost sm" type="button" id="raFull">${t('ملء الشاشة','Full screen')}</button><button class="btn sm" type="button" id="raEnd">${t('إنهاء','End')}</button></div><div class="raview-b"><video id="raVideo" autoplay playsinline muted></video><img id="raImg" alt="" hidden><p class="raview-wait" id="raWait">${t('بانتظار صورة الشاشة…','Waiting for the picture…')}</p></div>`;
  document.body.append(el);view={id,el,n:0,pc:null,timer:0,queue:[],relay:false,seq:0,acceptedAt:0};
  el.querySelector('#raEnd').onclick=()=>end(id);
  el.querySelector('#raFull').onclick=()=>{const m=view?.relay?el.querySelector('#raImg'):el.querySelector('#raVideo');(m.requestFullscreen?m:el).requestFullscreen?.()};
  el.querySelector('#raMin').onclick=()=>{el.classList.toggle('mini');el.querySelector('#raMin').textContent=el.classList.contains('mini')?t('تكبير','Restore'):t('تصغير','Minimise')};
  el.querySelector('#raRelay').onclick=()=>startRelayView();
  const v=el.querySelector('#raVideo');v.addEventListener('playing',()=>{if(view&&!view.relay){gotPicture(t('متصل مباشرة — عرض فقط','Connected directly — view only'))}});
  view.timer=setInterval(()=>pollViewer(),1000);pollViewer()}
 const setState=s=>{const x=view?.el.querySelector('#raState');if(x)x.textContent=s};
 function gotPicture(msg){if(!view)return;view.picture=true;setState(msg);const w=view.el.querySelector('#raWait');if(w)w.hidden=true}
 async function addIce(pc,c,queue){if(!pc.remoteDescription){queue.push(c);return}try{await pc.addIceCandidate(c)}catch{}}
 async function flushIce(pc,queue){while(queue.length){try{await pc.addIceCandidate(queue.shift())}catch{}}}
 async function pollViewer(){if(!view||view.busy)return;view.busy=true;try{
  const r=await api(`remote/${encodeURIComponent(view.id)}?after=${view.n}`);if(!r.ok||!view)return;const s=r.body.session;cache.set(s.id,{s,at:Date.now()});
  if(s.status==='declined'){setState(t('رفض الموظف الطلب.','The employee declined.'));stopTimer(view);return}
  if(s.status==='ended'){setState(t('انتهت الجلسة.','The session has ended.'));teardown(view);return}
  if(s.status==='accepted'&&!view.acceptedAt){view.acceptedAt=Date.now();view.el.querySelector('#raRelay').hidden=false;setState(t('جارٍ الاتصال…','Connecting…'));
   const pc=view.pc=new RTCPeerConnection({iceServers:await ice()});
   pc.ontrack=e=>{const vv=view?.el.querySelector('#raVideo');if(vv&&vv.srcObject!==e.streams[0])vv.srcObject=e.streams[0]};
   pc.onicecandidate=e=>{if(e.candidate)signal(view.id,'ice',e.candidate.toJSON())};
   await signal(view.id,'ready',{})}
  for(const sg of r.body.signals){view.n=Math.max(view.n,sg.n);const pc=view.pc;if(!pc||view.relay)continue;
   if(sg.type==='offer'){await pc.setRemoteDescription(sg.data);await flushIce(pc,view.queue);const ans=await pc.createAnswer();await pc.setLocalDescription(ans);await signal(view.id,'answer',pc.localDescription.toJSON())}
   else if(sg.type==='ice')await addIce(pc,sg.data,view.queue)}
  if(view.acceptedAt&&!view.picture&&!view.relay&&Date.now()-view.acceptedAt>RELAY_AFTER)startRelayView();
 }catch(x){console.warn(x)}finally{if(view)view.busy=false}}
 async function startRelayView(){if(!view||view.relay)return;view.relay=true;try{view.pc?.close()}catch{}view.pc=null;
  const el=view.el;el.querySelector('#raVideo').hidden=true;el.querySelector('#raImg').hidden=false;el.querySelector('#raRelay').hidden=true;
  const m=el.querySelector('#raMode');m.hidden=false;m.textContent=t('عبر البوابة','Relayed');setState(t('جارٍ الاستقبال عبر البوابة…','Receiving through the portal…'));
  await signal(view.id,'relay',{});const id=view.id;let last='';
  const loop=async()=>{if(!view||view.id!==id||!view.relay)return;
   try{const r=await fetch(`api/remote/${encodeURIComponent(id)}/frame?after=${view.seq}`,{credentials:'same-origin',cache:'no-store'});
    if(r.status===200){view.seq=Number(r.headers.get('X-Frame-Seq'))||view.seq+1;const url=URL.createObjectURL(await r.blob());const img=el.querySelector('#raImg');img.src=url;if(last)URL.revokeObjectURL(last);last=url;if(!view.picture)gotPicture(t('متصل عبر البوابة — عرض فقط','Connected through the portal — view only'))}
    else if(r.status===404||r.status===410){return}}catch{}
   setTimeout(loop,200)};
  loop()}
 const stopTimer=o=>{if(o)clearInterval(o.timer)};
 function teardown(o){stopTimer(o);if(o)o.relay=false;try{o?.pc?.close()}catch{}}
 function closeViewer(silent){if(!view)return;teardown(view);view.el.remove();view=null}
 async function end(id){await post(`remote/${encodeURIComponent(id)}/end`);cache.delete(id);if(view?.id===id)closeViewer();if(share?.id===id)stopShare(true);C.sync?.()}

 /* ---------- Employee: share ---------- */
 async function accept(id){const s=await get(id,true);if(!s||s.status!=='requested')return toast(t('لم يعد هذا الطلب مفتوحاً.','This request is no longer open.'),true);
  if(s.kind==='msra'){const inp=document.querySelector(`[data-ra="${id}"] [data-pc]`),pc=(inp?.value||s.code||'').trim();if(!PCRX.test(pc)){inp?.focus();return toast(t('اكتب اسم جهازك (مثال OMR-LT-0123).','Type your computer name (for example OMR-LT-0123).'),true)}
   const r=await post(`remote/${encodeURIComponent(id)}/respond`,{accept:true,computer:pc});if(!r.ok)return toast(r.body?.error||'',true);remember('me',pc);cache.delete(id);C.sync?.();toast(t('عند ظهور نافذة Windows Remote Assistance اختر «نعم».','When the Windows Remote Assistance window appears, choose Yes.'));return}
  if(!secure())return toast(t('مشاركة الشاشة تحتاج عنوان https:// للبوابة. اطلب من الفريق تفعيل HTTPS.','Screen sharing needs the portal on https://. Ask the ICT team to turn on HTTPS.'),true);
  let stream;try{stream=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:10},audio:false})}catch{return toast(t('لم تتم مشاركة الشاشة.','Screen sharing was not started.'),true)}
  const r=await post(`remote/${encodeURIComponent(id)}/respond`,{accept:true});if(!r.ok){stream.getTracks().forEach(x=>x.stop());return toast(r.body?.error||'',true)}
  cache.delete(id);startShare(id,stream,s.technician);C.sync?.()}
 async function decline(id){await post(`remote/${encodeURIComponent(id)}/respond`,{accept:false});cache.delete(id);C.sync?.()}
 async function startShare(id,stream,tech){stopShare(true);
  const bar=document.createElement('div');bar.className='rabar';bar.innerHTML=`<span class="pdot busy"></span> ${esc(t(`تشارك شاشتك مع ${tech}`,`You are sharing your screen with ${tech}`))} <button class="btn sm" type="button">${t('إيقاف المشاركة','Stop sharing')}</button>`;document.body.append(bar);
  const video=document.createElement('video');video.muted=true;video.playsInline=true;video.srcObject=stream;video.play().catch(()=>{});
  share={id,stream,bar,video,n:0,pc:null,timer:0,queue:[],out:[],relay:false};bar.querySelector('button').onclick=()=>end(id);
  stream.getVideoTracks()[0].addEventListener('ended',()=>{if(share?.id===id)end(id)});
  share.timer=setInterval(pollShare,1000);pollShare()}
 async function pollShare(){if(!share||share.busy)return;share.busy=true;try{
  const r=await api(`remote/${encodeURIComponent(share.id)}?after=${share.n}`);if(!r.ok||!share)return;
  if(r.body.session.status==='ended'){stopShare(true);return}
  for(const sg of r.body.signals){share.n=Math.max(share.n,sg.n);
   if(sg.type==='relay'){startRelaySend();continue}
   if(share.relay)continue;
   if(sg.type==='ready'&&!share.pc){const pc=share.pc=new RTCPeerConnection({iceServers:await ice()});share.stream.getTracks().forEach(tr=>pc.addTrack(tr,share.stream));
    let offerSent=false;pc.onicecandidate=e=>{if(!e.candidate||!share)return;const c=e.candidate.toJSON();if(offerSent)signal(share.id,'ice',c);else share.out.push(c)};
    const off=await pc.createOffer();await pc.setLocalDescription(off);await signal(share.id,'offer',pc.localDescription.toJSON());offerSent=true;
    for(const c of share.out.splice(0))await signal(share.id,'ice',c)}
   else if(sg.type==='answer'&&share.pc){await share.pc.setRemoteDescription(sg.data);await flushIce(share.pc,share.queue)}
   else if(sg.type==='ice'&&share.pc)await addIce(share.pc,sg.data,share.queue)}
 }catch(x){console.warn(x)}finally{if(share)share.busy=false}}
 /* Relay: snapshots of the shared screen as JPEG, about 3–5 per second, only while the technician is watching. */
 function startRelaySend(){if(!share||share.relay)return;share.relay=true;try{share.pc?.close()}catch{}share.pc=null;
  const id=share.id,canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  const loop=async()=>{if(!share||share.id!==id||!share.relay)return;const v=share.video;
   if(v.videoWidth){const scale=Math.min(1,1600/v.videoWidth);canvas.width=Math.round(v.videoWidth*scale);canvas.height=Math.round(v.videoHeight*scale);ctx.drawImage(v,0,0,canvas.width,canvas.height);
    const blob=await new Promise(res=>canvas.toBlob(res,'image/jpeg',0.6));
    if(blob){try{const r=await fetch(`api/remote/${encodeURIComponent(id)}/frame`,{method:'POST',credentials:'same-origin',headers:{'X-Portal':'1','Content-Type':'image/jpeg'},body:blob});if(r.status===404||r.status===400){return}}catch{}}}
   setTimeout(loop,250)};
  loop()}
 function stopShare(){if(!share)return;clearInterval(share.timer);share.relay=false;try{share.pc?.close()}catch{}share.stream.getTracks().forEach(x=>x.stop());share.video.srcObject=null;share.bar.remove();share=null}

 /* ---------- Technician: administrator rights on the employee's PC ---------- */
 function adminDialog(conv){const d=document.createElement('div');d.className='scrim';const saved=(()=>{try{return localStorage.getItem('ictops.pc.'+conv)||''}catch{return ''}})();
  d.innerHTML=`<form class="panel" style="max-width:640px;margin:6vh auto;gap:12px;max-height:88vh;overflow:auto"><h2 style="margin:0">${t('صلاحيات المسؤول على جهاز الموظف','Administrator rights on the employee’s PC')}</h2>
   <p class="muted" style="margin:0;font-size:13px">${t('لا يُمنح الموظف صلاحيات مسؤول. عندما يطلب Windows موافقة المسؤول (UAC) أثناء التثبيت أو الإزالة أو التحديث، يُدخل الفني حساب مسؤول.','The employee is not made an administrator. When Windows asks for administrator approval (UAC) to install, remove or update, the technician enters an administrator account.')}</p>
   <div class="form"><label class="field" for="elPc"><span>${t('اسم الجهاز','Computer name')}</span><input id="elPc" value="${esc(saved)}" placeholder="OMR-LT-0123" spellcheck="false" dir="ltr"><span class="hint">${t('الموظف: الإعدادات ← النظام ← حول ← اسم الجهاز.','Employee: Settings → System → About → Device name.')}</span></label>
   <label class="field" for="elMethod"><span>${t('الطريقة','Method')}</span><select id="elMethod"><option value="account">${t('حساب مسؤول تقنية المعلومات','ICT administrator account')}</option><option value="laps">${t('كلمة مرور المسؤول المحلي (LAPS)','Local admin password (LAPS)')}</option><option value="temp">${t('صلاحية مؤقتة لحساب الدعم','Temporary rights for the support account')}</option></select></label>
   <label class="field" for="elReason" style="grid-column:1/-1"><span>${t('ماذا ستثبّت أو تزيل أو تحدّث؟','What will you install, remove or update?')}</span><input id="elReason" maxlength="200" required></label></div>
   <div id="elHelp" class="racard" style="background:var(--surface-2);max-width:none"></div>
   <div class="actions"><button class="btn" type="submit">${t('إبلاغ الموظف وتسجيلها','Tell the employee and log it')}</button><button class="btn ghost" type="button" data-x>${t('إغلاق','Close')}</button></div></form>`;
  document.body.append(d);const close=()=>d.remove();d.querySelector('[data-x]').onclick=close;d.onclick=e=>{if(e.target===d)close()};
  const pc=d.querySelector('#elPc'),mt=d.querySelector('#elMethod'),help=d.querySelector('#elHelp');
  const cmd=c=>`<div class="actions" style="flex-wrap:nowrap"><code class="mono" style="flex:1;background:var(--surface);padding:6px 8px;border-radius:6px;overflow-x:auto;white-space:nowrap;font-size:12px">${esc(c)}</code><button class="btn ghost sm" type="button" data-copy="${esc(c)}">${t('نسخ','Copy')}</button></div>`;
  const draw=()=>{const n=pc.value.trim()||'COMPUTER-NAME',m=mt.value;
   help.innerHTML=m==='account'?`<b>${t('حساب مسؤول تقنية المعلومات','ICT administrator account')}</b><ol><li>${t('أضف مجموعة الدعم (مثل ICT-Desktop-Admins) إلى مجموعة Administrators على الأجهزة عبر سياسة المجموعة أو Intune — مرة واحدة.','Once: add your support group (for example ICT-Desktop-Admins) to the local Administrators group on PCs with Group Policy or Intune.')}</li><li>${t('عند ظهور نافذة UAC اكتب حساب الدعم الخاص بك وكلمة مروره.','When the UAC prompt appears, type your own support account and password.')}</li><li>${t('في Windows Remote Assistance يجب أن يحدد الموظف خيار «السماح بالرد على مطالبات التحكم بحساب المستخدم» عند الموافقة على التحكم، ثم تكتب حساب المسؤول في نافذة UAC:','In Windows Remote Assistance the employee must tick “Allow … to respond to User Account Control prompts” when approving control; then you can type your admin account at the UAC prompt:')}</li></ol>${cmd('msra.exe /offerRA '+n)}`
   :m==='laps'?`<b>${t('كلمة مرور المسؤول المحلي (Windows LAPS)','Local administrator password (Windows LAPS)')}</b><p>${t('اقرأ كلمة المرور الفريدة لهذا الجهاز ثم اكتب .\\Administrator وكلمة المرور في نافذة UAC. يغيّرها LAPS تلقائياً بعد الاستخدام.','Read this PC’s unique password, then type .\\Administrator and that password at the UAC prompt. LAPS changes it automatically after use.')}</p>${t('Active Directory:','Active Directory:')}${cmd(`Get-LapsADPassword -Identity ${n} -AsPlainText`)}${t('Microsoft Entra:','Microsoft Entra:')}${cmd(`Get-LapsAADPassword -DeviceIds ${n} -IncludePasswords -AsPlainText`)}${cmd(`Reset-LapsPassword   # run on ${n} afterwards, or wait for automatic rotation`)}`
   :`<b>${t('صلاحية مؤقتة','Temporary rights')}</b><p>${t('من PowerShell بصلاحيات مسؤول على جهازك، شغّل temp-admin.ps1 (ضمن حزمة البوابة). يضيف الحساب إلى Administrators على جهاز الموظف ويزيله تلقائياً بعد المدة. يتطلب WinRM على الأجهزة.','From an elevated PowerShell on your PC, run temp-admin.ps1 (in the portal package). It adds the account to Administrators on the employee’s PC and removes it automatically after the time. Needs WinRM on PCs.')}</p>${cmd(`.\\temp-admin.ps1 -ComputerName ${n} -Account OMRAN\\your-support-account -Minutes 60`)}${cmd(`.\\temp-admin.ps1 -ComputerName ${n} -Account OMRAN\\your-support-account -Remove`)}<p class="muted">${t('لا يُنصح بمنح الموظف نفسه صلاحية مسؤول؛ استخدم حسابك.','Giving the employee themselves admin rights is not recommended; use your own account.')}</p>`;
   help.querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.copy);toast(t('تم النسخ','Copied'))}catch{toast(b.dataset.copy)}})};
  pc.oninput=draw;mt.onchange=draw;draw();
  d.querySelector('form').onsubmit=async e=>{e.preventDefault();try{localStorage.setItem('ictops.pc.'+conv,pc.value.trim())}catch{}
   const r=await post('remote/elevation',{conversation:conv,computer:pc.value,method:mt.value,reason:d.querySelector('#elReason').value});if(!r.ok)return toast(r.body?.error||t('تعذر الحفظ','Could not save'),true);toast(t('أُبلغ الموظف وسُجّل الإجراء','The employee was told and it was logged'));C.sync?.()}}

 /* ---------- Cards inside the chat thread ---------- */
 async function hydrate(root){for(const el of root.querySelectorAll('[data-ra]')){const id=el.dataset.ra,box=el.querySelector('.ra-act');if(!box)continue;const s=await get(id);if(!s){box.innerHTML='';continue}
  const team=isTeam(),label={requested:t('بانتظار الموافقة','Waiting for consent'),accepted:t('مقبول','Accepted'),declined:t('مرفوض','Declined'),ended:t('انتهت','Ended')}[s.status]||s.status;
  if(!team&&s.status==='requested'){
   box.innerHTML=s.kind==='screen'?`<p>${t('سيرى الفني شاشتك فقط ولا يمكنه التحكم. يمكنك الإيقاف في أي وقت.','The technician will only see your screen and cannot control it. You can stop at any time.')}</p><div class="actions"><button class="btn sm" type="button" data-acc>${t('مشاركة شاشتي','Share my screen')}</button><button class="btn ghost sm" type="button" data-dec>${t('رفض','Decline')}</button></div>`
    :`<label class="field"><span>${t('اسم جهازك','Your computer name')}</span><input data-pc value="${esc(s.code||remembered('me'))}" placeholder="OMR-LT-0123" dir="ltr" spellcheck="false" autocomplete="off"><span class="hint">${t('لمعرفته: الإعدادات ← النظام ← حول ← اسم الجهاز.','To find it: Settings → System → About → Device name.')}</span></label><ol><li>${t('اضغط «السماح» هنا.','Press Allow here.')}</li><li>${t('عندما تظهر نافذة Windows Remote Assistance اختر «نعم» للاتصال.','When the Windows Remote Assistance window appears, choose Yes to connect.')}</li><li>${t('عندما يطلب الفني التحكم اختر «نعم». يمكنك الإيقاف بزر «إيقاف المشاركة» في نافذة المساعدة.','When the technician asks for control, choose Yes. You can stop with Stop sharing in that window.')}</li></ol><div class="actions"><button class="btn sm" type="button" data-acc>${t('السماح','Allow')}</button><button class="btn ghost sm" type="button" data-dec>${t('رفض','Decline')}</button></div>`;
   box.querySelector('[data-acc]').onclick=()=>accept(id);box.querySelector('[data-dec]').onclick=()=>decline(id)}
  else if(!team&&s.status==='accepted'&&s.kind==='screen'){box.innerHTML=share?.id===id?`<div class="actions"><span class="pill warn">${t('تتم المشاركة','Sharing')}</span><button class="btn sm" type="button" data-end>${t('إيقاف','Stop')}</button></div>`:`<span class="pill">${t('انتهت','Ended')}</span>`;box.querySelector('[data-end]')?.addEventListener('click',()=>end(id))}
  else if(team&&s.status==='requested'){box.innerHTML=`<div class="actions"><span class="pill warn">${esc(label)}</span>${s.kind==='msra'&&s.code?`<span class="mono">${esc(s.code)}</span>`:''}${s.kind==='screen'?`<button class="btn ghost sm" type="button" data-open>${t('فتح العارض','Open viewer')}</button>`:''}<button class="btn ghost sm" type="button" data-end>${t('إلغاء','Cancel')}</button></div>`;box.querySelector('[data-open]')?.addEventListener('click',()=>openViewer(id));box.querySelector('[data-end]').onclick=()=>end(id)}
  else if(team&&s.status==='accepted'){box.innerHTML=`<div class="actions"><span class="pill ok">${esc(label)}</span>${s.kind==='screen'?`<button class="btn sm" type="button" data-open>${t('عرض الشاشة','View screen')}</button>`:''}${s.kind==='msra'&&s.code?connectButtons(s.code):''}<button class="btn ghost sm" type="button" data-end>${t('إنهاء','End')}</button></div>`;box.querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.copy);toast(t('نُسخ — الصقه في Win+R','Copied — paste it into Win+R'))}catch{toast(b.dataset.copy)}});box.querySelector('[data-open]')?.addEventListener('click',()=>{if(view?.id!==id)openViewer(id)});box.querySelector('[data-end]').onclick=()=>end(id)}
  else box.innerHTML=`<span class="pill">${esc(label)}</span>`}}
 return {adminDialog,request,msraDialog,quickAssistDialog:msraDialog,openViewer,hydrate,accept,decline,end,secure};
})();
