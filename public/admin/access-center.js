/* Centre d'accès V2 : accès fermé en absence du backend privé.
 * Mode démonstration UNIQUEMENT sur localhost, sans persistance ni données réelles.
 * Ne jamais attribuer un droit réel depuis le navigateur sans validation serveur.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const LOCAL = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const PROJECT = 'https://eodtxlhnfzyapkyvvxdi.supabase.co';
  const PUBLISHABLE = 'sb_publishable_HwLsESqtQglS7FoSTxBX-Q_GzxyLX_Z';
  const CODE = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9_-]*){2,}$/;
  const PROTECTED = /^(portal|site|system)\./;
  let client, state = null, busy = false, lastPreview = null;
  const localData = {
    authorized: true,
    phase: 'local_demo', rights_effective: false, mutations_enabled: true, twitch_configured: true,
    categories: [
      {id:'phasmo',label:'Phasmophobia',sections:[
        {id:'livre',label:'Livre',permissions:[{code:'phasmo.livre.edit',label:'Éditeur du livre'}]},
        {id:'news',label:'News',permissions:[{code:'phasmo.news.edit',label:'Rédacteur News'}]}
      ]},
      {id:'crew',label:'Crew’mong Us',sections:[
        {id:'roles',label:'Rôles',permissions:[{code:'crew.roles.helper',label:'Helper (saisie)'},{code:'crew.roles.admin',label:'Admin (gestion)'}]}
      ]}
    ],
    people: [
      {id:'demo-1',name:'Herminerva',is_moderator:true,rights:[]},
      {id:'demo-2',name:'Goge',is_moderator:true,rights:[]},
      {id:'demo-3',name:'Mata',is_moderator:true,rights:[]}
    ]
  };
  const slug = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60);
  function message(text, isError=false) {
    $('notice').textContent = text;
    $('notice').classList.toggle('error', isError);
  }
  function node(tag, text, className) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
  }
  function validSnapshot(data) {
    return !!(data?.authorized === true && data?.rights_effective === false &&
      Array.isArray(data.categories) && Array.isArray(data.people));
  }
  function localAction(action, data) {
    if (action === 'bootstrap') return localData;
    if (action === 'previewModerators') return {...localData,moderators_preview:localData.people.map(p=>({user_id:p.id,user_name:p.name}))};
    if (action === 'syncModerators') return {...localData,sync_count:localData.people.length};
    if (action === 'setGrant') {
      const person = localData.people.find(p=>p.id===data.user_id);
      if (!person) throw Error('Compte inconnu');
      if (!localData.categories.some(c=>c.sections.some(s=>s.permissions.some(p=>p.code===data.code)))) throw Error('Permission inconnue');
      person.rights = person.rights.filter(code=>code!==data.code);
      if (data.enabled) person.rights.push(data.code);
    } else if (action === 'addCategory') {
      const id = slug(data.label);
      if (!id || localData.categories.some(c=>c.id===id)) throw Error('Catégorie invalide ou déjà présente');
      localData.categories.push({id,label:data.label,sections:[]});
    } else if (action === 'addSection') {
      const category = localData.categories.find(c=>c.id===data.category_id);
      const id = slug(data.label);
      if (!category || !id || category.sections.some(s=>s.id===id)) throw Error('Sous-catégorie invalide ou déjà présente');
      category.sections.push({id,label:data.label,permissions:[]});
    } else if (action === 'addPermission') {
      if (!CODE.test(data.code) || PROTECTED.test(data.code)) throw Error('Code de permission interdit');
      const section = localData.categories.find(c=>c.id===data.category_id)?.sections.find(s=>s.id===data.section_id);
      if (!section || localData.categories.some(c=>c.sections.some(s=>s.permissions.some(p=>p.code===data.code)))) throw Error('Permission invalide ou déjà présente');
      section.permissions.push({code:data.code,label:data.label});
    } else throw Error('Action inconnue');
    return localData;
  }
  async function request(action, payload={}) {
    if (LOCAL) return localAction(action,payload);
    if (!client) throw Error('Connexion non initialisée');
    const {data:{session},error:sessionError} = await client.auth.getSession();
    if (sessionError || !session) throw Error('Connecte-toi avec Twitch depuis le site avant d’ouvrir cette page.');
    // La fonction doit vérifier JWT, identité Twitch et liste fermée des deux propriétaires à CHAQUE action.
    // Elle n'est PAS encore déployée. Toute absence, erreur ou réponse incomplète bloque le panneau.
    const {data,error} = await client.functions.invoke('site-access-admin', {body:{action,...payload}});
    if (error || !validSnapshot(data)) throw Error('Accès indisponible ou refusé par le serveur.');
    return data;
  }
  async function transaction(action,payload) {
    if (busy) return;
    busy = true;
    message('Vérification côté serveur…');
    try {
      const next = await request(action,payload);
      if (!validSnapshot(next)) throw Error('Réponse serveur invalide');
      state = next;
      render();
      message(LOCAL ? 'Démonstration locale mise à jour. Aucune donnée réelle modifiée.' :
        'Enregistré dans le registre préparatoire. Aucun droit effectif ajouté aux modules.');
    } catch(error) { message(error.message || 'Action impossible.',true); }
    finally {busy=false;}
  }
  function renderRights() {
    const holder = $('rights-tables');
    holder.replaceChildren();
    const filter=$('filter').value.trim().toLowerCase();
    const people=state.people.filter(p=>String(p.name).toLowerCase().includes(filter));
    for (const cat of state.categories) {
      const permissions=cat.sections.flatMap(s=>s.permissions.map(p=>({code:p.code,label:s.label+' · '+p.label})));
      const wrapper=node('article',undefined,'module');
      wrapper.append(node('h2',cat.label));
      const scroll=node('div',undefined,'table-scroll'),table=node('table'),thead=node('thead'),tr=node('tr');
      tr.append(node('th','Compte Twitch'));
      for (const p of permissions) tr.append(node('th',p.label));
      thead.append(tr);table.append(thead);
      const tbody=node('tbody');
      for (const person of people) {
        const row=node('tr'),name=node('td');
        name.append(node('div',person.name,'account-name'));
        name.append(node('div',person.is_moderator?'Modérateur Twitch':'Compte ajouté','person-note'));
        row.append(name);
        for (const p of permissions) {
          const td=node('td'),input=node('input');
          input.type='checkbox';input.checked=person.rights.includes(p.code);
          input.disabled=state.mutations_enabled !== true;
          input.setAttribute('aria-label',person.name+' : '+p.label);
          input.addEventListener('change',()=>transaction('setGrant',{user_id:person.id,code:p.code,enabled:input.checked}));
          td.append(input);row.append(td);
        }
        tbody.append(row);
      }
      table.append(tbody);scroll.append(table);
      if (!permissions.length || !people.length) scroll.append(node('p',!people.length?'Aucun compte dans cette liste.':'Aucune permission créée.','empty'));
      wrapper.append(scroll);holder.append(wrapper);
    }
    if (!state.categories.length) holder.append(node('p','Aucune catégorie configurée.','empty'));
  }
  function renderCatalog() {
    const holder=$('catalog-tree');
    holder.replaceChildren();
    const catSelect=$('section-category'),permSelect=$('permission-section');
    catSelect.replaceChildren();permSelect.replaceChildren();
    for (const cat of state.categories) {
      const card=node('article',undefined,'tree-card');
      card.append(node('h2',cat.label));
      const opt=node('option',cat.label);opt.value=cat.id;catSelect.append(opt);
      for (const section of cat.sections) {
        const item=node('div',undefined,'tree-item');
        item.append(node('strong',section.label));
        for (const p of section.permissions) {
          const line=node('span',undefined,'tree-permission');
          line.append(node('span',p.label+' · '));
          line.append(node('span',p.code,'code'));
          item.append(line);
        }
        card.append(item);
        const choice=node('option',cat.label+' / '+section.label);
        choice.value=cat.id+'|'+section.id;permSelect.append(choice);
      }
      holder.append(card);
    }
    $('add-section').querySelector('button[type=submit]').disabled=!state.categories.length || state.mutations_enabled !== true;
    $('add-permission').querySelector('button[type=submit]').disabled=!permSelect.options.length || state.mutations_enabled !== true;
  }
  function renderTwitch() {
    const holder = $('twitch-preview');
    holder.replaceChildren();
    $('authorize-twitch').hidden = state.can_authorize_twitch !== true;
    $('authorize-twitch').disabled = busy;
    $('preview-mods').disabled = state.twitch_configured !== true || busy;
    $('sync-mods').disabled = state.twitch_configured !== true ||
      state.mutations_enabled !== true || !Array.isArray(lastPreview) ||
      lastPreview.length === 0 || busy;
    if (state.twitch_configured !== true) {
      holder.hidden = false;
      holder.append(node('p','Autorisation du diffuseur non configurée côté serveur.','muted'));
      return;
    }
    if (!Array.isArray(lastPreview)) {holder.hidden=true;return;}
    holder.hidden=false;
    holder.append(node('p',lastPreview.length+' modérateur(s) dans la vérification Twitch.','muted'));
    if (lastPreview.length===0) {
      holder.append(node('p','Liste vide : la synchronisation est volontairement bloquée.','muted'));
      return;
    }
    const list=node('ul');
    for(const person of lastPreview){
      list.append(node('li',person.user_name));
    }
    holder.append(list);
    holder.append(node('p','Il s’agit d’un aperçu. Aucun changement enregistré dans les droits.', 'muted'));
  }

  function render() {
    renderRights();renderCatalog();renderTwitch();
    $('add-category').querySelector('button[type=submit]').disabled=state.mutations_enabled !== true;
  }
  async function initialize() {
    try {
      if (!LOCAL) {
        if (!window.supabase?.createClient) throw Error('Bibliothèque de connexion indisponible.');
        client=window.supabase.createClient(PROJECT,PUBLISHABLE,{
          auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:'pkce'}
        });
        const {data,error}=await client.auth.getUser();
        if (error || !data?.user) throw Error('Connexion Twitch requise.');
      }
      const result=await request('bootstrap');
      if (!validSnapshot(result)) throw Error('Autorisation serveur non confirmée.');
      state=result;
      $('gate').hidden=true;$('workspace').hidden=false;
      $('mode').textContent=LOCAL?'Démo locale, aucune écriture':
        (state.mutations_enabled ? 'Registre de préparation actif' : 'Registre en lecture seule');
      render();
      message(LOCAL?'Démonstration accessible uniquement depuis localhost. Données fictives, sans sauvegarde.':
        'Les attributions du registre ne sont PAS des droits effectifs dans Phasmo ou Crew.');
    if(!LOCAL) {
      const url=new URL(window.location.href);
      const result=url.searchParams.get('twitch_oauth');
      if(result==='connected'||result==='failed'||result==='cancelled'){
        url.searchParams.delete('twitch_oauth');
        window.history.replaceState(null,'',url.pathname+url.search+url.hash);
        message(result==='connected'?
          'Autorisation Twitch reçue. Vérifie la liste pour confirmer le fonctionnement.':
          result==='cancelled'?'Autorisation Twitch annulée.':
          'Autorisation Twitch non terminée. Aucun accès accordé.',result!=='connected');
      }
    }

    } catch (error) {
      $('workspace').hidden=true;
      $('gate').hidden=false;
      $('gate-status').textContent=error.message || 'Accès refusé.';
    }
  }
  document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{
    for(const tab of document.querySelectorAll('[data-tab]'))tab.setAttribute('aria-selected',String(tab===button));
    $('rights').hidden=button.dataset.tab!=='rights';
    $('catalog').hidden=button.dataset.tab!=='catalog';
    message('');
  }));
  $('authorize-twitch').addEventListener('click',async()=>{
    if (busy || !state || state.can_authorize_twitch !== true || LOCAL) return;
    busy=true;renderTwitch();message('Préparation de l’autorisation Twitch…');
    try {
      if(!client)throw Error('Session absente.');
      const {data:{session},error:sessionError}=await client.auth.getSession();
      if(sessionError||!session)throw Error('Reconnecte-toi avec Twitch.');
      const {data,error}=await client.functions.invoke('site-access-twitch-oauth',{
        body:{action:'begin'}
      });
      if(error||typeof data?.authorization_url!=='string')
        throw Error('Autorisation du diffuseur indisponible.');
      const url=new URL(data.authorization_url);
      if(url.origin!=='https://id.twitch.tv'||url.pathname!=='/oauth2/authorize'||
        url.searchParams.get('scope')!=='moderation:read'||
        url.searchParams.get('response_type')!=='code')
        throw Error('Destination d’autorisation invalide.');
      window.location.assign(url.href);
    }catch(error){message(error.message||'Autorisation Twitch indisponible.',true);}
    finally{busy=false;if(state)renderTwitch();}
  });
    $('preview-mods').addEventListener('click',async()=>{
    if(busy || !state || state.twitch_configured !== true)return;
    busy=true;renderTwitch();message('Vérification de la liste Twitch…');
    try {
      const result=await request('previewModerators');
      if(!Array.isArray(result.moderators_preview) ||
          result.moderators_preview.some(p=>typeof p.user_id!=='string' || typeof p.user_name!=='string'))
        throw Error('Réponse Twitch incomplète.');
      state=result;lastPreview=result.moderators_preview;
      render();message(LOCAL?'Aperçu fictif local : aucune donnée enregistrée.':
        'Liste Twitch vérifiée. Aucune donnée enregistrée.');
    }catch(error){lastPreview=null;renderTwitch();message(error.message||'Lecture Twitch indisponible.',true);}
    finally{busy=false;if(state)renderTwitch();}
  });
  $('sync-mods').addEventListener('click',async()=>{
    if(busy || !state || state.mutations_enabled !== true ||
      !Array.isArray(lastPreview) || lastPreview.length===0)return;
    if(!window.confirm('Enregistrer la liste des modérateurs Twitch dans le registre préparatoire ? Aucun droit Phasmo ou Crew ne sera modifié.'))return;
    busy=true;renderTwitch();message('Synchronisation du registre en cours…');
    try {
      const result=await request('syncModerators');
      state=result;lastPreview=null;render();
      message(LOCAL?'Simulation locale terminée, sans sauvegarde.':
        'Synchronisation du registre confirmée pour '+result.sync_count+' modérateur(s). Aucun droit effectif modifié.');
    }catch(error){message(error.message||'Synchronisation indisponible.',true);}
    finally{busy=false;if(state)renderTwitch();}
  });

  $('filter').addEventListener('input',()=>{if(state)renderRights();});
  $('reload').addEventListener('click',async()=>{try{const r=await request('bootstrap');state=r;lastPreview=null;render();message('Données actualisées.');}catch{message('Impossible de recharger les permissions.',true);}});
  const formAction=(id,action,makePayload)=>$(id).addEventListener('submit',async ev=>{
    ev.preventDefault();const form=ev.currentTarget;const payload=makePayload(new FormData(form));
    if(!String(payload.label||'').trim()){message('Saisis un nom.',true);return;}
    await transaction(action,payload);
    if(!busy && !$('notice').classList.contains('error'))form.reset();
  });
  formAction('add-category','addCategory',f=>({label:String(f.get('label')).trim()}));
  formAction('add-section','addSection',f=>({label:String(f.get('label')).trim(),category_id:f.get('category_id')}));
  formAction('add-permission','addPermission',f=>{
    const [category_id,section_id]=String(f.get('section_ref')||'').split('|');
    return {label:String(f.get('label')).trim(),code:String(f.get('code')).trim(),category_id,section_id};
  });
  initialize();
})();
