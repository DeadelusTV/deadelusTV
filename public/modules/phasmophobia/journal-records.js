'use strict';
/* Phasmo journal: structure des fiches indépendante des calques et de la navigation.
 * V1 locale / prototype. Aucune lecture ou écriture Supabase ici.
 * Les identifiants sont persistés dans les exports JSON (schema 5).
 */
(() => {
  const categories = Object.freeze(['entites','cartes','objets','equipements','divers']);
  const safeGroup = group => categories.includes(group);
  const id = () => 'fiche-' + (globalThis.crypto?.randomUUID?.() ||
    (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)));
  function normalize(input, groups) {
    const source = Array.isArray(input) ? input :
      categories.flatMap(group => (Array.isArray(groups?.[group]?.names) ? groups[group].names : [])
        .map((title, i) => ({group, title, order:i, status:'demo'})));
    const seen = new Set(), titles = new Set(), results = [];
    for (const row of source.slice(0,5000)) {
      if (!row || !safeGroup(row.group)) continue;
      const title = String(row.title ?? '').trim().slice(0,100);
      const key = row.group + '|' + title.toLocaleLowerCase('fr');
      if (!title || titles.has(key)) continue;
      titles.add(key);
      let recordId = typeof row.id === 'string' && /^fiche-[a-zA-Z0-9-]{4,100}$/.test(row.id) ? row.id : id();
      while (seen.has(recordId)) recordId = id();
      seen.add(recordId);
      const order = Number(row.order);
      results.push({id:recordId, group:row.group, title,
        order:Number.isSafeInteger(order)&&order>=0?order:results.length,
        status:['demo','draft','archived'].includes(row.status)?row.status:'draft'});
    }
    return results;
  }
  function list(records, group, includeArchived=false) {
    if(!safeGroup(group))return [];
    return (Array.isArray(records)?records:[])
      .filter(x=>x.group===group&&(includeArchived||x.status!=='archived'))
      .sort((a,b)=>a.order-b.order||a.title.localeCompare(b.title,'fr'));
  }
  function find(records,group,value) {
    return (records||[]).find(x=>x.group===group&&(x.id===value||x.title===value))||null;
  }
  function unique(records,group,title,exceptId=null) {
    return !list(records,group,true).some(x=>x.id!==exceptId&&x.title.toLocaleLowerCase('fr')===title.toLocaleLowerCase('fr'));
  }
  function create(records,group,title) {
    title=String(title??'').trim();
    if(!safeGroup(group)||!title||title.length>100||!unique(records,group,title))throw Error('Nom vide, trop long ou déjà utilisé.');
    const result={id:id(),group,title,order:list(records,group,true).length,status:'draft'};
    records.push(result);return result;
  }
  function rename(records,group,recordId,title) {
    const rec=find(records,group,recordId);title=String(title??'').trim();
    if(!rec||!title||title.length>100||!unique(records,group,title,rec.id))throw Error('Renommage impossible : nom invalide ou déjà utilisé.');
    rec.title=title;return rec;
  }
  function archive(records,group,recordId) {
    const rec=find(records,group,recordId);if(!rec)throw Error('Fiche introuvable.');
    rec.status=rec.status==='archived'?'draft':'archived';return rec;
  }
  function reorder(records,group,recordId,delta) {
    const all=list(records,group,true),index=all.findIndex(x=>x.id===recordId);
    const dest=index+delta;
    if(index<0||dest<0||dest>=all.length)return false;
    [all[index],all[dest]]=[all[dest],all[index]];
    all.forEach((x,i)=>x.order=i);
    return true;
  }
  function remove(records,group,recordId) {
    const index=records.findIndex(x=>x.id===recordId&&x.group===group);
    if(index<0)return null;
    const [rec]=records.splice(index,1);
    list(records,group,true).forEach((x,i)=>x.order=i);
    return rec;
  }
  window.PHASMO_JOURNAL_RECORDS=Object.freeze({categories,normalize,list,find,create,rename,archive,reorder,remove});
})();