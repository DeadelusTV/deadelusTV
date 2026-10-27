'use strict';
/* Point d'entree pour les lecteurs YouTube integres aux futurs modules.
   Toujours appeler mountYouTube plutot que creer une iframe directement. */
(() => {
  const players = new Map();
  const validID = id => typeof id === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(id);

  function render(container, id, title) {
    if (!container.isConnected) {
      players.delete(container);
      return;
    }
    container.replaceChildren();
    if (!window.DEADELUSTV_CONSENT?.hasConsent('youtube')) {
      const message = document.createElement('p');
      message.className = 'youtube-embed-placeholder';
      message.textContent = 'Cette vidéo est hébergée sur YouTube. Le lecteur est désactivé selon vos préférences.';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-outline';
      button.textContent = 'Gérer mes préférences YouTube';
      button.addEventListener('click', () => window.DEADELUSTV_CONSENT?.open());
      container.append(message, button);
      return;
    }
    const frame = document.createElement('iframe');
    frame.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id);
    frame.title = title || 'Vidéo YouTube';
    frame.loading = 'lazy';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    frame.allowFullscreen = true;
    frame.className = 'youtube-embed-frame';
    container.append(frame);
  }

  window.DEADELUSTV_EMBEDS = Object.freeze({
    mountYouTube(container, id, title = '') {
      if (!container || typeof container.replaceChildren !== 'function' || !validID(id)) {
        return false;
      }
      players.set(container, {id, title});
      render(container, id, title);
      return true;
    },
    unmount(container) {
      if (!players.has(container)) return;
      players.delete(container);
      container.replaceChildren();
    },
    refresh() {
      for (const [container, {id, title}] of players) render(container, id, title);
    }
  });

  window.DEADELUSTV_CONSENT?.onChange(detail => {
    if (!detail.changedServices || detail.changedServices.includes('youtube')) {
      window.DEADELUSTV_EMBEDS.refresh();
    }
  });

  // Un module peut fournir directement un bloc : data-youtube-embed="VIDEO_ID".
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-youtube-embed]').forEach(container =>
      window.DEADELUSTV_EMBEDS.mountYouTube(
        container, container.dataset.youtubeEmbed,
        container.dataset.youtubeTitle || 'Vidéo YouTube'
      )
    );
  });
})();
