/* Maquette des permissions V2 : tests SANS NETWORK, SANS SUPABASE, SANS TWITCH.
 * Lancer avec Node 18+ : node scripts/test_site_access_demo.cjs
 */
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

(async()=>{
  const root=path.join(__dirname,'../public/admin');
  const demo=await import(pathToFileURL(path.join(root,'access-center-demo-model.mjs')).href);
  const state=demo.seedDemo();
  assert.deepEqual(state.categories.map(c=>c.label),['Phasmophobia','Crew’mong Us']);
  assert.deepEqual(demo.permissions(state).sort(),
    ['phasmo.livre.edit','phasmo.news.edit','crew.roles.helper','crew.roles.admin'].sort());
  assert.equal(state.people.length,3);
  assert(state.people.every(p=>p.id.startsWith('demo-')&&p.rights.length===0));
  assert.equal(demo.counts(state).grants,0);

  let next=demo.addCategory(state,'Nouveau jeu');
  next=demo.addSection(next,'nouveau-jeu','Actualités');
  next=demo.addPermission(next,'nouveau-jeu','actualites','Rédacteur','nouveaujeu.actualites.redacteur');
  next=demo.addPerson(next,'Testeur Démo',false);
  next=demo.setGrant(next,'demo-4','nouveaujeu.actualites.redacteur',true);
  assert.equal(demo.counts(next).categories,3);
  assert.equal(demo.counts(next).permissions,5);
  assert.equal(demo.counts(next).people,4);
  assert.equal(demo.counts(next).grants,1);
  assert.equal(next.people.find(p=>p.id==='demo-4').isModerator,false);
  assert.equal(state.categories.length,2,'les fonctions du modèle ne modifient pas le state initial');
  assert.equal(state.people.length,3,'pas de modification accidentelle du state initial');
  const reloaded=demo.loadDemo(JSON.stringify(next));
  assert.equal(demo.counts(reloaded).grants,1,'simulation conservable après rechargement');
  next=demo.setGrant(next,'demo-4','nouveaujeu.actualites.redacteur',false);
  assert.equal(demo.counts(next).grants,0);

  assert.throws(()=>demo.addCategory(next,'Nouveau jeu'),/existe déjà/);
  assert.throws(()=>demo.addSection(next,'nouveau-jeu','Actualités'),/existe déjà/);
  assert.throws(()=>demo.addPermission(next,'nouveau-jeu','actualites','Autre','portal.root.admin'),/invalide/);
  assert.throws(()=>demo.addPermission(next,'nouveau-jeu','actualites','Autre','nouveaujeu.actualites.redacteur'),/existe déjà/);
  assert.throws(()=>demo.setGrant(next,'demo-999','phasmo.news.edit',true),/inconnu/);
  assert.throws(()=>demo.addPerson(next,'Testeur Démo',true),/existe déjà/);

  assert.equal(demo.permissions(demo.loadDemo('{corrompu')).length,4);
  assert.equal(demo.permissions(demo.loadDemo(JSON.stringify({...next,version:999}))).length,4);

  const html=readFileSync(path.join(root,'access-center-demo.html'),'utf8');
  const script=readFileSync(path.join(root,'access-center-demo.mjs'),'utf8');
  const model=readFileSync(path.join(root,'access-center-demo-model.mjs'),'utf8');
  const css=readFileSync(path.join(root,'access-center-demo.css'),'utf8');
  assert(html.includes('access-center-demo.mjs?v=1'));
  assert(html.includes('access-center-demo.css?v=1'));
  assert(script.includes("from './access-center-demo-model.mjs'"));
  assert(css.includes('.demo-banner'));
  for(const id of ['reset','filter','rights','catalog','mock-preview','add-person','add-category','add-section','add-permission','permission-section','rights-tables','catalog-tree']){
    assert(html.includes('id="'+id+'"'),'élément HTML manquant : '+id);
  }
  assert(!/<script[^>]+(supabase|twitch)/i.test(html),'aucun SDK tiers dans la maquette');
  assert(!/\bfetch\s*\(|\bXMLHttpRequest\b|navigator\.sendBeacon|\.functions\.invoke|createClient\s*\(/.test(script+model),
    'aucun appel réseau dans la maquette');
  assert(!/Herminerva|Deadelus\s+admin|Yekelle\s+admin|Mata|Goge/.test(JSON.stringify(demo.seedDemo())),
    'pas de pseudo réel prétendument synchronisé');
  console.log('Maquette V2 : modèle fictif, catégories, droits, stockage local et isolation — tests OK.');
})().catch(error=>{console.error(error);process.exitCode=1;});
