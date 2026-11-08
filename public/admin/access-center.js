/* V2 layout, live site access registry and shared support conversations. */
(() => {
 'use strict';
 const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const slug=v=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,61);
 let actor=null,client=null,caps=null,registry=null,tab='',generation=0,checkRun=0,busy=false,pending=null,search='';
 function notice(text='',error=false){$('#panel-notice').classList.toggle('error',error);$('#panel-notice').replaceChildren(document.createTextNode(text));if(pending&&!busy){const b=document.createElement('button');b.textContent='Réessayer la même action';b.type='button';b.dataset.retry='';$('#panel-notice').append(' ',b);}}
 function locked(){return busy||window.SiteContact?.busy;}
 function disabled(){const lock=!!locked();$$('#access-panel button,#access-panel input,#access-panel select').forEach(el=>{if(el.closest('#requests-root'))return;el.disabled=lock||el.dataset.fixed==='true'||(pending&&!el.hasAttribute('data-retry')&&el.closest('form,#rights-tables,#people-results'));});}
 function wipe(){generation++;actor=null;client=null;caps=null;registry=null;pending=null;busy=false;tab='';window.SiteContact?.unmountAdmin();$('#requests-root').replaceChildren();for(const id of ['rights-tables','catalog-tree','people-results','panel-stats'])$('#'+id).replaceChildren();$$('#access-panel form').forEach(f=>f.reset());$('#person-filter').value='';search='';$('#access-panel').hidden=true;$('#access-gate').hidden=false;notice();}
 function gate(text,signin=false){$('#access-gate').innerHTML='<h1>Administration du site</h1><p>'+esc(text)+'</p>'+(signin?'<button type="button" data-signin>Connexion Twitch</button> ':'')+'<button type="button" data-check>Réessayer</button>';$('#access-gate').hidden=false;$('#access-panel').hidden=true;}
 async function rpc(name,args){const g=generation,u=actor;let timer;try{const result=await Promise.race([client.rpc(name,args),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Réponse incertaine. Réessayez la même action pour vérifier son enregistrement.')),20000);})]);if(g!==generation||u!==actor)throw Error('session_changed');if(result.error)throw result.error;return result.data;}finally{clearTimeout(timer);}}
 async function check(){const n=++checkRun,g=generation;try{
   const c=await window.DEADELUSTV_AUTH.getClient(),r=await c.auth.getUser();if(n!==checkRun||g!==generation)return;
   const id=r.error?null:r.data?.user?.id;if(!id){wipe();gate('Connectez-vous avec Twitch pour accéder au panneau.',true);return;}
   if(actor&&actor!==id)wipe();actor=id;client=c;const stamp=generation,access=await rpc('site_support_access');if(n!==checkRun||stamp!==generation)return;
   if(!access?.staff){wipe();gate('Cet espace est réservé à l’équipe du site.');return;}
   const needRegistry=access.permissions&&(!registry||!caps?.permissions);caps=access;
   if(needRegistry)registry=await rpc('site_access_registry_state',{p_search:''});
   if(n!==checkRun||stamp!==generation)return;show();await window.SiteContact.refresh();
  }catch(error){if(n!==checkRun||error.message==='session_changed')return;if(error.code==='42501'){wipe();gate('Votre accès à ce panneau n’est plus actif.');}else if(!caps)gate('Vérification indisponible. Réessayez.');else notice(error.message||'Chargement indisponible.',true);}
 }
 function show(){ $('#access-gate').hidden=true;$('#access-panel').hidden=false;$$('[data-tab]').forEach(b=>b.hidden=b.dataset.tab!=='demandes'&&!caps.permissions);$('#request-count').textContent=(caps.new_count||0)+(caps.updates_count||0)||'';if(!caps.permissions){registry=null;$('#rights-tables').replaceChildren();$('#catalog-tree').replaceChildren();$('#people-results').replaceChildren();$('#panel-stats').replaceChildren();}if(registry)renderRegistry();choose(route(),false);}
 function route(){const h=location.hash.slice(1);return ['acces','configuration','demandes','demandes-reponses'].includes(h)?h:caps?.permissions?'acces':'demandes';}
 function choose(next,update=true){if(locked()){notice('Attendez la fin de l’enregistrement en cours.',true);return false;}if(!caps)return false;if(!caps.permissions&&!next.startsWith('demandes'))next='demandes';if(tab===next)return true;
   if(tab.startsWith('demandes')&&!window.SiteContact.unmountAdmin())return false;
   if(next.startsWith('demandes')&&!window.SiteContact.mountAdmin($('#requests-root'),{updatesOnly:next==='demandes-reponses'}))return false;
   tab=next;$('#rights').hidden=next!=='acces';$('#catalog').hidden=next!=='configuration';$('#requests').hidden=!next.startsWith('demandes');$$('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===(next.startsWith('demandes')?'demandes':next))));if(update)history.replaceState(null,'','#'+next);disabled();return true;
 }
 function renderTables(){if(!registry)return;const term=$('#person-filter').value.toLocaleLowerCase('fr'),people=registry.people.filter(p=>p.name.toLocaleLowerCase('fr').includes(term));
   $('#rights-tables').innerHTML=registry.categories.map(c=>{const rights=c.sections.flatMap(s=>s.permissions.map(p=>({...p,section:s.label})));return '<section class="module"><h2>'+esc(c.label)+'</h2><div class="table-scroll"><table><thead><tr><th scope="col">Compte Twitch</th>'+rights.map(p=>'<th scope="col">'+esc(p.section)+'<br>'+esc(p.label)+'<small class="permission-state">'+(p.connected?'Actif':'En préparation')+'</small></th>').join('')+'</tr></thead><tbody>'+people.map(p=>'<tr><th scope="row"><span class="account-name">'+esc(p.name)+'</span>'+(p.founder?'<div class="person-note">Administrateur fondateur · protégé</div>':'')+'</th>'+rights.map(r=>'<td><input type="checkbox" data-grant="'+esc(r.code)+'" data-person="'+esc(p.id)+'" aria-label="'+esc(p.name+' : '+r.label)+'" '+(p.rights.includes(r.code)?'checked ':'')+(p.founder&&r.connected?'data-fixed="true" disabled ':'')+'></td>').join('')+'</tr>').join('')+'</tbody></table></div>'+(!people.length?'<p class="empty">Aucun compte dans ce tableau.</p>':'')+(!rights.length?'<p class="empty">Aucune permission configurée.</p>':'')+'</section>';}).join('');disabled();
 }
 function renderRegistry(){renderTables();const permissions=registry.categories.flatMap(c=>c.sections.flatMap(s=>s.permissions));$('#panel-stats').innerHTML=[[registry.categories.length,'Catégories'],[permissions.length,'Permissions'],[registry.people.length,'Comptes'],[registry.people.reduce((n,p)=>n+p.rights.length,0),'Droits attribués']].map(([n,label])=>'<div><strong>'+n+'</strong><span>'+label+'</span></div>').join('');
   $('#catalog-tree').innerHTML=registry.categories.map(c=>'<section class="tree-card"><h2>'+esc(c.label)+'</h2>'+c.sections.map(s=>'<div class="tree-item"><strong>'+esc(s.label)+'</strong>'+s.permissions.map(p=>'<span class="tree-permission">'+esc(p.label)+' · '+(p.connected?'Actif':'En préparation')+' <span class="code">'+esc(p.code)+'</span></span>').join('')+'</div>').join('')+'</section>').join('');
   const cat=$('#section-category'),section=$('#permission-section'),oldCat=cat.value,oldSection=section.value;cat.innerHTML=registry.categories.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.label)+'</option>').join('');section.innerHTML=registry.categories.flatMap(c=>c.sections.map(s=>'<option value="'+esc(c.id+'/'+s.id)+'">'+esc(c.label+' / '+s.label)+'</option>')).join('');if([...cat.options].some(o=>o.value===oldCat))cat.value=oldCat;if([...section.options].some(o=>o.value===oldSection))section.value=oldSection;
   $('#people-results').innerHTML=search?'<h2>Résultats de recherche</h2>'+(registry.matches.filter(m=>!registry.people.some(p=>p.id===m.user_id)).map(m=>'<p class="person-result"><strong>'+esc(m.name)+'</strong> <button type="button" data-add-person="'+esc(m.user_id)+'">Ajouter au tableau</button></p>').join('')||'<p>Aucun autre compte correspondant. La personne doit s’être connectée avec Twitch au site ou au DCG.</p>'):'';disabled();
 }
 async function command(action,payload,form){if(locked()||pending||!registry)return;pending={action,payload,version:registry.version,request:crypto.randomUUID(),form};await sendCommand();}
 async function sendCommand(){if(busy||!pending)return;const operation=pending,g=generation;busy=true;notice('Enregistrement…');disabled();try{
   const data=await rpc('site_access_registry_command',{p_action:operation.action,p_payload:operation.payload,p_version:operation.version,p_request:operation.request});if(g!==generation)return;registry=data;pending=null;search='';operation.form?.reset();renderRegistry();notice('Modification enregistrée.');await window.SiteContact.refresh();
  }catch(error){if(g!==generation||error.message==='session_changed')return;
   if(error.code){pending=null;if(error.code==='42501'){wipe();gate('Votre accès à ce panneau n’est plus actif.');return;}try{registry=await rpc('site_access_registry_state',{p_search:search});}catch{}renderRegistry();}
   notice(error.message||'Enregistrement indisponible. Réessayez.',true);
  }finally{if(g===generation){busy=false;notice($('#panel-notice').textContent.replace(/Réessayer la même action$/,''),$('#panel-notice').classList.contains('error'));disabled();}}
 }
 document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-signin'))void window.DEADELUSTV_AUTH.signIn();if(b.hasAttribute('data-check'))void check();if(b.dataset.tab)choose(b.dataset.tab);if(b.hasAttribute('data-retry'))void sendCommand();if(b.dataset.addPerson)void command('add_person',{user_id:b.dataset.addPerson});if(b.id==='panel-refresh'&&!locked()&&!pending){if(registry){registry=null;}void check();}});
 $('#person-filter').addEventListener('input',renderTables);
 $('#rights-tables').addEventListener('change',e=>{const el=e.target;if(!el.dataset.grant)return;const p=registry.people.find(p=>p.id===el.dataset.person);const enabled=el.checked;el.checked=p.rights.includes(el.dataset.grant);void command('set_grant',{user_id:p.id,code:el.dataset.grant,enabled,member_version:p.member_version});});
 document.addEventListener('submit',e=>{const f=e.target;if(!['person-search','add-category','add-section','add-permission'].includes(f.id))return;e.preventDefault();if(locked()||pending||!registry)return;const values=Object.fromEntries(new FormData(f));if(f.id==='person-search'){const g=generation;busy=true;disabled();search=values.search.trim();void rpc('site_access_registry_state',{p_search:search}).then(data=>{if(g===generation){registry=data;renderRegistry();notice();}}).catch(error=>{if(g===generation)notice(error.message||'Recherche indisponible.',true);}).finally(()=>{if(g===generation){busy=false;disabled();}});return;}
   if(f.id==='add-category')void command('add_category',{id:slug(values.label),label:values.label.trim()},f);
   if(f.id==='add-section')void command('add_section',{category_id:values.category_id,id:slug(values.label),label:values.label.trim()},f);
   if(f.id==='add-permission'){const [category_id,section_id]=values.section_ref.split('/');void command('add_permission',{category_id,section_id,code:values.code.trim(),label:values.label.trim()},f);}
 });
 window.addEventListener('hashchange',()=>{if(!choose(route(),false)&&tab)history.replaceState(null,'','#'+tab);});
 window.addEventListener('site:support-busy-change',disabled);
 $('#site-account-crew-link').addEventListener('click',e=>{if(e.currentTarget.hash)e.currentTarget.href='../'+e.currentTarget.hash;});
 window.addEventListener('deadelustv:auth-change',()=>{wipe();gate('Vérification de la connexion…');void check();});
 window.addEventListener('site:support-access-change',e=>{const access=e.detail;if(!actor||access.actorId!==actor)return;if(!access.staff){wipe();gate('Votre accès à ce panneau n’est plus actif.');return;}const wasManager=caps?.permissions;caps=access;$('#request-count').textContent=(access.new_count||0)+(access.updates_count||0)||'';if(wasManager!==access.permissions){if(!access.permissions){generation++;busy=false;pending=null;registry=null;}show();if(access.permissions)void check();}});
 window.addEventListener('focus',()=>{if(!locked()&&!pending)void check();});
 void check();
})();
