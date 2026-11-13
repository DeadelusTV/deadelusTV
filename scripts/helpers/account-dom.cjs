'use strict';
// Minimal account DOM shared by Auth integration tests.
function accountElement({hidden=false}={}) {
 const classes=new Set(),attributes={},listeners={};
 return {
  hidden,innerHTML:'',textContent:'',childNodes:[],
  classList:{add(value){classes.add(value);},remove(value){classes.delete(value);},contains(value){return classes.has(value);}},
  setAttribute(key,value){attributes[key]=String(value);},
  getAttribute(key){return attributes[key]??null;},
  addEventListener(type,fn){listeners[type]=fn;},removeEventListener(type){delete listeners[type];},
  dispatchEvent(event){listeners[event.type]?.(event);},
  getContext(){return null;},
  contains(){return false;},querySelector(){return null;},
  replaceChildren(...children){this.childNodes=children;this.innerHTML='';},
  append(child){this.childNodes.push(child);},
  cloneNode(){const copy=accountElement({hidden:this.hidden});copy.textContent=this.textContent;return copy;}
 };
}
module.exports={accountElement};
