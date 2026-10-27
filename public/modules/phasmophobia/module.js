'use strict';
/* Galerie Phasmophobia : aucune clé API côté navigateur. Données JSON produites
   par un workflow GitHub. Le visiteur ne contacte jamais l'API Google. */
(() => {
  const track = document.querySelector('#page-phasmophobia .phasma-shorts-track');
  const status = document.getElementById('phasma-shorts-status');
  const prev = document.querySelector('[data-phasma-shorts-prev]');
  const next = document.querySelector('[data-phasma-shorts-next]');
  if (!track || !status || !prev || !next) return;

  function syncButtons() {
    const end = Math.max(0, track.scrollWidth - track.clientWidth);
    const noOverflow = end < 2;
    prev.disabled = noOverflow || track.scrollLeft <= 2;
    next.disabled = noOverflow || track.scrollLeft >= end - 2;
    prev.hidden = noOverflow;
    next.hidden = noOverflow;
  }

  function step(direction) {
    const card = track.querySelector('.phasma-short-card');
    if (!card) return;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    track.scrollBy({
      left: direction * (card.getBoundingClientRect().width + gap) * 2,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }

  function validVideo(video) {
    if (!video || !/^[A-Za-z0-9_-]{11}$/.test(video.id) ||
        typeof video.title !== 'string' || !video.title.trim()) return false;
    try {
      const url = new URL(video.thumbnail);
      return url.protocol === 'https:' &&
        (url.hostname === 'i.ytimg.com' || url.hostname.endsWith('.ytimg.com'));
    } catch {
      return false;
    }
  }

  // La playlist peut contenir des centaines de Shorts : limiter la galerie.
  // L'ordre affiché reste celui choisi dans la playlist YouTube.
  const MAX_VISIBLE_SHORTS = 10;

  // Carte permanente indépendante de la synchronisation YouTube.
  function createPlaylistCard() {
    const playlistLink = document.querySelector('#page-phasmophobia [data-link="phasmoShortsPlaylist"]');
    if (!playlistLink) return null;

    const link = document.createElement('a');
    link.className = 'phasma-short-card phasma-short-link phasma-short-playlist';
    link.setAttribute('role', 'listitem');
    link.setAttribute('aria-label', 'Voir la playlist complète des Shorts Phasmophobia sur YouTube');
    link.href = playlistLink.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    const visual = document.createElement('span');
    visual.className = 'phasma-short-placeholder';

    const body = document.createElement('span');
    body.className = 'phasma-short-playlist-content';

    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('class', 'icon phasma-short-playlist-icon');
    icon.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-youtube');
    icon.appendChild(use);

    const label = document.createElement('span');
    label.className = 'phasma-short-playlist-label';
    label.textContent = 'LA PLAYLIST';

    const title = document.createElement('span');
    title.className = 'phasma-short-playlist-title';
    title.textContent = 'Tous les Shorts';

    const arrow = document.createElement('span');
    arrow.className = 'phasma-short-playlist-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';

    body.append(icon, label, title, arrow);
    visual.appendChild(body);

    const caption = document.createElement('span');
    caption.className = 'phasma-short-caption';
    caption.textContent = 'Voir la playlist complète sur YouTube';
    link.append(visual, caption);
    return link;
  }

  function render(videos) {
    const fragment = document.createDocumentFragment();
    let displayed = 0;
    for (const video of videos) {
      if (displayed >= MAX_VISIBLE_SHORTS) break;
      if (!validVideo(video)) continue;
      displayed += 1;
      const a = document.createElement('a');
      a.className = 'phasma-short-card phasma-short-link';
      a.setAttribute('role', 'listitem');
      a.href = 'https://www.youtube.com/shorts/' + video.id;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.setAttribute('aria-label', 'Voir le Short « ' + video.title + ' » sur YouTube');

      const imageWrap = document.createElement('span');
      imageWrap.className = 'phasma-short-placeholder';
      const image = document.createElement('img');
      image.className = 'phasma-short-thumb';
      image.src = video.thumbnail;
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      imageWrap.appendChild(image);

      const play = document.createElement('span');
      play.className = 'phasma-short-mark';
      play.setAttribute('aria-hidden', 'true');
      play.textContent = '▶';
      imageWrap.appendChild(play);

      const title = document.createElement('span');
      title.className = 'phasma-short-caption';
      title.textContent = video.title;
      a.append(imageWrap, title);
      fragment.appendChild(a);
    }
    // Après dix vidéos au maximum : la carte de playlist reste toujours en dernier.
    const playlistCard = createPlaylistCard();
    if (playlistCard) fragment.appendChild(playlistCard);
    track.replaceChildren(fragment);
    status.textContent = displayed
      ? ''
      : 'Les miniatures apparaîtront après la première synchronisation YouTube.';
    status.hidden = displayed > 0;
    track.hidden = track.childElementCount === 0;
    syncButtons();
  }

  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  track.addEventListener('scroll', syncButtons, { passive: true });
  // En ouvrant les tutos, recalculer les flèches du carrousel.
  const tutorialsPanel = track.closest('details');
  if (tutorialsPanel) {
    tutorialsPanel.addEventListener('toggle', () => {
      if (tutorialsPanel.open) requestAnimationFrame(syncButtons);
    });
  }
  window.addEventListener('resize', syncButtons);
  // Le routeur SPA affiche Phasmophobia après l'initialisation de ce module.
  window.addEventListener('hashchange', () => requestAnimationFrame(syncButtons));
  requestAnimationFrame(syncButtons);
  syncButtons();

  fetch('data/phasmo-shorts.json', { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error('JSON indisponible');
      return response.json();
    })
    .then(data => {
      if (!data || data.schemaVersion !== 1 || !Array.isArray(data.videos)) {
        throw new Error('Format JSON inattendu');
      }
      render(data.videos);
    })
    .catch(() => {
      // Sur erreur YouTube, garder le lien permanent vers la playlist.
      render([]);
      status.hidden = false;
      status.textContent = 'Impossible de charger les Shorts. La playlist reste accessible sur YouTube.';
    });
})();
