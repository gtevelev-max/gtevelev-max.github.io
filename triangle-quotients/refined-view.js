/* GPU morphing of source-labelled subdivisions. Original chambers, not the
 * small drawing triangles, determine colors, picking, boundaries and walks.
 */
(function(root){
'use strict';
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const unit=a=>{const d=Math.hypot(...a)||1;return a.map(x=>x/d);};
function create(){
 const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:true});
 if(!gl)throw Error('WebGL is required for the glued surface.');
 const fragmentDepth=!!gl.getExtension('EXT_frag_depth'),derivatives=!!gl.getExtension('OES_standard_derivatives');
 const fragmentPrecision=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT)?.precision?'highp':'mediump';
 const common=`uniform mat3 rotation;uniform float fold;uniform vec2 scale;uniform vec2 pan;uniform ${fragmentPrecision} float depth;uniform ${fragmentPrecision} float depthBias;varying ${fragmentPrecision} vec3 viewPosition;vec3 world(vec3 a,vec3 b){return mix(a,rotation*b,fold);}vec3 project(vec3 p){return vec3(p.xy*scale+pan,${fragmentDepth?'0.0':'-p.z*depth-2.0*depthBias'});}`;
 const fragmentHeader=(useNormals=false)=>(fragmentDepth?'#extension GL_EXT_frag_depth : enable\n':'')+(useNormals&&derivatives?'#extension GL_OES_standard_derivatives : enable\n':'')+`precision ${fragmentPrecision} float;varying ${fragmentPrecision} vec3 viewPosition;uniform float depth;uniform float depthBias;`;
 // Transform the interpolated depth, not just the vertices. A monotone depth
 // map preserves front-to-back order while retaining precision near the focus.
 // Keeping vertex z inside the frustum avoids cutting handles as zoom changes.
 const writeDepth=fragmentDepth?'gl_FragDepthEXT=clamp(0.5-atan(viewPosition.z*depth)/3.141592653589793-depthBias,0.0,1.0);':'';
 function make(vs,fs){
  const p=gl.createProgram();for(const [type,src] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Surface '+(type===gl.VERTEX_SHADER?'vertex':'fragment')+' shader: '+gl.getShaderInfoLog(s));gl.attachShader(p,s);}gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('Surface shader link: '+gl.getProgramInfoLog(p));return p;
 }
 const triangles=make(`precision highp float;attribute vec3 from;attribute vec3 to;attribute vec3 normal;attribute float face;uniform float selected;varying ${fragmentPrecision} vec3 color;varying ${fragmentPrecision} vec3 fallbackNormal;${common}
 void main(){viewPosition=world(from,to);gl_Position=vec4(project(viewPosition),1.0);fallbackNormal=mix(vec3(0,0,1),rotation*normal,fold);color=mod(face,2.0)<.5?vec3(.57,.85,.73):vec3(.23,.49,.55);if(abs(face-selected)<.1)color=vec3(1,.76,.38);}`,
 fragmentHeader(true)+`varying ${fragmentPrecision} vec3 color;varying ${fragmentPrecision} vec3 fallbackNormal;vec3 stableDirection(vec3 v){return v/max(max(max(abs(v.x),abs(v.y)),abs(v.z)),1.0e-30);}void main(){vec3 n=${derivatives?'cross(stableDirection(dFdx(viewPosition)),stableDirection(dFdy(viewPosition)))':'fallbackNormal'};float magnitude=length(n);if(magnitude>0.0)n/=magnitude;else n=vec3(0,0,1);float light=.55+.45*abs(dot(n,normalize(vec3(-.35,.65,1))));gl_FragColor=vec4(color*light,1);${writeDepth}}`);
 const lines=make(`precision highp float;attribute vec3 from;attribute vec3 to;attribute vec3 otherFrom;attribute vec3 otherTo;attribute float side;attribute float face;attribute float edge;uniform float selected;uniform float seam;uniform float seamFace;uniform float wire;uniform float route;uniform vec2 viewport;varying ${fragmentPrecision} vec3 color;varying ${fragmentPrecision} float visible;${common}
 void main(){viewPosition=world(from,to);vec3 p=project(viewPosition),q=project(world(otherFrom,otherTo));vec2 delta=(q.xy-p.xy)*viewport;float len=max(.000001,length(delta));vec2 normal=vec2(-delta.y,delta.x)/len;bool active=abs(edge-seam)<.1;bool chosen=abs(face-selected)<.1;float width=route>.5?2.6:(active||chosen?2.1:.85);p.xy+=side*normal*width/viewport;gl_Position=vec4(p,1);color=route>.5?vec3(1,.82,.34):active?(abs(face-seamFace)<.1?vec3(1,.70,.32):vec3(1,.89,.65)):chosen?vec3(1,.87,.55):vec3(.1,.24,.26);visible=(wire>.5||active||chosen||route>.5)?1.0:0.0;}`,
 fragmentHeader()+`varying vec3 color;varying float visible;void main(){if(visible<.5)discard;gl_FragColor=vec4(color,1);${writeDepth}}`);
 const picking=make(`precision highp float;attribute vec3 from;attribute vec3 to;attribute float face;varying ${fragmentPrecision} vec3 idColor;${common}
 void main(){viewPosition=world(from,to);gl_Position=vec4(project(viewPosition),1);float id=face+1.0;idColor=vec3(mod(id,256.0),mod(floor(id/256.0),256.0),floor(id/65536.0))/255.0;}`,
 fragmentHeader()+`varying vec3 idColor;void main(){gl_FragColor=vec4(idColor,1);${writeDepth}}`);
 const triangleBuffer=gl.createBuffer(),edgeBuffer=gl.createBuffer(),routeBuffer=gl.createBuffer();
 const uniforms=new Map();for(const p of [triangles,lines,picking]){const u={};for(const n of ['rotation','fold','scale','pan','depth','depthBias','selected','seam','seamFace','wire','route','viewport'])u[n]=gl.getUniformLocation(p,n);uniforms.set(p,u);}
 gl.clearColor(0,0,0,0);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
 const pathCache=new Map();
 let data,net,model,triangleArray,edgeArray,triangleCount=0,edgeCount=0,routeCount=0,walkKey='',lastFocus='',lastOptions,edgeSpecs=[],routeSpecs=[];
 const cut=(f,w)=>[0,1,2].map(j=>j===2?0:w.reduce((s,v,i)=>s+v*net.positions[net.corners[f][i]][j],0));
 const target=p=>p.map((x,i)=>(x-model.focus[i])*model.scale);
 function upload(){
  const {raw}=model,{nf,vertices,positions,chambers,bary}=raw;
  triangleArray=new Float32Array(nf*3*10);let at=0;
  for(let p=0;p<nf;p++){
   const ps=[0,1,2].map(k=>model.pos(vertices[3*p+k]));
   const n=unit(cross(sub(ps[1],ps[0]),sub(ps[2],ps[0])));
   for(let k=0;k<3;k++){const w=Array.from(bary.subarray(9*p+3*k,9*p+3*k+3));triangleArray.set([...cut(chambers[p],w),...target(ps[k]),...n,chambers[p]],at);at+=10;}
  }
  gl.bindBuffer(gl.ARRAY_BUFFER,triangleBuffer);gl.bufferData(gl.ARRAY_BUFFER,triangleArray,gl.STATIC_DRAW);triangleCount=nf*3;
  edgeArray=makeLines(edgeSpecs);gl.bindBuffer(gl.ARRAY_BUFFER,edgeBuffer);gl.bufferData(gl.ARRAY_BUFFER,edgeArray,gl.STATIC_DRAW);edgeCount=edgeArray.length/15;
  uploadRoute();lastFocus=model.focus.join(',');
 }
 function rebase(){
  // Only destination coordinates change when inspecting a small handle.
  // Avoid rebuilding normals, source charts and millions of temporary arrays.
  const {raw}=model,p=raw.positions,v=raw.vertices,f=model.focus,s=model.scale;
  for(let i=0;i<v.length;i++){const a=3*v[i],b=10*i+3;triangleArray[b]=(p[a]-f[0])*s;triangleArray[b+1]=(p[a+1]-f[1])*s;triangleArray[b+2]=(p[a+2]-f[2])*s;}
  gl.bindBuffer(gl.ARRAY_BUFFER,triangleBuffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,triangleArray);
  const order=[0,0,1,1,0,1];
  for(let i=0;i<edgeSpecs.length;i++){
   const a=edgeSpecs[i].a.to,b=edgeSpecs[i].b.to;
   for(let k=0;k<6;k++){const u=order[k]?b:a,w=order[k]?a:b,off=i*90+k*15;for(let j=0;j<3;j++){edgeArray[off+3+j]=(u[j]-f[j])*s;edgeArray[off+9+j]=(w[j]-f[j])*s;}}
  }
  gl.bindBuffer(gl.ARRAY_BUFFER,edgeBuffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,edgeArray);uploadRoute();lastFocus=model.focus.join(',');
 }
 function makeLines(specs){
  const result=new Float32Array(specs.length*6*15);let at=0;
  for(const {f,e,a,b} of specs){const af=cut(f,a.w),bf=cut(f,b.w),ap=target(a.to),bp=target(b.to);
   for(const [which,side] of [[0,1],[0,-1],[1,-1],[1,-1],[0,-1],[1,1]]){
    // Reversing the endpoint reverses the transverse normal.
    const values=which?[...bf,...bp,...af,...ap,side,f,e]:[...af,...ap,...bf,...bp,side,f,e];result.set(values,at);at+=15;
   }
  }return result;
 }
 function uploadRoute(){const values=makeLines(routeSpecs);gl.bindBuffer(gl.ARRAY_BUFFER,routeBuffer);gl.bufferData(gl.ARRAY_BUFFER,values,gl.DYNAMIC_DRAW);routeCount=values.length/15;}
 function prepare(d,n,m){
  data=d;net=n;model=m;pathCache.clear();edgeSpecs=[];routeSpecs=[];walkKey='';
  for(let f=0;f<d.counts.triangles;f++)for(let side=0;side<3;side++){
   const points=m.boundaries[f][side];for(let j=1;j<points.length;j++)edgeSpecs.push({f,e:d.faceEdges[f][side],a:points[j-1],b:points[j]});
  }
  upload();
 }
 function commonUniforms(p,o,rotation){
  gl.useProgram(p);const u=uniforms.get(p),R=Math.min(o.width,o.height)*.445*o.zoom;
  // In the fallback, bound the whole rotated surface after rebasing. Zoom
  // changes only the screen magnification; it never shrinks the depth range.
  const shiftedRadius=(model.radius+Math.hypot(...model.focus.map((x,j)=>x-model.origin[j])))*model.scale;
  const depth=fragmentDepth?.18*Math.max(1,o.zoom):.9/Math.max(1,shiftedRadius);
  gl.uniformMatrix3fv(u.rotation,false,rotation);gl.uniform1f(u.fold,o.t);gl.uniform2f(u.scale,2*R/o.width,2*R/o.height);gl.uniform2f(u.pan,2*o.pan[0]/o.width,-2*o.pan[1]/o.height);gl.uniform1f(u.depth,depth);gl.uniform1f(u.depthBias,p===lines?2/16777215:0);gl.uniform1f(u.selected,o.selected);
  if(p===lines){gl.uniform1f(u.seam,o.seam?.edge??-1);gl.uniform1f(u.seamFace,o.seam?.first.face??-1);gl.uniform1f(u.wire,o.wire?1:0);gl.uniform2f(u.viewport,o.width,o.height);}
 }
 function attributes(p,buffer,fields,stride){
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);for(let i=0;i<8;i++)gl.disableVertexAttribArray(i);let offset=0;
  for(const [name,size] of fields){const loc=gl.getAttribLocation(p,name);if(loc>=0){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,stride*4,offset*4);}offset+=size;}
 }
 function draw(ctx,o){
  if(canvas.width!==Math.round(o.width*o.dpr))canvas.width=Math.round(o.width*o.dpr);if(canvas.height!==Math.round(o.height*o.dpr))canvas.height=Math.round(o.height*o.dpr);
  if(lastFocus!==model.focus.join(','))rebase();
  const key=(o.walk||[]).join(',');if(key!==walkKey){walkKey=key;routeSpecs=[];
   for(let i=1;i<(o.walk||[]).length;i++){const a=o.walk[i-1],b=o.walk[i],side=data.neighbors[a].indexOf(b);if(side<0)continue;const middle=[.5,.5,.5];middle[side]=0;
    for(const f of [a,b]){const cacheKey=f+':'+side;let points=pathCache.get(cacheKey);if(!points){points=model.path(f,[1/3,1/3,1/3],middle);pathCache.set(cacheKey,points);}for(let j=1;j<points.length;j++)routeSpecs.push({f,e:-2,a:points[j-1],b:points[j]});}
   }uploadRoute();
  }
  const cy=Math.cos(o.yaw),sy=Math.sin(o.yaw),cp=Math.cos(o.pitch),sp=Math.sin(o.pitch),rotation=[cy,sp*sy,-cp*sy,0,cp,sp,sy,-sp*cy,cp*cy];
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  gl.viewport(0,0,canvas.width,canvas.height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  commonUniforms(triangles,o,rotation);attributes(triangles,triangleBuffer,[['from',3],['to',3],['normal',3],['face',1]],10);gl.drawArrays(gl.TRIANGLES,0,triangleCount);
  commonUniforms(lines,o,rotation);const fields=[['from',3],['to',3],['otherFrom',3],['otherTo',3],['side',1],['face',1],['edge',1]];
  gl.uniform1f(uniforms.get(lines).route,0);attributes(lines,edgeBuffer,fields,15);gl.drawArrays(gl.TRIANGLES,0,edgeCount);
  if(routeCount){gl.uniform1f(uniforms.get(lines).route,1);attributes(lines,routeBuffer,fields,15);gl.drawArrays(gl.TRIANGLES,0,routeCount);}
  ctx.drawImage(canvas,0,0,o.width,o.height);lastOptions={...o,rotation};
 }
 function pick(x,y){
  if(!lastOptions)return null;const o=lastOptions,w=canvas.width,h=canvas.height;
  // The offscreen canvas has already been copied into the visible 2D canvas.
  // Reusing its default framebuffer gives selection exactly the same depth
  // format as the drawing and avoids a separate lower-precision depth buffer.
  const px=Math.max(0,Math.min(w-1,Math.floor(x*w/o.width))),py=Math.max(0,Math.min(h-1,h-1-Math.floor(y*h/o.height))),pixel=new Uint8Array(4);
  const dither=gl.isEnabled(gl.DITHER),scissor=gl.isEnabled(gl.SCISSOR_TEST),scissorBox=gl.getParameter(gl.SCISSOR_BOX);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,w,h);gl.enable(gl.SCISSOR_TEST);gl.scissor(px,py,1,1);gl.disable(gl.DITHER);
  try{
   gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   commonUniforms(picking,o,o.rotation);attributes(picking,triangleBuffer,[['from',3],['to',3],['normal',3],['face',1]],10);gl.drawArrays(gl.TRIANGLES,0,triangleCount);gl.readPixels(px,py,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
  }finally{
   if(dither)gl.enable(gl.DITHER);else gl.disable(gl.DITHER);
   gl.scissor(...scissorBox);if(scissor)gl.enable(gl.SCISSOR_TEST);else gl.disable(gl.SCISSOR_TEST);
  }
  const face=pixel[0]+256*pixel[1]+65536*pixel[2]-1;return face>=0&&face<data.counts.triangles?face:null;
 }

 return {prepare,draw,pick};
}
root.RefinedSurfaceRenderer={create};
})(typeof window==='undefined'?globalThis:window);
