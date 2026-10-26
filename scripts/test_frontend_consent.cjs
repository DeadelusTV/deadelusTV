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
    setItem:(key,value)=>backing.set(key,String(value))
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
  const panel=find(env.body,n=>n.className==='cookie-panel');
  assert.ok(panel);
  const actions=find(panel,n=>n.className==='cookie-actions');
  assert.deepEqual(actions.children.map(c=>c.textContent),['Refuser','Accepter']);
  actions.children[0].click();
  const value=JSON.parse(env.storage.get('deadelustv_twitch_consent_v1'));
  assert.equal(value.choice,'refuse');
  assert.equal(env.window.DEADELUSTV_CONSENT.hasTwitchConsent(),false);
  env.manager.click();
  const second=find(env.body,n=>n.className==='cookie-panel');
  assert.ok(second,'panneau réouvert depuis le footer');
  find(second,n=>n.className==='cookie-actions').children[1].click();
  assert.equal(env.window.DEADELUSTV_CONSENT.hasTwitchConsent(),true);
});
test('consentement expiré : une nouvelle décision est demandée',()=>{
  const old=Date.now()-181*24*60*60*1000;
  const storage=new Map([['deadelustv_twitch_consent_v1',JSON.stringify({choice:'accept',savedAt:old,version:1})]]);
  const env=makeEnv({storage});
  env.run('consent.js');
  env.document.dispatchEvent({type:'DOMContentLoaded'});
  assert.ok(find(env.body,n=>n.className==='cookie-panel'));
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
