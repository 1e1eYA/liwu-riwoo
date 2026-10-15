import {backendScope,mediaCredentials,mediaRequest,submitGallery,fetchSubmission} from './service.js';
import {readMediaTask,saveMediaTask,removeMediaTask} from './storage.js';
import {moderateSubmission} from './moderation-client.js';
import {timeSend} from './send-timing.js';
function metadataOnly(p){return {giftBoxName:p.giftBoxName,from:p.from,giftNames:p.giftNames,letterText:p.letterText,language:p.language};}
export async function uploadGallery(task,onProgress=()=>{},timing){
 if(task.scope!==backendScope())throw Error('STALE_SCOPE');
 await timeSend(timing,'retry_store_before_submit',()=>saveMediaTask(task));
 let result=await timeSend(timing,'submission_register',()=>submitGallery({...task,renderFingerprint:task.web.fingerprint}));
 task={...task,submissionId:result.submissionId};await timeSend(timing,'retry_store_after_submit',()=>saveMediaTask(task));
 if(!result.mediaReady){
  onProgress('prepare');
  const identity={...mediaCredentials(task),submissionId:result.submissionId};
  const prepared=await timeSend(timing,'r2_prepare',()=>mediaRequest('prepare',{...identity,fingerprint:task.web.fingerprint,specs:task.web.specs,metadata:metadataOnly(task.metadata),legacyConfirmed:task.legacyConfirmed===true}));
  if(!prepared.ready){
   for(const kind of ['box','letter']){
    if(prepared.uploaded?.[kind])continue;
    onProgress(kind);const url=new URL(prepared.putUrls[kind]);
    if(url.protocol!=='https:'||!url.hostname.endsWith('.r2.cloudflarestorage.com'))throw Error('INVALID_UPLOAD_URL');
    const response=await timeSend(timing,kind==='box'?'upload_box':'upload_letter',()=>fetch(url,{method:'PUT',headers:{'Content-Type':'image/webp'},body:task.web[kind].blob,credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(60000)}));
    if(!response.ok)throw Error('R2_UPLOAD_FAILED');
   }
   onProgress('verify');await timeSend(timing,'r2_complete_ready',()=>mediaRequest('finish',{...identity,version:prepared.version}));
  }
  result=await timeSend(timing,'submission_read_ready',()=>fetchSubmission(task));
 }
 if(!result.mediaReady)throw Error('MEDIA_NOT_READY');
 await timeSend(timing,'moderation_handoff_total',()=>moderateSubmission(task,result.submissionId,timing));
 // A failed status read must not undo a successfully uploaded local work.
 try{result=await timeSend(timing,'submission_read_after_handoff',()=>fetchSubmission(task));}catch{}
 await timeSend(timing,'retry_store_remove',()=>removeMediaTask(task.giftId));
 return {...result,metadata:task.metadata};
}
export {readMediaTask};
