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
const sampleStats={boosters_opened:15,alkahests_earned:100,activity_days:2,boosters_purchased:7,booster_hits:4,legendary_cards:3};
function setup({hash='#tcg',user=null,getSession,withAuth=true,registered=true,getUser,getMembership,spaces,discoveryRead,statsRead,xpMount,xpRead,stockMount,liveMount}={}){
 const root=new Node(),heading=new Node(),list=new Node(),search=new Node(),searchForm=new Node(),searchDialog=new Node(),searchResults=new Node(),nav=new Node(),menu=new Node(),back=new Node(),main=new Node(),brand=new Node(),passRoot=new Node();
 search.selector='[data-portal-search]';searchDialog.selector='[data-portal-search-dialog]';searchDialog.onClose=()=>root.emit('close',searchDialog);searchForm.nodes={input:search};root.nodes={'[data-general-xp]':new Node(),'h1':heading,'[data-portal-spaces]':list,'[data-portal-search]':search,'[data-portal-search-form]':searchForm,'[data-portal-search-dialog]':searchDialog,'[data-portal-search-results]':searchResults};
 root.nodes['#daily-pass-root']=passRoot;root.nodes['[data-general-xp-details]']=new Node();
 const discoveryHost=new Node(),discoveryReads=[];
 const statsHost=new Node();
 Object.defineProperty(root.nodes,'[data-portal-stats]',{get:()=>root.innerHTML.includes('data-portal-stats')?statsHost:null});
 Object.defineProperty(root.nodes,'#dcg-decouverte',{get:()=>root.innerHTML.includes('id="dcg-decouverte"')?discoveryHost:null});
 const pageNames=['accueil','tcg','phasmophobia','crewmongus','pavillon-noir','mentions-legales','confidentialite','conditions-utilisation','conditions-vente'];
 const sections=pageNames.map(name=>{const n=new Node();n.dataset.page=name;n.nodes={h1:heading};return n;});
 const navNodes=['accueil','tcg','phasmophobia','crewmongus','jeux-de-role'].map(name=>{const n=new Node();n.dataset.nav=name;return n;});
 const documentListeners={},windowListeners={},calls=[],location={hash,search:'',pathname:'/'};
 const history={state:{},replacements:[],replaceState(state,title,url){this.state=state;this.replacements.push(url);location.hash=url;}};
 const known={'#main-nav':nav,'.menu-toggle':menu,'#back-top':back,'#main-content':main,'.brand':brand,'#dcg-portal-root':root};
 const document={hidden:false,body:{classList:{add(){},remove(){}}},getElementById:id=>known['#'+id]||null,querySelector(selector){if(known[selector])return known[selector];const match=selector.match(/^\[data-page="(.+)"\] h1$/);if(match)return heading;return null;},querySelectorAll(selector){if(selector==='[data-page]')return sections;if(selector==='[data-nav]')return navNodes;return [];},addEventListener(name,fn){(documentListeners[name]??=[]).push(fn);}};
 const context={document,location,history,console,URL,URLSearchParams,Object,setTimeout,clearTimeout,setInterval:()=>1,innerWidth:1200,scrollTo(){},matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(name,fn){(windowListeners[name]??=[]).push(fn);},DEADELUSTV_CONFIG:{},DEADELUSTV_CREW:{render:(...args)=>calls.push(['crew',...args]),cancel:()=>{}},DEADELUSTV_PAVILLON:{render:(...args)=>calls.push(['pavillon',...args]),cancel:()=>{}},DEADELUSTV_TWITCH:{sync(){}}};
 let currentUser=user,signins=0;const reads=[],passCalls=[],xpReads=[];context.DCGDailyPass={mount:(element,options)=>passCalls.push(['mount',element,options]),unmount:()=>passCalls.push(['unmount'])};const storage=new Map(user?[['sb-eodtxlhnfzyapkyvvxdi-auth-token','session-present']]:[]);context.localStorage={getItem:k=>storage.get(k)??null};
 if(withAuth)context.DEADELUSTV_AUTH={getClient:async()=>({auth:{getSession:getSession||(async()=>({data:{session:currentUser?{user:currentUser}:null}})),getUser:getUser||(async()=>({data:{user:currentUser}}))},rpc:async(name,args)=>{
  if(name==='tcg_portal_discovery'){
   discoveryReads.push({args});
   return discoveryRead?discoveryRead():{data:[]};
  }
  if(name==='tcg_my_portal_stats')return statsRead?statsRead():{data:sampleStats};
  xpReads.push({name,args});return xpRead?xpRead(name,args):{data:{scope:'streamer',broadcaster_id:'99977368',total:30,level:2}};},from(table){reads.push({table});return {select(columns){reads.at(-1).columns=columns;return this;},eq(column,value){reads.at(-1).filter={column,value};return this;},async maybeSingle(){return getMembership?getMembership():{data:registered&&currentUser?{user_id:currentUser.id}:null};}};}}),signIn:()=>{signins++;}};
 if(withAuth)Object.defineProperty(context.DEADELUSTV_AUTH,'userId',{get:()=>currentUser?.id||null});
 if(liveMount)context.DCGPortalLive={mount:liveMount};if(stockMount)context.DCGPortalStock={mount:stockMount};if(xpMount)context.DCGXPPass={mount:xpMount};context.window=context;vm.createContext(context);vm.runInContext(read('public/modules/dcg/dcg-xp.js'),context);vm.runInContext(config,context);context.DEADELUSTV_DCG_CONFIG={...context.DEADELUSTV_DCG_CONFIG,...(spaces?{spaces}:{})};vm.runInContext(source,context);vm.runInContext(router,context);
 return {emitWindow(type,detail){for(const fn of windowListeners[type]||[])fn({detail});},root,heading,list,search,searchForm,searchDialog,searchResults,reads,xpReads,discoveryReads,discoveryHost,menu,nav,sections,calls,context,navNodes,passCalls,passRoot,get signins(){return signins;},async go(value){discoveryHost.innerHTML='';location.hash=value;for(const fn of windowListeners.hashchange||[])fn();await tick();},async auth(user){currentUser=user;if(user)storage.set('sb-eodtxlhnfzyapkyvvxdi-auth-token','session-present');else storage.clear();for(const fn of windowListeners['deadelustv:auth-change']||[])fn({detail:{authenticated:!!user}});await tick();},click(selector){const n=new Node();n.selector=selector;return root.emit('click',n);}};
}

test('the removed Pass tab redirects old links to home and keeps the progress view',async()=>{
 const s=setup({hash:'#tcg/connexion-pass'});assert.equal(s.context.location.hash,'#tcg');assert.deepEqual(s.context.history.replacements,['#tcg']);
 const nav=s.root.innerHTML.match(/<nav class="dcg-portal-nav"[^>]*>(.*?)<\/nav>/)[1];
 assert.equal((nav.match(/<a /g)||[]).length,4);assert.doesNotMatch(nav,/connexion-pass|Connexion Pass/);assert.match(nav,/href="#tcg" aria-current="page"/);
 await s.go('#tcg/mon-compte');await s.go('#tcg/connexion-pass');assert.equal(s.context.location.hash,'#tcg');
 assert.equal(s.passCalls.at(-1)[1],s.passRoot);assert.equal(s.passCalls.at(-1)[2].view,'progress');assert.match(s.root.innerHTML,/daily-pass-root/);
 assert.match(s.root.innerHTML,/Collectionne les/);assert.doesNotMatch(s.root.innerHTML,/portal-heading|portal-pass-login|Découvrir le Pass/);
 await s.go('#phasmophobia');assert.deepEqual(s.passCalls.at(-1),['unmount']);assert.equal(s.root.innerHTML,'');
});

test('Mon compte owns detailed Pass information and keeps the shared Twitch login',async()=>{
 const s=setup({hash:'#tcg/mon-compte'});await tick();assert.match(s.root.innerHTML,/data-portal-login/);s.click('[data-portal-login]');assert.equal(s.signins,1);
 assert.equal(s.passCalls.at(-1)[2].view,'details');assert.equal((s.root.innerHTML.match(/id="daily-pass-root"/g)||[]).length,1);
 await s.auth({id:'alice'});assert.doesNotMatch(s.root.innerHTML,/data-portal-login/);assert.equal(s.passCalls.at(-1)[2].view,'details');
 await s.auth(null);assert.match(s.root.innerHTML,/data-portal-login/);
 await s.go('#tcg');assert.equal(s.passCalls.at(-1)[2].view,'progress');assert.doesNotMatch(s.root.innerHTML,/Découvrir le Pass|portal-pass-title/);
});

test('DCG replaces only its own waiting page and is mounted by the real site router',()=>{
 const s=setup();assert.equal(s.sections.find(n=>n.dataset.page==='tcg').hidden,false);assert.equal(s.sections.find(n=>n.dataset.page==='accueil').hidden,true);
 assert.match(s.root.innerHTML,/Collectionne les/);assert.match(s.root.innerHTML,/Connexion Pass/);assert.match(s.root.innerHTML,/data-discovery-dcg="99977368"/);assert.match(s.root.innerHTML,/Mes DCG/);
 assert.equal(s.navNodes.find(n=>n.dataset.nav==='tcg').getAttribute('aria-current'),'page');assert.equal(s.heading.id,'tcg-title');
 assert.match(s.context.document.title,/DCG/);assert.equal(s.signins,0);
});
test('each common subpage is a real DCG route; unknown DCG subpages safely return to its directory',async()=>{
 const s=setup();for(const [route,text]of[['regles','Les règles du jeu'],['collections-communes','aucun booster commun n’est en vente']]){
  await s.go('#tcg/'+route);assert.match(s.root.innerHTML,new RegExp(text));assert.equal(s.sections.find(n=>n.dataset.page==='tcg').hidden,false);assert.match(s.root.innerHTML,new RegExp('href="#tcg/'+route+'" aria-current="page"'));
 }
 await s.go('#tcg/inconnu');assert.match(s.root.innerHTML,/data-portal-search/);
});
test('rules present five ordered cards with the FAQ below them',()=>{
 const s=setup({hash:'#tcg/regles'});
 const markup=s.root.innerHTML;
 const cards=[...markup.matchAll(/<(button|a|article)\b([^>]*\bportal-rules-card\b[^>]*)>([\s\S]*?)<\/\1>/g)];
 const expected=[
  ['button','Connection','Connecte toi avec ton compte Twitch'],
  ['a','Ton Streameur','Recherche ton Streameur préféré'],
  ['article','Ta propre carte',"Pour qu'elle apparaisse dans la collection de ton streameur"],
  ['article','Commence à jouer','Ouvre tes premiers Booster et collectionne les cartes de la communauté'],
  ['article',"Rejoins d'autres communautés",'Recommence avec tous les Streameurs que tu suis']
 ];
 assert.equal(cards.length,expected.length);
 for(const [index,[tag,label,description]] of expected.entries()){
  const [,actualTag,,body]=cards[index];
  assert.equal(actualTag,tag);
  const lines=[...body.matchAll(/<[^>]*class="[^"]*\bportal-rules-(title|description)\b[^"]*"[^>]*>([^<]*)</g)];
  assert.deepEqual(lines.map(([,role,text])=>[role,text.trim().replace(/&#39;|&apos;/g,"'")]),[
   ['title',label],['description',description]
  ]);
  if(index<4){
   const art=body.match(/<[^>]*class="[^"]*\bportal-rule-art\b[^"]*"[^>]*>/)?.[0];
   assert.ok(art,label);
   assert.match(art,/aria-hidden="true"|^<img\b[^>]*\balt=""/,label);
  } else {
   assert.match(body,/<[^>]*class="[^"]*\bportal-common-art\b[^"]*"[^>]*>\s*∞\s*</);
  }
 }
 assert.match(cards[0][2],/\bdata-portal-login\b/);
 assert.match(cards[1][2],/href="#tcg"/);
 assert.match(cards[1][2],/\bdata-portal-search-link\b/);
 const faqHeading=markup.match(/<h2\b[^>]*>FAQ<\/h2>/);
 assert.ok(faqHeading && faqHeading.index>cards.at(-1).index);
 assert.doesNotMatch(markup,/Un compte Twitch, plusieurs univers à collectionner/);
 s.click('[data-portal-login]');
 assert.equal(s.signins,1);
});
test('the rules FAQ covers the game, subscriber drops and ways to support the game',()=>{
 const markup=setup({hash:'#tcg/regles'}).root.innerHTML;
 const topics=[...markup.matchAll(/<details\b[^>]*>\s*<summary\b[^>]*>([^<]+)<\/summary>([\s\S]*?)<\/details>/g)];
 assert.deepEqual(topics.map(topic=>topic[1]),['Le pass quotidien','Comment récupérer des boosters ?','Les drops','Principe du jeu','Bonus et soutien']);
 assert.match(topics[1][2],/\b(?:5|cinq)\b/i);
 assert.match(topics[1][2],/par jour/i);
 assert.match(topics[2][2],/\b(?:3|trois)\b/i);
 assert.match(topics[2][2],/par live/i);
 assert.match(topics[2][2],/abonn/i);
 assert.match(topics[2][2],/doubl|deux fois|\b(?:6|six)\b/i);
 const support=topics[4][2];
 assert.match(support,/\b1\s*€\s+via PayPal\b/);
 const supportLinks=[...support.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
 assert.equal(supportLinks.length,1);
 assert.match(supportLinks[0][1],/\bhref="https:\/\/www\.twitch\.tv\/deadelustv"/);
 assert.equal(supportLinks[0][2],'MA chaîne Twitch');
 assert.doesNotMatch(markup,/portal-rule-number|Rejoins ta communauté|Gère tes Alkahests/);
});
test('the streamer card lands on the home search button after route scrolling',async()=>{
 const s=setup({hash:'#tcg/regles'});
 const link=new Node(),searchButton=new Node(),scrolls=[];
 link.selector='[data-portal-search-link]';
 s.root.nodes['[data-portal-search-open]']=searchButton;
 s.context.scrollTo=()=>scrolls.push('page');
 searchButton.scrollIntoView=()=>scrolls.push('search');
 s.root.emit('click',link,{button:0});
 await s.go('#tcg');
 assert.equal(scrolls.at(-1),'search');
 assert.equal(searchButton.focused,true);
 assert.equal(s.searchDialog.open,false);
});
test('the home hero links viewers to the rules and presents the streamer role without an action',()=>{
 const markup=setup().root.innerHTML;
 const hero=markup.match(/<section class="portal-hero"[^>]*>([\s\S]*?)<\/section>/)[1];
 assert.match(hero,/DEADELUS CARD GAME/);
 assert.match(hero,/<h1>.*Collectionne les Communautés Twitch.*<\/h1>/);
 assert.ok(hero.includes('Rejoins les constellations de tes streamers préférés, et collectionne leurs cartes. Découvre des cartes exclusives au fil des événements et des nouvelles collections !'));
 const links=[...hero.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
 assert.equal(links.length,1);
 assert.match(links[0][1],/href="#tcg\/regles"/);
 assert.match(links[0][2],/Je suis Viewer<\/span>/);
 assert.doesNotMatch(links[0][2],/Je suis Streamer/);
 assert.match(hero,/Je suis Streamer/);
 assert.ok(hero.indexOf('Je suis Streamer')<hero.indexOf('Je suis Viewer'));
 assert.equal((hero.match(/<small class="portal-role-login">connecte toi à Twitch<\/small>/g)||[]).length,2);
 assert.doesNotMatch(hero,/<button\b|role="button"|Explorer les DCG|Comment jouer|ENTRÉE DIRECTE|portal-featured/);
 assert.doesNotMatch(markup,/<iframe|<script/);assert.doesNotMatch(source,/createClient|service_role|fetch\(/);
});
test('role login hints follow Twitch sign-in and sign-out',async()=>{
 const s=setup();
 assert.match(s.root.innerHTML,/class="portal-roles" data-show-login="true"/);
 const roles=new Node();s.root.nodes['.portal-roles']=roles;
 await s.auth({id:'viewer'});assert.equal(roles.dataset.showLogin,'false');
 await s.auth(null);assert.equal(roles.dataset.showLogin,'true');
});
test('global streamer search handles accents without filtering personal DCG or replacing the input',async()=>{
 const s=setup({user:{id:'player'}});await tick();s.click('[data-portal-search-open]');assert.equal(s.searchDialog.open,true);assert.equal(s.search.focused,true);
 s.search.value='DÉADELUS';s.root.emit('input',s.search);assert.match(s.searchResults.innerHTML,/data-portal-search-result="deadelustv"/);
 s.search.value='<img src=x>';s.root.emit('input',s.search);assert.match(s.searchResults.innerHTML,/Aucun streamer/);assert.doesNotMatch(s.searchResults.innerHTML,/<img/);assert.match(s.list.innerHTML,/data-dcg="deadelustv"/);
 s.search.value='';s.root.emit('input',s.search);assert.match(s.searchResults.innerHTML,/DeadelusTV/);assert.equal(s.root.nodes['[data-portal-search]'],s.search);
});

test('anonymous account access reuses the common Twitch login',async()=>{
 const s=setup({hash:'#tcg/mon-compte'});await tick();assert.match(s.root.innerHTML,/data-portal-login/);s.click('[data-portal-login]');assert.equal(s.signins,1);
});
test('the profile home opens directly on its tabs and omits the personal greeting',async()=>{
 const s=setup({hash:'#tcg/mon-compte',user:{id:'one',user_metadata:{preferred_username:'<img src=x> & Yekelle'}}});await tick();
 assert.match(s.root.innerHTML,/ESPACE PERSONNEL/);assert.doesNotMatch(s.root.innerHTML,/Bienvenue|Yekelle|Mon compte\.<\/h1>/);
 assert.match(s.root.innerHTML,/#tcg\/mon-compte\/constellations/);
 await s.go('#tcg/mon-compte/constellations');assert.match(s.root.innerHTML,/&lt;img src=x&gt; &amp; Yekelle/);assert.doesNotMatch(s.root.innerHTML,/<img src=x>/);
 await s.auth(null);assert.doesNotMatch(s.root.innerHTML,/Yekelle/);assert.match(s.root.innerHTML,/data-portal-login/);
});

test('the account displays four private totals after the Pass, with averages and hits',async()=>{
 let calls=0;
 const s=setup({hash:'#tcg/mon-compte',statsRead:async()=>{calls++;return {data:sampleStats};}});
 await tick();assert.equal(calls,0);assert.equal(s.root.querySelector('[data-portal-stats]'),null);
 await s.auth({id:'alice'});assert.equal(calls,1);
 const host=s.root.querySelector('[data-portal-stats]');
 assert.ok(s.root.innerHTML.indexOf('id="daily-pass-root"')<s.root.innerHTML.indexOf('data-portal-stats'));
 const text=host.innerHTML.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
 assert.match(text,/Nombre de boosters ouverts 15 Moyenne par jour · 7,5/);
 assert.match(text,/Nombre d’Alkahests récoltés 100 Moyenne par jour · 50/);
 assert.match(text,/Nombre de boosters achetés 7 Nombre de hits · 4/);
 assert.match(text,/Nombre de cartes légendaires 3/);
 s.emitWindow('tcg:daily-pass-change',{gains:[{kind:'dust',amount:5}]});await tick();assert.equal(calls,2);
 await s.auth(null);assert.equal(s.root.querySelector('[data-portal-stats]'),null);
});
test('private stats can retry and a stale account reply cannot overwrite the current totals',async()=>{
 let attempts=0,release;
 const s=setup({hash:'#tcg/mon-compte',user:{id:'alice'},statsRead:async()=>{
  attempts++;
  if(attempts===1)return {error:{message:'private error'}};
  if(attempts===2)return new Promise(resolve=>{release=resolve;});
  return {data:{...sampleStats,activity_days:1}};
 }});
 await tick();
 const host=s.root.querySelector('[data-portal-stats]');
 assert.match(host.innerHTML,/data-portal-stats-retry/);assert.doesNotMatch(host.innerHTML,/private error/);
 s.click('[data-portal-stats-retry]');await tick();await s.auth({id:'bob'});
 const bob=host.innerHTML;assert.match(bob,/Moyenne par jour · 15/);
 release({data:{...sampleStats,boosters_opened:999}});await tick();assert.equal(host.innerHTML,bob);
});

test('profile subpages preserve navigation and keep the daily Pass only on the profile home',async()=>{
 const s=setup({hash:'#tcg/mon-compte',user:{id:'alice'}});await tick();assert.match(s.root.innerHTML,/Rubriques du profil/);assert.match(s.root.innerHTML,/daily-pass-root/);
 await s.go('#tcg/mon-compte/constellations');assert.match(s.root.innerHTML,/dcg-profile-root/);assert.doesNotMatch(s.root.innerHTML,/daily-pass-root/);assert.match(s.root.innerHTML,/Par constellation/);assert.match(s.root.innerHTML,/href="#tcg\/mon-compte"/);
 await s.go('#tcg/mon-compte/cartes');assert.match(s.root.innerHTML,/href="#tcg\/mon-compte\/cartes" aria-current="page"/);
 await s.auth(null);assert.match(s.root.innerHTML,/data-portal-login/);assert.doesNotMatch(s.root.innerHTML,/dcg-profile-root|daily-pass-root/);
 await s.go('#tcg/mon-compte');assert.match(s.root.innerHTML,/daily-pass-root/);assert.equal(s.passCalls.at(-1)[2].view,'details');
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
 const styleRules=css.replace(/@keyframes\s+[\w-]+\s*\{(?:\s*[^{}]+\{[^{}]*\}\s*)*\}/g,'');
 const selectors=[...styleRules.matchAll(/(?:^|[{}])\s*([^@{}]+)\{/g)].map(m=>m[1].trim()).filter(Boolean);
 assert.ok(selectors.length>40);for(const group of selectors)for(const selector of group.split(','))assert.ok(selector.trim().startsWith('#page-tcg ' )||selector.trim()==='#page-tcg',selector);
 assert.match(css,/@media.*max-width:\s*600px/);assert.match(css,/prefers-reduced-motion/);
});

test('Mes DCG reads only the signed-in player account, without joining a game or requiring a Viewer card',async()=>{
 const s=setup({user:{id:'admin-player'}});await tick();assert.match(s.list.innerHTML,/data-dcg="deadelustv"/);assert.match(s.root.innerHTML,/data-portal-search-open/);
 assert.deepEqual(s.reads,[{table:'tcg_accounts',columns:'user_id',filter:{column:'user_id',value:'admin-player'}}]);assert.doesNotMatch(source,/\.insert\(|\.update\(|\.upsert\(|tcg_claim_|\.functions\./);
});
test('anonymous and unregistered visitors retain public discovery but have no personal DCG',async()=>{
 const anonymous=setup({withAuth:false});await tick();assert.match(anonymous.list.innerHTML||anonymous.root.innerHTML,/Connecte-toi avec Twitch/);assert.equal(anonymous.reads.length,0);
 const player=setup({user:{id:'new-player'},registered:false});await tick();assert.match(player.list.innerHTML,/pas encore rejoint/);assert.doesNotMatch(player.list.innerHTML,/data-dcg=/);assert.match(player.root.innerHTML,/data-portal-search-open/);assert.match(player.root.innerHTML,/data-discovery-dcg="99977368"/);
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
const sampledDeck=(id,name='Streamer '+id)=>({
 broadcaster_id:String(id),display_name:name,avatar_url:'https://images.example/'+id+'.png',deck_url:'https://decks.example/collections/'+id+'/#/cartes'
});
const sampledOwner=sampledDeck(99977368,'DeadelusTV');
const tickerMarkup=s=>s.discoveryHost.innerHTML||s.root.innerHTML;
const discoveryIds=s=>[...tickerMarkup(s).matchAll(/data-discovery-dcg="([^"]+)"/g)].map(m=>m[1]);

test('anonymous discovery uses the public database photos, names and full deck links, with DeadelusTV last',async()=>{
 const others=Array.from({length:24},(_,i)=>sampledDeck(123+i));
 const s=setup({discoveryRead:async()=>({data:[sampledOwner,others[0],...others,sampledOwner]})});
 await tick();
 assert.deepEqual(s.discoveryReads,[{args:undefined}]);
 assert.equal(s.reads.length,0);
 assert.equal(s.xpReads.length,0);
 assert.equal(s.signins,0);
 const expected=[...others.slice(0,19),sampledOwner];
 assert.deepEqual(discoveryIds(s),expected.map(row=>row.broadcaster_id));
 const pills=[...tickerMarkup(s).matchAll(/<a\b([^>]*data-discovery-dcg="[^"]+"[^>]*)>([\s\S]*?)<\/a>/g)];
 for(const [index,[,attributes,content]] of pills.entries()){
  const row=expected[index];
  assert.ok(attributes.includes('href="'+row.deck_url+'"'));
  assert.ok(content.includes('src="'+row.avatar_url+'"'));
  assert.ok(content.includes('<span>'+row.display_name+'</span>'));
 }
});

test('fewer than nineteen public decks are followed by the owner, even when the database omits the owner',async()=>{
 for(const count of [0,1,3]){
  const rows=Array.from({length:count},(_,i)=>sampledDeck(70+i));
  const s=setup({discoveryRead:async()=>({data:rows})});
  await tick();
  assert.deepEqual(discoveryIds(s),[...rows.map(row=>row.broadcaster_id),sampledOwner.broadcaster_id]);
  assert.ok(tickerMarkup(s).includes('href="https://tcg.yekelle-boulet.workers.dev/#/boosters"'));
 }
});

test('the ticker ignores incomplete or unsafe public profiles and escapes streamer names',async()=>{
 const valid=sampledDeck(12,'A & B');
 const s=setup({discoveryRead:async()=>({data:[null,
  {...sampledDeck(9),avatar_url:'javascript:alert(0)'},
  {...sampledDeck(10),deck_url:'/relative'},
  {...sampledDeck(11),deck_url:'http://insecure.example/deck'},
  valid,sampledOwner
 ]})});
 await tick();
 assert.deepEqual(discoveryIds(s),[valid.broadcaster_id,sampledOwner.broadcaster_id]);
 assert.match(tickerMarkup(s),/<span>A &amp; B<\/span>/);
});

test('a discovery draw is shared while loading, survives navigation, and never repaints the wrong page',async()=>{
 let release;
 const rows=[sampledDeck(879),sampledOwner];
 const s=setup({discoveryRead:()=>new Promise(resolve=>{release=resolve;})});
 await tick();
 await s.go('#tcg/regles');
 await s.go('#tcg');
 assert.equal(s.discoveryReads.length,1);
 await s.go('#tcg/regles');
 const rules=s.root.innerHTML;
 release({data:rows});
 await tick();
 assert.equal(s.root.innerHTML,rules);
 assert.equal(s.discoveryHost.innerHTML,'');
 await s.go('#tcg');
 assert.deepEqual(discoveryIds(s),rows.map(row=>row.broadcaster_id));
 await s.auth({id:'player'});
 assert.equal(s.discoveryReads.length,1);
});

test('a failed discovery read retains DeadelusTV, then retries on the next home visit without rebuilding the Pass or search',async()=>{
 let release;
 const s=setup({discoveryRead:()=>s.discoveryReads.length===1
  ? {error:{message:'PRIVATE DATABASE DIAGNOSTIC'}}
  : new Promise(resolve=>{release=resolve;})});
 await tick();
 assert.deepEqual(discoveryIds(s),[sampledOwner.broadcaster_id]);
 assert.doesNotMatch(tickerMarkup(s),/PRIVATE DATABASE DIAGNOSTIC/);
 await s.go('#tcg/regles');
 await s.go('#tcg');
 assert.equal(s.discoveryReads.length,2);
 s.click('[data-portal-search-open]');
 const passCalls=s.passCalls.length;
 release({data:[sampledDeck(17),sampledOwner]});
 await tick();
 assert.deepEqual(discoveryIds(s),['17',sampledOwner.broadcaster_id]);
 assert.equal(s.passCalls.length,passCalls);
 assert.equal(s.searchDialog.open,true);
});

test('the ticker loops the same deck links without doubling screen reader or keyboard links',async()=>{
 for(const rows of [[sampledOwner],[sampledDeck(173),sampledOwner]]){
  const s=setup({discoveryRead:async()=>({data:rows})});
  await tick();
  const groups=[...tickerMarkup(s).matchAll(/<ul\b([^>]*\bportal-ticker-group\b[^>]*)>([\s\S]*?)<\/ul>/g)];
  assert.equal(groups.length,2);
  const [,primary,primaryItems]=groups[0],[,copy,copyItems]=groups[1];
  assert.doesNotMatch(primary,/aria-hidden="true"/);
  assert.match(copy,/aria-hidden="true"/);
  const links=markup=>[...markup.matchAll(/<a\b([^>]*\bhref="([^"]+)"[^>]*)>/g)];
  const originals=links(primaryItems),copies=links(copyItems);
  assert.deepEqual(originals.map(link=>link[2]),rows.map(row=>row.deck_url));
  assert.deepEqual(copies.map(link=>link[2]),originals.map(link=>link[2]));
  for(const [,attrs] of originals)assert.doesNotMatch(attrs,/tabindex="-1"/);
  for(const [,attrs] of copies)assert.match(attrs,/tabindex="-1"/);
 }
});
test('ticker motion goes left, pauses on hover, and is opt-in for normal motion and pointer navigation',()=>{
 const motionRules=css.match(/@media\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{((?:\s*[^{}]+\{[^{}]*\}\s*)*)\}/)[1];
 const animation=motionRules.match(/\.portal-ticker:not\(:has\(:focus-visible\)\)\s+\.portal-ticker-group\s*\{[^}]*animation:\s*([\w-]+)[^;]*\blinear\s+infinite/);
 assert.ok(animation);
 assert.match(motionRules,/\.portal-ticker:hover\s+\.portal-ticker-group\s*\{[^}]*animation-play-state:\s*paused/);
 assert.match(css,new RegExp('@keyframes\\s+'+animation[1]+'\\s*\\{\\s*from\\s*\\{[^}]*translateX\\(0\\)[^}]*\\}\\s*to\\s*\\{[^}]*translateX\\(-100%\\)'));
});
test('the floating search remains independent of sampled public decks and works anonymously',async()=>{
 const spaces=manySpaces();
 const s=setup({spaces,discoveryRead:async()=>({data:[sampledDeck(21),sampledOwner]})});
 await tick();
 s.click('[data-portal-search-open]');
 assert.equal(s.searchDialog.open,true);
 assert.equal((s.searchResults.innerHTML.match(/data-portal-search-result=/g)||[]).length,spaces.length);
 assert.deepEqual(discoveryIds(s),['21',sampledOwner.broadcaster_id]);
 s.search.value=spaces[3].name;
 s.root.emit('input',s.search);
 assert.match(s.searchResults.innerHTML,/data-portal-search-result="streamer-3"/);
 assert.equal(s.reads.length,0);
 assert.equal(s.signins,0);
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


test('general XP mounts on the home with the shared authenticated client and clears on logout or leaving',async()=>{
 const mounts=[];let destroyed=0;
 const s=setup({user:{id:'xp-player'},xpMount:(host,options)=>{mounts.push(options);return {destroy(){destroyed++;},reload(){}};}});
 await tick();assert.doesNotMatch(s.root.innerHTML,/Ton niveau général|class="portal-xp"/);assert.match(s.root.innerHTML,/portal-directory-actions/);assert.equal(mounts.length,1);assert.equal(mounts[0].scope,'general');assert.equal(mounts[0].compact,true);assert.equal(mounts[0].userId,'xp-player');assert.equal(mounts[0].isCurrent(),true);assert.equal(s.root.nodes['[data-general-xp]'].hidden,false);
 await s.auth(null);assert.equal(destroyed,1);assert.equal(mounts[0].isCurrent(),false);assert.equal(s.root.nodes['[data-general-xp]'].innerHTML,'');assert.equal(s.root.nodes['[data-general-xp]'].hidden,true);
 await s.auth({id:'other'});assert.equal(mounts.length,2);await s.go('#phasmophobia');assert.equal(destroyed,2);assert.equal(mounts[1].isCurrent(),false);
});


test('profile home mounts general XP details and popup rewards, with no private state on other profile tabs',async()=>{
 const mounts=[];let destroyed=0;const s=setup({hash:'#tcg/mon-compte',user:{id:'alice'},xpMount:(host,options)=>{mounts.push(options);return{destroy(){destroyed++;}};}});await tick();
 assert.match(s.root.innerHTML,/portal-profile-xp/);assert.equal(mounts.length,1);assert.equal(mounts[0].scope,'general');assert.equal(mounts[0].detailsHost,s.root.nodes['[data-general-xp-details]']);assert.equal(mounts[0].rewardPresentation,'popup');assert.equal(mounts[0].isCurrent(),true);
 await s.go('#tcg/mon-compte/cartes');assert.equal(destroyed,1);assert.equal(mounts[0].isCurrent(),false);assert.equal(mounts.length,1);assert.doesNotMatch(s.root.innerHTML,/portal-profile-xp/);
 await s.go('#tcg/mon-compte');assert.equal(mounts.length,2);await s.auth(null);assert.equal(destroyed,2);assert.equal(mounts[1].isCurrent(),false);
});
test('only a profile Pass click followed by confirmed gains displays a popup, cleared when leaving',async()=>{
 const s=setup({hash:'#tcg/mon-compte',user:{id:'alice'}});await tick();const shown=[];let cancelled=0;
 s.context.DCGProfileRewards={dailyItems:gains=>gains,show:(host,gains,options)=>{shown.push({host,gains,options});return{cancel(){cancelled++;}};}};
 const anchor=new Node();s.passRoot.nodes={'[data-day="7"]':anchor};
 const claim=new Node();claim.selector='[data-daily-pass-claim]';claim.dataset.rewardDay='7';
 s.emitWindow('tcg:daily-pass-change',{gains:[{kind:'dust',amount:35}]});assert.equal(shown.length,0);
 s.root.emit('click',claim);s.emitWindow('tcg:daily-pass-change',{gains:[{kind:'dust',amount:35}]});assert.equal(shown.length,1);assert.equal(shown[0].options.anchor,anchor);assert.equal(shown[0].options.valid(),true);
 await s.go('#tcg/mon-compte/cartes');assert.equal(cancelled,1);assert.equal(shown[0].options.valid(),false);s.emitWindow('tcg:daily-pass-change',{gains:[{kind:'dust',amount:35}]});assert.equal(shown.length,1);
});
test('a reward from another cycle anchors its confirmation to its unique visit rather than todays same day number',async()=>{
 const s=setup({hash:'#tcg/mon-compte',user:{id:'alice'}});await tick();const shown=[];
 s.context.DCGProfileRewards={dailyItems:gains=>gains,show:(host,gains,options)=>{shown.push(options);return{cancel(){}};}};
 const today=new Node(),old=new Node(),id='00000000-0000-4000-8000-000000000001';
 s.passRoot.nodes={'[data-day="1"]':today,['[data-pass-visit="'+id+'"]']:old};
 const claim=new Node();claim.selector='[data-daily-pass-claim]';claim.dataset={rewardDay:'1',visitId:id};
 s.root.emit('click',claim);s.emitWindow('tcg:daily-pass-change',{gains:[{kind:'dust',amount:5}],visit:{id,cycle:1,step:1}});
 assert.equal(shown.length,1);assert.equal(shown[0].anchor,old);
});
test('an explicit Tout récupérer profile click displays one summary at its button',async()=>{
 const s=setup({hash:'#tcg/mon-compte',user:{id:'alice'}});await tick();const shown=[];
 s.context.DCGProfileRewards={dailyItems:gains=>gains,show:(host,gains,options)=>{shown.push({gains,options});return{cancel(){}};}};
 const all=new Node();all.selector='[data-daily-pass-claim-all]';s.passRoot.nodes={'[data-daily-pass-claim-all]':all};
 s.root.emit('click',all);s.emitWindow('tcg:daily-pass-change',{bulk:true,gains:[{kind:'dust',amount:5},{kind:'dust',amount:10}]});
 assert.equal(shown.length,1);assert.equal(shown[0].options.anchor,all);assert.equal(shown[0].gains.length,2);
});


test('joined DCG tiles show the local level in a passive medal instead of the arrow',async()=>{
 const s=setup({user:{id:'alice'}});await tick();assert.deepEqual(s.xpReads,[{name:'tcg_my_xp',args:undefined}]);assert.match(s.list.innerHTML,/portal-space-level/);assert.match(s.list.innerHTML,/Ton niveau chez DeadelusTV : niveau 2/);assert.match(s.list.innerHTML,/dcg-xp__number">2</);assert.doesNotMatch(s.list.innerHTML,/portal-space-arrow|data-xp-claim|<button/);assert.match(s.list.innerHTML,/href="https:\/\/tcg.yekelle-boulet.workers.dev\/#\/boosters"/);
 const markup=s.list.innerHTML;s.emitWindow('focus');await tick();assert.equal(s.xpReads.length,2);assert.equal(s.list.innerHTML,markup);
});
test('only verified participants request a DCG level, and zero is a real server level',async()=>{
 for(const options of [{user:null},{user:{id:'alice'},registered:false}]){const s=setup(options);await tick();assert.equal(s.xpReads.length,0);assert.doesNotMatch(s.list.innerHTML,/portal-space-level/);}
 const s=setup({user:{id:'alice'},xpRead:async()=>({data:{scope:'streamer',broadcaster_id:'99977368',total:4,level:0}})});await tick();assert.match(s.list.innerHTML,/Ton niveau chez DeadelusTV : niveau 0/);assert.match(s.list.innerHTML,/4 \/ 10 boosters/);
});
test('failed or mismatched local XP never hides the DCG or invents a level',async()=>{
 for(const result of [{error:{message:'private diagnostic'}},{data:{scope:'general',total:10,level:1}},{data:{scope:'streamer',broadcaster_id:'other',total:10,level:1}},{data:{scope:'streamer',broadcaster_id:'99977368',total:0,level:99}}]){
 const s=setup({user:{id:'alice'},xpRead:async()=>result});await tick();assert.match(s.list.innerHTML,/data-dcg="deadelustv"/);assert.match(s.list.innerHTML,/Niveau momentanément indisponible/);assert.doesNotMatch(s.list.innerHTML,/dcg-xp__number|private diagnostic|portal-space-arrow/);
 }
});
test('a late local level response cannot restore another player tile after sign-out or leaving',async()=>{
 for(const leave of ['logout','route']){let release;const s=setup({user:{id:'alice'},xpRead:()=>new Promise(r=>release=r)});await tick();assert.match(s.list.innerHTML,/Lecture de ton niveau/);if(leave==='logout')await s.auth(null);else await s.go('#phasmophobia');const before=s.list.innerHTML;release({data:{scope:'streamer',broadcaster_id:'99977368',total:450,level:9}});await tick();assert.equal(s.list.innerHTML,before);assert.doesNotMatch(s.list.innerHTML,/niveau 9/);}
});


test('home stocks reuse the authenticated DCG reader and refresh only after confirmed home rewards',async()=>{
 let xp,stock,refreshes=0,destroyed=0;const target={element:{},amount:30};
 const s=setup({user:{id:'alice'},xpMount:(host,options)=>{xp=options;return{destroy(){}};},stockMount:(host,options)=>{stock={host,...options};return{sync(){},refresh(){refreshes++;},targets:()=>[target],destroy(){destroyed++;}};}});await tick();
 assert.match(s.list.innerHTML,/Boosters :/);assert.match(s.list.innerHTML,/Alkahests :/);assert.doesNotMatch(s.list.innerHTML,/Entrer dans le DCG/);assert.equal(stock.host,s.list);assert.equal(stock.userId,'alice');assert.equal(stock.readers.length,1);assert.equal(stock.readers[0].broadcasterId,'99977368');await stock.readers[0].read();assert.equal(s.xpReads.at(-1).name,'tcg_my_boosters');assert.equal(s.xpReads.at(-1).args.p_offset,0);
 assert.equal(refreshes,0);xp.onConfirmed({reward:{credits:[]}});assert.equal(refreshes,1);assert.equal(xp.rewardTargets({},'alkahest')[0],target);s.emitWindow('tcg:daily-pass-change',{gains:[{broadcaster_id:'99977368',kind:'dust',amount:35}]});assert.equal(refreshes,2);await s.auth(null);assert.equal(destroyed,1);assert.equal(stock.isCurrent(),false);
});

test('live badge is hidden by default, scoped to Mes DCG and destroyed on account or route exit',async()=>{
 const mounts=[],destroyed=[];let syncs=0;
 const s=setup({user:{id:'alice'},liveMount:(host,options)=>{mounts.push({host,options});return {sync(){syncs++;},destroy(){destroyed.push(options.userId);}};}});
 await tick();
 assert.match(s.list.innerHTML,/<div class="portal-space-avatar"><img[^>]+><span class="portal-space-live" data-portal-live="99977368" hidden>En live<\/span><\/div>/);
 assert.doesNotMatch(s.discoveryHost.innerHTML,/data-portal-live/);
 assert.equal(mounts.length,1);assert.equal(mounts[0].host,s.list);assert.equal(mounts[0].options.userId,'alice');assert.equal(mounts[0].options.spaces[0].broadcasterId,'99977368');assert.equal(mounts[0].options.legacyBroadcasterId,'99977368');assert.ok(syncs>=1);
 await s.auth(null);assert.deepEqual(destroyed,['alice']);assert.doesNotMatch(s.list.innerHTML,/data-portal-live/);
 await s.auth({id:'bob'});assert.equal(mounts.length,2);assert.equal(mounts[1].options.userId,'bob');await s.go('#tcg/regles');assert.deepEqual(destroyed,['alice','bob']);
});

