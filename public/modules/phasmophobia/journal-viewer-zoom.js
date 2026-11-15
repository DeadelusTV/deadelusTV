'use strict';
/* Zoom de lecture du carnet : indépendant de la mise en page de l'atelier.
 * 100 % = le carnet entier ajusté à l'espace disponible. Aucune sauvegarde.
 */
(() => {
  if (new URLSearchParams(location.search).get('viewer') !== '1') return;
  const W=1536,H=1024,MIN=1;
  // À 300 % le carnet reste presque entièrement visible en hauteur sur téléphone :
  // il n'y a donc pratiquement aucune marge pour le faire glisser.
  const MOBILE=window.matchMedia('(pointer: coarse)').matches||window.matchMedia('(max-width: 700px)').matches;
  const MAX=MOBILE?6:3;
  const EDGE=65,EDGE_WAIT=280,EDGE_SPEED=11;
  const viewport=document.getElementById('stage-viewport');
  const wrap=document.getElementById('stage-wrap');
  const book=document.getElementById('book');
  if(!viewport||!wrap||!book)return;
  const pointers=new Map();
  let zoom=1,panX=0,panY=0,gesture=null,suppressClick=false;
  let ready=false;
  let edgePointer=null,edgeZone='',edgeSince=0,edgeLastTime=0,edgeRequest=0;

  function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
  function fit(){
    const w=viewport.clientWidth,h=viewport.clientHeight;
    if(w<=0||h<=0)return;
    const base=Math.min(1,Math.max(.01,Math.min((w-4)/W,(h-4)/H)));
    const scale=base*zoom;
    // Si une dimension est plus petite que la fenêtre, utiliser les marges
    // libres pour conserver le point pincé sous les doigts.
    const boundX=zoom===MIN?0:Math.abs(W*scale-w)/2;
    const boundY=zoom===MIN?0:Math.abs(H*scale-h)/2;
    panX=clamp(panX,-boundX,boundX);
    panY=clamp(panY,-boundY,boundY);
    wrap.style.width=(W*scale)+'px';
    wrap.style.height=(H*scale)+'px';
    wrap.style.transform='translate(calc(-50% + '+panX+'px), calc(-50% + '+panY+'px))';
    book.style.transform='scale('+scale+')';
  }
  function sync(){
    if(window.parent===window)return;
    try{window.parent.postMessage({type:'deadelustv:journal-zoom-state',scale:zoom},location.origin);}catch{}
  }
  function setZoom(value,send=false,from=null,to=null,reference=null){
    const n=Number(value);
    if(!Number.isFinite(n))return;
    const next=clamp(n,MIN,MAX);
    const w=viewport.clientWidth,h=viewport.clientHeight;
    const origin=from||{x:w/2,y:h/2};
    const target=to||origin;
    const previous=reference?.zoom??zoom;
    const previousX=reference?.panX??panX;
    const previousY=reference?.panY??panY;
    if(previous>0){
      const ratio=next/previous;
      panX=target.x-w/2-(origin.x-w/2-previousX)*ratio;
      panY=target.y-h/2-(origin.y-h/2-previousY)*ratio;
    }
    zoom=next;
    if(zoom===MIN){panX=0;panY=0;stopEdge();}
    viewport.classList.toggle('can-pan',zoom>MIN);
    fit();
    if(send)sync();
  }
  function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
  function midpoint(a,b){
    const rect=viewport.getBoundingClientRect();
    return {x:(a.x+b.x)/2-rect.left,y:(a.y+b.y)/2-rect.top};
  }
  // Le bord déplace progressivement le carnet en lecture, sans clic maintenu.
  function edgeSpeed(position,size){
    const margin=Math.min(EDGE,size/3);
    if(position<margin)return -EDGE_SPEED*(1-position/margin);
    if(position>size-margin)return EDGE_SPEED*(1-(size-position)/margin);
    return 0;
  }
  function stopEdge(){
    if(edgeRequest)cancelAnimationFrame(edgeRequest);
    edgeRequest=0;edgePointer=null;edgeZone='';edgeSince=0;edgeLastTime=0;
  }
  function moveAtEdge(time){
    edgeRequest=0;
    if(!edgePointer||zoom<=MIN||pointers.size)return;
    if(!edgeSince)edgeSince=time;
    const delta=Math.min(40,Math.max(0,time-(edgeLastTime||time)));
    edgeLastTime=time;
    if(time-edgeSince>=EDGE_WAIT){
      const xSpeed=wrap.offsetWidth>viewport.clientWidth+1?edgeSpeed(edgePointer.x,viewport.clientWidth):0;
      const ySpeed=wrap.offsetHeight>viewport.clientHeight+1?edgeSpeed(edgePointer.y,viewport.clientHeight):0;
      if(!xSpeed&&!ySpeed)return;
      const oldX=panX,oldY=panY;
      panX-=xSpeed*delta/16.67;
      panY-=ySpeed*delta/16.67;
      fit();
      if(oldX===panX&&oldY===panY)return;
    }
    edgeRequest=requestAnimationFrame(moveAtEdge);
  }
  function hoverEdge(e){
    if(e.pointerType!=='mouse'||e.buttons||zoom<=MIN||pointers.size){stopEdge();return;}
    const rect=viewport.getBoundingClientRect();
    const x=e.clientX-rect.left,y=e.clientY-rect.top;
    if(x<0||x>rect.width||y<0||y>rect.height){stopEdge();return;}
    const vx=wrap.offsetWidth>viewport.clientWidth+1?edgeSpeed(x,rect.width):0;
    const vy=wrap.offsetHeight>viewport.clientHeight+1?edgeSpeed(y,rect.height):0;
    if(!vx&&!vy){stopEdge();return;}
    const zone=(vx<0?'L':vx>0?'R':'-')+(vy<0?'T':vy>0?'B':'-');
    if(zone!==edgeZone)edgeSince=0;
    edgeZone=zone;edgePointer={x,y};
    if(!edgeRequest)edgeRequest=requestAnimationFrame(moveAtEdge);
  }
  function onDown(e){
    stopEdge();
    if(e.pointerType==='mouse'&&(e.button!==0||zoom===MIN))return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    // Sur écran tactile, capturer le pointeur sur son élément d'origine :
    // un simple tap doit continuer à ouvrir les entrées du sommaire.
    if(e.pointerType==='touch'){
      try{e.target?.setPointerCapture?.(e.pointerId);}catch{}
    }
    if(pointers.size===1){
      gesture={type:'pan',id:e.pointerId,x:e.clientX,y:e.clientY,panX,panY,moved:false};
    }else if(pointers.size===2){
      const [a,b]=[...pointers.values()];
      // Mémoriser le point réellement pincé, pas le centre du carnet.
      gesture={type:'pinch',distance:Math.max(1,distance(a,b)),zoom,
        panX,panY,anchor:midpoint(a,b),moved:true};
      viewport.classList.remove('is-dragging');
      suppressClick=true;
      for(const id of pointers.keys()){try{viewport.setPointerCapture(id);}catch{}}
    }
  }
  function onMove(e){
    if(!pointers.has(e.pointerId)){hoverEdge(e);return;}
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(!gesture)return;
    if(gesture.type==='pinch'&&pointers.size>=2){
      const [a,b]=[...pointers.values()];
      // Le point du carnet entre les doigts reste à cet emplacement.
      // Déplacer les deux doigts ensemble translate aussi le carnet.
      setZoom(gesture.zoom*distance(a,b)/gesture.distance,
        true,gesture.anchor,midpoint(a,b),gesture);
      suppressClick=true;e.preventDefault();
    }else if(gesture.type==='pan'&&gesture.id===e.pointerId&&zoom>MIN){
      const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
      if(!gesture.moved&&Math.hypot(dx,dy)>6){
        gesture.moved=true;
        viewport.classList.add('is-dragging');
        try{viewport.setPointerCapture(e.pointerId);}catch{}
      }
      if(gesture.moved){
        panX=gesture.panX+dx;panY=gesture.panY+dy;
        fit();suppressClick=true;e.preventDefault();
      }
    }
  }
  function onEnd(e){
    if(!pointers.has(e.pointerId))return;
    const moved=gesture?.moved===true;
    pointers.delete(e.pointerId);
    if(pointers.size===1){
      const [id,p]=[...pointers.entries()][0];
      gesture={type:'pan',id,x:p.x,y:p.y,panX,panY,moved:false};
      viewport.classList.remove('is-dragging');
    }else if(pointers.size===0){gesture=null;viewport.classList.remove('is-dragging');}
    if(moved){
      suppressClick=true;
      // En l'absence d'un clic synthétique, éviter d'avaler le prochain clic.
      setTimeout(()=>{suppressClick=false;},250);
    }
  }
  function init(){
    if(ready)return;ready=true;
    viewport.addEventListener('pointerdown',onDown,true);
    viewport.addEventListener('pointermove',onMove,true);
    viewport.addEventListener('pointerup',onEnd,true);
    viewport.addEventListener('pointercancel',onEnd,true);
    viewport.addEventListener('lostpointercapture',onEnd);
    viewport.addEventListener('pointerleave',stopEdge);
    window.addEventListener('blur',stopEdge);
    viewport.addEventListener('click',e=>{
      if(!suppressClick)return;
      suppressClick=false;e.preventDefault();e.stopImmediatePropagation();
    },true);
    viewport.addEventListener('wheel',e=>{
      if(zoom===MIN)return;
      const factor=e.deltaMode===1?16:e.deltaMode===2?viewport.clientHeight:1;
      panX-=e.deltaX*factor;panY-=e.deltaY*factor;
      fit();e.preventDefault();
    },{passive:false});
    fit();
  }
  window.PHASMO_JOURNAL_VIEWER_ZOOM=Object.freeze({init,fit,setZoom});
})();
