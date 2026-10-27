'use strict';
/* Contrôles isolés des conditions de chargement Twitch, sans requête réseau. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class FakeNode {
  constructor(tag='div') {
    this.tagName=tag;
    this.children=[];
    this.listeners=new Map();
    this.dataset={};
    this.hidden=false;
    this.textContent='';
    this.isConnected=true;
    this.classList={add(){},remove(){}};
    this.clientWidth=800;
  }
  append(...children) {
    for(const child of children) {
      this.children.push(child);
      if(child && typeof child==='object') { child.parent=this; child.isConnected=true; }
    }
  }
  replaceChildren(...children) { this.children=[]; this.append(...children); }
  after() {}
  remove() {
    this.isConnected=false;
    if(this.parent) this.parent.children=this.parent.children.filter(child=>child!==this);
  }
  setAttribute(k,v) { this[k]=v; }
  addEventListener(k,cb) { const listeners=this.listeners.get(k)||[];listeners.push(cb);this.listeners.set(k,listeners); }
  dispatchEvent(event) { for(const cb of this.listeners.get(event.type)||[]) cb(event); }
  click() { this.dispatchEvent({type:'click'}); }
  focus() {}
  querySelectorAll() { return []; }
  querySelector(selector) {
    if(selector==='button') return find(this,node=>node.tagName==='button');
    return null;
  }
  closest() { return {hidden:false}; }
}
function find(parent,predicate) {
  for(const child of parent.children) {
    if(!child || typeof child!=='object')continue;
    if(predicate(child))return child;
    const found=find(child,predicate);
    if(found)return found;
  }
  return null;
}
function makeEnv({live=false,consent=false,storage,playerMock}={}) {
  const events=new Map();
  const head=new FakeNode('head');
  const body=new FakeNode('body');
  const root=new FakeNode('div');
  const manager=new FakeNode('button');
  const docEvents=new Map();
  const backing=storage||new Map();
  const localStorage={
    getItem:key=>backing.has(key)?backing.get(key):null,
    setItem:(key,value)=>backing.set(key,String(value)),
    removeItem:key=>backing.delete(key)
  };
  const window={
    matchMedia:()=>({matches:true}),
    addEventListener(name,fn){const a=events.get(name)||[];a.push(fn);events.set(name,a);},
    dispatchEvent(e){for(const fn of events.get(e.type)||[]) fn(e);},
    Twitch:playerMock?{Player:playerMock}:undefined
  };
  const document={
    body,head,hidden:false,activeElement:manager,
    createElement:tag=>new FakeNode(tag),
    addEventListener(name,fn){const a=docEvents.get(name)||[];a.push(fn);docEvents.set(name,a);},
    dispatchEvent(e){for(const fn of docEvents.get(e.type)||[]) fn(e);},
    querySelectorAll:selector=>selector==='[data-consent-manage]'?[manager]:[]
  };
  const requests=[];
  const sandbox={
    window,document,localStorage,URL,Date,AbortController,
    CustomEvent:class {constructor(type,props={}){this.type=type;this.detail=props.detail;}},
    location:{protocol:'https:',hostname:'www.deadelustv.com'},
    fetch:async function(url){requests.push(url);return {ok:true,json:async()=>({live})};},
    setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:cb=>{cb();return 1;},cancelAnimationFrame(){}
  };
  vm.createContext(sandbox);
  function run(file) {
    const source=fs.readFileSync(path.join(__dirname,'..','public','assets',file),'utf8');
    vm.runInContext(source,sandbox,{filename:file});
  }
  return {run,window,document,head,body,root,manager,requests,storage:backing,sandbox};
}
const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));};

test('première visite : accepter et refuser sont accessibles de même niveau',()=>{
  const env=makeEnv();
  env.run('consent.js');
  env.document.dispatchEvent({type:'DOMContentLoaded'});
  const panel=find(env.body,n=>n.className?.startsWith('cookie-panel'));
  assert.ok(panel);
  const actions=find(panel,n=>n.className==='cookie-actions');
  assert.deepEqual(actions.children.map(c=>c.textContent),['Tout refuser','Personnaliser','Tout accepter','Enregistrer mes choix']);
  actions.children[0].click();
  const value=JSON.parse(env.storage.get('deadelustv_external_consent_v1'));
  assert.equal(value.choices.twitch,false);
  assert.equal(value.choices.youtube,false);
  assert.equal(env.window.DEADELUSTV_CONSENT.hasTwitchConsent(),false);
  env.manager.click();
  const second=find(env.body,n=>n.className?.startsWith('cookie-panel'));
  assert.ok(second,'panneau réouvert depuis le footer');
  find(second,n=>n.className==='cookie-actions').children[2].click();
  assert.equal(env.window.DEADELUSTV_CONSENT.hasTwitchConsent(),true);
  assert.equal(env.window.DEADELUSTV_CONSENT.hasConsent('youtube'),true);
  assert.equal(env.window.DEADELUSTV_CONSENT.hasConsent('tiktok'),false);
});
test('consentement expiré : une nouvelle décision est demandée',()=>{
  const old=Date.now()-181*24*60*60*1000;
  const storage=new Map([['deadelustv_external_consent_v1',JSON.stringify({version:1,savedAt:old,choices:{twitch:true,youtube:true,tiktok:false}})]]);
  const env=makeEnv({storage});
  env.run('consent.js');
  env.document.dispatchEvent({type:'DOMContentLoaded'});
  assert.ok(find(env.body,n=>n.className?.startsWith('cookie-panel')));
  assert.equal(env.window.DEADELUSTV_CONSENT.hasTwitchConsent(),false);
});
test('hors ligne : aucun SDK Twitch même avec accord',async()=>{
  const env=makeEnv({live:false});
  env.window.DEADELUSTV_CONSENT={hasTwitchConsent:()=>true};
  env.run('twitch-player.js');
  env.window.DEADELUSTV_TWITCH.sync(env.root,{twitch:'https://www.twitch.tv/deadelustv',channel:'deadelustv'});
  await flush();
  assert.deepEqual(env.requests,['/api/twitch-status']);
  assert.equal(env.root.dataset.mode,'offline');
  assert.equal(env.head.children.length,0);
});
test('en live sans accord : pas de SDK ni iframe, Twitch externe proposé',async()=>{
  const env=makeEnv({live:true});
  env.window.DEADELUSTV_CONSENT={hasTwitchConsent:()=>false};
  env.run('twitch-player.js');
  env.window.DEADELUSTV_TWITCH.sync(env.root,{twitch:'https://www.twitch.tv/deadelustv',channel:'deadelustv'});
  await flush();
  assert.deepEqual(env.requests,['/api/twitch-status']);
  assert.equal(env.root.dataset.mode,'blocked');
  assert.equal(env.head.children.length,0);
  assert.ok(find(env.root,n=>n.textContent==='Regarder sur Twitch ↗'));
});
test('en live avec accord : SDK chargé après résultat de statut',async()=>{
  const env=makeEnv({live:true});
  env.window.DEADELUSTV_CONSENT={hasTwitchConsent:()=>true};
  env.run('twitch-player.js');
  env.window.DEADELUSTV_TWITCH.sync(env.root,{twitch:'https://www.twitch.tv/deadelustv',channel:'deadelustv'});
  await flush();
  assert.deepEqual(env.requests,['/api/twitch-status']);
  assert.equal(env.root.dataset.mode,'live');
  assert.equal(env.head.children.length,1);
  assert.equal(env.head.children[0].src,'https://player.twitch.tv/js/embed/v1.js');
});
test('révocation pendant la lecture : le lecteur est détruit',async()=>{
  let destroyCount=0, approved=true;
  class Player {
    constructor(){this.listeners=new Map();}
    destroy(){destroyCount++;}
    addEventListener(name,callback){this.listeners.set(name,callback);}
    setMuted(){}
    play(){}
  }
  Player.READY='READY';Player.OFFLINE='OFFLINE';Player.ONLINE='ONLINE';
  Player.PLAYING='PLAYING';Player.PLAYBACK_BLOCKED='PLAYBACK_BLOCKED';Player.ENDED='ENDED';
  const env=makeEnv({live:true,playerMock:Player});
  env.window.DEADELUSTV_CONSENT={hasTwitchConsent:()=>approved};
  env.run('twitch-player.js');
  env.window.DEADELUSTV_TWITCH.sync(env.root,{twitch:'https://www.twitch.tv/deadelustv',channel:'deadelustv'});
  await flush();
  assert.equal(env.root.dataset.mode,'live');
  approved=false;
  env.window.dispatchEvent({type:'deadelustv:consent-change',detail:{choice:'refuse'}});
  await flush();
  assert.equal(destroyCount,1);
  assert.equal(env.root.dataset.mode,'blocked');
});

test('personnalisation par service et refus TikTok non actif',()=>{
  const env=makeEnv();
  env.run('consent.js');
  env.document.dispatchEvent({type:'DOMContentLoaded'});
  const panel=find(env.body,n=>n.className?.startsWith('cookie-panel'));
  const actions=find(panel,n=>n.className==='cookie-actions');
  actions.children[1].click();
  const form=find(panel,n=>n.className==='cookie-service-list');
  assert.equal(form.hidden,false);
  const twitch=find(form,n=>n.dataset?.consentService==='twitch');
  const youtube=find(form,n=>n.dataset?.consentService==='youtube');
  const tiktok=find(form,n=>n.dataset?.consentService==='tiktok');
  assert.ok(tiktok.disabled);
  twitch.checked=false;
  youtube.checked=true;
  tiktok.checked=true;
  actions.children[3].click();
  const saved=JSON.parse(env.storage.get('deadelustv_external_consent_v1'));
  assert.equal(saved.choices.twitch,false);
  assert.equal(saved.choices.youtube,true);
  assert.equal(saved.choices.tiktok,false);
  assert.equal(env.window.DEADELUSTV_CONSENT.hasConsent('youtube'),true);
  assert.equal(env.window.DEADELUSTV_CONSENT.hasTwitchConsent(),false);
});

test('ancienne décision Twitch ne vaut pas consentement YouTube automatique',()=>{
  const map=new Map([['deadelustv_twitch_consent_v1',
    JSON.stringify({choice:'accept',savedAt:Date.now(),version:1})]]);
  const env=makeEnv({storage:map});
  env.run('consent.js');
  assert.equal(env.window.DEADELUSTV_CONSENT.hasTwitchConsent(),false);
  assert.equal(env.window.DEADELUSTV_CONSENT.hasConsent('youtube'),false);
  env.document.dispatchEvent({type:'DOMContentLoaded'});
  const panel=find(env.body,n=>n.className?.startsWith('cookie-panel'));
  find(panel,n=>n.className==='cookie-actions').children[1].click();
  assert.equal(find(panel,n=>n.dataset?.consentService==='twitch').checked,true);
  assert.equal(find(panel,n=>n.dataset?.consentService==='youtube').checked,false);
});

test('un lecteur YouTube reste inactif sans accord, puis est retiré au refus',()=>{
  const env=makeEnv();
  env.run('consent.js');
  env.run('external-embeds.js');
  const area=new FakeNode('div');
  const api=env.window.DEADELUSTV_EMBEDS;
  assert.equal(api.mountYouTube(area,'7C1fZaoE_Us','Vidéo officielle'),true);
  assert.ok(find(area,n=>n.textContent.includes('désactivé')));
  assert.equal(find(area,n=>n.tagName==='iframe'),null);
  assert.equal(api.mountYouTube(area,'https://evil.example', 'Défense'),false);
  env.document.dispatchEvent({type:'DOMContentLoaded'});
  const panel=find(env.body,n=>n.className?.startsWith('cookie-panel'));
  find(panel,n=>n.className==='cookie-actions').children[2].click();
  const iframe=find(area,n=>n.tagName==='iframe');
  assert.ok(iframe);
  assert.equal(iframe.src,'https://www.youtube-nocookie.com/embed/7C1fZaoE_Us');
  env.manager.click();
  const panel2=find(env.body,n=>n.className?.startsWith('cookie-panel'));
  find(panel2,n=>n.className==='cookie-actions').children[0].click();
  assert.equal(find(area,n=>n.tagName==='iframe'),null);
  assert.ok(find(area,n=>n.textContent.includes('désactivé')));
});

test('nouvelle visite même site : les préférences sont conservées',()=>{
  const storage=new Map();
  const env=makeEnv({storage});
  env.run('consent.js');
  env.document.dispatchEvent({type:'DOMContentLoaded'});
  const panel=find(env.body,n=>n.className?.startsWith('cookie-panel'));
  find(panel,n=>n.className==='cookie-actions').children[2].click();
  const revisit=makeEnv({storage});
  revisit.run('consent.js');
  revisit.document.dispatchEvent({type:'DOMContentLoaded'});
  assert.equal(find(revisit.body,n=>n.className?.startsWith('cookie-panel')),null);
  assert.equal(revisit.window.DEADELUSTV_CONSENT.hasTwitchConsent(),true);
  assert.equal(revisit.window.DEADELUSTV_CONSENT.hasConsent('youtube'),true);
  assert.equal(revisit.window.DEADELUSTV_CONSENT.hasConsent('tiktok'),false);
});
