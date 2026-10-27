/* Easter egg : une seule ombre à la fois, dans une cachette prévue.
   Les emplacements sont volontaires pour ne jamais recouvrir une action du site. */
(() => {
  'use strict';

  const emplacements = {
    accueil: [
      { cible: '.welcome', position: 'bas', forme: 'partielle' },
      { cible: '.universes', position: 'haut', forme: 'yeux' }
    ],
    tcg: [
      { cible: '.page-header, .tcg-awaiting__copy', position: 'bas', forme: 'partielle' },
      { cible: '.tcg-demo, .tcg-awaiting__after', position: 'haut', forme: 'entiere' }
    ],
    phasmophobia: [
      { cible: '.page-header', position: 'bas', forme: 'yeux' },
      { cible: '.faq-list, .phasma-resources', position: 'haut', forme: 'partielle' }
    ],
    crewmongus: [
      { cible: '.breadcrumb', position: 'haut', forme: 'partielle' }
    ],
    'jeux-de-role': [
      { cible: '.page-header', position: 'bas', forme: 'partielle' }
    ],
    'pavillon-noir': [
      { cible: '.breadcrumb', position: 'haut', forme: 'yeux' },
      { cible: '.pn-heading', position: 'haut', forme: 'partielle' }
    ]
  };

  const PARAMETRES = new URLSearchParams(window.location.search);
  const forcer = PARAMETRES.get('ombre') === '1'; // Aperçu : ?ombre=1#accueil
  const desactiver = PARAMETRES.get('ombre') === '0';

  function afficher() {
    document.querySelectorAll('.ombre-visiteuse').forEach(el => el.remove());
    if (desactiver) return;

    // L'application existante masque ses pages inactives avec [hidden].
    const page = document.querySelector('[data-page]:not([hidden])');
    if (!page) return;
    const cachettes = (emplacements[page.dataset.page] || [])
      .map(item => ({ ...item, element: page.querySelector(item.cible) }))
      .filter(item => item.element);

    // Certaines visites restent sans apparition : le secret reste discret.
    if (!cachettes.length || (!forcer && Math.random() < 0.20)) return;
    const choix = cachettes[Math.floor(Math.random() * cachettes.length)];
    const ombre = document.createElement('span');
    ombre.className = 'ombre-visiteuse'
      + (choix.position === 'bas' ? ' ombre-visiteuse--bas' : '')
      + (choix.position === 'gauche' ? ' ombre-visiteuse--gauche' : '')
      + (choix.forme === 'partielle' ? ' ombre-visiteuse--partielle' : '')
      + (choix.forme === 'yeux' ? ' ombre-visiteuse--yeux' : '');
    ombre.setAttribute('aria-hidden', 'true');

    const image = document.createElement('img');
    image.src = 'assets/ombre-curieuse.svg';
    image.alt = '';
    image.width = 58;
    image.height = 58;
    image.decoding = 'async';
    image.draggable = false;
    ombre.appendChild(image);
    choix.element.appendChild(ombre);
  }

  // app.js gère le changement de rubrique ; on intervient juste après.
  window.addEventListener('hashchange', () => window.requestAnimationFrame(afficher));
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', afficher, { once: true });
  } else {
    afficher();
  }
})();
