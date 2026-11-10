/* Galactique — variante B validée le 06/11/2026.
 * Les motifs et masques reprennent le prototype fourni par Yekelle.
 * La clé de finition reste "ultimate" ; aucun état de jeu n'est modifié.
 */
(() => {
  'use strict';
  if (window.TCGGalactic) return;
  const TAU = Math.PI * 2;
  function random(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  let sprites;
  function makeGalaxy(seed, cyan) {
    const c = document.createElement('canvas'); c.width = c.height = 320;
    const g = c.getContext('2d'), im = g.createImageData(320, 320), rng = random(seed);
    for (let y = 0; y < 320; y++) for (let x = 0; x < 320; x++) {
      const X = (x - 160) / 145, Y = (y - 160) / 105;
      const r = Math.hypot(X, Y), theta = Math.atan2(Y, X);
      const phase = 2 * theta - 4.65 * Math.log(r + .075);
      const arm = Math.exp((Math.cos(phase) - 1) * 5.2);
      const diffuse = Math.exp((Math.cos(phase - .12) - 1) * 1.5);
      const envelope = Math.exp(-r * 1.5) * Math.exp(-Math.pow(r / .96, 7));
      const edge = 1 - Math.exp(-r * 12), core = Math.exp(-r * r * 135);
      const grain = .63 + rng() * .52 + Math.sin(X * 31 + Math.sin(Y * 24)) * .1;
      const branches = Math.exp((Math.cos(phase * 2 + .75) - 1) * 5) * .22;
      const brightness = ((arm * 1.32 + diffuse * .68 + branches * 1.5) * edge * envelope * grain + core * 1.9);
      const cloudy = .72 + .16 * Math.sin(X * 17 + Math.sin(Y * 13) * 2) + .12 * Math.sin(X * 37 - Y * 28);
      const haze = .21 * Math.exp(-r * r * 3.8) * cloudy + .18 * Math.exp(-r * r * 24);
      const cold = .5 + .5 * Math.sin(theta + r * 2 + cyan);
      const white = Math.min(1, core * 2.5 + arm * .12);
      const i = (y * 320 + x) * 4;
      im.data[i] = 146 + 78 * (1 - cold) + white * 80;
      im.data[i + 1] = 105 + cold * 103 + white * 145;
      im.data[i + 2] = 255;
      im.data[i + 3] = Math.min(255, (brightness * .86 + haze) * 255);
    }
    g.putImageData(im, 0, 0);
    // Résolution stellaire dans les bras : une matière, pas des contours tracés.
    for (let i = 0; i < 1700; i++) {
      const r = .1 + Math.pow(rng(), .72) * .86, arm = i % 2;
      const theta = 2.325 * Math.log(r + .075) + arm * Math.PI + (rng() - .5) * .24;
      const px = 160 + Math.cos(theta) * r * 145 + (rng() - .5) * 3;
      const py = 160 + Math.sin(theta) * r * 105 + (rng() - .5) * 3;
      const a = (.10 + rng() * .5) * (1 - Math.pow(r, 3));
      g.fillStyle = i % 4 ? `rgba(224,230,255,${a})` : `rgba(109,222,255,${a})`;
      g.beginPath(); g.arc(px, py, .25 + rng() * .7, 0, TAU); g.fill();
    }
    return c;
  }
  function rectWithin(el, ancestor) {
    if (!el) return null;
    let x = 0, y = 0, n = el;
    while (n && n !== ancestor) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  }

  const instances = new WeakMap();
  const members = new Set();
  const active = new Set();
  const motion = typeof matchMedia === 'function'
    ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const frameInterval = 1000 / 30;
  let frameId = 0, lastFrame = 0, intersection = null, listening = false;

  // Une seule boucle pour les cartes visibles ; les textures sont partagées.
  function schedule() {
    if (!frameId && active.size && typeof requestAnimationFrame === 'function') {
      frameId = requestAnimationFrame(tick);
    }
  }
  function stopIfIdle() {
    if (active.size) return;
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    lastFrame = 0;
  }
  function tick(stamp) {
    frameId = 0;
    if (stamp - lastFrame >= frameInterval - .5) {
      lastFrame = stamp;
      for (const state of active) {
        if (!state.host.isConnected) state.api.destroy();
        else state.draw(stamp);
      }
    }
    if (active.size) schedule();
    else lastFrame = 0;
  }
  function synchronizeAll() {
    for (const state of members) state.sync();
  }
  function listen() {
    if (listening) return;
    listening = true;
    document.addEventListener('visibilitychange', synchronizeAll);
    if (motion.addEventListener) motion.addEventListener('change', synchronizeAll);
    else motion.addListener?.(synchronizeAll);
    if (typeof IntersectionObserver === 'function') {
      intersection = new IntersectionObserver(entries => {
        for (const item of entries) {
          const state = instances.get(item.target);
          if (!state) continue;
          state.visible = item.isIntersecting && item.intersectionRect.width > 0 && item.intersectionRect.height > 0;
          state.sync();
        }
      });
    }
  }
  function releaseIfEmpty() {
    if (members.size || !listening) return;
    stopIfIdle();
    intersection?.disconnect();
    intersection = null;
    document.removeEventListener('visibilitychange', synchronizeAll);
    if (motion.removeEventListener) motion.removeEventListener('change', synchronizeAll);
    else motion.removeListener?.(synchronizeAll);
    listening = false;
  }

  const rng = random(70025);
  const particles = Array.from({ length: 160 }, (_, i) => ({
    lane: i % 2, u: rng(), offset: (rng() - .5) * 28, phase: rng() * TAU,
    radius: .22 + Math.pow(rng(), 3) * 1.08, speed: .5 + rng(), tint: i % 3,
  }));
  const protectedSelector = '.card-head,.card-role,.desc,.collection-plaque,.stars-bar,.stat-strip,.first-badge';

  function attach(host) {
    const existing = host && instances.get(host);
    if (existing) return existing.api;
    const root = host?.shadowRoot;
    const card = root?.querySelector('.trading-card.ultimate');
    if (!card || !host.isConnected) return null;

    const background = document.createElement('div');
    background.className = 'galactic-spiral';
    background.setAttribute('aria-hidden', 'true');
    const texture = document.createElement('div');
    texture.className = 'galactic-spiral-texture';
    background.append(texture);
    const canvas = document.createElement('canvas');
    canvas.className = 'galactic-surface';
    canvas.setAttribute('aria-hidden', 'true');
    let ctx = null;
    try { ctx = canvas.getContext('2d'); } catch (_) { /* Le fond reste visible sans Canvas. */ }
    if (ctx && !sprites) {
      try { sprites = [makeGalaxy(857, .1), makeGalaxy(429, 1.7)]; }
      catch (_) { ctx = null; }
    }
    card.append(background, canvas);
    card.classList.add('galactic-finish');

    let width = 359, height = 614, art, texts = [], galaxies = [], flares = [];
    let time = 0, lastTick = 0, disposed = false, manuallyPaused = false, queued = false;
    const watched = new Set();
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(queueRefresh) : null;
    const mutation = typeof MutationObserver === 'function' ? new MutationObserver(queueRefresh) : null;
    const state = {
      host,
      visible: typeof IntersectionObserver !== 'function',
      api: null,
      sync,
      draw(stamp) {
        if (lastTick) time += Math.min(.06, (stamp - lastTick) / 1000);
        lastTick = stamp;
        render();
      },
    };

    function sync() {
      if (disposed) return;
      if (!host.isConnected) { state.api.destroy(); return; }
      const running = state.visible && !document.hidden && !motion.matches && !manuallyPaused && !host.hasAttribute('data-aw-reduced');
      card.dataset.galacticMotion = running ? 'running' : 'paused';
      if (running && ctx && sprites && art?.w && art?.h) {
        if (!active.has(state)) { lastTick = 0; active.add(state); }
        schedule();
      } else {
        active.delete(state);
        lastTick = 0;
        stopIfIdle();
      }
    }
    function queueRefresh() {
      if (disposed || queued) return;
      queued = true;
      queueMicrotask(() => { queued = false; if (!disposed) measure(); });
    }
    function watchLayout() {
      if (!resize) return;
      const wanted = new Set([card, ...root.querySelectorAll('.art-box,' + protectedSelector)]);
      for (const node of watched) {
        if (!wanted.has(node)) { resize.unobserve(node); watched.delete(node); }
      }
      for (const node of wanted) {
        if (!watched.has(node)) { resize.observe(node); watched.add(node); }
      }
    }
    function measure() {
      if (disposed) return;
      width = card.clientWidth; height = card.clientHeight;
      if (!width || !height) { art = null; sync(); return; }
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (ctx) {
        canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      art = rectWithin(root.querySelector('.art-box'), card) || { x: 15, y: 120, w: 329, h: 280 };
      texts = [...root.querySelectorAll('.card-head,.card-role,.desc,.collection-plaque,.stars-bar,.stat-strip,.first-badge')].map(el => rectWithin(el, card)).filter(Boolean);
      galaxies = [
        { x: art.x + art.w * .095, y: art.y + art.h * .20, size: 113, a: -.43, speed: .12, sprite: 0, strength: 1 },
        { x: art.x + art.w * .91, y: art.y + art.h * .78, size: 125, a: .72, speed: -.09, sprite: 1, strength: 1 },
        { x: art.x + art.w * .87, y: art.y + art.h * .065, size: 79, a: -.9, speed: .13, sprite: 1, strength: .85 },
        { x: width * .23, y: height - 66, size: 111, a: -.35, speed: -.11, sprite: 0, strength: .92 },
        { x: width * .79, y: height - 65, size: 94, a: .6, speed: .095, sprite: 1, strength: .96 },
      ];
      flares = [
        [art.x + 13, art.y + 19, 6.4],
        [art.x + art.w * .84, art.y + art.h * .28, 7.1],
        [art.x + 9, art.y + art.h * .61, 7.8],
        [art.x + art.w * .94, art.y + art.h * .96, 6.4],
        [width * .45, height - 89, 6.8],
        [width * .91, height - 56, 7.4],
        [width * .075, height - 27, 5.6],
        [width - 10, art.y - 21, 5.2],
      ];
      watchLayout();
      render();
      sync();
    }
    function halo(x, y, radius, color, strength) {
      const gr = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gr.addColorStop(0, `rgba(${color},${strength})`); gr.addColorStop(.34, `rgba(${color},${strength * .35})`); gr.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = gr; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    function render() {
      if (disposed || !ctx || !sprites || !art || !art.w || !art.h) return;
      ctx.clearRect(0, 0, width, height);
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      // Lueurs ponctuelles sur les tranches, sans couronne de points ni balayage.
      halo(8, art.y + art.h * .3, 62, '157,96,255', .42 + Math.sin(time * .65) * .05);
      halo(width - 7, art.y + art.h * .76, 69, '103,208,255', .34 + Math.sin(time * .55 + 2) * .04);
      halo(width * .25, height - 10, 65, '162,114,255', .27);
      for (let i = 0; i < galaxies.length; i++) {
        const g = galaxies[i], pulse = .94 + .06 * Math.sin(time * .8 + i * 1.6);
        const gx = g.x + Math.sin(time * .25 + i) * 2.5, gy = g.y + Math.cos(time * .3 + i) * 2;
        ctx.save(); ctx.translate(gx, gy); ctx.rotate(g.a + time * g.speed);
        ctx.globalAlpha = g.strength * pulse;
        // Deux échelles ajoutent du volume aux bras sans voiler le support.
        ctx.drawImage(sprites[g.sprite], -g.size / 2, -g.size / 2, g.size, g.size);
        ctx.restore();
      }
      // Poussières entraînées autour des motifs, avec des points de lumière lents.
      for (const p of particles) {
        const u = (p.u + time * .008 * p.speed) % 1;
        const py = art.y - 8 + u * (height - art.y - 17);
        const bend = Math.sin(u * TAU * .76 + (p.lane ? 1.4 : 0));
        const px = p.lane ? width - 23 - 28 * bend + p.offset : 24 + 27 * bend + p.offset;
        const a = .20 + .64 * Math.pow(.5 + .5 * Math.sin(time * (1.05 + p.speed) + p.phase), 3);
        ctx.fillStyle = `rgba(${p.tint === 0 ? '170,228,255' : p.tint === 1 ? '211,173,255' : '240,245,255'},${a})`;
        ctx.beginPath(); ctx.arc(px, py, p.radius, 0, TAU); ctx.fill();
        if (p.radius > 1.05) halo(px, py, 4, '185,207,255', a * .24);
      }
      // Éclats de matière argentée : la finition reste lumineuse au repos.
      for (let i = 0; i < flares.length; i++) {
        const [x, y, size] = flares[i];
        const pulse = .50 + .50 * Math.pow(.5 + .5 * Math.sin(time * (1.45 + i * .055) + i * 2.1), 2);
        const s = (size + 2.5) * (.93 + pulse * .12);
        halo(x, y, s * 2.5, i % 2 ? '153,226,255' : '207,194,255', .60 * pulse);
        ctx.save(); ctx.translate(x, y); ctx.rotate(.20 + i * .13);
        const flare = ctx.createRadialGradient(0, 0, 0, 0, 0, s);
        flare.addColorStop(0, `rgba(255,255,255,${.75 + pulse * .25})`);
        flare.addColorStop(.40, `rgba(220,244,255,${pulse * .95})`);
        flare.addColorStop(1, 'rgba(176,222,255,0)');
        ctx.fillStyle = flare; ctx.beginPath();
        ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * .14, -s * .13, s * .70, 0);
        ctx.quadraticCurveTo(s * .14, s * .13, 0, s);
        ctx.quadraticCurveTo(-s * .14, s * .13, -s * .70, 0);
        ctx.quadraticCurveTo(-s * .14, -s * .13, 0, -s); ctx.fill();
        ctx.fillStyle = `rgba(248,253,255,${.7 + pulse * .3})`;
        ctx.beginPath(); ctx.arc(0, 0, .75 + pulse * .4, 0, TAU); ctx.fill(); ctx.restore();
      }
      ctx.restore();
      // Centre du portrait conservé. Les bords restent disponibles à la finition.
      ctx.save(); ctx.globalCompositeOperation = 'destination-out';
      ctx.translate(art.x + art.w * .50, art.y + art.h * .48);
      ctx.scale(art.w * .29, art.h * .39);
      const mask = ctx.createRadialGradient(0, 0, .27, 0, 0, 1);
      mask.addColorStop(0, 'rgba(0,0,0,1)'); mask.addColorStop(.65, 'rgba(0,0,0,.94)'); mask.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = mask; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
      // Aucun scintillement ne traverse les textes, même après un changement de longueur.
      for (const r of texts) ctx.clearRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6);
    }

    const api = {
      refresh: measure,
      setPaused(value) { manuallyPaused = !!value; sync(); },
      destroy() {
        if (disposed) return;
        disposed = true;
        active.delete(state);
        members.delete(state);
        instances.delete(host);
        intersection?.unobserve(host);
        resize?.disconnect();
        mutation?.disconnect();
        watched.clear();
        background.remove();
        canvas.remove();
        card.classList.remove('galactic-finish');
        delete card.dataset.galacticMotion;
        lastTick = 0;
        stopIfIdle();
        releaseIfEmpty();
      },
    };
    state.api = api;
    instances.set(host, state);
    members.add(state);
    listen();
    const inner = root.querySelector('.inner');
    if (inner) mutation?.observe(inner, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style'] });
    mutation?.observe(host, { attributes: true, attributeFilter: ['data-aw-reduced'] });
    intersection?.observe(host);
    measure();
    document.fonts?.ready.then(() => { if (!disposed) measure(); });
    return api;
  }

  window.TCGGalactic = Object.freeze({ attach });
})();
