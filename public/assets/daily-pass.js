/* Même module sur le portail et le TCG : le serveur choisit jour et bénéficiaires. */
(() => {
  'use strict';
  let root = null, feedback = '';
  let owner = null, generation = 0, pending = null, snapshot = null, retryAt = 0, verifyAt = 0;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const identity = () => window.TCGAuth ? {
    id: window.TCGAuth.user?.id || null, client: window.TCGAuth.client
  } : {id: window.DEADELUSTV_AUTH?.userId || null, client: null};
  const labels = {eligible:'Gain disponible', claimed:'Reçu', not_following:'Follow requis',
    verification_required:'Vérification du follow en attente', suspended:'Accès suspendu', not_playable:'TCG pas encore lancé', disabled:'Pass désactivé'};
  function render(data, message = feedback) {
    feedback = message;
    if (!root) return;
    if (!owner) {root.hidden = true; root.replaceChildren(); return;}
    const opened = root.querySelector('details')?.open;
    const rewards = data?.rewards || [];
    const preparation = ['disabled','configuration_pending','unavailable'].includes(data?.status);
    const title = preparation ? 'En préparation' : data?.status === 'not_registered' ? 'Rejoins un DCG pour commencer' : data?.status === 'completed' ? 'Parcours terminé' :
      data?.step ? 'Jour ' + data.step : 'Ta visite compte aussi depuis le site général';
    const days = rewards.map((r, i) => '<li' + (data?.step === i + 1 ? ' aria-current="step"' : '') +
      '><span>J' + (i + 1) + '</span><strong>' + (r.kind === 'dust' ? '+' + escape(r.amount) + ' Alkahests' :
        r.kind === 'booster' ? escape(r.booster_count) + ' booster' + (r.booster_count > 1 ? 's' : '') + ' de ' + escape(r.card_count) + ' cartes' : 'À définir') + '</strong></li>').join('');
    const channels = (data?.channels || []).filter(c => !['not_following','not_participating'].includes(c.status)).map(c =>
      '<li><strong>' + escape(c.login) + '</strong><span>' + escape(labels[c.status] || 'En attente') +
      (c.status === 'claimed' && c.balance_after != null ? ' · Solde : ' + escape(c.balance_after) : '') + '</span></li>').join('');
    root.hidden = false;
    root.innerHTML = '<details class="daily-pass"' + (opened ? ' open' : '') + '><summary><strong>✧ Connexion Pass</strong>' +
      '<span>' + escape(title) + '</span></summary><div class="daily-pass-body">' +
      '<p>Une connexion quotidienne au site suffit. Les récompenses vont dans chaque DCG auquel tu joues, avec des soldes séparés.</p>' +
      '<p>Un jour manqué remet au J1. Le cycle reprend après J10 et la journée change à minuit, heure de Paris.</p>' +
      (preparation ? '<p>Le calendrier est en préparation. Les gains automatiques ne sont pas encore activés.</p>' : '') +
      (days ? '<ol class="daily-pass-days" aria-label="Récompenses du parcours">' + days + '</ol>' : '') +
      (channels ? '<ul class="daily-pass-channels" aria-label="Tes récompenses par streamer">' + channels + '</ul>' : '') +
      '<p class="daily-pass-feedback" role="status" aria-live="polite">' + escape(message) + '</p>' +
      '<button type="button" data-daily-pass-refresh>Actualiser</button></div></details>';
  }
  async function refresh(force = false) {
    const session = identity();
    if (session.id !== owner) {
      owner = session.id; ++generation; snapshot = null; pending = null; retryAt = 0; verifyAt = 0;
      render(null, '');
      if (!owner) {render(null); return;}
    }
    if (!owner || document.visibilityState === 'hidden' || pending || !force && Date.now() < retryAt) return;
    const request = {generation, id: owner}; pending = request;
    const current = () => request.generation === generation && identity().id === request.id;
    try {
      const client = session.client || await window.DEADELUSTV_AUTH.getClient();
      if (!current()) return;
      let result = await client.rpc('tcg_claim_daily_pass');
      if (!current()) return;
      if (!result.error && result.data?.channels?.some(c => c.status === 'verification_required') &&
          client.functions?.invoke && Date.now() >= verifyAt) {
        verifyAt = Date.now() + 300000;
        try {
          const check = await client.functions.invoke('tcg-twitch-sync', {body:{action:'verify_follow'}});
          if (!current()) return;
          if (!check.error && check.data?.ok && !check.data.failed_count && !check.data.skipped) {
            const refreshed = await client.rpc('tcg_claim_daily_pass');
            if (!current()) return;
            if (!refreshed.error && refreshed.data) {
              // La première requête a pu créditer d'autres TCG avant la vérification.
              result = {...refreshed, data:{...refreshed.data,gains:[...(result.data.gains || []),...(refreshed.data.gains || [])]}};
            }
          }
        } catch { /* Garder le résultat confirmé ; aucune erreur Twitch ne vaut unfollow. */ }
      }
      if (result.error) {
        if (result.error.code === 'PGRST202' || result.error.code === '42883') {
          snapshot = {status:'unavailable'}; retryAt = Date.now() + 300000; render(snapshot); return;
        }
        throw result.error;
      }
      if (!result.data?.status) throw Error('Réponse incomplète');
      snapshot = result.data;
      if (['disabled','configuration_pending'].includes(snapshot.status)) {
        const status = await client.rpc('tcg_daily_pass_status');
        if (!current()) return;
        if (!status.error && status.data) snapshot = status.data;
      }
      retryAt = Date.now() + (['disabled','configuration_pending'].includes(snapshot.status) ? 300000 : 60000);
      const gains = snapshot.gains || [];
      const grouped = new Map();
      for (const g of gains) {
        const key = JSON.stringify([g.broadcaster_id || g.login,g.kind,g.card_count]);
        const entry = grouped.get(key) || {...g,quantity:0};
        entry.quantity++; grouped.set(key,entry);
      }
      const message = [...grouped.values()].map(g => g.kind === 'dust' ? '+' + g.amount + ' Alkahests chez ' + g.login :
        g.quantity + ' booster' + (g.quantity > 1 ? 's' : '') + ' de ' + g.card_count + ' cartes chez ' + g.login).join(' · ');
      render(snapshot, message);
      if (gains.length) {
        window.dispatchEvent(new CustomEvent('tcg:daily-pass-change', {detail:{gains}}));
        if (gains.some(g => g.kind === 'dust')) window.dispatchEvent(new Event('tcg:dust-change'));
      }
    } catch {
      if (current()) {
        retryAt = Date.now() + 30000;
        render(snapshot, 'Vérification momentanément indisponible. Tu peux réessayer.');
      }
    } finally {if (pending === request) pending = null;}
  }
  const onClick = event => {if (event.target.closest('[data-daily-pass-refresh]')) void refresh(true);};
  // Monter une vue ne réclame pas une seconde fois : la présence reste active
  // sur tout le site, même lorsqu'aucun élément du Pass n'est affiché.
  function mount(element) {
    if (root) root.removeEventListener('click', onClick);
    root = element || null;
    if (root) {root.addEventListener('click', onClick); render(snapshot);}
  }
  window.DCGDailyPass = Object.freeze({mount, unmount: () => mount(null), refresh: () => refresh(true)});
  mount(document.getElementById('daily-pass-root'));
  window.addEventListener('tcg:auth-change', () => {void refresh();});
  window.addEventListener('deadelustv:auth-change', () => {void refresh();});
  window.addEventListener('tcg:viewer-change', () => {if (snapshot?.status === 'not_registered' || snapshot?.channels?.some(c => ['verification_required','not_participating'].includes(c.status))) void refresh(true);});
  window.addEventListener('focus', () => {void refresh();});
  document.addEventListener('visibilitychange', () => {if (document.visibilityState !== 'hidden') void refresh();});
  // L'horloge locale ne choisit aucune récompense : chaque appel revalide la date serveur.
  window.setInterval(() => {void refresh();}, 60000);
  void refresh();
})();
