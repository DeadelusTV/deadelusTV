(() => {
  'use strict';
  const base=new URL('assets/xp/',document.currentScript?.src||document.baseURI);
  const icons={alkahest:new URL('dcg-alkahest-256.webp',base).href,booster:new URL('dcg-booster-256.webp',base).href};
  const positive=value=>Number.isSafeInteger(value)&&value>0;
  // General rewards are the amount received in each DCG, never a pooled balance.
  function dailyItems(gains){
    const totals=new Map();
    for(const gain of gains||[]){
      const kind=gain.kind==='dust'?'alkahest':gain.kind==='booster'?'booster':null;
      const amount=kind==='alkahest'?gain.amount:1;
      if(!kind||!positive(amount))continue;
      const source=String(gain.broadcaster_id||gain.login||'');
      const key=JSON.stringify([source,kind]),item=totals.get(key)||{kind,amount:0,source};
      item.amount+=amount;totals.set(key,item);
    }
    // Equal per-DCG receipts share one icon; they do not become a pooled balance.
    const groups=new Map();
    for(const item of totals.values()){
      const key=JSON.stringify([item.kind,item.amount]),entry=groups.get(key)||{...item,channels:0};entry.channels++;groups.set(key,entry);
    }
    return [...groups.values()].map(({kind,amount,source,channels})=>({kind,amount,label:channels>1?'par DCG':source}));
  }
  function show(host,rewards,{anchor=host,valid=()=>host.isConnected}={}){
    let layer=null,timer=null,finish;
    const finished=new Promise(resolve=>{finish=resolve;});
    const cancel=()=>{if(timer!==null)window.clearTimeout(timer);timer=null;layer?.remove();layer=null;finish();};
    const safe=(rewards||[]).filter(item=>icons[item.kind]&&positive(item.amount));
    if(!host?.isConnected||!valid()||!safe.length){cancel();return {finished,cancel};}
    layer=document.createElement('div');layer.className='portal-profile-gain';layer.setAttribute('role','status');layer.setAttribute('aria-live','polite');
    for(const reward of safe){
      const item=document.createElement('span');item.className='portal-profile-gain__item';
      const image=document.createElement('img');image.src=icons[reward.kind];image.alt=reward.kind==='alkahest'?'Alkahests':'Boosters';image.width=64;image.height=70;
      const amount=document.createElement('strong');amount.textContent='×'+reward.amount.toLocaleString('fr-FR');item.append(image,amount);
      if(reward.label){const label=document.createElement('small');label.textContent=reward.label;item.append(label);}
      layer.append(item);
    }
    document.body.append(layer);
    const rect=anchor.getBoundingClientRect(),box=layer.getBoundingClientRect();
    layer.style.left=Math.max(12,Math.min(window.innerWidth-box.width-12,rect.left+rect.width/2-box.width/2))+'px';
    layer.style.top=Math.max(12,Math.min(window.innerHeight-box.height-12,rect.bottom+8))+'px';
    timer=window.setTimeout(cancel,1500);
    return Object.freeze({finished,cancel});
  }
  function start(host,{scope='general',valid=()=>host.isConnected}={}){
    let cancelled=false,popup=null;
    return Object.freeze({cancel(){cancelled=true;popup?.cancel();},async complete(receipt){
      if(cancelled||!valid())return;
      const reward=receipt?.reward,amount=scope==='general'?reward?.amount_per_dcg:reward?.amount;
      if(!positive(amount)||scope==='general'&&(!Array.isArray(reward?.credits)||!reward.credits.length))return;
      popup=show(host,[{kind:scope==='general'?'alkahest':'booster',amount,label:scope==='general'?'par DCG':''}],{valid,anchor:host.querySelector('.dcg-xp__medal')||host});
      await popup.finished;
    }});
  }
  window.DCGProfileRewards=Object.freeze({show,start,dailyItems});
})();
