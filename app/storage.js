import {fresh,newGiftId} from './config.js';
import {backendScope,isSupabase} from './service.js';
import {bindScope} from './completion-state.js';
import {startupMark} from './startup-diagnostic.js';
let db;
async function open(){if(db)return db;db=await new Promise((resolve,reject)=>{const r=indexedDB.open(new URLSearchParams(location.search).has('qa')?'liwu-qa-v1':'liwu-local-v1',2);r.onblocked=()=>startupMark('draft-db-open:blocked');r.onupgradeneeded=()=>{startupMark('draft-db-open:upgrade');if(!r.result.objectStoreNames.contains('draft'))r.result.createObjectStore('draft');if(!r.result.objectStoreNames.contains('outbox'))r.result.createObjectStore('outbox',{keyPath:'giftId'});};r.onsuccess=()=>{startupMark('draft-db-open:done');r.result.onversionchange=()=>{r.result.close();db=null;};resolve(r.result);};r.onerror=()=>reject(r.error);});return db;}
export async function readDraft(){const d=await open();return new Promise((resolve,reject)=>{const tx=d.transaction('draft','readwrite'),store=tx.objectStore('draft'),r=store.get('current');let value;startupMark('draft-tx:start');r.onsuccess=()=>{startupMark('draft-tx:read');value=r.result||fresh();if(!value.giftId){value.giftId=newGiftId();value.hasEverCompleted=!!value.counted;value.completionSync=value.counted?'pending':'new';}if(isSupabase)bindScope(value,backendScope());store.put(value,'current');};tx.oncomplete=()=>{startupMark('draft-tx:done');resolve(value);};tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('DRAFT_TRANSACTION_ABORTED'));});}
export async function writeDraft(state){const d=await open();const snapshot=structuredClone(state);return new Promise((resolve,reject)=>{const tx=d.transaction('draft','readwrite');tx.objectStore('draft').put(snapshot,'current');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}

const scopedConnections=new Map();
function scopedName(){return 'liwu-sync:'+backendScope()+(new URLSearchParams(location.search).has('qa')?':qa':'');}
function openScoped(name,stores){
 if(scopedConnections.has(name))return scopedConnections.get(name);
 // Open the installed version: adding R2 must not upgrade a database held by
 // pre-R2 tabs. Those tabs cannot receive our new versionchange handler.
 const pending=new Promise((resolve,reject)=>{
  const label=stores.includes('media')?'media-db-open':'sync-db-open';startupMark(label+':start');
  const r=indexedDB.open(name);let failed=false;
  const deadline=setTimeout(()=>{failed=true;scopedConnections.delete(name);startupMark(label+':timeout');reject(Error('SYNC_DATABASE_TIMEOUT'));},4000);
  r.onupgradeneeded=()=>{startupMark(label+':upgrade');for(const store of stores)if(!r.result.objectStoreNames.contains(store))r.result.createObjectStore(store,{keyPath:'giftId'});};
  r.onsuccess=()=>{clearTimeout(deadline);startupMark(label+':done');if(failed){r.result.close();return;}r.result.onversionchange=()=>{r.result.close();scopedConnections.delete(name);};resolve(r.result);};
  r.onerror=()=>{clearTimeout(deadline);scopedConnections.delete(name);reject(r.error);};
  r.onblocked=()=>{clearTimeout(deadline);startupMark(label+':blocked');failed=true;scopedConnections.delete(name);reject(Error('STORAGE_BLOCKED'));};
 });scopedConnections.set(name,pending);return pending;
}
const openSync=()=>openScoped(scopedName(),['completions','archives','receipts']);
const openMedia=()=>openScoped(scopedName()+':media-v1',['media']);
async function syncWrite(store,value,key){const d=await openSync();return new Promise((resolve,reject)=>{const tx=d.transaction(store,'readwrite');if(value===null)tx.objectStore(store).delete(key);else tx.objectStore(store).put(structuredClone(value));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
async function syncRead(store,key){const d=await openSync();return new Promise((resolve,reject)=>{
 const label='sync-read-'+store;startupMark(label+':start');
 const tx=d.transaction(store,'readonly'),r=key===undefined?tx.objectStore(store).getAll():tx.objectStore(store).get(key);let value;
 const deadline=setTimeout(()=>{startupMark(label+':timeout');reject(Error('SYNC_READ_TIMEOUT'));try{tx.abort();}catch{}},4000);
 r.onsuccess=()=>{value=r.result;startupMark(label+':request-done');};
 tx.oncomplete=()=>{clearTimeout(deadline);startupMark(label+':done');resolve(value);};
 tx.onerror=()=>{clearTimeout(deadline);reject(tx.error);};
 tx.onabort=()=>{clearTimeout(deadline);startupMark(label+':aborted');reject(tx.error||Error('SYNC_READ_ABORTED'));};
});}
export async function enqueueCompletion(identity){if(isSupabase)return syncWrite('completions',identity);const giftId=typeof identity==='string'?identity:identity.giftId;const d=await open();return new Promise((resolve,reject)=>{const tx=d.transaction('outbox','readwrite');tx.objectStore('outbox').put({giftId});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
export async function pendingCompletions(){if(isSupabase)return syncRead('completions');const d=await open();return new Promise((resolve,reject)=>{const r=d.transaction('outbox').objectStore('outbox').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function acknowledgeCompletion(giftId){if(isSupabase)return syncWrite('completions',null,giftId);const d=await open();return new Promise((resolve,reject)=>{const tx=d.transaction('outbox','readwrite');tx.objectStore('outbox').delete(giftId);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
export const saveCompletionReceipt=receipt=>syncWrite('receipts',receipt);
export const readCompletionReceipt=giftId=>syncRead('receipts',giftId);
export const enqueueArchive=plan=>syncWrite('archives',plan);
export const pendingArchives=()=>syncRead('archives');
export const acknowledgeArchive=giftId=>syncWrite('archives',null,giftId);
async function mediaTransaction(mode,operation){const d=await openMedia();return new Promise((resolve,reject)=>{const tx=d.transaction('media',mode);let value;const r=operation(tx.objectStore('media'));r.onsuccess=()=>{value=r.result;};tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
export async function readMediaTask(giftId){
 const task=await mediaTransaction('readonly',store=>store.get(giftId));if(task)return task;
 // Preserve any retry tasks already saved by the earlier v2 implementation.
 const legacy=await openSync();return legacy.objectStoreNames.contains('media')?syncRead('media',giftId):undefined;
}
export const saveMediaTask=task=>mediaTransaction('readwrite',store=>store.put(structuredClone(task)));
export async function removeMediaTask(giftId){await mediaTransaction('readwrite',store=>store.delete(giftId));const legacy=await openSync();if(legacy.objectStoreNames.contains('media'))await syncWrite('media',null,giftId);}

// Keep consented archive plans independently of the active editing draft. Local only.
export async function writeArchivePlan(plan,giftId){const d=await open();return new Promise((resolve,reject)=>{const tx=d.transaction('draft','readwrite'),store=tx.objectStore('draft');if(plan)store.put(structuredClone(plan),'archive:'+giftId);else store.delete('archive:'+giftId);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
export async function readArchivePlan(giftId){const d=await open();return new Promise((resolve,reject)=>{const r=d.transaction('draft').objectStore('draft').get('archive:'+giftId);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);});}
