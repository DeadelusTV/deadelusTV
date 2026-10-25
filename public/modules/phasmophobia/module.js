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
    track.replaceChildren(fragment);
    status.textContent = track.childElementCount
      ? ''
      : 'Les miniatures apparaîtront après la première synchronisation YouTube.';
    status.hidden = track.childElementCount > 0;
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
      track.hidden = true;
      status.hidden = false;
      status.textContent = 'Impossible de charger les Shorts. La playlist reste accessible avec le bouton YouTube.';
      syncButtons();
    });
})();
