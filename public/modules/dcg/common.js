/* Configured common collections. Auth, prices, ownership and receipts remain server-controlled. */
(() => {
 'use strict';
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const ranks={1:'Commun',2:'Peu commun',3:'Rare',4:'Épique',5:'Légendaire',6:'Exclusive'};
 const actions={purchase:'achat',vote:'vote',propose_trade:'proposition d’échange',accept_trade:'acceptation d’échange',cancel_trade:'annulation',save_collection:'offre',save_ballot:'scrutin'};
 let host=null,serial=0,owner=null,state=null,offers=[],spaces=[],admin=null,operation=null,error='',partners=[];
 const valid=(run,id)=>host?.isConnected&&run===serial&&owner===id;
 const pendingKey=action=>'dcg:common-request:'+owner+':'+action;
 function pending(action){try{return JSON.parse(sessionStorage.getItem(pendingKey(action)));}catch{return null;}}
 function card(c){return '<tcg-card model-id="'+esc(c.model_id)+'" family="common" name="'+esc(c.name)+'" collection="'+esc(c.collection)+'" rarity="'+esc(ranks[c.rarity_level])+'" finish="normal" stars="'+esc(c.star_count||0)+'" first="false" stats="false" '+(/^https:\/\//.test(c.image_url||'')?'image="'+esc(c.image_url)+'"':'placeholder="viewer"')+'></tcg-card>';}
 function shop(){return offers.map(o=>'<article class="portal-common"><h2>'+esc(o.name)+'</h2><p>'+o.cards_per_booster+' cartes · '+o.price+' Alkahests par booster</p><form data-common-purchase="'+esc(o.id)+'"><label>Payer avec le DCG<select name="dcg" required>'+spaces.filter(s=>s.launched).map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+'</option>').join('')+'</select></label><p data-common-wallet role="status">Lecture du solde choisi…</p><label>Quantité<input name="quantity" type="number" min="1" max="50" value="1" required></label><p data-common-cost>Coût : '+o.price+' Alkahests</p><button class="button-primary" '+(!state||operation||!spaces.some(s=>s.launched)?'disabled':'')+'>Confirmer l’achat</button></form></article>').join('')||'<p>Aucune collection commune en vente actuellement.</p>';}
 function tradeForm(){return '<form data-common-trade><label>Mon exemplaire<select name="mine" required>'+(state?.copies||[]).map((c,i)=>'<option value="'+esc(c.id)+'">'+esc(c.display.name)+' · '+esc(ranks[c.rarity])+' · exemplaire '+(i+1)+'</option>').join('')+'</select></label><label>Rechercher un partenaire Twitch<input name="search" minlength="2" maxlength="80" autocomplete="off" data-common-partner-search></label><button class="button-outline" type="button" data-common-find>Rechercher les cartes de même rareté</button><label>Carte proposée par le partenaire<select name="peer" required>'+partners.map((p,i)=>'<option value="'+i+'">'+esc(p.display_name)+' · '+esc(p.display.name)+'</option>').join('')+'</select></label><button class="button-outline" '+(operation||!partners.length?'disabled':'')+'>Proposer cet échange</button></form>';}
 function personal(){
  if(!owner)return '<p>Connecte-toi avec Twitch pour retrouver tes cartes et tes portefeuilles.</p>';
  if(!state)return '<p>Rejoins un DCG et accepte le règlement en vigueur pour utiliser les collections communes.</p><a class="button-outline" href="#tcg">Retrouver les communautés →</a>';
  const boosters=state.boosters.map(b=>'<a class="button-primary" href="'+esc(window.DCGSession.href(b.wallet_dcg,'communes',{booster:b.id}))+'">Ouvrir mon booster commun →</a>').join('')||'<p>Aucun booster commun à ouvrir.</p>';
  const copies=state.copies.map(c=>'<article class="portal-owned-card">'+card(c.display)+'<p>'+esc(c.display.name)+'</p></article>').join('')||'<p>Aucune carte commune possédée.</p>';
  const trades=state.trades.map(t=>'<article><p>Échange de deux cartes communes à rareté égale</p>'+(t.recipient===owner?'<button class="button-primary" data-common-command="accept_trade" data-id="'+esc(t.id)+'">Accepter</button>':'')+'<button class="button-outline" data-common-command="cancel_trade" data-id="'+esc(t.id)+'">Annuler</button></article>').join('');
  const votes=state.ballots.map(b=>'<form data-common-vote="'+esc(b.id)+'"><h3>'+esc(b.title)+'</h3><p>Une voix définitive par propriétaire Streamer. Le scrutin ne publie aucune collection automatiquement.</p><label>Collection<select name="choice" required>'+b.options.map(id=>'<option value="'+esc(id)+'"'+(b.choice===id?' selected':'')+'>'+esc(b.labels?.[id]||'Collection indisponible')+'</option>').join('')+'</select></label><button class="button-outline" '+(!state.can_vote||b.choice||operation?'disabled':'')+'>'+(b.choice?'Vote enregistré':'Confirmer mon vote')+'</button></form>').join('')||'<p>Aucun vote ouvert.</p>';
  return '<section class="portal-account-section"><h2>Mes boosters communs</h2>'+boosters+'<h2>Mes cartes communes</h2><div class="portal-owned-grid">'+copies+'</div><h2>Échanges communs</h2>'+trades+tradeForm()+'<h2>Votes Streamer</h2>'+votes+'</section>';
 }
 function adminMarkup(){
  if(!admin)return '';
  const name=id=>admin.models.find(m=>m.collection_id===id)?.collection_name||'Collection commune';
  return '<details class="portal-message"><summary>Administration centrale des collections communes</summary><p><a class="button-outline" href="'+esc(window.DCGSession.href(null,'admin-collections'))+'">Créer ou gérer les collections</a> <a class="button-outline" href="'+esc(window.DCGSession.href(null,'admin-cartes'))+'">Éditer les modèles de cartes</a></p><p>Prépare les modèles dans l’éditeur de cartes central existant. Aucun tarif, tirage ni scrutin n’est activé par défaut.</p><form data-common-admin="save_collection"><h3>Offre de collection</h3><label>Collection<select name="id" required data-common-offer>'+[...new Set(admin.models.map(m=>m.collection_id))].map(id=>'<option value="'+esc(id)+'">'+esc(name(id))+'</option>').join('')+'</select></label><label>Prix du booster<input name="price" type="number" min="1" max="1000000" required></label><label>Cartes par booster<input name="cards_per_booster" type="number" min="1" max="50" required></label><label>Début UTC<input name="starts_at" type="datetime-local" required></label><label>Fin UTC<input name="ends_at" type="datetime-local" required></label><label>Dos commun de la collection (HTTPS)<input name="back_url" type="url" required></label><fieldset><legend>Modèles et poids de tirage</legend>'+admin.models.map(m=>'<label>'+esc(m.name)+' · '+esc(m.collection_name)+'<input type="number" min="0" max="1000000" name="weight:'+esc(m.model_id)+'" value="0"></label>').join('')+'</fieldset><label><input name="published" type="checkbox">Publier cette offre pendant sa période configurée</label><button class="button-primary" '+(operation?'disabled':'')+'>Enregistrer l’offre</button></form><form data-common-admin="save_ballot"><h3>Nouveau scrutin Streamer</h3><label>Titre<input name="title" maxlength="120" required></label><label>Début UTC<input name="starts_at" type="datetime-local" required></label><label>Fin UTC<input name="ends_at" type="datetime-local" required></label><fieldset><legend>Au moins deux collections proposées</legend>'+admin.collections.map(c=>'<label><input name="option" value="'+esc(c.id)+'" type="checkbox">'+esc(name(c.id))+'</label>').join('')+'</fieldset><label><input name="enabled" type="checkbox">Activer ce scrutin à voix unique et définitive par propriétaire</label><button class="button-primary" '+(operation?'disabled':'')+'>Enregistrer le scrutin</button></form><h3>Résultats des scrutins</h3>'+admin.ballots.map(b=>'<article><h4>'+esc(b.title)+'</h4>'+(b.tallies||[]).map(t=>'<p>'+esc(name(t.choice))+' : '+t.votes+' voix</p>').join('')+'</article>').join('')+'</details>';
 }
 function paint(){
  if(!host)return;
  const resumed=owner?Object.entries(actions).filter(([a])=>pending(a)).map(([a,label])=>'<button class="button-outline" data-common-resume="'+a+'">Reprendre la dernière demande : '+label+'</button>').join(''):'';
  host.innerHTML='<header class="portal-heading"><div class="bread">DES UNIVERS À PARTAGER</div><h1>Collections communes.</h1><p>Les soldes des DCG restent séparés. Les cartes communes s’échangent à rareté égale, sans revente, enchère ni évolution.</p></header>'+(error?'<p role="alert">'+esc(error)+'</p>':'')+resumed+'<div class="portal-common-grid">'+shop()+'</div>'+personal()+adminMarkup();
  for(const form of host.querySelectorAll('[data-common-purchase]'))void wallet(form);
  const form=host.querySelector('[data-common-admin="save_collection"]');if(form)fillOffer(form);
 }
 async function wallet(form){
  const run=serial,id=owner,dcg=form.elements.dcg.value,node=form.querySelector('[data-common-wallet]');if(!dcg)return;
  try{const c=await window.DCGPortal.client(),r=await c.scoped(dcg,'tcg_my_dust');if(valid(run,id)&&form.isConnected&&form.elements.dcg.value===dcg)node.textContent=r.error?'Solde indisponible':r.data.balance+' Alkahests disponibles dans ce DCG.';}catch{if(node.isConnected)node.textContent='Solde indisponible';}
 }
 async function load(){
  const run=++serial;try{
   const c=await window.DCGPortal.client(),u=await c.auth.getUser();if(run!==serial||!host?.isConnected)return;owner=u.error?null:u.data?.user?.id||null;const id=owner;
   const r=await c.raw.rpc('tcg_common_catalogue');if(!valid(run,id))return;if(r.error||!Array.isArray(r.data))throw r.error||Error('Catalogue invalide');offers=r.data;
   state=null;spaces=[];admin=null;
   if(owner){
    const results=await Promise.allSettled([c.common('state'),c.memberships(),c.admin('state')]);if(!valid(run,id))return;
    if(results[0].status==='fulfilled')state=results[0].value;
    if(results[1].status==='fulfilled')spaces=results[1].value;
    if(results[2].status==='fulfilled')admin=results[2].value;
   }
   paint();
  }catch{if(host?.isConnected&&run===serial){error='Lecture des collections communes indisponible.';paint();}}
 }
 async function mutation(action,input,isAdmin=false){
  if(operation||!owner)return;const op={run:serial,id:owner};operation=op;error='';
  const key=pendingKey(action),signature=JSON.stringify(input);let saved=pending(action);
  try{
   if(saved&&saved.signature!==signature)throw Error('Une réponse précédente reste inconnue. Reprends d’abord cette demande.');
   saved=saved||{signature,request:crypto.randomUUID(),isAdmin};sessionStorage.setItem(key,JSON.stringify(saved));
   const c=await window.DCGPortal.client();
   const r=isAdmin?{data:await c.admin(action,input,saved.request),error:null}:{data:await c.common(action,{...input,request_id:saved.request}),error:null};
   if(!valid(op.run,op.id))return;if(r.error)throw r.error;
   sessionStorage.removeItem(key);operation=null;await load();
  }catch(e){if(valid(op.run,op.id)){
   if(['42501','22023','40001','P0001','23514','23502','22P02'].includes(e.code))sessionStorage.removeItem(key);
   error=e.message||'Opération non confirmée. Reprends cette demande pour vérifier son résultat.';if(e.code==='40001'){error='L’offre a changé. Vérifie le DCG choisi et le nouveau prix avant de confirmer.';operation=null;await load();}
  }}finally{if(operation===op)operation=null;if(host?.isConnected&&owner===op.id)paint();}
 }
 function fillOffer(form){
  const o=admin?.collections.find(c=>c.id===form.elements.id.value);if(!o)return;
  for(const k of ['price','cards_per_booster','back_url'])form.elements[k].value=o[k];
  for(const k of ['starts_at','ends_at'])form.elements[k].value=new Date(o[k]).toISOString().slice(0,16);
  form.elements.published.checked=o.published;
  for(const model of admin.models){const field=form.elements['weight:'+model.model_id];if(field)field.value=o.pool.find(p=>p.model_id===model.model_id)?.weight||0;}
 }
 function submit(e){
  const form=e.target;if(!host?.contains(form))return;e.preventDefault();const data=new FormData(form);
  if(form.matches('[data-common-purchase]')){const o=offers.find(x=>x.id===form.dataset.commonPurchase);if(o)void mutation('purchase',{collection_id:o.id,version:o.version,confirmed_price:o.price,dcg_id:data.get('dcg'),quantity:Number(data.get('quantity'))});}
  else if(form.matches('[data-common-vote]'))void mutation('vote',{ballot_id:form.dataset.commonVote,choice:data.get('choice')});
  else if(form.matches('[data-common-trade]')){const p=partners[Number(data.get('peer'))];if(p)void mutation('propose_trade',{mine:data.get('mine'),theirs:p.copy_id,recipient:p.recipient});}
  else if(form.matches('[data-common-admin]')){
   const action=form.dataset.commonAdmin,p=Object.fromEntries(data);for(const k of ['starts_at','ends_at'])p[k]+=':00Z';
   if(action==='save_collection'){
    p.price=Number(p.price);p.cards_per_booster=Number(p.cards_per_booster);p.published=data.has('published');p.version=admin.collections.find(c=>c.id===p.id)?.version;
    p.pool=admin.models.filter(m=>m.collection_id===p.id&&Number(data.get('weight:'+m.model_id))>0).map(m=>({model_id:m.model_id,weight:Number(data.get('weight:'+m.model_id))}));for(const k of Object.keys(p))if(k.startsWith('weight:'))delete p[k];
   }else{p.id=crypto.randomUUID();p.options=data.getAll('option');delete p.option;p.enabled=data.has('enabled');}
   void mutation(action,p,true);
  }
 }
 async function findPartner(form){
  const run=serial,id=owner,mine=state?.copies.find(c=>c.id===form.elements.mine.value),search=form.elements.search.value.trim();if(!mine||search.length<2)return;
  try{const c=await window.DCGPortal.client(),r=await c.common('trade_options',{search,rarity:mine.rarity});if(!valid(run,id)||!form.isConnected)return;partners=r.items;const name=form.elements.mine.value;paint();const next=host.querySelector('[data-common-trade]');if(next){next.elements.mine.value=name;next.elements.search.value=search;}
  }catch{if(valid(run,id)){error='Recherche de partenaire indisponible.';paint();}}
 }
 function click(e){
  const command=e.target.closest('[data-common-command]');if(command)void mutation(command.dataset.commonCommand,{trade_id:command.dataset.id});
  const resume=e.target.closest('[data-common-resume]');if(resume){const action=resume.dataset.commonResume,p=pending(action);if(p)void mutation(action,JSON.parse(p.signature),p.isAdmin);}
  if(e.target.closest('[data-common-find]'))void findPartner(e.target.closest('form'));
 }
 function change(e){
  const purchase=e.target.closest('[data-common-purchase]');if(purchase){if(e.target.name==='dcg')void wallet(purchase);if(e.target.name==='quantity'){const o=offers.find(x=>x.id===purchase.dataset.commonPurchase);purchase.querySelector('[data-common-cost]').textContent='Coût : '+o.price*Number(e.target.value)+' Alkahests';}}
  if(e.target.matches('[data-common-offer]'))fillOffer(e.target.form);
  if(e.target.name==='mine'){partners=[];const peer=e.target.form.elements.peer;peer.replaceChildren();e.target.form.querySelector('button[type="submit"],button:last-child').disabled=true;}
 }
 function unmount(){serial++;operation=null;if(host){host.removeEventListener('submit',submit);host.removeEventListener('click',click);host.removeEventListener('change',change);}host=null;state=null;owner=null;partners=[];}
 function mount(node){unmount();host=node;if(!node)return;error='';host.innerHTML='<p role="status">Lecture des collections communes…</p>';host.addEventListener('submit',submit);host.addEventListener('click',click);host.addEventListener('change',change);void load();}
 window.addEventListener('deadelustv:auth-change',()=>{if(host){state=null;offers=[];spaces=[];admin=null;owner=null;partners=[];operation=null;host.replaceChildren();void load();}});
 window.DCGCommon=Object.freeze({mount,unmount});
})();
