'use strict';
/* Pagination locale des calques de listes.
 * Testable sans DOM, basée sur les dimensions du calque à l'échelle native
 * 1536 x 1024. Les textes restent des données, sans HTML interprété.
 */
(() => {
 function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
 function wrappedLines(text,availableWidth,fontSize,measure){
  const width=Math.max(4,availableWidth),size=Math.max(8,fontSize);
  const len=s=>measure?measure(s):String(s).length*size*.58;
  const chunks=String(text).split(/\s+/u).filter(Boolean);
  if(!chunks.length)return 1;
  let lines=1,used=0;
  for(const word of chunks){
   const wordWidth=len(word);
   if(wordWidth>width){
    if(used>0){lines++;used=0;}
    const parts=Math.max(1,Math.ceil(wordWidth/width));
    lines+=parts-1;
    used=wordWidth-(parts-1)*width;
   }else if(used===0)used=wordWidth;
   else if(used+len(' ')+wordWidth<=width)used+=len(' ')+wordWidth;
   else{lines++;used=wordWidth;}
  }
  return lines;
 }
 function measuredHeight(slice,columns,widthPx,fontSize,lineHeight,measure){
  if(!slice.length)return 0;
  const rows=Math.ceil(slice.length/columns);
  const usableWidth=Math.max(15,(widthPx-(columns-1)*12)/columns-6);
  const rowHeights=new Array(rows).fill(0);
  slice.forEach((entry,i)=>{
   const lines=wrappedLines(entry.title,usableWidth,fontSize,measure);
   const row=i%rows;
   rowHeights[row]=Math.max(rowHeights[row],lines*fontSize*lineHeight+4);
  });
  return rowHeights.reduce((a,b)=>a+b,0);
 }
 function paginate(entries,options={}){
  const rows=Array.isArray(entries)?entries:[];
  if(!rows.length)return [[]];
  const cols=clamp(Math.round(Number(options.columns)||1),1,6);
  const width=clamp(Number(options.width)||300,30,1536);
  const height=clamp(Number(options.height)||200,24,1024);
  const size=clamp(Number(options.size)||24,8,120);
  const line=clamp(Number(options.line)||1.16,.75,2.6);
  const measure=typeof options.measure==='function'?options.measure:null;
  const minimum= Math.max(size*line+4,1);
  const footer=Math.min(height*.4,Math.max(29,size*line+7));
  const budget=Math.max(minimum,height-footer);
  const pages=[];
  let offset=0;
  while(offset<rows.length){
   // Les colonnes sont remplies verticalement, comme le calque original.
   // Un contrôle strict de hauteur empêche la liste de s'étirer hors de sa zone.
   let count=1;
   const limit=Math.min(rows.length-offset,240);
   for(let test=2;test<=limit;test++){
    if(measuredHeight(rows.slice(offset,offset+test),cols,width,size,line,measure)>budget)break;
    count=test;
   }
   pages.push(rows.slice(offset,offset+count));
   offset+=count;
  }
  return pages;
 }
 window.PHASMO_JOURNAL_PAGINATION=Object.freeze({paginate,wrappedLines,measuredHeight});
})();