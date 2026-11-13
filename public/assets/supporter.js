/* Cosmetic flags only. No Twitch/PayPal calls, reward claim or metadata-based status. */
(() => {
  'use strict';
  const cards=new Set(),avatars=new Set(),cache=new Map();
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let owner=null,generation=0,timer=null,running=false,queued=false,selfActive=false;
  const uid=()=>window.TCGAuth?.user?.id||window.DEADELUSTV_AUTH?.userId||null;
  const client=async()=>window.TCGAuth?.client||await window.DEADELUSTV_AUTH?.getClient?.();
  const points=[[14,15,-.6,4.9],[87,19,-2.4,5.5],[96,63,-1.1,4.6],[53,98,-3.1,5.2],[3,61,-1.9,5.8]];
  function sparks(){
    const layer=document.createElement('span');layer.className='supporter-sparks';layer.setAttribute('aria-hidden','true');
    for(const [x,y,delay,period] of points){const star=document.createElement('span');star.className='supporter-spark';star.style.cssText='--support-x:'+x+'%;--support-y:'+y+'%;--support-delay:'+delay+'s;--support-period:'+period+'s';layer.append(star);}
    return layer;
  }
  function paint(){
    for(const node of avatars){
      if(!node.isConnected){avatars.delete(node);continue;}
      node.setAttribute('data-supporter-active',String(selfActive&&!!uid()));
      if(!node.querySelector('.supporter-sparks'))node.append(sparks());
    }
    for(const card of cards){
      if(!card.isConnected){cards.delete(card);continue;}
      const mystery=(card.getAttribute('image')||'').split('?')[0].endsWith('/viewer-mystery.webp');
      card.setAttribute('supporter-active',String(!mystery&&!!uid()&&cache.get(card.getAttribute('model-id'))===true));
    }
  }
  function reset(){
    owner=uid();generation++;cache.clear();selfActive=false;paint();schedule();
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(()=>void refresh(),60);}
  async function refresh(){
    if(owner!==uid()){reset();return;}
    if(!owner)return;
    if(running){queued=true;return;}
    running=true;const run=generation,id=owner;
    const current=()=>run===generation&&id===uid();
    try{
      const sb=await client();if(!current()||!sb?.rpc)return;
      const ids=[...new Set([...cards].filter(c=>c.isConnected).map(c=>c.getAttribute('model-id')).filter(value=>uuid.test(value||'')))];
      const resultCache=new Map();let active=false;
      for(let offset=0;offset<Math.max(1,ids.length);offset+=100){
        const batch=ids.slice(offset,offset+100),{data,error}=await sb.rpc('tcg_supporter_appearance',{p_card_ids:batch});
        if(!current())return;
        if(error||data?.owner_id!==id||typeof data.self_active!=='boolean'||!Array.isArray(data.cards))throw Error('Support appearance unavailable');
        active=data.self_active;
        for(const entry of data.cards)if(batch.includes(entry.model_id)&&typeof entry.active==='boolean')resultCache.set(entry.model_id,entry.active);
      }
      if(current()){cache.clear();for(const [key,value] of resultCache)cache.set(key,value);selfActive=active;paint();}
    }catch{
      if(current()){cache.clear();selfActive=false;paint();}
    }finally{running=false;if(queued){queued=false;schedule();}}
  }
  window.TCGSupport=Object.freeze({
    sparks,
    watchAvatar(node){avatars.add(node);node.classList.add('supporter-avatar');paint();},
    registerCard(card){cards.add(card);paint();if(!cache.has(card.getAttribute('model-id')))schedule();},
    unregisterCard(card){cards.delete(card);},
    refresh
  });
  for(const event of ['tcg:auth-change','deadelustv:auth-change','dcg:channel-change'])window.addEventListener(event,reset);
  window.addEventListener('tcg:viewer-change',()=>{if(owner!==uid())reset();else schedule();});
  window.addEventListener('focus',()=>void refresh());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
  setInterval(()=>{if(!document.hidden)void refresh();},60000);
  reset();
})();
