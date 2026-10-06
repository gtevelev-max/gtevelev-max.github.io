// Native WebGL rendering for function graphs, with real depth and smooth normals.
const normalize=a=>{const n=Math.hypot(...a);return n?a.map(v=>v/n):[0,0,1];};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const hex=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16)/255);
function multiply(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}

const vertex=`attribute vec3 aPosition;attribute vec3 aNormal;uniform mat4 uMatrix;varying vec3 vPosition;varying vec3 vNormal;void main(){vPosition=aPosition;vNormal=aNormal;gl_Position=uMatrix*vec4(aPosition,1.0);}`;
const fragment=derivatives=>`${derivatives?'#extension GL_OES_standard_derivatives : enable\n':''}precision highp float;
varying vec3 vPosition;varying vec3 vNormal;uniform vec3 uEye;uniform bool uPath;uniform bool uContours;uniform bool uGrid;uniform bool uCurved;uniform float uRadius;uniform vec3 uColor;
void main(){
 vec3 view=normalize(uEye-vPosition),n=normalize(vNormal);
 // Orient the smooth analytic normal toward the viewer. Using a single
 // material on both sides avoids color flicker on almost vertical ridges.
 if(dot(n,view)<0.0)n=-n;
 vec3 key=normalize(normalize(uEye)+vec3(-0.6,-0.4,1.3));
 vec3 fill=normalize(vec3(1.8,0.8,1.2));
 float h=clamp((vPosition.z+1.0)*0.5,0.0,1.0);
 vec3 base=uPath?uColor:mix(vec3(0.055,0.32,0.66),vec3(0.20,0.73,0.86),h);
 float light=0.40+0.48*max(dot(n,key),0.0)+0.18*max(dot(n,fill),0.0);
 vec3 color=base*light;
 float rim=pow(1.0-max(dot(n,view),0.0),3.0);color+=vec3(0.10,0.16,0.20)*rim;
 float shine=max(dot(n,normalize(key+view)),0.0);
 color+=vec3(0.78,0.90,1.0)*(0.33*pow(shine,16.0)+0.75*pow(shine,72.0));
 if(uContours&&!uPath){float d=abs(fract(vPosition.z*4.0+0.5)-0.5);color*=1.0-0.18*(1.0-smoothstep(0.014,0.032,d));}
 ${derivatives?`if(uGrid&&!uPath){
  float rho=length(vPosition.xy);
  float angle=uCurved?atan(vPosition.x,max(uRadius*vPosition.y*vPosition.y,1.0e-20)):atan(vPosition.y,vPosition.x);
  vec2 coordinates=vec2(rho*8.0,angle*1.9098593);
  vec2 width=max(fwidth(coordinates),vec2(1.0e-6));
  vec2 distance=abs(fract(coordinates+0.5)-0.5);
  vec2 ink=(1.0-smoothstep(width*0.40,width*1.05,distance))*(1.0-smoothstep(vec2(0.30),vec2(0.65),width));
  color=mix(color,vec3(0.025,0.105,0.18),0.78*max(ink.x,ink.y));
 }`:''}
 if(uPath)color=mix(uColor,vec3(1.0),0.10+0.35*rim);
 gl_FragColor=vec4(color,1.0);
}`;
const lineVertex=`attribute vec3 aPosition;uniform mat4 uMatrix;uniform float uPointSize;void main(){gl_Position=uMatrix*vec4(aPosition,1.0);gl_PointSize=uPointSize;}`;
const lineFragment=`precision mediump float;uniform vec4 uColor;void main(){gl_FragColor=uColor;}`;
// Screen-space ribbons give the surface mesh a stable, readable line width
// on WebGL implementations whose native lines are restricted to one pixel.
const ribbonVertex=`attribute vec3 aPosition;attribute vec3 aOther;attribute float aSide;
uniform mat4 uMatrix;uniform vec2 uResolution;uniform float uWidth;uniform float uBias;varying float vSide;
void main(){vec4 p=uMatrix*vec4(aPosition,1.0),q=uMatrix*vec4(aOther,1.0);
vec2 delta=(q.xy/q.w-p.xy/p.w)*uResolution;
vec2 tangent=delta/max(length(delta),0.001),perp=vec2(-tangent.y,tangent.x);
p.xy+=perp*aSide*uWidth/uResolution*p.w;p.z-=uBias*p.w;gl_Position=p;vSide=aSide;}`;
const ribbonFragment=`precision mediump float;uniform vec4 uColor;varying float vSide;
void main(){float alpha=1.0-smoothstep(0.60,1.0,abs(vSide));gl_FragColor=vec4(uColor.rgb,uColor.a*alpha);}`;
const pointFragment=`precision mediump float;uniform vec4 uColor;uniform bool uHollow;void main(){float d=length(gl_PointCoord-vec2(0.5));if(d>0.5)discard;if(uHollow&&d<0.27)gl_FragColor=vec4(0.97,0.98,0.97,1.0);else gl_FragColor=uColor;}`;

function tube(points,radius=.013,sides=10){
 const positions=[],normals=[];
 if(points.length<2)return {positions:new Float32Array(),normals:new Float32Array()};
 const rings=points.map((p,i)=>{
  const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],t=normalize(b.map((v,k)=>v-a[k]));
  const u=normalize(cross(t,Math.abs(t[2])<.85?[0,0,1]:[0,1,0])),v=cross(t,u);
  return Array.from({length:sides},(_,j)=>{const angle=j*2*Math.PI/sides,n=u.map((x,k)=>x*Math.cos(angle)+v[k]*Math.sin(angle));return {p:p.map((x,k)=>x+radius*n[k]),n};});
 });
 for(let i=0;i<rings.length-1;i++)for(let j=0;j<sides;j++){
  const next=(j+1)%sides;
  for(const vs of [[rings[i][j],rings[i+1][j],rings[i][next]],[rings[i][next],rings[i+1][j],rings[i+1][next]]])for(const q of vs){positions.push(...q.p);normals.push(...q.n);}
 }
 return {positions:new Float32Array(positions),normals:new Float32Array(normals)};
}

export function createLimitRenderer(canvas,labels,errorBox){
 const gl=canvas.getContext('webgl',{antialias:true,alpha:false,preserveDrawingBuffer:true});
 if(!gl){errorBox.hidden=false;errorBox.textContent='The 3D graph needs WebGL. The equations, computed values, and proofs below remain available.';return null;}
 function program(v,f){const p=gl.createProgram();for(const [type,source] of [[gl.VERTEX_SHADER,v],[gl.FRAGMENT_SHADER,f]]){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);gl.deleteShader(s);}gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
 const derivatives=!!gl.getExtension('OES_standard_derivatives');
 let surface,line,point,ribbon;
 try{surface=program(vertex,fragment(derivatives));line=program(lineVertex,lineFragment);point=program(lineVertex,pointFragment);ribbon=program(ribbonVertex,ribbonFragment);}catch(e){errorBox.hidden=false;errorBox.textContent='The 3D renderer could not start: '+e.message;return null;}
 const position=gl.createBuffer(),normal=gl.createBuffer(),scratch=gl.createBuffer(),ribbonBuffer=gl.createBuffer();
 const ribbonCache=new WeakMap();
 let mesh=null,example=null,radius=1,paths=[],matrix,eye;
 gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(.951,.969,.973,1);
 const attribute=(p,name,b,size=3)=>{gl.bindBuffer(gl.ARRAY_BUFFER,b);const l=gl.getAttribLocation(p,name);if(l>=0){gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,size,gl.FLOAT,false,0,0);}};
 const uniform=(p,name,type,...args)=>{const l=gl.getUniformLocation(p,name);if(type==='matrix')gl.uniformMatrix4fv(l,false,args[0]);else gl['uniform'+type](l,...args);};
 function lines(points,color){if(!points.length)return;gl.useProgram(line);gl.bindBuffer(gl.ARRAY_BUFFER,scratch);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(points),gl.DYNAMIC_DRAW);attribute(line,'aPosition',scratch);uniform(line,'uMatrix','matrix',matrix);uniform(line,'uColor','4fv',color);gl.drawArrays(gl.LINES,0,points.length/3);}
 function meshLines(points,color,width,bias){
  if(!points.length)return;
  let data=ribbonCache.get(points);
  if(!data){const values=[];for(let i=0;i<points.length;i+=6){const p=points.subarray(i,i+3),q=points.subarray(i+3,i+6);
   // The segment direction reverses at q, so its side signs reverse too.
   for(const [a,b,side] of [[p,q,-1],[q,p,1],[p,q,1],[p,q,1],[q,p,1],[q,p,-1]])values.push(...a,...b,side);
  }data=new Float32Array(values);ribbonCache.set(points,data);}
  gl.useProgram(ribbon);gl.bindBuffer(gl.ARRAY_BUFFER,ribbonBuffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);
  for(const [name,size,offset] of [['aPosition',3,0],['aOther',3,12],['aSide',1,24]]){const location=gl.getAttribLocation(ribbon,name);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,size,gl.FLOAT,false,28,offset);}
  uniform(ribbon,'uMatrix','matrix',matrix);uniform(ribbon,'uResolution','2fv',[canvas.width,canvas.height]);uniform(ribbon,'uWidth','1f',width*Math.min(devicePixelRatio||1,2));uniform(ribbon,'uBias','1f',bias);uniform(ribbon,'uColor','4fv',color);
  gl.depthMask(false);gl.drawArrays(gl.TRIANGLES,0,data.length/7);gl.depthMask(true);
 }
 function triangles(data,color=null,contours=false,grid=false){if(!data.positions.length)return;gl.useProgram(surface);gl.bindBuffer(gl.ARRAY_BUFFER,position);gl.bufferData(gl.ARRAY_BUFFER,data.positions,gl.DYNAMIC_DRAW);attribute(surface,'aPosition',position);gl.bindBuffer(gl.ARRAY_BUFFER,normal);gl.bufferData(gl.ARRAY_BUFFER,data.normals,gl.DYNAMIC_DRAW);attribute(surface,'aNormal',normal);uniform(surface,'uMatrix','matrix',matrix);uniform(surface,'uEye','3fv',eye);uniform(surface,'uPath','1i',color?1:0);uniform(surface,'uColor','3fv',color||[0,0,0]);uniform(surface,'uContours','1i',contours?1:0);uniform(surface,'uGrid','1i',grid?1:0);uniform(surface,'uCurved','1i',example.id==='curved-path'?1:0);uniform(surface,'uRadius','1f',radius);gl.drawArrays(gl.TRIANGLES,0,data.positions.length/3);}
 function setGraph(next,e,r){
  mesh=next;example=e;radius=r;paths=[];
  for(const path of e.paths)for(const sign of [-1,1]){
   const distance=t=>{const p=path.point(sign*t);return Math.hypot(p[0]-e.target[0],p[1]-e.target[1]);};
   let low=0,high=2*r;for(let j=0;j<50;j++){const m=(low+high)/2;if(distance(m)<r)low=m;else high=m;}
   const maxT=low,points=[];let pieces=[];
   const flush=()=>{if(pieces.length>1)points.push(pieces);pieces=[];};
   for(let j=0;j<=320;j++){
    const t=sign*maxT*Math.exp(Math.log(.0001)*(1-j/320)),[x,y]=path.point(t),z=e.evaluate(x,y);
    const p=[(x-e.target[0])/r,(y-e.target[1])/r,(z-e.zCenter)/e.zScale];
    if(Number.isFinite(z)&&Math.abs(p[2])<=1)pieces.push(p);else flush();
   }
   flush();for(const piece of points)paths.push({mesh:tube(piece),color:hex(path.renderColor||path.color)});
  }
 }
 function camera(state){
  const aspect=canvas.width/canvas.height,d=4.8/state.zoom*Math.max(1,1.05/aspect),c=Math.cos(state.elevation);
  eye=[d*c*Math.cos(state.azimuth),d*c*Math.sin(state.azimuth),d*Math.sin(state.elevation)-.15];
  const z=normalize([eye[0],eye[1],eye[2]+.15]),x=normalize(cross([0,0,1],z)),y=cross(z,x);
  const view=new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
  const f=1/Math.tan(36*Math.PI/360),near=Math.max(.05,d-2.1),far=d+2.1;
  const proj=new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);
  matrix=multiply(proj,view);
 }
 function screen(p){const a=[...p,1],q=[0,1,2,3].map(i=>a.reduce((s,v,j)=>s+v*matrix[4*j+i],0));return [(q[0]/q[3]*.5+.5)*canvas.clientWidth,(-q[1]/q[3]*.5+.5)*canvas.clientHeight];}
 function draw(state,options={}){
  if(!mesh)return;
  const dpr=Math.min(devicePixelRatio||1,2),width=Math.round(canvas.clientWidth*dpr),height=Math.round(canvas.clientHeight*dpr);
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  camera(state);gl.viewport(0,0,width,height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const grid=[];for(let i=-5;i<=5;i++){const t=i/5;grid.push(-1,t,-1.03,1,t,-1.03,t,-1,-1.03,t,1,-1.03);}lines(grid,[.53,.65,.69,.27]);
  const rim=[];for(let i=0;i<144;i++){const a=i*Math.PI/72,b=(i+1)*Math.PI/72;rim.push(Math.cos(a),Math.sin(a),-1.025,Math.cos(b),Math.sin(b),-1.025);}lines(rim,[.36,.51,.58,.65]);
  triangles(mesh,null,options.contours,options.grid);
  if(options.grid&&!derivatives)meshLines(mesh.gridPositions,[.025,.11,.20,.80],1.5,.000012);
  meshLines(mesh.boundaryPositions,[.05,.20,.31,.60],1.0,.000025);
  if(options.paths)for(const p of paths)triangles(p.mesh,p.color);
  // Display axes belong to the bottom of the fixed-height window, not z=0.
  const corner=[[-1,-1],[1,-1],[1,1],[-1,1]].sort((a,b)=>screen([...a,-1])[0]-screen([...b,-1])[0])[0];
  const axes=[...corner,-1,...corner,1,-1.12,0,-1.02,1.12,0,-1.02,0,-1.12,-1.02,0,1.12,-1.02];lines(axes,[.28,.40,.48,.82]);
  if(['squeeze','radial-sinc','polynomial'].includes(example.id)){
   gl.useProgram(point);gl.bindBuffer(gl.ARRAY_BUFFER,scratch);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,0]),gl.DYNAMIC_DRAW);attribute(point,'aPosition',scratch);uniform(point,'uMatrix','matrix',matrix);uniform(point,'uColor','4fv',[.07,.14,.21,1]);uniform(point,'uPointSize','1f',11*dpr);uniform(point,'uHollow','1i',example.id!=='polynomial'?1:0);gl.disable(gl.DEPTH_TEST);gl.drawArrays(gl.POINTS,0,1);gl.enable(gl.DEPTH_TEST);
  }
  labels.replaceChildren();
  const short=n=>Number(n.toPrecision(4)).toLocaleString('en-US',{maximumFractionDigits:4});
  const sx=Math.sign(eye[0])||1,sy=Math.sign(eye[1])||1;
  const items=[...[-1,0,1].map(w=>({p:[...corner,w],text:'z = '+short(example.zCenter+w*example.zScale)})),{p:[sx*1.12,0,-1.02],text:'x = '+short(example.target[0]+sx*radius)},{p:[0,sy*1.12,-1.02],text:'y = '+short(example.target[1]+sy*radius)}];
  for(const item of items){const [x,y]=screen(item.p),span=document.createElement('span');span.textContent=item.text;span.style.left=Math.max(4,Math.min(canvas.clientWidth-86,x+6))+'px';span.style.top=Math.max(4,Math.min(canvas.clientHeight-22,y-11))+'px';labels.append(span);}
 }
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();errorBox.hidden=false;errorBox.textContent='Graphics were interrupted. Reload this page to restore the graph.';});
 return {setGraph,draw,info:()=>({renderer:'WebGL',antialias:gl.getContextAttributes().antialias,depth:true,material:'glossy-blue',meshStyle:derivatives?'antialiased-surface-shader':'screen-space-lines',triangles:mesh?.positions.length/9||0})};
}
