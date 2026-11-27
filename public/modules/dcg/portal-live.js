(() => {
  'use strict';
  const validId=id=>typeof id==='string'&&/^\d{1,40}$/.test(id);
  function mount(host,{userId,spaces,read,isCurrent}){
    const ids=[...new Set(spaces.map(space=>space.broadcasterId).filter(validId))];
    let active=true,request=null,statuses=new Map();
    const valid=()=>active&&host.isConnected&&!!userId&&isCurrent();
    function sync(){
      const show=valid()&&!document.hidden;
      for(const node of host.querySelectorAll('[data-portal-live]'))node.hidden=!(show&&statuses.get(node.dataset.portalLive)===true);
    }
    function reset(){request?.abort();request=null;statuses.clear();sync();}
    async function refresh(){
      if(!valid()||document.hidden||request||!ids.length)return;
      const current=new AbortController();request=current;
      const timer=window.setTimeout(()=>current.abort(),8000);
      try{
        const result=await Promise.all(spaces.map(async space=>{
          try{const r=await read(space);if(r.dcg_id!==space.id||r.broadcaster_id!==space.broadcasterId)throw Error('Statut étranger');return new Map(typeof r.online==='boolean'?[[space.broadcasterId,r.online]]:[]);}
          catch{return new Map();}
        }));
        if(valid()&&request===current&&!current.signal.aborted)statuses=new Map(result.flatMap(map=>[...map]));
      }catch{if(request===current)statuses.clear();}
      finally{
        window.clearTimeout(timer);
        if(request===current){if(current.signal.aborted)statuses.clear();request=null;sync();}
      }
    }
    const focus=()=>{if(valid())void refresh();else destroy();};
    const visibility=()=>{if(document.hidden)reset();else focus();};
    const timer=window.setInterval(focus,60000);
    function destroy(){
      if(!active)return;active=false;reset();window.clearInterval(timer);
      window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',visibility);
    }
    window.addEventListener('focus',focus);document.addEventListener('visibilitychange',visibility);
    sync();void refresh();
    return Object.freeze({sync,refresh,destroy});
  }
  window.DCGPortalLive=Object.freeze({mount});
})();
