import {limitExamples,limitById,pathSamples,limitViewExample} from './limits-math.mjs';
import {buildLimitMesh} from './limits-mesh.mjs';
import {createLimitRenderer} from './limits-renderer.mjs';

const $=id=>document.getElementById(id),canvas=$('limit-graph');
const cameras={polynomial:[-.8,.57], 'radial-sinc':[-.8,.58],squeeze:[-.9,.48],infinite:[-.8,.48],'two-paths':[-.75,.46],'curved-path':[-.65,.5]};
const methods={polynomial:'Direct substitution',infinite:'An infinite limit','radial-sinc':'One-variable substitution',squeeze:'Uniform squeeze estimate','two-paths':'Two incompatible paths','curved-path':'The subtle curved-path test'};
const state={id:'polynomial',radius:.5,azimuth:-.8,elevation:.57,zoom:1,paths:true,grid:true,contours:true,heightMultiplier:32,zMin:-213,zMax:87,autoHeight:false};
const renderer=createLimitRenderer(canvas,$('limit-axis-labels'),$('limit-canvas-error'));
let graph,frame=0,updateFrame=0;
const format=n=>Number.isNaN(n)?'undefined':!Number.isFinite(n)?(n>0?'+∞':'−∞'):(Math.abs(n)>=1e5||(Math.abs(n)<.001&&n!==0))?n.toExponential(3):Number(n.toPrecision(6)).toLocaleString('en-US',{maximumFractionDigits:6});
function requestDraw(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;renderer?.draw(state,state);});}
function update(){
 const example=limitById[state.id],r=state.radius,viewExample=limitViewExample(example,r,state.heightMultiplier);
 state.autoHeight=example.id==='infinite';state.zMin=viewExample.zCenter-viewExample.zScale;state.zMax=viewExample.zCenter+viewExample.zScale;
 graph=buildLimitMesh(viewExample,r);renderer?.setGraph(graph,viewExample,r);$('limit-radius-output').value=format(r);
 $('limit-height-output').value=format(state.zMax);$('limit-height').setAttribute('aria-valuetext',`z = ${format(state.zMax)}, ${state.heightMultiplier} times the boundary height`);
 $('limit-domain-window').textContent=`Domain disk: center (${example.target.join(', ')}), radius ${format(r)}. ${state.autoHeight?'Auto-rescaled':'Fixed'} height window: ${format(state.zMin)} ≤ z ≤ ${format(state.zMax)}.${state.autoHeight?` Ceiling = ${state.heightMultiplier}/r²; boundary height = ${format(1/(r*r))}.`:''}`;
 $('limit-table-body').replaceChildren();
 for(const t of [r/2,r/10,r/100]){
  const tr=document.createElement('tr'),td=document.createElement('td');td.textContent=format(t);tr.append(td);
  for(const sample of pathSamples(example,t)){const cell=document.createElement('td');cell.textContent=format(sample.value);cell.title=`(${format(sample.x)}, ${format(sample.y)})`;tr.append(cell);}
  $('limit-table-body').append(tr);
 }
 const count=graph.positions.length/9;
 $('limit-graph-status').textContent=count?(example.id==='curved-path'?'Rotate to see both narrow ridges. Toggle the surface mesh to compare the curved paths with the full graph.':'Rotate to see the shape. Toggle the surface mesh to reveal the graph’s structure.'):'The graph lies outside this height window.';
 $('limit-empty-message').hidden=!!count;$('limit-empty-message').textContent='The graph lies outside this height window.';
 requestDraw();
}
function resetView(){[state.azimuth,state.elevation]=cameras[state.id];state.zoom=1;requestDraw();}
function selectExample(id){
 const example=limitById[id],index=limitExamples.findIndex(e=>e.id===id);state.id=id;state.radius=example.radius;$('limit-example').value=id;$('limit-radius').value=-100*Math.log10(state.radius);
 $('limit-height-control').hidden=id!=='infinite';$('limit-height').value=Math.log2(state.heightMultiplier);
 $('limit-window-help').textContent=id==='infinite'?'The disk expands to fill the picture as it shrinks. The height scale grows automatically; the labels show actual heights.':'The disk expands to fill the picture as it shrinks. The labeled height scale stays fixed.';
 $('limit-equation').textContent=example.equation;$('limit-target').textContent=`As (x,y) → (${example.target.join(', ')})`;
 $('limit-result').textContent=example.result;$('limit-domain').textContent=example.domain;$('limit-proof').innerHTML=example.proof;$('limit-prompt').textContent=example.prompt;
 $('limit-step').textContent=`${index+1} of ${limitExamples.length} · ${methods[id]}`;$('limit-prev').disabled=index===0;$('limit-next').disabled=index===limitExamples.length-1;
 $('limit-paths').replaceChildren();$('limit-table-head').replaceChildren();const th=document.createElement('th');th.scope='col';th.textContent='t';$('limit-table-head').append(th);
 example.paths.forEach((path,i)=>{const p=document.createElement('p'),mark=document.createElement('span');mark.className='limit-path-mark';mark.style.backgroundColor=path.color;p.append(mark,document.createTextNode(`${i+1}. ${path.name} → ${path.result}`));$('limit-paths').append(p);const cell=document.createElement('th');cell.scope='col';cell.textContent=`Path ${i+1}`;cell.style.color=path.color;$('limit-table-head').append(cell);});
 $('limit-share').href=`?limit=${id}#limits`;resetView();update();
}
for(const [i,example] of limitExamples.entries()){const option=document.createElement('option');option.value=example.id;option.textContent=`${i+1}. ${example.name}`;$('limit-example').append(option);}
$('limit-example').addEventListener('change',event=>selectExample(event.target.value));
for(const [id,step] of [['limit-prev',-1],['limit-next',1]])$(id).addEventListener('click',()=>{const index=limitExamples.findIndex(e=>e.id===state.id);selectExample(limitExamples[index+step].id);});
$('limit-radius').addEventListener('input',event=>{state.radius=10**(-Number(event.target.value)/100);if(!updateFrame)updateFrame=requestAnimationFrame(()=>{updateFrame=0;update();});});
$('limit-height').addEventListener('input',event=>{state.heightMultiplier=2**Number(event.target.value);if(!updateFrame)updateFrame=requestAnimationFrame(()=>{updateFrame=0;update();});});
$('limit-reset-view').addEventListener('click',resetView);
for(const name of ['paths','grid','contours'])$('limit-show-'+name).addEventListener('change',event=>{state[name]=event.target.checked;requestDraw();});
$('limit-zoom-in').addEventListener('click',()=>{state.zoom=Math.min(1.6,state.zoom*1.15);requestDraw();});
$('limit-zoom-out').addEventListener('click',()=>{state.zoom=Math.max(.65,state.zoom/1.15);requestDraw();});
$('limit-fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('limit-visual').requestFullscreen();}catch{$('limit-graph-status').textContent='Fullscreen is unavailable in this browser.';}});
const pointers=new Map();let oldPinch=0;
canvas.addEventListener('pointerdown',event=>{canvas.setPointerCapture(event.pointerId);pointers.set(event.pointerId,[event.clientX,event.clientY]);canvas.focus({preventScroll:true});if(pointers.size===2){const p=[...pointers.values()];oldPinch=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);}});
canvas.addEventListener('pointermove',event=>{const old=pointers.get(event.pointerId);if(!old)return;pointers.set(event.pointerId,[event.clientX,event.clientY]);if(pointers.size===1){state.azimuth-=(event.clientX-old[0])*.008;state.elevation=Math.max(-1.35,Math.min(1.35,state.elevation+(event.clientY-old[1])*.008));}else if(pointers.size===2){const p=[...pointers.values()],d=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);if(oldPinch>0)state.zoom=Math.max(.65,Math.min(1.6,state.zoom*d/oldPinch));oldPinch=d;}requestDraw();});
for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,event=>pointers.delete(event.pointerId));
canvas.addEventListener('wheel',event=>{event.preventDefault();state.zoom=Math.max(.65,Math.min(1.6,state.zoom*Math.exp(-event.deltaY*.001)));requestDraw();},{passive:false});
canvas.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','+','=','-'].includes(event.key))return;event.preventDefault();if(event.key==='Home')resetView();if(event.key==='ArrowLeft')state.azimuth+=.1;if(event.key==='ArrowRight')state.azimuth-=.1;if(event.key==='ArrowUp')state.elevation=Math.min(1.35,state.elevation+.1);if(event.key==='ArrowDown')state.elevation=Math.max(-1.35,state.elevation-.1);if(event.key==='+'||event.key==='=')state.zoom=Math.min(1.6,state.zoom*1.1);if(event.key==='-')state.zoom=Math.max(.65,state.zoom/1.1);requestDraw();});
new ResizeObserver(requestDraw).observe(canvas);
const requested=new URLSearchParams(location.search).get('limit');selectExample(Object.hasOwn(limitById,requested)?requested:'polynomial');
window.limitExplorer={getState:()=>({...state,triangles:graph.positions.length/9,...renderer?.info()}),getExampleIds:()=>limitExamples.map(e=>e.id)};
