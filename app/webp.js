import {releaseCanvas} from './render-resources.js';
let nativeSupport,worker,nextId=0,idle;const pending=new Map();
function stop(){worker?.terminate();worker=undefined;for(const task of pending.values()){clearTimeout(task.timer);task.reject(Error('WEBP_ENCODER_UNAVAILABLE'));}pending.clear();}
function encoder(){
 if(worker)return worker;
 worker=new Worker(new URL('./webp-worker.js',import.meta.url),{type:'module'});
 worker.onerror=()=>stop();
 worker.onmessage=({data})=>{const task=pending.get(data.id);if(!task)return;pending.delete(data.id);clearTimeout(task.timer);data.buffer?task.resolve(new Blob([data.buffer],{type:'image/webp'})):task.reject(Error('WEBP_ENCODER_UNAVAILABLE'));if(!pending.size)idle=setTimeout(stop,5000);};
 return worker;
}
async function supportsNative(){
 if(!nativeSupport)nativeSupport=new Promise(resolve=>{
  const c=document.createElement('canvas');c.width=c.height=1;let done=false;
  const finish=value=>{if(done)return;done=true;clearTimeout(timer);releaseCanvas(c);resolve(value);};
  const timer=setTimeout(()=>finish(false),1500);
  try{c.toBlob(blob=>finish(blob?.type==='image/webp'),'image/webp',.8);}catch{finish(false);}
 });
 return nativeSupport;
}
export async function encodeWebp(canvas,quality=.9){
 if(await supportsNative()){
  const blob=await new Promise(resolve=>{try{canvas.toBlob(resolve,'image/webp',quality);}catch{resolve(null);}});
  if(blob?.type==='image/webp')return blob;
 }
 const image=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);
 return new Promise((resolve,reject)=>{
  clearTimeout(idle);const id=++nextId;
  try{const w=encoder(),timer=setTimeout(stop,60000);pending.set(id,{resolve,reject,timer});w.postMessage({id,width:image.width,height:image.height,quality,pixels:image.data.buffer},[image.data.buffer]);}catch{pending.delete(id);reject(Error('WEBP_ENCODER_UNAVAILABLE'));}
 });
}
