import {renderBox,renderUnfolded} from './renderer.js';
import {timeSend} from './send-timing.js';
import {encodeWebp} from './webp.js';
import {releaseCanvas} from './render-resources.js';
const LIMITS={box:{target:250000,max:300000,floor:.65},letter:{target:3000000,max:4000000,floor:.92}};
function resize(source,width,height){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(width));c.height=Math.max(1,Math.round(height));const ctx=c.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(source,0,0,c.width,c.height);return c;}
const encode=encodeWebp;
async function webImage(original,kind){
 const limit=LIMITS[kind];let c=original;
 try{
 if(kind==='box'){const scale=Math.min(1,1000/c.width,1200/c.height);c=resize(c,c.width*scale,c.height*scale);}
 for(let attempt=0;attempt<12;attempt++){
  const best=await encode(c,kind==='letter'?1:.9);
  if(best.size<=(kind==='letter'?limit.max:limit.target))return {blob:best,width:c.width,height:c.height};
  let low=limit.floor,high=kind==='letter'?1:.9,chosen;
  for(let step=0;step<6;step++){const quality=(low+high)/2,blob=await encode(c,quality);if(blob.size<=limit.target){chosen=blob;low=quality;}else high=quality;}
  if(chosen)return {blob:chosen,width:c.width,height:c.height};
  const floor=await encode(c,limit.floor);
  if(floor.size<=limit.max)return {blob:floor,width:c.width,height:c.height};
  if(kind==='letter'&&c.width*.9<800)throw Error('LETTER_WEB_QUALITY_LIMIT');
  const smaller=resize(original,c.width*.9,c.height*.9);if(c!==original)releaseCanvas(c);c=smaller;
 }throw Error('WEB_IMAGE_TOO_LARGE');
 }finally{if(c!==original)releaseCanvas(c);}
}
async function generate(s,kind){const original=await (kind==='box'?renderBox(s):renderUnfolded(s));try{return await webImage(original,kind);}finally{releaseCanvas(original);}}
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().filter(k=>value[k]!==undefined).map(k=>[k,canonical(value[k])]));return value;}
export async function renderFingerprint(s){
 const fields=['giftId','giftNumber','completedAt','locale','gifts','packed','innerPresetId','letter','wrapping','rosette','rosetteButtons','rosetteAssetsVersion'];
 const value={renderer:'liwu-r2-web-v1'};for(const k of fields)value[k]=s[k];
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(canonical(value))));
 return [...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
export async function generateGalleryWeb(s,timing){
 const box=await timeSend(timing,'generate_box_webp',()=>generate(s,'box')),letter=await timeSend(timing,'generate_letter_webp',()=>generate(s,'letter'));
 return {box,letter,fingerprint:await timeSend(timing,'render_fingerprint',()=>renderFingerprint(s)),specs:{box:{bytes:box.blob.size,width:box.width,height:box.height},letter:{bytes:letter.blob.size,width:letter.width,height:letter.height}}};
}
