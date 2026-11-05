/* Shared by the website and the DCG. Permissions and ownership are checked by RPC. */
(() => {
 'use strict';
 const host=document.currentScript?.dataset.contactHost||'tcg';
 const topics={site:[['phasmophobia','La partie Phasmophobia'],['crewmongus','La partie Crewmong Us'],['pavillon_noir','La partie Pavillon noir'],['suggestion','Suggestions'],['appeal','Contester une suspension / sanction']],tcg:[['booster','Un booster'],['catalogue','Le catalogue'],['laboratory','Le Laboratoire'],['trade_market','Les échanges et/ou le Marché'],['bug','Remonter un bug'],['other','Autre'],['suggestion','Suggestions'],['appeal','Contester une suspension / sanction']]};
 const statuses={new:'Nouvelles',in_progress:'En cours',resolved:'Résolues'};
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const when=s=>s?new Date(s).toLocaleString('fr-FR'):'';
 const topicLabel=(a,t)=>t==='launch_unlock'?'Demande pour débloquer mon DCG':topics[a]?.find(x=>x[0]===t)?.[1]||'Autre';
 const availableTopics=()=>[...topics[state.area],...(state.area==='tcg'&&state.requesterType==='streamer'?[['launch_unlock','Demande pour débloquer mon DCG']]:[])];
 const key=()=>crypto.randomUUID();
 const dialog=document.createElement('dialog');dialog.className='contact-dialog';dialog.setAttribute('aria-labelledby','contact-title');document.body.append(dialog);
 const alert=document.createElement('aside');alert.className='contact-alert';alert.hidden=true;alert.setAttribute('aria-label','Suivi des demandes');
 const header=document.querySelector('header');if(header)header.insertAdjacentElement('afterend',alert);else document.body.prepend(alert);
 let actor=null,client=null,caps=null,epoch=0,accessRun=0,panelRun=0,trigger=null,identityReady=false;
 const fresh=()=>({mode:'new',requesterType:'viewer',area:host==='site'?'site':'tcg',topic:'',body:'',requestKey:null,busy:false,error:'',notice:'',list:null,detail:null,reply:'',replyKey:null,note:'',nextStatus:'new',awaiting:false,resolve:false,search:'',members:null,choices:{},unreadOnly:false,updatesOnly:false});
 let state=fresh();
 const isAdmin=()=>state.mode==='admin'||state.mode==='permissions';
 function timed(p){let timer;return Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('La réponse prend trop de temps. Réessayez : votre envoi ne sera pas dupliqué.')),20000);})]).finally(()=>clearTimeout(timer));}
 async function rpc(name,args){const e=epoch,u=actor,c=client;if(!u||!c)throw Error('Connexion Twitch requise.');const r=await timed(c.rpc(name,args));if(e!==epoch||u!==actor)throw Error('session_changed');if(r.error){if(r.error.code==='42501'&&isAdmin()){caps={...caps,staff:false,permissions:false};state.detail=null;state.list=null;state.members=null;paintAccess();}throw r.error;}return r.data;}
 function paintAccess(){
  document.querySelectorAll('[data-contact-admin-open]').forEach(el=>el.hidden=!caps?.staff);
  document.querySelectorAll('[data-contact-mine-open]').forEach(el=>{el.hidden=!actor;const badge=el.querySelector('[data-contact-unread]');if(badge){badge.textContent=String(caps?.my_unread||0);badge.hidden=!caps?.my_unread;}});
  const html=(caps?.staff&&caps.new_count?'<button type="button" data-contact-admin-open>'+caps.new_count+' nouvelle(s) demande(s) à traiter</button>':'')+(caps?.staff&&caps.updates_count?'<button type="button" data-contact-admin-open data-contact-updates>'+caps.updates_count+' réponse(s) de joueurs</button>':'')+(caps?.my_unread?'<button type="button" data-contact-mine-open data-contact-unread-only>'+caps.my_unread+' réponse(s) à vos demandes</button>':'');
  if(alert.innerHTML!==html)alert.innerHTML=html;alert.hidden=!html;
 }
 function clearIdentity(){epoch++;accessRun++;panelRun++;actor=null;client=null;caps=null;identityReady=false;state=fresh();paintAccess();if(dialog.open)paint();}
 async function sync(){
  const n=++accessRun,e=epoch,priorActor=actor;
  try{
   const c=host==='site'?await window.DEADELUSTV_AUTH?.getClient():window.TCGAuth?.client;
   if(!c){identityReady=true;if(dialog.open)paint();return;}
   const r=await timed(c.auth.getUser());if(n!==accessRun||e!==epoch)return;
   const user=r.error?null:r.data?.user;
   if(actor&&actor!==user?.id){epoch++;panelRun++;state=fresh();}
   actor=user?.id||null;client=c;identityReady=true;
   if(!actor){caps=null;paintAccess();if(dialog.open)paint();return;}
   const u=actor,result=await timed(c.rpc('site_support_access'));if(n!==accessRun||u!==actor)return;
   if(result.error)throw result.error;
   const before=caps?.staff;caps=result.data;paintAccess();const live=dialog.querySelector('[data-contact-live]');if(live)live.hidden=!(state.mode==='admin'?caps.updates_count:caps.my_unread);
   if(dialog.open&&before&&!caps?.staff&&isAdmin()){panelRun++;state.detail=null;state.list=null;state.members=null;state.error='Votre accès à l’administration a été retiré.';paint();}
   else if(dialog.open&&priorActor!==actor){paint();if(state.mode!=='new'&&!state.busy)void loadList();}
   else if(dialog.open&&state.mode!=='new'&&!state.busy&&!(state.mode==='permissions'?state.members:state.list||state.detail)){paint();void loadList();}
  }catch(error){if(n!==accessRun)return;identityReady=true;if(dialog.open&&!actor){state.error='Connexion momentanément indisponible. Réessayez.';paint();}}
 }
 function top(){const admin=isAdmin();return '<div class="contact-heading"><div><span class="contact-overline">'+(admin?'ADMINISTRATION DU SITE':'CONTACT & SUIVI')+'</span><h2 id="contact-title">'+(admin?'Demandes et permissions':state.mode==='mine'?'Mes demandes':'Contacter l’équipe')+'</h2></div><button class="contact-close" type="button" data-contact-close aria-label="Fermer" '+(state.busy?'disabled':'')+'>×</button></div>'+
  '<nav class="contact-tabs" aria-label="'+(admin?'Administration du site':'Contact')+'">'+(admin?'<button data-contact-mode="admin" '+(state.mode==='admin'?'aria-current="page"':'')+'>Demandes</button>'+(caps?.permissions?'<button data-contact-mode="permissions" '+(state.mode==='permissions'?'aria-current="page"':'')+'>Permissions</button>':''):'<button data-contact-mode="new" '+(state.mode==='new'?'aria-current="page"':'')+'>Nouvelle demande</button><button data-contact-mode="mine" '+(state.mode==='mine'?'aria-current="page"':'')+'>Mes demandes</button>')+'</nav>';
 }
 function form(){return '<form data-contact-form><label>Je suis<select name="requesterType"><option value="viewer" '+(state.requesterType==='viewer'?'selected':'')+'>Viewer</option><option value="streamer" '+(state.requesterType==='streamer'?'selected':'')+'>Streamer</option></select></label><label>Votre demande concerne<select name="area" required><option value="site" '+(state.area==='site'?'selected':'')+'>Le site</option><option value="tcg" '+(state.area==='tcg'?'selected':'')+'>Le TCG</option></select></label><label>Cela concerne<select name="topic" required><option value="">Choisir un sujet</option>'+availableTopics().map(([v,l])=>'<option value="'+v+'" '+(state.topic===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label><label>Votre message<textarea name="message" rows="7" minlength="10" maxlength="8000" required placeholder="Décrivez votre demande. Pour un DCG, précisez le streamer concerné.">'+esc(state.body)+'</textarea></label><p class="contact-help">Vous retrouverez la conversation et les réponses de l’équipe dans « Mes demandes ». Pour demander le retrait de votre carte, choisissez Le TCG → Autre et expliquez votre souhait.</p><button class="contact-primary" type="submit">Envoyer ma demande</button></form>';}
 function list(){
  if(state.detail)return thread();
  let html=state.mode==='admin'?'<nav class="contact-tabs contact-status-tabs" aria-label="Statut des demandes">'+Object.entries(statuses).map(([s,l])=>'<button data-contact-status="'+s+'" '+(!state.updatesOnly&&state.nextStatus===s?'aria-current="page"':'')+'>'+l+' <span>'+esc(state.list?.counts?.[s]??'')+'</span></button>').join('')+'<button data-contact-filter="updates" '+(state.updatesOnly?'aria-current="page"':'')+'>Réponses de joueurs non lues</button></nav>':'<nav class="contact-tabs" aria-label="Filtrer mes demandes"><button data-contact-filter="all" '+(!state.unreadOnly?'aria-current="page"':'')+'>Toutes mes demandes</button><button data-contact-filter="unread" '+(state.unreadOnly?'aria-current="page"':'')+'>Réponses non lues</button></nav>';
  if(!state.list)return html+'<p role="status">Chargement des demandes…</p>';
  const rows=state.list.items||[];html+='<div class="contact-request-list">'+(rows.length?rows.map(r=>'<button class="contact-request" type="button" data-contact-ticket="'+esc(r.id)+'"><span><strong>Demande n°'+esc(r.number)+' · '+esc(topicLabel(r.area,r.topic))+'</strong>'+(r.unread?'<span class="contact-badge">Nouveau message</span>':'')+'<small>'+esc(r.requester||'')+' · '+esc(when(r.updated_at||r.created_at))+'</small></span><span>'+esc(statuses[r.status]||r.status)+(r.awaiting_reply?' · Informations demandées':'')+'</span>'+(r.preview?'<p>'+esc(r.preview)+'</p>':'')+'</button>').join(''):'<p>Aucune demande dans cette liste.</p>')+'</div>';
  if(state.list.next_before)html+='<button class="contact-secondary" type="button" data-contact-more>Voir les demandes précédentes</button>';
  return html;
 }
 function thread(){const d=state.detail,admin=state.mode==='admin',messages=d.conversation?.items||[];return '<button class="contact-secondary" type="button" data-contact-back>← Toutes les demandes</button> <button class="contact-secondary" type="button" data-contact-refresh>Actualiser la conversation</button><div class="contact-thread-heading"><h3>Demande n°'+esc(d.number)+' · '+esc(topicLabel(d.area,d.topic))+'</h3><p>'+esc(statuses[d.status]||d.status)+(admin&&d.requester?' · '+esc(d.requester)+(d.requester_type==='streamer'?' · Streamer':' · Viewer'):'')+(d.assigned_to?' · Prise en charge : '+esc(d.assigned_to):'')+'</p></div><p class="contact-notice" data-contact-live hidden>De nouveaux messages sont à consulter. Actualisez la conversation pour les afficher.</p>'+
  (d.awaiting_reply?'<p class="contact-notice" role="status">L’équipe attend des précisions pour continuer le traitement.</p>':'')+
  (d.conversation?.next_before?'<button class="contact-secondary" data-contact-older type="button">Messages précédents</button>':'')+'<ol class="contact-conversation" aria-label="Conversation">'+messages.map(m=>'<li class="contact-message contact-message-'+(m.kind==='staff'?'staff':'requester')+'"><div><strong>'+esc(m.author|| (m.kind==='staff'?'L’équipe':'Vous'))+'</strong><time>'+esc(when(m.at))+'</time></div><p>'+esc(m.body)+'</p></li>').join('')+'</ol>'+
  '<form data-contact-reply><label>'+ (admin?'Répondre au demandeur':'Votre réponse')+'<textarea name="reply" rows="4" maxlength="8000" required>'+esc(state.reply)+'</textarea></label>'+(admin?'<div class="contact-reply-options"><label><input type="checkbox" name="awaiting" '+(state.awaiting?'checked':'')+'> Demander des informations complémentaires</label><label><input type="checkbox" name="resolve" '+(state.resolve?'checked':'')+'> Marquer la demande résolue après cette réponse</label></div>':'<p class="contact-help">Votre réponse sera ajoutée à cette conversation et signalée à l’équipe.</p>')+'<button class="contact-primary" type="submit">Envoyer la réponse</button></form>'+
  (admin?'<details class="contact-internal"><summary>Traitement et notes internes</summary><form data-contact-treatment><label>Statut<select name="status">'+Object.entries(statuses).map(([v,l])=>'<option value="'+v+'" '+(state.nextStatus===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label><label>Note interne · visible uniquement par l’équipe<textarea name="note" rows="3" maxlength="2000">'+esc(state.note)+'</textarea></label><button class="contact-secondary" type="submit">Enregistrer le traitement</button></form><ul class="contact-history">'+(d.history||[]).map(h=>'<li>'+esc(when(h.at))+' · '+esc(h.actor)+' · '+esc(statuses[h.status]||h.status)+(h.note?'<p>'+esc(h.note)+'</p>':'')+'</li>').join('')+'</ul></details>':'');}
 function memberRow(m){const chosen=state.choices[m.user_id]||{role:m.role||'support',enabled:m.enabled!==false};return '<article class="contact-member"><div><strong>'+esc(m.name)+'</strong>'+(m.role==='owner'?'<p>Administrateur fondateur · accès conservé</p>':'')+'</div>'+(m.role==='owner'?'':'<label>Accès<select data-contact-member-role="'+esc(m.user_id)+'"><option value="support" '+(chosen.role==='support'?'selected':'')+'>Traitement des demandes</option><option value="admin" '+(chosen.role==='admin'?'selected':'')+'>Administration du site</option></select></label><label><input type="checkbox" data-contact-member-enabled="'+esc(m.user_id)+'" '+(chosen.enabled?'checked':'')+'> Actif</label><button type="button" class="contact-secondary" data-contact-member-save="'+esc(m.user_id)+'">Enregistrer</button>')+'</article>';}
 function permissions(){if(!caps?.permissions)return '<p>Accès réservé aux administrateurs du site.</p>';return '<p>Gérez l’accès au traitement des demandes et au panneau d’administration du site. Les droits des autres espaces restent gérés séparément.</p><form class="contact-search" data-contact-search><label>Rechercher un compte Twitch déjà connecté<input name="search" minlength="2" maxlength="80" required value="'+esc(state.search)+'" autocomplete="off"></label><button class="contact-secondary" type="submit">Rechercher</button></form>'+(state.members?'<div class="contact-members">'+state.members.members.map(memberRow).join('')+'</div>'+ (state.search?'<h3>Résultats de recherche</h3><div class="contact-members">'+(state.members.matches.filter(m=>!state.members.members.some(n=>n.user_id===m.user_id)).map(memberRow).join('')||'<p>Aucun autre compte correspondant.</p>')+'</div>':''):'<p role="status">Chargement des permissions…</p>');}
 function paint(){if(!dialog.open)return;dialog.classList.toggle('contact-dialog-admin',isAdmin());let content;
  if(!identityReady)content='<p role="status">Vérification de la connexion…</p>';
  else if(!actor)content='<p>Connectez-vous avec Twitch pour envoyer et retrouver vos demandes.</p><button class="contact-primary" type="button" data-contact-signin>Connexion Twitch</button><button class="contact-secondary" type="button" data-contact-retry>Réessayer</button>';
  else if(isAdmin()&&!caps?.staff)content='<p>Accès réservé à l’équipe du site.</p>';
  else content=state.mode==='new'?form():state.mode==='permissions'?permissions():list();
  dialog.innerHTML=top()+(state.error?'<p class="contact-error" role="alert">'+esc(state.error)+'</p>':'')+(state.notice?'<p class="contact-notice" role="status">'+esc(state.notice)+'</p>':'')+content;
  dialog.querySelectorAll('input,textarea,select,button').forEach(el=>el.disabled=state.busy);
 }
 function open(mode='new',options={}){if(state.busy)return;trigger=document.activeElement;state.error='';state.notice='';state.mode=mode;state.detail=null;state.list=null;state.members=null;state.nextStatus='new';panelRun++;
  if(options.area&&topics[options.area]){state.area=options.area;state.topic=options.topic||'';}if(options.deletion){state.area='tcg';state.topic='other';state.body='Je souhaite demander la suppression de ma carte Viewer et de ses exemplaires. Je souhaite conserver mon compte joueur.';state.requestKey=null;}
  state.unreadOnly=!!options.unread;state.updatesOnly=!!options.updates;
  if(!dialog.open)dialog.showModal();paint();if(actor&&mode!=='new')void loadList();else void sync();
 }
 async function work(fn){if(state.busy)return;const n=++panelRun,e=epoch;state.busy=true;state.error='';state.notice='';paint();try{await fn(()=>n===panelRun&&e===epoch);}catch(error){if(n===panelRun&&e===epoch&&error?.message!=='session_changed')state.error=error?.message||'Action indisponible. Réessayez.';}finally{if(n===panelRun&&e===epoch){state.busy=false;paint();}}}
 async function loadList(append=false){if(!actor)return;await work(async valid=>{
  let result;if(state.mode==='permissions')result=await rpc('site_support_admin_members',{p_search:state.search});
  else result=await rpc(state.mode==='admin'?'site_support_admin_list':'site_support_my_requests',state.mode==='admin'?{p_status:state.nextStatus,p_before:append?state.list?.next_before:null,p_updates:state.updatesOnly}:{p_before:append?state.list?.next_before:null,p_unread:state.unreadOnly});
  if(!valid())return;if(state.mode==='permissions')state.members=result;else{if(append)result.items=[...(state.list?.items||[]),...result.items];state.list=result;}
 });}
 async function loadTicket(id,older=false,keepDraft=false){await work(async valid=>{const admin=state.mode==='admin',result=await rpc(admin?'site_support_admin_detail':'site_support_my_detail',{p_id:id,p_before:older?state.detail?.conversation?.next_before:null});if(!valid())return;
  if(older){state.detail.conversation={items:[...result.conversation.items,...state.detail.conversation.items],next_before:result.conversation.next_before};}
  else{state.detail=result;if(!keepDraft){state.note=result.internal_note||'';state.nextStatus=result.status;state.reply='';state.replyKey=null;state.awaiting=false;state.resolve=false;}}
  void sync();
 });}
 async function submit(){await work(async valid=>{state.requestKey ||=key();const result=await rpc('site_support_submit',{p_area:state.area,p_topic:state.topic,p_message:state.body,p_request:state.requestKey,p_origin:host,p_requester_type:state.requesterType});if(!valid())return;
  state.mode='mine';state.body='';state.requestKey=null;state.detail=await rpc('site_support_my_detail',{p_id:result.id});state.notice='Votre demande n°'+result.number+' a été envoyée. Vous retrouverez cette conversation dans « Mes demandes ».';void sync();
 });}
 async function sendReply(){await work(async valid=>{const admin=state.mode==='admin';state.replyKey ||=key();const args={p_id:state.detail.id,p_message:state.reply,p_request:state.replyKey};if(admin)Object.assign(args,{p_version:state.detail.version,p_awaiting:state.awaiting,p_resolve:state.resolve});const result=await rpc(admin?'site_support_admin_reply':'site_support_my_reply',args);if(!valid())return;state.detail=result;state.note=result.internal_note||'';state.nextStatus=result.status;state.reply='';state.replyKey=null;state.awaiting=false;state.resolve=false;state.notice='Réponse envoyée.';void sync();});}
 async function treatment(){await work(async valid=>{const r=await rpc('site_support_admin_update',{p_id:state.detail.id,p_version:state.detail.version,p_status:state.nextStatus,p_note:state.note});if(!valid())return;state.detail=r;state.notice='Traitement enregistré.';void sync();});}
 async function saveMember(id){await work(async valid=>{const known=state.members.members.find(m=>m.user_id===id),choice=state.choices[id]||{role:known?.role||'support',enabled:known?.enabled!==false};const r=await rpc('site_support_admin_set_role',{p_user:id,p_role:choice.role,p_enabled:choice.enabled,p_version:known?.version||null});if(!valid())return;state.members=r;state.search='';state.choices={};state.notice='Permission enregistrée.';void sync();});}
 dialog.addEventListener('input',e=>{const el=e.target;if(el.name==='message'){state.body=el.value;state.requestKey=null;}if(el.name==='reply'){state.reply=el.value;state.replyKey=null;}if(el.name==='note')state.note=el.value;if(el.name==='search')state.search=el.value;});
 dialog.addEventListener('change',e=>{const el=e.target;if(el.name==='area'){state.area=el.value;state.topic='';state.requestKey=null;paint();}if(el.name==='topic'){state.topic=el.value;state.requestKey=null;}if(el.name==='requesterType'){state.requesterType=el.value;if(!availableTopics().some(t=>t[0]===state.topic))state.topic='';state.requestKey=null;paint();}if(el.name==='status')state.nextStatus=el.value;
  if(el.name==='awaiting'||el.name==='resolve'){state[el.name]=el.checked;state[el.name==='awaiting'?'resolve':'awaiting']=false;state.replyKey=null;paint();}
  const id=el.dataset.contactMemberRole||el.dataset.contactMemberEnabled;if(id){const existing=state.members.members.find(m=>m.user_id===id);state.choices[id]||={role:existing?.role||'support',enabled:existing?.enabled!==false};if(el.dataset.contactMemberRole)state.choices[id].role=el.value;else state.choices[id].enabled=el.checked;}
 });
 dialog.addEventListener('submit',e=>{e.preventDefault();if(e.target.matches('[data-contact-form]'))void submit();if(e.target.matches('[data-contact-reply]'))void sendReply();if(e.target.matches('[data-contact-treatment]'))void treatment();if(e.target.matches('[data-contact-search]'))void loadList();});
 dialog.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||state.busy)return;
  if(b.hasAttribute('data-contact-close'))dialog.close();if(b.hasAttribute('data-contact-retry'))void sync();
  if(b.hasAttribute('data-contact-signin')){try{sessionStorage.setItem('site:contact:return',JSON.stringify({mode:state.mode,at:Date.now()}));}catch{}if(host==='site')void window.DEADELUSTV_AUTH?.signIn();else void window.TCGAuth?.signIn();}
  if(b.dataset.contactMode)open(b.dataset.contactMode);if(b.dataset.contactStatus){state.nextStatus=b.dataset.contactStatus;state.detail=null;state.list=null;state.updatesOnly=false;void loadList();}
  if(b.dataset.contactFilter){state.updatesOnly=b.dataset.contactFilter==='updates';state.unreadOnly=b.dataset.contactFilter==='unread';state.list=null;void loadList();}
  if(b.dataset.contactTicket)void loadTicket(b.dataset.contactTicket);if(b.hasAttribute('data-contact-more'))void loadList(true);
  if(b.hasAttribute('data-contact-back')){state.detail=null;state.list=null;state.error='';state.nextStatus='new';void loadList();}
  if(b.hasAttribute('data-contact-older'))void loadTicket(state.detail.id,true);if(b.hasAttribute('data-contact-refresh'))void loadTicket(state.detail.id,false,true);if(b.dataset.contactMemberSave)void saveMember(b.dataset.contactMemberSave);
 });
 dialog.addEventListener('cancel',e=>{if(state.busy)e.preventDefault();});
 dialog.addEventListener('close',()=>{panelRun++;state.error='';if(trigger?.isConnected)trigger.focus();});
 document.addEventListener('click',e=>{const el=e.target.closest('[data-contact-open],[data-contact-mine-open],[data-contact-admin-open]');if(!el)return;e.preventDefault();open(el.hasAttribute('data-contact-admin-open')?'admin':el.hasAttribute('data-contact-mine-open')?'mine':'new',{area:el.dataset.contactArea,topic:el.dataset.contactTopic,deletion:el.hasAttribute('data-contact-deletion'),unread:el.hasAttribute('data-contact-unread-only'),updates:el.hasAttribute('data-contact-updates')});});
 window.addEventListener(host==='site'?'deadelustv:auth-change':'tcg:auth-change',()=>{clearIdentity();void sync();});
 window.addEventListener('focus',()=>{if(actor)void sync();});document.addEventListener('visibilitychange',()=>{if(!document.hidden&&actor)void sync();});
 setInterval(()=>{if(actor&&!document.hidden)void sync();},45000);
 function route(){const h=location.hash.replace(/^#\/?/,'');if(h==='mes-demandes')open('mine');else if(h==='contact')open();else if(h==='administration')open('admin');}
 window.addEventListener('hashchange',route);window.SiteContact={open:options=>open('new',options),openMine:()=>open('mine'),openAdmin:()=>open('admin'),refresh:sync};
 let restored=false;try{const saved=sessionStorage.getItem('site:contact:return');if(saved){sessionStorage.removeItem('site:contact:return');const previous=JSON.parse(saved);if(previous.at<=Date.now()&&Date.now()-previous.at<15*60*1000){open(previous.mode==='mine'?'mine':'new');restored=true;}}}catch{}
 if(!restored){route();let saved=false;try{saved=localStorage.getItem('sb-eodtxlhnfzyapkyvvxdi-auth-token')!==null;}catch{}if(window.TCGAuth?.user||saved)void sync();}
})();
