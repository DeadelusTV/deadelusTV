(() => {
  'use strict';
  // Resolve assets relative to this script, both in the game and in the portal.
  const base=new URL('assets/xp/',document.currentScript?.src||document.baseURI);
  const icons=Object.freeze({booster:new URL('dcg-booster-256.webp',base).href,alkahest:new URL('dcg-alkahest-256.webp',base).href});
  const count=value=>Number.isSafeInteger(value)&&value>0;
  function items(receipt,scope){
    const reward=receipt?.reward;
    if(scope==='daily'){
      const groups=new Map();
      for(const gain of receipt?.gains||[]){
        const kind=gain.kind==='dust'?'alkahest':gain.kind==='booster'?'booster':null,amount=kind==='booster'?1:gain.amount;
        if(!kind||!count(amount))continue;
        const key=JSON.stringify([gain.broadcaster_id,kind]),entry=groups.get(key)||{kind,amount:0};entry.amount+=amount;groups.set(key,entry);
      }
      return [...groups.values()].filter((item,i,all)=>count(item.amount)&&all.findIndex(other=>other.kind===item.kind)===i);
    }
    if(scope==='streamer'&&count(reward?.amount))return[{kind:'booster',amount:reward.amount,label:'booster'+(reward.amount>1?'s':'')}];
    if(scope==='general'&&count(reward?.amount_per_dcg)&&Array.isArray(reward.credits)&&reward.credits.length)return[{kind:'alkahest',amount:reward.amount_per_dcg,label:'Alkahests par DCG'}];
    return[];
  }
  function start(host,{scope='streamer',valid=()=>host.isConnected,resolveTargets=null,anchor=null}={}){
    const medal=host.querySelector('.dcg-xp'),face=anchor||medal?.querySelector('.dcg-xp__medal');
    if(!face||typeof window.requestAnimationFrame!=='function'||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return null;
    let cancelled=false,layer=null;
    const pending=new Set(),pulses=new Set(),extras=[];
    const alive=()=>!cancelled&&host.isConnected&&face.isConnected&&valid();
    function cancel(){
      if(cancelled)return;
      cancelled=true;
      for(const stop of [...pending])stop();pending.clear();
      medal?.classList.remove('dcg-xp--charging','dcg-xp--burst','dcg-xp--draining');
      extras.forEach(el=>el.remove());layer?.remove();pulses.forEach(el=>el.classList.remove('dcg-xp-reward-received'));
    }
    function delay(ms){
      return new Promise(resolve=>{
        if(!alive()){cancel();resolve(false);return;}
        const stop=()=>{window.clearTimeout(timer);pending.delete(stop);resolve(false);};
        const timer=window.setTimeout(()=>{pending.delete(stop);const ok=alive();if(!ok)cancel();resolve(ok);},ms);
        pending.add(stop);
      });
    }
    function tween(ms,update){
      return new Promise(resolve=>{
        let frame,begin=null;
        const stop=()=>{window.cancelAnimationFrame(frame);pending.delete(stop);resolve(false);};
        function step(time){
          if(!alive()){cancel();return;}
          if(begin===null)begin=time;
          const t=Math.min(1,(time-begin)/ms);
          try{update(t);}catch{cancel();return;}
          if(t<1)frame=window.requestAnimationFrame(step);else{pending.delete(stop);resolve(true);}
        }
        pending.add(stop);frame=window.requestAnimationFrame(step);
      });
    }
    function decoration(className){const el=document.createElement('span');el.className=className;el.setAttribute('aria-hidden','true');face.append(el);extras.push(el);return el;}
    function burst(){
      medal.classList.remove('dcg-xp--charging');medal.classList.add('dcg-xp--burst');
      decoration('dcg-xp-reward-flash');decoration('dcg-xp-reward-wave');
      const dust=document.createElement('span');dust.className='dcg-xp-reward-dust';dust.setAttribute('aria-hidden','true');document.body.append(dust);extras.push(dust);
      const center=face.getBoundingClientRect();
      for(let i=0;i<36;i++){
        const a=i/36*Math.PI*2,r=center.width*(.28+(i*37%35)/100),star=document.createElement('i');
        star.style.left=center.left+center.width/2+'px';star.style.top=center.top+center.height/2+'px';
        star.style.setProperty('--reward-x',Math.cos(a)*r+'px');star.style.setProperty('--reward-y',Math.sin(a)*r+'px');
        star.style.setProperty('--reward-delay',i%5*22+'ms');dust.append(star);
      }
    }
    const visible=el=>{if(!el)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<window.innerHeight&&r.right>0&&r.left<window.innerWidth;};
    function target(kind){
      const selectors=kind==='booster'?['[data-xp-reward-target="booster"]','[data-reserve-count="xp"]','a[href="#/boosters"]']:['[data-xp-reward-target="alkahest"]','[data-shop-balance]','[data-portal-spaces] .portal-space'];
      return selectors.flatMap(selector=>[...document.querySelectorAll(selector)]).find(visible)||null;
    }
    function show(rewards){
      layer=document.createElement('div');layer.className='dcg-xp-reward-layer';layer.setAttribute('aria-hidden','true');document.body.append(layer);
      const row=document.createElement('div');row.className='dcg-xp-reward-row';layer.append(row);
      for(const reward of rewards){
        const token=document.createElement('span');token.className='dcg-xp-reward dcg-xp-reward--'+reward.kind;
        const image=document.createElement('img');image.src=icons[reward.kind];image.alt='';image.width=92;image.height=100;
        const qty=document.createElement('span');qty.className='dcg-xp-reward__quantity';qty.textContent='×'+reward.amount.toLocaleString('fr-FR');
        token.append(image,qty);token.dataset.rewardKind=reward.kind;row.append(token);
      }
      const r=face.getBoundingClientRect(),box=row.getBoundingClientRect();
      row.style.left=Math.max(12,Math.min(window.innerWidth-box.width-12,r.left+r.width/2-box.width/2))+'px';
      row.style.top=Math.max(12,Math.min(window.innerHeight-box.height-12,r.bottom+12))+'px';
      return row;
    }
    async function flight(token,delivery=null){
      const destination=delivery?.element||target(token.dataset.rewardKind),s=token.getBoundingClientRect(),d=destination?.getBoundingClientRect();
      const dx=d?d.left+d.width/2-(s.left+s.width/2):0,dy=d?d.top+d.height/2-(s.top+s.height/2):-76;
      const ok=await tween(900,t=>{const e=t*t*(3-2*t);token.style.transform='translate('+dx*e+'px,'+(dy*e-Math.sin(Math.PI*t)*30)+'px) scale('+(1-.45*e)+')';token.style.opacity=String(t<.75?1:1-(t-.75)*4);});
      if(ok&&destination?.isConnected){destination.classList.add('dcg-xp-reward-received');pulses.add(destination);try{delivery?.onArrival?.();}catch{/* Presentation cannot affect a credited gain. */}}
      return ok;
    }
    async function send(row,receipt){
      if(!resolveTargets)return(await Promise.all([...row.children].map(token=>flight(token)))).every(Boolean);
      const flights=[];
      for(const token of [...row.children]){
        const box=token.getBoundingClientRect();
        for(const delivery of resolveTargets(receipt,token.dataset.rewardKind)||[]){
          if(!visible(delivery.element)||!count(delivery.amount))continue;
          const copy=token.cloneNode(true);copy.style.position='absolute';copy.style.left=box.left+'px';copy.style.top=box.top+'px';
          copy.querySelector('.dcg-xp-reward__quantity').textContent='×'+delivery.amount.toLocaleString('fr-FR');layer.append(copy);flights.push(flight(copy,delivery));
        }
        token.style.visibility='hidden';
      }
      return(await Promise.all(flights)).every(Boolean);
    }
    if(scope!=='daily')medal?.classList.add('dcg-xp--charging');
    const charged=scope==='daily'?Promise.resolve(true):delay(420);
    async function complete(receipt){
      if(receipt?.replayed===true){cancel();return;}
      if(!await charged||!alive())return;
      const rewards=items(receipt,scope);
      if(!rewards.length){cancel();return;}
      if(scope!=='daily'){burst();if(!await delay(700))return;medal.classList.remove('dcg-xp--burst');}
      const row=show(rewards);if(!await delay(scope==='daily'?350:1150))return;
      if(!await send(row,receipt))return;
      layer.remove();layer=null;
      if(!medal)return;
      medal.classList.add('dcg-xp--draining');
      if(!await tween(560,t=>window.DCGXP?.setFraction(medal,Math.pow(1-t,2))))return;
      const number=medal.querySelector('.dcg-xp__number');if(number)number.textContent=receipt.reward.level;
    }
    return Object.freeze({complete,cancel});
  }
  window.DCGXPRewards=Object.freeze({start,items});
})();
