'use strict';
/* Zoom de lecture du carnet : indépendant de la mise en page de l'atelier.
 * 100 % = le carnet entier ajusté à l'espace disponible. Aucune sauvegarde.
 */
(() => {
  if (new URLSearchParams(location.search).get('viewer') !== '1') return;
  const W=1536,H=1024,MIN=1,MAX=3;
  const viewport=document.getElementById('stage-viewport');
  const wrap=document.getElementById('stage-wrap');
  const book=document.getElementById('book');
  if(!viewport||!wrap||!book)return;
  const pointers=new Map();
  let zoom=1,panX=0,panY=0,gesture=null,suppressClick=false;
  let ready=false;

  function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
  function fit(){
    const w=viewport.clientWidth,h=viewport.clientHeight;
    if(w<=0||h<=0)return;
    const base=Math.min(1,Math.max(.01,Math.min((w-4)/W,(h-4)/H)));
    const scale=base*zoom;
    const boundX=Math.max(0,(W*scale-w)/2);
    const boundY=Math.max(0,(H*scale-h)/2);
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
  function setZoom(value,send=false){
    const n=Number(value);
    if(!Number.isFinite(n))return;
    zoom=clamp(n,MIN,MAX);
    if(zoom===MIN){panX=0;panY=0;}
    fit();
    if(send)sync();
  }
  function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
  function onDown(e){
    if(e.pointerType==='mouse'&&(e.button!==0||zoom===MIN))return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===1){
      gesture={type:'pan',id:e.pointerId,x:e.clientX,y:e.clientY,panX,panY,moved:false};
    }else if(pointers.size===2){
      const [a,b]=[...pointers.values()];
      gesture={type:'pinch',distance:Math.max(1,distance(a,b)),zoom,moved:true};
      suppressClick=true;
      for(const id of pointers.keys()){try{viewport.setPointerCapture(id);}catch{}}
    }
  }
  function onMove(e){
    if(!pointers.has(e.pointerId))return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(!gesture)return;
    if(gesture.type==='pinch'&&pointers.size>=2){
      const [a,b]=[...pointers.values()];
      setZoom(gesture.zoom*distance(a,b)/gesture.distance,true);
      suppressClick=true;e.preventDefault();
    }else if(gesture.type==='pan'&&gesture.id===e.pointerId&&zoom>MIN){
      const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
      if(!gesture.moved&&Math.hypot(dx,dy)>6){
        gesture.moved=true;
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
    }else if(pointers.size===0)gesture=null;
    if(moved){
      suppressClick=true;
      // En l'absence d'un clic synthétique, éviter d'avaler le prochain clic.
      setTimeout(()=>{suppressClick=false;},250);
    }
  }
  function init(){
    if(ready)return;ready=true;
    viewport.addEventListener('pointerdown',onDown);
    viewport.addEventListener('pointermove',onMove);
    viewport.addEventListener('pointerup',onEnd);
    viewport.addEventListener('pointercancel',onEnd);
    viewport.addEventListener('lostpointercapture',onEnd);
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