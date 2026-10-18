/* Requester page, opened from the emailed or shared link without signing in. */
(()=>{
 const {t,esc,fmtDateTime,pill,person}=P;
 /* ---------- Requester page (opened from the emailed or shared link; no sign-in) ---------- */
 async function requester(root,token){
  const server=Store.mode==='server';
  const get=async()=>{if(server){const r=await Store.api('public/ticket/'+encodeURIComponent(token));return r.ok?r.body:null}const x=Store.all('tickets').find(y=>y.publicToken===token);if(!x)return null;return {number:x.number,title:x.title,status:x.status,requesterName:x.requesterName,technician:x.owner?person(x.owner):'',resolution:x.resolution,resolvedAt:x.resolvedAt,closedAt:x.closedAt,autoCloseAt:Number.isFinite(M.autoCloseAt(x))?new Date(M.autoCloseAt(x)).toISOString():null,feedback:x.feedback?{rating:x.feedback.rating}:null}};
  const act=async(action,body)=>{if(server){const r=await Store.api('public/ticket/'+encodeURIComponent(token)+'/'+action,{method:'POST',body:JSON.stringify(body)});if(!r.ok)throw Error(r.body?.error||t('تعذر الحفظ.','Could not save.'));return}
   const x=Store.clone(Store.all('tickets').find(y=>y.publicToken===token)),now=new Date().toISOString(),save=(a)=>Store.save('tickets',x,a,null);
   if(action==='confirm'){if(x.status!=='resolved')throw Error(t('لم يعد الطلب بانتظار تأكيدك.','This request is no longer waiting for your confirmation.'));Object.assign(x,{status:'closed',closedAt:now,closedBy:'requester',feedbackRequestedAt:now});await save('Requester confirmed the fix; ticket closed')}
   else if(action==='reopen'){if(x.status!=='resolved')throw Error(t('لا يمكن إعادة فتح الطلب من هنا.','This request can no longer be reopened here.'));x.status='in-progress';x.resolvedAt='';x.closureRequestedAt='';x.reopenCount=(x.reopenCount||0)+1;x.updates=[...(x.updates||[]),{at:now,by:'requester',text:'Requester: '+body.text}];await save('Requester reported the problem is not fixed; ticket reopened')}
   else if(action==='feedback'){if(x.feedback)throw Error(t('شكراً، وصل تقييمك من قبل.','Thank you – your feedback was already received.'));x.feedback={rating:body.rating,comment:body.text||'',at:now};await save(`Requester rated the service ${body.rating}/5`)}};
  const paint=async(msg='')=>{
   const x=await get();
   const head=`<div class="login-top"><span class="brand">${'<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><rect width="30" height="30" rx="7" fill="#4fc3c9"/><path d="M7 19h4l2-7 3 11 2-7 1 3h4" stroke="#0f2a2c" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'}<span><b>${t('عمليات تقنية المعلومات','ICT Operations')}</b><small>${t('طلبك لدى الدعم الفني','Your ICT request')}</small></span></span><button class="iconbtn" type="button" id="lg">${P.en()?'العربية':'English'}</button></div>`;
   let body;
   if(!x)body=`<h1>${t('الرابط غير صالح','This link is not valid')}</h1><p>${t('قد يكون الرابط ناقصاً أو قديماً. تواصل مع فريق تقنية المعلومات.','The link may be incomplete or out of date. Please contact ICT Operations.')}</p>`;
   else{
    const top=`<p class="ref" style="margin:0">${esc(x.number||'')}</p><h1>${esc(x.title||'')}</h1>${x.requesterName?`<p>${esc(t('مرحباً ','Hello ')+x.requesterName)}</p>`:''}`;
    if(x.status==='resolved')body=`${top}<div class="panel" style="padding:12px;gap:6px"><span class="section-t" style="margin:0">${t('الحل','What we did')}</span><p style="margin:0;color:var(--fg)">${esc(x.resolution||'—')}</p>${x.technician?`<p style="margin:0;font-size:12.5px">${esc(t('الفني: ','Technician: ')+x.technician)}</p>`:''}</div>
     <h2>${t('هل حُلّت المشكلة؟','Is it fixed?')}</h2><div class="actions"><button class="btn" type="button" id="yes">${t('نعم، أغلق الطلب','Yes, close my request')}</button><button class="btn ghost" type="button" id="no">${t('لا، ما زالت المشكلة','No, it is still not working')}</button></div>
     <div id="noBox" hidden><label class="field" for="why"><span>${t('ما الذي لا يعمل؟','What is still not working?')}</span><textarea id="why" maxlength="1000"></textarea></label><div class="actions"><button class="btn" type="button" id="send">${t('إعادة فتح الطلب','Reopen my request')}</button></div></div>
     ${x.autoCloseAt?`<p style="font-size:12.5px">${esc(t('إذا لم نسمع منك، يُغلق الطلب تلقائياً في ','If we do not hear from you, the request closes automatically on ')+fmtDateTime(x.autoCloseAt)+'.')}</p>`:''}`;
    else if(x.status==='closed'&&!x.feedback)body=`${top}<p>${t('أُغلق طلبك. كيف كانت الخدمة؟','Your request is closed. How was our service?')}</p>
     <div class="chips" role="radiogroup" aria-label="${esc(t('التقييم','Rating'))}" id="stars">${[1,2,3,4,5].map(n=>`<button class="chip" type="button" role="radio" aria-checked="false" data-r="${n}" style="font-size:16px;padding:6px 12px">${'★'.repeat(n)}</button>`).join('')}</div>
     <p id="rlabel" style="font-size:12.5px;min-height:1.2em"></p>
     <label class="field" for="cm"><span>${t('ملاحظات (اختياري)','Comments (optional)')}</span><textarea id="cm" maxlength="1000"></textarea></label><div class="actions"><button class="btn" type="button" id="rate">${t('إرسال التقييم','Send feedback')}</button></div>`;
    else if(x.status==='closed')body=`${top}<h2>${t('شكراً لك!','Thank you!')}</h2><p><span style="color:var(--warn);font-size:22px;letter-spacing:3px">${'★'.repeat(Number(x.feedback.rating))}${'☆'.repeat(5-Number(x.feedback.rating))}</span></p><p>${t('وصل تقييمك وسيساعدنا على تحسين الخدمة.','Your feedback was received and helps us improve.')}</p>`;
    else body=`${top}<p>${t('طلبك قيد المعالجة لدى فريق تقنية المعلومات.','ICT Operations is working on your request.')}</p><p>${pill(M.optLabel(M.TICKET_STATUS,x.status),M.optTone(M.TICKET_STATUS,x.status))}</p>`;
   }
   root.innerHTML=`<main class="login"><form novalidate>${head}${body}<p class="err" role="alert" id="pubErr">${esc(msg)}</p></form></main>`;
   document.title=t('طلبك · عمليات تقنية المعلومات','Your request · ICT Operations');
   root.querySelector('#lg').onclick=()=>{P.setLang(P.en()?'ar':'en');paint()};
   const run=async(a,b)=>{try{await act(a,b);await paint()}catch(e){root.querySelector('#pubErr').textContent=e.message}};
   root.querySelector('#yes')?.addEventListener('click',()=>run('confirm',{}));
   root.querySelector('#no')?.addEventListener('click',()=>{root.querySelector('#noBox').hidden=false;root.querySelector('#why').focus()});
   root.querySelector('#send')?.addEventListener('click',()=>{const w=root.querySelector('#why').value.trim();if(w.length<3)return root.querySelector('#pubErr').textContent=t('اكتب باختصار ما الذي لا يعمل.','Tell us briefly what is still not working.');run('reopen',{text:w})});
   let rating=0;const names=[t('سيئة','Poor'),t('مقبولة','Fair'),t('جيدة','Good'),t('جيدة جداً','Very good'),t('ممتازة','Excellent')];
   root.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{rating=Number(b.dataset.r);root.querySelectorAll('[data-r]').forEach(z=>{const on=Number(z.dataset.r)===rating;z.setAttribute('aria-checked',on);z.setAttribute('aria-pressed',on)});root.querySelector('#rlabel').textContent=names[rating-1]});
   root.querySelector('#rate')?.addEventListener('click',()=>{if(!rating)return root.querySelector('#pubErr').textContent=t('اختر عدد النجوم.','Choose a star rating.');run('feedback',{rating,text:root.querySelector('#cm').value.trim()})});
  };
  await paint();
 }
 Object.assign(V,{requester});
})();
