import {BACKEND} from './backend-config.js';
import {mediaCredentials,moderationRequest} from './service.js';
import {loadImage,PHOTO_WINDOW} from './renderer.js';
import {timeSend} from './send-timing.js';
import {encodeWebp} from './webp.js';
import {releaseCanvas} from './render-resources.js';
// Exact same placement as renderPhoto's photo window, without frame or hidden pixels.
export async function croppedModerationImage(g){
 if(!g.image)throw Error('MISSING_CROP');
 const im=await loadImage(g.image),w=838,h=944,crop=g.crop||{scale:1,x:0,y:0};
 const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');
 // PHOTO_WINDOW fixes the aspect used by all gift photo cards.
 const aspect=(PHOTO_WINDOW.w*1136)/(PHOTO_WINDOW.h*1385);
 if(Math.abs(aspect-w/h)>.00001)throw Error('CROP_GEOMETRY_MISMATCH');
 const scale=Math.max(w/im.width,h/im.height)*crop.scale,iw=im.width*scale,ih=im.height*scale;
 ctx.drawImage(im,(w-iw)/2+(crop.x||0)*w,(h-ih)/2+(crop.y||0)*h,iw,ih);
 let blob;try{blob=await encodeWebp(c,.95);}finally{releaseCanvas(c);}
 if(!blob||blob.type!=='image/webp'||blob.size>1500000)throw Error('INVALID_CROP');return blob;
}
export async function moderateSubmission(task,submissionId,timing){
 if(BACKEND.moderationEnabled!==true)return;
 const owner={...mediaCredentials(task),submissionId};
 try{
  const health=await timeSend(timing,'moderation_health',()=>moderationRequest('health',{}));if(health.policyVersion!=='cropped-v2')return;
  const start=await timeSend(timing,'moderation_start_ack',()=>moderationRequest('start',{...owner,fingerprint:task.web.fingerprint}));if(start.skip||start.disabled)return;
  await timeSend(timing,'crop_generate_and_receive_parallel_total',()=>Promise.allSettled([0,1,2].map(async i=>{
   try{
    // Ephemeral only: never attach these Blobs to the persisted upload task.
    const image=await timeSend(timing,'generate_crop_'+(i+1),()=>croppedModerationImage(task.snapshot.gifts[i])),form=new FormData();
    form.set('metadata',JSON.stringify({...owner,kind:'image_'+(i+1)}));form.set('image',image,'crop.webp');
    await timeSend(timing,'upload_receive_crop_'+(i+1),()=>moderationRequest('image',form));
   }catch{/* A missing/failed input cannot pass the server's six-input check. */}
  })));
  await timeSend(timing,'moderation_finish_ack',()=>moderationRequest('finish',owner));
 }catch{/* The existing Pending/manual path is retained on any failure. */}
}
