export const cycle=(i,n)=>(i%n+n)%n;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
export function bindCarousel(carousel,select,recycle=()=>{}){
 const track=carousel.querySelector('.track');let start=null,horizontal=false,suppress=false,locked=false,drag=0,step=0;
 const cards=[...track.querySelectorAll('[data-offset]')];
 cards.forEach(b=>b.dataset.baseOffset=b.dataset.offset);
 const pitch=()=>{if(step)return step;const a=track.querySelector('[data-offset="0"]')?.getBoundingClientRect(),b=track.querySelector('[data-offset="1"]')?.getBoundingClientRect();return step=b?Math.abs(b.left+b.width/2-a.left-a.width/2):80;};
 const focus=position=>{const p=pitch();cards.forEach(b=>{const base=+b.dataset.baseOffset,offset=base+Math.round((-position/p-base)/cards.length)*cards.length;if(+b.dataset.offset!==offset)recycle(b,offset);b.dataset.offset=offset;b.style.setProperty('--offset',offset);b.style.setProperty('--focus',Math.max(0,1-Math.abs(offset+position/p)));});};
 const translate=(x,animated=false,duration=220)=>{drag=x;track.style.transition=animated?`transform ${duration}ms cubic-bezier(.2,.65,.25,1)`:'none';cards.forEach(b=>b.style.transition=animated?`transform ${duration}ms cubic-bezier(.2,.65,.25,1),border-color ${duration}ms`:'none');track.style.transform=`translateX(${x}px)`;focus(x);};
 async function move(direction){carousel.classList.remove('demo');if(locked||!direction)return;locked=true;try{await select(direction,async()=>{const duration=reduced()?0:Math.max(100,Math.min(240,240*Math.abs(-direction*pitch()-drag)/pitch()));translate(-direction*pitch(),true,duration);cards.forEach(b=>b.classList.toggle('selected',+b.dataset.offset===direction));await new Promise(r=>setTimeout(r,duration));});}finally{locked=false;if(track.isConnected){cards.forEach(b=>b.classList.toggle('selected',+b.dataset.offset===0));translate(0,true);}}}
 carousel.querySelectorAll('[data-offset]').forEach(b=>b.onclick=()=>move(+b.dataset.offset));
 carousel.addEventListener('click',e=>{if(suppress){e.preventDefault();e.stopImmediatePropagation();}},true);
 carousel.onpointerdown=e=>{carousel.classList.remove('demo');if(locked)return;start={x:e.clientX,y:e.clientY,id:e.pointerId};horizontal=false;};
 carousel.onpointermove=e=>{if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(!horizontal&&Math.abs(dx)>7&&Math.abs(dx)>Math.abs(dy)*1.15){horizontal=true;try{carousel.setPointerCapture?.(e.pointerId);}catch{}}if(horizontal)translate(dx);};
 carousel.onpointerup=e=>{if(!start)return;const dx=e.clientX-start.x;if(horizontal){suppress=true;setTimeout(()=>suppress=false,0);const direction=Math.round(-dx/pitch());if(direction)move(direction);else translate(0,true);}start=null;};
 carousel.onpointercancel=()=>{start=null;translate(0,true);};
 carousel.onkeydown=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(e.key==='ArrowLeft'?-1:1);}};
}
