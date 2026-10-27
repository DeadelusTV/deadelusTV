'use strict';
/* Consentement commun aux contenus externes pour toutes les rubriques du portail.
   Aucun SDK, lecteur ou requete vers ces services n'est charge ici. */
(() => {
  const KEY = 'deadelustv_external_consent_v1';
  const LEGACY_KEY = 'deadelustv_twitch_consent_v1';
  const VERSION = 1;
  const TTL = 180 * 24 * 60 * 60 * 1000;
  // TikTok n'a actuellement qu'un lien externe. Si un lecteur est ajouté,
  // activer explicitement le service et changer VERSION pour redemander l'accord.
  const SERVICES = Object.freeze({
    twitch: {active: true, label: 'Twitch',
      summary: 'Lecteur du direct et contenus Twitch intégrés.',
      policy: 'https://legal.twitch.com/fr-fr/legal/privacy-notice/'},
    youtube: {active: true, label: 'YouTube',
      summary: 'Vidéos intégrées aux actualités et aux futurs univers.',
      policy: 'https://policies.google.com/privacy?hl=fr'},
    tiktok: {active: false, label: 'TikTok',
      summary: 'Actuellement, les liens ouvrent TikTok. Aucun lecteur intégré n’est activé.',
      policy: 'https://www.tiktok.com/legal/page/eea/privacy-policy/fr'}
  });
  let memoryRecord = null;
  let panel = null;
  let opener = null;
  let lastKnown = null;

  const emptyChoices = () => ({twitch: false, youtube: false, tiktok: false});
  function validate(record) {
    return record && record.version === VERSION &&
      Number.isFinite(record.savedAt) &&
      record.savedAt <= Date.now() && Date.now() - record.savedAt < TTL &&
      record.choices && typeof record.choices === 'object' &&
      Object.keys(SERVICES).every(key => typeof record.choices[key] === 'boolean');
  }
  function readRecord() {
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* stockage refuse */ }
    const record = validate(stored) ? stored : memoryRecord;
    return validate(record) ? record : null;
  }
  function legacyTwitchChoice() {
    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
      if (legacy && legacy.version === 1 &&
          Number.isFinite(legacy.savedAt) && legacy.savedAt <= Date.now() &&
          Date.now() - legacy.savedAt < TTL && ['accept','refuse'].includes(legacy.choice)) {
        return legacy.choice === 'accept';
      }
    } catch { /* aucune ancienne preference */ }
    return false;
  }
  function getChoices() {
    const record = readRecord();
    if (!record) return null;
    return Object.fromEntries(Object.entries(SERVICES).map(([key, service]) =>
      [key, service.active && record.choices[key] === true]));
  }
  function hasConsent(service) {
    return Object.hasOwn(SERVICES, service) &&
      SERVICES[service].active === true && getChoices()?.[service] === true;
  }
  const api = {
    hasConsent,
    hasTwitchConsent: () => hasConsent('twitch'),
    getChoices,
    getChoice: () => {
      const current = getChoices();
      return current === null ? null : (current.twitch ? 'accept' : 'refuse');
    },
    onChange: callback => {
      const listener = event => callback(event.detail);
      window.addEventListener('deadelustv:consent-change', listener);
      return () => window.removeEventListener('deadelustv:consent-change', listener);
    },
    open: () => showPanel(true)
  };
  window.DEADELUSTV_CONSENT = api;
  lastKnown = getChoices();

  function closePanel() {
    if (!panel) return;
    panel.remove();
    panel = null;
    if (opener?.isConnected) opener.focus();
    opener = null;
  }
  function saveChoices(picks) {
    const previous = lastKnown || emptyChoices();
    const choices = Object.fromEntries(Object.entries(SERVICES).map(([key, service]) =>
      [key, Boolean(service.active && picks[key])]));
    const record = {version: VERSION, savedAt: Date.now(), choices};
    memoryRecord = record;
    try {
      localStorage.setItem(KEY, JSON.stringify(record));
      localStorage.removeItem(LEGACY_KEY);
    } catch { /* preferences en memoire pour cette visite uniquement */ }
    lastKnown = choices;
    closePanel();
    const changedServices = Object.keys(SERVICES).filter(key => previous[key] !== choices[key]);
    window.dispatchEvent(new CustomEvent('deadelustv:consent-change', {
      detail: {choice: choices.twitch ? 'accept' : 'refuse', choices, changedServices}
    }));
  }

  function showPanel(fromManager = false) {
    if (panel) {
      if (fromManager) panel.querySelector('button')?.focus();
      return;
    }
    opener = fromManager ? document.activeElement : null;
    const current = getChoices();
    const picks = current || {...emptyChoices(), twitch: legacyTwitchChoice()};
    const section = document.createElement('section');
    section.className = 'cookie-panel cookie-global';
    section.setAttribute('role', 'dialog');
    section.setAttribute('aria-labelledby', 'external-consent-title');
    section.setAttribute('aria-describedby', 'external-consent-description');
    section.setAttribute('aria-modal', 'false');

    const title = document.createElement('h2');
    title.id = 'external-consent-title';
    title.textContent = 'Vos préférences de confidentialité';
    const description = document.createElement('p');
    description.id = 'external-consent-description';
    description.textContent = 'Certaines rubriques affichent des lecteurs externes qui peuvent utiliser des cookies ou d’autres traceurs. Choisissez les services à autoriser sur DeadelusTV. Refuser ne bloque pas la consultation du site.';

    const details = document.createElement('div');
    details.className = 'cookie-service-list';
    details.hidden = true;
    const controls = {};
    for (const [key, service] of Object.entries(SERVICES)) {
      const row = document.createElement('div');
      row.className = 'cookie-service';
      const label = document.createElement('label');
      label.className = 'cookie-service-label';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = Boolean(service.active && picks[key]);
      input.disabled = !service.active;
      input.dataset.consentService = key;
      controls[key] = input;
      const name = document.createElement('span');
      name.className = 'cookie-service-name';
      name.textContent = service.label + (service.active ? '' : ' (non utilisé actuellement)');
      label.append(input, name);
      const summary = document.createElement('p');
      summary.textContent = service.summary;
      const link = document.createElement('a');
      link.href = service.policy;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Confidentialité ' + service.label + ' ↗';
      row.append(label, summary, link);
      details.append(row);
    }

    const actions = document.createElement('div');
    actions.className = 'cookie-actions';
    function action(label, className, handler) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = className;
      button.textContent = label;
      button.addEventListener('click', handler);
      actions.append(button);
      return button;
    }
    const refuse = action('Tout refuser', 'btn', () => saveChoices(emptyChoices()));
    const customize = action('Personnaliser', 'btn', () => {
      details.hidden = false;
      customize.hidden = true;
      save.hidden = false;
      controls.twitch.focus();
    });
    action('Tout accepter', 'btn', () => {
      saveChoices({twitch: true, youtube: true, tiktok: false});
    });
    const save = action('Enregistrer mes choix', 'btn btn-gold', () => {
      saveChoices(Object.fromEntries(Object.entries(controls).map(([key, input]) => [key, input.checked])));
    });
    save.hidden = true;
    if (fromManager) {
      details.hidden = false;
      customize.hidden = true;
      save.hidden = false;
    }

    const info = document.createElement('p');
    info.className = 'cookie-info';
    const policy = document.createElement('a');
    policy.href = '#confidentialite';
    policy.textContent = 'Politique de confidentialité';
    info.append('Choix conservés jusqu’à six mois. Modifiables depuis le pied de page. ', policy);
    section.append(title, description, details, actions, info);
    document.body.append(section);
    panel = section;
    if (fromManager) refuse.focus();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-consent-manage]').forEach(button =>
      button.addEventListener('click', () => showPanel(true))
    );
    if (!getChoices()) showPanel();
  });
})();
