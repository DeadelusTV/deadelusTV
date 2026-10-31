const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('public/modules/phasmophobia/journal-editor-simplified.js','utf8');
async function scenario(state){
 const nodes=new Map();let confirmations=0;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',value:'current',disabled:false,listeners:{},addEventListener(name,work){this.listeners[name]=work;},replaceChildren(){}});return nodes.get(id);};
 const client={auth:{getUser:async()=>({data:{user:{id:'test-admin'}}}),getSession:async()=>({data:{session:{access_token:'test-session'}}})},functions:{invoke:async()=>({data:{ok:true,official:null,...state},error:null})}};
 const context={window:{DEADELUSTV_AUTH:{getClient:async()=>client},PHASMO_JOURNAL_REMOTE_SYNC:{listVersions:async()=>[]},addEventListener(){}},document:{getElementById:node,querySelector:()=>null},URLSearchParams,location:{search:''},MutationObserver:class{observe(){}},Option:class{constructor(label,value){this.value=value;}},confirm:()=>{confirmations++;return false;}};
 vm.runInNewContext(source,context);await new Promise(resolve=>setImmediate(resolve));
 return {nodes,node,click:async()=>{node('journal-simple-publish').listeners.click();await new Promise(resolve=>setImmediate(resolve));return confirmations;}};
}
(async()=>{
 const fresh=await scenario({locked:false,reserved:false,candidate:null});assert.equal(fresh.node('journal-simple-publish').disabled,false);assert.equal(await fresh.click(),1);
 const locked=await scenario({locked:true,reserved:false,candidate:null});assert.equal(locked.node('journal-simple-publish').disabled,true);assert.equal(await locked.click(),0);
 const reserved=await scenario({locked:false,reserved:true,candidate:null});assert.equal(reserved.node('journal-simple-publish').disabled,true);assert.equal(await reserved.click(),0);
 console.log('3 scénarios validés : premier carnet sans candidat, verrou serveur et réservation concurrente.');
})().catch(error=>{console.error(error);process.exitCode=1;});
