'use strict';
/* Prototype de carnet interactif Phasmophobia.
   Les onglets et la navigation fonctionnent ; aucune information du bot Discord
   n'est inventée. Importer plus tard uniquement les fiches validées. */
(() => {
  const dialog = document.getElementById('phasma-book-dialog');
  if (!dialog) return;

  const spread = dialog.querySelector('.phasma-book-spread');
  const title = dialog.querySelector('#phasma-book-title');
  const intro = dialog.querySelector('#phasma-book-intro');
  const overline = dialog.querySelector('#phasma-book-overline');
  const rightTitle = dialog.querySelector('#phasma-book-right-title');
  const content = dialog.querySelector('#phasma-book-content');
  const folioLeft = dialog.querySelector('#phasma-book-folio-left');
  const folioRight = dialog.querySelector('#phasma-book-folio-right');
  const counter = dialog.querySelector('#phasma-book-counter');
  const prev = dialog.querySelector('[data-phasma-page-prev]');
  const next = dialog.querySelector('[data-phasma-page-next]');
  const tabs = Array.from(dialog.querySelectorAll('[data-phasma-chapter]'));
  const openers = Array.from(document.querySelectorAll('[data-phasma-open]'));
  const openerTabs = Array.from(document.querySelectorAll('[data-phasma-open-category]'));
  const close = dialog.querySelector('[data-phasma-close]');

  const chapters = [
    {
      id: 'sommaire',
      label: 'Sommaire',
      overline: 'Bienvenue à bord',
      intro: 'Un journal à feuilleter pour retrouver les ressources Phasmophobia partagées avec la communauté.',
      rightTitle: 'Table des matières',
    },
    {
      id: 'entites',
      label: 'Entités',
      overline: 'Carnet de terrain · 01',
      intro: 'Cette rubrique regroupera les fiches sur les entités, après reprise et validation des informations du bot Discord.',
      rightTitle: 'Fiches des entités',
      example: '!obambo',
    },
    {
      id: 'cartes',
      label: 'Cartes',
      overline: 'Carnet de terrain · 02',
      intro: 'Cette rubrique accueillera les fiches des lieux d’enquête et leurs informations utiles.',
      rightTitle: 'Fiches des cartes',
      example: '!bleasdale',
    },
    {
      id: 'equipements',
      label: 'Équipements',
      overline: 'Carnet de terrain · 03',
      intro: 'Cette rubrique sera dédiée aux équipements et aux ressources associées.',
      rightTitle: 'Fiches des équipements',
    },
    {
      id: 'conseils',
      label: 'Conseils',
      overline: 'Carnet de terrain · 04',
      intro: 'Cette rubrique accueillera les conseils et méthodes présents dans les ressources de DeadelusTV.',
      rightTitle: 'Conseils et méthodes',
    },
  ];

  let current = 0;
  let isTurning = false;
  let activeTrigger = null;
  let turnTimer = null;

  const el = (tag, className, contentText) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (contentText !== undefined) node.textContent = contentText;
    return node;
  };

  function fillContent(chapter) {
    content.replaceChildren();
    if (chapter.id === 'sommaire') {
      const description = el('p', '', 'Choisis une rubrique dans le carnet ou utilise les onglets sur le côté.');
      content.appendChild(description);
      chapters.slice(1).forEach((item, offset) => {
        const entry = el('button', 'phasma-book-entry', String(offset + 1).padStart(2, '0') + ' · ' + item.label);
        entry.type = 'button';
        entry.addEventListener('click', () => navigateTo(offset + 1));
        content.appendChild(entry);
      });
    } else {
      content.appendChild(el('p', '', 'Les fiches de cette catégorie seront intégrées à partir des informations validées du bot Discord.'));
      const placeholder = el('div', 'phasma-book-placeholder', 'Contenu en préparation. Aucune donnée de jeu n’est ajoutée dans cette démonstration.');
      if (chapter.example) {
        placeholder.appendChild(document.createElement('br'));
        placeholder.appendChild(el('span', 'phasma-book-example', chapter.example));
        placeholder.appendChild(el('span', '', ' · commande Discord à reprendre'));
      }
      content.appendChild(placeholder);
    }
  }

  function render(index) {
    const chapter = chapters[index];
    overline.textContent = chapter.overline;
    title.textContent = chapter.label === 'Sommaire' ? 'Journal des enquêteurs' : chapter.label;
    intro.textContent = chapter.intro;
    rightTitle.textContent = chapter.rightTitle;
    fillContent(chapter);

    const leftNumber = index * 2 + 1;
    folioLeft.textContent = String(leftNumber).padStart(2, '0');
    folioRight.textContent = String(leftNumber + 1).padStart(2, '0');
    counter.textContent = 'Double page ' + (index + 1) + ' / ' + chapters.length;

    tabs.forEach(tab => {
      const selected = tab.dataset.phasmaChapter === chapter.id;
      if (selected) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    });
    prev.disabled = index === 0;
    next.disabled = index === chapters.length - 1;
  }

  function navigateTo(index) {
    if (index < 0 || index >= chapters.length || index === current || isTurning) return;
    const forward = index > current;
    const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      current = index;
      render(current);
      return;
    }
    isTurning = true;
    spread.classList.add(forward ? 'is-turning-forward' : 'is-turning-back');
    turnTimer = window.setTimeout(() => {
      current = index;
      render(current);
    }, 155);
    window.setTimeout(() => {
      spread.classList.remove('is-turning-forward', 'is-turning-back');
      isTurning = false;
    }, 360);
  }

  function openBook(chapterId, trigger) {
    if (dialog.open) return;
    activeTrigger = trigger || document.activeElement;
    const selected = chapters.findIndex(chapter => chapter.id === chapterId);
    current = selected >= 0 ? selected : 0;
    render(current);
    dialog.showModal();
    document.body.classList.add('dialog-open');
    close.focus();
  }

  openers.forEach(button => button.addEventListener('click', () => openBook('sommaire', button)));
  openerTabs.forEach(button => button.addEventListener('click', () => openBook(button.dataset.phasmaOpenCategory, button)));
  tabs.forEach(button => button.addEventListener('click', () => navigateTo(chapters.findIndex(ch => ch.id === button.dataset.phasmaChapter))));
  prev.addEventListener('click', () => navigateTo(current - 1));
  next.addEventListener('click', () => navigateTo(current + 1));
  close.addEventListener('click', () => dialog.close());

  dialog.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey ||
        event.target.closest('input, textarea, select')) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      navigateTo(current + 1);
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      navigateTo(current - 1);
    }
  });
  dialog.addEventListener('close', () => {
    window.clearTimeout(turnTimer);
    spread.classList.remove('is-turning-forward', 'is-turning-back');
    isTurning = false;
    document.body.classList.remove('dialog-open');
    if (activeTrigger && activeTrigger.isConnected) activeTrigger.focus({preventScroll: true});
    activeTrigger = null;
  });
  window.addEventListener('hashchange', () => {
    if (dialog.open) dialog.close();
  });
  render(0);
})();
