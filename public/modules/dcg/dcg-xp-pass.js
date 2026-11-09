(() => {
  'use strict';
  function mount(host,{client,userId,isCurrent,scope='streamer',onReward=()=>{}}){
    let active=true,version=0,state=null,previousState=null,busy=false,error='',message='',retryLevel=null,stopAnimation=()=>{};
    const valid=()=>active&&host.isConnected&&isCurrent()&&!!userId;
    const stateRpc=scope==='general'?'dcg_my_xp':'tcg_my_xp';
    const claimRpc=scope==='general'?'dcg_claim_general_xp':'tcg_claim_xp';
    const safeState=value=>{
      if(!value||!Number.isSafeInteger(value.total)||!Number.isInteger(value.level)||value.scope!==scope)throw Error('Invalid XP response');
      window.DCGXP.progress(value.total,value.level);return value;
    };
    function paint(){
      if(!valid())return;
      stopAnimation();
      host.replaceChildren();
      if(state){
        host.insertAdjacentHTML('beforeend',window.DCGXP.markup(state,{label:scope==='general'?'Niveau général':'Niveau de ce DCG',scope,interactive:true,busy,previousState}));
        stopAnimation=window.DCGXP.animate(host);
        previousState=null;
        if(state.active===false){const note=document.createElement('p');note.className='dcg-xp-pass__note';note.textContent='La progression XP commencera au lancement du DCG. Les ouvertures de test ne sont pas comptées.';host.append(note);}
        if(scope==='general'){
          const note=document.createElement('p');note.className='dcg-xp-pass__note';
          note.textContent='Les Alkahests de chaque niveau sont versés intégralement dans chacun de tes DCG rejoints.';host.append(note);
        }
      }else{const note=document.createElement('p');note.textContent=error?'':'Lecture de ta progression…';note.setAttribute('role','status');host.append(note);}
      if(error){
        const note=document.createElement('p');note.className='dcg-xp-pass__error';note.setAttribute('role','alert');note.textContent=error;host.append(note);
        const retry=document.createElement('button');retry.type='button';retry.className='button-outline';retry.dataset.xpRetry='';retry.disabled=busy;retry.textContent=retryLevel?'Vérifier la récompense':'Réessayer';host.append(retry);
      }
      if(message){const note=document.createElement('p');note.className='dcg-xp-pass__message';note.setAttribute('role','status');note.textContent=message;host.append(note);}
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
    function destroy(){if(!active)return;active=false;version++;stopAnimation();clearInterval(timer);host.removeEventListener('click',click);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',visible);host.replaceChildren();}
    host.classList.add('dcg-xp-pass');host.addEventListener('click',click);window.addEventListener('focus',focus);document.addEventListener('visibilitychange',visible);paint();void reload();
    return Object.freeze({reload,destroy});
  }
  window.DCGXPPass=Object.freeze({mount});
})();
