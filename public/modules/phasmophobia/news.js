'use strict';
/* Blog Phasmophobia, lecture seule. La rédaction et les permissions ne sont PAS
   implémentées ici. Aucune actualité n'est copiée automatiquement de Kinetic. */
(() => {
  const root = document.querySelector('#page-phasmophobia [data-phasma-section="news"]');
  if (!root) return;
  const intro = root.querySelector('.phasma-news-intro');
  const feed = document.getElementById('phasma-news-feed');
  const official = root.querySelector('.phasma-news-official');
  if (!intro || !feed || !official) return;

  const MAX_FRONT = 9;
  const ORIGINAL_URL = 'https://www.kineticgames.co.uk/news';
  const reader = document.createElement('section');
  reader.className = 'phasma-news-reader';
  reader.hidden = true;
  reader.tabIndex = -1;
  reader.setAttribute('aria-label', 'Lecture des actualités Phasmophobia');
  feed.after(reader);

  let entries = [];
  let loaded = false;
  let track = null;

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
    if (!raw || typeof raw !== 'object' ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw.slug || '') ||
        typeof raw.title !== 'string' || !raw.title.trim() ||
        typeof raw.excerpt !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(raw.publishedAt || '') ||
        !sourceUrl(raw.sourceUrl) || !Array.isArray(raw.blocks)) return null;
    return {
      slug: raw.slug,
      title: raw.title.trim().slice(0, 160),
      excerpt: raw.excerpt.trim().slice(0, 350),
      publishedAt: raw.publishedAt,
      cover: asset(raw.cover),
      translator: typeof raw.translator === 'string' ? raw.translator.trim().slice(0, 120) : '',
      sourceUrl: sourceUrl(raw.sourceUrl),
      blocks: raw.blocks.slice(0, 150),
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
    picture.append(el('span', 'phasma-news-card-monogram', 'KG'));
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
      el('span', 'phasma-news-card-more', 'Lire la traduction →')
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
    item.blocks.forEach(block => addBlock(article, block));
    reader.append(article);
    const credits = el('div', 'phasma-news-credits');
    if (item.translator) credits.append(el('p', '', 'Traduction française : ' + item.translator));
    const source = el('a', '', 'Lire l’article original chez Kinetic Games ↗');
    source.href = item.sourceUrl;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    credits.append(source);
    reader.append(credits);
  }

  function route() {
    let route;
    try { route = decodeURIComponent(location.hash.slice(1)); }
    catch { route = location.hash.slice(1); }
    const isNews = route === 'phasmophobia/news' || route.startsWith('phasmophobia/news/');
    if (!loaded && !isNews) return;
    if (!isNews) {
      reader.hidden = true;
      feed.hidden = entries.length === 0;
      intro.hidden = entries.length > 0;
      return;
    }
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
      if (reader.hidden || document.getElementById('page-phasmophobia').hidden) return;
      reader.focus({ preventScroll: true });
      reader.scrollIntoView({ block: 'start', behavior: 'auto' });
    });
  }

  window.addEventListener('hashchange', route);
  fetch('data/phasmo-news.json', { cache: 'no-store' })
    .then(res => { if (!res.ok) throw new Error('Fichier News absent'); return res.json(); })
    .then(data => {
      if (!data || data.schemaVersion !== 1 || !Array.isArray(data.articles))
        throw new Error('Format des News invalide');
      const seen = new Set();
      entries = data.articles.map(cleanItem).filter(item => {
        if (!item || seen.has(item.slug)) return false;
        seen.add(item.slug);
        return true;
      }).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
      loaded = true;
      if (entries.length) gallery();
      route();
    })
    .catch(() => {
      loaded = true;
      entries = [];
      route();
      // L'affichage d'attente reste accessible en cas d'erreur réseau.
    });
  route();
})();
