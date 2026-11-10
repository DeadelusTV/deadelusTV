'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'../public/modules/dcg/',name),'utf8');
const tick=async()=>{for(let i=0;i<6;i++)await new Promise(r=>setImmediate(r));};
class Node{
 constructor(){this.children=[];this.innerHTML='';this.textContent='';this.isConnected=true;this.style={};this.listeners={};this.attributes={};this.dataset={};this.classList={add(){},remove(){},toggle(){}};}
 append(...items){for(const item of items){item.parent=this;this.children.push(item);}}
 remove(){this.isConnected=false;if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}
 replaceChildren(){this.innerHTML='';this.children=[];}insertAdjacentHTML(where,html){this.innerHTML+=html;}
 setAttribute(k,v){this.attributes[k]=v;}querySelector(){return null;}
 getBoundingClientRect(){return {left:200,top:200,bottom:300,width:100,height:100};}
 addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}removeEventListener(k,fn){this.listeners[k]=(this.listeners[k]||[]).filter(f=>f!==fn);}
 click(){for(const fn of this.listeners.click||[])fn({target:{closest:selector=>selector==='[data-xp-claim]'?this:null}});}
}
function boot({state={scope:'general',total:45,level:2},claim,error,reduced=false}={}){
 const body=new Node(),host=new Node(),details=new Node(),timers=new Map(),calls=[],flights=[];let id=0,current=true;
 const context={URL,console,innerWidth:1000,innerHeight:800,matchMedia:()=>({matches:reduced}),setInterval:()=>1,clearInterval(){},setTimeout(fn,ms){timers.set(++id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),addEventListener(){},removeEventListener(){},document:{currentScript:{src:'https://site.test/modules/dcg/profile-rewards.js'},body,createElement:()=>new Node(),addEventListener(){},removeEventListener(){}},DCGXPRewards:{start(){flights.push(true);}}};
 context.window=context;vm.createContext(context);for(const file of ['dcg-xp.js','profile-rewards.js','dcg-xp-pass.js'])vm.runInContext(read(file),context);
 const widget=context.DCGXPPass.mount(host,{client:{rpc:async(name,args)=>{calls.push([name,args]);if(name==='dcg_my_xp')return{data:state};return error?{error:{message:'network'}}:{data:claim};}},userId:'alice',scope:'general',isCurrent:()=>current,compact:true,detailsHost:details,rewardPresentation:'popup'});
 return {context,body,host,details,timers,calls,flights,widget,leave(){current=false;widget.destroy();},expire(){for(const [key,timer]of [...timers])if(timer.ms===1500){timers.delete(key);timer.fn();}}};
}
test('profile uses the existing general XP counter and the same progress arithmetic',async()=>{
 const b=boot();await tick();assert.deepEqual(b.calls,[['dcg_my_xp',undefined]]);assert.match(b.details.innerHTML,/Ma progression générale/);assert.match(b.details.innerHTML,/Niveau 2/);assert.match(b.details.innerHTML,/15 \/ 30 boosters · 50 %/);assert.match(b.details.innerHTML,/<progress[^>]+max="30" value="15"/);assert.match(b.details.innerHTML,/30 Alkahests par DCG/);assert.doesNotMatch(b.details.innerHTML,/data-streamer-name|Streamer/);b.leave();assert.equal(b.details.innerHTML,'');
});
test('confirmed profile claim shows one stationary icon with the per-DCG quantity for 1.5 seconds',async()=>{
 const b=boot({state:{scope:'general',level:0,total:10},claim:{xp:{scope:'general',level:1,total:10},reward:{level:1,amount_per_dcg:10,credits:[{broadcaster_id:'one'},{broadcaster_id:'two'}]}}});
 await tick();b.details.click();await tick();assert.equal(b.flights.length,0);assert.equal(b.calls[1][0],'dcg_claim_general_xp');assert.equal(b.calls[1][1].p_level,1);assert.equal(b.body.children.length,1);const popup=b.body.children[0];assert.equal(popup.children[0].children[1].textContent,'×10');assert.equal(popup.children[0].children[2].textContent,'par DCG');assert.equal(popup.style.transform,undefined);assert.equal([...b.timers.values()][0].ms,1500);b.expire();await tick();assert.equal(b.body.children.length,0);assert.match(b.details.innerHTML,/Niveau 1/);b.leave();
});
test('failed or interrupted profile claims never present an invented gain or leave a popup after logout',async()=>{
 const failed=boot({state:{scope:'general',level:0,total:10},error:true});await tick();failed.host.click();await tick();assert.equal(failed.body.children.length,0);assert.match(failed.details.children.map(n=>n.textContent).join(' '),/sans double attribution/);failed.leave();
 const b=boot({state:{scope:'general',level:0,total:10},claim:{xp:{scope:'general',level:1,total:10},reward:{level:1,amount_per_dcg:10,credits:[{}]}}});await tick();b.host.click();await tick();assert.equal(b.body.children.length,1);b.leave();await tick();assert.equal(b.body.children.length,0);assert.equal(b.timers.size,0);
});
test('daily gains retain quantities per DCG, group distinct boosters, and reject invalid quantities',async()=>{
 const b=boot();await tick();const items=b.context.DCGProfileRewards.dailyItems([{login:'a',kind:'booster'},{login:'a',kind:'booster'},{login:'b',kind:'booster'},{login:'b',kind:'booster'},{login:'c',kind:'dust',amount:-1}]);assert.equal(items.length,1);assert.equal(items[0].amount,2);assert.equal(items[0].label,'par DCG');b.leave();
});
test('reduced motion still shows confirmed icons briefly and popup cancellation is safe',async()=>{
 const b=boot({reduced:true});await tick();const popup=b.context.DCGProfileRewards.show(b.host,[{kind:'alkahest',amount:35}]);assert.equal(b.body.children.length,1);popup.cancel();popup.cancel();await popup.finished;assert.equal(b.body.children.length,0);assert.equal(b.timers.size,0);b.leave();
});
