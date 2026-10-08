// Smooth, equation-driven PDE graphs. Coordinates supplied to evaluate are
// the actual mathematical coordinates; only the camera uses normalized space.
const PI = Math.PI, SCALE = 0.70, N = 64, FLOOR = -0.92;
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
const norm = a => { const n=Math.hypot(...a); return n ? a.map(x=>x/n) : [0,0,1]; };
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot = (a,b) => a.reduce((s,x,i)=>s+x*b[i],0);
const multiply = (a,b) => { const o=new Float32Array(16); for(let c=0;c<4;c++) for(let r=0;r<4;r++) for(let k=0;k<4;k++) o[c*4+r]+=a[k*4+r]*b[c*4+k]; return o; };
const vertex = `attribute vec3 aPosition;attribute vec3 aNormal;uniform mat4 uMatrix;varying vec3 vPosition;varying vec3 vNormal;
void main(){vPosition=aPosition;vNormal=aNormal;gl_Position=uMatrix*vec4(aPosition,1.0);}`;
const fragment = derivatives => `${derivatives?'#extension GL_OES_standard_derivatives : enable\n':''}precision highp float;
varying vec3 vPosition;varying vec3 vNormal;uniform vec3 uEye;uniform bool uMesh;uniform bool uContours;uniform bool uHeat;uniform float uColorBound;
vec3 ramp(float h){
 vec3 a=vec3(0.055,0.20,0.55),b=vec3(0.035,0.67,0.88),c=vec3(0.81,0.96,0.90),d=vec3(1.0,0.60,0.12),e=vec3(0.95,0.19,0.14);
 if(h<0.25)return mix(a,b,h*4.0);if(h<0.5)return mix(b,c,(h-0.25)*4.0);if(h<0.75)return mix(c,d,(h-0.5)*4.0);return mix(d,e,(h-0.75)*4.0);
}
void main(){
 vec3 eye=normalize(uEye-vPosition),n=normalize(vNormal);if(dot(n,eye)<0.0)n=-n;
 float value=vPosition.z/0.70,h=clamp(uHeat?value:(value/uColorBound+1.0)*0.5,0.0,1.0);
 vec3 base=ramp(h),key=normalize(vec3(-0.50,-0.85,1.45)),fill=normalize(vec3(0.9,0.55,0.65));
 float light=0.42+0.46*max(dot(n,key),0.0)+0.17*max(dot(n,fill),0.0);
 vec3 color=base*light;float spec=max(dot(n,normalize(key+eye)),0.0);
 color+=vec3(0.80,0.91,1.0)*(0.20*pow(spec,18.0)+0.58*pow(spec,80.0));
 color+=vec3(0.05,0.13,0.19)*pow(1.0-max(dot(n,eye),0.0),3.0);
 ${derivatives?`if(uMesh){vec2 q=(vPosition.xy+1.0)*8.0,w=max(fwidth(q),vec2(0.00001));vec2 d=abs(fract(q+0.5)-0.5);vec2 ink=1.0-smoothstep(w*0.40,w*1.15,d);ink*=1.0-smoothstep(vec2(0.32),vec2(0.65),w);color=mix(color,vec3(0.018,0.055,0.10),0.76*max(ink.x,ink.y));}
 if(uContours){float q=value*8.0,pixel=fwidth(q),w=max(pixel,0.00001),d=abs(fract(q+0.5)-0.5);float ink=(1.0-smoothstep(w*0.40,w*1.15,d))*smoothstep(0.0002,0.003,pixel);if(uHeat&&value<0.025)ink=0.0;color=mix(color,vec3(1.0,0.97,0.79),0.65*ink);}`:''}
 gl_FragColor=vec4(color,1.0);
}`;
const lineVertex=`attribute vec3 aPosition;uniform mat4 uMatrix;uniform float uPointSize;void main(){gl_Position=uMatrix*vec4(aPosition,1.0);gl_PointSize=uPointSize;}`;
const lineFragment=`precision mediump float;uniform vec4 uColor;void main(){gl_FragColor=uColor;}`;
const pointFragment=`precision mediump float;uniform vec4 uColor;void main(){float d=length(gl_PointCoord-vec2(0.5));if(d>0.5)discard;float inner=1.0-smoothstep(0.24,0.36,d);gl_FragColor=vec4(mix(vec3(0.035,0.055,0.10),uColor.rgb,inner),uColor.a);}`;
const ribbonVertex=`attribute vec3 aPosition;attribute vec3 aOther;attribute float aSide;uniform mat4 uMatrix;uniform vec2 uResolution;uniform float uWidth;uniform float uBias;varying float vSide;
void main(){vec4 p=uMatrix*vec4(aPosition,1.0),q=uMatrix*vec4(aOther,1.0);vec2 d=(q.xy/q.w-p.xy/p.w)*uResolution;vec2 v=d/max(length(d),0.001);p.xy+=vec2(-v.y,v.x)*aSide*uWidth/uResolution*p.w;p.z-=uBias*p.w;gl_Position=p;vSide=aSide;}`;
const ribbonFragment=`precision mediump float;uniform vec4 uColor;varying float vSide;void main(){float a=1.0-smoothstep(0.60,1.0,abs(vSide));gl_FragColor=vec4(uColor.rgb,uColor.a*a);}`;

export class PDESurfaceRenderer {
 constructor(canvas,overlayCanvas){
  this.canvas=canvas;this.overlayCanvas=overlayCanvas;this.overlay=overlayCanvas?.getContext('2d');
  this.available=false;this.error=null;this.state={azimuth:-1.04,elevation:0.65,zoom:1,view:'perspective'};
  this.options={mesh:true,contours:false,flux:false,probe:[0,0],ringRadius:null};this.frame=0;this.invalid=0;
  canvas.tabIndex=canvas.tabIndex>=0?canvas.tabIndex:0;canvas.style.touchAction='none';
  canvas.setAttribute('aria-label','Interactive three-dimensional PDE graph. Drag to rotate, scroll to zoom, use arrow keys to rotate and Home to reset.');
  if(overlayCanvas)overlayCanvas.style.pointerEvents='none';
  try {
   const gl=this.gl=canvas.getContext('webgl',{antialias:true,alpha:false,preserveDrawingBuffer:true});
   if(!gl)throw Error('WebGL is unavailable. The equations and numerical readouts remain usable.');
   this.derivatives=!!gl.getExtension('OES_standard_derivatives');
   this.surface=this._program(vertex,fragment(this.derivatives));this.line=this._program(lineVertex,lineFragment);this.point=this._program(lineVertex,pointFragment);this.ribbon=this._program(ribbonVertex,ribbonFragment);
   this.position=gl.createBuffer();this.normal=gl.createBuffer();this.index=gl.createBuffer();this.scratch=gl.createBuffer();this.ribbonBuffer=gl.createBuffer();
   this.positions=new Float32Array((N+1)*(N+1)*3);this.normals=new Float32Array(this.positions.length);this.indices=new Uint16Array(N*N*6);
   let k=0;for(let j=0;j<N;j++)for(let i=0;i<N;i++){const a=j*(N+1)+i,b=a+1,c=a+N+1,d=c+1;for(const v of [a,b,c,b,d,c])this.indices[k++]=v;}
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,this.indices,gl.STATIC_DRAW);
   for(const [b,data] of [[this.position,this.positions],[this.normal,this.normals]]){gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data.byteLength,gl.DYNAMIC_DRAW);}
   gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(.020,.032,.065,1);
   this.available=true;
  } catch(e){this.error=e.message;}
  this._events();
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.available=false;this.error='Graphics were interrupted. Reload to restore the 3D graph.';this.draw();});
 }
 _program(v,f){const gl=this.gl,p=gl.createProgram();for(const [type,source] of [[gl.VERTEX_SHADER,v],[gl.FRAGMENT_SHADER,f]]){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);gl.deleteShader(s);}gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
 _attribute(p,name,b,size=3){const gl=this.gl,l=gl.getAttribLocation(p,name);if(l<0)return;gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,size,gl.FLOAT,false,0,0);}
 _uniform(p,name,type,value){const gl=this.gl,l=gl.getUniformLocation(p,name);if(type==='matrix')gl.uniformMatrix4fv(l,false,value);else gl['uniform'+type](l,value);}
 _events(){
  const c=this.canvas;let drag=null;
  c.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};c.setPointerCapture(e.pointerId);c.focus({preventScroll:true});});
  c.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;if(this.state.view==='top')this.state.view='perspective';this.state.azimuth-=(e.clientX-drag.x)*.007;this.state.elevation=clamp(this.state.elevation+(e.clientY-drag.y)*.006,.12,1.45);drag.x=e.clientX;drag.y=e.clientY;this.draw();});
  const end=e=>{if(drag?.id===e.pointerId)drag=null;};c.addEventListener('pointerup',end);c.addEventListener('pointercancel',end);
  c.addEventListener('wheel',e=>{e.preventDefault();this.state.zoom=clamp(this.state.zoom*Math.exp(-e.deltaY*.0012),.65,2.15);this.draw();},{passive:false});
  c.addEventListener('keydown',e=>{let handled=true;if(e.key==='ArrowLeft')this.state.azimuth-=.10;else if(e.key==='ArrowRight')this.state.azimuth+=.10;else if(e.key==='ArrowUp')this.state.elevation=clamp(this.state.elevation+.08,.12,1.45);else if(e.key==='ArrowDown')this.state.elevation=clamp(this.state.elevation-.08,.12,1.45);else if(e.key==='+'||e.key==='=')this.state.zoom=clamp(this.state.zoom*1.1,.65,2.15);else if(e.key==='-')this.state.zoom=clamp(this.state.zoom/1.1,.65,2.15);else if(e.key==='Home')this.reset();else handled=false;if(handled){e.preventDefault();this.draw();}});
 }
 update(options={}){
  this.options={...this.options,...options};this.evaluate=this.options.evaluate;
  if(!this.available||typeof this.evaluate!=='function')return;
  this.invalid=0;let p=0;this.values=new Float32Array((N+1)*(N+1));
  for(let j=0;j<=N;j++)for(let i=0;i<=N;i++){
   const x=(i/N*2-1)*PI,y=(j/N*2-1)*PI,s=this.evaluate(x,y),u=Number(s?.u);
   const finite=Number.isFinite(u);if(!finite)this.invalid++;
   this.values[j*(N+1)+i]=finite?u:NaN;
   this.positions[p]=x/PI;this.positions[p+1]=y/PI;this.positions[p+2]=finite?u*SCALE:0;
   const ux=Number.isFinite(s?.ux)?s.ux:0,uy=Number.isFinite(s?.uy)?s.uy:0,n=norm([-PI*SCALE*ux,-PI*SCALE*uy,1]);
   this.normals[p]=n[0];this.normals[p+1]=n[1];this.normals[p+2]=n[2];p+=3;
  }
  const gl=this.gl;for(const [b,data] of [[this.position,this.positions],[this.normal,this.normals]]){gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferSubData(gl.ARRAY_BUFFER,0,data);}
  // Exceptional undefined samples form holes, rather than vertical spikes.
  let next=this.indices;if(this.invalid){const valid=[];for(let i=0;i<this.indices.length;i+=3){const a=this.indices[i],b=this.indices[i+1],c=this.indices[i+2];if(Number.isFinite(this.values[a])&&Number.isFinite(this.values[b])&&Number.isFinite(this.values[c]))valid.push(a,b,c);}next=new Uint16Array(valid);}
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,next,gl.STATIC_DRAW);this.indexCount=next.length;
 }
 _resize(){
  this.dpr=Math.min(globalThis.devicePixelRatio||1,2);const c=this.canvas,r=c.getBoundingClientRect();this.width=Math.max(1,r.width||c.clientWidth||640);this.height=Math.max(1,r.height||c.clientHeight||480);
  const w=Math.round(this.width*this.dpr),h=Math.round(this.height*this.dpr);if(c.width!==w||c.height!==h){c.width=w;c.height=h;}
  if(this.overlayCanvas&&(this.overlayCanvas.width!==w||this.overlayCanvas.height!==h)){this.overlayCanvas.width=w;this.overlayCanvas.height=h;}
 }
 _camera(){
  const aspect=this.width/this.height,s=this.state;
  if(s.view==='top'){
   this.eye=[0,0,5];const extent=1.29/s.zoom,x=extent*Math.max(1,aspect),y=extent*Math.max(1,1/aspect);
   this.matrix=new Float32Array([1/x,0,0,0,0,1/y,0,0,0,0,-1/5,0,0,0,0,1]);return;
  }
  const d=(this.options.preset==='cubic'?6.6:5.25)/s.zoom*Math.max(1,1.05/aspect),a=s.azimuth,e=s.elevation;
  this.eye=[d*Math.cos(e)*Math.cos(a),d*Math.cos(e)*Math.sin(a),d*Math.sin(e)];
  const z=norm(this.eye),x=norm(cross([0,0,1],z)),y=cross(z,x);
  const view=new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,this.eye),-dot(y,this.eye),-dot(z,this.eye),1]);
  const f=1/Math.tan(41*PI/360),near=.08,far=20;
  this.matrix=multiply(new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]),view);
 }
 // Public projection takes actual mathematical coordinates, not camera units.
 project(x,y,z){return this._project([x/PI,y/PI,z*SCALE]);}
 _project(p){if(!this.matrix)return null;const q=[0,1,2,3].map(i=>p.reduce((s,v,j)=>s+v*this.matrix[4*j+i],this.matrix[12+i]));if(q[3]<=0)return null;return {x:(q[0]/q[3]*.5+.5)*this.width,y:(-.5*q[1]/q[3]+.5)*this.height,depth:q[2]/q[3],visible:Math.abs(q[0]/q[3])<=1&&Math.abs(q[1]/q[3])<=1};}
 _lines(points,color){if(!points.length)return;const gl=this.gl,p=this.line;gl.useProgram(p);gl.bindBuffer(gl.ARRAY_BUFFER,this.scratch);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(points),gl.DYNAMIC_DRAW);this._attribute(p,'aPosition',this.scratch);this._uniform(p,'uMatrix','matrix',this.matrix);this._uniform(p,'uColor','4fv',color);gl.drawArrays(gl.LINES,0,points.length/3);}
 _ribbons(points,color,width=1.8,bias=.0001){
  if(!points.length)return;const a=[];for(let i=0;i<points.length;i+=6){const p=points.slice(i,i+3),q=points.slice(i+3,i+6);for(const [u,v,s] of [[p,q,-1],[q,p,1],[p,q,1],[p,q,1],[q,p,1],[q,p,-1]])a.push(...u,...v,s);}
  const gl=this.gl,p=this.ribbon;gl.useProgram(p);gl.bindBuffer(gl.ARRAY_BUFFER,this.ribbonBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(a),gl.DYNAMIC_DRAW);
  for(const [name,size,offset] of [['aPosition',3,0],['aOther',3,12],['aSide',1,24]]){const l=gl.getAttribLocation(p,name);gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,size,gl.FLOAT,false,28,offset);}
  this._uniform(p,'uMatrix','matrix',this.matrix);this._uniform(p,'uResolution','2fv',[this.canvas.width,this.canvas.height]);this._uniform(p,'uWidth','1f',width*this.dpr);this._uniform(p,'uBias','1f',bias);this._uniform(p,'uColor','4fv',color);gl.depthMask(false);gl.drawArrays(gl.TRIANGLES,0,a.length/7);gl.depthMask(true);
 }
 _point(p,color,size){const gl=this.gl,s=this.point;gl.useProgram(s);gl.bindBuffer(gl.ARRAY_BUFFER,this.scratch);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(p),gl.DYNAMIC_DRAW);this._attribute(s,'aPosition',this.scratch);this._uniform(s,'uMatrix','matrix',this.matrix);this._uniform(s,'uPointSize','1f',size*this.dpr);this._uniform(s,'uColor','4fv',color);gl.drawArrays(gl.POINTS,0,1);}
 _annotations(){
  const e=this.evaluate,o=this.options,probe=o.probe||[0,0],px=clamp(probe[0],-PI,PI),py=clamp(probe[1],-PI,PI),s=e(px,py);if(!Number.isFinite(s?.u))return;
  const z=s.u*SCALE;this.probeValue=s.u;const floor=[];
  for(let j=0;j<14;j+=2){const a=FLOOR+(z-FLOOR)*j/14,b=FLOOR+(z-FLOOR)*(j+1)/14;floor.push(px/PI,py/PI,a,px/PI,py/PI,b);}this._lines(floor,[1,.87,.29,.7]);
  const section=[];for(let i=0;i<160;i++){const x=-PI+2*PI*i/160,q=x+2*PI/160,a=e(x,py)?.u,b=e(q,py)?.u;if(Number.isFinite(a)&&Number.isFinite(b))section.push(x/PI,py/PI,a*SCALE+.006,q/PI,py/PI,b*SCALE+.006);}
  this._ribbons(section,[1,.22,.70,o.ringRadius ? .5 : .95],1.6);
  if(Number.isFinite(o.ringRadius)&&o.ringRadius>0){
   const ring=[];let samples=0;for(let i=0;i<128;i++){const a=i*2*PI/128,b=(i+1)*2*PI/128,x=px+o.ringRadius*Math.cos(a),y=py+o.ringRadius*Math.sin(a),xx=px+o.ringRadius*Math.cos(b),yy=py+o.ringRadius*Math.sin(b);if(Math.max(Math.abs(x),Math.abs(y),Math.abs(xx),Math.abs(yy))>PI)continue;const u=e(x,y)?.u,v=e(xx,yy)?.u;if(Number.isFinite(u)&&Number.isFinite(v)){ring.push(x/PI,y/PI,u*SCALE+.012,xx/PI,yy/PI,v*SCALE+.012);samples++;}}
   this._ribbons(ring,[1,.90,.22,1],2.7);this.ringSegments=samples;
  }else this.ringSegments=0;
  if(o.flux){
   const arrows=[];for(let j=0;j<5;j++)for(let i=0;i<5;i++){
    const x=-2.5+i*1.25,y=-2.5+j*1.25,v=e(x,y),f=Array.isArray(v?.flux)?v.flux:[v?.flux?.x,v?.flux?.y];
    const fx=Number.isFinite(f[0])?f[0]:-v?.ux,fy=Number.isFinite(f[1])?f[1]:-v?.uy,mag=Math.hypot(fx,fy);if(!Number.isFinite(mag)||mag<.00001||!Number.isFinite(v?.u))continue;
    const dx=fx/mag,dy=fy/mag,len=.11+.07*Math.tanh(mag),a=[x/PI,y/PI,v.u*SCALE+.035],b=[a[0]+len*dx,a[1]+len*dy,a[2]];
    arrows.push(...a,...b,...b,b[0]-.045*dx+.023*dy,b[1]-.045*dy-.023*dx,b[2],...b,b[0]-.045*dx-.023*dy,b[1]-.045*dy+.023*dx,b[2]);
   }this._ribbons(arrows,[.91,1,.99,.95],1.45);
  }
  this._point([px/PI,py/PI,z+.020],[1,.91,.16,1],15);
 }
 _overlay(){
  const ctx=this.overlay;if(!ctx)return;ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.clearRect(0,0,this.width,this.height);ctx.font='12px system-ui, sans-serif';ctx.textBaseline='middle';
  if(!this.available){ctx.fillStyle='#fff';ctx.font='15px system-ui';const words=(this.error||'3D graph is unavailable.').split(' ');let row='',y=30;for(const w of words){if(ctx.measureText(row+w).width>this.width-32){ctx.fillText(row,16,y);y+=24;row='';}row+=w+' ';}ctx.fillText(row,16,y);return;}
  const label=(world,text,color='#d7e5f5')=>{const p=this._project(world);if(!p)return;let x=clamp(p.x+8,7,this.width-ctx.measureText(text).width-12),y=clamp(p.y,12,this.height-12);const w=ctx.measureText(text).width;ctx.fillStyle='rgba(5,10,22,0.82)';ctx.fillRect(x-4,y-10,w+8,20);ctx.fillStyle=color;ctx.fillText(text,x,y);};
  label([-1.12,0,FLOOR],'x = −π');label([1.12,0,FLOOR],'x = π');label([0,-1.12,FLOOR],'y = −π');label([0,1.12,FLOOR],'y = π');
  if(this.state.view!=='top'){const sx=this.eye[0]>0?-1:1,sy=this.eye[1]>0?-1:1;const bound=this.options.preset==='cubic'?2:1;label([sx,sy,bound*SCALE],'u = '+bound);label([sx,sy,0],'u = 0');if(this.options.preset!=='gaussian')label([sx,sy,-bound*SCALE],'u = −'+bound);}
  const p=this.options.probe||[0,0];if(Number.isFinite(this.probeValue))label([p[0]/PI,p[1]/PI,this.probeValue*SCALE+.07],`u = ${this.probeValue.toFixed(3)}`,'#fff17b');
  ctx.fillStyle='rgba(214,234,252,.72)';ctx.font='11px system-ui';ctx.fillText(this.state.view==='top'?'Top view · drag for 3D':'Drag to rotate · scroll to zoom',12,this.height-16);
 }
 draw(){
  this._resize();if(!this.available){this._overlay();return;}this._camera();const gl=this.gl;gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const floor=[];for(let i=0;i<=8;i++){const v=i/4-1;floor.push(-1,v,FLOOR,1,v,FLOOR,v,-1,FLOOR,v,1,FLOOR);}this._lines(floor,[.32,.53,.72,.30]);
  const outline=[-1,-1,FLOOR,1,-1,FLOOR,1,-1,FLOOR,1,1,FLOOR,1,1,FLOOR,-1,1,FLOOR,-1,1,FLOOR,-1,-1,FLOOR];this._ribbons(outline,[.41,.66,.88,.52],1);
  if(this.indexCount){
   const p=this.surface;gl.useProgram(p);this._attribute(p,'aPosition',this.position);this._attribute(p,'aNormal',this.normal);this._uniform(p,'uMatrix','matrix',this.matrix);this._uniform(p,'uEye','3fv',this.eye);this._uniform(p,'uMesh','1i',this.options.mesh?1:0);this._uniform(p,'uContours','1i',this.options.contours?1:0);this._uniform(p,'uHeat','1i',this.options.kind==='heat'&&this.options.preset==='gaussian'?1:0);this._uniform(p,'uColorBound','1f',this.options.preset==='cubic'?2:1);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.index);gl.drawElements(gl.TRIANGLES,this.indexCount,gl.UNSIGNED_SHORT,0);
   if(!this.derivatives&&this.options.mesh){const grid=[];for(let j=0;j<=N;j+=4)for(let i=0;i<N;i++){const a=(j*(N+1)+i)*3;grid.push(...this.positions.subarray(a,a+3),...this.positions.subarray(a+3,a+6));}for(let i=0;i<=N;i+=4)for(let j=0;j<N;j++){const a=(j*(N+1)+i)*3,b=((j+1)*(N+1)+i)*3;grid.push(...this.positions.subarray(a,a+3),...this.positions.subarray(b,b+3));}this._ribbons(grid,[.04,.11,.20,.75],1);}
   this._annotations();
  }
  // Axes stay on the fixed input plane, so no misleading moving height scale.
  this._ribbons([-1.16,0,FLOOR,1.16,0,FLOOR,0,-1.16,FLOOR,0,1.16,FLOOR],[.67,.80,.93,.82],1.1);
  if(this.state.view!=='top'){const sx=this.eye[0]>0?-1:1,sy=this.eye[1]>0?-1:1;const bound=this.options.preset==='cubic'?2:1;this._ribbons([sx,sy,this.options.preset==='gaussian'?0:-bound*SCALE,sx,sy,bound*SCALE],[.67,.80,.93,.70],1.1);}
  this.frame++;this._overlay();
 }
 setView(view){this.state.view=view==='top'?'top':'perspective';this.draw();}
 reset(){this.state={azimuth:-1.04,elevation:.65,zoom:1,view:'perspective'};this.draw();}
 getSnapshot(){return {available:this.available,error:this.error,renderer:'native WebGL',antialias:this.gl?.getContextAttributes()?.antialias??false,analyticNormals:true,heightScale:SCALE,domain:[-PI,PI],gridVertices:(N+1)**2,triangles:(this.indexCount||0)/3,invalidSamples:this.invalid,mesh:!!this.options.mesh,meshStyle:this.derivatives?'antialiased shader':'screen-space lines',contours:!!this.options.contours,flux:!!this.options.flux,probeValue:this.probeValue,ringSegments:this.ringSegments||0,view:this.state.view,frame:this.frame};}
}
