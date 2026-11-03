'use strict';
/* Copie locale d'une fiche et de ses calques. Aucun accès au brouillon distant. */
(() => {
 const copy=value=>JSON.parse(JSON.stringify(value));
 const page=id=>'entry:'+id;
 function suggestedTitle(records,source){
  let number=1;
  while(number<=5001){
   const suffix=number===1?' (copie)':' (copie '+number+')';
   const title=source.title.slice(0,100-suffix.length)+suffix;
   if(!(records||[]).some(rec=>rec.group===source.group&&rec.title.toLocaleLowerCase('fr')===title.toLocaleLowerCase('fr')))return title;
   number++;
  }
  throw Error('Impossible de proposer un nom de copie disponible.');
 }
 function duplicate({records,elements,folders,recordId,title,nextLayerId}){
  const R=window.PHASMO_JOURNAL_RECORDS,F=window.PHASMO_JOURNAL_FOLDERS;
  const source=records.find(rec=>rec.id===recordId);
  if(!source)throw Error('Fiche à dupliquer introuvable.');
  if(source.status==='archived'||!F.available(folders,source.group,source.folderId))
   throw Error('Restaure cette fiche et son sous-menu avant de la dupliquer.');
  if(records.length>=5000)throw Error('Maximum de 5 000 fiches atteint.');
  const own=elements.filter(layer=>layer.page===page(source.id));
  const layers=own.length?own:elements.filter(layer=>layer.page==='detail:'+source.group);
  if(!layers.length)throw Error('Cette fiche ne contient aucun calque à dupliquer.');
  if(elements.length+layers.length>5000)throw Error('La copie dépasserait la limite de 5 000 calques.');
  // Valider le nom et la destination sans toucher aux tableaux de l'atelier.
  const record=R.create(records.slice(),source.group,title,source.folderId,folders);
  while(records.some(rec=>rec.id===record.id))record.id=R.create([],source.group,title,source.folderId,folders).id;
  const used=new Set(elements.map(layer=>layer.id));
  const clones=layers.map(original=>{
   const layer=copy(original);
   layer.id=nextLayerId();
   if(typeof layer.id!=='string'||!layer.id||used.has(layer.id))throw Error('Identifiant de calque déjà utilisé.');
   used.add(layer.id);layer.page=page(record.id);
   // Les paragraphes décrivent encore la fiche modèle. Seul son titre exact
   // et les liens vers elle-même suivent automatiquement la nouvelle fiche.
   if(layer.kind==='heading'&&String(layer.text).trim().toLocaleLowerCase('fr')===source.title.toLocaleLowerCase('fr'))
    layer.text=record.title;
   if(layer.action==='detail'&&(layer.entry===source.id||(layer.target===source.group&&layer.entry===source.title))){
    layer.entry=record.id;layer.target=record.group;
   }
   for(const item of Array.isArray(layer.listItems)?layer.listItems:[]){
    if(item.action==='detail'&&item.entry===source.id){
     item.entry=record.id;
     if(item.label===source.title)item.label=record.title;
    }
   }
   return layer;
  });
  records.push(record);elements.push(...clones);
  return record;
 }
 window.PHASMO_JOURNAL_RECORD_DUPLICATE=Object.freeze({suggestedTitle,duplicate});
})();
