/* Depth-buffered rendering of the original quotient chambers.
 * Curved patches may be sampled more finely, but only original chamber
 * boundaries are stroked. Identified corners have one common endpoint.
 */
(function(root){
'use strict';
const mix=(a,b,t)=>a.map((v,i)=>v*(1-t)+b[i]*t);
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>{const n=Math.hypot(...a)||1;return a.map(x=>x/n);};
const combine=(vs,w)=>[0,1,2].map(j=>vs.reduce((s,v,i)=>s+w[i]*v[j],0));
function build(data,M){
 if(!['klein','macbeath'].includes(data.id)){const model=root.QuotientSurfaceModels.build(data,M);if(model?.kind==='torus'){const sample=model.sample;model.sample=(f,w)=>sample(f,w).map(x=>x*.80);model.center=f=>model.sample(f,[1/3,1/3,1/3]);}return model;}
 const e=data.id==='klein'?root.KLEIN_EMBEDDING:root.MACBEATH_EMBEDDING;
 if(!e||e.positions.length!==data.counts.vertices)throw Error('Missing polyhedral surface embedding.');
 const radius=Math.max(...e.positions.map(p=>Math.hypot(...p))),vertices=e.positions.map(p=>p.map(x=>1.18*x/radius));
 const corners=data.faceVertices.map(vs=>vs.map(v=>vertices[v]));
 return {kind:'polyhedron',genus:data.genus,corners,vertexPositions:vertices,
  sample:(f,w)=>combine(corners[f],w),center:f=>combine(corners[f],[1/3,1/3,1/3]),
  sources:e.sources,validation:e.verification};
}
function create(){
 const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:true});
 if(!gl)throw Error('This browser needs WebGL to display the glued surface.');
 const vs=`attribute vec3 p; attribute vec3 color; varying vec3 c; uniform float offset; void main(){gl_Position=vec4(p.xy,p.z+offset,1.0);c=color;}`;
 const fs=`precision mediump float; varying vec3 c; void main(){gl_FragColor=vec4(c,1.0);}`;
 function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
 const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 const buffer=gl.createBuffer(),p=gl.getAttribLocation(program,'p'),c=gl.getAttribLocation(program,'color'),offset=gl.getUniformLocation(program,'offset');
 gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(p);gl.enableVertexAttribArray(c);gl.vertexAttribPointer(p,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(c,3,gl.FLOAT,false,24,12);
 gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(0,0,0,0);
 let mesh=[],edges=[],model,data,net,hit=[],frame,refinedRenderer;
 function prepare(d,n,m){
  data=d;net=n;model=m;mesh=[];edges=[];if(m.kind==='refined'){if(!refinedRenderer)refinedRenderer=root.RefinedSurfaceRenderer.create();refinedRenderer.prepare(d,n,m);return;}
  const resolution=m.kind==='polyhedron'?1:m.kind==='torus'?32:8;
  const refinement=root.QuotientSurfaceModels.refinement(resolution);
  for(let f=0;f<d.counts.triangles;f++){
   const cut=n.corners[f].map(v=>[...n.positions[v],0]);
   const sample=w=>({from:combine(cut,w),to:m.sample(f,w)});
   for(const tri of refinement){const points=tri.map(sample);if(f%2)[points[1],points[2]]=[points[2],points[1]];mesh.push({f,points});}
   for(let side=0;side<3;side++){
    const a=(side+1)%3,b=(side+2)%3,points=[];
    for(let i=0;i<=resolution;i++){const w=[0,0,0];w[a]=i/resolution;w[b]=1-i/resolution;points.push(sample(w));}
    edges.push({f,side,edge:d.faceEdges[f][side],points});
   }
  }
 }
 function rotate(v,yaw,pitch){const x=v[0]*Math.cos(yaw)+v[2]*Math.sin(yaw),z=-v[0]*Math.sin(yaw)+v[2]*Math.cos(yaw);return [x,v[1]*Math.cos(pitch)-z*Math.sin(pitch),v[1]*Math.sin(pitch)+z*Math.cos(pitch)];}
 function draw(ctx,options){if(model?.kind==='refined')return refinedRenderer.draw(ctx,options);
  const {width,height,dpr,t,zoom,pan,yaw,pitch,selected,seam,wire,walk}=options;
  if(canvas.width!==Math.round(width*dpr))canvas.width=Math.round(width*dpr);if(canvas.height!==Math.round(height*dpr))canvas.height=Math.round(height*dpr);gl.viewport(0,0,canvas.width,canvas.height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const R=Math.min(width,height)*.445*zoom;
  const transform=v=>mix(v.from,rotate(v.to,yaw,pitch),t);
  const project=v=>[(v[0]*R+pan[0])*2/width,(v[1]*R-pan[1])*2/height,-v[2]*.18];
  const point=(q,col)=>[...project(q),...col];
  const light=unit([-.35,.65,1]),triangles=[];hit=[];
  for(const tri of mesh){const v=tri.points.map(transform),normal=unit(cross(sub(v[1],v[0]),sub(v[2],v[0]))),lighting=.35+.65*Math.abs(normal.reduce((s,x,i)=>s+x*light[i],0));
   const base=tri.f===selected?[1,.76,.38]:tri.f%2?[.23,.49,.55]:[.57,.85,.73];
   const col=base.map(x=>Math.min(1,x*lighting));for(const q of v)triangles.push(...point(q,col));
   hit.push({f:tri.f,v:v.map(p=>[width/2+pan[0]+p[0]*R,height/2+pan[1]-p[1]*R,p[2]])});
  }
  gl.uniform1f(offset,0);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(triangles),gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,triangles.length/6);
  const lines=[],gold=[],route=[];
  for(const edge of edges){const active=edge.edge===seam?.edge,chosen=edge.f===selected;
   if(!wire&&!active&&!chosen)continue;
   const color=active?(edge.f===seam.first.face?[1,.70,.32]:[1,.89,.65]):chosen?[1,.87,.55]:[.10,.24,.26],out=active||chosen?gold:lines;
   for(let i=1;i<edge.points.length;i++)out.push(...point(transform(edge.points[i-1]),color),...point(transform(edge.points[i]),color));
  }
  if(walk?.length>1)for(let i=1;i<walk.length;i++){
   const a=walk[i-1],b=walk[i],side=data.neighbors[a].indexOf(b);if(side<0)continue;
   for(const f of [a,b]){const cut=net.corners[f].map(v=>[...net.positions[v],0]);let last=null;
    for(let j=0;j<=12;j++){const w=[0,1,2].map(k=>(1-j/12)/3+(k===side?0:j/24));const q=transform({from:combine(cut,w),to:model.sample(f,w)});if(last)route.push(...point(last,[1,.82,.34]),...point(q,[1,.82,.34]));last=q;}
   }
  }
  function stroke(values,bias,lineWidth){
   if(!values.length)return;const strips=[];
   for(let i=0;i<values.length;i+=12){const a=values.slice(i,i+6),b=values.slice(i+6,i+12),dx=(b[0]-a[0])*width/2,dy=(b[1]-a[1])*height/2,length=Math.hypot(dx,dy);if(length<1e-7)continue;const ox=-dy/length*lineWidth/width,oy=dx/length*lineWidth/height,shift=(p,s)=>[p[0]+s*ox,p[1]+s*oy,...p.slice(2)];strips.push(...shift(a,1),...shift(a,-1),...shift(b,1),...shift(b,1),...shift(a,-1),...shift(b,-1));}
   gl.uniform1f(offset,bias);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(strips),gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,strips.length/6);
  }
  stroke(lines,-.0006,.85);stroke(gold,-.001,2.1);stroke(route,-.0012,2.6);
  ctx.drawImage(canvas,0,0,width,height);frame={width,height,R,pan};
 }
 function pick(x,y){if(model?.kind==='refined')return refinedRenderer.pick(x,y);let best=-Infinity,face=null;for(const {f,v} of hit){const [a,b,c]=v,det=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(det)<1e-9)continue;const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/det,w=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/det,k=1-u-w;if(Math.min(u,w,k)<-.001)continue;const z=u*a[2]+w*b[2]+k*c[2];if(z>best){best=z;face=f;}}return face;}
 return {prepare,draw,pick};
}
root.QuotientSurfaceView={build,create};
})(typeof window==='undefined'?globalThis:window);
