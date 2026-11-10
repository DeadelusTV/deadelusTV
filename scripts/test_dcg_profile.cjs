'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../public/modules/dcg/profile.js'),'utf8');
const tick=async()=>{for(let i=0;i<6;i++)await new Promise(r=>setImmediate(r));};
class Node{
 constructor(){this.innerHTML='';this.isConnected=true;this.open=false;this.listeners={};this.dataset={};}
 addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}removeEventListener(k,fn){this.listeners[k]=(this.listeners[k]||[]).filter(f=>f!==fn);}
 querySelector(s){return this.nodes?.[s]||null;}replaceChildren(){this.innerHTML='';}focus(){this.focused=true;}showModal(){this.open=true;}close(){this.open=false;}matches(s){return this.selector===s;}closest(s){return this.matches(s)?this:null;}
 emit(k,target=this){for(const fn of this.listeners[k]||[])fn({target,preventDefault(){}});}
}
const item=(name='Carte Viewer')=>({group_key:'model:normal:3:2:false',quantity:3,display:{model_id:'model',name,collection:'Viewers',collection_id:'collection-1',finish:'normal',rarity_level:3,star_count:2,image_url:'https://images.example/card.png'}});
function boot({view='cartes',registered=true,inventory,verifiedId='alice',userId='alice',getUser}={}){
 const host=new Node(),dialog=new Node(),body=new Node(),calls=[],reads=[];
 host.nodes={'[data-profile-dialog]':dialog,'[data-profile-card-body]':body};
 const result={owner_id:userId,broadcaster_id:'99977368',items:[item()],total:1,total_copies:3,next_offset:null};
 const client={auth:{getUser:getUser|| (async()=>({data:{user:{id:verifiedId}}}))},from(table){const read={table};reads.push(read);return{select(columns){read.columns=columns;return this;},eq(column,value){read.column=column;read.value=value;return this;},async maybeSingle(){return{data:registered?{user_id:userId}:null};}};},async rpc(...args){calls.push(args);return inventory?inventory(...args):{data:result};}};
 const context={URL,URLSearchParams,console,DEADELUSTV_AUTH:{getClient:async()=>client},DEADELUSTV_DCG_CONFIG:{accountSpaceId:'deadelustv',accountBroadcasterId:'99977368',spaces:[{id:'deadelustv',name:'DeadelusTV',avatar:'https://images.example/avatar.png',gameBase:'https://game.example/'}]}};
 context.window=context;vm.createContext(context);vm.runInContext(source,context);context.DCGProfile.mount(host,{user:{id:userId},view});
 return{host,dialog,body,calls,reads,result,api:context.DCGProfile,click(selector,dataset={}){const target=new Node();target.selector=selector;target.dataset=dataset;host.emit('click',target);return target;}};
}
test('profile cards read only the verified owner inventory, with no chosen beneficiary or game mutation',async()=>{
 const b=boot();await tick();assert.deepEqual(JSON.parse(JSON.stringify(b.calls)),[['tcg_inventory_groups',{p_context:'inventory',p_search:'',p_offset:0}]]);assert.deepEqual(b.reads,[{table:'tcg_accounts',columns:'user_id',column:'user_id',value:'alice'}]);assert.match(b.host.innerHTML,/Carte Viewer/);assert.match(b.host.innerHTML,/×3/);assert.doesNotMatch(source,/\.insert\(|\.update\(|\.upsert\(|ensure_my_viewer|functions\.invoke/);
});
test('the constellation list does not request cards or join a DCG',async()=>{
 const b=boot({view:'constellations'});await tick();assert.equal(b.calls.length,0);assert.match(b.host.innerHTML,/Mes DCG|Constellations communes/);assert.match(b.host.innerHTML,/game.example\/#\/catalogue/);
 const empty=boot({registered:false});await tick();assert.equal(empty.calls.length,0);assert.match(empty.host.innerHTML,/pas encore rejoint/);
});
test('opening a card shows the catalogue renderer with one destination and no game controls',async()=>{
 const b=boot();await tick();b.click('[data-profile-open]',{profileOpen:'0'});assert.equal(b.dialog.open,true);assert.match(b.body.innerHTML,/<tcg-card aura/);assert.equal((b.body.innerHTML.match(/<a /g)||[]).length,1);assert.match(b.body.innerHTML,/Aller voir ma carte sur le DCG de DeadelusTV/);assert.match(b.body.innerHTML,/possession=owned&amp;collection=collection-1/);assert.doesNotMatch(b.body.innerHTML,/<button|<form|data-card-action|dissoudre|fusionner|enchère|wishlist/i);
});
test('private responses for another account or broadcaster never become a gallery',async()=>{
 for(const changed of [{owner_id:'bob'},{broadcaster_id:'other'}]){const b=boot({inventory:async()=>({data:{owner_id:'alice',broadcaster_id:'99977368',items:[item('PRIVATE')],...changed}})});await tick();assert.doesNotMatch(b.host.innerHTML,/PRIVATE/);assert.match(b.host.innerHTML,/Impossible de charger/);}
 const expired=boot({verifiedId:'bob'});await tick();assert.equal(expired.calls.length,0);
});
test('late results after leaving the profile cannot restore cards or a modal',async()=>{
 let release;const b=boot({inventory:()=>new Promise(r=>release=r)});await tick();b.api.unmount();release({data:b.result});await tick();assert.equal(b.host.innerHTML,'');assert.equal(b.dialog.open,false);
});
test('card metadata is escaped and unsafe image URLs are not rendered',async()=>{
 const data={owner_id:'alice',broadcaster_id:'99977368',items:[{...item('<img src=x>'),display:{...item().display,name:'<img src=x>',image_url:'javascript:bad()'}}],total:1,total_copies:3,next_offset:null};
 const b=boot({inventory:async()=>({data})});await tick();assert.match(b.host.innerHTML,/&lt;img src=x&gt;/);assert.doesNotMatch(b.host.innerHTML,/<img src=x>|javascript:/);b.click('[data-profile-open]',{profileOpen:'0'});assert.doesNotMatch(b.body.innerHTML,/<img src=x>|javascript:/);
});
test('server pagination keeps each version grouped and uses the server next offset',async()=>{
 const b=boot({inventory:async(name,args)=>({data:{owner_id:'alice',broadcaster_id:'99977368',items:[item()],total:30,total_copies:80,next_offset:args.p_offset?null:24}})});await tick();b.click('[data-profile-page]',{profilePage:'next'});await tick();assert.equal(b.calls[1][1].p_offset,24);assert.match(b.host.innerHTML,/Page 2/);
});
