/* Profil du portail : lecture de ses constellations et cartes, sans action de jeu. */
(() => {
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl=value=>{try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}};
  const ranks={1:'Commun',2:'Peu commun',3:'Rare',4:'Épique',5:'Légendaire',6:'Exclusive'};
  const finishes={normal:'Normale',gold:'Dorée',holo:'Stellar','holo-gold':'Lunar',ultimate:'Galactique','black-diamond':'Singularité'};
  const sorts={name:'Alphabétique',number:'Numéro de carte',rarity:'Rareté',collection:'Collection',streamer:'Streamer'};
  const collator=new Intl.Collator('fr',{numeric:true,sensitivity:'base'});
  const positive=value=>Number.isSafeInteger(value)&&value>0;
  const numberOf=item=>positive(item.display.catalogue_number)?item.display.catalogue_number:null;
  const variant=card=>JSON.stringify([card.model_id,card.finish||'normal',card.rarity_level,card.star_count||0,card.is_first===true]);
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
    const card=item.display,space=item.space,modal=host.querySelector('[data-profile-dialog]'),body=host.querySelector('[data-profile-card-body]');
    const destination=new URL('#/catalogue',space.gameBase),params=new URLSearchParams({possession:'owned'});
    if(card.collection_id)params.set('collection',card.collection_id);
    destination.hash='/catalogue?'+params.toString();trigger=button;
    body.innerHTML='<div class="portal-card-detail"><div class="portal-card-large">'+cardView(card,true)+'</div><div><span class="overline">'+esc(space.name)+'</span><h2 id="profile-card-title">'+esc(card.name)+'</h2><dl><div><dt>Collection</dt><dd>'+esc(card.collection)+'</dd></div><div><dt>Rareté</dt><dd>'+esc(ranks[card.rarity_level]||'Commun')+'</dd></div><div><dt>Finition</dt><dd>'+esc(finishes[card.finish]||card.finish)+'</dd></div><div><dt>Exemplaires possédés</dt><dd>'+esc(item.quantity)+(card.is_first?' · First':'')+'</dd></div></dl><a class="button-primary" href="'+esc(destination.href)+'">Aller voir ma carte sur le DCG de '+esc(space.name)+'</a></div></div>';
    modal.showModal();
  }
  function filters(){return '<form class="portal-profile-filters" data-profile-search-form role="search"><label>Rechercher une carte<input type="search" maxlength="80" name="search" data-profile-search value="'+esc(state.search)+'" placeholder="Nom ou collection…"></label><button class="button-outline" type="submit" '+(state.loading?'disabled':'')+'>Rechercher</button><label>Trier par<select data-profile-sort '+(state.loading?'disabled':'')+'>'+Object.entries(sorts).map(([value,label])=>'<option value="'+value+'"'+(state.sort===value?' selected':'')+'>'+label+'</option>').join('')+'</select></label><label>Ordre<select data-profile-direction '+(state.loading?'disabled':'')+'><option value="asc"'+(state.direction==='asc'?' selected':'')+'>Croissant</option><option value="desc"'+(state.direction==='desc'?' selected':'')+'>Décroissant</option></select></label></form>';}
  function arrange(){
    const sign=state.direction==='desc'?-1:1;
    const value=item=>state.sort==='number'?numberOf(item):state.sort==='rarity'?item.display.rarity_level:state.sort==='collection'?item.display.collection:state.sort==='streamer'?item.space.name:item.display.name;
    const compare=(a,b)=>typeof a==='number'&&typeof b==='number'?a-b:collator.compare(String(a??''),String(b??''));
    const ordered=[...state.allItems].sort((a,b)=>{
      const av=value(a),bv=value(b),missing=v=>v===null||v===undefined||v==='';
      if(missing(av)!==missing(bv))return missing(av)?1:-1;
      return sign*(compare(av,bv)||collator.compare(a.display.name,b.display.name)||collator.compare(a.space.name,b.space.name)||compare(numberOf(a),numberOf(b))||collator.compare(a.group_key,b.group_key));
    });
    state.items=ordered.slice(state.offset,state.offset+24);state.next=state.offset+24<ordered.length?state.offset+24:null;
  }
  function paint(){
    if(!host||!state)return;
    close(false);
    if(state.loading&&!state.registered){host.innerHTML=blank('Recherche de tes constellations…');return;}
    if(state.error){host.innerHTML=blank('Impossible de charger tes constellations pour le moment.')+'<button class="button-outline" type="button" data-profile-retry>Réessayer</button>';return;}
    if(!state.registered&&state.view!=='constellations'){host.innerHTML=blank('Tu n’as pas encore rejoint de DCG.')+'<a class="button-outline" href="'+esc(gameUrl('boosters'))+'">Découvrir le DCG '+esc(source().name)+' →</a>';return;}
    if(state.view==='constellations'){
      host.innerHTML='<section class="portal-account-section"><h2>Mes DCG</h2>'+(state.registered?'<article class="portal-account-space"><img src="'+esc(source().avatar)+'" width="70" height="70" alt=""><div><h3>'+esc(source().name)+'</h3><p>Ta constellation et tes cartes possédées.</p></div><div class="portal-account-actions"><a class="button-primary" href="'+esc(gameUrl('catalogue'))+'">Voir ma constellation →</a><a class="button-outline" href="'+esc(gameUrl('profil'))+'">Mon profil dans ce DCG</a></div></article>':blank('Tu n’as pas encore rejoint de DCG.')+'<a class="button-outline" href="'+esc(gameUrl('boosters'))+'">Découvrir le DCG '+esc(source().name)+' →</a>')+'</section><section class="portal-account-section"><h2>Constellations communes</h2>'+blank('Les constellations communes seront réunies ici dès leur ouverture.')+'<a class="text-link" href="#tcg/collections-communes">Découvrir les collections communes →</a></section>';return;
    }
    const list=state.items.map((item,i)=>'<article class="portal-owned-card"><button class="portal-owned-open" type="button" data-profile-open="'+i+'" aria-label="Voir '+esc(item.display.name)+' — '+esc(finishes[item.display.finish]||item.display.finish)+(item.display.is_first?' · First':'')+'"><span class="portal-card-mini">'+cardView(item.display)+'</span><strong>'+esc(item.display.name)+'</strong><small>'+(numberOf(item)?'N° '+esc(numberOf(item))+' · ':'')+esc(item.space.name)+' · '+esc(finishes[item.display.finish]||item.display.finish)+'</small><span class="portal-owned-quantity">×'+esc(item.quantity)+'</span></button></article>').join('');
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
        // Collect every server page before sorting, then paginate the ordered set.
        // These existing RPCs are stable reads and accept no chosen owner here.
        const items=new Map(),numbers=new Map(),space={...source()};let offset=0,total=0,copies=0;
        do{
          const result=await client.rpc('tcg_inventory_groups',{p_context:'inventory',p_search:state.search,p_offset:offset});if(!current())return;
          const data=result.data;
          if(result.error||data?.owner_id!==owner||data?.broadcaster_id!==config().accountBroadcasterId||!Array.isArray(data?.items)||!Number.isSafeInteger(data.total)||data.total<0||!Number.isSafeInteger(data.total_copies)||data.total_copies<0)throw Error('Inventory unavailable');
          if(offset&&(total!==data.total||copies!==data.total_copies))throw Error('Inventory changed during read');
          total=data.total;copies=data.total_copies;
          for(const item of data.items){if(!item?.display||!positive(item.quantity)||typeof item.group_key!=='string')throw Error('Invalid card');items.set(item.group_key,{...item,space});}
          if(data.next_offset===null)break;
          if(!Number.isSafeInteger(data.next_offset)||data.next_offset<=offset||data.next_offset>100000)throw Error('Invalid page');
          offset=data.next_offset;
        }while(current());
        if(items.size!==total)throw Error('Incomplete inventory');
        // Catalogue numbering belongs to each DCG and can repeat in another one.
        // Keep unnumbered owned cards as well; never invent a number for them.
        offset=0;
        if(total)do{
          const result=await client.rpc('tcg_owned_catalogue_page',{p_search:state.search,p_offset:offset});if(!current())return;
          const data=result.data;if(result.error||data?.personal!==true||!Array.isArray(data?.items))throw Error('Card numbers unavailable');
          for(const model of data.items)for(const slot of model.slots||[]){
            const card={...slot.display,...slot.owned_group,model_id:model.model_id};
            if(positive(slot.catalogue_number))numbers.set(variant(card),{catalogue_number:slot.catalogue_number,collection_id:model.collection_id,family:model.family});
          }
          if(data.next_offset===null)break;
          if(!Number.isSafeInteger(data.next_offset)||data.next_offset<=offset||data.next_offset>100000)throw Error('Invalid numbered page');
          offset=data.next_offset;
        }while(current());
        const identity=await client.auth.getUser();if(!current())return;
        if(identity.error||identity.data?.user?.id!==owner)throw Error('Identity changed');
        state.allItems=[...items.values()].map(item=>({...item,display:{...item.display,...numbers.get(variant(item.display))}}));
        state.total=total;state.totalCopies=copies;state.offset=0;arrange();
      }
      state.loading=false;paint();
    }catch{if(current()){state.loading=false;state.error=true;state.items=[];paint();}}
  }
  function onClick(event){
    const card=event.target.closest('[data-profile-open]');if(card)open(Number(card.dataset.profileOpen),card);
    if(event.target.closest('[data-profile-close]'))close();
    if(event.target.closest('[data-profile-retry]'))void load();
    const page=event.target.closest('[data-profile-page]');if(page&&!page.disabled&&!state.loading){state.offset=page.dataset.profilePage==='next'?state.next:Math.max(0,state.offset-24);if(state.offset!==null){arrange();paint();}}
    if(event.target.matches('[data-profile-dialog]')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}
  }
  function onSubmit(event){if(!event.target.matches('[data-profile-search-form]'))return;event.preventDefault();if(state.loading)return;state.search=event.target.querySelector('[data-profile-search]').value.trim().slice(0,80);state.offset=0;void load();}
  function onChange(event){
    if(state.loading)return;
    const field=event.target,sort=field.matches('[data-profile-sort]'),direction=field.matches('[data-profile-direction]');
    if(sort&&Object.hasOwn(sorts,field.value))state.sort=field.value;else if(direction&&['asc','desc'].includes(field.value))state.direction=field.value;else return;
    const search=host.querySelector('[data-profile-search]')?.value;
    state.offset=0;arrange();paint();if(search!==undefined){const input=host.querySelector('[data-profile-search]');if(input)input.value=search;}
    host.querySelector(sort?'[data-profile-sort]':'[data-profile-direction]')?.focus();
  }
  function onClose(event){if(event.target.matches('[data-profile-dialog]')){trigger?.isConnected&&trigger.focus();trigger=null;}}
  function unmount(){generation++;request++;close(false);if(host){host.removeEventListener('click',onClick);host.removeEventListener('submit',onSubmit);host.removeEventListener('change',onChange);host.removeEventListener('close',onClose,true);host.replaceChildren();}host=null;state=null;}
  function mount(element,{user,view='constellations'}={}){unmount();host=element;if(!host||!user?.id)return;state={owner:user.id,view,registered:false,loading:false,error:false,search:'',sort:'name',direction:'asc',offset:0,next:null,allItems:[],items:[],total:0,totalCopies:0};host.addEventListener('click',onClick);host.addEventListener('submit',onSubmit);host.addEventListener('change',onChange);host.addEventListener('close',onClose,true);void load();}
  window.DCGProfile=Object.freeze({mount,unmount});
})();
