/* Mini-lecteur Twitch persistant dans le portail SPA.
 * L'iframe n'est jamais deplacee dans le DOM apres sa creation.
 */
(() => {
  'use strict';
  const FLOAT_WIDTH = 540;
  const EDGE = 16;
  let anchor, dock, reopen, controller;
  let closed = false;
  let remoteStarting = false;
  let animationFrame = 0;

  const consented = () => window.DEADELUSTV_CONSENT?.hasTwitchConsent() === true;
  const canFloat = () => window.innerWidth >= 780 && window.innerHeight >= 450;

  function isHomeVisible() {
    const home = anchor?.closest('[data-page]');
    return !!home && !home.hidden;
  }

  function fullyVisible(rect) {
    if (!rect || rect.width < 400 || rect.height < 300) return false;
    const headerBottom = document.querySelector('.site-header')?.getBoundingClientRect().bottom || 0;
    return rect.top >= Math.max(0, headerBottom) + 18 &&
      rect.bottom <= window.innerHeight - 18 &&
      rect.left >= 12 && rect.right <= window.innerWidth - 12;
  }

  function refresh() {
    if (!dock || !controller || !anchor) return;
    const home = isHomeVisible();
    const rect = home ? anchor.getBoundingClientRect() : null;
    const live = controller.active && controller.state === 'live' && consented();
    const floating = !closed && live && canFloat() && (!home || !fullyVisible(rect));

    reopen.hidden = !closed || !consented();
    anchor.dataset.closed = closed ? 'true' : 'false';

    if (closed || (!home && !floating)) {
      dock.hidden = true;
      return;
    }
    dock.hidden = false;
    dock.classList.toggle('is-floating', floating);
    if (floating) {
      dock.style.left = EDGE + 'px';
      dock.style.top = 'auto';
      dock.style.bottom = EDGE + 'px';
      dock.style.width = FLOAT_WIDTH + 'px';
    } else {
      dock.style.bottom = 'auto';
      dock.style.top = rect.top + 'px';
      dock.style.left = rect.left + 'px';
      dock.style.width = rect.width + 'px';
    }
  }

  function queueRefresh() {
    if (animationFrame) return;
    animationFrame = requestAnimationFrame(() => {
      animationFrame = 0;
      refresh();
    });
  }

  function closeFloating() {
    if (!controller || !dock.classList.contains('is-floating')) return;
    closed = true;
    remoteStarting = false;
    controller.active = false;
    controller.stop(); // ferme aussi la diffusion audio
    controller.setState('loading');
    refresh();
    reopen.focus();
  }

  function resume() {
    if (!controller || !consented()) return;
    closed = false;
    remoteStarting = !isHomeVisible() && canFloat();
    refresh();
    controller.sync(); // reprise volontaire, pas de lecture cachee
  }

  function setup(root, controls, playerController) {
    if (dock) return;
    controller = playerController;
    anchor = document.createElement('div');
    anchor.className = 'twitch-player-placeholder';
    anchor.setAttribute('aria-hidden', 'true');
    root.before(anchor);

    dock = document.createElement('div');
    dock.className = 'twitch-player-dock';
    dock.hidden = true;
    const toolbar = document.createElement('div');
    toolbar.className = 'twitch-float-bar';
    const title = document.createElement('span');
    title.textContent = 'DEADELUSTV · EN DIRECT';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'twitch-float-close';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Fermer le mini-lecteur Twitch');
    close.addEventListener('click', closeFloating);
    toolbar.append(title, close);
    dock.append(toolbar, root, controls);
    document.body.append(dock);

    reopen = document.createElement('button');
    reopen.type = 'button';
    reopen.className = 'twitch-float-reopen';
    reopen.textContent = 'Rouvrir le lecteur Twitch';
    reopen.hidden = true;
    reopen.addEventListener('click', resume);
    document.body.append(reopen);

    window.addEventListener('scroll', queueRefresh, {passive: true});
    window.addEventListener('resize', queueRefresh);
    window.addEventListener('deadelustv:consent-change', () => {
      if (!consented()) {
        closed = false;
        remoteStarting = false;
      }
      queueRefresh();
    });
    refresh();
  }

  window.DEADELUSTV_TWITCH_FLOAT = {
    setup,
    refresh,
    isHomeVisible,
    shouldPersist(playerController) {
      return consented() && !closed && canFloat() &&
        (playerController.state === 'live' || remoteStarting);
    },
    onState(state) {
      if (state === 'live' || ['blocked', 'offline', 'unknown', 'small'].includes(state)) {
        remoteStarting = false;
      }
      refresh();
    }
  };
})();
