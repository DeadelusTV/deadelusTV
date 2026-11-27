(() => {
 'use strict';
 const id=x=>typeof x==='string'&&/^[0-9a-f-]{36}$/i.test(x);
 const config=()=>window.DEADELUSTV_DCG_CONFIG;
 const fail=error=>({data:null,error:error instanceof Error?error:Error(String(error))});
 const space=row=>{if(!id(row.dcg_id)||!/^\d+$/.test(row.broadcaster_id)||typeof row.display_name!=='string')throw Error('Communauté invalide');return{...row,id:row.dcg_id,name:row.display_name,broadcasterId:row.broadcaster_id,avatar:/^https:\/\//.test(row.avatar_url||'')?row.avatar_url:'modules/dcg/assets/rules-avatar.svg',gameBase:config().gameBase,href:window.DCGSession.href(row.dcg_id),status:row.launched?'Ouvert':'En préparation'};};
 async function client(){
  const raw=await window.DEADELUSTV_AUTH.getClient();
  async function own(work){const first=await raw.auth.getUser(),s=await raw.auth.getSession(),actor=first.data?.user?.id,token=s.data?.session?.access_token;
   if(first.error||s.error||!id(actor)||!token||s.data.session.user.id!==actor)throw Error('Connexion requise');
   const result=await work(actor),last=await raw.auth.getSession();
   if(last.error||last.data?.session?.user?.id!==actor||last.data?.session?.access_token!==token)throw Error('Compte ou session modifiés');return result;}
  async function portal(action,payload={}){return own(async actor=>{const r=await raw.rpc('tcg_portal',{p_action:action,p_payload:payload});if(r.error)throw r.error;if(r.data?.actor_id!==actor)throw Error('Réponse étrangère');return r.data.data;});}
  async function memberships(){const r=await portal('memberships');if(!Array.isArray(r?.items))throw Error('Appartenances indisponibles');return r.items.map(space);}
  async function scoped(dcg,name,args={}){return own(async actor=>{if(!id(dcg))throw Error('DCG explicite requis');const r=await raw.rpc('tcg_dcg_rpc',{p_dcg_id:dcg,p_rpc:name,p_args:args});if(r.error)throw r.error;if(r.data?.actor_id!==actor||r.data?.dcg_id!==dcg)throw Error('Réponse étrangère');return{data:r.data.data,error:null};});}
  async function rpc(name,args={}){try{
   if(name==='tcg_portal_discovery'){const r=await raw.rpc('tcg_portal_directory');if(r.error||!Array.isArray(r.data))throw r.error||Error('Annuaire indisponible');return{data:r.data.map(row=>({...space(row),href:window.DCGSession.href(row.dcg_id,'rejoindre')})),error:null};}
   if(name==='tcg_my_portal_stats')return own(async actor=>{const r=await raw.rpc('tcg_portal_stats');if(r.error||r.data?.actor_id!==actor)throw r.error||Error('Statistiques invalides');return r;});
   if(['dcg_my_xp','dcg_claim_general_xp','tcg_daily_pass_status'].includes(name)){
    const all=await memberships();if(!all.length)throw Error('Rejoins un DCG pour accéder à cette progression');
    return{data:await portal(name==='dcg_my_xp'?'general_xp':name==='dcg_claim_general_xp'?'claim_general_xp':'pass_status',{dcg_id:all[0].id,...(name==='dcg_claim_general_xp'?{level:args.p_level}:{})}),error:null};
   }
   throw Error('Lecture centrale historique interdite');
  }catch(e){return fail(e);}}
  async function invoke(name,options={}){try{
   if(name!=='tcg-daily-pass')throw Error('Transport non autorisé');
   const all=await memberships();if(!all.length)throw Error('Aucune inscription éligible');
   const b=options.body||{},action=b.action||'visit';
   return await own(async actor=>{const r=await raw.functions.invoke('tcg-dcg-portal',{body:{action,dcg_id:all[0].id,payload:Object.fromEntries(Object.entries(b).filter(([k])=>k!=='action'))}});if(r.error)throw r.error;if(r.data?.actor_id!==actor)throw Error('Réponse étrangère');return{data:r.data.data,error:null};});
  }catch(e){return fail(e);}}
  async function common(action,payload={}){return own(async actor=>{const r=await raw.rpc('tcg_common',{p_action:action,p_payload:payload});if(r.error||r.data?.actor_id!==actor)throw r.error||Error('Réponse étrangère');return r.data;});}
  async function inventory(query){return own(async actor=>{const r=await raw.rpc('tcg_portal_inventory',query);if(r.error||r.data?.actor_id!==actor||!Array.isArray(r.data.items))throw r.error||Error('Inventaire étranger');return r.data;});}
  async function admin(action,payload={},request){return own(async actor=>{const r=await raw.rpc(action==='state'?'tcg_common_admin':'tcg_common_admin_save',action==='state'?{p_action:action,p_payload:payload}:{p_action:action,p_payload:payload,p_request_id:request});if(r.error||r.data?.actor_id!==actor)throw r.error||Error('Réponse centrale étrangère');return r.data;});}
  return Object.freeze({admin,inventory,common,auth:raw.auth,rpc,functions:{invoke},memberships,portal,scoped,raw});
 }
 window.DCGPortal=Object.freeze({client,space});
})();
