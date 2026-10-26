'use strict';
/* Gestion de l'accord pour le lecteur Twitch : aucun traceur Twitch n'est chargé ici. */
(() => {
  const KEY = 'deadelustv_twitch_consent_v1';
  const TTL = 180 * 24 * 60 * 60 * 1000;
  let memoryChoice = null;
  let panel = null;
  let opener = null;

  function readChoice() {
    let saved = memoryChoice;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null') || saved; } catch { /* stockage interdit */ }
    if (!saved || !['accept', 'refuse'].includes(saved.choice) ||
        saved.version !== 1 || !Number.isFinite(saved.savedAt) ||
        saved.savedAt > Date.now() || Date.now() - saved.savedAt >= TTL) return null;
    return saved.choice;
  }

  const api = {
    hasTwitchConsent: () => readChoice() === 'accept',
    getChoice: readChoice,
    onChange: callback => {
      const listener = event => callback(event.detail);
      window.addEventListener('deadelustv:consent-change', listener);
      return () => window.removeEventListener('deadelustv:consent-change', listener);
    },
    open: () => showPanel(true)
  };
  window.DEADELUSTV_CONSENT = api;

  function closePanel() {
    if (!panel) return;
    panel.remove();
    panel = null;
    if (opener && opener.isConnected) opener.focus();
    opener = null;
  }

  function saveChoice(choice) {
    memoryChoice = {choice, savedAt: Date.now(), version: 1};
    try { localStorage.setItem(KEY, JSON.stringify(memoryChoice)); } catch { /* session privée */ }
    closePanel();
    window.dispatchEvent(new CustomEvent('deadelustv:consent-change', {detail: {choice}}));
  }

  function showPanel(fromManager = false) {
    if (panel) { panel.querySelector('button')?.focus(); return; }
    opener = fromManager ? document.activeElement : null;
    const section = document.createElement('section');
    section.className = 'cookie-panel';
    section.setAttribute('role', 'region');
    section.setAttribute('aria-labelledby', 'twitch-consent-title');

    const title = document.createElement('h2');
    title.id = 'twitch-consent-title';
    title.textContent = 'Lecture du live Twitch';
    const message = document.createElement('p');
    message.textContent = 'Le lecteur Twitch peut utiliser des cookies et traceurs tiers. Nous ne le chargeons qu’avec votre accord. Vous pouvez refuser sans perdre l’accès au site et changer d’avis à tout moment.';
    const actions = document.createElement('div');
    actions.className = 'cookie-actions';
    const refuse = document.createElement('button');
    refuse.className = 'btn';
    refuse.type = 'button';
    refuse.textContent = 'Refuser';
    refuse.addEventListener('click', () => saveChoice('refuse'));
    const accept = document.createElement('button');
    accept.className = 'btn';
    accept.type = 'button';
    accept.textContent = 'Accepter';
    accept.addEventListener('click', () => saveChoice('accept'));
    actions.append(refuse, accept);
    const info = document.createElement('p');
    info.className = 'cookie-info';
    const policy = document.createElement('a');
    policy.href = '#confidentialite';
    policy.textContent = 'Politique de confidentialité';
    info.append('Choix conservé jusqu’à six mois. ', policy);
    section.append(title, message, actions, info);
    document.body.append(section);
    panel = section;
    if (fromManager) refuse.focus();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-consent-manage]').forEach(button =>
      button.addEventListener('click', () => showPanel(true))
    );
    if (!readChoice()) showPanel();
  });
})();
