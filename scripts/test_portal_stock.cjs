'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=name=>fs.readFileSync(path.join(__dirname,'../public/modules/dcg/',name),'utf8');
const tick=async()=>{for(let i=0;i<6;i++)await new Promise(r=>setImmediate(r));};
class Node{
 constructor(rect={left:50,top:300,width:100,height:30}){this.rect=rect;this.isConnected=true;this.children=[];this.nodes={};this.dataset={};this.attributes={};this.textContent='';this.className='';this.style={setProperty(k,v){this[k]=v;}};const classes=new Set();this.classList={add:(...v)=>v.forEach(c=>classes.add(c)),remove:(...v)=>v.forEach(c=>classes.delete(c)),contains:c=>classes.has(c)};}
 append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
 remove(){this.isConnected=false;if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}
 setAttribute(k,v){this.attributes[k]=v;}
 querySelector(selector){return this.nodes[selector]||this.children.flatMap(n=>[n,n.querySelector(selector)]).find(n=>n&&selector.startsWith('.')&&n.className.split(' ').includes(selector.slice(1)))||null;}
 getBoundingClientRect(){const r=this.rect;return{...r,right:r.left+r.width,bottom:r.top+r.height};}
 cloneNode(deep){const n=new Node(this.rect);n.className=this.className;n.textContent=this.textContent;n.dataset={...this.dataset};if(deep)for(const child of this.children)n.append(child.cloneNode(true));return n;}
}
const response=(channel,boosters=10,balance=100)=>({data:{available:boosters,shop:{dust:{scope:'streamer',broadcaster_id:channel,balance}}}});
function boot({readA,readB,reduced=false}={}){
 const host=new Node(),body=new Node(),cards=new Map(),timers=new Map(),frames=new Map(),reads=[];let serial=0,time=0,current=true;
 for(const [id,ch,left]of [['a','100',50],['b','200',350]]){
  const card=new Node({left,top:500,width:250,height:160});
  for(const kind of ['booster','alkahest']){card.nodes['[data-portal-stock="'+kind+'"]']=new Node();card.nodes['[data-portal-stock-target="'+kind+'"]']=new Node({left,top:620,width:100,height:25});}
  host.nodes['[data-dcg="'+id+'"]']=card;cards.set(ch,card);
 }
 const context={URL,console,innerWidth:1000,innerHeight:800,matchMedia:()=>({matches:reduced}),addEventListener(){},removeEventListener(){},setInterval:()=>1,clearInterval(){},setTimeout(fn,ms){timers.set(++serial,{fn,ms});return serial;},clearTimeout:id=>timers.delete(id),requestAnimationFrame(fn){frames.set(++serial,fn);return serial;},cancelAnimationFrame:id=>frames.delete(id),document:{hidden:false,currentScript:{src:'https://site.test/modules/dcg/dcg-xp-rewards.js'},body,createElement:()=>new Node(),querySelectorAll:()=>[],addEventListener(){},removeEventListener(){}},DCGXP:{setFraction(){}}};context.window=context;vm.createContext(context);
 for(const file of ['portal-stock.js','dcg-xp-rewards.js'])vm.runInContext(source(file),context);
 const api=context.DCGPortalStock.mount(host,{userId:'alice',isCurrent:()=>current,readers:[{spaceId:'a',broadcasterId:'100',read:()=>{reads.push('100');return readA?readA():Promise.resolve(response('100'));}},{spaceId:'b',broadcasterId:'200',read:()=>{reads.push('200');return readB?readB():Promise.resolve(response('200',20,200));}}]});
 return{host,body,cards,context,api,reads,timers,frames,number(ch,kind){return cards.get(ch).querySelector('[data-portal-stock="'+kind+'"]').textContent;},leave(){current=false;api.destroy();},expire(ms){for(const[id,t]of [...timers])if(t.ms===ms){timers.delete(id);t.fn();}},frame(){time+=1000;for(const[id,fn]of [...frames]){frames.delete(id);fn(time);}}};
}
test('each DCG reads its own booster stock and Alkahest balance, including real zero values',async()=>{
 const b=boot({readB:async()=>response('200',0,0)});await tick();assert.equal(b.number('100','booster'),'10');assert.equal(b.number('100','alkahest'),'100');assert.equal(b.number('200','booster'),'0');assert.equal(b.number('200','alkahest'),'0');b.leave();
});
test('late stock responses cannot overwrite a newer confirmed read or reappear after logout',async()=>{
 let release,calls=0;const b=boot({readA:()=>++calls===1?new Promise(r=>release=r):Promise.resolve(response('100',12,135))});await tick();await b.api.refresh();release(response('100',10,100));await tick();assert.equal(b.number('100','alkahest'),'135');b.leave();assert.equal(b.number('100','alkahest'),'—');
 let finish;const c=boot({readA:()=>new Promise(r=>finish=r)});await tick();c.leave();finish(response('100',99,999));await tick();assert.equal(c.number('100','alkahest'),'—');
});
test('a failed, invalid or other-channel stock never becomes an invented zero',async()=>{
 for(const result of [{error:{message:'private'}},response('other'),response('100',-1),response('100',1,NaN)]){const b=boot({readA:async()=>result});await tick();assert.equal(b.number('100','booster'),'—');assert.equal(b.number('100','alkahest'),'—');b.leave();}
});
test('reward targets include only credited DCGs and group J10 boosters separately per recipient',async()=>{
 const b=boot();await tick();const targets=b.api.targets({reward:{credits:[{broadcaster_id:'100',amount:30},{broadcaster_id:'200',amount:30},{broadcaster_id:'unknown',amount:30}]}},'alkahest');assert.equal(targets.length,2);assert.notEqual(targets[0].element,targets[1].element);targets[0].onArrival();assert.equal(b.cards.get('100').classList.contains('portal-space--reward'),true);assert.equal(b.cards.get('200').classList.contains('portal-space--reward'),false);
 const boosters=b.api.targets({gains:[{broadcaster_id:'200',kind:'booster'},{broadcaster_id:'200',kind:'booster'}]},'booster');assert.equal(boosters.length,1);assert.equal(boosters[0].amount,2);assert.equal(b.api.targets({replayed:true,reward:{credits:[{broadcaster_id:'100',amount:30}]}},'alkahest').length,0);b.leave();assert.equal(b.timers.size,0);
});
test('the home animation forks the confirmed reward toward every visible credited DCG',async()=>{
 const b=boot();await tick();const medal=new Node(),face=new Node();b.host.nodes['.dcg-xp']=medal;medal.nodes['.dcg-xp__medal']=face;
 const animation=b.context.DCGXPRewards.start(b.host,{scope:'general',resolveTargets:(r,k)=>b.api.targets(r,k)});
 const done=animation.complete({reward:{level:3,amount_per_dcg:30,credits:[{broadcaster_id:'100',amount:30},{broadcaster_id:'200',amount:30}]}});
 b.expire(420);await tick();b.expire(700);await tick();b.expire(1150);await tick();assert.equal(b.frames.size,2);b.frame();b.frame();await tick();assert.equal(b.cards.get('100').classList.contains('portal-space--reward'),true);assert.equal(b.cards.get('200').classList.contains('portal-space--reward'),true);b.frame();b.frame();await tick();await done;animation.cancel();b.leave();assert.equal(b.body.children.length,0);assert.equal(b.frames.size,0);
});
test('daily animation delivers only to its recipient and replay or reduced motion launches no flight',async()=>{
 const b=boot();await tick();const anchor=new Node(),animation=b.context.DCGXPRewards.start(b.host,{scope:'daily',anchor,resolveTargets:(r,k)=>b.api.targets(r,k)});
 const done=animation.complete({gains:[{broadcaster_id:'200',kind:'dust',amount:35}]});await tick();b.expire(350);await tick();assert.equal(b.frames.size,1);b.frame();b.frame();await tick();await done;assert.equal(b.cards.get('100').classList.contains('portal-space--reward'),false);assert.equal(b.cards.get('200').classList.contains('portal-space--reward'),true);animation.cancel();b.leave();
 const reduced=boot({reduced:true});await tick();assert.equal(reduced.context.DCGXPRewards.start(reduced.host,{scope:'daily',anchor:new Node()}),null);reduced.leave();
 const replay=boot();await tick();const a=replay.context.DCGXPRewards.start(replay.host,{scope:'daily',anchor:new Node()});await a.complete({replayed:true,gains:[{broadcaster_id:'100',kind:'dust',amount:35}]});assert.equal(replay.frames.size,0);assert.equal(replay.body.children.length,0);replay.leave();
});
