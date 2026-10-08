import {PRESETS,evaluate} from './math.mjs';
import {PDESurfaceRenderer} from './renderer.mjs';

const $=id=>document.getElementById(id);
const TAU=2*Math.PI;
const state={kind:'wave',preset:'traveling',t:0,params:{speed:1,frequency:1,diffusion:.25,sigma:.85},probe:[.7,.4],mesh:true,contours:true,flux:false,playing:!matchMedia('(prefers-reduced-motion: reduce)').matches,view:'perspective'};
const renderer=new PDESurfaceRenderer($('surface'),$('overlay'));
let last=0,lastDraw=0,frameCount=0,lastResidual=0,lastMean=null;
const laws={
 wave:{label:'WAVE EQUATION',law:'u<sub>tt</sub> = c²(u<sub>xx</sub> + u<sub>yy</sub>)',description:'Acceleration follows spatial curvature.',rate:'ACCELERATION u<sub>tt</sub>',residual:'u<sub>tt</sub> − c²Δu',flow:'Energy flow',caption:'The sum of the two spatial curvatures determines the acceleration.',question:'Double c. What happens to wave speed and to the tempo of a standing wave?',answer:'A traveling wave moves twice as fast. A standing wave oscillates twice as fast. For the same spatial profile, the factor c² makes acceleration four times as large. These waves do not lose amplitude as time passes.'},
 laplace:{label:'LAPLACE EQUATION',law:'u<sub>xx</sub> + u<sub>yy</sub> = 0',description:'Two spatial curvatures cancel exactly.',rate:'TOTAL CURVATURE Δu',residual:'u<sub>xx</sub> + u<sub>yy</sub>',flow:'Potential flow',caption:'One direction can curve upward while the other curves downward. Their sum is zero.',question:'Can a nonconstant harmonic function have a strict local maximum in the interior?',answer:'No. On every sufficiently small circle, the average value equals the value at the center. A strict local maximum would make every point of a small circle lower than the center, contradicting that equality. Boundary maxima are allowed.'},
 heat:{label:'HEAT EQUATION',law:'u<sub>t</sub> = κ(u<sub>xx</sub> + u<sub>yy</sub>)',description:'Spatial curvature sets the rate of change.',rate:'RATE OF CHANGE u<sub>t</sub>',residual:'u<sub>t</sub> − κΔu',flow:'Heat flow',caption:'Negative total curvature lowers a peak; positive total curvature fills a depression.',question:'Which Fourier pattern fades faster: frequency k = 1 or frequency k = 4?',answer:'Frequency 4 fades 16 times as fast as frequency 1 for the same type of mode: each decay rate contains κk². Diffusion therefore erases fine detail before broad structure. The localized peak also spreads while its height decreases.'}
};
const titleByPreset={traveling:'A traveling wave',standing:'A standing wave',membrane:'A vibrating membrane',saddle:'A harmonic saddle',ripple:'A harmonic ripple',cubic:'A harmonic cubic',gaussian:'A spreading heat pulse',fourier:'Fine detail fades first',single:'A decaying Fourier mode'};
const lessonTitles={traveling:'The pattern moves. Its shape stays.',standing:'Nodes stay still. The field oscillates.',membrane:'A membrane breathes in two dimensions.',saddle:'Opposite curvatures. Perfect balance.',ripple:'Boundary variation reaches into the field.',cubic:'A saddle with threefold symmetry.',gaussian:'The peak falls. The heat spreads.',fourier:'Diffusion removes the fine detail first.',single:'A wave-shaped pattern that never travels.'};
function presetMeta(){return PRESETS[state.kind].find(p=>p.id===state.preset);}
function value(x,y){return evaluate(state.kind,state.preset,x,y,state.t,state.params);}
function duration(){return state.kind==='wave'?TAU/(state.params.frequency*state.params.speed*(state.preset==='membrane'?Math.SQRT2:1)):state.kind==='laplace'?TAU:12;}
function n(v,d=3){return (Math.abs(v)<.5*10**(-d)?0:v).toFixed(d);}
function text(id,s){$(id).textContent=s;}
function html(id,s){$(id).innerHTML=s;}
function updatePlay(){const lap=state.kind==='laplace';text('play',state.playing?'Ⅱ':'▶');$('play').setAttribute('aria-label',state.playing?(lap?'Stop moving the probe':'Pause animation'):(lap?'Move the probe':'Play animation'));text('motion-status',lap?(state.playing?'STATIC FIELD · MOVING PROBE':'STATIC HARMONIC FIELD'):(state.playing?'EXACT SOLUTION · LIVE':'EXACT SOLUTION · PAUSED'));}
function selectKind(kind){state.kind=kind;state.preset=PRESETS[kind][0].id;state.t=0;state.probe=[.7,.4];state.playing=kind!=='laplace'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;document.body.dataset.kind=kind;for(const button of document.querySelectorAll('button[data-kind]')){const active=button.dataset.kind===kind;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));}$('preset').replaceChildren(...PRESETS[kind].map(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.title;return o;}));refreshMetadata();syncProbe();render();}
function refreshMetadata(){const law=laws[state.kind],p=presetMeta();text('scene-label',law.label);text('scene-title',titleByPreset[state.preset]||p.title);html('law',law.law);text('law-description',law.description);html('rate-label',law.rate);html('residual-formula',law.residual);text('flux-label',law.flow);text('curvature-caption',law.caption);text('solution-formula',p.formula);text('domain-note',p.boundary||p.domain);text('lesson-title',lessonTitles[state.preset]||p.title);text('lesson',p.lesson);$('derivation').replaceChildren(...(Array.isArray(p.derivation)?p.derivation:[p.derivation]).filter(Boolean).map(s=>{const el=document.createElement('p');el.textContent=s;return el;}));text('question',law.question);text('answer',law.answer);$('answer').hidden=true;$('answer-toggle').setAttribute('aria-expanded','false');$('speed-control').hidden=state.kind!=='wave';$('diffusion-control').hidden=state.kind!=='heat';$('sigma-control').hidden=state.kind!=='heat'||state.preset!=='gaussian';$('frequency-control').hidden=state.kind==='laplace'&&state.preset!=='ripple'||state.kind==='heat'&&state.preset==='gaussian';$('time').max=duration();text('timeline-title',state.kind==='laplace'?'PROBE ANGLE θ · FIELD IS STATIC':'TIME t · '+(state.kind==='wave'?'ONE PERIOD':'DIFFUSION'));text('plot-kicker',state.kind==='laplace'?'THE MEAN-VALUE PROPERTY':'A SLICE THROUGH THE SURFACE');text('plot-title',state.kind==='laplace'?'A circle averages to its center':state.kind==='heat'?'Watch the profile smooth out':'Follow one row of the wave');text('plot-legend',state.kind==='laplace'?'u on the yellow circle':'u(x, y₀, t)');text('plot-description',state.kind==='laplace'?'The yellow ring has radius 0.65. The dashed line is the value at its center; the circle’s average matches it. The plot rescales locally to show variation; the average uses 128 equally spaced samples.':'The highlighted trace follows the selected y coordinate. Its vertical scale stays fixed as time changes.');$('mean-value').hidden=state.kind!=='laplace';updatePlay();}
function syncProbe(){for(let i=0;i<2;i++){const a=i?'y':'x';$('probe-'+a).value=state.probe[i];text('probe-'+a+'-value',n(state.probe[i],2));}}
function updateReadouts(){const p=value(...state.probe);text('probe-u',n(p.u));text('probe-rate',n(state.kind==='wave'?p.utt:state.kind==='heat'?p.ut:p.uxx+p.uyy));lastResidual=p.residual;text('residual',Math.abs(p.residual)<1e-10?'0.000':p.residual.toExponential(2));const vals=[p.uxx,p.uyy,p.uxx+p.uyy],scale=Math.max(.2,...vals.map(Math.abs));for(let i=0;i<3;i++){const key=['xx','yy','sum'][i];text(i===2?'laplacian':key,n(vals[i]));$('bar-'+key).style.width=(Math.abs(vals[i])/scale*55)+'%';}text('time-output',n(state.t,2)+(state.kind==='laplace'?' rad':''));$('time').value=state.t;}
function drawPlot(){
 const c=$('slice'),rect=c.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
 const w=Math.max(1,rect.width),h=rect.height;
 if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);}
 const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const pad={l:42,r:18,t:18,b:29},lap=state.kind==='laplace',raw=[];
 for(let i=0;i<=240;i++){const z=i/240,x=lap?state.probe[0]+.65*Math.cos(z*TAU):-Math.PI+z*TAU,yy=lap?state.probe[1]+.65*Math.sin(z*TAU):state.probe[1];raw.push(value(x,yy).u);}
 let lo=-1.15,hi=1.15;
 if(lap){lo=Math.min(...raw);hi=Math.max(...raw);const margin=Math.max((hi-lo)*.15,.025);lo-=margin;hi+=margin;}
 const y=v=>pad.t+(hi-v)/(hi-lo)*(h-pad.t-pad.b),px=v=>pad.l+v*(w-pad.l-pad.r);
 ctx.font='10px system-ui';ctx.textAlign='right';ctx.strokeStyle='#263750';ctx.fillStyle='#7d92b4';
 const ticks=lap?[lo,(lo+hi)/2,hi]:[-1,0,1];
 for(const v of ticks){ctx.beginPath();ctx.moveTo(pad.l,y(v));ctx.lineTo(w-pad.r,y(v));ctx.stroke();ctx.fillText(n(v,lap?2:0),pad.l-7,y(v)+3);}
 const accent=getComputedStyle(document.body).getPropertyValue('--accent').trim();
 ctx.beginPath();raw.forEach((v,i)=>i?ctx.lineTo(px(i/240),y(v)):ctx.moveTo(px(0),y(v)));ctx.strokeStyle=accent;ctx.lineWidth=2.5;ctx.shadowColor=accent;ctx.shadowBlur=9;ctx.stroke();ctx.shadowBlur=0;ctx.lineWidth=1;
 ctx.fillStyle='#8ba0c0';ctx.textAlign='center';for(let j=0;j<3;j++)ctx.fillText(lap?['0','π','2π'][j]:['−π','0','π'][j],px(j/2),h-8);ctx.textAlign='right';ctx.fillText(lap?'θ':'x',w-1,h-8);
 if(lap){
  const u=value(...state.probe).u;ctx.setLineDash([4,4]);ctx.strokeStyle='#edcd8b';ctx.beginPath();ctx.moveTo(pad.l,y(u));ctx.lineTo(w-pad.r,y(u));ctx.stroke();ctx.setLineDash([]);
  let mean=0;for(let i=0;i<128;i++){const a=i/128*TAU;mean+=value(state.probe[0]+.65*Math.cos(a),state.probe[1]+.65*Math.sin(a)).u/128;}
  lastMean={average:mean,center:u,error:mean-u};text('circle-average',n(mean));text('center-value',n(u));text('mean-error',Math.abs(mean-u)<1e-10?'0.000':(mean-u).toExponential(2));
 }else{lastMean=null;ctx.fillStyle='#ffe59c';ctx.beginPath();ctx.arc(px((state.probe[0]+Math.PI)/TAU),y(value(...state.probe).u),4,0,TAU);ctx.fill();}
}
function render(){renderer.update({evaluate:value,t:state.t,kind:state.kind,preset:state.preset,params:state.params,mesh:state.mesh,contours:state.contours,flux:state.flux,probe:state.probe,ringRadius:state.kind==='laplace'?.65:null,palette:state.kind});renderer.draw();updateReadouts();drawPlot();frameCount++;}
for(const button of document.querySelectorAll('button[data-kind]'))button.addEventListener('click',()=>selectKind(button.dataset.kind));
$('preset').addEventListener('change',()=>{state.preset=$('preset').value;state.t=0;refreshMetadata();render();});
for(const key of ['speed','frequency','diffusion','sigma'])$(key).addEventListener('input',()=>{state.params[key]=Number($(key).value);state.t=0;text(key+'-value',n(state.params[key],key==='frequency'?0:2));$('time').max=duration();render();});
for(const key of ['mesh','contours','flux'])$(key).addEventListener('change',()=>{state[key]=$(key).checked;render();});
for(let i=0;i<2;i++)$('probe-'+(i?'y':'x')).addEventListener('input',e=>{state.probe[i]=Number(e.target.value);if(state.kind==='laplace'){state.playing=false;updatePlay();}syncProbe();render();});
$('play').addEventListener('click',()=>{if(!state.playing&&state.t>=duration())state.t=0;state.playing=!state.playing;last=0;updatePlay();render();});
$('time').addEventListener('input',()=>{state.t=Number($('time').value);state.playing=false;if(state.kind==='laplace'){state.probe=[1.2*Math.cos(state.t),1.2*Math.sin(state.t)];syncProbe();}updatePlay();render();});
$('restart').addEventListener('click',()=>{state.t=0;if(state.kind==='laplace'){state.probe=[.7,.4];syncProbe();}render();});
$('view').addEventListener('click',()=>{state.view=renderer.getSnapshot().view==='top'?'perspective':'top';renderer.setView(state.view);$('view').setAttribute('aria-pressed',String(state.view==='top'));text('view',state.view==='top'?'3D view':'Top view');render();});
$('surface').addEventListener('pointermove',()=>{state.view=renderer.getSnapshot().view;$('view').setAttribute('aria-pressed',String(state.view==='top'));text('view',state.view==='top'?'3D view':'Top view');});
$('camera-reset').addEventListener('click',()=>{state.view='perspective';renderer.reset();$('view').setAttribute('aria-pressed','false');text('view','Top view');render();});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('scene-shell').requestFullscreen();}catch(e){text('motion-status','Use browser fullscreen to enlarge this view.');}});
$('answer-toggle').addEventListener('click',()=>{const hidden=!$('answer').hidden;$('answer').hidden=hidden;$('answer-toggle').setAttribute('aria-expanded',String(!hidden));});
new ResizeObserver(()=>render()).observe($('scene-shell'));
document.addEventListener('visibilitychange',()=>{last=0;});
function animate(now){if(last&&state.playing&&!document.hidden){const dt=Math.min((now-last)/1000,.05);state.t+=dt;if(state.t>=duration()){if(state.kind==='heat'){state.t=duration();state.playing=false;updatePlay();}else state.t%=duration();}if(state.kind==='laplace'){state.probe=[1.2*Math.cos(state.t),1.2*Math.sin(state.t)];syncProbe();}}last=now;if(state.playing&&now-lastDraw>28){render();lastDraw=now;}requestAnimationFrame(animate);}
if(!renderer.available){$('render-error').hidden=false;text('render-error',renderer.error||'The 3D view needs WebGL. The equations, slice plots, and probe calculations remain available.');}
selectKind(new URLSearchParams(location.search).get('pde') in laws?new URLSearchParams(location.search).get('pde'):'wave');
const requestedPreset=new URLSearchParams(location.search).get('preset');if(PRESETS[state.kind].some(p=>p.id===requestedPreset)){state.preset=requestedPreset;$('preset').value=requestedPreset;refreshMetadata();render();}
requestAnimationFrame(animate);
window.pdeFieldLab={getState:()=>({...state,params:{...state.params},probe:[...state.probe],frames:frameCount,residual:lastResidual,mean:lastMean,renderer:renderer.getSnapshot()}),evaluate:(x,y,t=state.t)=>evaluate(state.kind,state.preset,x,y,t,state.params),selectKind};
