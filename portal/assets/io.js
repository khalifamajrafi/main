/* Excel import and export for every register (administrators only).
   Uses SheetJS (assets/vendor/xlsx.full.min.js, Apache-2.0), loaded the first time it is needed. */
window.IO=(()=>{
 const {t,L,esc,num,toast,person}=P;
 /* Columns that identify an existing record, so a re-imported row updates it instead of adding a copy. */
 const KEYS={tickets:['number'],catalog:['titleEn'],categories:['nameEn'],sops:['nameEn'],tasks:['title'],prs:['number'],licenses:['product','vendor'],assets:['tag'],stock:['sku'],vendors:['title'],maintenance:['title'],leaves:['member','start'],cards:['number'],phones:['extension'],lifecycle:['employee','date'],kpis:['name'],members:['email'],articles:['title'],holidays:['nameEn','start'],accounts:['code'],balances:['member','year'],budgets:['account','budgetYear']};
 const iso=v=>v?new Date(v).toISOString():'';
 /* Extra columns that are not form fields */
 const EXTRA={
  tickets:[{k:'createdAt',l:['تاريخ التسجيل','Logged at'],t:'datetime',imp:true},{k:'resolvedAt',l:['تاريخ الحل','Resolved at'],t:'datetime',imp:true},{k:'closedAt',l:['تاريخ الإغلاق الفعلي','Closed at'],t:'datetime',imp:true},{k:'rating',l:['تقييم الموظف','Requester rating'],get:r=>r.feedback?.rating??''},{k:'comment',l:['تعليق الموظف','Requester comment'],get:r=>r.feedback?.comment??''}],
  prs:[{k:'stepsDone',l:['الخطوات المكتملة (0-10)','Completed steps (0-10)'],get:r=>M.prStage(r),imp:true,num:true}],
  stock:[],
 };
 let loading;
 function lib(){if(window.XLSX)return Promise.resolve(window.XLSX);return loading||(loading=new Promise((ok,bad)=>{const s=document.createElement('script');s.src='assets/vendor/xlsx.full.min.js';s.onload=()=>ok(window.XLSX);s.onerror=()=>{loading=null;bad(Error(t('تعذر تحميل مكتبة Excel.','Could not load the Excel library.')))};document.head.append(s)}))}
 const opts=f=>typeof f.opts==='function'?f.opts():f.opts||[];
 const isMember=f=>f.opts===M.members;
 const fields=def=>def.fields.filter(f=>!(def.id==='members'&&f.k==='password'));
 const pad=n=>String(n).padStart(2,'0');
 const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

 /* ---------- Export ---------- */
 function cell(f,v){
  if(v===''||v==null)return '';
  switch(f.t){case 'select':return isMember(f)?person(v):M.optLabel(f.opts,v);case 'bool':return v?t('نعم','Yes'):t('لا','No');case 'days':return Number(v)/480;case 'number':case 'money':return Number(v);case 'datetime':{const d=new Date(v);return isNaN(d)?v:`${ymd(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`}default:return v}}
 function columns(def){return [...fields(def).map(f=>({h:L(f.l),get:r=>cell(f,r[f.k])})),...(EXTRA[def.id]||[]).map(x=>({h:L(x.l),get:r=>x.get?x.get(r):cell(x,r[x.k])})),{h:t('آخر تحديث','Last updated'),get:r=>cell({t:'datetime'},r.updatedAt)},{h:'ID',get:r=>r.id}]}
 function book(X,sheets){const wb=X.utils.book_new();for(const [name,aoa,widths] of sheets){const ws=X.utils.aoa_to_sheet(aoa);ws['!cols']=(widths||aoa[0].map(h=>Math.min(48,Math.max(10,String(h).length+4)))).map(w=>({wch:w}));X.utils.book_append_sheet(wb,ws,name.slice(0,31))}if(!P.en())wb.Workbook={Views:[{RTL:true}]};return wb}
 async function exportRows(def,rows){const X=await lib(),cols=columns(def);const aoa=[cols.map(c=>c.h),...rows.map(r=>cols.map(c=>c.get(r)))];X.writeFile(book(X,[[L(def.label),aoa]]),`${def.id}-${P.omanDay()}.xlsx`);toast(t(`صُدّر ${num(rows.length)} سجل`,`Exported ${rows.length} records`))}
 async function template(def){const X=await lib(),f=fields(def),extra=(EXTRA[def.id]||[]).filter(x=>x.imp);
  const help=[[t('العمود','Column'),t('مطلوب','Required'),t('القيم المسموحة / الصيغة','Allowed values / format')],...f.map(x=>[L(x.l),x.req?t('نعم','Yes'):'',x.t==='select'?opts(x).map(o=>P.en()?o[2]:o[1]).join(' | ')||t('بريد أو اسم عضو الفريق','Team member email or name'):x.t==='date'?'YYYY-MM-DD':x.t==='datetime'?'YYYY-MM-DD HH:MM':x.t==='bool'?t('نعم / لا','Yes / No'):x.t==='days'?t('عدد أيام العمل','Working days'):x.t==='money'?t('رقم بالريال العماني','Number in OMR'):x.t==='number'?t('رقم','Number'):'']),...extra.map(x=>[L(x.l),'',x.t==='datetime'?'YYYY-MM-DD HH:MM':t('رقم','Number')]),['ID','',t('اتركه فارغاً للسجلات الجديدة. موجود في الملفات المصدّرة لتحديث السجل نفسه.','Leave empty for new records. Exported files include it so a row updates the same record.')]];
  X.writeFile(book(X,[[t('البيانات','Data'),[[...f.map(x=>L(x.l)),...extra.map(x=>L(x.l)),'ID']]],[t('المساعدة','Help'),help,[34,10,90]]]),`${def.id}-template.xlsx`)}

 /* ---------- Import ---------- */
 const norm=v=>String(v??'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).trim();
 const low=v=>norm(v).toLowerCase();
 function parseDate(v){if(v instanceof Date&&!isNaN(v))return ymd(v);const s=norm(v);if(!s)return '';let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);if(m)return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;if(/^\d{5}(\.\d+)?$/.test(s)){const d=new Date(Date.UTC(1899,11,30)+Number(s)*864e5);return d.toISOString().slice(0,10)}return null}
 function parseDateTime(v){if(v instanceof Date&&!isNaN(v))return v.toISOString();const s=norm(v);if(!s)return '';const d=parseDate(s);if(!d)return null;const tm=s.match(/(\d{1,2}):(\d{2})/);return new Date(`${d}T${tm?pad(tm[1])+':'+tm[2]:'00:00'}:00+04:00`).toISOString()}
 function value(f,raw){
  const s=norm(raw instanceof Date?'':raw);
  if(raw===''||raw==null||(s===''&&!(raw instanceof Date)))return {empty:true};
  switch(f.t){
   case 'select':{const list=opts(f);if(isMember(f)){const m=Store.all('members').find(x=>x.email===low(s)||low(x.name)===low(s));return m?{v:m.email}:{err:t(`«${s}» ليس عضواً في الفريق`,`“${s}” is not a team member`)}}const o=list.find(o=>low(o[0])===low(s)||low(o[1])===low(s)||low(o[2])===low(s));return o?{v:o[0]}:{err:t(`قيمة غير معروفة «${s}» في ${L(f.l)}`,`Unknown value “${s}” for ${L(f.l)}. Use: ${list.slice(0,8).map(o=>o[2]).join(', ')}${list.length>8?'…':''}`)}}
   case 'bool':{const v=low(s);if(['yes','true','1','y','نعم','✓','x','active','available'].includes(v))return {v:true};if(['no','false','0','n','لا'].includes(v))return {v:false};return {err:t(`استخدم نعم أو لا في ${L(f.l)}`,`Use Yes or No for ${L(f.l)}`)}}
   case 'number':case 'money':case 'days':{const n=Number(s.replace(/,/g,'').replace(/[^\d.\-]/g,''));if(s===''||isNaN(n))return {err:t(`${L(f.l)} يجب أن يكون رقماً`,`${L(f.l)} must be a number`)};return {v:f.t==='days'?Math.round(n*480):n}}
   case 'date':{const d=parseDate(raw);return d?{v:d}:{err:t(`تاريخ غير صحيح في ${L(f.l)} (استخدم YYYY-MM-DD)`,`Invalid date in ${L(f.l)} (use YYYY-MM-DD)`)}}
   case 'datetime':{const d=parseDateTime(raw);return d?{v:d}:{err:t(`تاريخ ووقت غير صحيح في ${L(f.l)}`,`Invalid date and time in ${L(f.l)}`)}}
   case 'email':return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)?{v:s.toLowerCase()}:{err:t('بريد غير صحيح','Invalid email')};
   default:return {v:s}}}
 async function readFile(file){const X=await lib(),wb=X.read(await file.arrayBuffer(),{cellDates:true});const ws=wb.Sheets[wb.SheetNames[0]];return X.utils.sheet_to_json(ws,{defval:'',raw:true})}
 function plan(def,rows){
  const f=fields(def),extra=(EXTRA[def.id]||[]).filter(x=>x.imp),keys=KEYS[def.id]||[],existing=Store.all(def.coll),out=[],seen=new Set(),usedNumbers=new Set(existing.map(x=>x.number).filter(Boolean));
  if(!rows.length)return {out,unknown:[]};
  const headers=Object.keys(rows[0]),mapH={},unknown=[];
  for(const h of headers){const k=low(h);const field=f.find(x=>low(x.k)===k||low(x.l[0])===k||low(x.l[1])===k)||extra.find(x=>low(x.k)===k||low(x.l[0])===k||low(x.l[1])===k);if(field)mapH[h]=field;else if(k==='id')mapH[h]='ID';else if(!['last updated','آخر تحديث','requester rating','requester comment','تقييم الموظف','تعليق الموظف'].includes(k))unknown.push(h)}
  rows.forEach((row,i)=>{
   const errs=[],vals={};let id='';
   for(const [h,field] of Object.entries(mapH)){const raw=row[h];if(field==='ID'){id=norm(raw);continue}const r=value(field,raw);if(r.err)errs.push(r.err);else if(!r.empty)vals[field.k]=r.v}
   if(!Object.keys(vals).length&&!id)return;/* blank line */
   let old=id?existing.find(x=>x.id===id):null;
   if(!old&&keys.length&&keys.every(k=>vals[k]!==undefined&&vals[k]!==''))old=existing.find(x=>keys.every(k=>low(x[k])===low(vals[k])))||null;
   if(id&&!old)errs.push(t('المعرّف ID غير موجود؛ احذفه لإضافة سجل جديد.','ID not found; clear it to add a new record.'));
   let rec=old?Store.clone(old):Object.fromEntries(def.fields.filter(x=>x.def!==undefined).map(x=>[x.k,typeof x.def==='function'?x.def():x.def]));
   /* Excel keeps minutes only, so a time within a minute of the stored one counts as unchanged. */
   const near=(a,b)=>a&&b&&Math.abs(Date.parse(a)-Date.parse(b))<60000;
   if(old)for(const [k,v] of Object.entries(vals)){const fd=f.find(x=>x.k===k)||extra.find(x=>x.k===k);if(fd?.t==='datetime'&&near(v,old[k]))delete vals[k]}
   const extras={};for(const x of extra)if(vals[x.k]!==undefined){extras[x.k]=vals[x.k];delete vals[x.k]}
   Object.assign(rec,vals);
   if(!old)for(const x of def.fields)if(x.req&&(!x.show||x.show(rec))&&(rec[x.k]===''||rec[x.k]==null))errs.push(t(`${L(x.l)} مطلوب`,`${L(x.l)} is required`));
   const dupKey=keys.length?keys.map(k=>low(rec[k])).join('|'):'';
   if(dupKey&&keys.every(k=>rec[k])&&seen.has(dupKey))errs.push(t('مكرر في الملف','Duplicate row in the file'));
   if(!errs.length){
    try{if(def.prepare)rec=def.prepare(rec,old?Store.clone(old):null)||rec}catch(x){errs.push(x.message)}
    if(!old&&rec.number&&usedNumbers.has(rec.number)){const m=rec.number.match(/^(.*-)(\d+)$/);if(m){let n=Number(m[2]);while(usedNumbers.has(m[1]+String(n).padStart(m[2].length,'0')))n++;rec.number=m[1]+String(n).padStart(m[2].length,'0')}}
    if(def.id==='tickets'){if(extras.createdAt&&!old){rec.createdAt=extras.createdAt;const [resp,res]=M.slaFor(rec),st=Date.parse(extras.createdAt);rec.responseTargetAt=new Date(P.addWorking(st,resp)).toISOString();rec.targetAt=new Date(P.addWorking(st,res)).toISOString();if(rec.status!=='open')rec.firstResponseAt=rec.firstResponseAt||extras.createdAt}if(extras.resolvedAt&&['resolved','closed'].includes(rec.status))rec.resolvedAt=extras.resolvedAt;if(extras.closedAt&&rec.status==='closed')rec.closedAt=extras.closedAt}
    if(def.id==='prs'&&extras.stepsDone!==undefined){const n=Math.max(0,Math.min(M.PR_STEPS.length,Math.round(extras.stepsDone))),d={},stamp=rec.createdAt||new Date().toISOString();for(let k=0;k<n;k++)d[k]=rec.stageDone?.[k]||stamp;rec.stageDone=d;rec.paid=n>=M.PR_STEPS.length}
   }
   if(rec.number)usedNumbers.add(rec.number);if(dupKey)seen.add(dupKey);
   const same=old&&!errs.length&&Object.keys(rec).every(k=>['history','updatedAt','updatedBy'].includes(k)||JSON.stringify(rec[k]??'')===JSON.stringify(old[k]??''));
   out.push({row:i+2,rec,old,errs,same,title:def.title?def.title(rec):(rec.name||rec.title||'')});
  });
  return {out,unknown};
 }
 async function commit(def,items){
  const now=new Date().toISOString(),by=Store.user?.email||'',entry={at:now,by,action:t('استيراد من Excel','Imported from Excel')};
  await Store.bulk(def.coll,list=>{for(const it of items){if(it.old){const i=list.findIndex(x=>x.id===it.old.id);const changes={};for(const k of Object.keys(it.rec))if(k!=='history'&&JSON.stringify(it.rec[k]??'')!==JSON.stringify(it.old[k]??''))changes[k]=it.rec[k];if(i>=0){Object.assign(list[i],changes,{updatedAt:now,updatedBy:by});list[i].history=[...(list[i].history||[]),entry].slice(-80)}}
   else list.push({...it.rec,id:Store.uid(),createdAt:it.rec.createdAt||now,createdBy:by,updatedAt:now,updatedBy:by,history:[entry]})}return list});
 }
 function dialog(def,file,res){
  const ok=res.out.filter(x=>!x.errs.length&&!x.same),same=res.out.filter(x=>x.same).length,bad=res.out.filter(x=>x.errs.length),neu=ok.filter(x=>!x.old).length,upd=ok.length-neu;
  const scrim=document.createElement('div');scrim.className='scrim';const el=document.createElement('aside');el.className='drawer';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','ioTitle');document.body.append(scrim,el);
  const close=()=>{scrim.remove();el.remove();document.removeEventListener('keydown',key)},key=e=>{if(e.key==='Escape')close()};document.addEventListener('keydown',key);scrim.onclick=close;
  el.innerHTML=`<div class="drawer-h"><div><small>${esc(L(def.label))}</small><h2 id="ioTitle">${t('مراجعة الاستيراد','Review the import')}</h2><small>${esc(file.name)}</small></div><button class="iconbtn" type="button" data-x aria-label="${t('إغلاق','Close')}">✕</button></div>
   <div class="drawer-b"><div class="kpis"><div class="kpi"><span class="lbl">${t('سجلات جديدة','New records')}</span><span class="val">${num(neu)}</span></div><div class="kpi"><span class="lbl">${t('تحديثات','Updates')}</span><span class="val">${num(upd)}</span></div>${same?`<div class="kpi"><span class="lbl">${t('بدون تغيير','Unchanged')}</span><span class="val">${num(same)}</span></div>`:''}<div class="kpi ${bad.length?'alert':''}"><span class="lbl">${t('صفوف بها أخطاء','Rows with errors')}</span><span class="val">${num(bad.length)}</span>${bad.length?`<span class="sub bad">${t('لن تُستورد','Will be skipped')}</span>`:''}</div></div>
    ${res.unknown.length?`<p class="muted" style="margin:0;font-size:12.5px">${esc(t('أعمدة غير معروفة تم تجاهلها: ','Unknown columns ignored: ')+res.unknown.join(', '))}</p>`:''}
    ${res.out.length?`<div class="tablewrap"><table><thead><tr><th>${t('الصف','Row')}</th><th>${t('السجل','Record')}</th><th>${t('النتيجة','Result')}</th></tr></thead><tbody>${res.out.slice(0,200).map(x=>`<tr><td class="mono">${x.row}</td><td class="wrap">${esc(x.title||'—')}</td><td>${x.errs.length?`<span class="pill crit">${t('خطأ','Error')}</span> <span style="font-size:12.5px">${esc(x.errs.join(' · '))}</span>`:x.same?P.pill(t('بدون تغيير','No change')):x.old?P.pill(t('تحديث','Update'),'info'):P.pill(t('جديد','New'),'ok')}</td></tr>`).join('')}</tbody></table></div>${res.out.length>200?`<p class="muted">${t('يُعرض أول 200 صف.','Showing the first 200 rows.')}</p>`:''}`:`<p class="empty">${t('لم يُعثر على صفوف في الورقة الأولى.','No rows were found on the first sheet.')}</p>`}
    <p class="err" id="ioErr" role="alert"></p></div>
   <div class="drawer-f"><div class="actions"><button class="btn" type="button" id="ioGo" ${ok.length?'':'disabled'}>${t(`استيراد ${num(ok.length)} صف`,`Import ${ok.length} rows`)}</button><button class="btn ghost" type="button" data-x>${t('إلغاء','Cancel')}</button></div></div>`;
  el.querySelectorAll('[data-x]').forEach(b=>b.onclick=close);
  el.querySelector('#ioGo').onclick=async e=>{e.target.disabled=true;try{await commit(def,ok);toast(t(`تم الاستيراد: ${num(neu)} جديد، ${num(upd)} تحديث`,`Imported: ${neu} new, ${upd} updated`));close()}catch(x){el.querySelector('#ioErr').textContent=x.message;e.target.disabled=false}};
  setTimeout(()=>el.querySelector('#ioGo:not([disabled])')?.focus()||el.querySelector('[data-x]').focus(),30);
 }
 /* Buttons for a page header; rows() returns the records currently shown. */
 function buttons(def){if(!M.isAdmin())return '';return `<span class="actions" data-io="${esc(def.id)}"><button class="btn ghost" type="button" data-io-act="export">${t('تصدير Excel','Export to Excel')}</button><button class="btn ghost" type="button" data-io-act="import">${t('استيراد','Import')}</button><button class="linkbtn" type="button" data-io-act="template">${t('نموذج الاستيراد','Import template')}</button><input type="file" accept=".xlsx,.xls,.csv" hidden data-io-file aria-label="${t('ملف الاستيراد','Import file')}"></span>`}
 function bind(root,def,rows){const box=root.querySelector(`[data-io="${def.id}"]`);if(!box)return;const file=box.querySelector('[data-io-file]');
  box.querySelector('[data-io-act="export"]').onclick=()=>exportRows(def,rows()).catch(x=>toast(x.message,true));
  box.querySelector('[data-io-act="template"]').onclick=()=>template(def).catch(x=>toast(x.message,true));
  box.querySelector('[data-io-act="import"]').onclick=()=>file.click();
  file.onchange=async()=>{const f=file.files[0];file.value='';if(!f)return;try{const rows=await readFile(f);dialog(def,f,plan(def,rows))}catch(x){toast(t('تعذرت قراءة الملف: ','Could not read the file: ')+x.message,true)}}}
 return {buttons,bind,plan,commit,exportRows,template,lib};
})();
