/* Piecewise-linear charts of the actual quotient chambers. */
(function(root){
'use strict';
const cache=new Map(),loading=new Map();
const pair=(a,b)=>a<b?a+':'+b:b+':'+a;
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
async function load(id){
 if(cache.has(id))return cache.get(id);if(loading.has(id))return loading.get(id);
 const manifest=root.REFINED_SURFACE_MANIFEST?.[id];
 if(!root.REFINED_SURFACE_PACKED?.[id]&&manifest){
  const script=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src+'?v='+(manifest.version||'balanced-area-1');s.onload=resolve;s.onerror=()=>reject(Error('Could not load the complete surface model. Please reload the page.'));document.head.append(s);});
  const work=(async()=>{await script(manifest.files[0]);await Promise.all(manifest.files.slice(1).map(script));return decode(id);})();loading.set(id,work);try{return await work;}finally{loading.delete(id);}
 }
 return decode(id);
}
async function decode(id){
 const chunks=root.REFINED_SURFACE_PACKED?.[id];if(!chunks)return null;
 const bytes=Uint8Array.from(atob(chunks.join('')),c=>c.charCodeAt(0));
 const buffer=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
 const h=new DataView(buffer),text=new TextDecoder();
 if(text.decode(new Uint8Array(buffer,0,8))!=='M611SURF')throw Error('Invalid surface certificate.');
 const nv=h.getUint32(8,true),nf=h.getUint32(12,true),len=h.getUint32(16,true),meta=JSON.parse(text.decode(new Uint8Array(buffer,24,len)));
 let offset=Math.ceil((24+len)/8)*8;
 const positions=new Float64Array(buffer,offset,3*nv);offset+=24*nv;
 const vertices=new Uint32Array(buffer,offset,3*nf);offset+=12*nf;
 const chambers=new Uint32Array(buffer,offset,nf);offset+=4*nf;
 const bary=new Float64Array(buffer,offset,9*nf);offset+=72*nf;
 if(offset!==buffer.byteLength)throw Error('Truncated surface certificate.');
 const data={meta,nv,nf,positions,vertices,chambers,bary};cache.set(id,data);root.REFINED_SURFACE_PACKED[id]=null;return data;
}
function build(data,raw){
 if(!raw)return null;
 const {positions,vertices,chambers,bary,nf,nv,meta}=raw;
 const byFace=Array.from({length:data.counts.triangles},()=>[]);
 let lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<nv;i++)for(let j=0;j<3;j++){lo[j]=Math.min(lo[j],positions[3*i+j]);hi[j]=Math.max(hi[j],positions[3*i+j]);}
 const origin=lo.map((x,i)=>(x+hi[i])/2);let radius=0;
 for(let i=0;i<nv;i++)radius=Math.max(radius,Math.hypot(positions[3*i]-origin[0],positions[3*i+1]-origin[1],positions[3*i+2]-origin[2]));
 const pos=v=>Array.from(positions.subarray(3*v,3*v+3));
 for(let p=0;p<nf;p++)byFace[chambers[p]].push(p);
 if(byFace.some(ps=>ps.length===0))throw Error('An original chamber is missing from the surface.');
 const weights=(p,k)=>Array.from(bary.subarray(9*p+3*k,9*p+3*k+3));
 function coordinates(p,w){
  const k=9*p,ax=bary[k],ay=bary[k+1],bx=bary[k+3],by=bary[k+4],cx=bary[k+6],cy=bary[k+7];
  const det=(bx-cx)*(ay-cy)+(cy-by)*(ax-cx);
  if(Math.abs(det)<1e-28)return null;
  const u=((bx-cx)*(w[1]-cy)+(cy-by)*(w[0]-cx))/det;
  const v=((cx-ax)*(w[1]-cy)+(ay-cy)*(w[0]-cx))/det;
  return [u,v,1-u-v];
 }
 function locate(f,w){
  let best=null,bestScore=-Infinity;
  for(const p of byFace[f]){const q=coordinates(p,w);if(!q)continue;const score=Math.min(...q);if(score>bestScore){best={p,q};bestScore=score;}if(score>=-1e-10)break;}
  if(!best||bestScore<-.00001)throw Error('A point lies outside its source chamber chart.');
  return best;
 }
 function sample(f,w){
  const best=locate(f,w);
  return [0,1,2].map(j=>best.q.reduce((s,x,k)=>s+x*positions[3*vertices[3*best.p+k]+j],0));
 }
 const boundaries=Array.from({length:data.counts.triangles},()=>[[],[],[]]);
 for(let p=0;p<nf;p++){
  const f=chambers[p];
  for(let k=0;k<3;k++){const w=weights(p,k),v=vertices[3*p+k];for(let side=0;side<3;side++)if(Math.abs(w[side])<1e-13)boundaries[f][side].push({w,to:pos(v),v});}
 }
 for(let f=0;f<boundaries.length;f++)for(let side=0;side<3;side++){
  const axis=(side+1)%3,a=boundaries[f][side];a.sort((u,v)=>u.w[axis]-v.w[axis]);
  boundaries[f][side]=a.filter((v,i)=>i===0||Math.abs(v.w[axis]-a[i-1].w[axis])>1e-13);
 }
 function path(f,a,b){
  const parameters=[0,1],dx=b[0]-a[0],dy=b[1]-a[1];
  for(const p of byFace[f])for(let k=0;k<3;k++){
   const u=weights(p,k),v=weights(p,(k+1)%3),ex=v[0]-u[0],ey=v[1]-u[1],det=dx*ey-dy*ex;
   if(Math.abs(det)<1e-20)continue;
   const t=((u[0]-a[0])*ey-(u[1]-a[1])*ex)/det,s=((u[0]-a[0])*dy-(u[1]-a[1])*dx)/det;
   if(t>1e-12&&t<1-1e-12&&s>=-1e-10&&s<=1+1e-10)parameters.push(t);
  }
  parameters.sort((a,b)=>a-b);
  return parameters.filter((x,i)=>!i||x-parameters[i-1]>1e-11).map(t=>{const w=lerp(a,b,t);return {w,to:sample(f,w)};});
 }
 // These are parts of the existing embedding, not additional quotient cells.
 // The final three rendering patches fold one original chamber underneath
 // the perforated sheet. Each tube range includes its two attachment collars.
 const parts=new Float32Array(nf),underside={patchStart:nf-3,patchEnd:nf,chamber:chambers[nf-1]};
 if(nf<3||Array.from(chambers.subarray(nf-3)).some(f=>f!==underside.chamber))throw Error('The underside must be three patches of one original chamber.');
 parts.fill(-1,underside.patchStart,underside.patchEnd);
 const point=(p,k)=>({v:vertices[3*p+k],w:weights(p,k),to:pos(vertices[3*p+k])});
 const handles=(meta.tubes||[]).map((t,h)=>{
  const n=t.sourceChambers.length;
  if(!Number.isInteger(t.patchStart)||!Number.isInteger(t.patchEnd)||t.patchStart<0||t.patchEnd>underside.patchStart||t.patchEnd-t.patchStart<4*n)throw Error('Invalid attachment patch range.');
  for(let p=t.patchStart;p<t.patchEnd;p++){if(parts[p]!==0)throw Error('Overlapping handle patch ranges.');parts[p]=h+1;}
  // The first and last collar quads retain the actual polygonal hole rims.
  // Keep their source barycentrics so the outlines follow the same gluing
  // animation as the adjacent chamber patches, including at chamber edges.
  const attachments=t.endpointCenters.map((center,end)=>({center:[...center,0],rim:Array.from({length:n},(_,i)=>{
   const p=end?t.patchEnd-2*n+2*i+1:t.patchStart+2*i;
   return {f:chambers[p],a:point(p,1),b:point(p,end?2:0)};
  })}));
  return {...t,attachments,footRadius:t.footRadii?.[0]??Math.min(...[0,1,2].map(k=>{const p=pos(vertices[3*t.patchStart+k]);return Math.hypot(p[0]-t.endpointCenters[0][0],p[1]-t.endpointCenters[0][1]);}))};
 });
 // Boundary and gallery segments already split at rendering-patch edges.
 // Their source midpoint therefore identifies the component for visibility.
 const partAt=(f,w)=>parts[locate(f,w).p];
 return {kind:'refined',genus:meta.genus,raw,byFace,boundaries,weights,pos,sample,partAt,path,origin,radius,parts,underside,
  center:f=>sample(f,[1/3,1/3,1/3]),validation:meta.verification,handles,focus:origin.slice(),scale:.97/radius};
}
root.RefinedSurfaceModel={load,build};
})(typeof window==='undefined'?globalThis:window);
