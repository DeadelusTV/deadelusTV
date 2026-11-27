(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const root=document.getElementById('dcg-portal-root');if(!root)return;
  const config=window.DEADELUSTV_DCG_CONFIG;
  let accountSection='accueil';
  let currentPage=null,generation=0,accountUser=null,accountLoading=false,accountError=false;
  let latestStatsRequest=0;
  let xpWidget=null,xpHost=null,xpUser=null;
  let stockWidget=null,stockHost=null,stockUser=null,stopHomeDaily=()=>{};
  function clearStocks(){stopHomeDaily();stopHomeDaily=()=>{};stockWidget?.destroy();stockWidget=null;stockHost=null;stockUser=null;}
  let liveWidget=null,liveHost=null,liveUser=null,liveKey=null;
  function clearLive(){liveWidget?.destroy();liveWidget=null;liveHost=null;liveUser=null;liveKey=null;}
  let passGainRequest=null,stopPassGain=()=>{};
  function clearPassGain(){passGainRequest=null;stopPassGain();stopPassGain=()=>{};}
  let mySpaces=[],myLoading=false,myError=false,signedInHint=false;
  // Annuaire des espaces réellement raccordés. Ajouter un streamer demandera
  // aussi son routage et son isolation serveur ; cette liste ne crée aucun DCG.
  const safeUrl=value=>{try{const url=new URL(value,location.href||'https://deadelustv.pages.dev/');return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}};
  let spaces=[];
  let discovery = null, discoveryLoading = false;
  const pages = ['accueil', 'regles', 'mon-compte', 'collections-communes'];
  const titles = {accueil:'Accueil', regles:'Règles du jeu', 'mon-compte':'Mon compte', 'collections-communes':'Collections communes'};
  const heading = (tag, title, copy) => `<header class="portal-heading"><div class="bread">${tag}</div><h1>${title}</h1>${copy ? `<p>${copy}</p>` : ''}</header>`;
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
  const stockMarkup=space=>'<div class="portal-space-stock" aria-live="polite"><span data-portal-stock-target="booster">Boosters : <strong data-portal-stock="booster">'+(space.launched?'…':'—')+'</strong></span><span data-portal-stock-target="alkahest">Alkahests : <strong data-portal-stock="alkahest">'+(space.launched?'…':'—')+'</strong></span></div>';
  function directory() {
    if(myLoading)return '<p class="portal-empty" role="status">Recherche de tes DCG…</p>';
    if(myError)return '<div class="portal-empty" role="status"><p>Impossible de retrouver tes DCG pour le moment.</p><button class="button-outline" type="button" data-portal-my-retry>Réessayer</button></div>';
    if(!accountUser)return '<div class="portal-empty"><p>Connecte-toi avec Twitch pour retrouver les DCG où tu joues.</p><button class="button-outline" type="button" data-portal-login>Connexion Twitch ↗</button></div>';
    if(!mySpaces.length)return '<p class="portal-empty">Tu n’as pas encore rejoint de DCG. Découvre une communauté ci-dessous et rejoins celle qui te plaît.</p>';
    return ordered().map(space => `<a class="portal-space" href="${esc(space.href)}" data-dcg="${esc(space.id)}"><div class="portal-space-avatar"><img src="${esc(space.avatar)}" alt="" referrerpolicy="no-referrer" width="96" height="96"><span class="portal-space-live" data-portal-live="${esc(space.broadcasterId)}" hidden>En live</span></div><div class="portal-space-copy"><span class="portal-space-status">${esc(space.status||'')}</span><h3>${esc(space.name)}</h3><p>Ses cartes, ses moments, sa communauté.</p></div><div class="portal-space-level"${space.xpMarkup?'':' role="status" aria-label="'+esc(space.xpUnavailable?'Niveau momentanément indisponible':'Lecture de ton niveau')+'" aria-busy="'+!space.xpUnavailable+'"'}>${space.xpMarkup||'<span class="portal-space-level-placeholder" aria-hidden="true">'+(space.xpUnavailable?'—':'…')+'</span>'}</div>${stockMarkup(space)}</a>`).join('');
  }
  function discoveryUrl(value) {
    if (typeof value !== 'string' || !/^https:\/\//i.test(value)) return null;
    try {
      const url = new URL(value);
      return url.hostname && !url.username && !url.password ? url.href : null;
    } catch { return null; }
  }
  const discoveryDecks=rows=>rows;
  async function loadDiscovery() {
    if (discovery || discoveryLoading || !window.DEADELUSTV_AUTH) return;
    discoveryLoading = true;
    try {
      const client = await window.DCGPortal.client();
      const {data, error} = await client.rpc('tcg_portal_discovery');
      if (error || !Array.isArray(data)) return;
      discovery = discoveryDecks(data);spaces=discovery;
      const section = currentPage === 'accueil' && root.querySelector('#dcg-decouverte');
      if (section) section.innerHTML = discoveryContents();
    } catch {
      // Le profil de secours reste affiché ; un prochain passage sur l’accueil réessaiera.
    } finally { discoveryLoading = false; }
  }
  function discoveryContents() {
    const decks = discovery || [];
    if(!decks.length)return '<h2>Les DCG</h2><p role="status">'+(discovery===null?'Annuaire momentanément indisponible.':'Aucune communauté disponible pour le moment.')+'</p>';
    const duration = Math.max(40, decks.length * 7);
    const group = (copy = false) => `<ul class="portal-ticker-group"${copy ? ' aria-hidden="true"' : ' aria-label="Découvrir des DCG"'}>
      ${decks.map(space => `<li><a class="portal-streamer-pill" href="${esc(space.href)}" ${copy ? 'tabindex="-1"' : `data-discovery-dcg="${esc(space.id)}"`} aria-label="Entrer dans le DCG ${esc(space.name)}"><img src="${esc(space.avatar)}" alt="" width="42" height="42" loading="lazy" referrerpolicy="no-referrer"><span>${esc(space.name)}</span></a></li>`).join('')}
    </ul>`;
    return `<div class="portal-section-top"><div><span class="overline">LES COMMUNAUTÉS</span><h2 id="dcg-discovery-title">Les DCG</h2></div></div>
      <div class="portal-ticker" style="--ticker-duration:${duration}s">${group()}${group(true)}</div>`;
  }
  const directoryActions=()=>'<div class="portal-directory-actions"><div class="portal-general-xp-bubble" data-general-xp hidden aria-label="Niveau général DCG"></div><button class="button-outline" type="button" data-portal-search-open aria-haspopup="dialog">Rechercher un streamer</button></div>';
  const returnId=new URLSearchParams(location.search).get('dcg_return');
  const home = () => `${/^[0-9a-f-]{36}$/i.test(returnId||'')?'<a class="button-primary" href="'+esc(window.DCGSession.href(returnId))+'">Revenir au DCG →</a>':''}<section class="portal-hero">
    <div>
      <span class="overline">DEADELUS CARD GAME</span>
      <h1><em>Collectionne les Communautés Twitch</em></h1>
      <p>Rejoins les constellations de tes streamers préférés, et collectionne leurs cartes. Découvre des cartes exclusives au fil des événements et des nouvelles collections !</p>
    </div>
    <div class="portal-roles">
      <a class="portal-role-card" href="#tcg/regles">
        <svg class="portal-role-art" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <path d="M5 32s10-16 27-16 27 16 27 16-10 16-27 16S5 32 5 32Z"/>
          <circle cx="32" cy="32" r="10"/><circle cx="32" cy="32" r="4" fill="currentColor" stroke="none"/>
        </svg>
        <span>Je suis Viewers</span>
      </a>
      <a class="portal-role-card" href="${esc(window.DCGSession.href(null,'streamer'))}">
        <svg class="portal-role-art" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <rect x="24" y="7" width="16" height="32" rx="8"/>
          <path d="M17 30a15 15 0 0 0 30 0M32 45v10m-9 0h18M14 15a13 13 0 0 0 0 12m36-12a13 13 0 0 1 0 12"/>
        </svg>
        <span>Je suis Streamer</span>
      </a>
    </div>
  </section>
    ${pass()}<section class="portal-directory" id="dcg-annuaire" aria-labelledby="dcg-directory-title"><div class="portal-section-top"><div><span class="overline">MES COMMUNAUTÉS</span><h2 id="dcg-directory-title">Mes DCG</h2><p>Retrouve les communautés où tu joues.</p></div>${directoryActions()}</div><div class="portal-spaces" data-portal-spaces>${directory()}</div></section>
    <section class="portal-discovery" id="dcg-decouverte" aria-labelledby="dcg-discovery-title">${discoveryContents()}</section>${searchDialog()}`;
  const rules = () => `${heading('BIEN DÉMARRER', 'Les règles du jeu.')}
    <div class="portal-rules-grid">
      <button type="button" class="portal-common portal-rules-card" data-portal-login>
        <svg class="portal-rule-art" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-twitch"/></svg>
        <span class="portal-rules-title">Connection</span>
        <span class="portal-rules-description">Connecte toi avec ton compte Twitch</span>
      </button>
      <a href="#tcg" class="portal-common portal-rules-card" data-portal-search-link>
        <img class="portal-rule-art" src="modules/dcg/assets/rules-avatar.svg" alt="">
        <span class="portal-rules-title">Ton Streameur</span>
        <span class="portal-rules-description">Recherche ton Streameur préféré</span>
      </a>
      <article class="portal-common portal-rules-card">
        <img class="portal-rule-art portal-rule-art-print" src="modules/dcg/assets/rules-card.svg" alt="">
        <span class="portal-rules-title">Ta propre carte</span>
        <span class="portal-rules-description">Pour qu'elle apparaisse dans la collection de ton streameur</span>
      </article>
      <article class="portal-common portal-rules-card">
        <img class="portal-rule-art portal-rule-art-print" src="modules/dcg/assets/rules-booster.svg" alt="">
        <span class="portal-rules-title">Commence à jouer</span>
        <span class="portal-rules-description">Ouvre tes premiers Booster et collectionne les cartes de la communauté</span>
      </article>
      <article class="portal-common portal-rules-card">
        <span class="portal-common-art" aria-hidden="true">∞</span>
        <span class="portal-rules-title">Rejoins d'autres communautés</span>
        <span class="portal-rules-description">Recommence avec tous les Streameurs que tu suis</span>
      </article>
    </div>
    <section class="portal-faq" aria-labelledby="dcg-faq-title">
      <h2 id="dcg-faq-title">FAQ</h2>
      <details>
        <summary>Le pass quotidien</summary>
        <p>Connecte-toi chaque jour sur le site pour valider ta récompense. Clique dessus dans le pass pour la récupérer. Si tu oublies de cliquer, ta connexion du jour suffit à te la réserver.</p>
      </details>
      <details>
        <summary>Comment récupérer des boosters ?</summary>
        <p>Regarde les streamers que tu suis en live. Selon la durée du live, tu peux gagner jusqu’à 5 boosters par jour. Par ta simple présence, tu soutiens ton streamer et tu récupères plus de boosters. C’est gagnant-gagnant !</p>
      </details>
      <details>
        <summary>Les drops</summary>
        <p>Le streamer déclenche les drops. Tu peux ainsi récupérer jusqu’à 3 boosters par live. Si tu es abonné à sa chaîne, chaque drop te rapporte le double, soit jusqu’à 6 boosters par live.</p>
      </details>
      <details>
        <summary>Principe du jeu</summary>
        <p>Ouvre des boosters, puis fusionne tes cartes pour en obtenir de plus rares. Collectionne aussi les versions shiny et collector, ainsi que les cartes exclusives de ton streamer.</p>
        <small>Des événements et des collections communes se préparent…</small>
      </details>
      <details>
        <summary>Bonus et soutien</summary>
        <p>Le soutien payant et ses contreparties ne sont pas encore disponibles. Aucun paiement n’est proposé dans ce parcours.</p>
        <p>J’ai pris la décision de faire ce TCG lié aux communautés Twitch après qu’un de leurs représentants est devenu full payant.</p>
        <p>Cependant, prendre un serveur, une base de données, etc., ça me coûte aussi beaucoup d’argent. Il existe donc deux moyens de me soutenir afin d’être sûre que le DCG puisse durer (car nous avons plein d’idées pour le rendre encore plus attrayant).</p>
        <ul>
          <li>Un abonnement de 1 € via PayPal : Contre cet euro, vous obtenez :
            <ul>
              <li>Mes remerciements pour m’aider à financer cette aventure</li>
              <li>Des bonus de Connexion Pass doublés</li>
              <li>Un contour de PP doré sur le site</li>
              <li>Un design particulier sur le pseudo de votre carte (visible par tous)</li>
              <li>Votre nom sur la page des Remerciements du site (visible par tous)</li>
            </ul>
          </li>
          <li>L’abonnement à ma chaîne : Le fait d’être abonné à la chaîne d’un streameur vous octroie un double drop pendant les lives. Être abonné à <a class="text-link" href="https://www.twitch.tv/deadelustv">MA chaîne Twitch</a> vous donne bien sûr ce même bonus sur les drops de ma chaîne, ainsi que toutes les contreparties de l’abonnement PayPal (le but n’étant pas que ceux qui me soutiennent déjà sur Twitch aient à payer 2 fois. En revanche, si vous le voulez et que vous pouvez me le permettre, le double soutien est possible et sera toujours le bienvenu, mais il n’accordera aucun bonus supplémentaire).</li>
        </ul>
      </details>
    </section>`;
  const profileNav = () => '<nav class="portal-profile-tabs" aria-label="Rubriques du profil"><a href="#tcg/mon-compte"'+(accountSection==='accueil'?' aria-current="page"':'')+'>Accueil</a><a href="#tcg/mon-compte/constellations"'+(accountSection!=='accueil'?' aria-current="page"':'')+'>Mes constellations</a></nav>'+(accountSection==='accueil'?'':'<nav class="portal-profile-views" aria-label="Affichage des constellations"><a href="#tcg/mon-compte/constellations"'+(accountSection==='constellations'?' aria-current="page"':'')+'>Par constellation</a><a href="#tcg/mon-compte/cartes"'+(accountSection==='cartes'?' aria-current="page"':'')+'>Toutes mes cartes</a></nav>');
  function account() {
    const meta=accountUser?.user_metadata||{},name=meta.preferred_username||meta.user_name||meta.display_name||'Collectionneur';
    const intro=accountSection==='accueil'?'<h1 class="bread portal-account-heading">ESPACE PERSONNEL</h1>':heading('ESPACE PERSONNEL','Mon compte.',accountUser?'Bienvenue '+esc(String(name).slice(0,60))+'.':'Ton profil et tes constellations.');
    const navigation=profileNav();
    if(accountLoading)return intro+navigation+'<p class="portal-availability" role="status">Recherche de ta connexion Twitch…</p>';
    if(accountError)return intro+navigation+'<section class="panel portal-message"><h2>Connexion momentanément indisponible</h2><p>Réessaie pour retrouver ton compte Twitch.</p><button class="button-primary" data-portal-account-retry>Réessayer</button></section>';
    if(!accountUser)return intro+navigation+'<section class="panel portal-message"><span class="overline">TON COMPTE TWITCH</span><h2>Retrouve tes collections</h2><p>Connecte-toi pour accéder à tes cartes et à ton profil dans les DCG.</p><button class="button-primary" type="button" data-portal-login>Connexion Twitch ↗</button></section>';
    return intro+navigation+(accountSection==='accueil'?'<section class="portal-profile-xp" aria-label="Niveau général et progression"><div class="portal-profile-xp-medal" data-general-xp hidden></div><div class="portal-profile-xp-details" data-general-xp-details></div></section>':'<section id="dcg-profile-root" aria-label="Mes constellations"></section>');
  }
  const statNumber = new Intl.NumberFormat('fr-FR', {maximumFractionDigits:2});
  function profileStatCards(stats) {
    const fields = ['boosters_opened','alkahests_earned','activity_days','boosters_purchased','booster_hits','legendary_cards'];
    if (!fields.every(key => Number.isSafeInteger(stats?.[key]) && stats[key] >= 0)) throw new Error('Invalid profile statistics');
    const days = Math.max(1,stats.activity_days);
    const dailyAverage = total => 'Moyenne par jour · '+statNumber.format(total/days);
    const card = (title,value,icon,comment='',shines=false) => `<article class="portal-stat-card">
      <span class="portal-stat-art${shines?' portal-stat-art-shine':''}" aria-hidden="true"><img src="modules/dcg/assets/${icon}" alt=""></span>
      <h2>${title}</h2><strong class="portal-stat-value">${statNumber.format(value)}</strong>${comment?`<p>${comment}</p>`:''}
    </article>`;
    return '<div class="portal-stat-grid">'+
      card('Nombre de boosters ouverts',stats.boosters_opened,'rules-booster.svg',dailyAverage(stats.boosters_opened))+
      card('Nombre d’Alkahests récoltés',stats.alkahests_earned,'xp/dcg-alkahest-256.webp',dailyAverage(stats.alkahests_earned))+
      card('Nombre de boosters achetés',stats.boosters_purchased,'rules-booster.svg','Nombre de hits · '+statNumber.format(stats.booster_hits),true)+
      card('Nombre de cartes légendaires',stats.legendary_cards,'rules-card.svg','',true)+'</div>';
  }
  async function loadProfileStats() {
    if (currentPage !== 'mon-compte' || accountSection !== 'accueil' || !accountUser) return;
    const host = root.querySelector('[data-portal-stats]');
    if (!host) return;
    const run = generation, request = ++latestStatsRequest, userId = accountUser.id;
    const current = () => run === generation && request === latestStatsRequest && accountUser?.id === userId && host.isConnected;
    host.setAttribute('aria-busy','true');
    try {
      const client = await window.DCGPortal.client();
      if (!current()) return;
      const {data,error} = await client.rpc('tcg_my_portal_stats');
      if (!current()) return;
      if (error) throw error;
      host.innerHTML = profileStatCards(data)+'<p class="portal-empty">Suivi des crédits et ouvertures depuis le '+esc(new Date(data.stats_since).toLocaleDateString('fr-FR'))+'.</p>';
    } catch {
      if (current()) host.innerHTML = '<p role="status">Tes statistiques sont momentanément indisponibles.</p><button class="button-outline" type="button" data-portal-stats-retry>Réessayer</button>';
    } finally {
      if (current()) host.setAttribute('aria-busy','false');
    }
  }
  const common=()=>'<section data-common-root></section>';
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
    void window.DCGPortal.client().then(client=>{
      if(!host.isConnected||accountUser?.id!==id||xpHost!==host||!window.DCGXPPass)return;
      xpWidget=window.DCGXPPass.mount(host,{client,userId:id,scope:'general',compact:true,detailsHost,rewardPresentation:profile?'popup':'flight',rewardTargets:(receipt,kind)=>profile?[]:stockWidget?.targets(receipt,kind)||[],onConfirmed:()=>{if(profile)void loadProfileStats();else void stockWidget?.refresh();},isCurrent:()=>accountUser?.id===id&&xpHost===host&&(profile?currentPage==='mon-compte'&&accountSection==='accueil':currentPage==='accueil')});
    }).catch(()=>{if(host.isConnected&&xpHost===host)host.textContent='Ta progression est momentanément indisponible.';});
  }
  function syncStocks(client){
    const host=currentPage==='accueil'&&accountUser&&mySpaces.length?root.querySelector('[data-portal-spaces]'):null;
    if(!host){clearStocks();return;}
    if(stockHost===host&&stockUser===accountUser.id){stockWidget?.sync();return;}
    clearStocks();if(!window.DCGPortalStock)return;
    const id=accountUser.id;stockHost=host;stockUser=id;
    stockWidget=window.DCGPortalStock.mount(host,{userId:id,isCurrent:()=>accountUser?.id===id&&currentPage==='accueil'&&stockHost===host,readers:mySpaces.filter(space=>space.launched).map(space=>({spaceId:space.id,broadcasterId:space.broadcasterId,read:()=>client.scoped(space.id,'tcg_my_boosters',{p_offset:0})}))});
  }
  function syncLive(){
    const host=currentPage==='accueil'&&accountUser&&!myLoading&&!myError&&mySpaces.length?root.querySelector('[data-portal-spaces]'):null;
    if(!host||!window.DCGPortalLive){clearLive();return;}
    const id=accountUser.id,key=JSON.stringify(mySpaces.map(space=>space.broadcasterId).sort());
    if(liveHost===host&&liveUser===id&&liveKey===key){liveWidget?.sync();return;}
    clearLive();liveHost=host;liveUser=id;liveKey=key;
    liveWidget=window.DCGPortalLive.mount(host,{userId:id,spaces:mySpaces,read:async space=>(await window.DCGPortal.client()).portal('live',{dcg_id:space.id}),isCurrent:()=>currentPage==='accueil'&&accountUser?.id===id&&liveHost===host&&!myLoading&&!myError});
  }
  function paint(){
    window.DCGCommon?.unmount();
    clearLive();
    clearStocks();
    clearPassGain();
    window.DCGDailyPass?.unmount();
    const profileHome=currentPage==='mon-compte'&&accountSection==='accueil';
    const stats=profileHome&&accountUser?'<section data-portal-stats aria-label="Statistiques du compte" aria-live="polite" aria-busy="true"><p>Chargement de tes statistiques…</p></section>':'';
    const restoreHeadingFocus=profileHome&&document.activeElement===root.querySelector('h1');
    root.innerHTML=nav()+'<div class="dcg-portal-view">'+(renderers[currentPage]||home)()+(profileHome?pass()+stats:'')+'</div>';
    if(currentPage==='collections-communes')window.DCGCommon?.mount(root.querySelector('[data-common-root]'));
    mountGeneralXP();
    const title=root.querySelector('h1');if(title){title.id='tcg-title';title.tabIndex=-1;if(restoreHeadingFocus)title.focus({preventScroll:true});}
    if(currentPage==='mon-compte'&&accountSection!=='accueil'&&accountUser)window.DCGProfile?.mount(root.querySelector('#dcg-profile-root'),{user:accountUser,view:accountSection});
    if(currentPage==='accueil'||currentPage==='mon-compte'&&accountSection==='accueil')window.DCGDailyPass?.mount(root.querySelector('#daily-pass-root'),{view:currentPage==='mon-compte'?'details':'progress'});
    if(stats)void loadProfileStats();
  }
  async function readAccount(run){
    try{
      if(!window.DEADELUSTV_AUTH)throw new Error('Auth unavailable');
      const client=await window.DCGPortal.client();
      const result=await client.auth.getUser();
      if(run!==generation||currentPage!=='mon-compte')return;
      if(result.error)throw result.error;
      accountUser=result.data?.user||null;accountLoading=false;accountError=false;paint();
    }catch{
      if(run!==generation||currentPage!=='mon-compte')return;
      accountUser=null;accountLoading=false;accountError=true;paint();
    }
  }
  function hasSessionHint(){try{return signedInHint||localStorage.getItem(config.authStorageKey)!==null||new URLSearchParams(location.search).has('code');}catch{return signedInHint;}}
  function paintMySpaces(){if(currentPage!=='accueil')return;if(!accountUser||!mySpaces.length)clearStocks();mountGeneralXP();const list=root.querySelector('[data-portal-spaces]');const html=directory();if(list&&directoryStates.get(list)!==html){list.innerHTML=html;directoryStates.set(list,html);}stockWidget?.sync();syncLive();}
  async function readSpaceXP(client,run,userId){
    await Promise.allSettled(mySpaces.map(async space=>{try{
      const r=await client.scoped(space.id,'tcg_my_xp');
      if(run!==generation||accountUser?.id!==userId)return;
      if(r.error||r.data?.broadcaster_id!==space.broadcasterId)throw Error('XP indisponible');
      space.xpMarkup=window.DCGXP.markup(r.data,{scope:'streamer',compact:true,interactive:false,label:'Ton niveau chez '+space.name});
    }catch{space.xpUnavailable=true;}}));
    if(run===generation&&accountUser?.id===userId)paintMySpaces();
  }
  async function readMySpaces(run){
    try{
      const client=await window.DCGPortal.client();
      const result=await client.auth.getUser();if(run!==generation||currentPage!=='accueil')return;
      if(result.error)throw result.error;const user=result.data?.user||null;
      if(accountUser?.id!==user?.id){mySpaces=[];accountUser=user;paintMySpaces();}
      if(!user){myLoading=false;myError=false;paintMySpaces();return;}
      // Lecture de son propre compte uniquement, y compris pour un administrateur.
      // Ne pas appeler ensure_my_viewer : ouvrir le portail ne rejoint aucun DCG.
      const memberships=await client.memberships();
      if(run!==generation||currentPage!=='accueil')return;
      accountUser=user;mySpaces=memberships;
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
    if(currentPage==='accueil')void loadDiscovery();
    if(accountLoading)void readAccount(run);
    if(myLoading)void readMySpaces(run);
  }
  function cancel(){window.DCGCommon?.unmount();clearLive();clearStocks();clearPassGain();window.DCGProfile?.unmount();window.DCGDailyPass?.unmount();xpWidget?.destroy();xpWidget=null;xpHost=null;xpUser=null;closeSearch(false);generation++;currentPage=null;accountUser=null;mySpaces=[];myLoading=false;myError=false;accountLoading=false;accountError=false;root.replaceChildren();}
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
    if(event.target.closest('[data-portal-search-link]') && !event.defaultPrevented &&
       event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey){
      // Le routeur affiche d’abord l’accueil et remonte en haut de la page.
      window.addEventListener('hashchange', () => {
        if(location.hash !== '#tcg') return;
        const button = root.querySelector('[data-portal-search-open]');
        button?.focus({preventScroll:true});
        button?.scrollIntoView({block:'center', behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
      }, {once:true});
    }
    if(event.target.closest('[data-portal-search-close]'))closeSearch();
    if(event.target.closest('[data-portal-search-result]'))closeSearch(false);
    if(event.target.matches('[data-portal-search-dialog]')){const rect=event.target.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeSearch();}
    if(event.target.closest('[data-portal-login]'))void window.DEADELUSTV_AUTH?.signIn();
    if(event.target.closest('[data-portal-account-retry]'))render(accountSection==='accueil'?'mon-compte':'mon-compte/'+accountSection);
    if(event.target.closest('[data-portal-stats-retry]'))void loadProfileStats();
    if(event.target.closest('[data-portal-my-retry]')){myLoading=true;myError=false;paintMySpaces();void readMySpaces(++generation);}
  });
  window.addEventListener('deadelustv:auth-change',event=>{signedInHint=event.detail?.authenticated===true;accountUser=null;mySpaces=[];myError=false;if(currentPage==='mon-compte')render(accountSection==='accueil'?'mon-compte':'mon-compte/'+accountSection);else if(currentPage==='accueil'){const run=++generation;myLoading=signedInHint;paintMySpaces();if(myLoading)void readMySpaces(run);}});
  window.addEventListener('tcg:daily-pass-change',event=>{
    if(event.detail?.gains?.length)void loadProfileStats();
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
  window.addEventListener('focus',()=>{if(currentPage==='accueil'&&hasSessionHint())void readMySpaces(++generation);else void loadProfileStats();});
  window.DEADELUSTV_DCG=Object.freeze({render,cancel});
})();

