import {limitExamples,limitById,pathSamples,graphSamples} from './limits-math.mjs';

const $=id=>document.getElementById(id),canvas=$('limit-graph'),ctx=canvas.getContext('2d');
const state={id:'two-paths',radius:1,azimuth:-.6,elevation:.5};
let graph,frame=0;
const format=n=>Number.isNaN(n)?'undefined':!Number.isFinite(n)?(n>0?'+∞':'−∞'):(Math.abs(n)>=1e5||(Math.abs(n)<.001&&n!==0))?n.toExponential(3):Number(n.toPrecision(6)).toLocaleString('en-US',{maximumFractionDigits:6});
const project=(u,v,w,W,H)=>{
  const scale=Math.min(W*.28,H*.3),c=Math.cos(state.azimuth),s=Math.sin(state.azimuth),a=s*u+c*v;
  return [W*.5+(c*u-s*v)*scale,H*.52-(Math.sin(state.elevation)*a+Math.cos(state.elevation)*w)*scale,Math.cos(state.elevation)*a-Math.sin(state.elevation)*w];
};
function requestDraw(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;draw();});}
function draw(){
  const rect=canvas.getBoundingClientRect(),W=rect.width,H=rect.height,dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
  const example=limitById[state.id],P=(u,v,w)=>project(u,v,w,W,H);
  const line=(points,color,width=1,dash=[])=>{ctx.beginPath();points.forEach((p,i)=>{const q=P(...p);if(i)ctx.lineTo(q[0],q[1]);else ctx.moveTo(q[0],q[1]);});ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);};
  // The lower disk is the domain projected to the bottom of the height window.
  const ring=Array.from({length:97},(_,i)=>[Math.cos(i*Math.PI/48),Math.sin(i*Math.PI/48),-1]);
  line(ring,'#bbc7b4',1.2);line([[-1,0,-1],[1,0,-1]],'#c3cdbf');line([[0,-1,-1],[0,1,-1]],'#c3cdbf');
  for(const edge of [[[-1,-1,-1],[-1,-1,1]],[[-1,-1,-1],[1,-1,-1]],[[-1,-1,-1],[-1,1,-1]]])line(edge,'#8c9e8a',1.2);
  const vertices=graph.points.map(p=>P(p[0],p[1],p[2]));
  const faces=graph.faces.map(indices=>({indices,depth:indices.reduce((sum,i)=>sum+vertices[i][2],0)/3})).sort((a,b)=>b.depth-a.depth);
  for(const {indices} of faces){
    const height=indices.reduce((sum,i)=>sum+graph.points[i][2],0)/3;
    ctx.beginPath();indices.forEach((i,j)=>{const p=vertices[i];if(j)ctx.lineTo(p[0],p[1]);else ctx.moveTo(p[0],p[1]);});ctx.closePath();
    ctx.fillStyle=`hsl(${42+height*5} 48% ${60+height*8}%)`;ctx.fill();ctx.strokeStyle='rgba(114,90,41,.12)';ctx.lineWidth=.4;ctx.stroke();
  }
  // Exact path values are drawn on top so a narrowing ridge cannot be lost in
  // the surface mesh. Never join across t=0 or across a clipped segment.
  for(const path of example.paths)for(const sign of [-1,1]){
    let piece=[];
    const flush=()=>{if(piece.length>1)line(piece,path.color,2.6);piece=[];};
    for(let j=0;j<=160;j++){
      const t=sign*state.radius*.5*Math.exp(Math.log(.001)*(1-j/160));
      const [x,y]=path.point(t),z=example.evaluate(x,y),p=[(x-example.target[0])/state.radius,(y-example.target[1])/state.radius,(z-example.zCenter)/example.zScale];
      if(Number.isFinite(z)&&Math.hypot(p[0],p[1])<=1&&Math.abs(p[2])<=1)piece.push(p);else flush();
    }
    flush();
  }
  if(['squeeze','radial-sinc','polynomial'].includes(example.id)){
    const p=P(0,0,0);ctx.beginPath();ctx.arc(p[0],p[1],5,0,2*Math.PI);ctx.fillStyle=example.id==='polynomial'?'#274f43':'#faf9f5';ctx.fill();ctx.strokeStyle='#274f43';ctx.lineWidth=2;ctx.stroke();
  }
  ctx.font='11px system-ui';ctx.fillStyle='#536852';ctx.textAlign='left';
  for(const [w,z] of [[-1,example.zCenter-example.zScale],[0,example.zCenter],[1,example.zCenter+example.zScale]]){
    const p=P(-1,-1,w);ctx.fillText(`z = ${format(z)}`,p[0]+8,p[1]+4);
  }
  ctx.font='italic 13px Georgia';for(const [u,v,label] of [[1.2,0,'x'],[0,1.2,'y']]){const p=P(u,v,-1);ctx.fillText(label,p[0],p[1]);}
  if(!faces.length){ctx.textAlign='center';ctx.font='14px system-ui';ctx.fillStyle='#5d6e59';ctx.fillText(example.id==='infinite'?'All graph heights are above z = 20.':'No sampled surface lies in this height window.',W/2,H*.36);}
}
function update(){
  const example=limitById[state.id],r=state.radius;
  graph=graphSamples(example,r);$('limit-radius-output').value=format(r);
  $('limit-domain-window').textContent=`Domain disk: center (${example.target.join(', ')}), radius ${format(r)}. Fixed height window: ${format(example.zCenter-example.zScale)} ≤ z ≤ ${format(example.zCenter+example.zScale)}.`;
  $('limit-table-body').replaceChildren();
  for(const t of [r/2,r/10,r/100]){
    const tr=document.createElement('tr'),td=document.createElement('td');td.textContent=format(t);tr.append(td);
    for(const sample of pathSamples(example,t)){const cell=document.createElement('td');cell.textContent=format(sample.value);cell.title=`(${format(sample.x)}, ${format(sample.y)})`;tr.append(cell);}
    $('limit-table-body').append(tr);
  }
  $('limit-graph-status').textContent=graph.faces.length?`${graph.faces.length.toLocaleString()} sampled triangles · paths drawn from their formulas`:'Surface is outside the fixed height window';
  requestDraw();
}
function selectExample(id){
  const example=limitById[id];state.id=id;state.radius=example.radius;$('limit-example').value=id;$('limit-radius').value=-100*Math.log10(state.radius);
  $('limit-equation').textContent=example.equation;$('limit-target').textContent=`As (x,y) → (${example.target.join(', ')})`;
  $('limit-result').textContent=example.result;$('limit-domain').textContent=example.domain;$('limit-proof').innerHTML=example.proof;$('limit-prompt').textContent=example.prompt;
  $('limit-paths').replaceChildren();$('limit-table-head').replaceChildren();const th=document.createElement('th');th.scope='col';th.textContent='t';$('limit-table-head').append(th);
  example.paths.forEach((path,i)=>{const p=document.createElement('p'),mark=document.createElement('span');mark.className='limit-path-mark';mark.style.backgroundColor=path.color;p.append(mark,document.createTextNode(`${i+1}. ${path.name} → ${path.result}`));$('limit-paths').append(p);const cell=document.createElement('th');cell.scope='col';cell.textContent=`Path ${i+1}`;cell.style.color=path.color;$('limit-table-head').append(cell);});
  $('limit-share').href=`?limit=${id}#limits`;update();
}
for(const example of limitExamples){const option=document.createElement('option');option.value=example.id;option.textContent=example.name;$('limit-example').append(option);}
$('limit-example').addEventListener('change',event=>selectExample(event.target.value));
$('limit-radius').addEventListener('input',event=>{state.radius=10**(-Number(event.target.value)/100);update();});
$('limit-reset-view').addEventListener('click',()=>{state.azimuth=-.6;state.elevation=.5;requestDraw();});
let drag=null;
canvas.addEventListener('pointerdown',event=>{canvas.setPointerCapture(event.pointerId);drag=[event.clientX,event.clientY];canvas.focus({preventScroll:true});});
canvas.addEventListener('pointermove',event=>{if(!drag)return;state.azimuth+=(event.clientX-drag[0])*.009;state.elevation=Math.max(-1.2,Math.min(1.2,state.elevation+(event.clientY-drag[1])*.009));drag=[event.clientX,event.clientY];requestDraw();});
for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,()=>{drag=null;});
canvas.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key))return;event.preventDefault();if(event.key==='Home'){state.azimuth=-.6;state.elevation=.5;}if(event.key==='ArrowLeft')state.azimuth-=.1;if(event.key==='ArrowRight')state.azimuth+=.1;if(event.key==='ArrowUp')state.elevation=Math.min(1.2,state.elevation+.1);if(event.key==='ArrowDown')state.elevation=Math.max(-1.2,state.elevation-.1);requestDraw();});
new ResizeObserver(requestDraw).observe(canvas);
const requested=new URLSearchParams(location.search).get('limit');selectExample(Object.hasOwn(limitById,requested)?requested:'two-paths');
window.limitExplorer={getState:()=>({...state,triangles:graph.faces.length}),getExampleIds:()=>limitExamples.map(e=>e.id)};
