import {t,preferredLocale} from './i18n.js';
import {ASSETS} from './config.js';
import {fetchGallery,backendScope,fetchMediaUrls,mediaEnabled,isSupabase} from './service.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storageKey=()=> 'liwu-gallery-browse-v2:'+backendScope();
const itemId=e=>String(e.id??e.number);
// Public numbering is explicit. The legacy number-only shape belongs to mock.
const giftNumber=e=>{const n=e.gift_number??e.giftNumber??(!isSupabase?e.number:null);return /^\d+$/.test(String(n))&&Number.isSafeInteger(Number(n))&&Number(n)>0?Number(n):null;};
const numberLabel=e=>'No.'+(giftNumber(e)??'—');
const publicationOrder=e=>e.publicationOrder??e.number;
let cachedResult,cachedAt=0,controller;
function restore(){try{return JSON.parse(sessionStorage.getItem(storageKey()))||{};}catch{return {};}}
export async function mountGallery(main,{onCounts,translate}){
 const tr=translate||((key)=>t({locale:preferredLocale()},key));
 controller?.abort();controller=new AbortController();const {signal}=controller;history.scrollRestoration='manual';
 const browse={query:'',descending:true,scroll:0,...restore()};
 let detail=false,restoring=false,listScroll=browse.scroll;
 let imageObserver;
 const placeholder='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
 async function urls(item,force=false){
  if(!mediaEnabled||!item.mediaReady)return item;
  if(!force&&Date.parse(item.expiresAt||'')>Date.now()+10000)return item;
  if(!item.mediaLoading)item.mediaLoading=fetchMediaUrls(itemId(item)).then(value=>Object.assign(item,{boxUrl:value.boxUrl,letterUrl:value.letterUrl,expiresAt:value.expiresAt})).finally(()=>delete item.mediaLoading);
  return item.mediaLoading;
 }
 function bindImage(img,item,kind){
  let retried=false;
  const load=async force=>{try{const value=await urls(item,force);if(img.isConnected)img.src=value[kind];}catch{if(img.isConnected){img.onerror=null;img.src=placeholder;img.alt=tr('imageLoadFailed');}}};
  img.referrerPolicy='no-referrer';
  img.onerror=()=>{if(!retried&&mediaEnabled&&item.mediaReady){retried=true;void load(true);}else img.alt=tr('imageLoadFailed');};
  if(mediaEnabled&&item.mediaReady){img.src=placeholder;return ()=>load(false);}return ()=>{};
 }
 signal.addEventListener('abort',()=>imageObserver?.disconnect(),{once:true});
 const remember=()=>{try{sessionStorage.setItem(storageKey(),JSON.stringify(browse));}catch{}};
 main.innerHTML=`<section id="gallery-list"><div class="awning">${'<i></i>'.repeat(8)}</div><img class="gallery-logo" src="${ASSETS.logo}" alt="Liwu for Wuli RIWOO"><div class="gallery-heading"><img src="/assets/00/Gift Gallery.png" alt="Gift Gallery"><span id="gallery-total">… / 1022</span></div><div class="gallery-tools"><label><span class="sr-only">${tr('searchHelp')}</span><input id="gallery-search" placeholder="🔍 ${tr('searchHint')}" type="search"></label><button id="gallery-sort" aria-label="${tr('sortHelp')}"></button></div><p class="gallery-service" role="status">${tr('loading')}</p><div id="gallery-pool"></div></section><section id="gallery-detail" hidden></section>`;
 const list=main.querySelector('#gallery-list'),viewer=main.querySelector('#gallery-detail'),status=main.querySelector('.gallery-service'),search=main.querySelector('#gallery-search'),sort=main.querySelector('#gallery-sort');
 search.value=browse.query;
 const back=main.parentElement.querySelector('[data-action="close-gallery"]');
 const showList=()=>{const savedScroll=listScroll;restoring=true;detail=false;main.parentElement.classList.remove('gallery-detail-open');viewer.hidden=true;list.hidden=false;viewer.replaceChildren();requestAnimationFrame(()=>{if(!main.isConnected)return;window.scrollTo(0,savedScroll);browse.scroll=listScroll=savedScroll;remember();requestAnimationFrame(()=>{restoring=false;});});};
 const showDetail=(item,push=true)=>{
  if(!detail&&push){listScroll=window.scrollY;browse.scroll=listScroll;remember();}
  detail=true;main.parentElement.classList.add('gallery-detail-open');list.hidden=true;viewer.hidden=false;
  viewer.innerHTML=`<img class="gallery-full-letter" data-gift-number="${giftNumber(item)??''}" src="${esc(mediaEnabled&&item.mediaReady?placeholder:item.letterUrl)}" alt="Full letter · ${numberLabel(item)} · ${esc(item.name)}">`;
  void bindImage(viewer.querySelector('img'),item,'letterUrl')();
  if(push)history.pushState({...history.state,liwuGalleryDetail:itemId(item)},'');
  window.scrollTo(0,0);
 };
 back.addEventListener('click',e=>{if(!detail)return;e.stopImmediatePropagation();history.back();},{signal,capture:true});
 window.addEventListener('scroll',()=>{if(!detail&&!restoring&&main.isConnected){browse.scroll=window.scrollY;listScroll=browse.scroll;remember();}},{passive:true,signal});
 const draw=result=>{
  // Rank the complete current pool before filtering. Never write ranks to records.
  const pool=[...result.items].sort((a,b)=>publicationOrder(a)-publicationOrder(b));
  const galleryNumbers=new Map(pool.map((e,i)=>[itemId(e),i+1]));
  // Gift Number remains searchable; display ranks follow the publication order.
  const q=browse.query.trim().toLowerCase(),number=q.replace(/^no\.?\s*/,'');
  const items=pool.filter(e=>!q||String(giftNumber(e))===number||e.name.toLowerCase().includes(q));if(browse.descending)items.reverse();
  sort.textContent=tr(browse.descending?'galleryNewest':'galleryOldest');
  main.querySelector('#gallery-pool').innerHTML=items.map(e=>`<button class="gallery-card" data-gallery-id="${esc(itemId(e))}" data-gift-number="${giftNumber(e)??''}" style="--tilt:${[-2,1.8,-1,2,-1.4,1][giftNumber(e)%6]}deg;--nudge:${[0,20,-12,12,-8,8][giftNumber(e)%6]}"><span class="gallery-number" aria-label="Gallery Number">No.${galleryNumbers.get(itemId(e))}</span><span class="gallery-art"><img src="${esc(mediaEnabled&&e.mediaReady?placeholder:e.boxUrl)}" alt="Gift ${giftNumber(e)??'—'}" loading="lazy" width="2006" height="2400"></span><span class="gallery-name">${esc(e.name)}</span></button>`).join('')||`<p class="gallery-empty">${tr('noGifts')}</p>`;
  main.querySelectorAll('[data-gallery-id]').forEach(b=>b.onclick=()=>showDetail(result.items.find(e=>itemId(e)===b.dataset.galleryId)));
  imageObserver?.disconnect();
  const loaders=new Map();
  main.querySelectorAll('[data-gallery-id] img').forEach(img=>{const item=result.items.find(e=>itemId(e)===img.closest('[data-gallery-id]').dataset.galleryId);const load=bindImage(img,item,'boxUrl');loaders.set(img,load);});
  if(typeof IntersectionObserver==='function'){
   imageObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){void loaders.get(entry.target)?.();imageObserver.unobserve(entry.target);}},{rootMargin:'200px'});
   for(const img of loaders.keys())imageObserver.observe(img);
  }else for(const load of loaders.values())void load();
 };
 try{
  // Keep the full loaded pool and its DOM when opening a detail.
  const result=cachedResult&&Date.now()-cachedAt<30000?cachedResult:await fetchGallery();if(!main.isConnected||signal.aborted)return;cachedResult=result;cachedAt=Date.now();
  onCounts(result);main.querySelector('#gallery-total').textContent=result.galleryCount+' / 1022';status.textContent=tr(result.mock?'localReview':'galleryPublic');
  search.oninput=()=>{browse.query=search.value;browse.scroll=0;remember();draw(result);};
  sort.onclick=()=>{browse.descending=!browse.descending;remember();draw(result);};
  draw(result);
  window.addEventListener('popstate',e=>{if(!main.isConnected)return;const item=result.items.find(x=>itemId(x)===String(e.state?.liwuGalleryDetail));if(item)showDetail(item,false);else if(detail)showList();},{signal});
  const opened=result.items.find(x=>itemId(x)===String(history.state?.liwuGalleryDetail));
  if(opened)showDetail(opened,false);else requestAnimationFrame(()=>{if(main.isConnected)window.scrollTo(0,browse.scroll);});
 }catch{if(!main.isConnected)return;status.textContent=tr('galleryFailed');const retry=document.createElement('button');retry.textContent=tr('retry');retry.onclick=()=>mountGallery(main,{onCounts,translate});status.append(retry);}
}
export function invalidateGallery(){cachedResult=undefined;}
