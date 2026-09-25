(function () {
  'use strict';
  const O = window.Orbits, $ = id => document.getElementById(id);
  const canvas = $('space'), ctx = canvas.getContext('2d'), stage = $('stage');
  let width = 800, height = 600, yaw = -.45, tilt = .78, zoom = 1, view = 'focus', focusIndex = 2, time = 0;
  let playing = !window.matchMedia('(prefers-reduced-motion: reduce)').matches, lastFrame = null, metricsAt = 0;
  const enabled = O.planets.map(() => true), paths = O.planets.map(p => O.orbit(p, 300));
  const colors = {r:'#65d4e2',force:'#ffae7a',v:'#addec4',h:'#c1a3fa'};
  let sectors = [], sectorPlanet = -1, sectorCount = -1, dragging = null;
  let labelBoxes = [];
  const stars = Array.from({length:95}, (_,j) => ({x: ((j*73.713)%97)/97, y:((j*27.129)%89)/89, a:.11+((j*7)%13)/80, s: j%9===0 ? 1.1 : .6}));
  $('focus').innerHTML = O.planets.map((p,j) => `<option value="${j}"${j===2?' selected':''}>${p.name}</option>`).join('');
  ['focus','interval','speed'].forEach(id => { $(id+'Fs').innerHTML=$(id).innerHTML; $(id+'Fs').value=$(id).value; });
  $('planets').innerHTML = O.planets.map((p,j) => `<label class="planet-toggle"><input type="checkbox" checked data-planet="${j}" aria-label="Show ${p.name}"><span class="planet-dot" style="background:${p.color}"></span>${p.name}</label>`).join('');
  const checkIds = ['showRadius','showForce','showVelocity','showMomentum','showAreas'];
  const flags = Object.fromEntries(checkIds.map(id => [id, $(id).checked]));
  checkIds.forEach(id => {
    $(id).addEventListener('change', () => {flags[id] = $(id).checked; $(id+'Fs').checked=flags[id]; render();});
    $(id+'Fs').addEventListener('change', () => {$(id).checked=$(id+'Fs').checked; $(id).dispatchEvent(new Event('change'));});
  });
  function focused() { return O.planets[focusIndex]; }
  function extent() {
    if (view === 'focus') return focused().a*(1+focused().e);
    return Math.max(1,...O.planets.filter((_,j) => enabled[j]).map(p=>p.a*(1+p.e)));
  }
  function unitScale() { return Math.min(width, height)*.355*zoom/extent(); }
  function project(v) {
    const x = Math.cos(yaw)*v[0] - Math.sin(yaw)*v[1];
    const y = Math.sin(yaw)*v[0] + Math.cos(yaw)*v[1];
    const vertical = Math.sin(tilt)*y + Math.cos(tilt)*v[2];
    return [width*.5 + x*unitScale(), height*.55 - vertical*unitScale(), -Math.cos(tilt)*y+Math.sin(tilt)*v[2]];
  }
  function inFrame(p, margin=45) { return p[0]>-margin && p[0]<width+margin && p[1]>-margin && p[1]<height+margin; }
  function drawPath(points, stroke, lineWidth=1, fill=null) {
    ctx.beginPath();
    points.forEach((p,j)=>{const q=project(p); if(j===0)ctx.moveTo(q[0],q[1]);else ctx.lineTo(q[0],q[1]);});
    if (fill) {ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();}
  }
  function tag(text, x, y, color, size=13, align='left') {
    ctx.font=`600 ${size}px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif`;ctx.textAlign=align;
    ctx.lineWidth=4;ctx.strokeStyle='#102437';ctx.strokeText(text,x,y);ctx.fillStyle=color;ctx.fillText(text,x,y);
  }
  function arrow(origin, vector, color, label, width=2.4) {
    const a=project(origin), b=project(O.add(origin,vector));
    if(!inFrame(a)||!inFrame(b))return;
    const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
    if(length<2){
      ctx.beginPath();ctx.arc(a[0],a[1],6,0,O.TAU);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
      if(b[2]>=a[2]){ctx.beginPath();ctx.arc(a[0],a[1],2,0,O.TAU);ctx.fillStyle=color;ctx.fill();}
      else{ctx.beginPath();ctx.moveTo(a[0]-3,a[1]-3);ctx.lineTo(a[0]+3,a[1]+3);ctx.moveTo(a[0]+3,a[1]-3);ctx.lineTo(a[0]-3,a[1]+3);ctx.stroke();}
      tag(label,a[0]+10,a[1]-10,color);return;
    }
    const ux=dx/length,uy=dy/length,head=Math.min(10,length*.3);
    ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0]-ux*head*.7,b[1]-uy*head*.7);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
    ctx.beginPath();ctx.moveTo(b[0],b[1]);ctx.lineTo(b[0]-ux*head+uy*head*.43,b[1]-uy*head-ux*head*.43);ctx.lineTo(b[0]-ux*head-uy*head*.43,b[1]-uy*head+ux*head*.43);ctx.closePath();ctx.fillStyle=color;ctx.fill();
    tag(label,b[0]+8,b[1]-8,color,14);
  }
  function makeSectors() {
    const count=Number($('interval').value);
    if(sectorPlanet===focusIndex && sectorCount===count)return;
    sectorPlanet=focusIndex;sectorCount=count;
    sectors=Array.from({length:count},(_,j)=>O.sector(focused(),O.TAU*j/count,O.TAU*(j+1)/count,40));
  }
  function drawSectors(state) {
    makeSectors();
    const current=Math.floor(O.mod(state.M,O.TAU)/O.TAU*sectorCount);
    sectors.forEach((sector,j)=>{
      const color=j%2===0?'231,193,109':'68,150,166';
      drawPath(sector,`rgba(${color},${j===current?.57:.23})`,j===current?1.6:.65,`rgba(${color},${j===current?.31:.10})`);
    });
  }
  function drawGrid() {
    const ext=extent(),step=10**Math.floor(Math.log10(ext));
    const gridStep=ext/step<2?step/2:step;
    for(let j=-6;j<=6;j++){
      const t=j*gridStep;if(Math.abs(t)>ext*1.7)continue;
      drawPath([[-ext*1.55,t,0],[ext*1.55,t,0]],'#6589a20d');
      drawPath([[t,-ext*1.55,0],[t,ext*1.55,0]],'#6589a20d');
    }
  }
  function drawBody(p, s, isFocus) {
    const q=project(s.r);if(!inFrame(q))return;
    const radius=p.size*(isFocus?1.25:1);
    if(isFocus){ctx.beginPath();ctx.arc(q[0],q[1],radius+5,0,O.TAU);ctx.strokeStyle=p.color+'88';ctx.lineWidth=1;ctx.stroke();}
    if(p.name==='Saturn'){ctx.save();ctx.translate(q[0],q[1]);ctx.rotate(-.3);ctx.beginPath();ctx.ellipse(0,0,14,4,0,0,O.TAU);ctx.strokeStyle='#ead7a288';ctx.lineWidth=3;ctx.stroke();ctx.restore();}
    const grad=ctx.createRadialGradient(q[0]-radius*.3,q[1]-radius*.3,0,q[0],q[1],radius);grad.addColorStop(0,'#f5f5e9');grad.addColorStop(.3,p.color);grad.addColorStop(1,p.color+'60');
    ctx.fillStyle=grad;ctx.beginPath();ctx.arc(q[0],q[1],radius,0,O.TAU);ctx.fill();
    if(isFocus||view==='system'||p.a<focused().a*2){
      if(view==='system')placePlanetLabel(p.name,q,radius,isFocus?'#f8faf3':p.color,isFocus?13:11);
      else tag(p.name,q[0]+radius+9,q[1]+(isFocus?18:4),isFocus?'#f8faf3':p.color,isFocus?13:11);
    }
  }
  function placePlanetLabel(text,q,radius,color,size){
    ctx.font=`600 ${size}px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif`;
    const tw=ctx.measureText(text).width;
    const options=[[radius+9,4],[radius+12,-17],[radius+12,25],[-radius-12-tw,4],[-radius-12-tw,-17],[-radius-12-tw,25]];
    for(let reach=42;reach<=112;reach+=23)for(const angle of [-Math.PI/2,Math.PI/2,-Math.PI/4,Math.PI/4,-3*Math.PI/4,3*Math.PI/4,0,Math.PI]){
      const dx=Math.cos(angle)*reach;options.push([dx+(dx<0?-tw:0),Math.sin(angle)*reach]);
    }
    let chosen=null;
    for(const [dx,dy] of options){
      const box={x:q[0]+dx-3,y:q[1]+dy-size-3,w:tw+6,h:size+8};
      if(box.x<8||box.x+box.w>width-8||box.y<150||box.y+box.h>height-45)continue;
      if(labelBoxes.some(b=>box.x<b.x+b.w&&box.x+box.w>b.x&&box.y<b.y+b.h&&box.y+box.h>b.y))continue;
      chosen={box,x:q[0]+dx,y:q[1]+dy,dx,dy};break;
    }
    if(!chosen)return;
    labelBoxes.push(chosen.box);
    if(Math.abs(chosen.dy)>12||chosen.dx<0){
      ctx.beginPath();ctx.moveTo(q[0],q[1]);ctx.lineTo(chosen.x+(chosen.dx<0?tw:0),chosen.y-size*.35);ctx.strokeStyle=color+'50';ctx.lineWidth=.65;ctx.stroke();
    }
    tag(text,chosen.x,chosen.y,color,size);
  }
  function drawSun() {
    const q=project([0,0,0]),r=10,grad=ctx.createRadialGradient(q[0],q[1],0,q[0],q[1],32);grad.addColorStop(0,'#f9cc7766');grad.addColorStop(1,'#f9cc7700');ctx.fillStyle=grad;ctx.beginPath();ctx.arc(q[0],q[1],32,0,O.TAU);ctx.fill();ctx.fillStyle='#f1c267';ctx.beginPath();ctx.arc(q[0],q[1],r,0,O.TAU);ctx.fill();tag('Sun',q[0]-14,q[1]+27,'#dfc180',11);
    labelBoxes.push({x:q[0]-17,y:q[1]+13,w:33,h:19});
  }
  function drawTriad() {
    const px=width-62,py=height-63,base=project([0,0,0]);
    const vectors=[[1,0,0],[0,1,0],[0,0,1]],labels=['x','y','z'];
    vectors.forEach((v,j)=>{const end=project(v),dx=(end[0]-base[0])/unitScale()*27,dy=(end[1]-base[1])/unitScale()*27;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+dx,py+dy);ctx.strokeStyle='#617f92';ctx.lineWidth=1;ctx.stroke();tag(labels[j],px+dx+4,py+dy+3,'#7295a7',10);});
  }
  function render() {
    labelBoxes=[];
    ctx.clearRect(0,0,width,height);ctx.fillStyle='#102437';ctx.fillRect(0,0,width,height);
    const glow=ctx.createRadialGradient(width*.5,height*.55,0,width*.5,height*.55,width*.6);glow.addColorStop(0,'#19384a');glow.addColorStop(1,'#102437');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
    stars.forEach(s=>{ctx.fillStyle=`rgba(180,209,220,${s.a})`;ctx.beginPath();ctx.arc(s.x*width,s.y*height,s.s,0,O.TAU);ctx.fill();});
    drawGrid();
    const current=O.state(focused(),time);
    if(flags.showAreas&&enabled[focusIndex])drawSectors(current);
    O.planets.forEach((p,j)=>{if(enabled[j])drawPath(paths[j],p.color+(j===focusIndex?'b8':'45'),j===focusIndex?1.6:.85);});
    if(enabled[focusIndex]){
      const p=focused();
      if(flags.showRadius)arrow([0,0,0],current.r,colors.r,'r',1.9);
      if(flags.showMomentum)arrow([0,0,0],O.scale(current.h,.65*p.a/Math.sqrt(O.MU*p.a*(1-p.e*p.e))),colors.h,'h');
      if(flags.showVelocity)arrow(current.r,O.scale(current.v,.55*p.a/Math.sqrt(O.MU/p.a)),colors.v,'v');
      const referenceForce = p.mass * O.AU_METERS / O.YEAR_SECONDS ** 2 * O.MU / p.a ** 2;
      if(flags.showForce)arrow(current.r,O.scale(current.force,.40*p.a/referenceForce),colors.force,'F');
      // Mark the two ends of the focus orbit, which are especially useful for Mercury.
      if(view==='focus'){
        const near=project(O.stateAtMean(p,0).r),far=project(O.stateAtMean(p,Math.PI).r);
        if(inFrame(near))tag('perihelion',near[0],near[1]+23,'#8da6b4',9,'center');
        if(inFrame(far))tag('aphelion',far[0],far[1]+23,'#8da6b4',9,'center');
      }
    }
    drawSun();
    const bodies=O.planets.map((p,j)=>({p,j,s:O.state(p,time)})).filter(({j})=>enabled[j]).sort((a,b)=>project(a.s.r)[2]-project(b.s.r)[2]);
    bodies.forEach(({p,j,s})=>drawBody(p,s,j===focusIndex));drawTriad();
    if(!enabled[focusIndex]){tag(`${focused().name} is hidden`,width/2,height*.78,'#e4c88b',14,'center');tag('Enable its checkbox to restore the focus overlays.',width/2,height*.78+23,'#94adba',11,'center');}
  }
  function value(x,digits=4){return Math.abs(x)<.00005?'0.0000':x.toFixed(digits);}
  function vector(v){return `(${v.map(x=>value(x,3)).join(', ')})`;}
  function updateMetrics() {
    const p=focused(),s=O.state(p,time),count=Number($('interval').value),delta=p.period/count;
    $('radiusValue').textContent=s.radius.toFixed(3);$('velocityValue').textContent=(s.speed*149597870.7/(O.DAYS*86400)).toFixed(2);$('momentumValue').textContent=O.norm(s.h).toFixed(3);$('areaValue').textContent=(s.areaRate*delta).toPrecision(4);
    $('timeLabel').textContent=`Day ${(time*O.DAYS).toFixed(1)}`;
    $('timeLabelFs').textContent=$('timeLabel').textContent;
    if(document.activeElement!==$('timeline'))$('timeline').value=Math.round(O.mod(time,p.period)/p.period*1000);
    if(document.activeElement!==$('timelineFs'))$('timelineFs').value=Math.round(O.mod(time,p.period)/p.period*1000);
    const forceExponent = Math.floor(Math.log10(O.norm(s.force)));
    const forceDisplay = vector(O.scale(s.force,10**-forceExponent));
    $('vectorValues').innerHTML=`<div class="vector-line"><span>r · AU</span><span>${vector(s.r)}</span></div><div class="vector-line"><span>v · AU/yr</span><span>${vector(s.v)}</span></div><div class="vector-line"><span>F · 10<sup>${forceExponent}</sup> N</span><span>${forceDisplay}</span></div><div class="vector-line"><span>|F|</span><span>${O.norm(s.force).toExponential(3)} N</span></div><div class="vector-line"><span>h · AU²/yr</span><span>${vector(s.h)}</span></div><div class="vector-line"><span>Mass</span><span>${p.mass.toExponential(4)} kg</span></div>`;
  }
  function updateLabels() {
    const p=focused(),count=Number($('interval').value),number=enabled.filter(Boolean).length;
    $('eccentricity').textContent=p.e.toFixed(4);$('period').textContent=p.period<2?`${(p.period*O.DAYS).toFixed(1)} days`:`${p.period.toFixed(2)} years`;
    $('sceneTitle').textContent=view==='focus'?`${p.name} in focus`:'Our solar system';
    $('sceneSubtitle').textContent=view==='focus'?'Distances in astronomical units':`${p.name} selected · linear orbital scale`;
    $('intervalNote').textContent=`Δt = ${(p.period*O.DAYS/count).toFixed(2)} days. The active interval is highlighted; all ${count} complete sectors have equal area.`;
    $('liveBadge').textContent=number===8?'ALL 8 PLANETS ENABLED':`${number} OF 8 PLANETS ENABLED`;
    $('allPlanets').textContent=number===8?'Hide all':'Show all';
    $('scaleNote').textContent=view==='focus'?'Bodies & vector lengths enlarged for clarity':'True orbital distances · bodies enlarged for clarity';
    $('focusView').classList.toggle('active',view==='focus');$('systemView').classList.toggle('active',view==='system');
    $('focusView').setAttribute('aria-pressed',view==='focus');$('systemView').setAttribute('aria-pressed',view==='system');
    $('focusFs').value=$('focus').value;$('intervalFs').value=$('interval').value;
    updateMetrics();render();
  }
  function setPlay(next){playing=next;['play','playFs'].forEach(id=>{$(id).innerHTML=playing?'Ⅱ <span>Pause</span>':'▶ <span>Play</span>';$(id).setAttribute('aria-label',playing?'Pause animation':'Play animation');});}
  $('play').addEventListener('click',()=>setPlay(!playing));
  $('playFs').addEventListener('click',()=>setPlay(!playing));
  $('restart').addEventListener('click',()=>{time=0;updateMetrics();render();});
  $('restartFs').addEventListener('click',()=>$('restart').click());
  ['focus','interval','speed'].forEach(id=>$(id+'Fs').addEventListener('change',()=>{$(id).value=$(id+'Fs').value;$(id).dispatchEvent(new Event('change'));}));
  $('speed').addEventListener('change',()=>{$('speedFs').value=$('speed').value;});
  $('focus').addEventListener('change',()=>{focusIndex=Number($('focus').value);view='focus';zoom=1;enabled[focusIndex]=true;document.querySelector(`[data-planet="${focusIndex}"]`).checked=true;updateLabels();});
  $('focusView').addEventListener('click',()=>{view='focus';zoom=1;updateLabels();});
  $('systemView').addEventListener('click',()=>{view='system';zoom=1;updateLabels();});
  $('topView').addEventListener('click',()=>{tilt=Math.PI/2;yaw=0;render();});
  $('resetView').addEventListener('click',()=>{tilt=.78;yaw=-.45;zoom=1;render();});
  $('interval').addEventListener('change',updateLabels);
  $('timeline').addEventListener('input',()=>{setPlay(false);time=Number($('timeline').value)/1000*focused().period;updateMetrics();render();});
  $('timelineFs').addEventListener('input',()=>{$('timeline').value=$('timelineFs').value;$('timeline').dispatchEvent(new Event('input'));});
  $('planets').addEventListener('change',event=>{const j=Number(event.target.dataset.planet);if(Number.isInteger(j)){enabled[j]=event.target.checked;updateLabels();}});
  $('allPlanets').addEventListener('click',()=>{const show=!enabled.every(Boolean);enabled.fill(show);document.querySelectorAll('[data-planet]').forEach(e=>e.checked=show);updateLabels();});
  $('fullscreen').addEventListener('click',async()=>{
    try{if(document.fullscreenElement)await document.exitFullscreen();else if(stage.classList.contains('expanded')){stage.classList.remove('expanded');$('fullscreen').textContent='Fullscreen ⤢';resize();}else if(stage.requestFullscreen)await stage.requestFullscreen();else{stage.classList.add('expanded');$('fullscreen').textContent='Exit fullscreen ⤡';resize();}}catch(_){stage.classList.add('expanded');$('fullscreen').textContent='Exit fullscreen ⤡';resize();}
  });
  document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'Exit fullscreen ⤡':'Fullscreen ⤢';resize();});
  canvas.addEventListener('pointerdown',event=>{dragging={x:event.clientX,y:event.clientY,id:event.pointerId};canvas.setPointerCapture(event.pointerId);});
  canvas.addEventListener('pointermove',event=>{if(!dragging)return;const dx=event.clientX-dragging.x,dy=event.clientY-dragging.y;yaw+=dx*.008;tilt=Math.max(-Math.PI/2,Math.min(Math.PI/2,tilt+dy*.008));dragging={x:event.clientX,y:event.clientY,id:event.pointerId};render();});
  function finishPointer(event){if(dragging&&canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);dragging=null;}
  canvas.addEventListener('pointerup',finishPointer);canvas.addEventListener('pointercancel',finishPointer);
  canvas.addEventListener('wheel',event=>{event.preventDefault();zoom=Math.max(.3,Math.min(4,zoom*Math.exp(-event.deltaY*.001)));render();},{passive:false});
  canvas.addEventListener('keydown',event=>{let used=true;switch(event.key){case'ArrowLeft':yaw-=.12;break;case'ArrowRight':yaw+=.12;break;case'ArrowUp':tilt=Math.min(Math.PI/2,tilt+.12);break;case'ArrowDown':tilt=Math.max(-Math.PI/2,tilt-.12);break;case'+':case'=':zoom=Math.min(4,zoom*1.1);break;case'-':zoom=Math.max(.3,zoom/1.1);break;case' ':setPlay(!playing);break;default:used=false;}if(used){event.preventDefault();render();}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&stage.classList.contains('expanded')){stage.classList.remove('expanded');$('fullscreen').textContent='Fullscreen ⤢';resize();}});
  function resize(){const bounds=stage.getBoundingClientRect();width=bounds.width;height=bounds.height;const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);render();}
  new ResizeObserver(resize).observe(stage);
  function frame(now){if(lastFrame!==null&&playing){time+=Math.min((now-lastFrame)/1000,.05)*Number($('speed').value)*focused().period;}lastFrame=now;if(playing){render();if(now-metricsAt>125){updateMetrics();metricsAt=now;}}requestAnimationFrame(frame);}
  setPlay(playing);updateLabels();resize();requestAnimationFrame(frame);
})();
