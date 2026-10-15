import {newGiftId} from './config.js';
// Only server-derived state is reset when changing backend/project/batch.
// Creative content and the stable current gift identity stay on this device.
export function bindScope(state,scope){
  if(state.backendScope===scope)return false;
  state.backendScope=scope;
  state.giftSecret=newGiftId();
  state.hasEverCompleted=false;state.counted=false;state.completionSync='new';
  delete state.giftNumber;delete state.gallerySubmission;delete state.galleryArchiveRecord;
  delete state.gallerySubmittedAt;delete state.archiveSource;
  state.anonymousArchive=false;state.archiveChoice=false;
  return true;
}
export function completionIdentity(state,scope){
  if(!state.giftSecret)state.giftSecret=newGiftId();
  return {giftId:state.giftId,giftSecret:state.giftSecret,scope};
}
export function hasGiftNumber(state){return Number.isSafeInteger(state.giftNumber)&&state.giftNumber>0;}
// Only completion numbers reach export renderers. Review status is never a label.
export function giftNumberLabel(state){return hasGiftNumber(state)?'No. '+state.giftNumber:'Not synced';}
export function restoreGiftNumber(state,record,scope=state.backendScope){
 if(hasGiftNumber(state)||!record||!Number.isSafeInteger(record.number)||record.number<1)return false;
 if(record.giftId&&record.giftId!==state.giftId)return false;
 if(record.scope&&record.scope!==scope)return false;
 state.giftNumber=record.number;state.completionSync='synced';state.hasEverCompleted=true;
 if(record.completedAt)state.completedAt=record.completedAt;
 return true;
}
