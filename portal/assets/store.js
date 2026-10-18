/* Data layer. Server mode (IIS / Linux host) keeps shared data on the server through /api.
   Local mode (opened without the server, e.g. a preview) keeps data in this browser only.
   Every module goes through this file, so moving to another backend later only changes this file. */
window.Store=(()=>{
 const COLLECTIONS=['members','tickets','catalog','tasks','prs','licenses','assets','stock','movements','vendors','maintenance','leaves','cards','phones','lifecycle','kpis','articles','holidays','settings','notices','categories','sops','accounts','budgets','balances'];
 const LKEY='ictops.v1.';
 let mode='local',data={},versions={},user=null;const listeners=new Set();
 const clone=v=>JSON.parse(JSON.stringify(v));
 const uid=()=>(crypto.randomUUID?crypto.randomUUID().replace(/-/g,''):Date.now().toString(36)+Math.random().toString(36).slice(2)).slice(0,20);
 let held=new Set();
 const emit=name=>{if(window.P?.printing){held.add(name);return}listeners.forEach(f=>{try{f(name)}catch(e){console.error(e)}})};
 setTimeout(()=>window.P?.afterPrint?.(()=>{const h=[...held];held=new Set();for(const n of h)emit(n)}),0);
 async function api(path,opt={}){
  const r=await fetch('api/'+path,{credentials:'same-origin',cache:'no-store',...opt,headers:{'X-Portal':'1',...(opt.body?{'Content-Type':'application/json'}:{}),...(opt.headers||{})}});
  let body=null;try{body=await r.json()}catch{}
  return {ok:r.ok,status:r.status,body};
 }
 async function detect(){
  try{const r=await fetch('api/health',{cache:'no-store'});if(r.ok){const j=await r.json();if(j?.mode==='server'){mode='server';return mode}}}catch{}
  mode='local';return mode;
 }
 function loadLocal(){for(const c of COLLECTIONS){try{data[c]=JSON.parse(localStorage.getItem(LKEY+c)||'[]')}catch{data[c]=[]}if(!Array.isArray(data[c]))data[c]=[]}}
 async function loadServer(){
  const r=await api('data');if(!r.ok)throw Object.assign(Error('load'),{status:r.status});
  for(const c of COLLECTIONS){data[c]=r.body?.[c]?.items||[];versions[c]=r.body?.[c]?.version||0}
 }
 async function load(){if(mode==='server')await loadServer();else loadLocal();emit('*')}
 async function commit(name,mutate){
  if(!COLLECTIONS.includes(name))throw Error('Unknown collection '+name);
  if(mode==='local'){const next=mutate(clone(data[name]||[]));data[name]=next;try{localStorage.setItem(LKEY+name,JSON.stringify(next))}catch(e){throw Error('This browser is out of storage space.')}emit(name);return}
  for(let attempt=0;attempt<4;attempt++){
   const next=mutate(clone(data[name]||[]));
   const r=await api('data/'+encodeURIComponent(name),{method:'PUT',body:JSON.stringify({version:versions[name]||0,items:next})});
   if(r.ok){data[name]=r.body.items;versions[name]=r.body.version;emit(name);return}
   if(r.status===409&&r.body){data[name]=r.body.items||[];versions[name]=r.body.version||0;continue}
   if(r.status===401){emit('unauthorized');throw Error('Your session has ended. Sign in again.')}
   throw Error(r.body?.error||'The server could not save this change.');
  }
  throw Error('Someone else is saving at the same time. Try again.');
 }
 const all=name=>data[name]||[];
 const get=(name,id)=>all(name).find(x=>x.id===id)||null;
 /* Saves only the fields this user changed (compared with the copy they started from),
    so a colleague's or the server's change to other fields is never overwritten. */
 async function save(name,rec,action,base){
  const now=new Date().toISOString(),by=user?.email||'';
  const r=clone(rec);if(!r.id){r.id=uid();r.createdAt=now;r.createdBy=by}
  base=base===undefined?clone(get(name,r.id)):base;
  const entry=action?{at:now,by,action}:null,same=(a,b)=>JSON.stringify(a??'')===JSON.stringify(b??'');
  await commit(name,items=>{const i=items.findIndex(x=>x.id===r.id);
   if(i>=0&&base){const cur=items[i];for(const k of Object.keys(r))if(!['history','updatedAt','updatedBy'].includes(k)&&!same(r[k],base[k]))cur[k]=r[k];cur.updatedAt=now;cur.updatedBy=by;if(entry)cur.history=[...(cur.history||[]),entry].slice(-80)}
   else if(i>=0){items[i]={...items[i],...r,updatedAt:now,updatedBy:by};if(entry)items[i].history=[...(items[i].history||[]),entry].slice(-80)}
   else{r.updatedAt=now;r.updatedBy=by;if(entry)r.history=[...(r.history||[]),entry];items.push(r)}
   return items});
  return get(name,r.id)||r;
 }
 async function remove(name,id){await commit(name,items=>items.filter(x=>x.id!==id))}
 async function replace(name,items){await commit(name,()=>clone(items))}
 function exportAll(){const collections={};for(const c of COLLECTIONS)collections[c]=all(c);return {format:'ict-ops-portal-backup',version:1,exportedAt:new Date().toISOString(),collections}}
 async function importAll(obj){
  if(obj?.format!=='ict-ops-portal-backup'||typeof obj.collections!=='object')throw Error('This file is not a portal backup.');
  for(const c of COLLECTIONS)if(Array.isArray(obj.collections[c])&&!(c==='members'&&!obj.collections[c].length))await replace(c,obj.collections[c]);
 }
 /* Sign-in */
 async function session(){
  if(mode==='local'){try{const e=sessionStorage.getItem(LKEY+'user');const m=all('members').find(x=>x.email===e&&x.active!==false);user=m?{email:m.email,name:m.name,role:m.role}:null}catch{user=null}return user}
  const r=await api('me');user=r.ok?{email:r.body.email,name:r.body.name,role:r.body.role,pages:r.body.pages??null}:null;return user;
 }
 async function loginOptions(){
  if(mode==='local'){const m=all('members').filter(x=>x.active!==false);return {bootstrap:!m.length,members:m.map(x=>({email:x.email,name:x.name,hasPassword:true}))}}
  const r=await api('login-options');return r.body||{bootstrap:false,members:[]};
 }
 async function login(email,password,name,code){
  if(mode==='local'){
   email=String(email||'').trim().toLowerCase();
   if(!all('members').length)await save('members',{name:name||email.split('@')[0],email,role:'admin',active:true});
   const m=all('members').find(x=>x.email===email&&x.active!==false);if(!m)throw Error('This account is not on the team list.');
   try{sessionStorage.setItem(LKEY+'user',email)}catch{}user={email:m.email,name:m.name,role:m.role};return user;
  }
  const r=await api('login',{method:'POST',body:JSON.stringify({email,password,name,code})});
  if(!r.ok)throw Object.assign(Error(r.body?.error||(r.status===429?'Too many attempts. Wait a minute and try again.':'Sign-in failed.')),{needCode:!!r.body?.needCode});
  user={email:r.body.email,name:r.body.name,role:r.body.role};return user;
 }
 async function logout(){if(mode==='local'){try{sessionStorage.removeItem(LKEY+'user')}catch{}}else await api('logout',{method:'POST'});user=null}
 async function changePassword(current,next){if(mode==='local')return;const r=await api('password',{method:'POST',body:JSON.stringify({current,next})});if(!r.ok)throw Error(r.body?.error||'Could not change the password.')}
 async function setupCode(email){if(mode==='local')return null;const r=await api('members/setup-code',{method:'POST',body:JSON.stringify({email})});if(!r.ok)throw Error(r.body?.error||'Could not create the code.');return r.body}
 return {bulk:commit,api,COLLECTIONS,detect,load,all,get,save,remove,replace,exportAll,importAll,session,loginOptions,login,logout,changePassword,setupCode,uid,clone,
  on:f=>{listeners.add(f);return()=>listeners.delete(f)},get mode(){return mode},get user(){return user},refreshUser(){if(user){const m=all('members').find(x=>x.email===user.email);if(m)user={...user,name:m.name,role:m.role}}}};
})();
