// Supplied individual PNGs, always drawn whole; coordinates use the shared 1024×1536 canvas.
const B='/assets/05/纽扣-assets/';
export const BUTTON_ASSETS=[
 [2,['yellow','green']],[3,['yellow','blue']],[4,['yellow','green']],
 [5,['green']],[6,['red']],[7,['pink']],[8,['white','pink']],
 [9,['blue','pink']],[10,['yellow']],[11,['pink']],[12,['yellow']],
 [13,['pink']],[14,['blue','green']],[15,['blue']],[16,['green']],
 [17,['green']],[18,['pink']],[19,['blue']],[20,['green']],
 [21,['blue','green']],[22,['yellow','pink']],[23,['blue']],
 [24,['blue']],[25,['white','blue']],
].map(([id,colors])=>({id,colors,src:B+`画板 ${id}.png`,extent:({2:368,3:352,4:328,5:328,6:358,7:313,8:336,9:311,10:395,11:424,12:256,13:351,14:374,15:378,16:378,17:259,18:205,19:205,20:387,21:339,22:413,23:391,24:403,25:231})[id]}));
// Loose starting arrangements. Each position, visible size and angle varies once,
// then the result is saved; artwork is never clipped to the ribbon silhouette.
export const BUTTON_LAYOUTS=[
 {id:'petals-right',slots:[{x:745,y:230,size:175,angle:-12},{x:805,y:365,size:120,angle:16},{x:280,y:700,size:185,angle:-17},{x:695,y:1060,size:165,angle:13}]},
 {id:'petals-left',slots:[{x:275,y:245,size:175,angle:12},{x:216,y:380,size:120,angle:-16},{x:760,y:700,size:185,angle:17},{x:310,y:1050,size:165,angle:-13}]},
 {id:'cross-body',slots:[{x:545,y:150,size:165,angle:8},{x:235,y:420,size:155,angle:-20},{x:790,y:580,size:145,angle:13},{x:425,y:830,size:150,angle:-12},{x:650,y:1120,size:165,angle:15}]},
 {id:'loose-four',slots:[{x:285,y:265,size:170,angle:-14},{x:790,y:380,size:160,angle:18},{x:320,y:785,size:185,angle:-22},{x:695,y:1220,size:160,angle:12}]},
 {id:'offset-six',slots:[{x:340,y:185,size:165,angle:10},{x:785,y:240,size:155,angle:-16},{x:850,y:515,size:140,angle:20},{x:300,y:690,size:175,angle:-8},{x:345,y:990,size:160,angle:16},{x:690,y:1275,size:150,angle:-13}]},
 {id:'mixed-five',slots:[{x:225,y:315,size:170,angle:16},{x:705,y:210,size:170,angle:-12},{x:805,y:650,size:185,angle:20},{x:410,y:910,size:145,angle:-20},{x:720,y:1150,size:155,angle:8}]},
 {id:'diagonal',slots:[{x:740,y:260,size:190,angle:-15},{x:255,y:580,size:150,angle:12},{x:365,y:825,size:160,angle:-10},{x:665,y:1185,size:180,angle:18}]},
 {id:'scattered-five',slots:[{x:240,y:240,size:160,angle:12},{x:825,y:330,size:175,angle:-18},{x:245,y:745,size:190,angle:16},{x:590,y:870,size:140,angle:-10},{x:710,y:1195,size:170,angle:15}]},
 {id:'top-and-tails',slots:[{x:510,y:135,size:185,angle:5},{x:195,y:500,size:160,angle:-14},{x:790,y:715,size:175,angle:20},{x:310,y:1070,size:170,angle:-16}]},
];
const RIBBON_COLORS={ribbon1:['yellow','pink','blue','white','white'],ribbon2:['green','white','yellow','green','red','pink'],ribbon3:['pink','blue','yellow','blue','purple','white','pink']};
const ACCENTS={pink:['blue','yellow','white'],green:['blue','yellow','white'],blue:['pink','yellow','white'],yellow:['pink','blue','green','white'],red:['yellow','white'],purple:['pink','blue','white'],white:['pink','blue','yellow']};
export function ribbonPalette(s){return [...new Set(Object.keys(RIBBON_COLORS).map(k=>RIBBON_COLORS[k][s.rosette[k]]||'white'))];}
const pick=(items,random)=>items[Math.min(items.length-1,Math.max(0,Math.floor(random()*items.length)))];
function chooseButton(palette,used,random){const allowed=new Set(palette.flatMap(c=>[c,...ACCENTS[c]])),pool=BUTTON_ASSETS.filter(b=>b.colors.some(c=>allowed.has(c))&&!used.has(b.id));const candidates=pool.length?pool:BUTTON_ASSETS.filter(b=>b.colors.some(c=>allowed.has(c)));const weighted=candidates.flatMap(b=>Array.from({length:b.colors.some(c=>palette.includes(c))?4:1},()=>b));return pick(weighted,random);}
// `size` means visible ornament size. Keep transparent padding in the draw call,
// compensating for it so the small heart/spiral files do not look half-sized.
export function buttonDrawSize(item){const size=item.size>180?180+(item.size-180)*.65:item.size;return size*425/(BUTTON_ASSETS.find(b=>b.id===item.assetId)?.extent||425);}
const between=(min,max,random)=>min+(max-min)*Math.max(0,Math.min(1,random()));
function safePlacement(p){const radius=p.size*.78,required=145+radius+12;p.x=Math.max(radius,Math.min(1024-radius,p.x));p.y=Math.max(radius,Math.min(1536-radius,p.y));if(Math.hypot(p.x-513,p.y-465)<required){const base=Math.atan2(p.y-465,p.x-513);for(let i=0;i<128;i++){const a=base+(i%2?-1:1)*Math.ceil(i/2)*Math.PI/64,x=513+Math.cos(a)*(required+2),y=465+Math.sin(a)*(required+2);if(x>=radius&&x<=1024-radius&&y>=radius&&y<=1536-radius){p.x=x;p.y=y;break;}}}return p;}
function varySlot(slot,placed,random){const size=Math.round(between(slot.size*.85,slot.size*1.2,random)),angle=Math.round(slot.angle+between(-26,26,random));let p;for(let attempt=0;attempt<32;attempt++){p=safePlacement({x:slot.x+between(-52,52,random),y:slot.y+between(-62,62,random),size,angle});if(placed.every(b=>Math.hypot(p.x-b.x,p.y-b.y)>(p.size+b.size)*.46))break;}p.x=Math.round(p.x);p.y=Math.round(p.y);return p;}
export function ensureRosetteButtons(s,random=Math.random){
 const palette=ribbonPalette(s),allowed=new Set(palette.flatMap(c=>[c,...ACCENTS[c]]));let changed=false;
 if(!s.rosetteButtons||s.rosetteButtons.version!==2||!BUTTON_LAYOUTS.some(l=>l.id===s.rosetteButtons.layoutId)||!Array.isArray(s.rosetteButtons.items)||!s.rosetteButtons.items.length){
  const layout=pick(BUTTON_LAYOUTS,random),used=new Set(),items=[];for(const slot of layout.slots){const b=chooseButton(palette,used,random);used.add(b.id);items.push({...varySlot(slot,items,random),assetId:b.id});}s.rosetteButtons={version:2,layoutId:layout.id,palette,items};return true;
 }
 const used=new Set(s.rosetteButtons.items.map(b=>b.assetId));
 for(const item of s.rosetteButtons.items){const asset=BUTTON_ASSETS.find(b=>b.id===item.assetId);if(!asset||!asset.colors.some(c=>allowed.has(c))){const b=chooseButton(palette,used,random);item.assetId=b.id;used.add(b.id);changed=true;}}
 if(JSON.stringify(s.rosetteButtons.palette)!==JSON.stringify(palette)){s.rosetteButtons.palette=palette;changed=true;}
 return changed;
}
