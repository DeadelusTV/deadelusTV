'use strict';
/* Prototype du mini-lecteur : simulations DOM sans Twitch ni requetes reseau. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class Element {
  constructor(tag = 'div') {
    this.tagName = tag;
    this.children = [];
    this.parent = null;
    this.dataset = {};
    this.style = {};
    this.hidden = false;
    this.className = '';
    this.attributes = {};
    this.listeners = new Map();
    this.moved = 0;
    this.classList = {
      contains: c => this.className.split(' ').includes(c),
      toggle: (c, enabled) => {
        const classes = new Set(this.className.split(' ').filter(Boolean));
        if (enabled === undefined ? !classes.has(c) : enabled) classes.add(c);
        else classes.delete(c);
        this.className = [...classes].join(' ');
      }
    };
  }
  append(...nodes) {
    for (const node of nodes) {
      if (node.parent) node.parent.children = node.parent.children.filter(x => x !== node);
      node.parent = this;
      this.children.push(node);
      node.moved++;
    }
  }
  before(node) {
    assert.ok(this.parent, 'le noeud a un parent');
    const ix = this.parent.children.indexOf(this);
    this.parent.children.splice(ix, 0, node);
    node.parent = this.parent;
  }
  closest(selector) {
    let node = this.parent;
    while (node) {
      if (selector === '[data-page]' && node.dataset.page) return node;
      node = node.parent;
    }
    return null;
  }
  addEventListener(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(callback);
  }
  click() { for (const fn of this.listeners.get('click') || []) fn(); }
  focus() { this.focused = true; }
  setAttribute(name, value) { this.attributes[name] = value; }
  getBoundingClientRect() { return this.rect || {left:20, top:330, right:920, bottom:836, width:900, height:506}; }
}
function createEnv({consent = true, width = 1400, height = 800, state = 'live'} = {}) {
  let allowed = consent;
  let stopCount = 0;
  let syncCount = 0;
  const events = new Map();
  const window = {
    innerWidth: width,
    innerHeight: height,
    DEADELUSTV_CONSENT: {hasTwitchConsent: () => allowed},
    addEventListener(name, fn) {
      if (!events.has(name)) events.set(name, []);
      events.get(name).push(fn);
    },
    emit(name) { for (const fn of events.get(name) || []) fn(); }
  };
  const body = new Element('body');
  const home = new Element('section');
  home.dataset.page = 'accueil';
  const root = new Element('div');
  const controls = new Element('div');
  home.append(root, controls);
  body.append(home);
  const header = new Element('header');
  header.rect = {bottom: 80};
  const document = {
    body,
    createElement: tag => new Element(tag),
    querySelector: selector => selector === '.site-header' ? header : null
  };
  const source = fs.readFileSync(path.join(__dirname, '..', 'public/assets/twitch-floating.js'), 'utf8');
  vm.runInNewContext(source, {window, document, requestAnimationFrame: fn => {fn(); return 1;}});
  const player = {
    state, active: true,
    stop() { stopCount++; this.instance = null; },
    setState(next) { this.state = next; window.DEADELUSTV_TWITCH_FLOAT.onState(next); },
    sync() { syncCount++; }
  };
  window.DEADELUSTV_TWITCH_FLOAT.setup(root, controls, player);
  const anchor = home.children[0];
  const dock = [...body.children, ...anchor.children].find(node => node.className.includes('twitch-player-dock'));
  const reopen = body.children.find(node => node.className.includes('twitch-float-reopen'));
  return {
    window, home, root, controls, player, dock, reopen, anchor,
    counts: () => ({stops: stopCount, syncs: syncCount}),
    consent: next => {allowed = next; window.emit('deadelustv:consent-change');}
  };
}
test('en live consentement donne : passage flottant sans deplacer le lecteur apres le montage', () => {
  const e = createEnv();
  const moves = e.root.moved;
  assert.equal(e.dock.classList.contains('is-floating'), true, 'le lecteur ne tient pas en entier a l ecran');
  e.anchor.rect = {left: 50, top: 130, right: 950, bottom: 636, width: 900, height: 506};
  e.window.DEADELUSTV_TWITCH_FLOAT.refresh();
  assert.equal(e.dock.classList.contains('is-floating'), false, 'retour a l accueil');
  e.anchor.rect = {left: 50, top: 50, right: 950, bottom: 556, width: 900, height: 506};
  e.window.DEADELUSTV_TWITCH_FLOAT.refresh();
  assert.equal(e.dock.classList.contains('is-floating'), true, 'avant occultation par en-tete');
  assert.equal(e.root.moved, moves, 'le conteneur contenant l iframe nest jamais recree ni deplace');
});
test('navigation interne : le lecteur reste en place dans le mini-player', () => {
  const e = createEnv();
  e.home.hidden = true;
  e.window.DEADELUSTV_TWITCH_FLOAT.refresh();
  assert.equal(e.window.DEADELUSTV_TWITCH_FLOAT.shouldPersist(e.player), true);
  assert.equal(e.dock.hidden, false);
  assert.equal(e.dock.classList.contains('is-floating'), true);
});
test('croix : le live est coupe, la reprise exige un clic, sans changer les cookies', () => {
  const e = createEnv();
  const toolbar = e.dock.children[0];
  const close = toolbar.children[1];
  close.click();
  assert.equal(e.counts().stops, 1);
  assert.equal(e.player.active, false);
  assert.equal(e.dock.hidden, true);
  assert.equal(e.reopen.hidden, false);
  e.home.hidden = true;
  e.reopen.click();
  assert.equal(e.counts().syncs, 1);
  assert.equal(e.window.DEADELUSTV_TWITCH_FLOAT.shouldPersist(e.player), true);
});
test('pas de live ou pas de consentement : pas de mini-lecteur', () => {
  for (const opts of [{consent: false}, {state: 'offline'}]) {
    const e = createEnv(opts);
    assert.equal(e.dock.classList.contains('is-floating'), false);
    e.home.hidden = true;
    e.window.DEADELUSTV_TWITCH_FLOAT.refresh();
    assert.equal(e.dock.hidden, true);
  }
});
test('petit ecran : pas de lecteur flottant', () => {
  const e = createEnv({width: 850, height: 600});
  assert.equal(e.dock.classList.contains('is-floating'), false);
  assert.equal(e.window.DEADELUSTV_TWITCH_FLOAT.shouldPersist(e.player), false);
  assert.equal(e.dock.parent, e.anchor, 'le panneau reste dans le flux de l accueil');
  assert.equal(e.anchor.attributes['aria-hidden'], 'false', 'les liens restent accessibles');
  e.anchor.getBoundingClientRect = () => { throw new Error('aucune mesure de position mobile'); };
  e.window.DEADELUSTV_TWITCH_FLOAT.refresh();
  assert.equal(e.dock.style.top, '');
  assert.equal(e.dock.style.left, '');
  e.home.hidden = true;
  e.window.DEADELUSTV_TWITCH_FLOAT.refresh();
  assert.equal(e.dock.hidden, true);
});
test('changement de format : arret avant deplacement, puis reprise dans le nouveau format', () => {
  const e = createEnv();
  e.player.instance = {};
  const append = e.anchor.append.bind(e.anchor);
  e.anchor.append = (...nodes) => {
    assert.equal(e.counts().stops, 1, 'le lecteur est arrete avant de deplacer son conteneur');
    append(...nodes);
  };
  e.window.innerWidth = 390;
  e.window.DEADELUSTV_TWITCH_FLOAT.refresh();
  assert.equal(e.dock.parent, e.anchor);
  assert.equal(e.dock.classList.contains('is-floating'), false);
  assert.equal(e.counts().syncs, 1);
  e.player.active = true;
  e.window.innerWidth = 1400;
  e.window.DEADELUSTV_TWITCH_FLOAT.refresh();
  assert.equal(e.dock.parent, e.home.parent);
  assert.equal(e.anchor.attributes['aria-hidden'], 'true');
});
test('sur PC, tous les panneaux hors live restent dans le flux pendant le defilement', () => {
  for (const state of ['loading', 'offline', 'blocked', 'unknown', 'small']) {
    const e = createEnv({state});
    const moves = e.dock.moved;
    assert.equal(e.dock.parent, e.anchor, state);
    assert.equal(e.anchor.attributes['aria-hidden'], 'false');
    e.anchor.getBoundingClientRect = () => { throw new Error('le panneau ne doit pas mesurer sa position'); };
    e.window.DEADELUSTV_TWITCH_FLOAT.refresh();
    assert.equal(e.dock.style.top, '');
    assert.equal(e.dock.style.left, '');
    assert.equal(e.dock.moved, moves, 'aucun deplacement au scroll');
  }
});
test('passage chargement puis live : ne pas annuler la verification avant creation de l iframe', () => {
  const e = createEnv({state: 'loading'});
  assert.equal(e.dock.parent, e.anchor);
  e.player.setState('live');
  assert.equal(e.dock.parent, e.home.parent);
  assert.equal(e.player.active, true);
  assert.equal(e.counts().stops, 0, 'la verification en cours reste valide');
  assert.equal(e.counts().syncs, 0, 'pas de seconde verification concurrente');
  const moves = e.dock.moved;
  e.player.instance = {};
  e.window.DEADELUSTV_TWITCH_FLOAT.refresh();
  assert.equal(e.dock.moved, moves, 'le live reste dans son dock');
  e.player.stop();
  e.player.setState('offline');
  assert.equal(e.dock.parent, e.anchor, 'retour hors live dans la page');
  assert.equal(e.counts().stops, 1, 'pas de second arret apres fin du live');
});
test('retrait de consentement apres fermeture : la reprise est masquee', () => {
  const e = createEnv();
  e.dock.children[0].children[1].click();
  assert.equal(e.reopen.hidden, false);
  e.consent(false);
  e.window.DEADELUSTV_TWITCH_FLOAT.refresh();
  assert.equal(e.reopen.hidden, true);
});
