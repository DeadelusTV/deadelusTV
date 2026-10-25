/* Le panneau hors live remplace entièrement le lecteur ; aucun décor sur le live. */
(() => {
  'use strict';
  let sdkPromise;
  function loadSDK() {
    if (window.Twitch?.Player) return Promise.resolve(window.Twitch);
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://player.twitch.tv/js/embed/v1.js';
      script.async = true;
      const timeout = setTimeout(failed, 20000);
      function failed() {
        clearTimeout(timeout);
        script.remove();
        reject(new Error('Lecteur Twitch indisponible'));
      }
      script.onerror = failed;
      script.onload = () => {
        clearTimeout(timeout);
        if (window.Twitch?.Player) resolve(window.Twitch);
        else failed();
      };
      document.head.append(script);
    }).catch(error => { sdkPromise = null; throw error; });
    return sdkPromise;
  }

  class ChannelPlayer {
    constructor(root, config) {
      this.root = root;
      this.config = config;
      this.generation = 0;
      this.active = false;
      this.state = 'loading';
      root.replaceChildren();
      const panel = document.createElement('div');
      panel.className = 'twitch-offline-panel';
      const image = document.createElement('img');
      image.src = 'assets/twitch-offline.jpg';
      image.alt = '';
      image.width = 853;
      image.height = 480;
      image.className = 'twitch-offline-image';
      const copy = document.createElement('div');
      copy.className = 'twitch-offline-copy';
      const badge = document.createElement('span');
      badge.className = 'twitch-offline-badge';
      const title = document.createElement('strong');
      title.className = 'twitch-offline-title';
      const description = document.createElement('p');
      const link = document.createElement('a');
      link.className = 'btn btn-gold';
      link.href = config.twitch;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Voir la chaîne Twitch ↗';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'twitch-check-button';
      retry.textContent = 'Vérifier le live';
      retry.addEventListener('click', () => this.check());
      const actions = document.createElement('div');
      actions.className = 'twitch-offline-actions';
      actions.append(link, retry);
      copy.append(badge, title, description, actions);
      panel.append(image, copy);
      const mount = document.createElement('div');
      mount.id = 'twitch-live-mount';
      mount.className = 'twitch-live-mount';
      mount.hidden = true;
      const controls = document.createElement('div');
      controls.className = 'twitch-playback-help';
      controls.hidden = true;
      const play = document.createElement('button');
      play.type = 'button';
      play.textContent = 'Démarrer le live';
      play.className = 'btn btn-gold';
      play.addEventListener('click', () => {
        try { this.instance?.play(); } catch { /* Le lien Twitch reste disponible. */ }
      });
      controls.append(play);
      root.append(panel, mount);
      root.after(controls);
      Object.assign(this, {panel, mount, controls, badge, title, description, retry});
      this.setState('loading');
      this.onVisibility = () => {
        if (!document.hidden && this.active && this.state !== 'live') this.check();
      };
      document.addEventListener('visibilitychange', this.onVisibility);
      window.addEventListener('online', this.onVisibility);
    }

    setState(state) {
      this.state = state;
      this.root.dataset.mode = state;
      const live = state === 'live';
      this.mount.hidden = !live;
      this.panel.hidden = live;
      if (!live) this.controls.hidden = true;
      const messages = {
        loading: ['TWITCH', 'Le live DeadelusTV', 'Vérification du direct…'],
        offline: ['HORS LIVE', 'On se retrouve au prochain live.', 'Le direct démarrera ici dès son retour.'],
        unknown: ['TWITCH', 'Retrouvons-nous sur Twitch.', 'Le statut du direct est momentanément indisponible.'],
        small: ['TWITCH', 'Le live vous attend sur Twitch.', 'Ouvre la chaîne pour regarder le direct ou les rediffusions.']
      };
      if (messages[state]) {
        [this.badge.textContent, this.title.textContent, this.description.textContent] = messages[state];
      }
      this.retry.hidden = ['loading', 'small'].includes(state);
    }

    stop() {
      this.generation++;
      clearTimeout(this.watchdog);
      clearTimeout(this.poll);
      try { this.instance?.destroy(); } catch { /* Supprimer l'iframe suffit au repli. */ }
      this.instance = null;
      this.mount.replaceChildren();
      this.mount.hidden = true;
      this.controls.hidden = true;
    }

    scheduleCheck() {
      clearTimeout(this.poll);
      this.poll = setTimeout(() => {
        if (this.active && !document.hidden && this.state !== 'live') this.check();
        else if (this.active && this.state !== 'live') this.scheduleCheck();
      }, 60000);
    }

    async check() {
      if (!this.active) return;
      this.stop();
      const generation = this.generation;
      const current = () => this.active && generation === this.generation;
      this.setState('loading');
      try {
        const Twitch = await loadSDK();
        if (!current()) return;
        const parents = [location.hostname, ...(this.config.twitchExtraParents || [])];
        this.instance = new Twitch.Player(this.mount.id, {
          channel: this.config.channel,
          width: '100%', height: '100%',
          parent: [...new Set(parents)], autoplay: true, muted: true
        });
        const instance = this.instance;
        const listen = (event, callback) => instance.addEventListener(event, () => {
          if (current()) callback();
        });
        listen(Twitch.Player.READY, () => instance.setMuted(true));
        listen(Twitch.Player.OFFLINE, () => {
          clearTimeout(this.watchdog);
          this.setState('offline');
          this.scheduleCheck();
        });
        listen(Twitch.Player.ONLINE, () => {
          clearTimeout(this.watchdog);
          clearTimeout(this.poll);
          this.setState('live');
          instance.setMuted(true);
          instance.play();
        });
        listen(Twitch.Player.PLAYING, () => {
          clearTimeout(this.watchdog);
          clearTimeout(this.poll);
          this.setState('live');
          this.controls.hidden = true;
        });
        listen(Twitch.Player.PLAYBACK_BLOCKED, () => {
          if (this.state === 'live') this.controls.hidden = false;
        });
        // Une fin de lecture ne prouve pas que la chaîne est hors ligne.
        listen(Twitch.Player.ENDED, () => {
          if (this.state === 'live') this.setState('unknown');
          this.scheduleCheck();
        });
        this.watchdog = setTimeout(() => {
          if (current() && this.state === 'loading') {
            this.setState('unknown');
            this.scheduleCheck();
          }
        }, 20000);
      } catch {
        if (!current()) return;
        this.setState('unknown');
        this.scheduleCheck();
      }
    }

    sync() {
      const visible = !this.root.closest('[data-page]').hidden;
      const secure = location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname);
      const largeEnough = this.root.clientWidth >= 400;
      if (!visible || !secure || !largeEnough) {
        this.active = false;
        this.stop();
        this.setState(!visible ? 'loading' : !largeEnough ? 'small' : 'unknown');
        this.retry.hidden = true;
        return;
      }
      if (this.active) return;
      this.active = true;
      this.check();
    }
  }

  let controller;
  window.DEADELUSTV_TWITCH = {
    sync(root, config) {
      if (!controller) controller = new ChannelPlayer(root, config);
      controller.sync();
    }
  };
})();
