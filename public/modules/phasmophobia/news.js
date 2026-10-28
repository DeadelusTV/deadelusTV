'use strict';
/* Lecture du blog Phasmophobia, canal de prévisualisation de la branche de développement.
   Seuls les articles au statut publié apparaissent aux visiteurs. DOM sans innerHTML. */
(() => {
  const root = document.querySelector('#page-phasmophobia [data-phasma-section="news"]');
  if (!root) return;
  const intro = root.querySelector('.phasma-news-intro');
  const feed = document.getElementById('phasma-news-feed');
  const official = root.querySelector('.phasma-news-official');
  if (!intro || !feed || !official) return;

  const MAX_FRONT = 9;
  const ORIGINAL_URL = 'https://www.kineticgames.co.uk/news';
  const SUPABASE_URL='https://eodtxlhnfzyapkyvvxdi.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY='sb_publishable_HwLsESqtQglS7FoSTxBX-Q_GzxyLX_Z';
  // Les essais restent isolés des publications officielles pendant le travail du carnet.
  const STAGE='preview';
  function mediaUrl(value){
    if(typeof value!=='string'||value.length>2048)return null;
    const local=asset(value);
    if(local)return local;
    try{
      const u=new URL(value);
      return u.protocol==='https:'&&!u.username&&!u.password&&!/\.svg$/i.test(u.pathname)?u.href:null;
    }catch{return null;}
  }
  const reader = document.createElement('section');
  reader.className = 'phasma-news-reader';
  reader.hidden = true;
  reader.tabIndex = -1;
  reader.setAttribute('aria-label', 'Lecture des actualités Phasmophobia');
  feed.after(reader);

  let entries = [];
  let loaded = false;
  let track = null;
  let returningToNews = false;

  function el(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  }

  function asset(path) {
    return typeof path === 'string' &&
      /^assets\/phasmo-news\/[a-zA-Z0-9/_-]+\.(?:webp|png|jpg|jpeg)$/.test(path) &&
      !path.includes('..') ? path : null;
  }

  function sourceUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' &&
        ['kineticgames.co.uk', 'www.kineticgames.co.uk'].includes(url.hostname) &&
        (url.pathname === '/news' || url.pathname.startsWith('/news/'))
        ? url.href : null;
    } catch { return null; }
  }

  function cleanItem(raw) {
    if (raw?.payload && typeof raw.payload === 'object') {
      raw={...raw.payload,slug:raw.slug,publishedAt:raw.published_on};
    }
    if (!raw || typeof raw !== 'object' ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw.slug || '') ||
        typeof raw.title !== 'string' || !raw.title.trim() ||
        typeof raw.excerpt !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(raw.publishedAt || '') ||
        !sourceUrl(raw.sourceUrl) ||
        (!Array.isArray(raw.blocks) && !(raw.document?.type==='doc'&&Array.isArray(raw.document.content)))) return null;
    return {
      slug: raw.slug,
      title: raw.title.trim().slice(0, 160),
      excerpt: raw.excerpt.trim().slice(0, 350),
      publishedAt: raw.publishedAt,
      cover: mediaUrl(raw.cover),
      translator: typeof raw.translator === 'string' ? raw.translator.trim().slice(0, 120) : '',
      sourceUrl: sourceUrl(raw.sourceUrl),
      blocks: Array.isArray(raw.blocks)?raw.blocks.slice(0,150):null,
      document:raw.document?.type==='doc'&&Array.isArray(raw.document.content)?raw.document:null
    };
  }

  function niceDate(value) {
    const d = new Date(value + 'T12:00:00Z');
    return isNaN(d.valueOf()) ? value
      : new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
  }

  function officialCard() {
    const link = el('a', 'phasma-news-card phasma-news-card--official');
    link.href = ORIGINAL_URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', 'Toutes les actualités officielles chez Kinetic Games, nouvel onglet');
    const picture = el('span', 'phasma-news-card-picture phasma-news-card-picture--official');
    const logo = el('img', 'phasma-news-card-image');
    logo.src = 'assets/kinetic-games-news.webp';
    logo.alt = 'Logo Kinetic Games';
    logo.loading = 'lazy';
    logo.decoding = 'async';
    picture.append(logo);
    const content = el('span', 'phasma-news-card-content');
    content.append(
      el('span', 'phasma-news-card-kicker', 'SOURCE OFFICIELLE'),
      el('strong', 'phasma-news-card-title', 'Kinetic Games'),
      el('span', 'phasma-news-card-excerpt', 'Toutes les actualités originales sur le site des développeurs'),
      el('span', 'phasma-news-card-more', 'Consulter le blog ↗')
    );
    link.append(picture, content);
    return link;
  }

  function card(item) {
    const link = el('a', 'phasma-news-card');
    link.href = '#phasmophobia/news/' + item.slug;
    const picture = el('span', 'phasma-news-card-picture');
    if (item.cover) {
      const img = el('img', 'phasma-news-card-image');
      img.src = item.cover;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      picture.append(img);
    } else {
      picture.append(el('span', 'phasma-news-card-monogram', 'PHASMO'));
    }
    const content = el('span', 'phasma-news-card-content');
    content.append(
      el('span', 'phasma-news-card-kicker', niceDate(item.publishedAt)),
      el('strong', 'phasma-news-card-title', item.title),
      el('span', 'phasma-news-card-excerpt', item.excerpt),
      el('span', 'phasma-news-card-more', 'Lire la news →')
    );
    link.append(picture, content);
    return link;
  }

  function buttonArrow(label, direction) {
    const btn = el('button', 'phasma-news-arrow', direction < 0 ? '‹' : '›');
    btn.type = 'button';
    btn.setAttribute('aria-label', label);
    btn.addEventListener('click', () => {
      if (!track) return;
      const first = track.querySelector('.phasma-news-card');
      const gap = parseFloat(getComputedStyle(track).gap) || 0;
      const distance = first ? (first.getBoundingClientRect().width + gap) * 2 : track.clientWidth;
      track.scrollBy({ left: direction * distance,
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
    return btn;
  }

  function gallery() {
    feed.replaceChildren();
    const heading = el('div', 'phasma-news-head');
    const labels = el('div');
    labels.append(el('span', 'eyebrow', 'ACTUALITÉS TRADUITES'),
      el('h3', '', 'Les dernières nouvelles'));
    heading.append(labels);
    if (entries.length > MAX_FRONT) {
      const archives = el('a', 'phasma-news-archives-link', 'Voir les archives →');
      archives.href = '#phasmophobia/news';
      heading.append(archives);
    }
    track = el('div', 'phasma-news-track');
    track.setAttribute('aria-label', 'Carrousel des dernières actualités traduites');
    track.tabIndex = 0;
    entries.slice(0, MAX_FRONT).forEach(item => track.append(card(item)));
    track.append(officialCard());
    const controls = el('div', 'phasma-news-controls');
    const prev = buttonArrow('Voir les actualités précédentes', -1);
    const next = buttonArrow('Voir les actualités suivantes', 1);
    const sync = () => {
      if (!root.open || feed.hidden) return;
      const max = Math.max(0, track.scrollWidth - track.clientWidth);
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max - 2;
      controls.hidden = max <= 2;
    };
    track.addEventListener('scroll', sync, { passive: true });
    root.addEventListener('toggle', () => { if (root.open) requestAnimationFrame(sync); });
    window.addEventListener('resize', sync);
    controls.append(prev, next);
    feed.append(heading, track, controls);
    requestAnimationFrame(sync);
  }

  function backLink(text) {
    const back = el('a', 'phasma-news-back', text);
    back.href = '#phasmophobia';
    back.addEventListener('click', event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      returningToNews = true;
    });
    return back;
  }

  function showArchive() {
    reader.replaceChildren();
    reader.append(backLink('← Retour aux actualités'));
    reader.append(el('span', 'eyebrow', 'LE CARNET DES PUBLICATIONS'));
    reader.append(el('h3', 'phasma-news-reader-title', 'Archives'));
    const older = entries.slice(MAX_FRONT);
    if (!older.length) {
      reader.append(el('p', 'phasma-news-empty', 'Les anciennes publications apparaîtront ici.'));
    } else {
      const grid = el('div', 'phasma-news-archive-grid');
      older.forEach(item => grid.append(card(item)));
      reader.append(grid);
    }
  }

  function addBlock(container, block) {
    if (!block || typeof block !== 'object') return;
    if (block.type === 'paragraph' && typeof block.text === 'string') {
      container.append(el('p', 'phasma-news-article-paragraph', block.text.slice(0, 15000)));
    } else if (block.type === 'heading' && typeof block.text === 'string') {
      container.append(el('h4', 'phasma-news-article-heading', block.text.slice(0, 250)));
    } else if (block.type === 'list' && Array.isArray(block.items)) {
      const list = el('ul', 'phasma-news-article-list');
      block.items.slice(0, 100).forEach(text => {
        if (typeof text === 'string') list.append(el('li', '', text.slice(0, 2500)));
      });
      container.append(list);
    } else if (block.type === 'image' && asset(block.src)) {
      const figure = el('figure', 'phasma-news-article-figure');
      const img = el('img');
      img.src = asset(block.src);
      img.alt = typeof block.alt === 'string' ? block.alt.slice(0, 200) : '';
      img.loading = 'lazy';
      figure.append(img);
      if (typeof block.caption === 'string' && block.caption.trim())
        figure.append(el('figcaption', '', block.caption.slice(0, 300)));
      container.append(figure);
    }
  }

  function renderRichArticle(container,doc){
    // Toutes les valeurs viennent de JSON. Aucune chaîne n'est interprétée en HTML.
    // Limites de profondeur et de nœuds aussi côté lecteur.
    let count=0;
    function walk(raw,depth){
      if(!raw||typeof raw!=='object'||depth>15||++count>1800)return null;
      if(raw.type==='text'){
        let result=document.createTextNode(String(raw.text||'').slice(0,20000));
        for(const mark of (Array.isArray(raw.marks)?raw.marks:[]).slice(0,12)){
          const tag={bold:'strong',italic:'em',underline:'u',strike:'s',code:'code',link:'a'}[mark?.type];
          if(!tag)continue;
          const wrapper=document.createElement(tag);
          if(tag==='a'){
            const href=mediaUrl(mark.attrs?.href);
            if(!href)continue;
            wrapper.href=href;wrapper.target='_blank';wrapper.rel='noopener noreferrer';
          }
          wrapper.append(result);result=wrapper;
        }
        return result;
      }
      if(raw.type==='hardBreak')return document.createElement('br');
      if(raw.type==='youtube'){
        const id=String(raw.attrs?.videoId||'');
        if(!/^[A-Za-z0-9_-]{11}$/.test(id))return null;
        const panel=el('div','phasma-youtube-card phasma-youtube-card--with-thumb');
        // L'image YouTube est visible avant le clic, mais pas le lecteur tiers.
        const thumbnail=el('img','phasma-youtube-thumbnail');
        thumbnail.dataset.youtubeThumbnail='https://i.ytimg.com/vi/'+id+'/hqdefault.jpg';
        // Le consentement existant du site officiel gouverne aussi la miniature.
        thumbnail.hidden=window.DEADELUSTV_CONSENT?.hasConsent('youtube')!==true;
        if(!thumbnail.hidden)thumbnail.src=thumbnail.dataset.youtubeThumbnail;
        thumbnail.alt='';
        thumbnail.loading='lazy';
        thumbnail.decoding='async';
        thumbnail.referrerPolicy='no-referrer';
        thumbnail.addEventListener('error',()=>{
          thumbnail.remove();
          panel.classList.remove('phasma-youtube-card--with-thumb');
        },{once:true});
        panel.append(thumbnail);
        const button=el('button','phasma-youtube-play');
        button.type='button';
        button.setAttribute('aria-label','Charger la vidéo YouTube intégrée');
        button.addEventListener('click',()=>{
          // Ne créer aucun lecteur si l'accord YouTube n'est pas actif.
          if(!window.DEADELUSTV_CONSENT?.hasConsent('youtube')){
            window.DEADELUSTV_CONSENT?.open();
            return;
          }
          // Ce gestionnaire retire le lecteur si l'accord est révoqué.
          window.DEADELUSTV_EMBEDS?.mountYouTube(panel,id,'Vidéo YouTube');
        });
        panel.append(button);
        return panel;
      }
      if(raw.type==='image'){
        const src=mediaUrl(raw.attrs?.src);
        if(!src)return null;
        const figure=el('figure','phasma-news-article-figure');
        const img=el('img');
        img.src=src;img.alt=String(raw.attrs?.alt||'').slice(0,180);
        img.loading='lazy';img.decoding='async';
        figure.append(img);return figure;
      }
      const tag={doc:'div',paragraph:'p',heading:raw.attrs?.level===3?'h4':'h3',
        bulletList:'ul',orderedList:'ol',listItem:'li',blockquote:'blockquote'}[raw.type];
      if(!tag)return null;
      const classes={paragraph:'phasma-news-article-paragraph',heading:'phasma-news-article-heading',
        bulletList:'phasma-news-article-list',orderedList:'phasma-news-article-list',
        blockquote:'phasma-news-article-quote'};
      const node=el(tag,classes[raw.type]||'');
      if(['paragraph','heading'].includes(raw.type)&&['left','center','right'].includes(raw.attrs?.textAlign))
        node.style.textAlign=raw.attrs.textAlign;
      if(Array.isArray(raw.content)){
        for(const item of raw.content.slice(0,200)){
          const child=walk(item,depth+1);
          if(child)node.append(child);
        }
      }
      return node;
    }
    const node=walk(doc,0);
    if(node)container.append(node);
  }
  function showArticle(slug) {
    reader.replaceChildren();
    reader.append(backLink('← Retour aux actualités'));
    const item = entries.find(item => item.slug === slug);
    if (!item) {
      reader.append(el('h3', 'phasma-news-reader-title', 'Article introuvable'));
      reader.append(el('p', 'phasma-news-empty', 'Cette traduction est indisponible ou n’a pas encore été publiée.'));
      return;
    }
    reader.append(el('span', 'eyebrow', 'ACTUALITÉ PHASMOPHOBIA'),
      el('h3', 'phasma-news-reader-title', item.title),
      el('p', 'phasma-news-article-date', 'Publié le ' + niceDate(item.publishedAt)));
    if (item.cover) {
      const cover = el('img', 'phasma-news-article-cover');
      cover.src = item.cover;
      cover.alt = '';
      reader.append(cover);
    }
    const article = el('article', 'phasma-news-article');
    if(item.document)renderRichArticle(article,item.document);
    else item.blocks.forEach(block => addBlock(article, block));
    reader.append(article);
    const credits = el('div', 'phasma-news-credits');
    if (item.translator) credits.append(el('p', '', 'Traduction française : ' + item.translator));
    const source = el('a', '', 'Lire l’article original chez Kinetic Games ↗');
    source.href = item.sourceUrl;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    credits.append(source);
    reader.append(credits);
    const bottomBack = backLink('← Retour aux news');
    bottomBack.classList.add('btn', 'btn-outline', 'phasma-news-back--bottom');
    reader.append(bottomBack);
  }

  function route() {
    let route;
    try { route = decodeURIComponent(location.hash.slice(1)); }
    catch { route = location.hash.slice(1); }
    const isNews = route === 'phasmophobia/news' || route.startsWith('phasmophobia/news/');
    if (!isNews) {
      reader.hidden = true;
      feed.hidden = entries.length === 0;
      intro.hidden = entries.length > 0;
      if (returningToNews && route === 'phasmophobia') {
        returningToNews = false;
        requestAnimationFrame(() => {
          if (!root.open || !reader.hidden || document.getElementById('page-phasmophobia').hidden) return;
          root.querySelector('summary').focus({ preventScroll: true });
          root.scrollIntoView({ block: 'start', behavior: 'auto' });
        });
      }
      return;
    }
    returningToNews = false;
    root.open = true;
    intro.hidden = true;
    feed.hidden = true;
    reader.hidden = false;
    if (!loaded) {
      reader.replaceChildren(el('p', 'phasma-news-empty', 'Chargement des actualités…'));
      return;
    }
    if (route === 'phasmophobia/news') showArchive();
    else showArticle(route.slice('phasmophobia/news/'.length));
    // Sur un lien partagé, afficher directement l'article, après le routeur principal.
    requestAnimationFrame(() => {
      if (!root.open || reader.hidden || document.getElementById('page-phasmophobia').hidden) return;
      reader.focus({ preventScroll: true });
      reader.scrollIntoView({ block: 'start', behavior: 'auto' });
    });
  }

  window.addEventListener('hashchange', route);
  root.addEventListener('toggle', () => {
    if (root.open || reader.hidden) return;
    // Fermer le panneau quitte aussi l'article, sans ajouter une étape à l'historique.
    history.replaceState(history.state, '', '#phasmophobia');
    returningToNews = false;
    route();
  });
  window.addEventListener('deadelustv:consent-change',()=>{
    const allowed=window.DEADELUSTV_CONSENT?.hasConsent('youtube')===true;
    for(const image of document.querySelectorAll('#page-phasmophobia .phasma-youtube-thumbnail')){
      image.hidden=!allowed;
      if(allowed && !image.getAttribute('src'))image.src=image.dataset.youtubeThumbnail;
      if(!allowed)image.removeAttribute('src');
    }
  });
  const live=new URL(SUPABASE_URL+'/rest/v1/phasmo_news_articles');
  live.searchParams.set('select','slug,payload,published_on');
  live.searchParams.set('stage','eq.'+STAGE);
  live.searchParams.set('status','eq.published');
  live.searchParams.set('order','published_on.desc');
  live.searchParams.set('limit','100');
  const remote=fetch(live,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY,'Accept':'application/json'},cache:'no-store'})
    .then(async response=>{
      if(!response.ok)throw new Error('Lecture des publications indisponible');
      const data=await response.json();
      if(!Array.isArray(data))throw new Error('Format publication incorrect');
      return data.map(cleanItem).filter(Boolean);
    });
  const local=fetch('data/phasmo-news.json',{cache:'no-store'})
    .then(async response=>{
      if(!response.ok)throw new Error('Archives statiques indisponibles');
      const data=await response.json();
      return data?.schemaVersion===1&&Array.isArray(data.articles)
        ?data.articles.map(cleanItem).filter(Boolean):[];
    });
  Promise.allSettled([remote,local]).then(results=>{
    const seen=new Set();
    // Les nouvelles publications Supabase prévalent sur les archives statiques.
    entries=results.flatMap(result=>result.status==='fulfilled'?result.value:[])
      .filter(item=>{
        if(seen.has(item.slug))return false;
        seen.add(item.slug);return true;
      }).sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt));
    loaded=true;
    if(entries.length)gallery();
    route();
    if(results[0].status==='rejected')console.warn('Actualités Phasmo : publication distante indisponible.');
  });
  route();
})();
