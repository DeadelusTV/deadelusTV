/* Même module sur le portail et le TCG : le serveur choisit jour et bénéficiaires. */
(() => {
  'use strict';
  const root = document.getElementById('daily-pass-root');
  if (!root) return;
  let owner = null, generation = 0, pending = null, snapshot = null, retryAt = 0, verifyAt = 0;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const identity = () => window.TCGAuth ? {
    id: window.TCGAuth.user?.id || null, client: window.TCGAuth.client
  } : {id: window.DEADELUSTV_AUTH?.userId || null, client: null};
  const labels = {eligible:'Gain disponible', claimed:'Reçu', not_following:'Follow requis',
    verification_required:'Vérification du follow en attente', suspended:'Accès suspendu', not_playable:'TCG pas encore lancé', disabled:'Pass désactivé'};
  function render(data, message = '') {
    if (!owner) {root.hidden = true; root.replaceChildren(); return;}
    const opened = root.querySelector('details')?.open;
    const rewards = data?.rewards || [];
    const preparation = ['disabled','configuration_pending','unavailable'].includes(data?.status);
    const title = preparation ? 'En préparation' : data?.status === 'completed' ? 'Parcours terminé' :
      data?.step ? 'Jour ' + data.step : 'Ta visite compte aussi depuis le site général';
    const days = rewards.map((r, i) => '<li' + (data?.step === i + 1 ? ' aria-current="step"' : '') +
      '><span>J' + (i + 1) + '</span><strong>' + (r.kind === 'dust' ? '+' + escape(r.amount) + ' Alkahests' :
        r.kind === 'booster' ? 'Booster · ' + escape(r.card_count) + ' cartes' : 'À définir') + '</strong>' +
      (r.kind === 'booster' && preparation ? '<small>Proposition</small>' : '') + '</li>').join('');
    const channels = (data?.channels || []).filter(c => c.status !== 'not_following').map(c =>
      '<li><strong>' + escape(c.login) + '</strong><span>' + escape(labels[c.status] || 'En attente') +
      (c.status === 'claimed' && c.balance_after != null ? ' · Solde : ' + escape(c.balance_after) : '') + '</span></li>').join('');
    root.hidden = false;
    root.innerHTML = '<details class="daily-pass"' + (opened ? ' open' : '') + '><summary><strong>✧ Connexion Pass</strong>' +
      '<span>' + escape(title) + '</span></summary><div class="daily-pass-body">' +
      '<p>Une visite sur le site suffit. Les poussières de J1 vont dans chaque TCG de streamer suivi : <strong>+5 chez chacun</strong>.</p>' +
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
      const message = gains.map(g => g.kind === 'dust' ? '+' + g.amount + ' Alkahests chez ' + g.login :
        'Un booster de ' + g.card_count + ' cartes chez ' + g.login).join(' · ');
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
  root.addEventListener('click', event => {if (event.target.closest('[data-daily-pass-refresh]')) void refresh(true);});
  window.addEventListener('tcg:auth-change', () => {void refresh();});
  window.addEventListener('deadelustv:auth-change', () => {void refresh();});
  window.addEventListener('tcg:viewer-change', () => {if (snapshot?.channels?.some(c => c.status === 'verification_required')) void refresh(true);});
  window.addEventListener('focus', () => {void refresh();});
  document.addEventListener('visibilitychange', () => {if (document.visibilityState !== 'hidden') void refresh();});
  // L'horloge locale ne choisit aucune récompense : chaque appel revalide la date serveur.
  window.setInterval(() => {void refresh();}, 60000);
  void refresh();
})();
