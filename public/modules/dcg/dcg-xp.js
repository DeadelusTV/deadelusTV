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
  // Adapted from the supplied Pass-XP prototype: fixed micro-stars, no orbiting marker.
  function sparkles(fraction,burst=false){
    if(fraction===0)return '';
    const particles=[];
    function place(i,kind){
      const seed=(i*.61803398875+.137)%1,extra=kind==='dust',flash=kind==='burst';
      const angle=(-90+360*fraction*seed)*Math.PI/180;
      const radius=(extra?119:flash?103:106)+((i*29+17)%100)/100*(extra?21:flash?24:16);
      const size=(extra?1.1:2.1)+((i*43+7)%100)/100*(extra?2.3:5.8);
      const duration=flash?.65+(i%9)*.05:2+(i%10)*.3;
      const tiny=extra||i%7<2;
      particles.push('<span class="dcg-xp__spark'+(tiny?' dcg-xp__spark--tiny':'')+(flash?' dcg-xp__spark--burst':'')+'" style="--xp-x:'+(50+radius/240*100*Math.cos(angle)).toFixed(3)+'%;--xp-y:'+(50+radius/240*100*Math.sin(angle)).toFixed(3)+'%;--xp-spark-size:'+(size/220).toFixed(5)+';--xp-spark-time:'+duration.toFixed(2)+'s;--xp-spark-delay:'+(flash?'0':(-.2-(i*.731%5)).toFixed(3))+'s;--xp-spark-rotation:'+((i*17%64)-32)+'deg;--xp-spark-peak:'+(.63+(i%8)*.05).toFixed(2)+'"></span>');
    }
    for(let i=0;i<Math.max(6,Math.floor(fraction*86));i++)place(i,'star');
    if(fraction===1)for(let i=0;i<38;i++)place(i+101,'dust');
    if(burst)for(let i=0;i<(fraction===1?30:19);i++)place(i+211,'burst');
    return particles.join('');
  }
  function ring(fraction){
    const dash=' pathLength="100" stroke-dasharray="'+(fraction*100).toFixed(3)+' 100" transform="rotate(-90 120 120)"';
    const circle=(name,r,width,extra='')=>'<circle class="dcg-xp__ring-'+name+'" cx="120" cy="120" r="'+r+'" fill="none" stroke-width="'+width+'"'+extra+'/>';
    return '<svg class="dcg-xp__ring-svg" viewBox="0 0 240 240" aria-hidden="true">'+
      circle('track',110,11)+circle('edge',116.5,1)+circle('edge',102.4,1)+
      circle('fog',110,19,dash)+circle('active',110,8,dash)+circle('inner',104.7,1.4,dash)+'</svg>';
  }
  function markup(state,{label='Niveau DCG',scope='streamer',interactive=false,busy=false,previousState=null}={}){
    const p=progress(state.total,state.level),ready=p.pending>0;
    const advance=previousState!==null&&previousState.level===p.level&&previousState.total<p.total;
    const from=advance?progress(previousState.total,previousState.level).fraction:p.fraction;
    const text=ready?'Niveau '+p.next+' disponible':p.opened+' / '+p.required+' paquets';
    const reward=scope==='general'?10*p.next+' Alkahests':Math.ceil(p.next/2)+' paquet'+(Math.ceil(p.next/2)>1?'s':'');
    const tag=interactive&&ready?'button':'div';
    return '<'+tag+' class="dcg-xp'+(ready?' dcg-xp--ready':'')+(advance?' dcg-xp--advance':'')+'"'+(tag==='button'?' type="button" data-xp-claim="'+esc(scope)+'"'+(busy?' disabled':''):'')+
      ' style="--xp-progress:'+p.fraction+';--xp-from:'+from+'" aria-label="'+esc(label+' : niveau '+p.level+'. '+text+'. Prochaine récompense : '+reward)+'">'+
      '<span class="dcg-xp__medal" aria-hidden="true"><span class="dcg-xp__halo"></span><span class="dcg-xp__face"></span>'+ring(p.fraction)+'<span class="dcg-xp__sparks">'+sparkles(p.fraction,advance)+'</span><span class="dcg-xp__number">'+p.level+'</span></span>'+
      '<span class="dcg-xp__copy"><span class="dcg-xp__label">'+esc(label)+'</span><strong>'+esc(text)+'</strong><span class="dcg-xp__reward">'+esc(ready?(busy?'Récupération…':interactive?'Récupérer · '+reward:'Récompense · '+reward):'Niveau '+p.next+' · '+reward)+'</span></span></'+tag+'>';
  }
  window.DCGXP=Object.freeze({threshold,levelFor,progress,markup});
})();
