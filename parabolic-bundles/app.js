/* Standalone numerical spectrum viewer. The spectral data are generated separately. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('spectrum'), ctx = canvas.getContext('2d');
  const palette = ['#49736a', '#8d6196', '#be8640', '#557caf', '#b46660', '#7e8950', '#976c4e', '#55989b', '#aa7090', '#72759e', '#86935e', '#a8783e'];
  const state = {data:null, rho:0, playing:false, speed:1, mode:'complex', focus:null, view:{center:0, imaginary:0, span:40, fit:'terminal'}, width:800, height:480, dpr:1, frame:0, fraction:0, b:1, walls:[], hovered:null, drawPoints:[], loadId:0, supported:[], lastTable:0};
  const opts = {trails:true, targets:true, multiplicity:false, colors:true, walls:false, crossings:false};
  const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
  const finitePoint = p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]);
  const color = k => opts.colors ? palette[((Number(k)||0)%palette.length+palette.length)%palette.length] : '#315f50';
  const fmt = (x,d=4) => !Number.isFinite(x) ? '—' : Math.abs(x)<1e-10 ? '0' : (Math.abs(x)>=1e6 || Math.abs(x)<.0001) ? x.toExponential(3) : Number(x.toFixed(d)).toLocaleString('en-US',{maximumFractionDigits:d});
  const integer = x => Number(x).toLocaleString('en-US');
  const axisFmt = (x,d=4) => Math.abs(x)>=1e6 || (Math.abs(x)>0&&Math.abs(x)<.0001) ? x.toExponential(1) : fmt(x,d);
  const frameRho = i => typeof state.data.frames[i] === 'number' ? state.data.frames[i] : state.data.frames[i].rho;
  const branches = () => state.data ? state.data.branches.filter(b => state.focus===null || Number(b.cluster)===state.focus) : [];
  const clusters = () => state.data ? state.data.clusters.filter(c => state.focus===null || Number(c.k)===state.focus) : [];
  const el = (tag, cls, text) => {const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};

  function dimensions() {
    const r=canvas.getBoundingClientRect();
    state.width=Math.max(1,r.width);state.height=Math.max(1,r.height);state.dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(state.width*state.dpr);canvas.height=Math.round(state.height*state.dpr);
    ctx.setTransform(state.dpr,0,0,state.dpr,0,0);draw();
  }
  function plot() {
    const left=state.width<500?43:56, right=state.width<500?23:31, top=Math.min(65,state.height*.28), bottom=Math.min(61,state.height*.3);
    const width=state.width-left-right,height=state.height-top-bottom;
    return {left,right,top,bottom,width,height,x0:state.view.center-state.view.span/2,x1:state.view.center+state.view.span/2,yspan:state.view.span*height/width};
  }
  function screen(p, rho=state.rho) {
    const a=plot();
    if(state.mode==='evolution')return [a.left+rho*a.width,a.top+a.height/2-(p[0]-state.view.center)/state.view.span*a.height];
    return [a.left+(p[0]-a.x0)/state.view.span*a.width,a.top+a.height/2-(p[1]-state.view.imaginary)/a.yspan*a.height];
  }
  function inPlot(p, margin=0){const a=plot();return p[0]>=a.left-margin&&p[0]<=a.left+a.width+margin&&p[1]>=a.top-margin&&p[1]<=a.top+a.height+margin;}
  function sample(rho) {
    if(!state.data)return;
    let lo=0,hi=state.data.frames.length-1;
    while(lo+1<hi){const mid=(lo+hi)>>1;if(frameRho(mid)<=rho)lo=mid;else hi=mid;}
    const r0=frameRho(lo),r1=frameRho(hi);
    state.frame=lo;state.fraction=clamp((rho-r0)/(r1-r0||1),0,1);
  }
  function point(b) {
    const p=b.points[state.frame],q=b.points[Math.min(state.frame+1,b.points.length-1)];
    if(!finitePoint(p))return null;if(!finitePoint(q))return p;
    return [p[0]+(q[0]-p[0])*state.fraction,p[1]+(q[1]-p[1])*state.fraction];
  }
  function fitTerminal(){if(!state.data)return;const vals=state.data.clusters.map(c=>c.value),min=Math.min(...vals),max=Math.max(...vals);state.view={center:(min+max)/2,imaginary:0,span:Math.max(1,max-min)/.9,fit:'terminal'};draw();}
  function fitAll(){if(!state.data)return;let xmin=Infinity,xmax=-Infinity,imin=Infinity,imax=-Infinity;for(const b of branches())for(const p of b.points){if(finitePoint(p)){xmin=Math.min(xmin,p[0]);xmax=Math.max(xmax,p[0]);imin=Math.min(imin,p[1]);imax=Math.max(imax,p[1]);}}if(!Number.isFinite(xmin))return;const a=plot();state.view={center:(xmin+xmax)/2,imaginary:(imin+imax)/2,span:Math.max(1,xmax-xmin,state.mode==='complex'?(imax-imin)*a.width/a.height:0)/.9,fit:'all'};draw();}
  function zoom(factor,anchor){
    const old=state.view.span,minSpan=Math.max(1e-8,1024*Number.EPSILON*Math.max(Math.abs(state.view.center),Math.abs(state.view.imaginary))),next=clamp(old*factor,minSpan,1e100),a=plot();
    if(anchor&&state.mode==='complex'){const fx=(anchor[0]-a.left)/a.width-.5,fy=.5-(anchor[1]-a.top)/a.height;state.view.center+=fx*(old-next);state.view.imaginary+=fy*(old-next)*a.height/a.width;}
    else if(anchor&&state.mode==='evolution'){const fy=.5-(anchor[1]-a.top)/a.height;state.view.center+=fy*(old-next);}
    state.view.span=next;state.view.fit='custom';draw();
  }
  function stepSize(span,count=7){const raw=span/count,base=10**Math.floor(Math.log10(raw)),n=raw/base;return (n<1.4?1:n<3.5?2:n<7.5?5:10)*base;}
  function line(x1,y1,x2,y2,stroke,width=1,dash=[]){ctx.beginPath();ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.setLineDash([]);}
  function text(s,x,y,fill='#778477',align='center',font='10px -apple-system, sans-serif'){ctx.font=font;ctx.fillStyle=fill;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(s,x,y);}
  function axes(){
    const a=plot();ctx.fillStyle='#fffefa';ctx.fillRect(0,0,state.width,state.height);
    ctx.fillStyle='#f8faf5';ctx.fillRect(a.left,a.top,a.width,a.height);
    const ev=state.mode==='evolution';
    if(ev&&opts.walls){const last=Math.exp(-state.b/Math.floor(state.data.g/2));ctx.fillStyle='#315f5009';ctx.fillRect(a.left+last*a.width,a.top,(1-last)*a.width,a.height);}
    const xs=ev?.2:stepSize(state.view.span,a.width/95),ys=stepSize(ev?state.view.span:a.yspan,a.height/60);
    const xmin=ev?0:a.x0,xmax=ev?1:a.x1,ymin=ev?state.view.center-state.view.span/2:state.view.imaginary-a.yspan/2,ymax=ev?state.view.center+state.view.span/2:state.view.imaginary+a.yspan/2;
    for(let x=Math.ceil(xmin/xs)*xs;x<=xmax+xs*.001;x+=xs){const px=ev?a.left+x*a.width:screen([x,0])[0];line(px,a.top,px,a.top+a.height,Math.abs(x)<xs*.001?'#bfcbbd':'#e7ece2');text(axisFmt(x,Math.max(0,-Math.floor(Math.log10(xs)))),px,a.top+a.height+16);}
    for(let y=Math.ceil(ymin/ys)*ys;y<=ymax+ys*.001;y+=ys){const py=ev?screen([y,0])[1]:screen([0,y])[1];line(a.left,py,a.left+a.width,py,Math.abs(y)<ys*.001?'#bfcbbd':'#e7ece2');text(axisFmt(y,Math.max(0,-Math.floor(Math.log10(ys)))),a.left-10,py,'#778477','right');}
    if(ev){text('ρ',a.left,a.top+a.height+39,'#536850','left','italic 13px Georgia');text('Re(λ / q)',a.left,a.top-19,'#536850','left','italic 13px Georgia');}
    else{text('Re(λ / q)',a.left,a.top+a.height+39,'#536850','left','italic 13px Georgia');text('Im(λ / q)',a.left,a.top-19,'#536850','left','italic 13px Georgia');}
    ctx.strokeStyle='#dce2d9';ctx.lineWidth=1;ctx.strokeRect(a.left,a.top,a.width,a.height);
    if(ev&&opts.walls){for(const w of state.walls){const x=a.left+w.rho*a.width;line(x,a.top,x,a.top+a.height,'#b17c3580',1,[3,4]);}text('calibrated stability walls',a.left+a.width/2,a.top+13,'#9a753c','center','9px -apple-system, sans-serif');}
    if(ev&&opts.crossings&&state.data.g===3){for(const r of [.07522256980768560,.9747674718513930]){const x=a.left+r*a.width;line(x,a.top,x,a.top+a.height,'#9973a08a',1,[2,5]);}}
  }
  function drawTrails(list){
    if(!opts.trails)return;
    const max=state.data.frames.length,stride=Math.max(1,Math.floor(max/350));
    for(const b of list){ctx.beginPath();let started=false;for(let i=0;i<max;i+=stride){const p=b.points[i];if(!finitePoint(p)){started=false;continue;}const s=screen(p,frameRho(i));if(!started){ctx.moveTo(...s);started=true;}else ctx.lineTo(...s);}const end=b.points[max-1];if(finitePoint(end))ctx.lineTo(...screen(end,1));ctx.strokeStyle=color(b.cluster)+(state.focus!==null?'bb':state.mode==='evolution'?'96':'73');ctx.lineWidth=state.focus===null?1.2:1.8;ctx.stroke();}
  }
  function drawTargets(){
    if(!opts.targets)return;
    const ev=state.mode==='evolution';
    for(const c of clusters()){
      const p=screen([c.value,0],1),col=color(c.k);
      if(ev){const a=plot();line(a.left,p[1],a.left+a.width,p[1],col+'25',1,[4,5]);}
      if(!inPlot(p,20))continue;
      ctx.beginPath();ctx.arc(...p,9,0,Math.PI*2);ctx.strokeStyle=col+'90';ctx.lineWidth=1.4;ctx.setLineDash([2,3]);ctx.stroke();ctx.setLineDash([]);
      const separated=clusters().every(other=>other.k===c.k||Math.hypot(...screen([other.value,0],1).map((v,i)=>v-p[i]))>27);
      if(state.rho<1&&separated)text('k = '+c.k,p[0]+(ev?-14:0),p[1]-(ev?12:23),col,ev?'right':'center','10px -apple-system, sans-serif');
      state.drawPoints.push({p,cluster:c.k,target:true,value:[c.value,0],multiplicity:c.multiplicity});
    }
  }
  function draw(){
    if(!state.data){ctx.fillStyle='#fffefa';ctx.fillRect(0,0,state.width,state.height);return;}
    axes();const a=plot(),list=branches();state.drawPoints=[];let clipped=0;
    ctx.save();ctx.beginPath();ctx.rect(a.left,a.top,a.width,a.height);ctx.clip();
    drawTrails(list);drawTargets();
    if(state.mode==='evolution'){const x=a.left+state.rho*a.width;line(x,a.top,x,a.top+a.height,'#315f5060',1.5);}
    const final=state.rho===1;
    const dots=final?clusters().map(c=>({cluster:c.k,multiplicity:c.multiplicity,value:[c.value,0],target:true})):list.map((b,i)=>({cluster:b.cluster,multiplicity:b.multiplicity??1,value:point(b),branch:b.id??i,core:b.core}));
    for(const dot of dots){if(!finitePoint(dot.value))continue;const p=screen(dot.value),col=color(dot.cluster);if(!inPlot(p,2)){clipped++;continue;}
      const radius=opts.multiplicity?clamp(2.8+Math.log2(1+Number(dot.multiplicity))*.75,3.5,15):final?6:4;
      ctx.globalAlpha=state.rho===0?.35:1;ctx.beginPath();ctx.arc(...p,radius+2.5,0,Math.PI*2);ctx.fillStyle=col+'14';ctx.fill();ctx.beginPath();ctx.arc(...p,radius,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();ctx.strokeStyle='#fffefa';ctx.lineWidth=final?1.6:.8;ctx.stroke();ctx.globalAlpha=1;
      state.drawPoints.push({...dot,p});
      if(final&&dots.every(other=>other.cluster===dot.cluster||Math.hypot(...screen(other.value,1).map((v,i)=>v-p[i]))>27)){text(fmt(dot.value[0]),p[0]+(state.mode==='evolution'?-14:0),p[1]-19,col,state.mode==='evolution'?'right':'center','15px Georgia');if(opts.multiplicity)text('× '+integer(dot.multiplicity),p[0]+(state.mode==='evolution'?-14:0),p[1]+23,col,state.mode==='evolution'?'right':'center','10px -apple-system, sans-serif');}
    }
    ctx.restore();
    $('clipped-count').textContent=clipped?`${integer(clipped)} ${final?'clusters':'branches'} outside view`:state.view.fit==='terminal'?'Final fit: 90% width':state.view.fit==='all'?'All sampled branches':'Custom scale';
    if(state.mode==='evolution'&&!clipped)$('clipped-count').textContent='Real-part projection';
  }
  function setFocus(k){state.focus=state.focus===k?null:k;renderClusterState();updateSummary();updateTable();draw();}
  function renderClusterState(){for(const b of $('clusters').children){const k=Number(b.dataset.k);b.setAttribute('aria-pressed',String(state.focus===k));b.classList.toggle('dimmed',state.focus!==null&&state.focus!==k);}$('show-all').disabled=state.focus===null;$('cluster-focus').value=state.focus===null?'all':String(state.focus);}
  function renderClusters(){
    $('clusters').replaceChildren();$('cluster-focus').replaceChildren();const all=el('option','','All clusters');all.value='all';$('cluster-focus').append(all);
    for(const c of state.data.clusters){const card=el('button','cluster-card');card.type='button';card.dataset.k=c.k;card.style.setProperty('--cluster-color',palette[c.k%palette.length]);card.setAttribute('aria-pressed','false');card.setAttribute('aria-label',`Focus on cluster k = ${c.k}, value ${c.value}, multiplicity ${c.multiplicity}`);card.append(el('span','cluster-k','Cluster k = '+c.k),el('span','cluster-value',fmt(c.value)),el('span','cluster-multiplicity',integer(c.multiplicity)+(Number(c.multiplicity)===1?' eigenvalue':' eigenvalues')));
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 64 36');svg.setAttribute('aria-hidden','true');svg.classList.add('cluster-spark');for(let j=0;j<5;j++){const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',`M 1 ${2+j*8} C 25 ${3+j*7} 27 18 61 18`);path.setAttribute('fill','none');path.setAttribute('stroke',palette[c.k%palette.length]);path.setAttribute('stroke-width','1.2');svg.append(path);}card.append(svg);card.addEventListener('click',()=>setFocus(Number(c.k)));$('clusters').append(card);const option=el('option','',`k = ${c.k} · ${fmt(c.value)}`);option.value=c.k;$('cluster-focus').append(option);}
    renderClusterState();
  }
  function updateSummary(){
    if(!state.data)return;const count=branches().length,total=branches().reduce((sum,b)=>sum+Number(b.multiplicity??1),0);
    $('summary-label').textContent=state.focus===null?'At this parameter':'Following cluster k = '+state.focus;
    const container=$('live-summary');container.replaceChildren();
    if(state.rho===0){container.append(el('strong','','ρ = 0 is a singular limit.'),document.createTextNode(' Faint markers preview the smallest positive sample. Some eigenvalues escape every bounded window.'));}
    else if(state.rho===1){container.append(el('strong','',integer(clusters().length)+' terminal '+(clusters().length===1?'cluster':'clusters')),document.createTextNode(' with total multiplicity '+integer(clusters().reduce((s,c)=>s+Number(c.multiplicity),0))+'. The terminal values and multiplicities are exact.'));}
    else{container.append(el('strong','',integer(count)+' continued branches'),document.createTextNode(' represent '+integer(total)+' eigenvalues with multiplicity. Colors follow their destination at ρ = 1.'));}
    if(opts.crossings&&state.data.g!==3)container.append(document.createElement('br'),document.createTextNode(state.data.g===2?'No spectral crossing markers for g = 2.':'Spectral crossing markers have only been tabulated here for g = 3.'));
  }
  function setRho(rho,fromAnimation=false,preserveInput=false){
    state.rho=clamp(Number(rho)||0,0,1);sample(state.rho);
    $('rho-slider').value=state.rho;if(!preserveInput)$('rho').value=state.rho.toFixed(4);
    $('phase-label').textContent=state.rho===0?'Singular limit · near-zero preview':state.rho===1?'Terminal spectrum · ρ = 1':`ρ = ${state.rho.toFixed(4)}`;
    document.querySelector('.chart-badge').classList.toggle('live',state.rho>0);
    if(state.data){const min=frameRho(0);$('parameter-status').textContent=state.rho===0?`ρ = 0 is singular. Faint dots show the positive sample ρ = ${fmt(min,8)}; branches may escape to infinity.`:state.rho<min?`Below the smallest positive sample (ρ = ${fmt(min,8)}), the plot uses that near-zero preview.`:state.rho===1?'Exact final spectrum. Fit final places its outermost values at 5% and 95% of the horizontal complex-plane scale.':'Numerical continuation with interpolation between samples. λ/q is plotted; multiplicities are retained.';}
    updateSummary();draw();if(!fromAnimation||performance.now()-state.lastTable>300)updateTable();
  }
  function updateTable(){
    if(!state.data||!document.querySelector('.spectrum-table').open)return;state.lastTable=performance.now();
    const tbody=$('spectrum-table');tbody.replaceChildren();
    const final=state.rho===1;
    $('table-note').textContent=state.rho<frameRho(0)?`Near-zero preview at the smallest positive sample ρ = ${fmt(frameRho(0),8)}, not the spectrum at the requested parameter.`:final?'Exact terminal clusters, with their total multiplicities.':'Interpolated numerical branch values. Repeated eigenvalues can occur in more than one branch.';
    const rows=final?clusters().map(c=>({cluster:c.k,value:[c.value,0],multiplicity:c.multiplicity,id:'Cluster'})):branches().map((b,i)=>({...b,value:point(b),id:b.id??i+1}));
    for(const b of rows){const tr=el('tr'),c0=el('td','',String(b.id)),c1=el('td','','k = '+b.cluster),dot=el('span','table-dot');dot.style.background=color(b.cluster);c1.prepend(dot);tr.append(c0,c1,el('td','',fmt(b.value?.[0],7)),el('td','',fmt(b.value?.[1],7)),el('td','',integer(b.multiplicity??1)));tbody.append(tr);}
  }
  function computeWalls(){
    if(!state.data)return;const g=Number(state.data.g),n=2*g+1,map=new Map();
    for(let d=1;2*d<=g;d++)for(let gamma=0;2*d+gamma<=g;gamma++){const a=2*d/(n-2*gamma),rho=Math.exp(-(n-4*d-2*gamma)*state.b/d),key=a.toFixed(12);if(!map.has(key))map.set(key,{a,rho,pairs:[]});map.get(key).pairs.push({d,gamma});}
    state.walls=[...map.values()].sort((a,b)=>a.rho-b.rho);
    $('wall-list').replaceChildren();$('wall-ticks').replaceChildren();$('crossing-ticks').replaceChildren();
    for(const w of state.walls){const row=el('div','wall-item');row.append(el('span','','a = '+fmt(w.a,4)));const button=el('button','','ρ '+fmt(w.rho,4));button.type='button';button.title='Jump to calibrated stability wall';button.addEventListener('click',()=>{pause();setRho(w.rho);});row.append(button);$('wall-list').append(row);const tick=el('span','wall-tick');tick.style.left=(100*w.rho)+'%';$('wall-ticks').append(tick);}
    if(g===3)for(const rho of [.07522256980768560,.9747674718513930]){const tick=el('span','wall-tick');tick.style.left=(100*rho)+'%';$('crossing-ticks').append(tick);}
    $('wall-ticks').hidden=!opts.walls;$('crossing-ticks').hidden=!opts.crossings;draw();
  }
  function pause(){state.playing=false;$('play-symbol').textContent='▶';$('play-label').textContent='Play';$('play').setAttribute('aria-label','Play animation');}
  function play(){if(!state.data)return;if(state.rho>=1)setRho(0);state.playing=true;$('play-symbol').textContent='Ⅱ';$('play-label').textContent='Pause';$('play').setAttribute('aria-label','Pause animation');lastTime=0;requestAnimationFrame(tick);}
  let lastTime=0;
  function tick(now){if(!state.playing)return;if(!lastTime)lastTime=now;const dt=Math.min(150,now-lastTime);lastTime=now;setRho(state.rho+dt/24000*state.speed,true);if(state.rho>=1){pause();updateTable();return;}requestAnimationFrame(tick);}
  function setMode(mode){state.mode=mode;for(const m of ['complex','evolution']){$(m+'-view').classList.toggle('active',mode===m);$(m+'-view').setAttribute('aria-pressed',String(mode===m));}$('plot-hint').textContent=mode==='complex'?'Drag to pan · Ctrl/⌘ + scroll to zoom · click a final cluster to focus':'Real-part projection · drag vertically to pan · Ctrl/⌘ + scroll to zoom';canvas.setAttribute('aria-label',mode==='complex'?'Quantum eigenvalues in the complex plane. Arrow keys pan; plus and minus zoom. Numerical values are available below.':'Real parts of quantum eigenvalues against rho. Arrow keys pan; plus and minus zoom. Imaginary parts are suppressed in this projection.');fitTerminal();}
  function resetOptions(){Object.assign(opts,{trails:true,targets:true,multiplicity:false,colors:true,walls:false,crossings:false});for(const k of Object.keys(opts))if($(k))$(k).checked=opts[k];$('wall-settings').hidden=true;$('wall-ticks').hidden=true;$('crossing-ticks').hidden=true;state.focus=null;renderClusterState();fitTerminal();updateSummary();updateTable();}
  async function loadGenus(g){
    const id=++state.loadId;pause();$('loading').hidden=false;$('loading').textContent='Loading the spectral branches…';$('play').disabled=true;
    try{
      if(!Number.isInteger(g)||g<2)throw Error('Choose an integer genus g ≥ 2.');
      if(state.supported.length&&!state.supported.includes(g))throw Error('Computed datasets are available for g = '+state.supported.join(', ')+'.');
      const response=await fetch(`data/g-${g}.json`);if(!response.ok)throw Error(`A dataset for g = ${g} is not available. Choose a supported genus.`);
      const data=await response.json();if(id!==state.loadId)return;
      if(!Array.isArray(data.frames)||data.frames.length<2||!Array.isArray(data.branches)||!Array.isArray(data.clusters))throw Error('The spectral dataset could not be read.');
      state.data=data;state.focus=null;$('genus').value=data.g;
      const meta=$('space-meta');meta.replaceChildren(el('span','',`n = ${data.n??2*data.g+1} marked points`),el('span','',`${integer(data.N??data.clusters.reduce((s,c)=>s+Number(c.multiplicity),0))} eigenvalues · ${data.g} final clusters`));
      $('loading').hidden=true;$('play').disabled=false;renderClusters();computeWalls();fitTerminal();setRho(0);
      const validation=data.validation||{};$('validation-note').textContent=validation.description||`Dataset: ${integer(data.frames.length)} positive parameter samples, ${integer(data.branches.length)} tracked branches, with exact terminal cluster multiplicities.`;
      if(data.note)$('computation-note').textContent=data.note;
      const url=new URL(location.href);url.searchParams.set('g',data.g);history.replaceState(null,'',url);
    }catch(error){if(id!==state.loadId)return;$('loading').textContent=error.message;$('parameter-status').textContent='Choose a supported genus and apply again.';}
  }

  $('genus-form').addEventListener('submit',e=>{e.preventDefault();loadGenus(Number($('genus').value));});
  $('play').addEventListener('click',()=>state.playing?pause():play());$('restart').addEventListener('click',()=>{pause();setRho(0);});$('end').addEventListener('click',()=>{pause();setRho(1);});
  $('rho-slider').addEventListener('input',e=>{pause();setRho(e.target.value);});$('rho').addEventListener('input',e=>{if(Number.isFinite(e.target.valueAsNumber)){pause();setRho(e.target.value,false,true);}});$('rho').addEventListener('change',e=>{pause();setRho(e.target.value);});$('speed').addEventListener('change',e=>state.speed=Number(e.target.value));
  for(const k of Object.keys(opts)){if($(k))$(k).addEventListener('change',e=>{opts[k]=e.target.checked;if(k==='walls'){$('wall-settings').hidden=!opts.walls;$('wall-ticks').hidden=!opts.walls;}if(k==='crossings')$('crossing-ticks').hidden=!opts.crossings;updateSummary();draw();});}
  $('calibration').addEventListener('change',e=>{state.b=clamp(Number(e.target.value)||1,.05,20);e.target.value=state.b;computeWalls();});
  $('calibration').addEventListener('input',e=>{if(Number.isFinite(e.target.valueAsNumber)&&e.target.valueAsNumber>0){state.b=clamp(e.target.valueAsNumber,.05,20);computeWalls();}});
  $('complex-view').addEventListener('click',()=>setMode('complex'));$('evolution-view').addEventListener('click',()=>setMode('evolution'));
  $('fit-terminal').addEventListener('click',fitTerminal);$('fit-all').addEventListener('click',fitAll);$('zoom-in').addEventListener('click',()=>zoom(1/1.35));$('zoom-out').addEventListener('click',()=>zoom(1.35));
  $('show-all').addEventListener('click',()=>{state.focus=null;renderClusterState();updateSummary();updateTable();draw();});$('reset-options').addEventListener('click',resetOptions);
  $('cluster-focus').addEventListener('change',e=>{state.focus=e.target.value==='all'?null:Number(e.target.value);renderClusterState();updateSummary();updateTable();draw();});
  document.querySelector('.spectrum-table').addEventListener('toggle',updateTable);
  $('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('demonstration').requestFullscreen();}catch(_){$('parameter-status').textContent='Full screen is unavailable in this browser. You can still resize the window and zoom the plot.';}});
  document.addEventListener('fullscreenchange',()=>{$('fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit full screen':'Enter full screen');dimensions();});
  canvas.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();const r=canvas.getBoundingClientRect();zoom(Math.exp(clamp(e.deltaY,-100,100)*.004),[e.clientX-r.left,e.clientY-r.top]);},{passive:false});
  let drag=null;
  canvas.addEventListener('pointerdown',e=>{const r=canvas.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);$('tooltip').hidden=true;});
  canvas.addEventListener('pointermove',e=>{
    const r=canvas.getBoundingClientRect(),p=[e.clientX-r.left,e.clientY-r.top];
    if(drag){const a=plot(),dx=e.clientX-drag.lastX,dy=e.clientY-drag.lastY;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>4)drag.moved=true;if(state.mode==='complex'){state.view.center-=dx/a.width*state.view.span;state.view.imaginary+=dy/a.width*state.view.span;}else state.view.center+=dy/a.height*state.view.span;if(drag.moved)state.view.fit='custom';drag.lastX=e.clientX;drag.lastY=e.clientY;draw();return;}
    const near=state.drawPoints.map(d=>({...d,distance:Math.hypot(d.p[0]-p[0],d.p[1]-p[1])})).filter(d=>d.distance<14).sort((a,b)=>a.distance-b.distance)[0];state.hovered=near;
    const tip=$('tooltip');if(!near){tip.hidden=true;return;}tip.replaceChildren(el('strong','','Cluster k = '+near.cluster),el('div','',`λ/q = ${fmt(near.value[0],6)}${Math.abs(near.value[1])>1e-9?(near.value[1]<0?' − ':' + ')+fmt(Math.abs(near.value[1]),6)+'i':''}`),el('div','',`Multiplicity ${integer(near.multiplicity)}${near.target?' · terminal target':''}`));tip.hidden=false;tip.style.left=clamp(p[0]+14,8,state.width-220)+'px';tip.style.top=clamp(p[1]-55,8,state.height-85)+'px';
  });
  canvas.addEventListener('pointerup',e=>{if(drag&&!drag.moved){const r=canvas.getBoundingClientRect(),p=[e.clientX-r.left,e.clientY-r.top];const near=state.drawPoints.filter(d=>d.target).map(d=>({...d,distance:Math.hypot(d.p[0]-p[0],d.p[1]-p[1])})).filter(d=>d.distance<16).sort((a,b)=>a.distance-b.distance)[0];if(near)setFocus(Number(near.cluster));}drag=null;});
  canvas.addEventListener('pointercancel',()=>drag=null);canvas.addEventListener('pointerleave',()=>{$('tooltip').hidden=true;});
  canvas.addEventListener('keydown',e=>{const dx=state.view.span*.07;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(e.key)){e.preventDefault();state.view.fit='custom';if(e.key==='+'||e.key==='=')zoom(1/1.3);else if(e.key==='-')zoom(1.3);else if(state.mode==='complex'){if(e.key==='ArrowLeft')state.view.center-=dx;if(e.key==='ArrowRight')state.view.center+=dx;if(e.key==='ArrowUp')state.view.imaginary+=dx;if(e.key==='ArrowDown')state.view.imaginary-=dx;draw();}else{state.view.center+=(e.key==='ArrowUp'||e.key==='ArrowRight'?1:-1)*dx;draw();}}});
  document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','SELECT','BUTTON','TEXTAREA','SUMMARY'].includes(e.target.tagName)){e.preventDefault();state.playing?pause():play();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  new ResizeObserver(dimensions).observe($('canvas-wrap'));
  async function init(){
    try{const r=await fetch('data/manifest.json');if(r.ok){const m=await r.json();state.supported=m.gValues||m.genera||[];if(state.supported.length){$('genus').min=Math.min(...state.supported);$('genus').max=Math.max(...state.supported);$('genus').title='Computed genera: '+state.supported.join(', ');$('genus-range').textContent=`${Math.min(...state.supported)}–${Math.max(...state.supported)}`;}}}catch(_){}
    const requested=Number(new URL(location.href).searchParams.get('g')||8);await loadGenus(requested);
  }
  // Expose a small read-only inspection surface for reproducibility and UI checks.
  window.quantumSpectrum={getState:()=>({g:state.data?.g,rho:state.rho,mode:state.mode,focus:state.focus,view:{...state.view},options:{...opts},branchCount:state.data?.branches.length,terminalValues:state.data?.clusters.map(c=>c.value),wallValues:state.walls.map(w=>({a:w.a,rho:w.rho}))})};
  init();
})();
