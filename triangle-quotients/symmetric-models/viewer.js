(async () => {
'use strict';
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],sub=(a,b)=>a.map((v,i)=>v-b[i]),unit=a=>{const n=Math.hypot(...a)||1;return a.map(x=>x/n);};
const identity=[1,0,0,0,1,0,0,0,1];
function multiply(a,b){const c=Array(9).fill(0);for(let j=0;j<3;j++)for(let i=0;i<3;i++)for(let k=0;k<3;k++)c[3*j+i]+=a[3*k+i]*b[3*j+k];return c;}
function rotation(axis,t){const [x,y,z]=unit(axis),c=Math.cos(t),s=Math.sin(t),u=1-c;return [c+x*x*u,y*x*u+z*s,z*x*u-y*s,x*y*u-z*s,c+y*y*u,z*y*u+x*s,x*z*u+y*s,y*z*u-x*s,c+z*z*u];}
function makeViewer(card,m){
 const canvas=card.querySelector('canvas'),gl=canvas.getContext('webgl',{antialias:true,alpha:false,preserveDrawingBuffer:true});
 if(!gl){card.querySelector('output').textContent='WebGL is needed to display this model.';return;}
 const normalArray=m.positions.map(()=>[0,0,0]);
 for(const f of m.triangles){const n=cross(sub(m.positions[f[1]],m.positions[f[0]]),sub(m.positions[f[2]],m.positions[f[0]]));for(const v of f)normalArray[v]=normalArray[v].map((x,j)=>x+n[j]);}
 const normals=normalArray.map(unit),mid=[0,1,2].map(j=>m.positions.reduce((s,p)=>s+p[j],0)/m.positions.length),radius=m.positions.reduce((r,p)=>Math.max(r,Math.hypot(...sub(p,mid))),0);
 const positions=m.positions.map(p=>sub(p,mid).map(x=>x/radius)),array=new Float32Array(m.triangles.length*3*6);let at=0;
 for(const f of m.triangles)for(const v of f){array.set([...positions[v],...normals[v]],at);at+=6;}
 function shader(type,text){const s=gl.createShader(type);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
 const p=gl.createProgram();
 gl.attachShader(p,shader(gl.VERTEX_SHADER,'attribute vec3 position;attribute vec3 normal;uniform mat3 transform;uniform vec2 scale;uniform float bias;varying vec3 n;varying vec3 v;void main(){v=transform*position;n=transform*normal;gl_Position=vec4(v.xy*scale,-v.z*.3-bias,1.);}'));
 gl.attachShader(p,shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec3 n;varying vec3 v;uniform vec3 color;uniform float wire;void main(){vec3 normal=normalize(n);if(!gl_FrontFacing)normal=-normal;float light=.40+.60*max(0.,dot(normal,normalize(vec3(-.3,.6,1.))));vec3 c=color*light;if(wire>.5)c=color;gl_FragColor=vec4(c,1.);}'));
 gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));gl.useProgram(p);
 const u={};for(const n of ['transform','scale','bias','color','wire'])u[n]=gl.getUniformLocation(p,n);
 const position=gl.getAttribLocation(p,'position'),normal=gl.getAttribLocation(p,'normal'),buffer=gl.createBuffer(),lineBuffer=gl.createBuffer();
 gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,array,gl.STATIC_DRAW);
 const lineArray=new Float32Array((m.chamberEdges||[]).length*2*6);at=0;
 for(const e of m.chamberEdges||[])for(const v of e){lineArray.set([...positions[v],...normals[v]],at);at+=6;}
 gl.bindBuffer(gl.ARRAY_BUFFER,lineBuffer);gl.bufferData(gl.ARRAY_BUFFER,lineArray,gl.STATIC_DRAW);
 gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(.075,.184,.212,1);
 let transform=m.id==='klein'?multiply(rotation([1,0,0],-.22),rotation([0,1,0],.52)):rotation([1,0,0],-.48),initial=transform.slice(),zoom=1,drag=null,animation=0,drawPending=0;
 function attributes(b){gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(position);gl.enableVertexAttribArray(normal);gl.vertexAttribPointer(position,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(normal,3,gl.FLOAT,false,24,12);}
 function draw(){drawPending=0;const r=canvas.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);if(canvas.width!==Math.round(r.width*d)||canvas.height!==Math.round(r.height*d)){canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);}gl.viewport(0,0,canvas.width,canvas.height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(p);gl.uniformMatrix3fv(u.transform,false,transform);gl.uniform2f(u.scale,.9*zoom*Math.min(r.width,r.height)/r.width,.9*zoom*Math.min(r.width,r.height)/r.height);gl.uniform1f(u.bias,0);gl.uniform1f(u.wire,0);gl.uniform3fv(u.color,m.color);attributes(buffer);gl.drawArrays(gl.TRIANGLES,0,array.length/6);if(card.querySelector('input')?.checked&&lineArray.length){gl.uniform1f(u.bias,.000002);gl.uniform1f(u.wire,1);gl.uniform3fv(u.color,[.12,.27,.29]);attributes(lineBuffer);gl.drawArrays(gl.LINES,0,lineArray.length/6);}}
 function requestDraw(){if(!drawPending)drawPending=requestAnimationFrame(draw);}
 function stop(){cancelAnimationFrame(animation);animation=0;}
 function symmetry(axis,angle,label){stop();const from=transform.slice(),start=performance.now(),duration=matchMedia('(prefers-reduced-motion:reduce)').matches?0:1600;card.querySelector('output').textContent=label;function frame(now){const t=duration?Math.min(1,(now-start)/duration):1,e=t*t*(3-2*t);transform=multiply(from,rotation(axis,e*angle));draw();if(t<1)animation=requestAnimationFrame(frame);else{animation=0;card.querySelector('output').textContent='Same surface after a symmetry rotation.';}}animation=requestAnimationFrame(frame);}
 card.querySelector('[data-action="rotate"]').onclick=()=>symmetry(m.axis,2*Math.PI/m.rotationOrder,`Applying a rotation of 360°/${m.rotationOrder}…`);
 card.querySelector('[data-action="half"]').onclick=()=>symmetry(m.halfAxis,Math.PI,'Applying a half-turn…');
 card.querySelector('[data-action="reset"]').onclick=()=>{stop();transform=initial.slice();zoom=1;card.querySelector('output').textContent='Drag to rotate · Scroll to zoom';requestDraw();};
 if(card.querySelector('input'))card.querySelector('input').onchange=requestDraw;
 canvas.onpointerdown=e=>{if(e.button!==0)return;stop();canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,id:e.pointerId};};
 canvas.onpointermove=e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;transform=multiply(multiply(rotation([1,0,0],dy*.009),rotation([0,1,0],dx*.009)),transform);drag.x=e.clientX;drag.y=e.clientY;requestDraw();};
 canvas.onpointerup=canvas.onpointercancel=()=>drag=null;canvas.onwheel=e=>{e.preventDefault();zoom=Math.max(.65,Math.min(4,zoom*(e.deltaY<0?1.1:1/1.1)));requestDraw();};canvas.onkeydown=e=>{if(e.key==='Home'){e.preventDefault();card.querySelector('[data-action="reset"]').click();}};
 new ResizeObserver(requestDraw).observe(canvas);requestDraw();
}
const packed=Uint8Array.from(atob(window.SYMMETRIC_MODELS_PACKED),c=>c.charCodeAt(0));
const models=JSON.parse(await new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
window.SYMMETRIC_MODELS_PACKED=undefined;
for(const m of models){const card=document.createElement('article');card.className='model';card.innerHTML=`<div class="model-heading"><h2>${m.title}</h2><p class="stats">Genus ${m.genus} · ${m.group} · ${m.groupOrder} visible rotations</p></div><canvas tabindex="0" aria-label="Rotatable ${m.title} symmetric surface"></canvas><div class="controls"><button data-action="rotate" aria-label="Rotate ${m.title} by 360 degrees divided by ${m.rotationOrder}">Rotate 360°/${m.rotationOrder}</button><button data-action="half" aria-label="Half-turn ${m.title}">Half-turn</button><button data-action="reset" aria-label="Reset ${m.title}">Reset</button></div><div class="model-description"><span class="badge ${m.mapped?'':'pending'}">${m.mapped?'Original chambers verified':'Surface model · chamber map pending'}</span><p>${m.description}</p>${m.mapped?'<label><input type="checkbox"> Show the 336 original chambers</label>':''}<output aria-live="polite">Drag to rotate · Scroll to zoom</output></div>`;document.getElementById('models').append(card);try{makeViewer(card,m);}catch(e){card.querySelector('output').textContent='Could not display this model: '+e.message;console.error(e);}}
})();
