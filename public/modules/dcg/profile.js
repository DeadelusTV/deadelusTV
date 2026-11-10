/* Profil du portail : lecture de ses constellations et cartes, sans action de jeu. */
(() => {
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl=value=>{try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}};
  const ranks={1:'Commun',2:'Peu commun',3:'Rare',4:'Épique',5:'Légendaire',6:'Exclusive'};
  const finishes={normal:'Normale',gold:'Dorée',holo:'Stellar','holo-gold':'Lunar',ultimate:'Galactique','black-diamond':'Singularité'};
  let host=null,state=null,generation=0,request=0,trigger=null;
  const config=()=>window.DEADELUSTV_DCG_CONFIG;
  const source=()=>config().spaces.find(space=>space.id===config().accountSpaceId);
  const gameUrl=path=>new URL('#/'+path,source().gameBase).href;
  const valid=(run,owner)=>host?.isConnected&&generation===run&&state?.owner===owner;
  const blank=copy=>'<p class="portal-empty" role="status">'+copy+'</p>';
  const cardView=(card,large=false)=>'<tcg-card '+(large?'aura ':'hover="external" ')+'family="'+esc(card.family||'classic')+'" name="'+esc(card.name)+'" collection="'+esc(card.collection)+'" rarity="'+esc(ranks[card.rarity_level]||'Commun')+'" finish="'+esc(card.finish||'normal')+'" subtitle="'+esc(card.subtitle||'')+'" stars="'+Math.max(0,Math.min(6,Number(card.star_count)||0))+'" first="'+(card.is_first===true)+'" stats="false" image-framing="'+esc(JSON.stringify(card.image_framing||{}))+'" '+(safeUrl(card.image_url)?'image="'+esc(safeUrl(card.image_url))+'"':'placeholder="viewer"')+'></tcg-card>';
  function dialog(){return '<dialog class="portal-card-dialog" data-profile-dialog aria-labelledby="profile-card-title"><button type="button" class="portal-dialog-close" data-profile-close aria-label="Fermer l’aperçu">×</button><div data-profile-card-body></div></dialog>';}
  function close(restore=true){const saved=trigger;trigger=null;const modal=host?.querySelector('[data-profile-dialog]');if(modal?.open)modal.close();if(restore&&saved?.isConnected)saved.focus();}
  function open(index,button){
    const item=state?.items[index];if(!item||state.loading)return;
    const card=item.display,space=source(),modal=host.querySelector('[data-profile-dialog]'),body=host.querySelector('[data-profile-card-body]');
    const destination=new URL('#/catalogue',space.gameBase),params=new URLSearchParams({possession:'owned'});
    if(card.collection_id)params.set('collection',card.collection_id);
    destination.hash='/catalogue?'+params.toString();trigger=button;
    body.innerHTML='<div class="portal-card-detail"><div class="portal-card-large">'+cardView(card,true)+'</div><div><span class="overline">'+esc(space.name)+'</span><h2 id="profile-card-title">'+esc(card.name)+'</h2><dl><div><dt>Collection</dt><dd>'+esc(card.collection)+'</dd></div><div><dt>Rareté</dt><dd>'+esc(ranks[card.rarity_level]||'Commun')+'</dd></div><div><dt>Finition</dt><dd>'+esc(finishes[card.finish]||card.finish)+'</dd></div><div><dt>Exemplaires possédés</dt><dd>'+esc(item.quantity)+(card.is_first?' · First':'')+'</dd></div></dl><a class="button-primary" href="'+esc(destination.href)+'">Aller voir ma carte sur le DCG de '+esc(space.name)+'</a></div></div>';
    modal.showModal();
  }
  function filters(){return '<form class="portal-profile-filters" data-profile-search-form role="search"><label>Rechercher une carte<input type="search" maxlength="80" name="search" data-profile-search value="'+esc(state.search)+'" placeholder="Nom ou collection…"></label><button class="button-outline" type="submit" '+(state.loading?'disabled':'')+'>Rechercher</button></form>';}
  function paint(){
    if(!host||!state)return;
    close(false);
    if(state.loading&&!state.registered){host.innerHTML=blank('Recherche de tes constellations…');return;}
    if(state.error){host.innerHTML=blank('Impossible de charger tes constellations pour le moment.')+'<button class="button-outline" type="button" data-profile-retry>Réessayer</button>';return;}
    if(!state.registered&&state.view!=='constellations'){host.innerHTML=blank('Tu n’as pas encore rejoint de DCG.')+'<a class="button-outline" href="'+esc(gameUrl('boosters'))+'">Découvrir le DCG '+esc(source().name)+' →</a>';return;}
    if(state.view==='constellations'){
      host.innerHTML='<section class="portal-account-section"><h2>Mes DCG</h2>'+(state.registered?'<article class="portal-account-space"><img src="'+esc(source().avatar)+'" width="70" height="70" alt=""><div><h3>'+esc(source().name)+'</h3><p>Ta constellation et tes cartes possédées.</p></div><div class="portal-account-actions"><a class="button-primary" href="'+esc(gameUrl('catalogue'))+'">Voir ma constellation →</a><a class="button-outline" href="'+esc(gameUrl('profil'))+'">Mon profil dans ce DCG</a></div></article>':blank('Tu n’as pas encore rejoint de DCG.')+'<a class="button-outline" href="'+esc(gameUrl('boosters'))+'">Découvrir le DCG '+esc(source().name)+' →</a>')+'</section><section class="portal-account-section"><h2>Constellations communes</h2>'+blank('Les constellations communes seront réunies ici dès leur ouverture.')+'<a class="text-link" href="#tcg/collections-communes">Découvrir les collections communes →</a></section>';return;
    }
    const list=state.items.map((item,i)=>'<article class="portal-owned-card"><button class="portal-owned-open" type="button" data-profile-open="'+i+'" aria-label="Voir '+esc(item.display.name)+' — '+esc(finishes[item.display.finish]||item.display.finish)+(item.display.is_first?' · First':'')+'"><span class="portal-card-mini">'+cardView(item.display)+'</span><strong>'+esc(item.display.name)+'</strong><small>'+esc(source().name)+' · '+esc(finishes[item.display.finish]||item.display.finish)+'</small><span class="portal-owned-quantity">×'+esc(item.quantity)+'</span></button></article>').join('');
    host.innerHTML=filters()+'<p class="portal-owned-count" role="status">'+(state.loading?'Chargement des cartes…':esc(state.total)+' version(s) · '+esc(state.totalCopies)+' exemplaire(s) possédé(s)')+'</p><div class="portal-owned-grid">'+(list||blank('Aucune carte possédée ne correspond à cette recherche.'))+'</div><nav class="portal-owned-pages" aria-label="Pages des cartes possédées"><button class="button-outline" type="button" data-profile-page="previous" '+(!state.offset||state.loading?'disabled':'')+'>← Précédente</button><span>Page '+(Math.floor(state.offset/24)+1)+'</span><button class="button-outline" type="button" data-profile-page="next" '+(state.next===null||state.loading?'disabled':'')+'>Suivante →</button></nav>'+dialog();
  }
  async function load(){
    const run=generation,owner=state.owner,serial=++request;state.loading=true;state.error=false;paint();
    const current=()=>valid(run,owner)&&serial===request;
    try{
      const client=await window.DEADELUSTV_AUTH.getClient(),verified=await client.auth.getUser();
      if(!current())return;if(verified.error||verified.data?.user?.id!==owner)throw Error('Identity changed');
      const membership=await client.from('tcg_accounts').select('user_id').eq('user_id',owner).maybeSingle();
      if(!current())return;if(membership.error)throw membership.error;
      state.registered=membership.data?.user_id===owner;
      if(state.registered&&state.view==='cartes'){
        const result=await client.rpc('tcg_inventory_groups',{p_context:'inventory',p_search:state.search,p_offset:state.offset});
        if(!current())return;
        if(result.error||result.data?.owner_id!==owner||result.data?.broadcaster_id!==config().accountBroadcasterId||!Array.isArray(result.data?.items))throw Error('Inventory unavailable');
        state.items=result.data.items.filter(item=>item?.display&&Number.isSafeInteger(item.quantity)&&item.quantity>0);
        state.total=Number(result.data.total)||0;state.totalCopies=Number(result.data.total_copies)||0;
        state.next=Number.isSafeInteger(result.data.next_offset)&&result.data.next_offset>state.offset?result.data.next_offset:null;
      }
      state.loading=false;paint();
    }catch{if(current()){state.loading=false;state.error=true;state.items=[];paint();}}
  }
  function onClick(event){
    const card=event.target.closest('[data-profile-open]');if(card)open(Number(card.dataset.profileOpen),card);
    if(event.target.closest('[data-profile-close]'))close();
    if(event.target.closest('[data-profile-retry]'))void load();
    const page=event.target.closest('[data-profile-page]');if(page&&!page.disabled&&!state.loading){state.offset=page.dataset.profilePage==='next'?state.next:Math.max(0,state.offset-24);if(state.offset!==null)void load();}
    if(event.target.matches('[data-profile-dialog]')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}
  }
  function onSubmit(event){if(!event.target.matches('[data-profile-search-form]'))return;event.preventDefault();if(state.loading)return;state.search=event.target.querySelector('[data-profile-search]').value.trim().slice(0,80);state.offset=0;void load();}
  function onClose(event){if(event.target.matches('[data-profile-dialog]')){trigger?.isConnected&&trigger.focus();trigger=null;}}
  function unmount(){generation++;request++;close(false);if(host){host.removeEventListener('click',onClick);host.removeEventListener('submit',onSubmit);host.removeEventListener('close',onClose,true);host.replaceChildren();}host=null;state=null;}
  function mount(element,{user,view='constellations'}={}){unmount();host=element;if(!host||!user?.id)return;state={owner:user.id,view,registered:false,loading:false,error:false,search:'',offset:0,next:null,items:[],total:0,totalCopies:0};host.addEventListener('click',onClick);host.addEventListener('submit',onSubmit);host.addEventListener('close',onClose,true);void load();}
  window.DCGProfile=Object.freeze({mount,unmount});
})();
