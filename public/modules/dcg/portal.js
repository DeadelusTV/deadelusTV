(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const root=document.getElementById('dcg-portal-root');if(!root)return;
  const config=window.DEADELUSTV_DCG_CONFIG;
  const gameLink=route=>new URL('#/'+route,config.gameBase).href;
  const logo = 'assets/logo-chaine.png';
  let accountSection='accueil';
  let currentPage=null,generation=0,accountUser=null,accountLoading=false,accountError=false;
  let xpWidget=null,xpHost=null,xpUser=null;
  let stockWidget=null,stockHost=null,stockUser=null,stopHomeDaily=()=>{};
  function clearStocks(){stopHomeDaily();stopHomeDaily=()=>{};stockWidget?.destroy();stockWidget=null;stockHost=null;stockUser=null;}
  let passGainRequest=null,stopPassGain=()=>{};
  function clearPassGain(){passGainRequest=null;stopPassGain();stopPassGain=()=>{};}
  let mySpaces=[],myLoading=false,myError=false,signedInHint=false;
  // Annuaire des espaces réellement raccordés. Ajouter un streamer demandera
  // aussi son routage et son isolation serveur ; cette liste ne crée aucun DCG.
  const safeUrl=value=>{try{const url=new URL(value,location.href||'https://deadelustv.pages.dev/');return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}};
  const seen=new Set();
  const spaces=(config.spaces||[]).flatMap(space=>{
    const base=safeUrl(space.gameBase),avatar=safeUrl(space.avatar);
    if(!space.id||!space.name||!base||!avatar||seen.has(space.id))return [];
    seen.add(space.id);return [{...space,avatar,href:new URL('#/boosters',base).href}];
  });
  // Fisher–Yates : un tirage par chargement, stable lors des recherches ou connexions.
  const shuffled=[...spaces];for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
  const discovery=shuffled.slice(0,Math.max(1,Math.min(20,Number(config.discoveryLimit)||20)));
  const showDiscovery=spaces.length>1||(spaces.length===1&&config.showDiscoveryWithSingleStreamer===true);
  const pages = ['accueil', 'regles', 'mon-compte', 'collections-communes'];
  const titles = {accueil:'Accueil', regles:'Règles du jeu', 'mon-compte':'Mon compte', 'collections-communes':'Collections communes'};
  const heading = (tag, title, copy) => `<header class="portal-heading"><div class="bread">${tag}</div><h1>${title}</h1><p>${copy}</p></header>`;
  const badge = '<span class="portal-status">À venir</span>';
  const pass = () => '<section id="daily-pass-root" aria-label="État du Connexion Pass"></section>';
  const ordered = () => [...mySpaces].sort((a,b) => a.name.localeCompare(b.name, 'fr', {sensitivity:'base'}));
  const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').trim();
  const searchStates=new WeakMap(),directoryStates=new WeakMap();
  function searchResults(query=''){
    const found=[...spaces].sort((a,b)=>a.name.localeCompare(b.name,'fr',{sensitivity:'base'})).filter(space=>normalize(space.name).includes(normalize(query)));
    return found.length?'<ul class="portal-streamer-results">'+found.map(space=>`<li><a class="portal-streamer-result" href="${esc(space.href)}" data-portal-search-result="${esc(space.id)}"><img src="${esc(space.avatar)}" alt="" width="48" height="48" loading="lazy" referrerpolicy="no-referrer"><span>${esc(space.name)}</span><span aria-hidden="true">↗</span></a></li>`).join('')+'</ul>':'<p class="portal-search-empty" role="status">Aucun streamer ne correspond à ta recherche.</p>';
  }
  const searchDialog=()=>`<dialog class="portal-streamer-search" data-portal-search-dialog aria-labelledby="dcg-search-title" aria-describedby="dcg-search-description"><div class="portal-streamer-search-heading"><h2 id="dcg-search-title">Rechercher un streamer</h2><button class="portal-streamer-search-close" type="button" data-portal-search-close aria-label="Fermer la recherche">×</button></div><p id="dcg-search-description">Retrouve tous les DCG, y compris ceux que tu n’as pas encore rejoints.</p><form class="portal-search" role="search" data-portal-search-form><label for="dcg-search">Nom du streamer</label><input id="dcg-search" type="search" maxlength="80" autocomplete="off" placeholder="Rechercher un streamer…" data-portal-search autofocus></form><div class="portal-streamer-search-results" data-portal-search-results aria-live="polite" aria-relevant="additions text">${searchResults()}</div></dialog>`;
  function openSearch(trigger){const dialog=root.querySelector('[data-portal-search-dialog]');if(!dialog||dialog.open)return;searchStates.set(dialog,{trigger,restore:true});dialog.showModal();const field=root.querySelector('[data-portal-search]');if(field){updateSearch(field);field.focus();}}
  function closeSearch(restore=true){const dialog=root.querySelector('[data-portal-search-dialog]');if(!dialog?.open)return;const saved=searchStates.get(dialog);if(saved)saved.restore=restore;dialog.close();}
  const stockMarkup=()=>'<div class="portal-space-stock" aria-live="polite"><span data-portal-stock-target="booster">Boosters : <strong data-portal-stock="booster">…</strong></span><span data-portal-stock-target="alkahest">Alkahests : <strong data-portal-stock="alkahest">…</strong></span></div>';
  function directory() {
    if(myLoading)return '<p class="portal-empty" role="status">Recherche de tes DCG…</p>';
    if(myError)return '<div class="portal-empty" role="status"><p>Impossible de retrouver tes DCG pour le moment.</p><button class="button-outline" type="button" data-portal-my-retry>Réessayer</button></div>';
    if(!accountUser)return '<div class="portal-empty"><p>Connecte-toi avec Twitch pour retrouver les DCG où tu joues.</p><button class="button-outline" type="button" data-portal-login>Connexion Twitch ↗</button></div>';
    if(!mySpaces.length)return '<p class="portal-empty">Tu n’as pas encore rejoint de DCG. Découvre une communauté ci-dessous ou entre dans le DCG DeadelusTV.</p>';
    return ordered().map(space => `<a class="portal-space" href="${esc(space.href)}" data-dcg="${esc(space.id)}"><img src="${esc(space.avatar)}" alt="" referrerpolicy="no-referrer" width="96" height="96"><div class="portal-space-copy"><span class="portal-space-status">${esc(space.status||'')}</span><h3>${esc(space.name)}</h3><p>Ses cartes, ses moments, sa communauté.</p></div><div class="portal-space-level"${space.xpMarkup?'':' role="status" aria-label="'+esc(space.xpUnavailable?'Niveau momentanément indisponible':'Lecture de ton niveau')+'" aria-busy="'+!space.xpUnavailable+'"'}>${space.xpMarkup||'<span class="portal-space-level-placeholder" aria-hidden="true">'+(space.xpUnavailable?'—':'…')+'</span>'}</div>${stockMarkup()}</a>`).join('');
  }
  const discoverySection=()=>!showDiscovery?'':`<section class="portal-discovery" id="dcg-decouverte" aria-labelledby="dcg-discovery-title"><div class="portal-section-top"><div><span class="overline">LES COMMUNAUTÉS</span><h2 id="dcg-discovery-title">Les DCG</h2></div><div class="portal-carousel-controls" ${discovery.length<2?'hidden':''}><button type="button" data-portal-carousel-direction="previous" aria-label="DCG précédents" aria-controls="dcg-discovery-rail">←</button><button type="button" data-portal-carousel-direction="next" aria-label="DCG suivants" aria-controls="dcg-discovery-rail">→</button></div></div><ul class="portal-carousel" id="dcg-discovery-rail" data-portal-carousel tabindex="0" aria-label="Découvrir des DCG">${discovery.map(space=>`<li><a class="portal-streamer-pill" href="${esc(space.href)}" data-discovery-dcg="${esc(space.id)}" aria-label="Entrer dans le DCG ${esc(space.name)}"><img src="${esc(space.avatar)}" alt="" width="42" height="42" loading="lazy" referrerpolicy="no-referrer"><span>${esc(space.name)}</span></a></li>`).join('')}</ul></section>`;
  const directoryActions=()=>'<div class="portal-directory-actions"><div class="portal-general-xp-bubble" data-general-xp hidden aria-label="Niveau général DCG"></div><button class="button-outline" type="button" data-portal-search-open aria-haspopup="dialog">Rechercher un streamer</button></div>';
  const home = () => `<section class="portal-hero"><div><span class="overline">DEADELUS CARD GAME</span><h1><em>Collectionne les Communautés Twitch</em></h1><p>Rejoins les collections de tes streamers préférés et collectionne leurs cartes, celles de leurs viewers et leurs meilleurs clips.<br>Découvre des cartes exclusives au fil des événements et des nouvelles collections !</p><div class="portal-hero-links"><a class="button-primary" href="#dcg-annuaire" data-portal-directory>Explorer les DCG ↓</a><a class="text-link" href="#tcg/regles">Comment jouer ? →</a></div></div><a class="portal-featured" href="${gameLink('boosters')}" aria-label="Entrer dans le DCG DeadelusTV"><span class="portal-featured-orbit" aria-hidden="true"></span><img src="${logo}" alt="Logo DeadelusTV" width="210" height="210"><span class="portal-eyebrow">ENTRÉE DIRECTE</span><strong>DeadelusTV</strong><span>Ouvrir mon espace boosters →</span></a></section>
    ${pass()}<section class="portal-directory" id="dcg-annuaire" aria-labelledby="dcg-directory-title"><div class="portal-section-top"><div><span class="overline">MES COMMUNAUTÉS</span><h2 id="dcg-directory-title">Mes DCG</h2><p>Retrouve les communautés où tu joues.</p></div>${directoryActions()}</div><div class="portal-spaces" data-portal-spaces>${directory()}</div></section>${discoverySection()}${searchDialog()}`;
  const passFAQ = () => '<section class="portal-pass-faq" aria-labelledby="dcg-pass-faq-title"><h2 id="dcg-pass-faq-title">FAQ du Pass quotidien</h2>'+[
    ['Quand commence mon cycle ?', 'J1 commence à ta première connexion sur DeadelusTV, quel que soit le jour de la semaine. Ouvrir uniquement un DCG ne compte pas comme une visite du site.'],
    ['Que se passe-t-il après les dix jours ?', 'Après J10, un nouveau cycle commence à J1.'],
    ['Dois-je récupérer ma récompense le jour même ?', 'Non. Chaque connexion valide un jour et conserve sa récompense. Clique sur chaque losange lumineux pour récupérer uniquement la récompense choisie ; les autres restent en attente. Dans Mon compte, Tout récupérer réclame explicitement toutes les récompenses disponibles, y compris celles des cycles précédents.'],
    ['Et si je manque un jour ?', 'Un jour manqué fait reprendre la progression à J1. Les récompenses des jours où tu t’es connecté restent récupérables ; un jour sans connexion ne crée aucune récompense.'],
    ['À quelle heure change la journée ?', 'Le changement de journée a lieu à minuit, heure de Paris, avec les passages à l’heure d’été et à l’heure d’hiver.'],
    ['Quel est le bonus Sub ?', 'Un abonnement Twitch actif à DeadelusTV double uniquement les boosters : J9 donne 2 boosters de 3 cartes et J10 en donne 4, dans tous tes DCG éligibles. Les subs aux autres chaînes ne comptent pas. Le sub est vérifié lors de la récupération, puis le montant est figé pour cette récompense. Si Twitch est indisponible, elle reste à récupérer. Le futur bonus donateur suivra la même règle, avec un plafond à ×2 sans cumul.'],
    ['Dans quels DCG puis-je recevoir les récompenses ?', 'Le Pass suit ton compte commun. Chaque DCG auquel tu participes reçoit sa propre récompense, selon ses conditions d’accès ; les cartes et les soldes d’Alkahests restent séparés.']
  ].map(([question,answer])=>'<details><summary>'+question+'</summary><p>'+answer+'</p></details>').join('')+'</section>';
  const rules = () => `${heading('BIEN DÉMARRER', 'Les règles du jeu.', 'Un compte Twitch, plusieurs univers à collectionner. Chaque DCG garde sa propre progression et son solde d’Alkahests.')}${passFAQ()}<div class="portal-rules">
    <section><span class="portal-rule-number">01</span><div><h2>Rejoins ta communauté</h2><p>Choisis un DCG et connecte-toi avec Twitch. Le follow de la chaîne est vérifié automatiquement. Les inscriptions et le lancement sont ouverts par le streamer ; les boosters restent fermés jusqu’au lancement de son DCG.</p><a href="#tcg" class="text-link">Choisir un DCG →</a></div></section>
    <section><span class="portal-rule-number">02</span><div><h2>Ouvre tes boosters</h2><p>Retrouve tes boosters de départ, ta réserve automatique et les récompenses de présence ou les drops du live dans l’onglet Boosters. La réserve automatique pleine met son compteur en pause. Les délais et les disponibilités sont affichés dans ton DCG.</p><a href="${gameLink('boosters')}" class="text-link">Les boosters DeadelusTV →</a></div></section>
    <section><span class="portal-rule-number">03</span><div><h2>Complète ta Constellation</h2><p>Les versions découvertes restent dans ta Constellation, même lorsque tu ne possèdes plus la carte. L’onglet Cartes possédées regroupe tes exemplaires identiques et affiche leur nombre ; les First restent séparées des versions ordinaires.</p></div></section>
    <section><span class="portal-rule-number">04</span><div><h2>Fais évoluer tes cartes</h2><p>Le Laboratoire permet de fusionner, de tenter Stellar ou Lunar et d’obtenir une Holographique-Ultimate avec les deux finitions du même modèle. Les deux cartes sont conservées lors de l’obtention de la Holo. Les Exclusives ont leur propre finition Diamant noir. Les coûts, conditions et chances sont présentés avant confirmation.</p></div></section>
    <section><span class="portal-rule-number">05</span><div><h2>Gère tes Alkahests</h2><p>La Dissolution transforme tes exemplaires non protégés en Alkahests. Ton solde appartient à un seul DCG : les montants de plusieurs streamers ne s’additionnent pas. La future boutique commune permettra de choisir un seul de ces soldes pour acheter un booster.</p></div></section>
    <section><span class="portal-rule-number">06</span><div><h2>Échange et participe aux enchères</h2><p>Les échanges permettent de proposer plusieurs cartes et de répondre par une contre-offre. Une carte engagée est réservée. Sur le marché, une mise dépassée est remboursée et une enchère de dernière seconde prolonge le délai. Les collections communes auront des échanges à rareté égale et ne seront pas revendues aux enchères.</p></div></section></div>`;
  const profileNav = () => '<nav class="portal-profile-tabs" aria-label="Rubriques du profil"><a href="#tcg/mon-compte"'+(accountSection==='accueil'?' aria-current="page"':'')+'>Accueil</a><a href="#tcg/mon-compte/constellations"'+(accountSection!=='accueil'?' aria-current="page"':'')+'>Mes constellations</a></nav>'+(accountSection==='accueil'?'':'<nav class="portal-profile-views" aria-label="Affichage des constellations"><a href="#tcg/mon-compte/constellations"'+(accountSection==='constellations'?' aria-current="page"':'')+'>Par constellation</a><a href="#tcg/mon-compte/cartes"'+(accountSection==='cartes'?' aria-current="page"':'')+'>Toutes mes cartes</a></nav>');
  function account() {
    const meta=accountUser?.user_metadata||{},name=meta.preferred_username||meta.user_name||meta.display_name||'Collectionneur';
    const intro=heading('ESPACE PERSONNEL','Mon compte.',accountUser?'Bienvenue '+esc(String(name).slice(0,60))+'.':'Ton profil et tes constellations.');
    const navigation=profileNav();
    if(accountLoading)return intro+navigation+'<p class="portal-availability" role="status">Recherche de ta connexion Twitch…</p>';
    if(accountError)return intro+navigation+'<section class="panel portal-message"><h2>Connexion momentanément indisponible</h2><p>Réessaie pour retrouver ton compte Twitch.</p><button class="button-primary" data-portal-account-retry>Réessayer</button></section>';
    if(!accountUser)return intro+navigation+'<section class="panel portal-message"><span class="overline">TON COMPTE TWITCH</span><h2>Retrouve tes collections</h2><p>Connecte-toi pour accéder à tes cartes et à ton profil dans les DCG.</p><button class="button-primary" type="button" data-portal-login>Connexion Twitch ↗</button></section>';
    return intro+navigation+(accountSection==='accueil'?'<section class="portal-profile-xp" aria-label="Niveau général et progression"><div class="portal-profile-xp-medal" data-general-xp hidden></div><div class="portal-profile-xp-details" data-general-xp-details></div></section>':'<section id="dcg-profile-root" aria-label="Mes constellations"></section>');
  }
  const common = () => `${heading('DES UNIVERS À PARTAGER', 'Collections communes.', 'Des collections à découvrir entre communautés, avec un dos propre à chaque collection.')}<p class="portal-availability" role="status">La boutique est en préparation. Les collections ci-dessous illustrent les univers envisagés ; aucun booster commun n’est en vente pour le moment.</p><div class="portal-common-grid"><article class="portal-common portal-common-ghost"><span class="portal-common-art" aria-hidden="true">◌</span><span class="portal-eyebrow">COLLECTION ENVISAGÉE</span><h2>Phasmophobia</h2>${badge}</article><article class="portal-common portal-common-valor"><span class="portal-common-art" aria-hidden="true">◇</span><span class="portal-eyebrow">COLLECTION ENVISAGÉE</span><h2>Valorant</h2>${badge}</article></div><section class="panel portal-message"><span class="overline">LE CHOIX DU SOLDE</span><h2>Un achat, un DCG choisi</h2><p>Quand la boutique sera ouverte, tu pourras sélectionner le solde d’Alkahests d’un streamer suivi pour acheter ton booster commun. Le montant disponible et le coût seront affichés avant confirmation.</p><p>Les soldes resteront séparés : 200 Alkahests chez un streamer et 300 chez un autre ne forment pas un solde commun de 500.</p></section>`;
  const renderers = {accueil:home, regles:rules, 'mon-compte':account, 'collections-communes':common};
  const nav = () => '<nav class="dcg-portal-nav" aria-label="Navigation du portail DCG">'+pages.map(page=>'<a href="'+(page==='accueil'?'#tcg':'#tcg/'+page)+'"'+(page===currentPage?' aria-current="page"':'')+'>'+titles[page]+'</a>').join('')+'</nav>';
  function mountGeneralXP(){
    const profile=currentPage==='mon-compte'&&accountSection==='accueil';
    const host=currentPage==='accueil'||profile?root.querySelector('[data-general-xp]'):null;
    const detailsHost=profile?root.querySelector('[data-general-xp-details]'):null;
    if(host===xpHost&&accountUser?.id===xpUser)return;
    xpWidget?.destroy();xpWidget=null;xpHost=host;xpUser=accountUser?.id||null;
    if(!host)return;
    host.hidden=!accountUser;
    if(!accountUser){host.replaceChildren();return;}
    const id=accountUser.id;
    void window.DEADELUSTV_AUTH.getClient().then(client=>{
      if(!host.isConnected||accountUser?.id!==id||xpHost!==host||!window.DCGXPPass)return;
      xpWidget=window.DCGXPPass.mount(host,{client,userId:id,scope:'general',compact:true,detailsHost,rewardPresentation:profile?'popup':'flight',rewardTargets:(receipt,kind)=>profile?[]:stockWidget?.targets(receipt,kind)||[],onConfirmed:()=>{if(!profile)void stockWidget?.refresh();},isCurrent:()=>accountUser?.id===id&&xpHost===host&&(profile?currentPage==='mon-compte'&&accountSection==='accueil':currentPage==='accueil')});
    }).catch(()=>{if(host.isConnected&&xpHost===host)host.textContent='Ta progression est momentanément indisponible.';});
  }
  function syncStocks(client){
    const host=currentPage==='accueil'&&accountUser&&mySpaces.length?root.querySelector('[data-portal-spaces]'):null;
    if(!host){clearStocks();return;}
    if(stockHost===host&&stockUser===accountUser.id){stockWidget?.sync();return;}
    clearStocks();if(!window.DCGPortalStock)return;
    const id=accountUser.id;stockHost=host;stockUser=id;
    stockWidget=window.DCGPortalStock.mount(host,{userId:id,isCurrent:()=>accountUser?.id===id&&currentPage==='accueil'&&stockHost===host,readers:mySpaces.filter(space=>space.id===config.accountSpaceId).map(space=>({spaceId:space.id,broadcasterId:config.accountBroadcasterId,read:()=>client.rpc('tcg_my_boosters',{p_offset:0})}))});
  }
  function paint(){
    clearStocks();
    clearPassGain();
    window.DCGDailyPass?.unmount();
    root.innerHTML=nav()+'<div class="dcg-portal-view">'+(renderers[currentPage]||home)()+(currentPage==='mon-compte'&&accountSection==='accueil'?pass():'')+'</div>';
    mountGeneralXP();
    const title=root.querySelector('h1');if(title){title.id='tcg-title';title.tabIndex=-1;}
    if(currentPage==='mon-compte'&&accountSection!=='accueil'&&accountUser)window.DCGProfile?.mount(root.querySelector('#dcg-profile-root'),{user:accountUser,view:accountSection});
    if(currentPage==='accueil'||currentPage==='mon-compte'&&accountSection==='accueil')window.DCGDailyPass?.mount(root.querySelector('#daily-pass-root'),{view:currentPage==='mon-compte'?'details':'progress'});
  }
  async function readAccount(run){
    try{
      if(!window.DEADELUSTV_AUTH)throw new Error('Auth unavailable');
      const client=await window.DEADELUSTV_AUTH.getClient();
      const result=await client.auth.getSession();
      if(run!==generation||currentPage!=='mon-compte')return;
      if(result.error)throw result.error;
      accountUser=result.data?.session?.user||null;accountLoading=false;accountError=false;paint();
    }catch{
      if(run!==generation||currentPage!=='mon-compte')return;
      accountUser=null;accountLoading=false;accountError=true;paint();
    }
  }
  function hasSessionHint(){try{return signedInHint||localStorage.getItem(config.authStorageKey)!==null||new URLSearchParams(location.search).has('code');}catch{return signedInHint;}}
  function paintMySpaces(){if(currentPage!=='accueil')return;if(!accountUser||!mySpaces.length)clearStocks();mountGeneralXP();const list=root.querySelector('[data-portal-spaces]');const html=directory();if(list&&directoryStates.get(list)!==html){list.innerHTML=html;directoryStates.set(list,html);}stockWidget?.sync();}
  async function readSpaceXP(client,run,userId){
    if(!mySpaces.length)return;
    const current=()=>run===generation&&currentPage==='accueil'&&accountUser?.id===userId;
    try{
      // This RPC reads only the signed-in player's level in the connected DCG.
      // The general XP counter is deliberately not used for individual cards.
      const result=await client.rpc('tcg_my_xp');if(!current())return;
      const xp=result.data;
      if(result.error||xp?.scope!=='streamer'||xp.broadcaster_id!==config.accountBroadcasterId||!window.DCGXP)throw Error('Invalid DCG XP');
      window.DCGXP.progress(xp.total,xp.level);
      mySpaces=mySpaces.map(space=>{
        if(space.id!==config.accountSpaceId)return space;
        if(space.xpTotal===xp.total&&space.xpLevel===xp.level&&space.xpMarkup)return space;
        return {...space,xpTotal:xp.total,xpLevel:xp.level,xpUnavailable:false,xpMarkup:window.DCGXP.markup(xp,{scope:'streamer',compact:true,interactive:false,label:'Ton niveau chez '+space.name})};
      });
    }catch{
      if(!current())return;
      mySpaces=mySpaces.map(space=>({...space,xpMarkup:null,xpUnavailable:true}));
    }
    if(current())paintMySpaces();
  }
  async function readMySpaces(run){
    try{
      const client=await window.DEADELUSTV_AUTH.getClient();
      const result=await client.auth.getUser();if(run!==generation||currentPage!=='accueil')return;
      if(result.error)throw result.error;const user=result.data?.user||null;
      if(accountUser?.id!==user?.id){mySpaces=[];accountUser=user;paintMySpaces();}
      if(!user){myLoading=false;myError=false;paintMySpaces();return;}
      // Lecture de son propre compte uniquement, y compris pour un administrateur.
      // Ne pas appeler ensure_my_viewer : ouvrir le portail ne rejoint aucun DCG.
      const membership=await client.from('tcg_accounts').select('user_id').eq('user_id',user.id).maybeSingle();
      if(run!==generation||currentPage!=='accueil')return;if(membership.error)throw membership.error;
      accountUser=user;mySpaces=membership.data?.user_id===user.id?spaces.filter(space=>space.id===config.accountSpaceId).map(space=>({...space,...mySpaces.find(previous=>previous.id===space.id)})):[];
      myLoading=false;myError=false;paintMySpaces();syncStocks(client);
      await readSpaceXP(client,run,user.id);
    }catch{if(run!==generation||currentPage!=='accueil')return;mySpaces=[];myLoading=false;myError=true;paintMySpaces();}
  }
  function render(page='accueil'){
    closeSearch(false);
    if(page==='connexion-pass')window.history.replaceState(window.history.state,'','#tcg');
    const parts=page.split('/');accountSection=parts[0]==='mon-compte'&&['constellations','cartes'].includes(parts[1])?parts[1]:'accueil';
    const run=++generation;currentPage=parts[0]==='mon-compte'?'mon-compte':pages.includes(page)?page:'accueil';
    accountUser=null;accountError=false;accountLoading=currentPage==='mon-compte';mySpaces=[];myError=false;myLoading=currentPage==='accueil'&&hasSessionHint();paint();
    if(accountLoading)void readAccount(run);
    if(myLoading)void readMySpaces(run);
  }
  function cancel(){clearStocks();clearPassGain();window.DCGProfile?.unmount();window.DCGDailyPass?.unmount();xpWidget?.destroy();xpWidget=null;xpHost=null;xpUser=null;closeSearch(false);generation++;currentPage=null;accountUser=null;mySpaces=[];myLoading=false;myError=false;accountLoading=false;accountError=false;root.replaceChildren();}
  function updateSearch(field){const results=root.querySelector('[data-portal-search-results]');if(results)results.innerHTML=searchResults(field.value);}
  root.addEventListener('input',event=>{if(event.target.matches('[data-portal-search]'))updateSearch(event.target);});
  root.addEventListener('submit',event=>{if(event.target.matches('[data-portal-search-form]')){event.preventDefault();updateSearch(event.target.querySelector('input'));}});
  root.addEventListener('keydown',event=>{if(event.key==='Escape'&&root.querySelector('[data-portal-search-dialog]')?.open){event.preventDefault();event.stopPropagation();closeSearch();}});
  root.addEventListener('close',event=>{if(!event.target.matches('[data-portal-search-dialog]'))return;const saved=searchStates.get(event.target);searchStates.delete(event.target);if(saved?.restore&&currentPage==='accueil'&&saved.trigger?.isConnected)saved.trigger.focus();},true);
  root.addEventListener('click',event=>{
    if(event.target.closest('[data-daily-pass-claim-all]')&&accountUser&&currentPage==='mon-compte'&&accountSection==='accueil')passGainRequest={user:accountUser.id,bulk:true,generation,at:Date.now()};
    const passClaim=event.target.closest('[data-daily-pass-claim]');
    if(passClaim&&accountUser&&currentPage==='mon-compte'&&accountSection==='accueil'){
      const day=Number(passClaim.dataset.rewardDay||passClaim.closest('[data-day]')?.dataset.day);
      if(Number.isInteger(day)&&day>=1&&day<=10)passGainRequest={user:accountUser.id,day,visit:passClaim.dataset.visitId,generation,at:Date.now()};
    }
    const searchTrigger=event.target.closest('[data-portal-search-open]');if(searchTrigger)openSearch(searchTrigger);
    if(event.target.closest('[data-portal-search-close]'))closeSearch();
    if(event.target.closest('[data-portal-search-result]'))closeSearch(false);
    if(event.target.matches('[data-portal-search-dialog]')){const rect=event.target.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeSearch();}
    if(event.target.closest('[data-portal-login]'))void window.DEADELUSTV_AUTH?.signIn();
    if(event.target.closest('[data-portal-account-retry]'))render(accountSection==='accueil'?'mon-compte':'mon-compte/'+accountSection);
    if(event.target.closest('[data-portal-my-retry]')){myLoading=true;myError=false;paintMySpaces();void readMySpaces(++generation);}
    const direction=event.target.closest('[data-portal-carousel-direction]');
    if(direction){const rail=root.querySelector('[data-portal-carousel]');rail?.scrollBy({left:(direction.dataset.portalCarouselDirection==='next'?1:-1)*Math.max(180,(rail.clientWidth||0)*.8),behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
    if(event.target.closest('[data-portal-directory]')){
      event.preventDefault();const target=root.querySelector('#dcg-decouverte')||root.querySelector('#dcg-annuaire');target?.scrollIntoView?.({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
      if(showDiscovery)root.querySelector('[data-portal-carousel]')?.focus({preventScroll:true});
    }
  });
  window.addEventListener('deadelustv:auth-change',event=>{signedInHint=event.detail?.authenticated===true;accountUser=null;mySpaces=[];myError=false;if(currentPage==='mon-compte')render(accountSection==='accueil'?'mon-compte':'mon-compte/'+accountSection);else if(currentPage==='accueil'){const run=++generation;myLoading=signedInHint;paintMySpaces();if(myLoading)void readMySpaces(run);}});
  window.addEventListener('tcg:daily-pass-change',event=>{
    if(currentPage==='accueil'&&accountUser&&event.detail?.gains?.length){
      const id=accountUser.id,host=root.querySelector('#daily-pass-root');
      void stockWidget?.refresh();stopHomeDaily();
      const anchor=event.detail?.visit?.id?host?.querySelector('[data-pass-visit="'+event.detail.visit.id+'"]'):host?.querySelector('[aria-current="step"]');
      const animation=host&&window.DCGXPRewards?.start(host,{scope:'daily',anchor,resolveTargets:(receipt,kind)=>stockWidget?.targets(receipt,kind)||[],valid:()=>accountUser?.id===id&&currentPage==='accueil'&&host.isConnected});
      if(animation){stopHomeDaily=()=>animation.cancel();void animation.complete({gains:event.detail.gains}).catch(()=>{}).finally(()=>animation.cancel());}
      return;
    }
    const request=passGainRequest;passGainRequest=null;
    if(!request||request.generation!==generation||request.user!==accountUser?.id||!request.bulk&&Date.now()-request.at>15000||currentPage!=='mon-compte'||accountSection!=='accueil')return;
    if(Boolean(request.bulk)!==Boolean(event.detail?.bulk))return;
    const host=root.querySelector('#daily-pass-root'),anchor=host?.querySelector(request.bulk?'[data-daily-pass-claim-all]':request.visit?'[data-pass-visit="'+request.visit+'"]':'[data-day="'+request.day+'"]');
    if(!anchor||!window.DCGProfileRewards)return;
    stopPassGain();
    const popup=window.DCGProfileRewards.show(host,window.DCGProfileRewards.dailyItems(event.detail?.gains),{anchor,valid:()=>request.generation===generation&&request.user===accountUser?.id});
    stopPassGain=()=>popup.cancel();
  });
  window.addEventListener('focus',()=>{if(currentPage==='accueil'&&hasSessionHint())void readMySpaces(++generation);});
  window.DEADELUSTV_DCG=Object.freeze({render,cancel});
})();

