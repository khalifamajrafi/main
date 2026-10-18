/* Service desk setup and automatic technician assignment (administrators). */
(()=>{
 const {t,esc,num,pill}=P;
 /* ---------- Service desk setup (administrators) ---------- */
 function deskSetup(root){
  const admin=M.isAdmin(),s=Store.get('settings','main')||{id:'main'},d=M.slaDefaults(),dis=admin?'':'disabled';
  const h=m=>Math.round(m/60*100)/100;
  root.innerHTML=`<div class="pagehead"><div><h1>${t('إعداد مكتب الخدمات','Service desk setup')}</h1><p>${t('يحدد المسؤول الفئات واتفاقية الخدمة وإجراءات العمل ومدة الإغلاق التلقائي.','Administrators set the categories, SLA, procedures and the automatic closing period.')}</p></div>
   <div class="actions"><a class="btn ghost" href="#/m/categories">${t('الفئات','Categories')}</a><a class="btn ghost" href="#/m/sops">${t('إجراءات العمل','Procedures (SOP)')}</a><a class="btn ghost" href="#/m/catalog">${t('دليل الخدمات والأسعار','Catalog and prices')}</a></div></div>
   ${admin?'':`<section class="panel"><p class="muted" style="margin:0">${t('للاطلاع فقط. يعدّل هذه الإعدادات مسؤولو البوابة.','View only. Portal administrators change these settings.')}</p></section>`}
   <form class="grid" id="deskForm">
    <section class="panel s7"><div class="panel-h"><h2>${t('اتفاقية الخدمة حسب الأولوية','SLA by priority')}</h2></div>
     <p class="muted" style="margin:0;font-size:12.5px">${t('بساعات العمل. تُستخدم عندما لا يكون للطلب خدمة من الدليل؛ خدمات الدليل لها مددها الخاصة.','In working hours. Used when a ticket has no catalog service; catalog services have their own times.')}</p>
     <div class="tablewrap"><table><thead><tr><th>${t('الأولوية','Priority')}</th><th>${t('الاستجابة (ساعة)','Response (hours)')}</th><th>${t('الحل (ساعة)','Resolution (hours)')}</th></tr></thead><tbody>
      ${M.PRIORITY.map(p=>`<tr><td>${pill(P.en()?p[2]:p[1],p[3])}</td><td><input type="number" min="0.25" step="0.25" id="r_${p[0]}" value="${h(d[p[0]][0])}" ${dis} aria-label="${esc(t('الاستجابة','Response'))}" style="width:110px"></td><td><input type="number" min="0.25" step="0.25" id="s_${p[0]}" value="${h(d[p[0]][1])}" ${dis} aria-label="${esc(t('الحل','Resolution'))}" style="width:110px"></td></tr>`).join('')}
     </tbody></table></div></section>
    <section class="panel s5"><div class="panel-h"><h2>${t('الإغلاق ورأي الموظف','Closing and feedback')}</h2></div>
     <label class="field" for="acd"><span>${t('إغلاق الطلب المحلول تلقائياً بعد (أيام)','Close resolved tickets automatically after (days)')}</span><input id="acd" type="number" min="1" max="30" step="1" value="${M.autoCloseDays()}" ${dis}><span class="hint">${t('إذا لم يؤكد الموظف أو يعترض خلال هذه المدة. يمكن للمسؤول تحديد تاريخ إغلاق لطلب معيّن.','If the requester neither confirms nor objects in this time. An administrator can set a closing date on a single ticket.')}</span></label>
     <label class="field" for="purl"><span>${t('عنوان البوابة في الروابط المرسلة','Portal address used in emailed links')}</span><input id="purl" type="url" value="${esc(s.portalUrl||location.origin+location.pathname)}" ${dis}><span class="hint">${t('مثال: http://اسم-الجهاز:8080/','For example http://PC-NAME:8080/')}</span></label>
     <p class="muted" style="margin:0;font-size:12.5px" id="mailState">${Store.mode==='server'?t('جارٍ التحقق من إعداد البريد…','Checking the email setup…'):t('وضع محلي: لا يُرسل بريد؛ تُنسخ الروابط يدوياً.','Local mode: no email is sent; links are copied by hand.')}</p></section>
    ${admin?`<div class="actions s12"><button class="btn" type="submit">${t('حفظ الإعدادات','Save setup')}</button></div>`:''}
   </form><div class="grid" style="margin-top:16px"><section class="panel s12" id="assignPanel"></section></div>`;
  assignPanel(root.querySelector('#assignPanel'));
  if(Store.mode==='server')Store.api('mail-status').then(r=>{const el=root.querySelector('#mailState');if(el)el.textContent=r.body?.configured?t('البريد مُعد: تُرسل طلبات التأكيد والتقييم إلى بريد الموظف تلقائياً.','Email is set up: confirmation and feedback requests are emailed to the requester automatically.'):t('البريد غير مُعد، لذا تُنسخ الروابط وتُرسل يدوياً. لتفعيله افتح الإدارة ← التكامل.','Email is not set up, so links are copied and sent by hand. To turn it on, open Administration → Integrations.')});
  root.querySelector('#deskForm').onsubmit=async e=>{e.preventDefault();if(!admin)return;const sla={};for(const p of M.PRIORITY){const r=Number(root.querySelector('#r_'+p[0]).value),v=Number(root.querySelector('#s_'+p[0]).value);if(!(r>0&&v>0))return P.toast(t('أدخل مدداً أكبر من صفر.','Enter times greater than zero.'),true);if(r>v)return P.toast(t('الاستجابة لا تتجاوز الحل.','Response cannot exceed resolution.'),true);sla[p[0]]=[Math.round(r*60),Math.round(v*60)]}
   const days=Math.round(Number(root.querySelector('#acd').value));if(!(days>=1&&days<=30))return P.toast(t('اختر من 1 إلى 30 يوماً.','Choose 1 to 30 days.'),true);
   await Store.save('settings',{...(Store.get('settings','main')||s),id:'main',sla,autoCloseDays:days,portalUrl:root.querySelector('#purl').value.trim()},t('تحديث إعداد مكتب الخدمات','Service desk setup updated'));P.toast(t('تم الحفظ','Saved'))};
 }


 /* ---------- Technician assignment (automatic) ---------- */
 function assignPanel(box){if(!box)return;const admin=M.isAdmin(),dis=admin?'':'disabled';
  const cur=(Store.get('settings','main')||{}).assign||{},method=['balance','roundrobin'].includes(cur.method)?cur.method:'manual';
  const roster=Object.fromEntries((cur.techs||[]).map(x=>[x.email,x]));
  const techs=Store.all('members').filter(m=>m.active!==false&&['admin','technician'].includes(m.role)).sort((a,b)=>(a.email||'').localeCompare(b.email||''));
  const canTickets=m=>m.role==='admin'||m.access!=='custom'||(m.pages||[]).includes('tickets');
  const activeCount=e=>Store.all('tickets').filter(x=>['open','in-progress','waiting'].includes(x.status)&&x.owner===e).length;
  const cats=M.cats(),unassigned=Store.all('tickets').filter(x=>['open','in-progress','waiting'].includes(x.status)&&!x.owner).length;
  box.innerHTML=`<div class="panel-h"><h2>${t('توزيع الطلبات على الفنيين','Technician assignment')}</h2>${admin&&Store.mode==='server'?`<button class="btn ghost sm" type="button" id="asNow" ${unassigned?'':'disabled'}>${t(`توزيع ${num(unassigned)} طلب غير معيّن الآن`,`Assign ${unassigned} unassigned ticket${unassigned===1?'':'s'} now`)}</button>`:''}</div>
   <label class="field" for="asMethod" style="max-width:520px"><span>${t('طريقة التوزيع','Assignment method')}</span><select id="asMethod" ${dis}>
    <option value="manual" ${method==='manual'?'selected':''}>${t('يدوي — التوزيع التلقائي متوقف','Manual — automatic assignment off')}</option>
    <option value="balance" ${method==='balance'?'selected':''}>${t('موازنة عبء العمل','Workload balancing')}</option>
    <option value="roundrobin" ${method==='roundrobin'?'selected':''}>${t('تسلسل دوري (Round-robin)','Round-robin sequence')}</option></select></label>
   <p class="muted" style="margin:0;font-size:12.5px">${t('موازنة عبء العمل: الفني صاحب أقل عدد من الطلبات المفتوحة أو قيد التنفيذ أو بانتظار معلومات، ومع التساوي بالتناوب. التسلسل الدوري: بالدور حسب ترتيب البريد مع حفظ آخر من أُسند إليه. يُطبّق على كل طلب جديد غير معيّن، بما فيها طلبات بوابة الموظفين.','Workload balancing: the technician with the fewest open, in-progress or waiting tickets, taking turns when tied. Round-robin sequence: take turns in email order; the last assignment is remembered. Applies to every new unassigned ticket, including requests from the employee portal.')}</p>
   <h3 style="margin:6px 0 0;font-size:15px">${t('اختر الفنيين من فريق عمليات تقنية المعلومات','Select technicians from the ICT Operations team')}</h3>
   <p class="muted" style="margin:0;font-size:12.5px">${t('تظهر الحسابات الفعّالة بدور فني أو مسؤول. لا يُسند لمن ليست لديه صفحة طلبات الخدمة. إذا لم يكن أحد مؤهلاً يبقى الطلب غير معيّن للمراجعة. بدون اختيار فئات يستلم الفني كل الفئات.','Active Technician and Administrator accounts are listed. People without access to the Service desk page are skipped. If nobody is eligible, the ticket stays unassigned for review. With no categories ticked, a technician takes all categories.')} <a href="#/m/categories">${t('إدارة فئات الطلبات','Manage ticket categories')}</a></p>
   ${techs.length?`<div class="list">${techs.map(m=>{const r=roster[m.email]||{},on=!!r.on,sel=new Set(r.cats||[]),ok=canTickets(m);return `<div class="li asrow" data-email="${esc(m.email)}" style="align-items:flex-start;flex-wrap:wrap">
     <label style="display:flex;gap:10px;align-items:flex-start;min-width:260px;flex:1"><input type="checkbox" data-on ${on?'checked':''} ${dis} ${ok?'':'disabled'} style="margin-top:4px;width:18px;height:18px"><span><b>${esc(m.name||m.email)}</b><small style="display:block">${esc(m.email)}${ok?'':' · '+esc(t('لا يصل إلى طلبات الخدمة','no Service desk access'))}</small></span></label>
     <span class="pill info" style="margin-top:4px">${t(`${num(activeCount(m.email))} طلب نشط`,`${activeCount(m.email)} active ticket${activeCount(m.email)===1?'':'s'}`)}</span>
     <div style="flex:2;min-width:280px"><span class="muted" style="font-size:12px">${t('فئات الخدمة','Service categories')} · <span data-catcount>${sel.size?num(sel.size):t('الكل','All')}</span></span><div class="chips" style="margin-top:4px">${cats.map(c=>`<label class="chip"><input type="checkbox" data-cat="${esc(c[0])}" ${sel.has(c[0])?'checked':''} ${dis}> ${esc(P.en()?c[2]:c[1])}</label>`).join('')}</div></div></div>`}).join('')}</div>`
    :`<p class="empty">${t('لا يوجد فنيون. أضفهم في أعضاء الفريق بدور «فني».','No technicians yet. Add them in Team members with the Technician role.')}</p>`}
   ${admin?`<div class="actions"><button class="btn" type="button" id="asSave">${t('حفظ إعدادات التوزيع','Save assignment settings')}</button></div>`:''}`;
  box.querySelectorAll('.asrow').forEach(row=>row.querySelectorAll('[data-cat]').forEach(c=>c.onchange=()=>{const n=row.querySelectorAll('[data-cat]:checked').length;row.querySelector('[data-catcount]').textContent=n?num(n):t('الكل','All')}));
  box.querySelector('#asSave')?.addEventListener('click',async()=>{const m=box.querySelector('#asMethod').value;
   const techList=[...box.querySelectorAll('.asrow')].map(row=>({email:row.dataset.email,on:row.querySelector('[data-on]').checked,cats:[...row.querySelectorAll('[data-cat]:checked')].map(c=>c.dataset.cat)}));
   if(m!=='manual'&&!techList.some(x=>x.on))return P.toast(t('اختر فنياً واحداً على الأقل.','Select at least one technician.'),true);
   const fresh=Store.get('settings','main')||{id:'main'};
   await Store.save('settings',{...fresh,id:'main',assign:{method:m,techs:techList}},t('تحديث توزيع الطلبات','Ticket assignment updated'));P.toast(t('تم الحفظ','Saved'));assignPanel(box)});
  box.querySelector('#asNow')?.addEventListener('click',async()=>{const r=await Store.api('tickets/auto-assign',{method:'POST',body:'{}'});if(!r.ok)return P.toast(r.body?.error||t('تعذر التوزيع','Could not assign'),true);await Store.load();P.toast(t(`أُسند ${num(r.body.assigned)} طلب`,`Assigned ${r.body.assigned} tickets`));assignPanel(box)});
 }
 Object.assign(V,{deskSetup});
})();
