/**
 * Maquette DEADELUSTV V2 : modèle 100 % fictif, sans API, sans Twitch ni Supabase.
 * Ce module est volontairement autonome et ne peut pas attribuer de droits réels.
 */
const LABEL_MAX = 70;
const CODE_RE = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9_-]*){2,}$/;
const RESERVED = /^(site|portal|system)\./;

export const STORAGE_KEY = 'deadelustv-access-panel-demo-v2-1';

export function seedDemo() {
  return {
    version: 1,
    nextPerson: 4,
    categories: [
      {id: 'phasmo', label: 'Phasmophobia', sections: [
        {id: 'livre', label: 'Livre', permissions: [{code: 'phasmo.livre.edit', label: 'Éditeur du livre'}]},
        {id: 'news', label: 'News', permissions: [{code: 'phasmo.news.edit', label: 'Rédacteur News'}]}
      ]},
      {id: 'crew', label: 'Crew’mong Us', sections: [
        {id: 'roles', label: 'Rôles', permissions: [
          {code: 'crew.roles.helper', label: 'Helper (saisie uniquement)'},
          {code: 'crew.roles.admin', label: 'Admin (gestion)'}
        ]}
      ]}
    ],
    people: [
      {id: 'demo-1', name: 'Modo Démo A', isModerator: true, rights: []},
      {id: 'demo-2', name: 'Modo Démo B', isModerator: true, rights: []},
      {id: 'demo-3', name: 'Invité Démo', isModerator: false, rights: []}
    ]
  };
}
const clone = state => structuredClone(state);
const trimmed = value => typeof value === 'string' ? value.trim() : '';
const label = raw => {
  const value = trimmed(raw);
  if (!value || value.length > LABEL_MAX) throw Error('Le nom doit contenir entre 1 et 70 caractères.');
  return value;
};
export function slugify(value) {
  return trimmed(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}
function idFor(raw) {
  const value = slugify(label(raw));
  if (!/^[a-z][a-z0-9-]*$/.test(value)) throw Error('Utilise un nom qui commence par une lettre.');
  return value;
}
const getCat = (state, id) => state.categories.find(category => category.id === id);
const getSection = (state, catId, sectionId) => getCat(state,catId)?.sections.find(section => section.id === sectionId);
export function permissions(state) {
  return state.categories.flatMap(category =>
    category.sections.flatMap(section => section.permissions.map(permission => permission.code)));
}
export function addCategory(state, rawLabel) {
  const value = label(rawLabel), id = idFor(value);
  if (getCat(state,id)) throw Error('Cette catégorie existe déjà.');
  const next=clone(state);
  next.categories.push({id,label:value,sections:[]});
  return next;
}
export function addSection(state, catId, rawLabel) {
  const value=label(rawLabel), id=idFor(value);
  const cat=getCat(state,catId);
  if(!cat) throw Error('Sélectionne une catégorie.');
  if(cat.sections.some(section=>section.id===id)) throw Error('Cette sous-catégorie existe déjà.');
  const next=clone(state);
  getCat(next,catId).sections.push({id,label:value,permissions:[]});
  return next;
}
export function addPermission(state, catId, sectionId, rawLabel, rawCode) {
  const value=label(rawLabel), code=trimmed(rawCode);
  if(!getSection(state,catId,sectionId)) throw Error('Sélectionne une sous-catégorie.');
  if(!CODE_RE.test(code)||code.length>90||RESERVED.test(code))
    throw Error('Code invalide. Exemple : phasmo.news.edit (pas de code réservé).');
  if(permissions(state).includes(code)) throw Error('Ce code technique existe déjà.');
  const next=clone(state);
  getSection(next,catId,sectionId).permissions.push({code,label:value});
  return next;
}
export function addPerson(state,rawName,isModerator) {
  const name=label(rawName);
  if(typeof isModerator!=='boolean') throw Error('Choisis le type de compte fictif.');
  if(state.people.some(person=>person.name.toLocaleLowerCase('fr')===name.toLocaleLowerCase('fr')))
    throw Error('Un compte fictif porte déjà ce nom.');
  const next=clone(state);
  next.people.push({id:'demo-'+next.nextPerson++,name,isModerator,rights:[]});
  return next;
}
export function setGrant(state,personId,code,enabled) {
  if(typeof enabled!=='boolean') throw Error('Attribution invalide.');
  if(!permissions(state).includes(code)) throw Error('Permission fictive inconnue.');
  if(!state.people.some(person=>person.id===personId)) throw Error('Compte fictif inconnu.');
  const next=clone(state), person=next.people.find(person=>person.id===personId);
  person.rights=person.rights.filter(right=>right!==code);
  if(enabled)person.rights.push(code);
  return next;
}
export function counts(state) {
  return {
    categories:state.categories.length,
    permissions:permissions(state).length,
    people:state.people.length,
    grants:state.people.reduce((total,person)=>total+person.rights.length,0)
  };
}
/** Ne charge que des simulations compatibles. Jamais d'identité réelle. */
export function loadDemo(serialized) {
  if(!serialized) return seedDemo();
  try {
    const saved=JSON.parse(serialized);
    if(saved?.version!==1 || !Array.isArray(saved.categories)||!Array.isArray(saved.people)||
       !Number.isSafeInteger(saved.nextPerson)||saved.nextPerson<4||
       saved.categories.length>50||saved.people.length>100) return seedDemo();
    const categoryIds=new Set(),codes=new Set(),personIds=new Set();
    for(const cat of saved.categories){
      if(!cat||typeof cat.id!=='string'||!cat.id.match(/^[a-z][a-z0-9-]{0,60}$/)||
         categoryIds.has(cat.id)||!trimmed(cat.label)||cat.label.length>LABEL_MAX||
         !Array.isArray(cat.sections)||cat.sections.length>50) return seedDemo();
      categoryIds.add(cat.id);
      const sectionIds=new Set();
      for(const sec of cat.sections){
        if(!sec||typeof sec.id!=='string'||!sec.id.match(/^[a-z][a-z0-9-]{0,60}$/)||
           sectionIds.has(sec.id)||!trimmed(sec.label)||sec.label.length>LABEL_MAX||
           !Array.isArray(sec.permissions)||sec.permissions.length>100) return seedDemo();
        sectionIds.add(sec.id);
        for(const perm of sec.permissions){
          if(!perm||typeof perm.code!=='string'||!CODE_RE.test(perm.code)||
             RESERVED.test(perm.code)||codes.has(perm.code)||!trimmed(perm.label)||
             perm.label.length>LABEL_MAX) return seedDemo();
          codes.add(perm.code);
        }
      }
    }
    for(const person of saved.people){
      if(!person||typeof person.id!=='string'||!/^demo-[1-9]\d*$/.test(person.id)||
         personIds.has(person.id)||typeof person.name!=='string'||
         !trimmed(person.name)||person.name.length>LABEL_MAX||
         typeof person.isModerator!=='boolean'||!Array.isArray(person.rights)||
         person.rights.some(code=>!codes.has(code))) return seedDemo();
      personIds.add(person.id);
    }
    return saved;
  } catch {return seedDemo();}
}
