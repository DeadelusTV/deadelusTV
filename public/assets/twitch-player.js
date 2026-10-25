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
      // Texte néon indépendant du bandeau, pour modifier l'horaire sans refaire l'image.
      const neon = document.createElement('div');
      neon.className = 'twitch-neon-message';
      neon.setAttribute('aria-label', 'Écran hors ligne');
      const neonTitle = document.createElement('strong');
      neonTitle.className = 'twitch-neon-title';
      const neonText = String(config.offlineTitle || 'HORS LIGNE');
      neonTitle.setAttribute('aria-label', neonText);
      for (const character of neonText) {
        const letter = document.createElement('span');
        letter.className = 'letter';
        letter.textContent = character === ' ' ? '\u00a0' : character;
        letter.setAttribute('aria-hidden', 'true');
        neonTitle.append(letter);
      }
      const neonSubtitle = document.createElement('span');
      neonSubtitle.className = 'twitch-neon-subtitle';
      neonSubtitle.textContent = String(config.offlineSubtitle || 'Rendez-vous à 21h en live');
      neon.append(neonTitle, neonSubtitle);
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
      panel.append(image, neon, copy);
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
      Object.assign(this, {panel, mount, controls, badge, title, description, retry, neon, copy});
      this.setState('loading');
      this.onVisibility = () => {
        if (!document.hidden && this.active && this.state !== 'live') this.check();
        else this.updateFlicker();
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
      this.neon.hidden = state !== 'offline';
      // Pendant le chargement, seul le bandeau reste visible (sans texte ni bouton).
      this.copy.hidden = state === 'offline' || state === 'loading';
      this.updateFlicker();
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

    updateFlicker() {
      clearTimeout(this.flickerTimer);
      this.neon.querySelectorAll('.letter.flicker').forEach(letter => letter.classList.remove('flicker'));
      if (this.state !== 'offline' || document.hidden ||
          window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const loop = () => {
        this.flickerTimer = setTimeout(() => {
          if (this.state !== 'offline' || document.hidden) return;
          const letters = [...this.neon.querySelectorAll('.letter')]
            .filter(letter => letter.textContent.trim());
          const count = Math.random() < .23 ? 2 : 1;
          for (let i = 0; i < count && letters.length; i++) {
            const index = Math.floor(Math.random() * letters.length);
            const letter = letters.splice(index, 1)[0];
            letter.classList.remove('flicker');
            void letter.offsetWidth;
            letter.classList.add('flicker');
            letter.addEventListener('animationend',
              () => letter.classList.remove('flicker'), {once: true});
          }
          loop();
        }, 2100 + Math.random() * 4100);
      };
      loop();
    }

    stop() {
      this.generation++;
      clearTimeout(this.watchdog);
      clearTimeout(this.poll);
      clearTimeout(this.startupTimer);
      cancelAnimationFrame(this.startupFrame);
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

    async check(showLive = false) {
      if (!this.active) return;
      this.stop();
      const generation = this.generation;
      const current = () => this.active && generation === this.generation;
      this.setState(showLive ? 'live' : 'loading');
      try {
        const Twitch = await loadSDK();
        if (!current()) return;
        if (showLive) {
          // Twitch vérifie la visibilité au chargement de l'iframe : créer un
          // nouveau lecteur après affichage du cadre, plutôt que réutiliser la sonde masquée.
          await new Promise(resolve => requestAnimationFrame(resolve));
          if (!current()) return;
        }
        const parents = [location.hostname, ...(this.config.twitchExtraParents || [])];
        this.instance = new Twitch.Player(this.mount.id, {
          channel: this.config.channel,
          width: '100%', height: '100%',
          parent: [...new Set(parents)], autoplay: showLive, muted: true
        });
        const instance = this.instance;
        const listen = (event, callback) => instance.addEventListener(event, () => {
          if (current()) callback();
        });
        let ready = false;
        let online = false;
        let startupQueued = false;
        const beginPlayback = () => {
          if (!showLive || !ready || !online || startupQueued) return;
          startupQueued = true;
          this.startupFrame = requestAnimationFrame(() => {
            if (!current() || this.state !== 'live') return;
            this.startupTimer = setTimeout(() => {
              if (current() && this.state === 'live') this.controls.hidden = false;
            }, 8000);
            try {
              instance.setMuted(true);
              instance.play();
            } catch {
              clearTimeout(this.startupTimer);
              this.controls.hidden = false;
            }
          });
        };
        listen(Twitch.Player.READY, () => {
          ready = true;
          instance.setMuted(true);
          beginPlayback();
        });
        listen(Twitch.Player.OFFLINE, () => {
          clearTimeout(this.watchdog);
          clearTimeout(this.startupTimer);
          cancelAnimationFrame(this.startupFrame);
          online = false;
          this.setState('offline');
          this.scheduleCheck();
        });
        listen(Twitch.Player.ONLINE, () => {
          if (!showLive || this.state !== 'live') {
            this.check(true);
            return;
          }
          clearTimeout(this.watchdog);
          clearTimeout(this.poll);
          online = true;
          beginPlayback();
        });
        // PLAYING peut également concerner une rediffusion : seul ONLINE confirme le direct.
        listen(Twitch.Player.PLAYING, () => {
          if (this.state === 'live') {
            clearTimeout(this.startupTimer);
            this.controls.hidden = true;
          }
        });
        listen(Twitch.Player.PLAYBACK_BLOCKED, () => {
          if (this.state === 'live') {
            clearTimeout(this.startupTimer);
            this.controls.hidden = false;
          }
        });
        // Une fin de lecture ne prouve pas que la chaîne est hors ligne.
        listen(Twitch.Player.ENDED, () => {
          clearTimeout(this.startupTimer);
          cancelAnimationFrame(this.startupFrame);
          if (this.state === 'live') this.setState('unknown');
          this.scheduleCheck();
        });
        this.watchdog = setTimeout(() => {
          if (current() && this.state === 'loading') {
            this.setState('unknown');
            this.scheduleCheck();
          } else if (current() && showLive && this.state === 'live') {
            this.controls.hidden = false;
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
