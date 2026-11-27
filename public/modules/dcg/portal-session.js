/* Shared, access-token-only window broker. The portal alone owns/renews its refresh token. */
(() => {
 'use strict';
 const test=location.hostname==='127.0.0.1'||location.hostname==='localhost';
 const site=test?new URL(window.DCG_LOCAL_ORIGINS?.site||location.origin).origin:'https://deadelustv.pages.dev';
 const game=test?new URL(window.DCG_LOCAL_ORIGINS?.game||location.origin).origin:'https://tcg.yekelle-boulet.workers.dev';
 if(test&&[site,game].some(value=>{const u=new URL(value);return u.protocol!=='http:'||!['127.0.0.1','localhost'].includes(u.hostname);}))throw Error('Origines locales explicites requises.');
 const project='https://eodtxlhnfzyapkyvvxdi.supabase.co',key='sb_publishable_HwLsESqtQglS7FoSTxBX-Q_GzxyLX_Z';
 const uid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
 const peers=new Map();let epoch=0;
 const globalRoutes=new Set(['streamer','admin','admin-cartes','admin-collections']);
 const bridgeKey='dcg:portal-window-binding';
 const approvalsKey='dcg:portal-approved-windows';let approvals=[];
 if(location.origin===site)try{const saved=JSON.parse(sessionStorage.getItem(approvalsKey));if(Array.isArray(saved))approvals=saved.filter(p=>uid(p.nonce)&&uid(p.actor)&&(uid(p.dcg)||p.dcg===null)).slice(-64);}catch{}
 const saveApprovals=()=>{try{sessionStorage.setItem(approvalsKey,JSON.stringify(approvals.map(({nonce,dcg,actor,session_id})=>({nonce,dcg,actor,session_id}))));}catch{}};
 function sessionId(token){
  try{const value=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).session_id;if(uid(value))return value;}catch{}
  throw Error('Session Viewer invalide.');
 }
 function safeHash(){
  const [route,query='']=location.hash.split('?');if(!/^#\/[a-z-]+$/.test(route))return '#/streamer';
  const from=new URLSearchParams(query),to=new URLSearchParams();for(const key of ['dcg','collection','booster'])if(uid(from.get(key)))to.set(key,from.get(key));
  if(from.get('possession')==='owned')to.set('possession','owned');return route+(to.size?'?'+to:'');
 }
 function href(id,path='boosters',options={}){
  if(!(uid(id)||id===null&&globalRoutes.has(path))||!['boosters','profil','catalogue','streamer','admin','admin-cartes','admin-collections','streamer-creation','rejoindre','communes'].includes(path))throw Error('Destination DCG invalide.');
  return game+'/#/'+path+'?'+new URLSearchParams({...id?{dcg:id}:path.startsWith('admin')?{central:'1'}:{},...(path==='communes'&&uid(options.booster)?{booster:options.booster}:{}),
   ...(path==='catalogue'&&uid(options.collection)?{collection:options.collection}:{}),...(path==='catalogue'&&options.possession==='owned'?{possession:'owned'}:{})});
 }
 async function openGame(id,path='boosters',options={}){
  const nonce=crypto.randomUUID(),url=new URL(href(id,path,options));url.hash+='&portal_bridge='+nonce;
  const child=window.open('about:blank','dcg-'+nonce);if(!child)throw Error('Autorise l’ouverture du DCG dans un nouvel onglet.');
  try{const client=await window.DEADELUSTV_AUTH.getClient(),r=await client.auth.getUser();
   if(r.error||!uid(r.data?.user?.id)){child.location.href=href(id,path,options);return child;}
   for(const [target]of peers)if(target.closed)peers.delete(target);
   if(peers.size>=64)throw Error('Ferme un ancien onglet DCG avant de continuer.');
   const p={nonce,dcg:id,actor:r.data.user.id,epoch};peers.set(child,p);approvals=approvals.filter(a=>a.nonce!==nonce).slice(-63);approvals.push(p);saveApprovals();child.location.href=url.href;return child;
  }catch(e){child.close();throw e;}
 }
 if(location.origin===site){
  window.addEventListener('deadelustv:auth-change',event=>{
   if(uid(event.detail?.userId)&&approvals.length&&approvals.every(p=>p.actor===event.detail.userId))return;
   epoch++;for(const [target,p]of peers)target.postMessage({kind:'dcg-session-ended',nonce:p.nonce},game);peers.clear();approvals=[];saveApprovals();
  });
  window.addEventListener('message',async e=>{
   const m=e.data;if(e.origin!==game||!m||m.kind!=='dcg-session-request'||!uid(m.nonce)||!uid(m.request))return;
   let p=peers.get(e.source);
   if(!p){const saved=approvals.find(p=>p.nonce===m.nonce&&p.dcg===m.dcg);try{if(!saved||e.source.opener!==window)return;}catch{return;}p={...saved,epoch};peers.set(e.source,p);}
   if(m.nonce!==p.nonce||m.dcg!==p.dcg||p.epoch!==epoch)return;
   try{
    const client=await window.DEADELUSTV_AUTH.getClient();
    if(!['read','signout'].includes(m.action))return;
    const s=await client.auth.getSession(),session=s.data?.session;
    if(s.error||!session?.access_token)throw Error('Session absente');
    const verified=await client.auth.getUser(session.access_token),sid=sessionId(session.access_token);
    if(verified.error||!uid(verified.data?.user?.id)||session.user?.id!==verified.data.user.id)throw Error('Session absente');
    if(p.actor&&p.actor!==session.user.id)throw Error('Compte changé');
    if(p.session_id&&p.session_id!==sid)throw Error('Session changée');
    if(peers.get(e.source)!==p||p.epoch!==epoch||e.source.closed)return;
    if(m.action==='signout'){await client.auth.signOut();return;}
    p.actor=session.user.id;p.session_id=sid;approvals=approvals.map(a=>a.nonce===p.nonce?p:a);saveApprovals();
    e.source.postMessage({kind:'dcg-session-response',nonce:p.nonce,request:m.request,session:{access_token:session.access_token,expires_at:session.expires_at,session_id:sid,user:{id:p.actor}}},game);
   }catch{if(peers.get(e.source)===p)e.source.postMessage({kind:'dcg-session-response',nonce:p.nonce,request:m.request,session:null},game);}
  });
  document.addEventListener('click',e=>{
   const link=e.target.closest('a[href]');if(!link||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
   let u;try{u=new URL(link.href);}catch{return;}if(u.origin!==game)return;
   const [route,query='']=u.hash.slice(2).split('?'),id=new URLSearchParams(query).get('dcg');if(!uid(id)&&!(globalRoutes.has(route)&&id===null))return;
   const p=new URLSearchParams(query);
   e.preventDefault();void openGame(id,route,{booster:p.get('booster'),collection:p.get('collection'),possession:p.get('possession')}).catch(error=>{const p=document.createElement('p');p.setAttribute('role','alert');p.textContent=error.message;link.after(p);});
  });
 }
 async function connectGame(){
  const params=new URLSearchParams(location.hash.split('?')[1]||'');let nonce=params.get('portal_bridge'),dcg=params.get('dcg'),saved=null;
  if(location.origin!==game)return null;
  try{saved=JSON.parse(sessionStorage.getItem(bridgeKey));}catch{}
  if(!nonce&&saved?.version===1&&saved.site===site&&saved.game===game&&uid(saved.nonce)&&(uid(saved.dcg)||saved.dcg===null)){
   nonce=saved.nonce;dcg=saved.dcg;
   if(new URLSearchParams(location.search).get('streamer_oauth')==='return'&&/^#\/[a-z-]+(?:\?[^#]*)?$/.test(saved.uiHash||''))history.replaceState(history.state,'',location.pathname+location.search+saved.uiHash);
  }
  if(!nonce){if(uid(dcg)||location.hash.split('?')[0]==='#/streamer'||new URLSearchParams(location.search).has('streamer_oauth'))throw Error('Ouvre ce parcours depuis le portail pour conserver ta session Viewer.');return null;}
  if(!uid(nonce)||!(uid(dcg)||dcg===null)||!window.opener)throw Error('Retourne au portail pour rouvrir ce DCG.');
  const remember=()=>{try{sessionStorage.setItem(bridgeKey,JSON.stringify({version:1,site,game,nonce,dcg,uiHash:safeHash()}));}catch{}};
  let current=null,actor=null,stopped=false;const pending=new Map(),listeners=new Set();
  const notify=event=>{for(const fn of listeners)fn(event,current);};
  function ended(){stopped=true;current=null;try{sessionStorage.removeItem(bridgeKey);}catch{}for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('Session du portail interrompue.'));}pending.clear();notify('SIGNED_OUT');}
  window.addEventListener('message',e=>{
   if(e.origin!==site||e.source!==window.opener||e.data?.nonce!==nonce)return;
   if(e.data.kind==='dcg-session-ended'){ended();return;}
   if(e.data.kind!=='dcg-session-response')return;const p=pending.get(e.data.request);if(!p)return;
   pending.delete(e.data.request);clearTimeout(p.timer);
   const s=e.data.session;
   if(!s||typeof s.access_token!=='string'||s.access_token.length>16384||!uid(s.user?.id)||!uid(s.session_id)||current&&current.session_id!==s.session_id||actor&&actor!==s.user.id){ended();p.reject(Error('Session du portail modifiée.'));return;}
   current={...s,user:current?.user?.id===s.user.id?current.user:s.user};p.resolve(current);
  });
  function read(){
   if(stopped||window.opener.closed){if(!stopped)ended();return Promise.reject(Error('Rouvre ce DCG depuis le portail.'));}
   const request=crypto.randomUUID();return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(request);current=null;notify('SIGNED_OUT');reject(Error('Portail indisponible.'));},8000);pending.set(request,{resolve,reject,timer});window.opener.postMessage({kind:'dcg-session-request',nonce,dcg,request,action:'read'},site);});
  }
  async function getUser(){
   try{const s=await read();const response=await fetch(project+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+s.access_token},cache:'no-store',credentials:'omit'});
    const user=response.ok?await response.json():null;if(!uid(user?.id)||user.id!==s.user.id||sessionId(s.access_token)!==s.session_id||actor&&actor!==user.id)throw Error('Identité invalide');
    actor=user.id;current={...s,user};return{data:{user},error:null};
   }catch(e){current=null;return{data:{user:null},error:e};}
  }
  const verified=await getUser();if(verified.error)throw verified.error;
  remember();window.addEventListener('hashchange',()=>{if(!stopped)remember();});
  const auth={getUser,getSession:async()=>{try{const s=await read();return{data:{session:{...s,user:current?.user||s.user}},error:null};}catch(error){return{data:{session:null},error};}},
   onAuthStateChange:fn=>{listeners.add(fn);queueMicrotask(()=>fn('INITIAL_SESSION',current));return{data:{subscription:{unsubscribe:()=>listeners.delete(fn)}}};},
   signOut:async()=>{window.opener.postMessage({kind:'dcg-session-request',nonce,dcg,request:crypto.randomUUID(),action:'signout'},site);ended();return{error:null};}};
  return{auth,accessToken:async()=>{const s=await read();return s.access_token;}};
 }
 window.DCGSession=Object.freeze({href,openGame,connectGame,site,game,returnToPortal:dcg=>{const u=new URL(site);if(uid(dcg))u.searchParams.set('dcg_return',dcg);u.hash='tcg';location.assign(u.href);}});
 // The same canonical portal links also work in the explicit two-origin local fixture.
 if(test&&location.origin===game)document.addEventListener('DOMContentLoaded',()=>{
  const sync=()=>{for(const link of document.querySelectorAll('a[href^="https://deadelustv.pages.dev/#tcg"]'))link.href=site+'/'+new URL(link.href).hash;};
  sync();new MutationObserver(sync).observe(document.body,{childList:true,subtree:true});
 });
})();
