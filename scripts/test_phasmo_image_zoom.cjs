const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../public/modules/phasmophobia');
class Node{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.style={};this.dataset={};this.attributes={};this.listeners={};this.classList={add(){},toggle(){}};this.clientWidth=800;this.clientHeight=600;this.scrollLeft=this.scrollTop=0;this.value='';this.textContent='';if(tag==='img'){this.naturalWidth=1200;this.naturalHeight=800;}}
 append(...children){children.forEach(child=>{child.parentElement=this;this.children.push(child);});}
 replaceChildren(...children){this.children=[];this.append(...children);}
 querySelector(selector){return this.children.find(child=>child.tagName===selector)||null;}
 querySelectorAll(){return [];}
 setAttribute(key,value){this.attributes[key]=value;}
 removeAttribute(key){delete this.attributes[key];if(key==='src')this.src='';}
 addEventListener(key,handler){this.listeners[key]=handler;}
 showModal(){this.open=true;}
 close(){this.open=false;this.listeners.close?.();}
 focus(){this.focused=true;}
}
const body=new Node('body'),nodes=new Map();
const find=(node,id)=>node.id===id?node:node.children.map(child=>find(child,id)).find(Boolean);
const document={body,createElement:tag=>new Node(tag),querySelector(selector){if(!nodes.has(selector))nodes.set(selector,new Node());return nodes.get(selector);},getElementById:id=>find(body,id)};
const context={window:{addEventListener(){}},document,location:{search:''},URLSearchParams,Blob,setTimeout:()=>0,clearTimeout(){}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'journal-image-zoom.js'),'utf8'),context);
const api=context.window.PHASMO_JOURNAL_IMAGE_ZOOM;let checks=0;
function check(condition,message){assert(condition,message);checks++;}
const classic={kind:'image',opacity:100,blend:'normal',name:'Carte de test',image:'data:image/png;base64,AA=='};
check(api.enabled(classic),'Images classiques activées');
for(const extra of [{opacity:25},{blend:'multiply'},{role:'background'},{zoomable:false}])check(!api.enabled({...classic,...extra}),'Décor et refus explicite exclus');
check(api.enabled({...classic,opacity:25,zoomable:true}),'Choix explicite de l’éditeur');
check(!api.enabled({kind:'text',zoomable:true}),'Pas de zoom du texte');
const opener=new Node(),pic=new Node('img');pic.src=classic.image;pic.alt='Carte de test';opener.append(pic);api.attach(opener,classic);
check(opener.attributes.role==='button'&&opener.tabIndex===0,'Accès au clavier');
const event={stopPropagation(){},preventDefault(){}};
opener.listeners.keydown({...event,key:'Enter'});
const dialog=document.getElementById('journal-image-dialog'),frame=dialog.children[0],toolbar=frame.children[0],viewport=frame.children[1];
const image=viewport.children[0].children[0],label=toolbar.children.find(node=>node.tagName==='output');
const button=name=>toolbar.children.find(node=>node.attributes['aria-label']===name);
check(dialog.open&&image.src===pic.src,'Agrandissement de la même image');
check(label.textContent==='100 %'&&button('Dézoomer l’image').disabled,'Ouverture ajustée');
button('Zoomer l’image').listeners.click();check(label.textContent==='150 %','Zoom +');
button('Dézoomer l’image').listeners.click();check(label.textContent==='100 %','Dézoom −');
image.listeners.click();check(label.textContent==='200 %','Clic agrandit');image.listeners.click();check(label.textContent==='100 %','Re-clic ajuste');
for(let i=0;i<12;i++)button('Zoomer l’image').listeners.click();check(label.textContent==='400 %'&&button('Zoomer l’image').disabled,'Limite haute');
button('Ajuster l’image').listeners.click();check(label.textContent==='100 %','Ajuster');
dialog.listeners.keydown({...event,key:'+'});check(label.textContent==='150 %','Raccourci clavier');
dialog.listeners.keydown({...event,key:'0'});check(label.textContent==='100 %','Réinitialisation clavier');
button('Fermer l’image').listeners.click();check(!dialog.open&&opener.focused&&image.src==='','Fermeture libère l’image et rend le focus');
// Le véritable rendu du carnet doit activer ce comportement en lecture seulement.
for(const file of ['journal-folders.js','journal-records.js','journal-pagination.js','journal-custom-lists.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const html=fs.readFileSync(path.join(root,'journal-editor.html'),'utf8');
const main=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match=>match[1]).find(code=>code.includes('function makeLayer'));
new vm.Script(main);
vm.runInContext(main.replace(/\ninit\(\);/,"window.test={makeLayer,layer,edit:()=>{mode='edit';},read:()=>{mode='test';}};"),context);
const t=context.window.test,layer=t.layer('sommaire','image','Carte','',10,10,20,20,{image:classic.image});
t.edit();check(!t.makeLayer(layer).attributes['data-image-zoom'],'Édition reste déplaçable');
t.read();check(t.makeLayer(layer).attributes['data-image-zoom']==='true','Test autorise le zoom');
check(!t.makeLayer({...layer,opacity:25,blend:'multiply',role:'background'}).attributes['data-image-zoom'],'Filigrane non cliquable');
check(!t.makeLayer({...layer,zoomable:false}).attributes['data-image-zoom'],'Refus individuel appliqué au lecteur');
check(t.makeLayer({...layer,locked:true}).attributes['data-image-zoom']==='true','Verrouiller le déplacement n’empêche pas la lecture');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);check(ids.length===new Set(ids).size,'IDs HTML uniques');
console.log(checks+' contrôles réussis : image classique / filigrane, édition / lecture, clic, clavier, zoom, dézoom, limites et fermeture.');
