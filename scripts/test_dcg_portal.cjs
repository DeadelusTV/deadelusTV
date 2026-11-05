'use strict';
// Tests sans réseau ni dépendance : module DCG et routeur réel du site principal.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(base,p),'utf8');
const html=read('public/index.html'),source=read('public/modules/dcg/portal.js'),config=read('public/modules/dcg/config.js'),router=read('public/assets/app.js'),css=read('public/modules/dcg/portal.css');
const tick=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));};
class Node{
 constructor(){this.listeners={};this.attributes={};this.dataset={};this.hidden=false;this._html='';this.textContent='';this.value='';this.focused=false;const classes=new Set();this.classList={add:s=>classes.add(s),remove:s=>classes.delete(s),contains:s=>classes.has(s),toggle(s,force){const next=force??!classes.has(s);if(next)classes.add(s);else classes.delete(s);return next;}};}
 addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);}
 emit(name,target=this){let prevented=false;for(const fn of this.listeners[name]||[])fn({target,preventDefault(){prevented=true;}});return prevented;}
 setAttribute(name,value){this.attributes[name]=String(value);}
 getAttribute(name){return this.attributes[name]??null;}
 removeAttribute(name){delete this.attributes[name];}
 set innerHTML(value){this._html=value;}get innerHTML(){return this._html;}
 replaceChildren(){this._html='';}
 focus(){this.focused=true;}
 scrollIntoView(options){this.scroll=options;}
 matches(selector){return this.selector===selector;}
 closest(selector){return this.selector===selector?this:null;}
 querySelector(selector){return this.nodes?.[selector]||null;}
}
function setup({hash='#tcg',user=null,getSession,withAuth=true}={}){
 const root=new Node(),heading=new Node(),list=new Node(),search=new Node(),directory=new Node(),nav=new Node(),menu=new Node(),back=new Node(),main=new Node(),brand=new Node();
 search.selector='[data-portal-search]';root.nodes={'h1':heading,'[data-portal-spaces]':list,'[data-portal-search]':search,'#dcg-annuaire':directory};
 const pageNames=['accueil','tcg','phasmophobia','crewmongus','pavillon-noir','mentions-legales','confidentialite','conditions-utilisation','conditions-vente'];
 const sections=pageNames.map(name=>{const n=new Node();n.dataset.page=name;n.nodes={h1:heading};return n;});
 const navNodes=['accueil','tcg','phasmophobia','crewmongus','jeux-de-role'].map(name=>{const n=new Node();n.dataset.nav=name;return n;});
 const documentListeners={},windowListeners={},calls=[],location={hash,search:'',pathname:'/'};
 const known={'#main-nav':nav,'.menu-toggle':menu,'#back-top':back,'#main-content':main,'.brand':brand,'#dcg-portal-root':root};
 const document={hidden:false,body:{classList:{add(){},remove(){}}},getElementById:id=>known['#'+id]||null,querySelector(selector){if(known[selector])return known[selector];const match=selector.match(/^\[data-page="(.+)"\] h1$/);if(match)return heading;return null;},querySelectorAll(selector){if(selector==='[data-page]')return sections;if(selector==='[data-nav]')return navNodes;return [];},addEventListener(name,fn){(documentListeners[name]??=[]).push(fn);}};
 const context={document,location,console,URL,URLSearchParams,Object,setTimeout,clearTimeout,setInterval:()=>1,innerWidth:1200,scrollTo(){},matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(name,fn){(windowListeners[name]??=[]).push(fn);},DEADELUSTV_CONFIG:{},DEADELUSTV_CREW:{render:(...args)=>calls.push(['crew',...args]),cancel:()=>{}},DEADELUSTV_PAVILLON:{render:(...args)=>calls.push(['pavillon',...args]),cancel:()=>{}},DEADELUSTV_TWITCH:{sync(){}}};
 let currentUser=user,signins=0;
 if(withAuth)context.DEADELUSTV_AUTH={getClient:async()=>({auth:{getSession:getSession||(async()=>({data:{session:currentUser?{user:currentUser}:null}}))}}),signIn:()=>{signins++;}};
 context.window=context;vm.createContext(context);vm.runInContext(config,context);vm.runInContext(source,context);vm.runInContext(router,context);
 return {root,heading,list,search,directory,menu,nav,sections,calls,context,navNodes,get signins(){return signins;},async go(value){location.hash=value;for(const fn of windowListeners.hashchange||[])fn();await tick();},async auth(user){currentUser=user;for(const fn of windowListeners['deadelustv:auth-change']||[])fn();await tick();},click(selector){const n=new Node();n.selector=selector;return root.emit('click',n);}};
}
test('DCG replaces only its own waiting page and is mounted by the real site router',()=>{
 const s=setup();assert.equal(s.sections.find(n=>n.dataset.page==='tcg').hidden,false);assert.equal(s.sections.find(n=>n.dataset.page==='accueil').hidden,true);
 assert.match(s.root.innerHTML,/Choisis/);assert.match(s.root.innerHTML,/Connexion Pass/);assert.match(s.root.innerHTML,/data-dcg="deadelustv"/);
 assert.equal(s.navNodes.find(n=>n.dataset.nav==='tcg').getAttribute('aria-current'),'page');assert.equal(s.heading.id,'tcg-title');
 assert.match(s.context.document.title,/DCG/);assert.equal(s.signins,0);
});
test('each common subpage is a real DCG route; unknown DCG subpages safely return to its directory',async()=>{
 const s=setup();for(const [route,text]of[['regles','Les règles du jeu'],['collections-communes','aucun booster commun n’est en vente'],['connexion-pass','n’est pas encore activé']]){
  await s.go('#tcg/'+route);assert.match(s.root.innerHTML,new RegExp(text));assert.equal(s.sections.find(n=>n.dataset.page==='tcg').hidden,false);assert.match(s.root.innerHTML,new RegExp('href="#tcg/'+route+'" aria-current="page"'));
 }
 await s.go('#tcg/inconnu');assert.match(s.root.innerHTML,/data-portal-search/);
});
test('the logo and directory lead to the existing Workers boosters, with no embedded game or copied auth client',()=>{
 const s=setup();assert.equal((s.root.innerHTML.match(/href="https:\/\/tcg\.yekelle-boulet\.workers\.dev\/#\/boosters"/g)||[]).length,2);
 assert.doesNotMatch(s.root.innerHTML,/<iframe|<script/);assert.doesNotMatch(source,/createClient|service_role|rpc\(|fetch\(/);
});
test('directory input searches case and accents without replacing the input node',()=>{
 const s=setup();s.search.value='DÉADELUS';s.root.emit('input',s.search);assert.match(s.list.innerHTML,/data-dcg="deadelustv"/);
 s.search.value='<img src=x>';s.root.emit('input',s.search);assert.match(s.list.innerHTML,/Aucun DCG/);assert.doesNotMatch(s.list.innerHTML,/<img/);
 s.search.value='';s.root.emit('input',s.search);assert.match(s.list.innerHTML,/DeadelusTV/);assert.equal(s.root.nodes['[data-portal-search]'],s.search);
 assert.equal(s.click('[data-portal-directory]'),true);assert.equal(s.search.focused,true);
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
