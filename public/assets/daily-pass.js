/* Contrôleur partagé : présence sur DeadelusTV, consultation seule dans un DCG. */
(() => {
  'use strict';
  const standard = [...Array.from({length:8}, (_, i) => ({kind:'dust', amount:(i+1)*5})),
    {kind:'booster', card_count:3, booster_count:1}, {kind:'booster', card_count:3, booster_count:2}];
  const scriptUrl = document.currentScript?.src;
  const iconBase = scriptUrl ? new URL(scriptUrl.includes('/assets/daily-pass.js') ? '../modules/dcg/assets/xp/' : 'assets/xp/', scriptUrl).href : 'assets/xp/';
  let root = null, view = 'details', feedback = '', owner = null, generation = 0;
  let pending = null, snapshot = null, retryAt = 0, verifyAt = 0;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function mineralTexture(seed) {
    const size = 160;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) return null;
    const raster = context.createImageData(size, size);
    function hash(x, y) {
      const raw = Math.sin(x * 127.1 + y * 311.7 + seed * 73.13) * 43758.5453;
      return raw - Math.floor(raw);
    }
    function noise(x, y, scale) {
      const sx = x / scale, sy = y / scale;
      const ix = Math.floor(sx), iy = Math.floor(sy);
      const fx = sx - ix, fy = sy - iy;
      const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
      return (hash(ix, iy) * (1 - u) + hash(ix + 1, iy) * u) * (1 - v)
        + (hash(ix, iy + 1) * (1 - u) + hash(ix + 1, iy + 1) * u) * v;
    }
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cloud = .46 * noise(x, y, 49) + .28 * noise(x, y, 21) + .17 * noise(x, y, 7) + .09 * hash(x, y);
        const veins = Math.pow(Math.max(0, 1 - Math.abs(noise(x + 73, y - 31, 34) - .5) * 6), 5);
        const distance = Math.hypot(x - 80, y - 80) / 113;
        const light = (Math.pow(cloud, 2.4) * 100 + veins * 22) * (.55 + .45 * distance);
        const grain = (hash(x + 20, y + 41) - .5) * 9;
        const p = (y * size + x) * 4;
        raster.data[p] = 5 + light + grain;
        raster.data[p + 1] = 5 + light * .89 + grain;
        raster.data[p + 2] = 7 + light * .73 + grain;
        raster.data[p + 3] = 255;
      }
    }
    context.putImageData(raster, 0, 0);
    for (let i = 0; i < 67; i++) {
      const x = hash(i, 201) * size;
      const y = hash(i, 202) * size;
      if (Math.hypot(x - 80, y - 80) < 28) continue;
      const radius = .25 + hash(i, 203) * .65;
      context.fillStyle = `rgba(242, 229, 194, ${.12 + hash(i, 204) * .5})`;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
      if (i % 17 === 0) {
        const bloom = context.createRadialGradient(x, y, 0, x, y, 7);
        bloom.addColorStop(0, 'rgba(255, 246, 208, .5)');
        bloom.addColorStop(.2, 'rgba(241, 214, 144, .14)');
        bloom.addColorStop(1, 'rgba(241, 214, 144, 0)');
        context.fillStyle = bloom;
        context.fillRect(x - 7, y - 7, 14, 14);
      }
    }
    return canvas.toDataURL('image/png');
  }

  // Décor du ZIP validé : géométrie et rythmes identiques, calculés une fois.
  const mineralCache = new Map(), sparkleCache = new Map(), playedAnimations = new Set();
  let motion = null, motionTimers = [], inView = true, viewObserver = null;
  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  function stopMotion() {
    for (const timer of motionTimers) window.clearTimeout(timer);
    motionTimers = []; motion = null;
  }
  function syncVisibility() {
    root?.setAttribute('data-pass-paused', String(!inView || document.visibilityState === 'hidden'));
  }
  function mineral(day) {
    if (!mineralCache.has(day)) mineralCache.set(day, document.createElement ? mineralTexture(day * 7) : null);
    return mineralCache.get(day);
  }
  function sparkles(day) {
    if (sparkleCache.has(day)) return sparkleCache.get(day);
    const seed = day * 193, vertices = [[50,0],[100,50],[50,100],[0,50]];
    const prng = n => {const x = Math.sin(n * 78.23 + 23.48) * 43587.234; return x - Math.floor(x);};
    let stars = '';
    for (let i = 0; i < 16; i++) {
      const edge = Math.floor(i / 4), t = .09 + .82 * prng(seed + i + 20);
      const a = vertices[edge], b = vertices[(edge + 1) % 4];
      const major = prng(seed + i + 540) < .28, dot = !major && prng(seed + i + 100) < .38;
      stars += `<span class="border-spark${major ? ' is-major' : ''}${dot ? ' is-dot' : ''}" style="--xp-x:${a[0] + (b[0]-a[0])*t}%;--xp-y:${a[1] + (b[1]-a[1])*t}%;--xp-star-size:${(major ? 8+prng(seed+i+250)*2 : 2.3+prng(seed+i+350)*3)/238};--xp-period:${2.5+prng(seed+i+70)*4.2}s;--xp-delay:${-prng(seed+i+80)*7}s;--xp-power:${.55+prng(seed+i+90)*.45}"></span>`;
    }
    for (let j = 0; j < 7; j++) {
      const angle = prng(seed+j+1700)*Math.PI*2, radius = .23+.10*prng(seed+j+1770), major = j < 3;
      stars += `<span class="inside-spark${major ? '' : ' is-dot'}" style="--xp-x:${50+Math.cos(angle)*radius*100}%;--xp-y:${50+Math.sin(angle)*radius*100}%;--xp-star-size:${(major ? 7+prng(seed+j+1820)*9 : 2+prng(seed+j+1820)*3.7)/238};--xp-duration:${2.2+prng(seed+j+1900)*4.2}s;--xp-delay:${-prng(seed+j+1920)*6.5}s;--xp-base:${major ? .19 : .34};--xp-peak:${major ? .99 : .85};--xp-glow:${major ? 1 : .5}"></span>`;
    }
    const markup = '<span class="flares" aria-hidden="true"></span><span class="ready-aura" aria-hidden="true"></span><span class="sparkles" aria-hidden="true">'+stars+'</span><span class="claim-flash" aria-hidden="true"></span>';
    sparkleCache.set(day, markup); return markup;
  }
  const rewardText = reward => reward.kind === 'dust' ? '+'+reward.amount+' Alkahests' : reward.booster_count+' booster'+(reward.booster_count > 1 ? 's' : '')+' de '+reward.card_count+' cartes';
  function confirmedAnimation(data) {
    if (!root || !isSite() || !owner || !Number.isInteger(data?.step) || data.step < 1 || data.step > 10 || !data.gains?.length || data.status !== 'recorded') return;
    const key = JSON.stringify([owner,data.date,data.cycle,data.step]);
    if (playedAnimations.has(key)) return;
    playedAnimations.add(key);
    if (reducedMotion()) return;
    stopMotion(); motion = {step:data.step, key, stage:'charging'}; render(data);
    motionTimers.push(window.setTimeout(() => {
      if (!root || !motion) return;
      motion.stage = 'settling'; render(snapshot);
      motionTimers.push(window.setTimeout(() => {stopMotion(); render(snapshot);}, 550));
    }, 420));
  }

  const isSite = () => !window.TCGAuth && Boolean(window.DEADELUSTV_AUTH);
  const servicePending = () => isSite() && window.DEADELUSTV_DCG_CONFIG?.dailyPassServiceReady !== true;
  const identity = () => window.TCGAuth ? {id:window.TCGAuth.user?.id || null, client:window.TCGAuth.client}
    : {id:window.DEADELUSTV_AUTH?.userId || null, client:null};
  const labels = {eligible:'Gain en attente', claimed:'Reçu', not_following:'Follow requis',
    verification_required:'Vérification du follow en attente', suspended:'Accès suspendu',
    not_playable:'DCG pas encore lancé', disabled:'Pass désactivé'};
  function render(data, message = feedback) {
    feedback = message;
    if (!root) return;
    const preparation = servicePending() || ['disabled','configuration_pending','unavailable'].includes(data?.status);
    const step = owner && !preparation && Number.isInteger(data?.step) && data.step >= 1 && data.step <= 10 ? data.step : 0;
    const rewards = data?.rewards?.length === 10 ? data.rewards : standard;
    const title = preparation ? 'Bientôt disponible' : !owner ? 'Ton premier jour t’attend' :
      data?.status === 'not_registered' ? 'Rejoins un DCG pour commencer' : step ? 'Jour '+step+' sur 10' :
      data ? 'Ton prochain cycle commence ici' : 'Vérification de ta progression…';
    if (!isSite()) {
      root.hidden = !owner;
      root.innerHTML = owner ? '<section class="daily-pass daily-pass--compact"><div><h2>Connexion Pass</h2><p>'+escape(title)+
        ' · Ta présence quotidienne se valide sur le site DeadelusTV.</p></div><a class="daily-pass-site-link" href="https://www.deadelustv.com/#tcg/mon-compte">Détails de mon Pass →</a><button type="button" data-daily-pass-refresh>Actualiser</button></section>' : '';
      return;
    }
    // Un numéro de présence n'est pas un reçu. Les coches utilisent uniquement
    // l'historique serveur ou la confirmation des gains du jour courant.
    const history = step && Array.isArray(data?.history) ? data.history : [];
    const todayClaimed = step > 0 && ((data?.channels || []).some(c => c.status === 'claimed') || data?.gains?.length > 0);
    const todayReady = step > 0 && !todayClaimed && (data?.channels || []).some(c => ['eligible','verification_required'].includes(c.status));
    const states = rewards.map((reward, i) => {
      const day = i+1, receipt = history.find(item => item.step === day && day <= step);
      const collected = Boolean(receipt?.claimed || day === step && todayClaimed);
      const ready = day === step && todayReady;
      const visited = day <= step, pulse = day === motion?.step ? motion.stage : null;
      const detail = collected ? 'récompense reçue' : ready ? 'gain à vérifier' : visited ? 'présence enregistrée' : 'à venir';
      return {day, reward:receipt?.reward || reward, collected, ready, visited, pulse, detail};
    });
    const days = states.map(({day,reward,collected,ready,visited,pulse,detail}) => {
      const texture = mineral(day), state = day === step ? 'current' : visited ? 'complete' : 'upcoming';
      const classes = ['day','daily-pass-day','daily-pass-day--'+state];
      if (visited) classes.push('is-on');
      if (pulse === 'charging') classes.push('is-ready','is-claiming');
      else if (collected) classes.push('is-collected');
      else if (ready) classes.push('is-ready');
      if (pulse === 'settling') classes.push('is-settling');
      return '<li class="'+classes.join(' ')+'" data-day="'+day+'"'+(day === step ? ' aria-current="step"' : '')+
        ' aria-label="Jour '+day+' : '+escape(rewardText(reward))+' — '+detail+'"'+(texture ? ' style="--mineral:url('+texture+')"' : '')+
        '><span class="diamond" aria-hidden="true"></span><span class="day-number" aria-hidden="true">J'+day+'</span>'+sparkles(day)+
        (ready ? '<button class="claim-hit" type="button" data-daily-pass-refresh aria-label="Vérifier la réception du gain du jour '+day+'"'+(pending ? ' disabled aria-busy="true"' : '')+'></button>' : '')+'</li>';
    }).join('');
    const rewardList = states.map(({day,reward,detail,ready}) => '<li aria-label="Jour '+day+' : '+escape(rewardText(reward))+' — '+detail+'" title="'+escape(rewardText(reward))+'">'+
      (ready ? '<button class="daily-pass-reward-claim" type="button" data-daily-pass-refresh data-reward-day="'+day+'" aria-label="Vérifier la réception du gain du jour '+day+'"'+(pending ? ' disabled aria-busy="true"' : '')+'>' : '')+
      '<img src="'+escape(iconBase+(reward.kind === 'dust' ? 'dcg-alkahest-256.webp' : 'dcg-booster-256.webp'))+'" alt="" width="36" height="36" aria-hidden="true">'+
      '<strong aria-hidden="true">'+escape(reward.kind === 'dust' ? '+'+reward.amount : '×'+reward.booster_count)+'</strong>'+(ready ? '</button>' : '')+'</li>').join('');
    const channels = owner && !preparation ? (data?.channels || []).filter(c => !['not_following','not_participating','disabled'].includes(c.status)).map(c =>
      '<li><strong>'+escape(c.login)+'</strong><span>'+escape(labels[c.status] || 'En attente')+
      (c.status === 'claimed' && c.balance_after != null ? ' · Solde : '+escape(c.balance_after)+' Alkahests' :
        c.status === 'claimed' && c.booster_count ? ' · '+escape(c.booster_count)+' booster'+(c.booster_count > 1 ? 's' : '')+' de 3 cartes' : '')+'</span></li>').join('') : '';
    const stateText = preparation ? 'Le Pass est en préparation. Les récompenses ne sont pas encore activées.' :
      !owner ? 'Connecte-toi sur DeadelusTV pour commencer ton cycle personnel.' :
      data?.status === 'not_registered' ? 'Rejoins un DCG pour recevoir ses récompenses quotidiennes.' :
      step ? 'Ta présence du jour est enregistrée. Retrouve les gains confirmés dans tes DCG.' :
      'Ta progression sera affichée après ta première présence.';
    const focusTarget = root.contains?.(document.activeElement) && document.activeElement?.closest?.('[data-daily-pass-refresh]');
    const focusedDay = focusTarget?.closest?.('[data-day]')?.dataset.day;
    const trackFocused = root.contains?.(document.activeElement) && document.activeElement?.matches?.('.day-track');
    const restoreFocus = () => {
      if (focusTarget || trackFocused) ((focusedDay ? root.querySelector('[data-day="'+focusedDay+'"] button') : null) || root.querySelector('.day-track'))?.focus({preventScroll:true});
    };
    const progression = '<div class="daily-pass-scroll" tabindex="0" role="region" aria-label="Les dix jours du Pass"><ol class="day-track daily-pass-days" tabindex="-1" aria-label="Progression sur dix jours" style="--lit-width:'+Math.max(0,(step-1)*10)+'%;--lit-opacity:'+(step > 1 ? 1 : 0)+'">'+days+'</ol></div>';
    root.hidden = false;
    if (view === 'progress') {
      root.innerHTML = '<section class="daily-pass daily-pass--visual daily-pass--progress" aria-label="Connexion Pass"><div class="pass-surface">'+progression+
        '<p class="daily-pass-sr" role="status" aria-live="polite">'+escape(title)+'. '+escape(stateText)+(message ? ' '+escape(message) : '')+'</p></div></section>';
      restoreFocus(); syncVisibility(); return;
    }
    root.innerHTML = '<section class="daily-pass daily-pass--visual pass-frame" aria-label="Pass de connexion quotidienne"><div class="pass-surface">'+
      '<header class="daily-pass-heading"><div><h2 class="pass-heading">CONNEXION PASS</h2><p class="pass-subtitle">Votre rendez-vous quotidien</p></div><span class="daily-pass-state">'+escape(title)+'</span></header>'+
      '<p class="daily-pass-intro">Une visite connectée sur DeadelusTV, des récompenses dans chacun de tes DCG.</p>'+
      progression+
      '<ol class="daily-pass-rewards" aria-label="Récompenses de chaque jour">'+rewardList+'</ol>'+
      '<div class="pass-caption"><span class="daily-pass-legend"><span>✓ Reçu</span><span>◇ À venir</span></span></div>'+
      (data?.donor_bonus?.enabled && data.donor_bonus.active && owner && !preparation ? '<p class="daily-pass-supporter">Bonus soutien actif · Les boosters de J9 et J10 sont doublés.</p>' : '')+
      (channels ? '<ul class="daily-pass-channels" aria-label="Récompenses par DCG">'+channels+'</ul>' : '')+
      '<a class="daily-pass-help" href="#tcg/regles">FAQ du Pass →</a>'+
      '<p class="daily-pass-feedback" role="status" aria-live="polite">'+escape(message)+'</p></div></section>';
    restoreFocus();
    syncVisibility();
  }

  async function refresh(force = false) {
    const session = identity();
    if (session.id !== owner) {
      stopMotion(); playedAnimations.clear(); owner = session.id; ++generation; snapshot = null; pending = null; retryAt = 0; verifyAt = 0;
      render(null, '');
    }
    if (!owner || document.visibilityState === 'hidden' || pending || !force && Date.now() < retryAt) return;
    if (servicePending()) {snapshot = {status:'configuration_pending'}; retryAt = Date.now()+300000; render(snapshot, ''); return;}
    const request = {generation, id:owner}; pending = request;
    for (const button of root?.querySelectorAll?.('[data-daily-pass-refresh]') || []) {button.disabled = true; button.setAttribute('aria-busy','true');}
    const current = () => request.generation === generation && identity().id === request.id;
    try {
      const client = session.client || await window.DEADELUSTV_AUTH.getClient();
      if (!current()) return;
      // L'Edge Function du site vérifie origine et JWT. Le jeu n'appelle jamais une attribution.
      const read = () => isSite() ? client.functions.invoke('tcg-daily-pass', {body:{}}) : client.rpc('tcg_daily_pass_status');
      let result = await read();
      if (!current()) return;
      if (isSite() && !result.error && result.data?.channels?.some(c => c.status === 'verification_required') && Date.now() >= verifyAt) {
        verifyAt = Date.now()+300000;
        try {
          const check = await client.functions.invoke('tcg-twitch-sync', {body:{action:'verify_follow'}});
          if (!current()) return;
          if (!check.error && check.data?.ok && !check.data.failed_count && !check.data.skipped) {
            const refreshed = await read();
            if (!current()) return;
            if (!refreshed.error && refreshed.data) result = {...refreshed, data:{...refreshed.data,
              gains:[...(result.data.gains || []), ...(refreshed.data.gains || [])]}};
          }
        } catch { /* Une erreur Twitch laisse la vérification en attente. */ }
      }
      if (result.error) {
        if (['PGRST202','42883'].includes(result.error.code) || result.error.context?.status === 404) {
          stopMotion(); snapshot = {status:'unavailable'}; retryAt = Date.now()+300000; render(snapshot, ''); return;
        }
        throw result.error;
      }
      if (!result.data?.status) throw Error('Réponse incomplète');
      snapshot = result.data;
      if (motion && (motion.key !== JSON.stringify([owner,snapshot.date,snapshot.cycle,snapshot.step]) || ['disabled','configuration_pending'].includes(snapshot.status))) stopMotion();
      if (isSite() && ['disabled','configuration_pending'].includes(snapshot.status)) {
        const status = await client.rpc('tcg_daily_pass_status');
        if (!current()) return;
        if (!status.error && status.data) snapshot = status.data;
      }
      retryAt = Date.now()+(['disabled','configuration_pending','unavailable'].includes(snapshot.status) ? 300000 : 60000);
      const gains = isSite() ? snapshot.gains || [] : [], grouped = new Map();
      for (const gain of gains) {
        const key = JSON.stringify([gain.broadcaster_id || gain.login,gain.kind,gain.card_count]);
        const entry = grouped.get(key) || {...gain, quantity:0}; entry.quantity++; grouped.set(key,entry);
      }
      const message = [...grouped.values()].map(g => g.kind === 'dust' ? '+'+g.amount+' Alkahests chez '+g.login :
        g.quantity+' booster'+(g.quantity > 1 ? 's' : '')+' de '+g.card_count+' cartes chez '+g.login).join(' · ');
      render(snapshot, message);
      confirmedAnimation(snapshot);
      if (gains.length) {
        window.dispatchEvent(new CustomEvent('tcg:daily-pass-change', {detail:{gains}}));
        if (gains.some(g => g.kind === 'dust')) window.dispatchEvent(new Event('tcg:dust-change'));
      }
    } catch {
      if (current()) {retryAt = Date.now()+30000; render(snapshot, 'Impossible de vérifier ta progression pour le moment. Une nouvelle tentative sera faite automatiquement.');}
    } finally {if (pending === request) {pending = null;
      for (const button of root?.querySelectorAll?.('[data-daily-pass-refresh]') || []) {button.disabled = false; button.removeAttribute('aria-busy');}
    }}
  }
  const onClick = event => {if (event.target.closest('[data-daily-pass-refresh]')) void refresh(true);};
  function mount(element, options = {}) {
    stopMotion(); viewObserver?.disconnect(); inView = true;
    view = options.view === 'progress' ? 'progress' : 'details';
    if (root && root !== element) {root.removeEventListener('click',onClick); root.replaceChildren(); root.hidden = true;}
    root = element || null;
    if (root) {root.removeEventListener('click',onClick); root.addEventListener('click',onClick); render(snapshot);
      if (typeof IntersectionObserver !== 'undefined') {
        viewObserver ||= new IntersectionObserver(entries => {inView = entries.some(entry => entry.isIntersecting); syncVisibility();});
        viewObserver.observe(root);
      }
      confirmedAnimation(snapshot);}
  }
  window.DCGDailyPass = Object.freeze({mount, unmount:() => mount(null), refresh:() => refresh(true)});
  mount(document.getElementById('daily-pass-root'));
  window.addEventListener('tcg:auth-change', () => {void refresh();});
  window.addEventListener('deadelustv:auth-change', () => {void refresh();});
  window.addEventListener('tcg:viewer-change', () => {if (snapshot?.status === 'not_registered') void refresh(true);});
  window.addEventListener('focus', () => {void refresh();});
  document.addEventListener('visibilitychange', () => {syncVisibility(); if (document.visibilityState !== 'hidden') void refresh();});
  window.setInterval(() => {void refresh();}, 60000);
  void refresh();
})();
