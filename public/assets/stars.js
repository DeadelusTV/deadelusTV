/* DeadelusTV — fond étoilé, essai autonome. Retirer le script pour désactiver. */
(() => {
  'use strict';

  function initStars() {
    if (document.getElementById('deadelustv-stars')) return;
    const style = document.createElement('style');
    style.id = 'deadelustv-stars-style';
    style.textContent = `
      body.deadelustv-stars-on { isolation: isolate; }
      #deadelustv-stars {
        position: fixed; inset: 0; z-index: -1;
        overflow: hidden; pointer-events: none; user-select: none;
      }
      #deadelustv-stars > span {
        position: absolute; display: block; border-radius: 50%;
        background: var(--star-color); opacity: var(--star-dim);
        box-shadow: 0 0 5px var(--star-color);
      }
      @media print { #deadelustv-stars { display: none; } }
    `;
    document.head.append(style);

    const layer = document.createElement('div');
    layer.id = 'deadelustv-stars';
    layer.setAttribute('aria-hidden', 'true');
    document.body.prepend(layer);
    document.body.classList.add('deadelustv-stars-on');

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const random = (min, max) => min + Math.random() * (max - min);
    const active = new Map();
    let stars = [];
    let pulseTimer;
    let resizeTimer;

    function stop() {
      clearTimeout(pulseTimer);
      active.forEach(animation => animation.cancel());
      active.clear();
    }

    function pulse() {
      if (document.hidden || reducedMotion.matches) return;
      const available = stars.filter(star => !active.has(star));
      const star = available[Math.floor(Math.random() * available.length)];
      if (star && typeof star.animate === 'function') {
        const dim = Number(star.dataset.dim);
        const peak = random(0.38, 0.72);
        const animation = star.animate([
          { opacity: dim, transform: 'scale(1)', offset: 0 },
          { opacity: peak, transform: 'scale(1.35)', offset: random(0.35, 0.6) },
          { opacity: dim, transform: 'scale(1)', offset: 1 }
        ], { duration: random(3500, 7000), easing: 'ease-in-out' });
        active.set(star, animation);
        animation.onfinish = () => active.delete(star);
      }
      pulseTimer = setTimeout(pulse, random(650, 1700));
    }

    function resume() {
      stop();
      if (!document.hidden && !reducedMotion.matches) {
        pulseTimer = setTimeout(pulse, random(300, 1100));
      }
    }

    function populate() {
      const count = Math.max(16, Math.min(85,
        Math.round(window.innerWidth * window.innerHeight / 22000)));
      if (stars.length === count) return;
      stop();
      const fragment = document.createDocumentFragment();
      stars = [];
      // Une étoile par cellule légèrement décalée : aléatoire, mais sans amas.
      const columns = Math.ceil(Math.sqrt(count * window.innerWidth / window.innerHeight));
      const rows = Math.ceil(count / columns);
      for (let i = 0; i < count; i++) {
        const star = document.createElement('span');
        const size = random(1, 2.1);
        const dim = random(0.09, 0.25);
        star.dataset.dim = String(dim);
        star.style.left = `${((i % columns) + random(0.12, 0.88)) / columns * 100}%`;
        star.style.top = `${(Math.floor(i / columns) + random(0.12, 0.88)) / rows * 100}%`;
        star.style.width = star.style.height = `${size}px`;
        star.style.setProperty('--star-dim', dim);
        star.style.setProperty('--star-color', Math.random() < 0.38 ? '#ddba79' : '#f0e8d9');
        stars.push(star);
        fragment.append(star);
      }
      layer.replaceChildren(fragment);
      resume();
    }

    populate();
    document.addEventListener('visibilitychange', resume);
    reducedMotion.addEventListener('change', resume);
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(populate, 220);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStars, { once: true });
  } else {
    initStars();
  }
})();
