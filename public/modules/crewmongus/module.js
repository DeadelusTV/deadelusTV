/* Chargement natif de Crew, uniquement à l'ouverture de sa rubrique. */
(() => {
  'use strict';
  const base = new URL('.', document.currentScript.src);
  const root = document.getElementById('crew-root');
  let pending;
  let api;
  let generation = 0;

  function script(path) {
    return new Promise((resolve,reject) => {
      const el=document.createElement('script');
      const timer=setTimeout(fail,20000);
      function fail(){clearTimeout(timer);el.remove();reject(new Error('Chargement de Crew indisponible.'));}
      el.src=new URL(path,base).href;
      el.onload=()=>{clearTimeout(timer);resolve();};
      el.onerror=fail;
      document.head.append(el);
    });
  }

  function finishAuthRoute() {
    if (!window.DEADELUSTV_CREW_AUTH) return;
    const clean=new URL(location.href);
    clean.searchParams.delete('crew_auth');
    ['code','error','error_code','error_description'].forEach(name=>clean.searchParams.delete(name));
    clean.hash='crewmongus/admin';
    history.replaceState(null,'',clean.pathname+clean.search+clean.hash);
    window.DEADELUSTV_CREW_AUTH=false;
  }

  async function load() {
    if (api) return api.ready;
    if (!pending) pending=(async()=>{
      const response=await fetch(new URL('content.html',base));
      if(!response.ok)throw new Error('Contenu Crew indisponible.');
      const fragment=document.createElement('template');
      fragment.innerHTML=await response.text();
      fragment.content.querySelectorAll('[src]').forEach(el=>{
        const value=el.getAttribute('src');
        if(value.startsWith('assets/'))el.setAttribute('src',new URL(value,base).href);
      });
      await script('vendor/supabase.js');
      const sdk=window.supabase;
      await script('crew-app.js');
      root.replaceChildren(fragment.content);
      api=window.DEADELUSTV_CREW_FACTORY(root,sdk,view=>{
        const hash='#crewmongus/'+view;
        if(location.hash!==hash)location.hash=hash;
      });
      await api.ready;
      finishAuthRoute();
    })().catch(error=>{
      api?.destroy();api=null;pending=null;finishAuthRoute();throw error;
    });
    return pending;
  }

  async function render(view='stats',focus=false) {
    const current=++generation;
    root.setAttribute('aria-busy','true');
    try {
      await load();
      if(current!==generation)return;
      const heading=api.show(view);
      if(focus){window.scrollTo({top:0,behavior:'instant'});heading?.focus({preventScroll:true});}
    } catch(error) {
      if(current!==generation)return;
      root.innerHTML='<div class="crew-loading" role="alert"><h1 tabindex="-1">Crewmong Us n’a pas pu être chargé.</h1><p>Tu peux réessayer sans quitter DeadelusTV.</p><button class="primary" type="button">Réessayer</button></div>';
      root.querySelector('button').addEventListener('click',()=>render(view,true));
      if(focus)root.querySelector('h1').focus({preventScroll:true});
    } finally {
      if(current===generation)root.removeAttribute('aria-busy');
    }
  }

  window.DEADELUSTV_CREW=Object.freeze({render,cancel(){generation++;root.removeAttribute('aria-busy');}});
})();
