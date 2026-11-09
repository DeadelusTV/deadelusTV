(() => {
  'use strict';
  function mount(host,{client,userId,isCurrent,scope='streamer',onReward=()=>{},compact=false,detailsHost=null}){
    let active=true,version=0,state=null,previousState=null,busy=false,error='',message='',retryLevel=null,stopAnimation=()=>{};
    const valid=()=>active&&host.isConnected&&isCurrent()&&!!userId;
    const stateRpc=scope==='general'?'dcg_my_xp':'tcg_my_xp';
    const claimRpc=scope==='general'?'dcg_claim_general_xp':'tcg_claim_xp';
    const safeState=value=>{
      if(!value||!Number.isSafeInteger(value.total)||!Number.isInteger(value.level)||value.scope!==scope)throw Error('Invalid XP response');
      window.DCGXP.progress(value.total,value.level);return value;
    };
    function details(){
      const p=window.DCGXP.progress(state.total,state.level),opened=Math.min(p.opened,p.required),remaining=Math.max(0,p.required-p.opened);
      const packs=Math.ceil(p.next/2),reward=scope==='general'?10*p.next+' Alkahests':packs+' paquet'+(packs>1?'s':'');
      const percent=(p.fraction*100).toLocaleString('fr-FR',{maximumFractionDigits:1}),count=n=>n.toLocaleString('fr-FR');
      return '<div class="dcg-xp-details__heading"><div><span class="overline">Level UP - <span data-streamer-name>Streamer</span></span><h2>Ma progression XP</h2></div><strong class="dcg-xp-details__level">Niveau '+p.level+'</strong></div>'+
        '<div class="dcg-xp-details__measure"><span>Vers le niveau '+p.next+'</span><strong>'+count(opened)+' / '+count(p.required)+' paquets · '+percent+' %</strong></div>'+
        '<progress class="dcg-xp-details__bar" max="'+p.required+'" value="'+opened+'" aria-label="Progression vers le niveau '+p.next+'">'+percent+' %</progress>'+
        '<dl class="dcg-xp-details__stats"><div><dt>Paquets ouverts au total</dt><dd>'+count(p.total)+'</dd></div><div><dt>Paquets restants pour le niveau '+p.next+'</dt><dd>'+count(remaining)+'</dd></div><div><dt>Récompense du niveau '+p.next+'</dt><dd>'+reward+'</dd></div></dl>'+
        (p.pending?'<p class="dcg-xp-details__available">'+p.pending+' niveau'+(p.pending>1?'x':'')+' à récupérer.</p><button type="button" class="button-primary" data-xp-claim="'+scope+'"'+(busy?' disabled':'')+'>'+(busy?'Récupération…':'Récupérer le niveau '+p.next+' · '+reward)+'</button>':'');
    }
    function appendNote(className,text,role){
      for(const target of [host,detailsHost].filter(Boolean)){
        const note=document.createElement('p');note.className=className;note.textContent=text;if(role)note.setAttribute('role',role);target.append(note);
      }
    }
    function paint(){
      if(!valid())return;
      stopAnimation();
      host.replaceChildren();
      detailsHost?.replaceChildren();
      if(state){
        host.insertAdjacentHTML('beforeend',window.DCGXP.markup(state,{label:scope==='general'?'Niveau général':'Niveau de ce DCG',scope,interactive:true,busy,previousState,compact}));
        if(detailsHost){detailsHost.insertAdjacentHTML('beforeend',details());window.DCGHeader?.refreshBrand();}
        stopAnimation=window.DCGXP.animate(host);
        previousState=null;
        if(state.active===false)appendNote('dcg-xp-pass__note','La progression XP commencera au lancement du DCG. Les ouvertures de test ne sont pas comptées.');
        if(scope==='general'){
          const note=document.createElement('p');note.className='dcg-xp-pass__note';
          note.textContent='Les Alkahests de chaque niveau sont versés intégralement dans chacun de tes DCG rejoints.';host.append(note);
        }
      }else appendNote('dcg-xp-pass__note',error?'':'Lecture de ta progression…','status');
      if(error){
        appendNote('dcg-xp-pass__error',error,'alert');
        for(const target of [host,detailsHost].filter(Boolean)){
          const retry=document.createElement('button');retry.type='button';retry.className='button-outline';retry.dataset.xpRetry='';retry.disabled=busy;retry.textContent=retryLevel?'Vérifier la récompense':compact&&target===host?'Réessayer XP':'Réessayer';target.append(retry);
        }
      }
      if(message)appendNote('dcg-xp-pass__message',message,'status');
    }
    async function reload(){
      if(!valid()||busy||retryLevel)return;
      const run=++version;
      try{const r=await client.rpc(stateRpc);if(!valid()||run!==version)return;if(r.error)throw r.error;const next=safeState(r.data);previousState=state;state=next;error='';}
      catch{if(!valid()||run!==version)return;state=null;error='Ta progression est momentanément indisponible.';}
      paint();
    }
    async function claim(){
      if(!valid()||busy||!state)return;
      const level=retryLevel||state.level+1;busy=true;error='';version++;paint();
      try{
        const r=await client.rpc(claimRpc,{p_level:level});
        if(!valid())return;
        if(r.error)throw r.error;
        if(r.data?.reward?.level!==level||!r.data.xp)throw Error('Invalid reward receipt');
        state=safeState(r.data.xp);retryLevel=null;
        const reward=r.data.reward;
        message=scope==='general'?'Niveau '+level+' récupéré : '+reward.amount_per_dcg+' Alkahests dans chacun de tes '+reward.credits.length+' DCG.':
          'Niveau '+level+' récupéré : '+reward.amount+' paquet'+(reward.amount>1?'s':'')+' dans ta réserve XP.';
        onReward(r.data);
      }catch{if(!valid())return;retryLevel=level;error='Vérifie cette récompense pour retrouver son résultat, sans double attribution.';}
      finally{busy=false;paint();}
    }
    function click(event){
      if(event.target.closest('[data-xp-retry]')){if(retryLevel)void claim();else void reload();}
      else if(event.target.closest('[data-xp-claim]'))void claim();
    }
    const focus=()=>{if(valid())void reload();else destroy();};
    const visible=()=>{if(!document.hidden)focus();};
    const timer=setInterval(focus,60000);
    function destroy(){if(!active)return;active=false;version++;stopAnimation();clearInterval(timer);host.removeEventListener('click',click);detailsHost?.removeEventListener('click',click);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',visible);host.replaceChildren();detailsHost?.replaceChildren();}
    host.classList.add('dcg-xp-pass');host.classList.toggle('dcg-xp-pass--compact',compact);host.addEventListener('click',click);detailsHost?.addEventListener('click',click);window.addEventListener('focus',focus);document.addEventListener('visibilitychange',visible);paint();void reload();
    return Object.freeze({reload,destroy});
  }
  window.DCGXPPass=Object.freeze({mount});
})();
