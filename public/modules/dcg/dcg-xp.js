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
  // Geometry, star positions and timings from the supplied DCG Pass XP V3.
  const radius=133;
  let medalId=0;
  function prng(n){const x=Math.sin(n*78.23+23.48)*43587.234;return x-Math.floor(x);}
  function point(angle,r=radius){const a=(angle-90)*Math.PI/180;return{x:150+r*Math.cos(a),y:150+r*Math.sin(a)};}
  function arc(a,b){
    if(b-a<.05)return '';
    if(b-a>=359.999)b=a+359.999;
    const start=point(a),end=point(b);
    return 'M'+start.x.toFixed(3)+' '+start.y.toFixed(3)+' A133 133 0 '+(b-a>180?1:0)+' 1 '+end.x.toFixed(3)+' '+end.y.toFixed(3);
  }
  function geometry(fraction){
    const degrees=360*fraction,feather=fraction===1?0:Math.min(16,degrees*.25);
    const bodyEnd=Math.max(0,degrees-feather),startFeather=fraction===1?0:Math.min(9,bodyEnd*.36);
    const core=bodyEnd>startFeather?arc(startFeather,bodyEnd):'';
    const segments=(count,start)=>Array.from({length:count},(_,k)=>{
      const t0=k/count,t1=(k+1)/count;
      return{d:start?(startFeather>0?arc(startFeather*t0,startFeather*t1):''):(feather>0?arc(bodyEnd+feather*t0,bodyEnd+feather*t1):''),
        alpha:start?Math.pow(t1,1.65)*.86:Math.pow(1-t0,1.75)*.92,
        width:start?12+2*t1:14-4.5*t0};
    });
    return{core,fog:degrees>=359.98?arc(0,359.999):core,starts:segments(12,true),tails:segments(18,false)};
  }
  const visibleSpark=(angle,fraction)=>fraction>0&&angle<=360*fraction&&(angle<360*fraction-12||fraction>=1||prng(angle)<.6);
  function nebulaStars(){
    return Array.from({length:46},(_,j)=>{
      const a=prng(j+1700)*Math.PI*2,r=j<18?.28+.11*prng(j+1770):.12+.31*prng(j+1770),major=j<16;
      const size=major?7+prng(j+1820)*9:2+prng(j+1820)*3.7;
      return '<span class="dcg-xp__nebula-star'+(major?'':' dcg-xp__nebula-star--small')+'" style="--xp-x:'+(50+Math.cos(a)*r*100).toFixed(2)+'%;--xp-y:'+(50+Math.sin(a)*r*100).toFixed(2)+'%;--xp-star-size:'+(size/238).toFixed(6)+';--xp-duration:'+(2.2+prng(j+1900)*4.2).toFixed(2)+'s;--xp-delay:'+(-prng(j+1920)*6.5).toFixed(2)+'s;--xp-base:'+(major?'.19':'.34')+';--xp-peak:'+(major?'.99':'.85')+';--xp-glow:'+(major?'1':'.5')+'"></span>';
    }).join('');
  }
  function sparkles(fraction){
    return Array.from({length:138},(_,i)=>{
      const angle=prng(i+20)*359.9,p=point(angle,radius+(prng(i+130)-.5)*15),major=prng(i+540)<.20;
      const size=major?Math.min(10,6+prng(i+250)*4.3):2.3+prng(i+350)*3;
      return '<span class="dcg-xp__spark'+(major?' dcg-xp__spark--major':'')+(prng(i+100)<.38&&!major?' dcg-xp__spark--dot':'')+'" data-xp-angle="'+angle+'"'+(visibleSpark(angle,fraction)?'':' hidden')+' style="--xp-x:'+(p.x/3).toFixed(2)+'%;--xp-y:'+(p.y/3).toFixed(2)+'%;--xp-star-size:'+(size/238).toFixed(6)+';--xp-period:'+(2.5+prng(i+70)*4.2).toFixed(2)+'s;--xp-delay:'+(-prng(i+80)*7).toFixed(2)+'s;--xp-power:'+(.55+prng(i+90)*.45).toFixed(2)+'"></span>';
    }).join('');
  }
  function ring(fraction){
    const id='dcg-xp-gold-'+(++medalId),g=geometry(fraction);
    const circle=(name,r,width)=>'<circle class="dcg-xp__metal-'+name+'" cx="150" cy="150" r="'+r+'" stroke-width="'+width+'"/>';
    const path=(name,d,extra='')=>'<path class="dcg-xp__arc-'+name+'" d="'+d+'"'+extra+'/>';
    const segments=(items,name)=>items.map((s,k)=>path('tail dcg-xp__arc-tail--glow',s.d,' data-xp-'+name+'-glow="'+k+'" style="opacity:'+(s.alpha*(name==='start'?.27:.25)).toFixed(3)+'"')+
      path('tail',s.d,' data-xp-'+name+'="'+k+'" style="opacity:'+s.alpha.toFixed(3)+';stroke-width:'+s.width.toFixed(2)+'"')).join('');
    const stops=[['0%','#9f6f35'],['26%','#f9d999'],['44%','#d69f4e'],['72%','#f6d392'],['100%','#e3ab5d']];
    return '<svg class="dcg-xp__ring-svg" viewBox="0 0 300 300" aria-hidden="true"><defs><linearGradient id="'+id+'" x1="0%" x2="100%" y1="0%" y2="100%">'+stops.map(([offset,color])=>'<stop offset="'+offset+'" stop-color="'+color+'"/>').join('')+'</linearGradient></defs>'+
      circle('shell',radius,18)+circle('grain',radius,14)+circle('groove',radius+11.5,1.2)+circle('light',radius-9,1.5)+circle('dark',radius-13.7,2)+
      path('haze',g.fog)+path('core',g.core,' stroke="url(#'+id+')"')+path('highlight',g.core)+segments(g.starts,'start')+segments(g.tails,'tail')+'</svg>';
  }
  // Only confirmed increases animate. Return a disposer for session changes and rerenders.
  function animate(host){
    if(typeof window.requestAnimationFrame!=='function'||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return()=>{};
    const stops=Array.from(host.querySelectorAll('.dcg-xp--advance')).map(el=>{
      const from=Number(el.dataset.xpFrom),to=Number(el.dataset.xpProgress);
      const core=el.querySelector('.dcg-xp__arc-core'),fog=el.querySelector('.dcg-xp__arc-haze'),shine=el.querySelector('.dcg-xp__arc-highlight');
      const starts=Array.from(el.querySelectorAll('[data-xp-start]')),startGlows=Array.from(el.querySelectorAll('[data-xp-start-glow]'));
      const tails=Array.from(el.querySelectorAll('[data-xp-tail]')),tailGlows=Array.from(el.querySelectorAll('[data-xp-tail-glow]'));
      const sparks=Array.from(el.querySelectorAll('[data-xp-angle]')).map(s=>({s,angle:Number(s.dataset.xpAngle)}));
      if(!core||!Number.isFinite(from)||!Number.isFinite(to)||from>=to)return()=>{};
      let frame,started=null,stopped=false;
      const gainTimer=window.setTimeout(()=>el.classList.remove('dcg-xp--advance'),1150);
      function apply(fraction){
        const g=geometry(fraction);core.setAttribute('d',g.core);fog.setAttribute('d',g.fog);shine.setAttribute('d',g.core);
        for(const [items,nodes,glows] of [[g.starts,starts,startGlows],[g.tails,tails,tailGlows]]){
          items.forEach((s,k)=>{nodes[k].setAttribute('d',s.d);glows[k].setAttribute('d',s.d);});
        }
        sparks.forEach(({s,angle})=>{s.hidden=!visibleSpark(angle,fraction);});
      }
      function step(time){
        if(stopped||!el.isConnected)return;
        if(started===null)started=time;
        const t=Math.min(1,(time-started)/600);apply(from+(to-from)*(1-Math.pow(1-t,3)));
        if(t<1)frame=window.requestAnimationFrame(step);
      }
      apply(from);frame=window.requestAnimationFrame(step);
      return()=>{stopped=true;window.cancelAnimationFrame(frame);window.clearTimeout(gainTimer);};
    });
    return()=>stops.forEach(stop=>stop());
  }
  function markup(state,{label='Niveau DCG',scope='streamer',interactive=false,busy=false,previousState=null,compact=false}={}){
    const p=progress(state.total,state.level),ready=p.pending>0;
    const advance=previousState!==null&&previousState.level===p.level&&previousState.total<p.total;
    const from=advance?progress(previousState.total,previousState.level).fraction:p.fraction;
    const text=ready?'Niveau '+p.next+' disponible':p.opened+' / '+p.required+' paquets';
    const reward=scope==='general'?10*p.next+' Alkahests':Math.ceil(p.next/2)+' paquet'+(Math.ceil(p.next/2)>1?'s':'');
    const tag=interactive&&ready?'button':'div';
    const accessible=label+' : niveau '+p.level+'. '+text+'. Prochaine récompense : '+reward+(ready&&interactive?'. Cliquer pour récupérer.':'');
    return '<'+tag+' class="dcg-xp'+(ready?' dcg-xp--ready':'')+(advance?' dcg-xp--advance':'')+(compact?' dcg-xp--compact':'')+'"'+(tag==='button'?' type="button" data-xp-claim="'+esc(scope)+'"'+(busy?' disabled':''):'')+
      ' data-xp-progress="'+p.fraction+'" data-xp-from="'+from+'"'+(compact?' title="'+esc(accessible)+'"':'')+' aria-label="'+esc(accessible)+'">'+
      '<span class="dcg-xp__medal" aria-hidden="true"><span class="dcg-xp__halo"></span><span class="dcg-xp__face"><span class="dcg-xp__nebula-stars">'+nebulaStars()+'</span></span>'+ring(p.fraction)+'<span class="dcg-xp__sparks">'+sparkles(p.fraction)+'</span><span class="dcg-xp__number">'+p.level+'</span></span>'+
      (compact?'':'<span class="dcg-xp__copy"><span class="dcg-xp__label">'+esc(label)+'</span><strong>'+esc(text)+'</strong><span class="dcg-xp__reward">'+esc(ready?(busy?'Récupération…':interactive?'Récupérer · '+reward:'Récompense · '+reward):'Niveau '+p.next+' · '+reward)+'</span></span>')+'</'+tag+'>';
  }
  window.DCGXP=Object.freeze({threshold,levelFor,progress,markup,animate});
})();
