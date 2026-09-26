/* Exact chamber parametrizations for the spherical and Euclidean examples.
 * Refinement is only for drawing curved patches: chamber IDs, sides and vertices
 * remain those of the supplied quotient, including parallel torus edges.
 */
(function(root){
'use strict';
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const norm=a=>Math.hypot(...a);
const unit=a=>a.map(x=>x/norm(a));
const cross2=(a,b)=>a[0]*b[1]-a[1]*b[0];
function develop(data,M){
 const geometry=M.makeGeometry(...data.signature),matrices=Array(data.counts.triangles);
 matrices[0]=M.I();const queue=[0];
 for(let i=0;i<queue.length;i++)for(let side=0;side<3;side++){
  const f=queue[i],n=data.neighbors[f][side];
  if(!matrices[n]){matrices[n]=M.mul(matrices[f],geometry.mirrors[side]);queue.push(n);}
 }
 if(queue.length!==data.counts.triangles)throw Error('Disconnected chamber complex.');
 return {geometry,matrices,corners:matrices.map(m=>geometry.vertices.map(v=>M.mv(m,v)))};
}
function combine(corners,w){return corners[0].map((_,j)=>corners.reduce((s,v,i)=>s+w[i]*v[j],0));}
function validateGluing(data,model){
 let maxError=0;
 for(let f=0;f<data.counts.triangles;f++)for(let side=0;side<3;side++){
  const n=data.neighbors[f][side],a=(side+1)%3,b=(side+2)%3;
  for(let i=0;i<=8;i++){
   const w=[0,0,0];w[a]=i/8;w[b]=1-i/8;
   maxError=Math.max(maxError,norm(sub(model.sample(f,w),model.sample(n,w))));
  }
 }
 if(maxError>1e-7)throw Error('The surface model fails an identified-side check: '+maxError);
 return maxError;
}
function sphere(data,M){
 const developed=develop(data,M),vertices=Array(data.counts.vertices);
 for(let f=0;f<data.counts.triangles;f++)for(let type=0;type<3;type++){
  const id=data.faceVertices[f][type],v=unit(developed.corners[f][type]);
  if(vertices[id]&&norm(sub(v,vertices[id]))>1e-7)throw Error('The spherical quotient does not develop to one sphere.');
  vertices[id]=v;
 }
 const corners=data.faceVertices.map(face=>face.map(v=>vertices[v]));
 const model={kind:'sphere',genus:0,corners,vertexPositions:vertices,
  sample:(f,w)=>unit(combine(corners[f],w)),
  normal:(f,w)=>unit(combine(corners[f],w)),
  explanation:'Original quotient chambers on the unit sphere. Their sides are great-circle arcs.'};
 model.center=f=>model.sample(f,[1/3,1/3,1/3]);
 model.validation={maxGluingError:validateGluing(data,model),vertices:data.counts.vertices,edges:data.counts.edges,chambers:data.counts.triangles};
 return model;
}
function torus(data,M){
 const developed=develop(data,M),residuals=[];
 const {geometry,matrices,corners}=developed;
 // A closed gallery changes a developed triangle by a kernel translation.
 // Record all nonzero translations arising from the finite chamber graph.
 for(let f=0;f<data.counts.triangles;f++)for(let side=0;side<3;side++){
  const n=data.neighbors[f][side],arrival=M.mul(matrices[f],geometry.mirrors[side]);
  if([0,1,3,4,6,7,8].some(k=>Math.abs(arrival[k]-matrices[n][k])>1e-7))throw Error('This Euclidean quotient kernel has a nontranslation generator.');
  const t=[arrival[2]-matrices[n][2],arrival[5]-matrices[n][5]];
  if(norm(t)>1e-7&&!residuals.some(v=>norm(sub(v,t))<1e-7))residuals.push(t);
 }
 let basis=null,area=Infinity;
 for(const a of residuals)for(const b of residuals){const det=cross2(a,b);if(det>1e-7&&det<area-1e-7){area=det;basis=[a,b];}}
 if(!basis)throw Error('No translation lattice found.');
 const [a,b]=basis,toUV=p=>[cross2(p,b)/area,cross2(a,p)/area];
 let latticeError=0;
 for(const t of residuals)for(const x of toUV(t))latticeError=Math.max(latticeError,Math.abs(x-Math.round(x)));
 if(latticeError>1e-7)throw Error('The inferred translation lattice is not primitive.');
 const v=geometry.vertices,triangleArea=Math.abs(cross2(sub(v[1],v[0]),sub(v[2],v[0])))/2;
 if(Math.abs(area-data.counts.triangles*triangleArea)>1e-7)throw Error('The torus lattice has the wrong area/index.');
 const uv=corners.map(face=>face.map(v=>toUV(v.slice(0,2))));
 const R=.94,r=.39;
 const angles=(f,w)=>combine(uv[f],w).map(t=>2*Math.PI*t);
 const position=([u,v])=>[(R+r*Math.cos(v))*Math.cos(u),(R+r*Math.cos(v))*Math.sin(u),r*Math.sin(v)];
 const model={kind:'torus',genus:1,uv,lattice:basis,latticeArea:area,majorRadius:R,minorRadius:r,
  sample:(f,w)=>position(angles(f,w)),
  normal:(f,w)=>{const [u,v]=angles(f,w);return [Math.cos(v)*Math.cos(u),Math.cos(v)*Math.sin(u),Math.sin(v)];},
  explanation:'The exact 12-chamber flat quotient is parametrized by its primitive translation lattice, then bent into a torus. Curved chamber boundaries retain their original edge IDs.'};
 model.corners=data.faceVertices.map((_,f)=>[[1,0,0],[0,1,0],[0,0,1]].map(w=>model.sample(f,w)));
 model.center=f=>model.sample(f,[1/3,1/3,1/3]);
 model.validation={maxGluingError:validateGluing(data,model),latticeError,latticeArea:area,expectedArea:data.counts.triangles*triangleArea,vertices:data.counts.vertices,edges:data.counts.edges,chambers:data.counts.triangles};
 return model;
}
// Uniform display refinement, with every mini-triangle retaining its parent
// chamber ID. Only w[i]=0 samples belong to an original chamber boundary.
function refinement(n){
 const triangles=[];
 const w=(i,j)=>[i/n,j/n,(n-i-j)/n];
 for(let i=0;i<n;i++)for(let j=0;j<n-i;j++){
  triangles.push([w(i,j),w(i+1,j),w(i,j+1)]);
  if(i+j<n-1)triangles.push([w(i+1,j),w(i+1,j+1),w(i,j+1)]);
 }
 return triangles;
}
function build(data,M){if(data.genus===0&&data.geometry==='spherical')return sphere(data,M);if(data.id==='torus')return torus(data,M);return null;}
const API={build,sphere,torus,refinement,validateGluing};
if(typeof module!=='undefined')module.exports=API;root.QuotientSurfaceModels=API;
})(typeof window==='undefined'?globalThis:window);
