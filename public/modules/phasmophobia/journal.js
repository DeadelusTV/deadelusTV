'use strict';
/* Journal V2 : noms visibles dans les captures de référence Discord.
   Sommaire et navigation réels ; aucune fiche de gameplay inventée. */
(() => {
  const dialog = document.getElementById('phasma-book-dialog');
  if (!dialog) return;
  const book = dialog.querySelector('.phasma-book-book');
  const left = dialog.querySelector('#phasma-book-left');
  const right = dialog.querySelector('#phasma-book-right');
  const pageLeft = dialog.querySelector('.phasma-book-page--left');
  const pageRight = dialog.querySelector('.phasma-book-page--right');
  const prev = dialog.querySelector('[data-phasma-page-prev]');
  const next = dialog.querySelector('[data-phasma-page-next]');
  const status = dialog.querySelector('#phasma-book-status');
  const backHome = dialog.querySelector('[data-phasma-home]');
  const close = dialog.querySelector('[data-phasma-close]');
  const openers = Array.from(document.querySelectorAll('[data-phasma-open]'));
  const quickLinks = Array.from(document.querySelectorAll('[data-phasma-open-category]'));
  const mobile = window.matchMedia('(max-width: 690px)');

  // Noms reproduits d'après le SOMMAIRE Discord : transcription à faire valider
  // avant d'en faire la source officielle des fiches.
  const groups = {
    entites: {
      title: 'Les Entités', columns: 3, names: [
        'Aswang', 'Deildegast', 'Gallu', 'Djinn', 'Moroi', 'Obambo',
        'Fantôme', 'Revenant', 'Thaye', 'Spectre',
        'Banshee', 'Démon', 'Goryo', 'Kormos', 'Myling', 'Oni',
        'Poltergeist', 'Ombre', 'Mimic', 'Yokai',
        'Dayan', 'Deogen', 'Hantu', 'Cauchemar', 'Obake',
        'Onryo', 'Raiju', 'Esprit', 'Jumeaux', 'Yurei'
      ]
    },
    equipements: {
      title: 'Les Équipements', columns: 4, names: [
        'Briquet', 'Casque', 'Livre', 'Parabolique', 'Thermomètre', 'UV',
        'Bougie', 'Crucifix', 'Enregistreur', 'Photo', 'Sel',
        'Caméra', 'Détecteur', 'Encens', 'Pilule', 'Torche',
        'Capteur sonore', 'DOTS', 'EMF', 'Spirit', 'Trépied'
      ]
    },
    cartes: {
      title: 'Les Maps', columns: 4, names: [
        'Asile', 'Grafton', 'Point Hope', 'Willow',
        'Bleasdale', 'Grandcamp', 'Prison',
        'École', 'Nellsdiner', 'Ridgeview',
        'Edgefield', 'Petitcamp', 'Tanglewood'
      ]
    },
    objets: {
      title: 'Les Objets Maudits', columns: 3, names: [
        'Boîte à musique', 'Patte de singe', 'Miroir',
        'Pentacle', 'Ouija', 'Tarot', 'Vaudoo'
      ]
    },
    divers: {
      title: 'Divers', columns: 3, names: [
        'Média photo', 'Moniteur activité', 'Chasse', 'Média sons',
        'Moniteur santé', 'Média vidéo', 'Pense-bête'
      ]
    }
  };
  const order = ['sommaire', 'entites', 'equipements', 'cartes', 'objets', 'divers'];
  let view = { type: 'spread', group: 'sommaire', name: null };
  let mobileSide = 'left';
  let activeTrigger = null;

  function element(tag, className, label) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (label !== undefined) node.textContent = label;
    return node;
  }

  function paragraph(container, label, kind = 'phasma-book-text') {
    container.append(element('p', kind, label));
  }

  function heading(container, label, kind = 'phasma-book-heading') {
    container.append(element('h2', kind, label));
  }

  function goTo(group, name = null) {
    if (!groups[group] && group !== 'sommaire') return;
    if (name && !groups[group].names.includes(name)) return;
    view = name ? {type: 'entry', group, name} : {type: 'spread', group, name: null};
    mobileSide = 'left';
    draw();
  }

  function backButton(container, label = '← Revenir au sommaire') {
    const btn = element('button', 'phasma-book-back', label);
    btn.type = 'button';
    btn.addEventListener('click', () => goTo('sommaire'));
    container.append(btn);
  }

  function indexSection(container, key) {
    const group = groups[key];
    const section = element('section', 'phasma-index-section');
    section.append(element('h3', 'phasma-index-title', group.title));
    const grid = element('div', 'phasma-index-links');
    grid.style.setProperty('--cols', String(group.columns));
    for (const name of group.names) {
      const btn = element('button', 'phasma-index-link', name);
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Ouvrir la fiche ' + name);
      btn.addEventListener('click', () => goTo(key, name));
      grid.append(btn);
    }
    section.append(grid);
    container.append(section);
  }

  function renderSommaire() {
    indexSection(left, 'entites');
    indexSection(left, 'equipements');
    indexSection(right, 'cartes');
    indexSection(right, 'objets');
    indexSection(right, 'divers');
  }

  function renderCategory(key) {
    const group = groups[key];
    heading(left, group.title);
    paragraph(left, 'Choisis un nom pour ouvrir sa fiche.');
    indexSection(left, key);
    heading(right, 'Notes de terrain', 'phasma-book-subhead');
    paragraph(right, 'Les informations détaillées seront ajoutées depuis les ressources Discord de DeadelusTV, après vérification.');
    const message = element('div', 'phasma-book-alert',
      'Pour l’instant, les titres et les liens sont interactifs, mais les fiches restent en préparation.');
    right.append(message);
    backButton(right);
  }

  function renderEntry(key, name) {
    heading(left, name);
    paragraph(left, groups[key].title);
    paragraph(left, 'Emplacement prévu pour les illustrations et informations de la fiche.');
    const goBack = element('button', 'phasma-book-back', '← Liste de cette rubrique');
    goBack.type = 'button';
    goBack.addEventListener('click', () => goTo(key));
    left.append(goBack);
    heading(right, 'À compléter', 'phasma-book-subhead');
    paragraph(right,
      'Cette fiche est volontairement vide : les données, images, preuves et conseils seront repris du bot Discord puis validés avant publication.');
    right.append(element('div', 'phasma-book-alert', 'Aucune information de jeu n’a été inventée pour ce prototype.'));
    backButton(right);
  }

  function spreadNumber() {
    const index = Math.max(0, order.indexOf(view.group));
    return index * 2 + 1;
  }

  function updateControls() {
    const current = order.indexOf(view.group);
    if (mobile.matches) {
      // Sur téléphone : les languettes tournent réellement une page à la fois.
      prev.disabled = view.type === 'spread' && current === 0 && mobileSide === 'left';
      next.disabled = view.type === 'spread' && current === order.length - 1 && mobileSide === 'right';
      book.dataset.mobileSide = mobileSide;
    } else {
      prev.disabled = view.type === 'spread' && current === 0;
      next.disabled = view.type === 'spread' && current === order.length - 1;
      book.dataset.mobileSide = 'left';
    }
  }

  function draw() {
    left.replaceChildren();
    right.replaceChildren();
    if (view.type === 'entry') renderEntry(view.group, view.name);
    else if (view.group === 'sommaire') renderSommaire();
    else renderCategory(view.group);

    const number = spreadNumber();
    dialog.querySelector('#phasma-book-folio-left').textContent = String(number).padStart(2, '0');
    dialog.querySelector('#phasma-book-folio-right').textContent = String(number + 1).padStart(2, '0');
    if (view.type === 'entry') status.textContent = 'Fiche : ' + view.name + ' · prototype';
    else status.textContent = view.group === 'sommaire' ? 'Sommaire · carnet de DeadelusTV'
      : groups[view.group].title + ' · aperçu';
    backHome.disabled = view.type === 'spread' && view.group === 'sommaire';
    updateControls();
    pageLeft.scrollTop = 0;
    pageRight.scrollTop = 0;
    pageLeft.classList.remove('is-changing');
    pageRight.classList.remove('is-changing');
    // Effet de texte discret uniquement. Faux pivot de demi-page V1 supprimé.
    void pageLeft.offsetWidth;
    pageLeft.classList.add('is-changing');
    pageRight.classList.add('is-changing');
  }

  function page(direction) {
    if (mobile.matches) {
      if (direction > 0 && mobileSide === 'left') {
        mobileSide = 'right'; updateControls(); return;
      }
      if (direction < 0 && mobileSide === 'right') {
        mobileSide = 'left'; updateControls(); return;
      }
    }
    if (view.type === 'entry') {
      const list = groups[view.group].names;
      const idx = list.indexOf(view.name) + direction;
      if (idx >= 0 && idx < list.length) {
        goTo(view.group, list[idx]);
      } else {
        goTo(view.group);
      }
      if (mobile.matches && direction < 0) mobileSide = 'right';
      updateControls();
      return;
    }
    const index = order.indexOf(view.group) + direction;
    if (index < 0 || index >= order.length) return;
    goTo(order[index]);
    if (mobile.matches && direction < 0) mobileSide = 'right';
    updateControls();
  }

  function openBook(group, trigger) {
    activeTrigger = trigger || document.activeElement;
    goTo(groups[group] ? group : 'sommaire');
    dialog.showModal();
    document.body.classList.add('dialog-open');
    close.focus();
  }
  openers.forEach(button => button.addEventListener('click', () => openBook('sommaire', button)));
  quickLinks.forEach(button => button.addEventListener('click',
    () => openBook(button.dataset.phasmaOpenCategory, button)));
  prev.addEventListener('click', () => page(-1));
  next.addEventListener('click', () => page(1));
  backHome.addEventListener('click', () => goTo('sommaire'));
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey ||
        event.target.closest('input, textarea, select')) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); page(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); page(-1); }
    if (event.key === 'Home') { event.preventDefault(); goTo('sommaire'); }
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    if (activeTrigger?.isConnected) activeTrigger.focus({preventScroll: true});
    activeTrigger = null;
  });
  window.addEventListener('hashchange', () => { if (dialog.open) dialog.close(); });
  mobile.addEventListener('change', updateControls);
  draw();
})();

