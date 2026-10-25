'use strict';
/* Galerie Shorts : aucune vidéo n'est inventée ; seuls les emplacements défilent. */
(() => {
  const track = document.querySelector('#page-phasmophobia .phasma-shorts-track');
  const prev = document.querySelector('[data-phasma-shorts-prev]');
  const next = document.querySelector('[data-phasma-shorts-next]');
  if (!track || !prev || !next) return;

  function syncButtons() {
    const end = track.scrollWidth - track.clientWidth;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= end - 2;
  }

  function move(direction) {
    const card = track.querySelector('.phasma-short-card');
    if (!card) return;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollBy({
      left: direction * (card.getBoundingClientRect().width + gap) * 2,
      behavior: reducedMotion ? 'auto' : 'smooth'
    });
  }

  prev.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  track.addEventListener('scroll', syncButtons, { passive: true });
  window.addEventListener('resize', syncButtons);
  syncButtons();
})();
