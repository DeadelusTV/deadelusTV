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
  function sparkles(fraction){
    if(fraction===0)return '';
    const count=96,particles=[];
    for(let i=0;i<count;i++){
      const angle=(i*137.508+6)%360;
      if(angle>fraction*360)continue;
      const radians=angle*Math.PI/180,star=i%5===0;
      const radius=.435+((i*29)%100)/100*.135;
      const x=50+Math.sin(radians)*radius/1.24*100,y=50-Math.cos(radians)*radius/1.24*100;
      const size=star?.045+(i%3)*.009:.008+(i%4)*.003;
      particles.push('<span class="dcg-xp__spark'+(star?' dcg-xp__spark--star':'')+'" style="left:'+x.toFixed(3)+'%;top:'+y.toFixed(3)+'%;--xp-spark-size:'+size.toFixed(3)+';--xp-spark-time:'+(3.3+(i%9)*.31).toFixed(2)+'s;--xp-spark-delay:-'+(i*.731%6).toFixed(3)+'s;--xp-spark-x:'+(.022*Math.sin(radians)).toFixed(4)+';--xp-spark-y:'+(-.022*Math.cos(radians)).toFixed(4)+'"></span>');
    }
    return particles.join('');
  }
  function markup(state,{label='Niveau DCG',scope='streamer',interactive=false,busy=false}={}){
    const p=progress(state.total,state.level),ready=p.pending>0;
    const text=ready?'Niveau '+p.next+' disponible':p.opened+' / '+p.required+' paquets';
    const reward=scope==='general'?10*p.next+' Alkahests':Math.ceil(p.next/2)+' paquet'+(Math.ceil(p.next/2)>1?'s':'');
    const tag=interactive&&ready?'button':'div';
    return '<'+tag+' class="dcg-xp'+(ready?' dcg-xp--ready':'')+'"'+(tag==='button'?' type="button" data-xp-claim="'+esc(scope)+'"'+(busy?' disabled':''):'')+
      ' style="--xp-progress:'+p.fraction+'" aria-label="'+esc(label+' : niveau '+p.level+'. '+text+'. Prochaine récompense : '+reward)+'">'+
      '<span class="dcg-xp__medal" aria-hidden="true"><span class="dcg-xp__halo"></span><span class="dcg-xp__face"></span><span class="dcg-xp__ring"><span class="dcg-xp__ring-fill"></span></span><span class="dcg-xp__sparks">'+sparkles(p.fraction)+'</span><span class="dcg-xp__number">'+p.level+'</span><span class="dcg-xp__glint"></span></span>'+
      '<span class="dcg-xp__copy"><span class="dcg-xp__label">'+esc(label)+'</span><strong>'+esc(text)+'</strong><span class="dcg-xp__reward">'+esc(ready?(busy?'Récupération…':interactive?'Récupérer · '+reward:'Récompense · '+reward):'Niveau '+p.next+' · '+reward)+'</span></span></'+tag+'>';
  }
  window.DCGXP=Object.freeze({threshold,levelFor,progress,markup});
})();
