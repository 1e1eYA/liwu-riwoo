import {exportImage,toBlob} from './renderer.js';
import {releaseCanvas} from './render-resources.js';
export async function renderExportAsset(snapshot,index){
 let original,thumbnail;
 try{
  original=await exportImage(snapshot,index);
  const blob=await toBlob(original),scale=Math.min(1,600/Math.max(original.width,original.height));
  thumbnail=document.createElement('canvas');thumbnail.width=Math.max(1,Math.round(original.width*scale));thumbnail.height=Math.max(1,Math.round(original.height*scale));
  thumbnail.getContext('2d').drawImage(original,0,0,thumbnail.width,thumbnail.height);
  return {blob,preview:await toBlob(thumbnail)};
 }finally{releaseCanvas(original);releaseCanvas(thumbnail);}
}
