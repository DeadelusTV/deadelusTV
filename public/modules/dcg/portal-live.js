(() => {
  'use strict';
  const validId=id=>typeof id==='string'&&/^\d{1,40}$/.test(id);
  async function json(url,signal){
    const response=await fetch(url,{method:'GET',credentials:'omit',cache:'no-store',signal});
    if(!response.ok)throw Error('Statut indisponible');
    return response.json();
  }
  async function read(ids,legacyBroadcasterId,signal){
    const statuses=new Map();
    const query=new URLSearchParams();for(const id of ids)query.append('broadcaster_id',id);
    try{
      const data=await json('/api/dcg-live-status?'+query,signal);
      for(const id of ids)if(typeof data?.statuses?.[id]==='boolean')statuses.set(id,data.statuses[id]);
    }catch{/* Aucun statut non confirmé. */}
    // L'API OVH historique est exclusivement celle de DeadelusTV.
    if(!signal.aborted&&ids.includes(legacyBroadcasterId)&&!statuses.has(legacyBroadcasterId)){
      try{const data=await json('/api/twitch-status',signal);if(typeof data?.live==='boolean')statuses.set(legacyBroadcasterId,data.live);}catch{/* Indisponible. */}
    }
    return statuses;
  }
  function mount(host,{userId,spaces,legacyBroadcasterId,isCurrent}){
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
        const batches=[];for(let i=0;i<ids.length;i+=100)batches.push(read(ids.slice(i,i+100),legacyBroadcasterId,current.signal));
        const result=await Promise.all(batches);
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
