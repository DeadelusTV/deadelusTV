'use strict';
// Tests sans réseau ni dépendance : module DCG et routeur réel du site principal.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(base,p),'utf8');
const html=read('public/index.html'),source=read('public/modules/dcg/portal.js'),config=read('public/modules/dcg/config.js'),router=read('public/assets/app.js'),css=read('public/modules/dcg/portal.css');
const tick=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));};
class Node{
 constructor(){this.isConnected=true;this.open=false;this.listeners={};this.attributes={};this.dataset={};this.hidden=false;this._html='';this.textContent='';this.value='';this.focused=false;const classes=new Set();this.classList={add:s=>classes.add(s),remove:s=>classes.delete(s),contains:s=>classes.has(s),toggle(s,force){const next=force??!classes.has(s);if(next)classes.add(s);else classes.delete(s);return next;}};}
 addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);}
 emit(name,target=this,extra={}){let prevented=false;for(const fn of this.listeners[name]||[])fn({...extra,target,preventDefault(){prevented=true;},stopPropagation(){}});return prevented;}
 setAttribute(name,value){this.attributes[name]=String(value);}
 getAttribute(name){return this.attributes[name]??null;}
 removeAttribute(name){delete this.attributes[name];}
 set innerHTML(value){this._html=value;}get innerHTML(){return this._html;}
 replaceChildren(){this._html='';}
 focus(){this.focused=true;}
 showModal(){this.open=true;}
 close(){this.open=false;this.onClose?.();}
 getBoundingClientRect(){return {left:100,right:700,top:100,bottom:600};}
 scrollIntoView(options){this.scroll=options;}
 matches(selector){return this.selector===selector;}
 closest(selector){return this.selector===selector?this:null;}
 querySelector(selector){return this.nodes?.[selector]||null;}
}
function setup({hash='#tcg',user=null,getSession,withAuth=true,registered=true,getUser,getMembership,spaces,showSingle=true,random}={}){
 const root=new Node(),heading=new Node(),list=new Node(),search=new Node(),searchForm=new Node(),searchDialog=new Node(),searchResults=new Node(),directory=new Node(),discoveryRoot=new Node(),rail=new Node(),nav=new Node(),menu=new Node(),back=new Node(),main=new Node(),brand=new Node(),passRoot=new Node();
 search.selector='[data-portal-search]';searchDialog.selector='[data-portal-search-dialog]';searchDialog.onClose=()=>root.emit('close',searchDialog);searchForm.nodes={input:search};root.nodes={'h1':heading,'[data-portal-spaces]':list,'[data-portal-search]':search,'#dcg-annuaire':directory,'#dcg-decouverte':discoveryRoot,'[data-portal-carousel]':rail,'[data-portal-search-form]':searchForm,'[data-portal-search-dialog]':searchDialog,'[data-portal-search-results]':searchResults};rail.clientWidth=500;rail.scrollBy=options=>rail.scrolled=options;
 root.nodes['#daily-pass-root']=passRoot;
 const pageNames=['accueil','tcg','phasmophobia','crewmongus','pavillon-noir','mentions-legales','confidentialite','conditions-utilisation','conditions-vente'];
 const sections=pageNames.map(name=>{const n=new Node();n.dataset.page=name;n.nodes={h1:heading};return n;});
 const navNodes=['accueil','tcg','phasmophobia','crewmongus','jeux-de-role'].map(name=>{const n=new Node();n.dataset.nav=name;return n;});
 const documentListeners={},windowListeners={},calls=[],location={hash,search:'',pathname:'/'};
 const known={'#main-nav':nav,'.menu-toggle':menu,'#back-top':back,'#main-content':main,'.brand':brand,'#dcg-portal-root':root};
 const document={hidden:false,body:{classList:{add(){},remove(){}}},getElementById:id=>known['#'+id]||null,querySelector(selector){if(known[selector])return known[selector];const match=selector.match(/^\[data-page="(.+)"\] h1$/);if(match)return heading;return null;},querySelectorAll(selector){if(selector==='[data-page]')return sections;if(selector==='[data-nav]')return navNodes;return [];},addEventListener(name,fn){(documentListeners[name]??=[]).push(fn);}};
 const context={document,location,console,URL,URLSearchParams,Object,setTimeout,clearTimeout,setInterval:()=>1,innerWidth:1200,scrollTo(){},matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(name,fn){(windowListeners[name]??=[]).push(fn);},DEADELUSTV_CONFIG:{},DEADELUSTV_CREW:{render:(...args)=>calls.push(['crew',...args]),cancel:()=>{}},DEADELUSTV_PAVILLON:{render:(...args)=>calls.push(['pavillon',...args]),cancel:()=>{}},DEADELUSTV_TWITCH:{sync(){}}};
 let currentUser=user,signins=0;const reads=[],passCalls=[];context.DCGDailyPass={mount:element=>passCalls.push(['mount',element]),unmount:()=>passCalls.push(['unmount'])};const storage=new Map(user?[['sb-eodtxlhnfzyapkyvvxdi-auth-token','session-present']]:[]);context.localStorage={getItem:k=>storage.get(k)??null};if(random)context.Math=Object.assign(Object.create(Math),{random});
 if(withAuth)context.DEADELUSTV_AUTH={getClient:async()=>({auth:{getSession:getSession||(async()=>({data:{session:currentUser?{user:currentUser}:null}})),getUser:getUser||(async()=>({data:{user:currentUser}}))},from(table){reads.push({table});return {select(columns){reads.at(-1).columns=columns;return this;},eq(column,value){reads.at(-1).filter={column,value};return this;},async maybeSingle(){return getMembership?getMembership():{data:registered&&currentUser?{user_id:currentUser.id}:null};}};}}),signIn:()=>{signins++;}};
 if(withAuth)Object.defineProperty(context.DEADELUSTV_AUTH,'userId',{get:()=>currentUser?.id||null});
 context.window=context;vm.createContext(context);vm.runInContext(config,context);context.DEADELUSTV_DCG_CONFIG={...context.DEADELUSTV_DCG_CONFIG,...(spaces?{spaces}:{}),showDiscoveryWithSingleStreamer:showSingle};vm.runInContext(source,context);vm.runInContext(router,context);
 return {root,heading,list,search,searchForm,searchDialog,searchResults,directory,rail,reads,discoveryRoot,menu,nav,sections,calls,context,navNodes,passCalls,passRoot,get signins(){return signins;},async go(value){location.hash=value;for(const fn of windowListeners.hashchange||[])fn();await tick();},async auth(user){currentUser=user;if(user)storage.set('sb-eodtxlhnfzyapkyvvxdi-auth-token','session-present');else storage.clear();for(const fn of windowListeners['deadelustv:auth-change']||[])fn({detail:{authenticated:!!user}});await tick();},click(selector){const n=new Node();n.selector=selector;return root.emit('click',n);}};
}

test('the Pass route mounts its view and leaving the route only unmounts that view',async()=>{
 const s=setup();assert.equal(s.passCalls.some(c=>c[0]==='mount'),false);await s.go('#tcg/connexion-pass');
 assert.deepEqual(s.passCalls.at(-1),['mount',s.passRoot]);assert.match(s.root.innerHTML,/id="daily-pass-root"/);
 await s.go('#phasmophobia');assert.deepEqual(s.passCalls.at(-1),['unmount']);assert.equal(s.root.innerHTML,'');
});
test('the Pass route reuses login and removes the login prompt after verified authentication',async()=>{
 const s=setup({hash:'#tcg/connexion-pass'});assert.match(s.root.innerHTML,/data-portal-login/);s.click('[data-portal-login]');assert.equal(s.signins,1);
 await s.auth({id:'alice'});assert.doesNotMatch(s.root.innerHTML,/data-portal-login/);assert.deepEqual(s.passCalls.at(-1),['mount',s.passRoot]);
 await s.auth(null);assert.match(s.root.innerHTML,/data-portal-login/);
});
test('DCG replaces only its own waiting page and is mounted by the real site router',()=>{
 const s=setup();assert.equal(s.sections.find(n=>n.dataset.page==='tcg').hidden,false);assert.equal(s.sections.find(n=>n.dataset.page==='accueil').hidden,true);
 assert.match(s.root.innerHTML,/Collectionne les/);assert.match(s.root.innerHTML,/Connexion Pass/);assert.match(s.root.innerHTML,/data-discovery-dcg="deadelustv"/);assert.match(s.root.innerHTML,/Mes DCG/);
 assert.equal(s.navNodes.find(n=>n.dataset.nav==='tcg').getAttribute('aria-current'),'page');assert.equal(s.heading.id,'tcg-title');
 assert.match(s.context.document.title,/DCG/);assert.equal(s.signins,0);
});
test('each common subpage is a real DCG route; unknown DCG subpages safely return to its directory',async()=>{
 const s=setup();for(const [route,text]of[['regles','Les règles du jeu'],['collections-communes','aucun booster commun n’est en vente'],['connexion-pass','Ton rendez-vous quotidien']]){
  await s.go('#tcg/'+route);assert.match(s.root.innerHTML,new RegExp(text));assert.equal(s.sections.find(n=>n.dataset.page==='tcg').hidden,false);assert.match(s.root.innerHTML,new RegExp('href="#tcg/'+route+'" aria-current="page"'));
 }
 await s.go('#tcg/inconnu');assert.match(s.root.innerHTML,/data-portal-search/);
});
test('the logo and directory lead to the existing Workers boosters, with no embedded game or copied auth client',()=>{
 const s=setup();assert.equal((s.root.innerHTML.match(/href="https:\/\/tcg\.yekelle-boulet\.workers\.dev\/#\/boosters"/g)||[]).length,3);
 assert.doesNotMatch(s.root.innerHTML,/<iframe|<script/);assert.doesNotMatch(source,/createClient|service_role|rpc\(|fetch\(/);
});
test('global streamer search handles accents without filtering personal DCG or replacing the input',async()=>{
 const s=setup({user:{id:'player'}});await tick();s.click('[data-portal-search-open]');assert.equal(s.searchDialog.open,true);assert.equal(s.search.focused,true);
 s.search.value='DÉADELUS';s.root.emit('input',s.search);assert.match(s.searchResults.innerHTML,/data-portal-search-result="deadelustv"/);
 s.search.value='<img src=x>';s.root.emit('input',s.search);assert.match(s.searchResults.innerHTML,/Aucun streamer/);assert.doesNotMatch(s.searchResults.innerHTML,/<img/);assert.match(s.list.innerHTML,/data-dcg="deadelustv"/);
 s.search.value='';s.root.emit('input',s.search);assert.match(s.searchResults.innerHTML,/DeadelusTV/);assert.equal(s.root.nodes['[data-portal-search]'],s.search);
 assert.equal(s.click('[data-portal-directory]'),true);assert.equal(s.rail.focused,true);
});

test('anonymous account access reuses the common Twitch login',async()=>{
 const s=setup({hash:'#tcg/mon-compte'});await tick();assert.match(s.root.innerHTML,/data-portal-login/);s.click('[data-portal-login]');assert.equal(s.signins,1);
});
test('personal display escapes Twitch metadata and logout clears all previous account content',async()=>{
 const s=setup({hash:'#tcg/mon-compte',user:{id:'one',user_metadata:{preferred_username:'<img src=x> & Yekelle'}}});await tick();
 assert.match(s.root.innerHTML,/&lt;img src=x&gt; &amp; Yekelle/);assert.doesNotMatch(s.root.innerHTML,/<img src=x>/);assert.match(s.root.innerHTML,/https:\/\/tcg\.yekelle-boulet\.workers\.dev\/#\/catalogue/);
 await s.auth(null);assert.doesNotMatch(s.root.innerHTML,/Yekelle/);assert.match(s.root.innerHTML,/data-portal-login/);
});
test('late account results cannot restore private content after a route change or a newer logout',async()=>{
 let release;const s=setup({hash:'#tcg/mon-compte',getSession:()=>new Promise(r=>{release=r;})});await tick();await s.go('#phasmophobia');
 release({data:{session:{user:{id:'old',user_metadata:{preferred_username:'SECRET'}}}}});await tick();assert.equal(s.root.innerHTML,'');
 let resolveFirst,reads=0;const other=setup({hash:'#tcg/mon-compte',getSession:()=>++reads===1?new Promise(r=>resolveFirst=r):Promise.resolve({data:{session:null}})});await tick();await other.auth(null);
 resolveFirst({data:{session:{user:{id:'old',user_metadata:{preferred_username:'OLD_ACCOUNT'}}}}});await tick();assert.doesNotMatch(other.root.innerHTML,/OLD_ACCOUNT/);assert.match(other.root.innerHTML,/data-portal-login/);
});
test('account read failures show a retry and never display diagnostic messages',async()=>{
 let fail=true;const s=setup({hash:'#tcg/mon-compte',getSession:async()=>{if(fail)throw Error('private diagnostic');return {data:{session:null}};}});await tick();
 assert.match(s.root.innerHTML,/data-portal-account-retry/);assert.doesNotMatch(s.root.innerHTML,/private diagnostic/);fail=false;s.click('[data-portal-account-retry]');await tick();assert.match(s.root.innerHTML,/data-portal-login/);
});
test('Phasmophobia, Crew, Pavillon and legal routes retain their existing dispatch and close the mobile menu',async()=>{
 const s=setup();s.menu.emit('click');assert.equal(s.menu.getAttribute('aria-expanded'),'true');await s.go('#phasmophobia/news/article');
 assert.equal(s.sections.find(n=>n.dataset.page==='phasmophobia').hidden,false);assert.equal(s.root.innerHTML,'');assert.equal(s.menu.getAttribute('aria-expanded'),'false');
 await s.go('#crewmongus/stats');assert.equal(s.calls.at(-1)[0],'crew');await s.go('#pavillon-noir/campagne');assert.equal(s.calls.at(-1)[0],'pavillon');
 await s.go('#mentions-legales');assert.equal(s.sections.find(n=>n.dataset.page==='mentions-legales').hidden,false);
});
test('markup and scripts are integrated once, and all portal CSS selectors are scoped to its section',()=>{
 assert.equal((html.match(/id="page-tcg"/g)||[]).length,1);assert.equal((html.match(/id="dcg-portal-root"/g)||[]).length,1);
 assert.ok(html.indexOf('modules/dcg/portal.js')<html.indexOf('assets/app.js'));assert.match(html,/<a href="#tcg" data-nav="tcg">DCG<\/a>/);
 assert.doesNotMatch(html,/assets\/tcg-attente\.css/);assert.match(html,/modules\/phasmophobia\/module.js/);assert.match(html,/assets\/consent.js/);
 const selectors=[...css.matchAll(/(?:^|[{}])\s*([^@{}]+)\{/g)].map(m=>m[1].trim()).filter(Boolean);
 assert.ok(selectors.length>40);for(const group of selectors)for(const selector of group.split(','))assert.ok(selector.trim().startsWith('#page-tcg ' )||selector.trim()==='#page-tcg',selector);
 assert.match(css,/@media.*max-width:\s*600px/);assert.match(css,/prefers-reduced-motion/);
});

test('Mes DCG reads only the signed-in player account, without joining a game or requiring a Viewer card',async()=>{
 const s=setup({user:{id:'admin-player'}});await tick();assert.match(s.list.innerHTML,/data-dcg="deadelustv"/);assert.match(s.root.innerHTML,/data-portal-search-open/);
 assert.deepEqual(s.reads,[{table:'tcg_accounts',columns:'user_id',filter:{column:'user_id',value:'admin-player'}}]);assert.doesNotMatch(source,/\.insert\(|\.update\(|\.upsert\(|\.rpc\(|\.functions\./);
});
test('anonymous and unregistered visitors retain public discovery but have no personal DCG',async()=>{
 const anonymous=setup({withAuth:false});await tick();assert.match(anonymous.list.innerHTML||anonymous.root.innerHTML,/Connecte-toi avec Twitch/);assert.equal(anonymous.reads.length,0);
 const player=setup({user:{id:'new-player'},registered:false});await tick();assert.match(player.list.innerHTML,/pas encore rejoint/);assert.doesNotMatch(player.list.innerHTML,/data-dcg=/);assert.match(player.root.innerHTML,/data-portal-search-open/);assert.match(player.root.innerHTML,/data-discovery-dcg="deadelustv"/);
 const mismatched=setup({user:{id:'player'},getMembership:async()=>({data:{user_id:'someone-else'}})});await tick();assert.doesNotMatch(mismatched.list.innerHTML,/data-dcg=/);
});
test('late membership responses cannot restore Mes DCG after sign-out or leaving the portal',async()=>{
 let release;const s=setup({user:{id:'old'},getMembership:()=>new Promise(r=>release=r)});await tick();await s.auth(null);assert.match(s.list.innerHTML,/Connecte-toi/);release({data:{user_id:'old'}});await tick();assert.doesNotMatch(s.list.innerHTML,/data-dcg=/);
 let finish;const other=setup({user:{id:'old'},getMembership:()=>new Promise(r=>finish=r)});await tick();await other.go('#phasmophobia');finish({data:{user_id:'old'}});await tick();assert.equal(other.root.innerHTML,'');
});
test('membership failures show a retry and never promote a public DCG to Mes DCG',async()=>{
 let fail=true;const s=setup({user:{id:'player'},getMembership:async()=>fail?{error:{message:'PRIVATE DATABASE DIAGNOSTIC'}}:{data:{user_id:'player'}}});await tick();assert.match(s.list.innerHTML,/data-portal-my-retry/);assert.doesNotMatch(s.list.innerHTML,/PRIVATE|data-dcg=/);fail=false;s.click('[data-portal-my-retry]');await tick();assert.match(s.list.innerHTML,/data-dcg="deadelustv"/);
});
const manySpaces=()=>Array.from({length:35},(_,i)=>({id:'streamer-'+i,name:'Streamer '+i,avatar:'https://images.example/'+i+'.png',gameBase:'https://game.example/'+i+'/'}));
const discoveryIds=s=>[...s.root.innerHTML.matchAll(/data-discovery-dcg="([^"]+)"/g)].map(m=>m[1]);
test('public discovery is capped at twenty unique streamers, with only avatar and name inside each pill',()=>{
 const s=setup({spaces:manySpaces(),random:()=>.25});const ids=discoveryIds(s);assert.equal(ids.length,20);assert.equal(new Set(ids).size,20);
 const pills=[...s.root.innerHTML.matchAll(/<a class="portal-streamer-pill"[^>]*>(.*?)<\/a>/g)].map(m=>m[1]);assert.equal(pills.length,20);for(const pill of pills){assert.match(pill,/<img[^>]*><span>Streamer \d+<\/span>$/);assert.doesNotMatch(pill,/carte|exemplaire|Version de test/);}
});
test('discovery reshuffles on a new page load and stays stable on navigation, search and auth changes',async()=>{
 const s=setup({spaces:manySpaces(),random:()=>0});const before=discoveryIds(s);const other=setup({spaces:manySpaces(),random:()=>.99});assert.notDeepEqual(before,discoveryIds(other));
 await s.go('#tcg/regles');await s.go('#tcg');assert.deepEqual(discoveryIds(s),before);await s.auth({id:'player'});assert.deepEqual(discoveryIds(s),before);s.search.value='absent';s.root.emit('input',s.search);assert.deepEqual(discoveryIds(s),before);
});
test('single-streamer discovery is visible in the test config and can be hidden independently of Mes DCG',async()=>{
 const preview=setup();assert.match(preview.root.innerHTML,/id="dcg-discovery-title">Les DCG/);
 const hidden=setup({user:{id:'player'},showSingle:false});await tick();assert.doesNotMatch(hidden.root.innerHTML,/id="dcg-discovery-title"/);assert.match(hidden.list.innerHTML,/data-dcg="deadelustv"/);
});
test('carousel controls scroll horizontally and honor reduced-motion preferences',()=>{
 const s=setup({spaces:manySpaces()});const button=new Node();button.selector='[data-portal-carousel-direction]';button.dataset.portalCarouselDirection='next';s.root.emit('click',button);assert.equal(s.rail.scrolled.left,400);assert.equal(s.rail.scrolled.behavior,'smooth');
 s.context.matchMedia=()=>({matches:true});button.dataset.portalCarouselDirection='previous';s.root.emit('click',button);assert.equal(s.rail.scrolled.left,-400);assert.equal(s.rail.scrolled.behavior,'instant');
});
test('the floating search includes unjoined DCG outside the random carousel and works anonymously',()=>{
 const s=setup({spaces:manySpaces(),withAuth:false,random:()=>0});s.click('[data-portal-search-open]');assert.equal(s.searchDialog.open,true);assert.equal((s.searchResults.innerHTML.match(/data-portal-search-result=/g)||[]).length,35);assert.equal(discoveryIds(s).length,20);
 const outside=manySpaces().find(space=>!discoveryIds(s).includes(space.id));s.search.value=outside.name;s.root.emit('input',s.search);assert.match(s.searchResults.innerHTML,new RegExp('data-portal-search-result="'+outside.id+'"'));assert.equal(s.reads.length,0);assert.equal(s.signins,0);
});
test('closing the floating search returns focus to its trigger and opening it twice is harmless',()=>{
 const s=setup(),trigger=new Node();trigger.selector='[data-portal-search-open]';s.root.emit('click',trigger);s.root.emit('click',trigger);assert.equal(s.searchDialog.open,true);assert.equal(s.search.focused,true);
 s.click('[data-portal-search-close]');assert.equal(s.searchDialog.open,false);assert.equal(trigger.focused,true);
 trigger.focused=false;s.root.emit('click',trigger);s.search.value='Deadelus';assert.equal(s.root.emit('keydown',s.search,{key:'Escape'}),true);assert.equal(s.searchDialog.open,false);assert.equal(s.search.value,'Deadelus');assert.equal(trigger.focused,true);
});
test('backdrop clicks close the search while clicks on padding inside the dialog keep it open',()=>{
 const s=setup();s.click('[data-portal-search-open]');s.root.emit('click',s.searchDialog,{clientX:300,clientY:200});assert.equal(s.searchDialog.open,true);s.root.emit('click',s.searchDialog,{clientX:20,clientY:20});assert.equal(s.searchDialog.open,false);
});
test('changing account keeps the public query and its results without filtering Mes DCG',async()=>{
 const s=setup();s.click('[data-portal-search-open]');s.search.value='Deadelus';s.root.emit('input',s.search);const before=s.searchResults.innerHTML;
 await s.auth({id:'player'});assert.equal(s.searchDialog.open,true);assert.equal(s.search.value,'Deadelus');assert.equal(s.searchResults.innerHTML,before);assert.match(s.list.innerHTML,/data-dcg="deadelustv"/);
 await s.auth(null);assert.equal(s.searchDialog.open,true);assert.equal(s.search.value,'Deadelus');assert.equal(s.searchResults.innerHTML,before);assert.match(s.list.innerHTML,/Connecte-toi/);
});
test('leaving the portal closes the modal and choosing a result closes it before navigation',async()=>{
 const s=setup(),trigger=new Node();trigger.selector='[data-portal-search-open]';s.root.emit('click',trigger);await s.go('#phasmophobia');assert.equal(s.searchDialog.open,false);assert.equal(trigger.focused,false);
 await s.go('#tcg');s.root.emit('click',trigger);s.click('[data-portal-search-result]');assert.equal(s.searchDialog.open,false);assert.equal(trigger.focused,false);assert.match(s.searchResults.innerHTML,/href="https:\/\/tcg\.yekelle-boulet\.workers\.dev\/#\/boosters"/);
});
test('streamer names in search results are escaped and unsafe destinations never become links',()=>{
 const s=setup({spaces:[{id:'safe',name:'<svg onload=bad> & Viewer',avatar:'https://images.example/a.png',gameBase:'https://game.example/'},{id:'unsafe',name:'Unsafe',avatar:'https://images.example/a.png',gameBase:'javascript:bad()'}]});s.click('[data-portal-search-open]');assert.match(s.searchResults.innerHTML,/&lt;svg onload=bad&gt; &amp; Viewer/);assert.doesNotMatch(s.searchResults.innerHTML,/<svg|javascript:|>Unsafe</);assert.match(s.root.innerHTML,/aria-labelledby="dcg-search-title"/);
});

