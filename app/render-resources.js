const fonts=new Map();
export function releaseCanvas(canvas){if(canvas){canvas.width=1;canvas.height=1;}}
export function renderPixelLimit(){const ios=/iP(?:hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);return ios?16000000:18000000;}
// Unrelated or unavailable web fonts must never make a local export fail/hang.
export async function loadRenderFonts(specs){
 if(!document.fonts?.load)return;
 await Promise.all(specs.map(spec=>{
  const key=spec.replace(/\b\d+px/,'16px');
  if(!fonts.has(key))fonts.set(key,new Promise(resolve=>{
   const timer=setTimeout(resolve,2500);
   Promise.resolve().then(()=>document.fonts.load(key)).catch(()=>{}).finally(()=>{clearTimeout(timer);resolve();});
  }));
  return fonts.get(key);
 }));
}
