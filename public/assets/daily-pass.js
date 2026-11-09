/* Contrôleur partagé : présence sur DeadelusTV, consultation seule dans un DCG. */
(() => {
  'use strict';
  const standard = [...Array.from({length:8}, (_, i) => ({kind:'dust', amount:(i+1)*5})),
    {kind:'booster', card_count:3, booster_count:1}, {kind:'booster', card_count:3, booster_count:2}];
  let root = null, feedback = '', owner = null, generation = 0;
  let pending = null, snapshot = null, retryAt = 0, verifyAt = 0;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isSite = () => !window.TCGAuth && Boolean(window.DEADELUSTV_AUTH);
  const identity = () => window.TCGAuth ? {id:window.TCGAuth.user?.id || null, client:window.TCGAuth.client}
    : {id:window.DEADELUSTV_AUTH?.userId || null, client:null};
  const labels = {eligible:'Gain en attente', claimed:'Reçu', not_following:'Follow requis',
    verification_required:'Vérification du follow en attente', suspended:'Accès suspendu',
    not_playable:'DCG pas encore lancé', disabled:'Pass désactivé'};
  function render(data, message = feedback) {
    feedback = message;
    if (!root) return;
    const preparation = ['disabled','configuration_pending','unavailable'].includes(data?.status);
    const step = owner && !preparation && Number.isInteger(data?.step) && data.step >= 1 && data.step <= 10 ? data.step : 0;
    const rewards = data?.rewards?.length === 10 ? data.rewards : standard;
    const title = !owner ? 'Ton premier jour t’attend' : preparation ? 'Bientôt disponible' :
      data?.status === 'not_registered' ? 'Rejoins un DCG pour commencer' : step ? 'Jour '+step+' sur 10' :
      data ? 'Ton prochain cycle commence ici' : 'Vérification de ta progression…';
    if (!isSite()) {
      root.hidden = !owner;
      root.innerHTML = owner ? '<section class="daily-pass daily-pass--compact"><div><h2>Connexion Pass</h2><p>'+escape(title)+
        ' · Ta présence quotidienne se valide sur le site DeadelusTV.</p></div><a class="daily-pass-site-link" href="https://www.deadelustv.com/#tcg/connexion-pass">Retrouver mon Pass →</a><button type="button" data-daily-pass-refresh>Actualiser</button></section>' : '';
      return;
    }
    const days = rewards.map((reward, i) => {
      const day = i+1, state = step === day ? 'current' : step > day ? 'complete' : 'upcoming';
      const amount = reward.kind === 'dust' ? '+'+escape(reward.amount) : escape(reward.booster_count);
      const unit = reward.kind === 'dust' ? 'Alkahests' : 'booster'+(reward.booster_count > 1 ? 's' : '')+' de 3 cartes';
      const detail = state === 'current' ? 'étape du jour' : state === 'complete' ? 'étape passée' : 'à venir';
      return '<li class="daily-pass-day daily-pass-day--'+state+'"'+(state === 'current' ? ' aria-current="step"' : '')+
        '><span class="daily-pass-day-label">J'+day+'</span><span class="daily-pass-node" aria-hidden="true">'+
        (state === 'complete' ? '✓' : day)+'</span><strong>'+amount+'</strong> <span class="daily-pass-unit">'+unit+
        '</span><span class="daily-pass-sr">Jour '+day+' : '+detail+'</span></li>';
    }).join('');
    const channels = owner && !preparation ? (data?.channels || []).filter(c => !['not_following','not_participating','disabled'].includes(c.status)).map(c =>
      '<li><strong>'+escape(c.login)+'</strong><span>'+escape(labels[c.status] || 'En attente')+
      (c.status === 'claimed' && c.balance_after != null ? ' · Solde : '+escape(c.balance_after)+' Alkahests' :
        c.status === 'claimed' && c.booster_count ? ' · '+escape(c.booster_count)+' booster'+(c.booster_count > 1 ? 's' : '')+' de 3 cartes' : '')+'</span></li>').join('') : '';
    const stateText = preparation ? 'Le Pass est en préparation. Les récompenses ne sont pas encore activées.' :
      !owner ? 'Connecte-toi sur DeadelusTV pour commencer ton cycle personnel.' :
      !isSite() ? 'Ta présence quotidienne se valide sur le site DeadelusTV.' :
      data?.status === 'not_registered' ? 'Rejoins un DCG pour recevoir ses récompenses quotidiennes.' :
      step ? 'Ta présence du jour est enregistrée. Retrouve les gains confirmés dans tes DCG.' :
      'Ta première présence démarre à J1, quel que soit le jour de la semaine.';
    root.hidden = false;
    root.innerHTML = '<section class="daily-pass" aria-label="Pass de connexion quotidienne"><header class="daily-pass-heading">'+
      '<div><span class="daily-pass-eyebrow">CHAQUE JOUR, UN NOUVEAU RENDEZ-VOUS</span><h2>Ton Pass quotidien</h2></div>'+
      '<span class="daily-pass-state">'+escape(title)+'</span></header>'+
      '<p class="daily-pass-intro">Une visite connectée sur DeadelusTV, des récompenses dans chacun de tes DCG.</p>'+
      '<div class="daily-pass-scroll" tabindex="0" role="region" aria-label="Les dix jours du Pass, défilement horizontal"><ol class="daily-pass-days">'+days+'</ol></div>'+
      '<p class="daily-pass-status">'+escape(stateText)+'</p>'+
      (owner && !isSite() ? '<p><a class="daily-pass-site-link" href="https://www.deadelustv.com/#tcg/connexion-pass">Retrouver mon Pass sur DeadelusTV →</a></p>' : '')+
      (data?.donor_bonus?.enabled && data.donor_bonus.active && owner && !preparation ? '<p class="daily-pass-supporter">Bonus soutien actif · Les boosters de J9 et J10 sont doublés.</p>' : '')+
      (channels ? '<ul class="daily-pass-channels" aria-label="Récompenses par DCG">'+channels+'</ul>' : '')+
      '<footer class="daily-pass-footer"><p>J1 commence à ta première connexion, quel que soit le jour de la semaine. Après J10, un nouveau cycle commence à J1. Un jour manqué fait reprendre à J1. Changement de journée à minuit, heure de Paris.</p>'+
      (owner ? '<button type="button" data-daily-pass-refresh>Actualiser</button>' : '')+'</footer>'+
      '<p class="daily-pass-feedback" role="status" aria-live="polite">'+escape(message)+'</p></section>';
  }
  async function refresh(force = false) {
    const session = identity();
    if (session.id !== owner) {
      owner = session.id; ++generation; snapshot = null; pending = null; retryAt = 0; verifyAt = 0;
      render(null, '');
    }
    if (!owner || document.visibilityState === 'hidden' || pending || !force && Date.now() < retryAt) return;
    const request = {generation, id:owner}; pending = request;
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
          snapshot = {status:'unavailable'}; retryAt = Date.now()+300000; render(snapshot, ''); return;
        }
        throw result.error;
      }
      if (!result.data?.status) throw Error('Réponse incomplète');
      snapshot = result.data;
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
      if (gains.length) {
        window.dispatchEvent(new CustomEvent('tcg:daily-pass-change', {detail:{gains}}));
        if (gains.some(g => g.kind === 'dust')) window.dispatchEvent(new Event('tcg:dust-change'));
      }
    } catch {
      if (current()) {retryAt = Date.now()+30000; render(snapshot, 'Vérification momentanément indisponible. Tu peux réessayer.');}
    } finally {if (pending === request) pending = null;}
  }
  const onClick = event => {if (event.target.closest('[data-daily-pass-refresh]')) void refresh(true);};
  function mount(element) {
    if (root && root !== element) {root.removeEventListener('click',onClick); root.replaceChildren(); root.hidden = true;}
    root = element || null;
    if (root) {root.removeEventListener('click',onClick); root.addEventListener('click',onClick); render(snapshot);}
  }
  window.DCGDailyPass = Object.freeze({mount, unmount:() => mount(null), refresh:() => refresh(true)});
  mount(document.getElementById('daily-pass-root'));
  window.addEventListener('tcg:auth-change', () => {void refresh();});
  window.addEventListener('deadelustv:auth-change', () => {void refresh();});
  window.addEventListener('tcg:viewer-change', () => {if (snapshot?.status === 'not_registered') void refresh(true);});
  window.addEventListener('focus', () => {void refresh();});
  document.addEventListener('visibilitychange', () => {if (document.visibilityState !== 'hidden') void refresh();});
  window.setInterval(() => {void refresh();}, 60000);
  void refresh();
})();
