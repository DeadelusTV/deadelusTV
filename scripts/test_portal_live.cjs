'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const source=read('public/modules/dcg/portal-live.js');
const owner='99977368',other='42';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const reply=data=>({ok:true,json:async()=>data});
function setup(fetch){
  const events=()=>{const listeners=new Map();return{addEventListener(name,fn){listeners.set(name,fn);},removeEventListener(name,fn){if(listeners.get(name)===fn)listeners.delete(name);},emit(name){listeners.get(name)?.();},listeners};};
  const document={hidden:false,...events()},window={...events(),setTimeout,clearTimeout,setInterval(fn,ms){this.interval={fn,ms};return 1;},clearInterval(){this.interval=null;}};
  const node=id=>({dataset:{portalLive:id},hidden:true});
  const host={isConnected:true,nodes:[node(owner),node(other)],querySelectorAll(){return this.nodes;}};
  let current=true;vm.runInNewContext(source,{window,document,URLSearchParams,AbortController,fetch});
  const widget=window.DCGPortalLive.mount(host,{userId:'alice',spaces:[{broadcasterId:owner},{broadcasterId:other}],legacyBroadcasterId:owner,isCurrent:()=>current});
  return {window,document,host,widget,node,leave(){current=false;}};
}
test('independent channel statuses, refresh to offline, no tile replacement',async()=>{
  let online=true;const calls=[];const s=setup(async(url,options)=>{calls.push([url,options]);return reply({statuses:{[owner]:online,[other]:!online}});});
  await tick();assert.deepEqual(s.host.nodes.map(n=>n.hidden),[false,true]);assert.equal(s.window.interval.ms,60000);
  assert.match(calls[0][0],/broadcaster_id=99977368&broadcaster_id=42/);assert.equal(calls[0][1].credentials,'omit');
  const previous=s.host.nodes[0];online=false;await s.widget.refresh();assert.deepEqual(s.host.nodes.map(n=>n.hidden),[true,false]);assert.equal(s.host.nodes[0],previous);s.widget.destroy();
});
test('new DOM receives confirmed state without another request',async()=>{
  let count=0;const s=setup(async()=>{count++;return reply({statuses:{[owner]:true,[other]:false}});});await tick();
  s.host.nodes=[s.node(owner),s.node(other)];s.widget.sync();assert.deepEqual(s.host.nodes.map(n=>n.hidden),[false,true]);assert.equal(count,1);s.widget.destroy();
});
test('legacy API can only label owner, invalid/unavailable states hide badges',async()=>{
  let fail=false;const s=setup(async url=>{if(url.startsWith('/api/dcg-live-status'))return reply({statuses:{[other]:'true'}});if(fail)throw Error('offline');return reply({live:true});});
  await tick();assert.deepEqual(s.host.nodes.map(n=>n.hidden),[false,true]);fail=true;await s.widget.refresh();assert.deepEqual(s.host.nodes.map(n=>n.hidden),[true,true]);s.widget.destroy();
});
test('destroy aborts pending refresh and rejects late positive response',async()=>{
  let release;const s=setup(()=>new Promise(resolve=>release=resolve));s.widget.destroy();release(reply({statuses:{[owner]:true,[other]:true}}));await tick();assert.deepEqual(s.host.nodes.map(n=>n.hidden),[true,true]);assert.equal(s.window.interval,null);assert.equal(s.window.listeners.size,0);assert.equal(s.document.listeners.size,0);
});
test('hidden tab clears indicator, visibility refreshes it, context exit stops polling',async()=>{
  let count=0;const s=setup(async()=>{count++;return reply({statuses:{[owner]:true,[other]:false}});});await tick();s.document.hidden=true;s.document.emit('visibilitychange');assert.deepEqual(s.host.nodes.map(n=>n.hidden),[true,true]);await s.widget.refresh();assert.equal(count,1);
  s.document.hidden=false;s.document.emit('visibilitychange');await tick();assert.equal(s.host.nodes[0].hidden,false);assert.equal(count,2);s.leave();s.window.emit('focus');assert.equal(s.window.interval,null);assert.equal(s.host.nodes[0].hidden,true);
});
test('server accepts only bounded numeric IDs, no upstream query for unknown channels',async()=>{
  const {onRequestGet}=await import('data:text/javascript;base64,'+Buffer.from(read('functions/api/dcg-live-status.js')).toString('base64'));
  const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return reply({live:true});};
  const request=q=>({request:new Request('https://test.invalid/api/dcg-live-status?'+q)});
  try{assert.equal((await onRequestGet(request('broadcaster_id=bad'))).status,400);assert.deepEqual(await (await onRequestGet(request('broadcaster_id=42'))).json(),{statuses:{}});assert.equal(calls,0);
    const result=await onRequestGet(request('broadcaster_id=99977368&broadcaster_id=42'));assert.equal(result.status,200);assert.deepEqual(await result.json(),{statuses:{[owner]:true}});assert.equal(calls,1);
    globalThis.fetch=async()=>reply({live:'true'});assert.equal((await onRequestGet(request('broadcaster_id=99977368'))).status,503);
    globalThis.fetch=async()=>reply({live:false});assert.deepEqual(await (await onRequestGet(request('broadcaster_id=99977368'))).json(),{statuses:{[owner]:false}});
  }finally{globalThis.fetch=original;}
});
