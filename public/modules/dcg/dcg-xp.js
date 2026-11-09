(() => {
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const integer=(value,name)=>{
    if(!Number.isSafeInteger(value)||value<0)throw new RangeError(name+' must be a non-negative safe integer');
    return value;
  };
  const thresholdBig=level=>5n*BigInt(level)*(BigInt(level)+1n);
  function threshold(level){
    integer(level,'level');const total=thresholdBig(level);
    if(total>BigInt(Number.MAX_SAFE_INTEGER))throw new RangeError('level is too large');
    return Number(total);
  }
  function levelFor(total){
    integer(total,'total');const count=BigInt(total);
    let level=Math.floor((Math.sqrt(1+0.8*total)-1)/2);
    while(thresholdBig(level)>count)level--;
    while(thresholdBig(level+1)<=count)level++;
    return level;
  }
  function progress(total,claimed){
    const reached=levelFor(total);
    const level=claimed===undefined?reached:integer(claimed,'claimed level');
    if(level>reached)throw new RangeError('claimed level exceeds earned level');
    const required=10*(level+1),opened=total-threshold(level);
    return Object.freeze({total,level,reached,next:level+1,opened,required,
      fraction:Math.min(1,opened/required),pending:reached-level});
  }
  function markup(state,{label='Niveau DCG',scope='streamer',interactive=false,busy=false}={}){
    const p=progress(state.total,state.level),ready=p.pending>0;
    const text=ready?'Niveau '+p.next+' disponible':p.opened+' / '+p.required+' paquets';
    const reward=scope==='general'?10*p.next+' Alkahests':Math.ceil(p.next/2)+' paquet'+(Math.ceil(p.next/2)>1?'s':'');
    const tag=interactive&&ready?'button':'div';
    return '<'+tag+' class="dcg-xp'+(ready?' dcg-xp--ready':'')+'"'+(tag==='button'?' type="button" data-xp-claim="'+esc(scope)+'"'+(busy?' disabled':''):'')+
      ' style="--xp-progress:'+p.fraction+'" aria-label="'+esc(label+' : niveau '+p.level+'. '+text+'. Prochaine récompense : '+reward)+'">'+
      '<span class="dcg-xp__medal" aria-hidden="true"><span class="dcg-xp__halo"></span><span class="dcg-xp__face"></span><span class="dcg-xp__ring"></span><span class="dcg-xp__number">'+p.level+'</span><span class="dcg-xp__glint"></span></span>'+
      '<span class="dcg-xp__copy"><span class="dcg-xp__label">'+esc(label)+'</span><strong>'+esc(text)+'</strong><span class="dcg-xp__reward">'+esc(ready?(busy?'Récupération…':interactive?'Récupérer · '+reward:'Récompense · '+reward):'Niveau '+p.next+' · '+reward)+'</span></span></'+tag+'>';
  }
  window.DCGXP=Object.freeze({threshold,levelFor,progress,markup});
})();
