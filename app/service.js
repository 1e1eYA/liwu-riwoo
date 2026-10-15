import {BACKEND} from './backend-config.js';
export const isSupabase = BACKEND.mode === 'supabase';
export const mediaEnabled = isSupabase && BACKEND.mediaEnabled===true;
let runtime=BACKEND.batchId?{environment:BACKEND.environment,batchId:BACKEND.batchId}:undefined, initialization;
const deployment = `${BACKEND.mode}:${BACKEND.environment}:${BACKEND.supabaseUrl}`;
const runtimeKey = 'liwu-runtime:' + deployment;
export const backendScope = () => isSupabase ? deployment + ':' + (runtime?.batchId || 'unavailable') : 'mock:test';
export function backendRuntime(){return runtime;}
function acceptRuntime(result){
  if(result.environment!==BACKEND.environment||!result.batchId)throw Error('ENVIRONMENT_MISMATCH');
  if(runtime&&runtime.batchId!==result.batchId)throw Error('STALE_BATCH');
  runtime={environment:result.environment,batchId:result.batchId};
  try{localStorage.setItem(runtimeKey,JSON.stringify(runtime));}catch{}
  return result;
}
async function edge(action,body,functionName='liwu-public'){
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(BACKEND.supabaseUrl)||
    !BACKEND.publishableKey||BACKEND.publishableKey.startsWith('sb_secret_')||
    !['test','production'].includes(BACKEND.environment))throw Error('BACKEND_NOT_CONFIGURED');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{
    const response=await fetch(BACKEND.supabaseUrl.replace(/\/$/,'')+'/functions/v1/'+functionName+'?action='+action,{
      method:body?'POST':'GET',headers:{apikey:BACKEND.publishableKey,...(body?{'Content-Type':'application/json'}:{})},
      body:body?JSON.stringify(body):undefined,signal:controller.signal,cache:'no-store',
    });
    const result=await response.json();
    if(!response.ok)throw Error(result.error||'REQUEST_FAILED');
    return acceptRuntime(result);
  }finally{clearTimeout(timer);}
}
export async function initializeBackend(){
  if(!isSupabase)return;
  if(initialization)return initialization;
  initialization=(async()=>{
    try{const saved=JSON.parse(localStorage.getItem(runtimeKey));if(saved?.environment===BACKEND.environment&&saved.batchId)runtime=saved;}catch{}
    const cached=runtime;runtime=undefined;
    try{await edge('counts');}catch{runtime=cached;}
  })();
  return initialization;
}
function credentials(identity){
  if(!runtime)throw Error('BACKEND_NOT_CONFIGURED');
  if(identity.scope!==backendScope())throw Error('STALE_SCOPE');
  return {giftId:identity.giftId,giftSecret:identity.giftSecret,batchId:runtime.batchId};
}
// Mock transport is retained and never used as a fallback for Supabase failures.
export async function request(path,body){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),body&&path==='/api/gallery'?120000:12000);try{const r=await fetch(path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:controller.signal,cache:'no-store'});const result=await r.json();if(!r.ok)throw Error(result.error||'Request failed');return result;}finally{clearTimeout(timer);}}
export const fetchCounts=()=>isSupabase?edge('counts'):request('/api/counts');
export const completeGift=identity=>isSupabase?edge('complete',credentials(identity)):request('/api/completions',{giftId:typeof identity==='string'?identity:identity.giftId});
export const fetchGallery=()=>isSupabase?edge('gallery'):request('/api/gallery');
export const submitGallery=payload=>isSupabase?edge('submit',{...credentials(payload),metadata:wireMetadata(payload.metadata),...(payload.renderFingerprint?{renderFingerprint:payload.renderFingerprint}:{})}):request('/api/gallery',payload);
export const mediaRequest=(action,payload)=>edge(action,payload,'liwu-media');
export async function moderationRequest(action,payload){
 const form=payload instanceof FormData;
 const response=await fetch(BACKEND.supabaseUrl.replace(/\/$/,'')+'/functions/v1/liwu-moderation?action='+action,{
  method:'POST',headers:{apikey:BACKEND.publishableKey,...(form?{}:{'Content-Type':'application/json'})},
  body:form?payload:JSON.stringify(payload),signal:AbortSignal.timeout(65000),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
 const result=await response.json();if(!response.ok)throw Error(result.error||'MODERATION_UNAVAILABLE');return acceptRuntime(result);
}
export const mediaCredentials=credentials;
export const fetchMediaUrls=submissionId=>mediaRequest('public-read',{batchId:runtime?.batchId,submissionId});
export const submitAnonymousArchive=plan=>edge('archive',{...credentials(plan),consent:true,metadata:wireMetadata(plan.payload)});
export const fetchSubmission=identity=>edge('submission-status',credentials(identity));
function wireMetadata(p){return {giftNumber:p.giftNumber,giftBoxName:p.giftBoxName,from:p.from,giftNames:p.giftNames,letterText:p.letterText,language:p.language,completedAt:p.completedAt};}
