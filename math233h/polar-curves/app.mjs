import {CURVES,LECTURE_EXAMPLES,TAU,clamp,curveById,defaults,pointAt,sampleCurve,suggestedRadius,formatPi,conicName} from './math.mjs';

const $=id=>document.getElementById(id);
const canvas=$('scene'),ctx=canvas.getContext('2d'),graph=$('radius-graph'),gctx=graph.getContext('2d');
const palette={ink:'#243c34',muted:'#778278',grid:'#dce4d9',faint:'#eaf0e6',green:'#315f50',light:'#90b59a',orange:'#bc7647',purple:'#887092'};
const state={id:'rose',p:defaults('rose'),start:0,end:Math.PI,theta:.42*Math.PI,playing:false,grid:'polar',viewRadius:2.4,parts:[],lastTime:0,frame:0,animationFrame:0};
const fixed=(x,digits=3)=>!Number.isFinite(x)?'—':Math.abs(x)<.5*10**(-digits)?(0).toFixed(digits):x.toFixed(digits).replace('-','−');
const choose=()=>curveById(state.id);
const check=id=>$(id).checked;
const niceStep=x=>{const q=10**Math.floor(Math.log10(x)),n=x/q;return(n<=1?1:n<=2?2:n<=5?5:10)*q;};

for(const group of [...new Set(CURVES.map(c=>c.group))]){
  const optgroup=document.createElement('optgroup');optgroup.label=group;
  for(const c of CURVES.filter(c=>c.group===group)){const option=document.createElement('option');option.value=c.id;option.textContent=c.name;optgroup.append(option);}
  $('curve').append(optgroup);
}
for(const example of LECTURE_EXAMPLES){const option=document.createElement('option');option.value=example.id;option.textContent=example.label;$('lecture-example').append(option);}

function rebuildParameters(){
  $('parameters').replaceChildren();
  for(const def of choose().parameters){
    const row=document.createElement('div');row.className='parameter';
    const label=document.createElement('label');label.htmlFor=`parameter-${def.key}`;label.textContent=def.label;
    const out=document.createElement('output');out.id=`value-${def.key}`;out.htmlFor=label.htmlFor;out.textContent=def.key==='phi'?formatPi(state.p[def.key]):fixed(state.p[def.key],def.step===1?0:2);label.append(out);
    const input=document.createElement('input');Object.assign(input,{type:'range',id:label.htmlFor,min:def.min,max:def.max,step:def.step,value:state.p[def.key]});
    input.addEventListener('input',()=>{
      const oldDefault=choose().interval(state.p);const wasDefault=Math.abs(state.start-oldDefault[0])<1e-6&&Math.abs(state.end-oldDefault[1])<1e-6;
      state.p[def.key]=clamp(Number(input.value),def.min,def.max);out.textContent=def.key==='phi'?formatPi(state.p[def.key]):fixed(state.p[def.key],def.step===1?0:2);
      if(wasDefault&&(state.id==='rose'||state.id==='conic')){const fraction=(state.theta-state.start)/(state.end-state.start);[state.start,state.end]=choose().interval(state.p);state.theta=state.start+fraction*(state.end-state.start);syncInterval();}
      updateCurve(false);updateStaticText();
    });
    row.append(label,input);$('parameters').append(row);
  }
}

function updateStaticText(){
  const c=choose(),lecture=LECTURE_EXAMPLES.find(example=>example.curve===state.id&&Object.entries(example.p).every(([key,value])=>Math.abs(state.p[key]-value)<1e-10));
  $('lecture-example').value=lecture?.id??'';
  $('curve-title').textContent=state.id==='conic'?conicName(state.p.e):c.name;$('curve-equation').textContent=lecture?.formula??c.formula;$('curve-equation').classList.toggle('long',state.id==='conic');$('curve-description').textContent=c.description;
  $('derivative-formula').textContent=c.derivative;$('conic-presets').hidden=state.id!=='conic';$('directrix-row').hidden=state.id!=='conic';
  for(const b of document.querySelectorAll('[data-e]')){b.classList.toggle('active',Number(b.dataset.e)===state.p.e);b.setAttribute('aria-pressed',String(Number(b.dataset.e)===state.p.e));}
  let domain='All real θ. The displayed interval determines how much is traced.';
  if(state.id==='lemniscate')domain='Real domain: cos(2θ) ≥ 0. Both lobes use r ≥ 0. Playback crosses the excluded angular gap without inventing curve points.';
  if(state.id==='hyperbolic')domain='Domain: θ ≠ 0. The two sides of the pole in the formula are sampled separately.';
  if(state.id==='conic')domain=(state.p.e<1?'Every angle is allowed. r is strictly positive.':`Only 1 + e cos(θ − φ) > 0. Around φ: |θ − φ| < ${formatPi(Math.acos(-1/state.p.e),3)}. Boundary angles go to infinity.`)+(state.p.e===0?' A circle has no finite directrix.':` Directrix: x cos φ + y sin φ = ${fixed(state.p.p/state.p.e,2)}.`);
  $('domain-description').textContent=domain;
  $('observation').textContent=c.lesson;
  const headings={circle:'A coordinate becomes a curve.','offset-circle':'A negative radius is a direction.',cardioid:'A cusp asks for a limit.',limacon:'A loop can disappear.',rose:'Count petals, not turns.',lemniscate:'One pole. Two tangent lines.',archimedean:'Equal turns, equal spacing.',logarithmic:'A constant angle, at every scale.',hyperbolic:'Infinity is not the pole.',conic:'The sign selects the orbit.'};
  $('observation-heading').textContent=headings[state.id];
}

function syncInterval(){
  $('interval-start').value=Number((state.start/Math.PI).toFixed(6));$('interval-end').value=Number((state.end/Math.PI).toFixed(6));
  $('start-label').textContent=formatPi(state.start);$('end-label').textContent=formatPi(state.end);
}

function updateCurve(fit=true){
  state.parts=sampleCurve(state.id,state.p,state.start,state.end,Math.max(1600,Math.ceil((state.end-state.start)*150)));
  if(fit)state.viewRadius=suggestedRadius(state.id,state.p,state.start,state.end);
  state.theta=clamp(state.theta,state.start,state.end);requestDraw();
}

function selectCurve(id,overrides={},theta=null){
  setPlaying(false);state.id=id;state.p={...defaults(id),...overrides};[state.start,state.end]=choose().interval(state.p);
  state.theta=theta??state.start+.42*(state.end-state.start);$('curve').value=id;
  rebuildParameters();syncInterval();updateStaticText();updateCurve();
  $('interval-message').textContent=state.id==='rose'?'The default interval traces this rose once.':'Default interval restored. You can extend it to inspect retracing or domain gaps.';
}

function canvasSize(el,context){
  const bounds=el.getBoundingClientRect(),ratio=Math.min(window.devicePixelRatio||1,2);
  const width=Math.max(1,bounds.width),height=Math.max(1,bounds.height);
  const rw=Math.round(width*ratio),rh=Math.round(height*ratio);
  if(el.width!==rw||el.height!==rh){el.width=rw;el.height=rh;}
  context.setTransform(ratio,0,0,ratio,0,0);return {width,height};
}

function strokeLine(a,b,color,width=1,dash=[]){ctx.beginPath();ctx.setLineDash(dash);ctx.moveTo(...a);ctx.lineTo(...b);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();ctx.setLineDash([]);}
function label(text,x,y,color=palette.muted,align='center',font='11px Georgia'){ctx.font=font;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,x,y);}
function arrow(a,b,color,width=1.5){
  const d=Math.hypot(b[0]-a[0],b[1]-a[1]);if(d<5)return;
  strokeLine(a,b,color,width);const angle=Math.atan2(b[1]-a[1],b[0]-a[0]);
  ctx.beginPath();ctx.moveTo(...b);ctx.lineTo(b[0]-7*Math.cos(angle-.4),b[1]-7*Math.sin(angle-.4));ctx.lineTo(b[0]-7*Math.cos(angle+.4),b[1]-7*Math.sin(angle+.4));ctx.closePath();ctx.fillStyle=color;ctx.fill();
}

function drawScene(point){
  const {width:w,height:h}=canvasSize(canvas,ctx),ox=w/2,oy=h/2,scale=Math.min(w,h)/(2*state.viewRadius),maxRadius=Math.hypot(w,h)/(2*scale);
  const xy=(x,y)=>[ox+x*scale,oy-y*scale];
  ctx.clearRect(0,0,w,h);
  const bg=ctx.createRadialGradient(ox,oy,10,ox,oy,Math.max(w,h)*.6);bg.addColorStop(0,'#fffffc');bg.addColorStop(1,'#fafbf6');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  const step=niceStep(state.viewRadius/4.7);
  ctx.save();
  if(state.grid==='cartesian'||state.grid==='both'){
    for(let x=-Math.ceil(w/(2*scale*step))*step;x<=w/(2*scale);x+=step){strokeLine(xy(x,-h/(2*scale)),xy(x,h/(2*scale)),palette.faint);if(Math.abs(x)>step*.1)label(fixed(x,step<1?1:0),xy(x,0)[0],oy+15,palette.muted,'center','10px -apple-system,sans-serif');}
    for(let y=-Math.ceil(h/(2*scale*step))*step;y<=h/(2*scale);y+=step){strokeLine(xy(-w/(2*scale),y),xy(w/(2*scale),y),palette.faint);if(Math.abs(y)>step*.1)label(fixed(y,step<1?1:0),ox-9,xy(0,y)[1],palette.muted,'right','10px -apple-system,sans-serif');}
  }
  if(state.grid==='polar'||state.grid==='both'){
    ctx.strokeStyle=palette.grid;ctx.lineWidth=.7;
    for(let r=step;r<=maxRadius;r+=step){ctx.beginPath();ctx.arc(ox,oy,r*scale,0,TAU);ctx.stroke();if(r<state.viewRadius*.8&&state.grid==='polar'){const pos=xy(r*Math.cos(.17),r*Math.sin(.17));label(fixed(r,step<1?1:0),pos[0]+3,pos[1]-6,palette.muted,'left','9px -apple-system,sans-serif');}}
    for(let i=0;i<12;i++){const a=i*Math.PI/6;strokeLine([ox,oy],xy(maxRadius*Math.cos(a),maxRadius*Math.sin(a)),palette.faint);const r=state.viewRadius*.87;const pos=xy(r*Math.cos(a),r*Math.sin(a));if(i!==0&&i!==3&&i!==6&&i!==9)label(formatPi(a),pos[0],pos[1],palette.muted,'center','10px Georgia');}
  }
  if(state.grid!=='none'){
    strokeLine([15,oy],[w-15,oy],'#c3cfc0',.9);strokeLine([ox,14],[ox,h-14],'#c3cfc0',.9);
    label('x',w-19,oy-12,palette.ink);label('y',ox+12,17,palette.ink);
    if(state.grid==='polar'){label('π',24,oy-14);label('π/2',ox-18,22);label('3π/2',ox-24,h-21);}
  }
  if(state.id==='conic'&&check('show-directrix')){
    const d=state.p.e===0?Infinity:state.p.p/state.p.e,phi=state.p.phi??0,nx=Math.cos(phi),ny=Math.sin(phi);
    if(d < (w*Math.abs(nx)+h*Math.abs(ny))/(2*scale)){
      const lineLength=2*maxRadius,baseX=d*nx,baseY=d*ny;
      strokeLine(xy(baseX+lineLength*ny,baseY-lineLength*nx),xy(baseX-lineLength*ny,baseY+lineLength*nx),'#c69c67',1,[5,5]);
      const pos=xy(baseX,baseY);label('directrix',clamp(pos[0]+10,39,w-39),clamp(pos[1]-12,45,h-18),'#9b7548','center','10px -apple-system,sans-serif');
    }
    label('F',ox-12,oy+14,palette.orange,'right','italic 12px Georgia');
  }
  // Curves are partitioned by analytic domain before rasterization. View clipping is separate.
  let clipped=false;
  function path(limit,color,lineWidth){
    ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.lineCap='round';ctx.lineJoin='round';
    for(const part of state.parts){let active=false;for(const p of part){
      if(!p||p.theta>limit){active=false;continue;}
      const [x,y]=xy(p.x,p.y);
      if(Math.abs(x-ox)>w/2||Math.abs(y-oy)>h/2)clipped=true;
      if(Math.abs(x-ox)>w*15||Math.abs(y-oy)>h*15){active=false;continue;}
      if(active)ctx.lineTo(x,y);else ctx.moveTo(x,y);active=true;
    }}ctx.stroke();
  }
  if(check('show-preview'))path(state.end,'#b5ccba',1.7);
  const grad=ctx.createLinearGradient(0,h,w,0);grad.addColorStop(0,'#638b69');grad.addColorStop(.6,palette.green);grad.addColorStop(1,'#1f7666');
  path(state.theta,grad,2.5);
  if(check('show-ray')){
    const rayLength=state.viewRadius*.77,theta=state.theta;
    const rayEnd=xy(rayLength*Math.cos(theta),rayLength*Math.sin(theta));
    strokeLine([ox,oy],rayEnd,'#c8966b',1,[5,4]);
    const angle=theta%TAU;ctx.beginPath();ctx.arc(ox,oy,29,0,-angle,angle>0);ctx.strokeStyle='#c8966b';ctx.lineWidth=1;ctx.stroke();
    label('θ',ox+40*Math.cos(angle/2),oy-40*Math.sin(angle/2),palette.orange,'center','italic 13px Georgia');
    label('ray θ',rayEnd[0]+7,rayEnd[1]-8,palette.orange,'left','10px -apple-system,sans-serif');
  }
  let offscreen=false;
  if(point){
    const pos=xy(point.x,point.y);offscreen=pos[0]<0||pos[0]>w||pos[1]<0||pos[1]>h;
    if(check('show-ray')){
      const scaleDown=Math.min(1,Math.max(w,h)*3/Math.max(1,Math.hypot(pos[0]-ox,pos[1]-oy)));
      arrow([ox,oy],[ox+(pos[0]-ox)*scaleDown,oy+(pos[1]-oy)*scaleDown],palette.orange,1.7);
      if(!offscreen&&Math.abs(point.r)*scale>50)label(point.r<0?'r < 0':'r',ox+(pos[0]-ox)*.56+9,oy+(pos[1]-oy)*.56-9,palette.orange,'left','italic 13px Georgia');
    }
    if(check('show-tangent')&&point.tangent&&!offscreen){
      const [tx,ty]=point.tangent,length=(w+h)/scale;
      strokeLine(xy(point.x-length*tx,point.y-length*ty),xy(point.x+length*tx,point.y+length*ty),'#88709299',1.15,point.kind==='regular'?[]:[5,4]);
    }
    if(!offscreen){
      ctx.beginPath();ctx.arc(...pos,11,0,TAU);ctx.fillStyle='#bc76471a';ctx.fill();
      ctx.beginPath();ctx.arc(...pos,5,0,TAU);ctx.fillStyle=palette.orange;ctx.fill();ctx.strokeStyle='#fffefa';ctx.lineWidth=2;ctx.stroke();
      label('P',pos[0]+14,pos[1]-13,palette.ink,'center','italic 16px Georgia');
    }
  }
  ctx.beginPath();ctx.arc(ox,oy,2.8,0,TAU);ctx.fillStyle=palette.ink;ctx.fill();label('O',ox-9,oy-11,palette.muted,'right','italic 11px Georgia');
  ctx.restore();
  $('clipping-note').textContent=clipped?'Curve continues beyond the viewing window.':'';
  $('domain-alert').hidden=!!point&&!offscreen;
  $('domain-alert').textContent=offscreen?'The point is outside this finite view. Zoom out to find it.':state.id==='lemniscate'?'No real radius here: cos(2θ) < 0.':state.id==='conic'?'No finite physical point: the denominator must be positive.':'The curve is undefined at this angle.';
}

function drawRadiusGraph(point){
  const {width:w,height:h}=canvasSize(graph,gctx),pad=4;
  const values=state.parts.flat().filter(Boolean).map(p=>Math.abs(p.r));const maxR=Math.max(.1,Math.min(state.viewRadius*1.7,Math.max(...values)));
  const gx=t=>pad+(t-state.start)/(state.end-state.start)*(w-2*pad),gy=r=>h/2-r/maxR*(h/2-9);
  gctx.clearRect(0,0,w,h);gctx.save();gctx.beginPath();gctx.rect(0,0,w,h);gctx.clip();
  gctx.fillStyle='#bc764709';gctx.fillRect(0,h/2,w,h/2);gctx.beginPath();gctx.moveTo(0,h/2);gctx.lineTo(w,h/2);gctx.strokeStyle='#cbd7c8';gctx.lineWidth=1;gctx.stroke();
  gctx.font='9px -apple-system,sans-serif';gctx.fillStyle=palette.muted;gctx.fillText('+',0,10);gctx.fillText('−',0,h-3);
  for(const part of state.parts){gctx.beginPath();let active=false;for(const p of part){if(!p||Math.abs(p.r)>maxR*20){active=false;continue;}const x=gx(p.theta),y=gy(p.r);if(active)gctx.lineTo(x,y);else gctx.moveTo(x,y);active=true;}gctx.strokeStyle='#94b397';gctx.lineWidth=1.6;gctx.stroke();}
  const tx=gx(state.theta);gctx.beginPath();gctx.moveTo(tx,0);gctx.lineTo(tx,h);gctx.strokeStyle='#bc764780';gctx.lineWidth=1;gctx.setLineDash([3,3]);gctx.stroke();gctx.setLineDash([]);
  if(point){gctx.beginPath();gctx.arc(tx,gy(point.r),3.8,0,TAU);gctx.fillStyle=palette.orange;gctx.fill();}
  gctx.restore();
}

function updatePointText(point){
  $('theta').value=Math.round((state.theta-state.start)/(state.end-state.start)*10000);
  $('theta-output').textContent=`${formatPi(state.theta)} = ${fixed(state.theta,3)} rad`;
  $('angle-value').textContent=formatPi(state.theta);
  $('radius-value').textContent=point?fixed(point.r):'undefined';$('distance-value').textContent=point?fixed(Math.abs(point.r)):'—';
  $('point-value').textContent=point?`(${fixed(point.x,2)}, ${fixed(point.y,2)})`:'no real point';
  $('point-state').textContent=!point?'Outside the curve’s domain':point.kind==='stationary'?'Cusp · zero velocity':point.kind==='pole-limit'?'Pole · branch tangent limit':Math.abs(point.r)<1e-9?'At the pole':point.r<0?'Negative radius · opposite the ray':'Positive radius';
  $('velocity-value').textContent=point?`(x′, y′) = (${fixed(point.dx)}, ${fixed(point.dy)})`:'(x′, y′) undefined';
  $('area-value').textContent=point?`dA/dθ = r²/2 = ${fixed(point.r*point.r/2)}`:'No finite swept-area value at this angle.';
  let text='No real point at this angle, so there is no tangent to display.';
  if(point?.kind==='regular')text=Math.abs(point.r)<1e-9?'A regular passage through the pole: the nonzero derivative gives the radial tangent.':Number.isFinite(point.slope)?`Regular tangent · slope dy/dx = ${fixed(point.slope)}`:'Vertical tangent · x′ = 0 and y′ ≠ 0.';
  if(point?.kind==='stationary')text='Cusp: x′ = y′ = 0. The ordinary derivative does not define a tangent. The dashed line is the limiting tangent.';
  if(point?.kind==='pole-limit')text='At this pole, r′ is unbounded. The dashed line is the selected branch’s limiting tangent; the other branch has a different tangent.';
  $('tangent-status').textContent=text;
  $('tangent-equation').textContent=point?.tangent?`Tangent line: ${fixed(-point.tangent[1])}(x − ${fixed(point.x)}) + ${fixed(point.tangent[0])}(y − ${fixed(point.y)}) = 0`:'The slope is not approximated with a nearby secant.';
  canvas.setAttribute('aria-label',`${choose().name}. Theta ${fixed(state.theta)} radians. ${point?`Signed radius ${fixed(point.r)}; x ${fixed(point.x)}, y ${fixed(point.y)}.`:'Outside the real domain.'} Arrow keys change theta; Space plays or pauses; plus and minus zoom; Home restarts.`);
}

function draw(){const point=pointAt(state.id,state.p,state.theta);drawScene(point);drawRadiusGraph(point);updatePointText(point);}
function requestDraw(){if(state.frame)return;state.frame=requestAnimationFrame(()=>{state.frame=0;draw();});}
function setPlaying(on){cancelAnimationFrame(state.animationFrame);state.playing=on;state.lastTime=0;$('play-label').textContent=on?'Pause':'Play';$('play-symbol').textContent=on?'Ⅱ':'▶';$('play').setAttribute('aria-label',on?'Pause angle animation':'Play angle animation');if(on)state.animationFrame=requestAnimationFrame(animate);}
function animate(now){if(!state.playing)return;const elapsed=state.lastTime?Math.min((now-state.lastTime)/1000,.1):0;state.lastTime=now;state.theta+=elapsed*Number($('speed').value);if(state.theta>state.end)state.theta=state.start+(state.theta-state.start)%(state.end-state.start);draw();state.animationFrame=requestAnimationFrame(animate);}
function setTheta(t){state.theta=clamp(t,state.start,state.end);requestDraw();}
function zoom(factor){state.viewRadius=clamp(state.viewRadius*factor,.001,1e9);requestDraw();}

$('curve').addEventListener('change',()=>selectCurve($('curve').value));
$('lecture-example').addEventListener('change',()=>{const example=LECTURE_EXAMPLES.find(e=>e.id===$('lecture-example').value);if(example)selectCurve(example.curve,example.p);});
$('play').addEventListener('click',()=>setPlaying(!state.playing));
$('reset').addEventListener('click',()=>{setPlaying(false);state.theta=state.start;updateCurve(true);});
$('theta').addEventListener('input',()=>{setPlaying(false);setTheta(state.start+Number($('theta').value)/10000*(state.end-state.start));});
for(const id of ['show-ray','show-tangent','show-preview','show-directrix'])$(id).addEventListener('change',requestDraw);
for(const button of document.querySelectorAll('[data-grid]'))button.addEventListener('click',()=>{state.grid=button.dataset.grid;for(const b of document.querySelectorAll('[data-grid]')){b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));}requestDraw();});
$('zoom-in').addEventListener('click',()=>zoom(.8));$('zoom-out').addEventListener('click',()=>zoom(1.25));$('fit').addEventListener('click',()=>updateCurve(true));
$('apply-interval').addEventListener('click',()=>{
  const from=$('interval-start').value,to=$('interval-end').value,a=Number(from),b=Number(to);
  if(from.trim()===''||to.trim()===''||!Number.isFinite(a)||!Number.isFinite(b)||a>=b||a < -12||b>12){$('interval-message').textContent='Choose finite multiples of π with −12 ≤ start < end ≤ 12.';return;}
  setPlaying(false);state.start=a*Math.PI;state.end=b*Math.PI;state.theta=state.start;syncInterval();updateCurve();$('interval-message').textContent='Custom interval applied. Repeated tracing counts area repeatedly.';
});
$('default-interval').addEventListener('click',()=>{setPlaying(false);[state.start,state.end]=choose().interval(state.p);state.theta=state.start;syncInterval();updateCurve();$('interval-message').textContent='The curve’s default interval is restored.';});
for(const b of document.querySelectorAll('[data-e]'))b.addEventListener('click',()=>selectCurve('conic',{p:state.p.p,e:Number(b.dataset.e),phi:state.p.phi??0},state.p.phi??0));
for(const b of document.querySelectorAll('[data-lesson]'))b.addEventListener('click',()=>{
  const lesson=b.dataset.lesson;
  if(lesson==='negative')selectCurve('offset-circle',{},3*Math.PI/4);
  if(lesson==='cusp')selectCurve('cardioid',{},Math.PI);
  if(lesson==='lemniscate')selectCurve('lemniscate',{},Math.PI/4);
  if(lesson==='kepler')selectCurve('conic',{e:1.5},0);
  $('demonstration').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
});
function keyControl(event){
  if(['ArrowLeft','ArrowRight','Home','End',' ','+','=','-','_'].includes(event.key))event.preventDefault();else return;
  if(event.key===' '){setPlaying(!state.playing);return;}
  if(event.key==='+'||event.key==='='){zoom(.8);return;}if(event.key==='-'||event.key==='_'){zoom(1.25);return;}
  setPlaying(false);if(event.key==='Home')setTheta(state.start);else if(event.key==='End')setTheta(state.end);else setTheta(state.theta+(event.key==='ArrowRight'?1:-1)*(event.shiftKey?.1:.01));
}
canvas.addEventListener('keydown',keyControl);graph.addEventListener('keydown',keyControl);
canvas.addEventListener('wheel',event=>{if(event.ctrlKey||event.metaKey)return;event.preventDefault();zoom(event.deltaY>0?1.08:1/1.08);},{passive:false});
let graphDragging=false;
function graphSeek(event){const bounds=graph.getBoundingClientRect();setPlaying(false);setTheta(state.start+clamp((event.clientX-bounds.left-4)/(bounds.width-8),0,1)*(state.end-state.start));}
graph.addEventListener('pointerdown',event=>{graphDragging=true;graph.setPointerCapture(event.pointerId);graphSeek(event);});graph.addEventListener('pointermove',event=>{if(graphDragging)graphSeek(event);});graph.addEventListener('pointerup',()=>{graphDragging=false;});graph.addEventListener('pointercancel',()=>{graphDragging=false;});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('demonstration').requestFullscreen();}catch{$('interval-message').textContent='Fullscreen is unavailable in this browser.';}});
document.addEventListener('fullscreenchange',()=>{$('fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen');$('fullscreen').title=document.fullscreenElement?'Exit fullscreen':'Enter fullscreen';requestDraw();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPlaying(false);});
new ResizeObserver(requestDraw).observe($('canvas-wrap'));
new ResizeObserver(requestDraw).observe(graph);
selectCurve('rose');
