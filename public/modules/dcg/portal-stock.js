(() => {
  'use strict';
  const count=value=>Number.isSafeInteger(value)&&value>=0;
  const positive=value=>count(value)&&value>0;
  function mount(host,{userId,readers,isCurrent}){
    let active=true;
    const states=new Map(readers.map(reader=>[reader.broadcasterId,{...reader,values:null,version:0,error:false}]));
    const pulses=new Set(),timers=new Set();
    const valid=()=>active&&host.isConnected&&!!userId&&isCurrent();
    const card=state=>host.querySelector('[data-dcg="'+state.spaceId+'"]');
    function sync(){
      if(!valid())return;
      for(const state of states.values()){
        const node=card(state);if(!node)continue;
        for(const [kind,key]of [['booster','boosters'],['alkahest','alkahests']]){
          const target=node.querySelector('[data-portal-stock="'+kind+'"]');if(!target)continue;
          const value=state.values?state.values[key].toLocaleString('fr-FR'):state.error?'—':'…';
          if(target.textContent!==value)target.textContent=value;
          target.title=state.error?'Mise à jour momentanément indisponible':'';
        }
      }
    }
    async function refresh(){
      if(!valid()||document.hidden)return;
      await Promise.allSettled([...states.values()].map(async state=>{
        const version=++state.version;
        try{
          // Same authenticated stock as the DCG navigation, including ready reserves.
          const result=await state.read();if(!valid()||state.version!==version)return;
          const data=result.data,dust=data?.shop?.dust;
          if(result.error||dust?.scope!=='streamer'||dust.broadcaster_id!==state.broadcasterId||!count(data.available)||!count(dust.balance))throw Error('Invalid DCG stock');
          state.values={boosters:data.available,alkahests:dust.balance};state.error=false;
        }catch{if(!valid()||state.version!==version)return;state.error=true;}
        sync();
      }));
    }
    function pulse(state,kind){
      if(!valid())return;
      const node=card(state),target=node?.querySelector('[data-portal-stock-target="'+kind+'"]');if(!node||!target)return;
      node.classList.add('portal-space--reward');target.classList.add('dcg-xp-reward-received');pulses.add(node);pulses.add(target);
      const timer=window.setTimeout(()=>{timers.delete(timer);node.classList.remove('portal-space--reward');target.classList.remove('dcg-xp-reward-received');pulses.delete(node);pulses.delete(target);},900);timers.add(timer);
    }
    function targets(receipt,kind){
      if(!valid()||receipt?.replayed===true)return[];
      const grouped=new Map();
      const entries=Array.isArray(receipt?.gains)?receipt.gains:kind==='alkahest'?receipt?.reward?.credits||[]:[];
      for(const entry of entries){
        const channel=String(entry.broadcaster_id||''),state=states.get(channel);
        const matches=receipt.gains?(kind==='alkahest'?entry.kind==='dust':entry.kind==='booster'):kind==='alkahest';
        const amount=receipt.gains&&kind==='booster'?1:entry.amount;
        if(!state||!matches||!positive(amount))continue;
        const previous=grouped.get(channel)||{state,amount:0};previous.amount+=amount;grouped.set(channel,previous);
      }
      return [...grouped.values()].flatMap(({state,amount})=>{
        const element=card(state)?.querySelector('[data-portal-stock-target="'+kind+'"]');
        return element&&positive(amount)?[{element,amount,onArrival:()=>pulse(state,kind)}]:[];
      });
    }
    const focus=()=>{if(valid())void refresh();else destroy();};
    const visible=()=>{if(!document.hidden)focus();};
    const timer=window.setInterval(focus,60000);
    function destroy(){
      if(!active)return;active=false;for(const state of states.values()){
        state.version++;state.values=null;
        for(const kind of ['booster','alkahest']){const target=card(state)?.querySelector('[data-portal-stock="'+kind+'"]');if(target){target.textContent='—';target.title='';}}
      }
      window.clearInterval(timer);for(const timer of timers)window.clearTimeout(timer);timers.clear();
      for(const node of pulses){node.classList.remove('portal-space--reward');node.classList.remove('dcg-xp-reward-received');}pulses.clear();
      window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',visible);
    }
    window.addEventListener('focus',focus);document.addEventListener('visibilitychange',visible);sync();void refresh();
    return Object.freeze({refresh,sync,targets,destroy});
  }
  window.DCGPortalStock=Object.freeze({mount});
})();
