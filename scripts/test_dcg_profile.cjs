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
const item=(name='Carte Viewer')=>({group_key:name+':normal:3:2:false',quantity:3,display:{model_id:name,name,collection:'Viewers',collection_id:'collection-1',catalogue_number:12,finish:'normal',rarity_level:3,star_count:2,image_url:'https://images.example/card.png'}});
function boot({view='cartes',registered=true,inventory,numbers,verifiedId='alice',userId='alice',getUser}={}){
 const host=new Node(),dialog=new Node(),body=new Node(),calls=[],reads=[];
 host.nodes={'[data-profile-dialog]':dialog,'[data-profile-card-body]':body};
 const result={owner_id:userId,broadcaster_id:'99977368',items:[item()],total:1,total_copies:3,next_offset:null};
 const seen=[];
 const client={auth:{getUser:getUser|| (async()=>({data:{user:{id:verifiedId}}}))},from(table){const read={table};reads.push(read);return{select(columns){read.columns=columns;return this;},eq(column,value){read.column=column;read.value=value;return this;},async maybeSingle(){return{data:registered?{user_id:userId}:null};}};},async rpc(...args){calls.push(args);if(args[0]==='tcg_owned_catalogue_page')return numbers?numbers(...args):{data:{personal:true,items:seen.map(i=>({model_id:i.display.model_id,collection_id:i.display.collection_id,slots:[{catalogue_number:i.display.catalogue_number,display:i.display,owned_group:{}}]})),next_offset:null}};const response=inventory?await inventory(...args):{data:result};seen.push(...response.data?.items||[]);return response;}};
 const context={URL,URLSearchParams,console,DEADELUSTV_AUTH:{getClient:async()=>client},DEADELUSTV_DCG_CONFIG:{accountSpaceId:'deadelustv',accountBroadcasterId:'99977368',spaces:[{id:'deadelustv',name:'DeadelusTV',avatar:'https://images.example/avatar.png',gameBase:'https://game.example/'}]}};
 context.window=context;vm.createContext(context);vm.runInContext(source,context);context.DCGProfile.mount(host,{user:{id:userId},view});
 return{host,dialog,body,calls,reads,result,api:context.DCGProfile,change(selector,value){const target=new Node();target.selector=selector;target.value=value;host.emit('change',target);},click(selector,dataset={}){const target=new Node();target.selector=selector;target.dataset=dataset;host.emit('click',target);return target;}};
}
test('profile cards read only the verified owner inventory, with no chosen beneficiary or game mutation',async()=>{
 const b=boot();await tick();assert.deepEqual(JSON.parse(JSON.stringify(b.calls)),[['tcg_inventory_groups',{p_context:'inventory',p_search:'',p_offset:0}],['tcg_owned_catalogue_page',{p_search:'',p_offset:0}]]);assert.deepEqual(b.reads,[{table:'tcg_accounts',columns:'user_id',column:'user_id',value:'alice'}]);assert.match(b.host.innerHTML,/Carte Viewer/);assert.match(b.host.innerHTML,/×3/);assert.doesNotMatch(source,/\.insert\(|\.update\(|\.upsert\(|ensure_my_viewer|functions\.invoke/);
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
const names=b=>[...b.host.innerHTML.matchAll(/<strong>(.*?)<\/strong>/g)].map(m=>m[1]);
const inventoryPage=(items,offset=0)=>({data:{owner_id:'alice',broadcaster_id:'99977368',items:items.slice(offset,offset+24),total:items.length,total_copies:items.reduce((n,i)=>n+i.quantity,0),next_offset:offset+24<items.length?offset+24:null}});
test('sorting covers every server page before display pagination and page changes need no extra reads',async()=>{
 const items=Array.from({length:30},(_,i)=>item('Carte '+(30-i)));
 const b=boot({inventory:async(name,args)=>inventoryPage(items,args.p_offset)});await tick();assert.equal(b.calls[1][1].p_offset,24);assert.equal(names(b)[0],'Carte 1');assert.equal(names(b).at(-1),'Carte 24');const reads=b.calls.length;
 b.click('[data-profile-page]',{profilePage:'next'});assert.match(b.host.innerHTML,/Page 2/);assert.equal(names(b)[0],'Carte 25');assert.equal(b.calls.length,reads);
 b.change('[data-profile-direction]','desc');assert.match(b.host.innerHTML,/Page 1/);assert.equal(names(b)[0],'Carte 30');assert.equal(b.calls.length,reads);
 b.click('[data-profile-open]',{profileOpen:'0'});assert.match(b.body.innerHTML,/<h2 id="profile-card-title">Carte 30<\/h2>/);
});

test('all five sorts support both directions; numeric ordering preserves duplicate numbers and all versions',async()=>{
 const cards=[{...item('Éclair 10'),display:{...item('Éclair 10').display,catalogue_number:10,rarity_level:1,collection:'Zodiaque'}},{...item('éclair 2'),display:{...item('éclair 2').display,catalogue_number:2,rarity_level:6,collection:'Aurore'}},{...item('Alpha'),display:{...item('Alpha').display,catalogue_number:1,rarity_level:4,collection:'Milieu'}},{...item('Beta'),display:{...item('Beta').display,catalogue_number:1,rarity_level:3,collection:'Étoiles'}}];
 const b=boot({inventory:async()=>inventoryPage(cards)});await tick();
 for(const [sort,asc]of [['name',['Alpha','Beta','éclair 2','Éclair 10']],['number',['Alpha','Beta','éclair 2','Éclair 10']],['rarity',['Éclair 10','Beta','Alpha','éclair 2']],['collection',['éclair 2','Beta','Alpha','Éclair 10']],['streamer',['Alpha','Beta','éclair 2','Éclair 10']]]){
  b.change('[data-profile-direction]','asc');b.change('[data-profile-sort]',sort);assert.deepEqual(names(b),asc,sort+' ascending');b.change('[data-profile-direction]','desc');assert.deepEqual(names(b),[...asc].reverse(),sort+' descending');
 }
 assert.equal((b.host.innerHTML.match(/N° 1 ·/g)||[]).length,2);assert.equal(b.calls.length,2);
});

test('numbered catalogue pages enrich inventory without dropping unnumbered cards or merging equal numbers',async()=>{
 const cards=[item('Connue'),{...item('Sans numéro'),display:{...item('Sans numéro').display,catalogue_number:undefined}}];
 const b=boot({inventory:async()=>inventoryPage(cards),numbers:async(name,args)=>({data:{personal:true,items:args.p_offset?[{model_id:'Connue',collection_id:'collection-1',slots:[{catalogue_number:7,display:cards[0].display}]}]:[],next_offset:args.p_offset?null:30}})});await tick();assert.equal(b.calls[2][1].p_offset,30);
 for(const direction of ['asc','desc']){b.change('[data-profile-sort]','number');b.change('[data-profile-direction]',direction);assert.deepEqual(names(b),['Connue','Sans numéro']);assert.match(b.host.innerHTML,/N° 7 ·/);}
});

test('late number pages and malformed or incomplete inventory cannot render a partial sorted gallery',async()=>{
 let finish;const b=boot({numbers:()=>new Promise(r=>finish=r)});await tick();b.api.unmount();finish({data:{personal:true,items:[],next_offset:null}});await tick();assert.equal(b.host.innerHTML,'');
 for(const inventory of [async()=>({data:{...inventoryPage([item()]).data,total:2}}),async()=>({data:{...inventoryPage([item()]).data,next_offset:0}})]){const x=boot({inventory});await tick();assert.match(x.host.innerHTML,/Impossible de charger/);assert.doesNotMatch(x.host.innerHTML,/portal-owned-card/);}
});

test('an account change during the number read cannot reveal a sorted gallery',async()=>{
 let reads=0;const b=boot({getUser:async()=>({data:{user:{id:++reads===1?'alice':'bob'}}})});await tick();assert.match(b.host.innerHTML,/Impossible de charger/);assert.doesNotMatch(b.host.innerHTML,/portal-owned-card/);
});

test('submitting a search preserves the selected sort and direction and returns to the first page',async()=>{
 const cards=[item('Alpha'),item('Beta')],b=boot({inventory:async(name,args)=>inventoryPage(args.p_search?cards.slice(0,1):cards)});await tick();b.change('[data-profile-sort]','number');b.change('[data-profile-direction]','desc');
 const form=new Node(),input=new Node();form.selector='[data-profile-search-form]';input.value=' Alpha ';form.nodes={'[data-profile-search]':input};b.host.emit('submit',form);await tick();assert.deepEqual(names(b),['Alpha']);assert.match(b.host.innerHTML,/<option value="number" selected>/);assert.match(b.host.innerHTML,/<option value="desc" selected>/);assert.equal(b.calls.at(-1)[1].p_search,'Alpha');assert.match(b.host.innerHTML,/Page 1/);
});
