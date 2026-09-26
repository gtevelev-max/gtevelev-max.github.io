/* A finite visible patch of the actual universal tessellation.  Its retained
 * chambers use exactly the same covering frames and projection as the gluing
 * region.  Only the extra chambers fade away; the retained region never moves.
 */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CoverPatch=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function build(data,g,M,net){
 if(g.k===1)return {triangles:[],spherical:true,verification:{retainedChambers:data.counts.triangles}};
 const F=data.counts.triangles,frames=new Array(F),tree=Array.from({length:F},()=>[]);
 for(const [f,s,h] of data.dualSpanningTree){tree[f].push([h,s]);tree[h].push([f,s]);}
 frames[0]=M.I();const queue=[0];for(let at=0;at<queue.length;at++)for(const [h,s] of tree[queue[at]])if(!frames[h]){frames[h]=M.mul(frames[queue[at]],g.mirrors[s]);queue.push(h);}
 const project=v=>{const p=[v[0]/v[2],v[1]/v[2]];return g.k===0?p.map((x,j)=>(x-net.region.center[j])*net.region.scale):p;};
 const cells=new Map(),cellScale=1e6,triangles=[],heap=[];
 let retainedError=0,rejectedTiny=0;
 const relative=(a,b)=>{let d=0,size=1;for(let i=0;i<9;i++){d=Math.max(d,Math.abs(a[i]-b[i]));size=Math.max(size,Math.abs(a[i]),Math.abs(b[i]));}return d/size;};
 function register(matrix,label,force){
  const center=project(M.mv(matrix,g.center));if(!center.every(Number.isFinite))return null;
  const ix=Math.round(center[0]*cellScale),iy=Math.round(center[1]*cellScale);
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const old of cells.get((ix+dx)+','+(iy+dy))||[])if(old.label===label&&relative(matrix,old.matrix)<1e-9)return null;
  const points=g.vertices.map(v=>project(M.mv(matrix,v)));
  const area=Math.abs((points[1][0]-points[0][0])*(points[2][1]-points[0][1])-(points[1][1]-points[0][1])*(points[2][0]-points[0][0]))/2;
  if(!force&&(g.k===0?Math.max(Math.abs(center[0]),Math.abs(center[1]))>6:area<2e-8||Math.hypot(...center)>.99994)){rejectedTiny++;return null;}
  const node={matrix,label,points,area};const key=ix+','+iy;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(node);return node;
 }
 function push(node){let i=heap.length;heap.push(node);while(i){const p=(i-1)>>1;if(heap[p].area>=node.area)break;heap[i]=heap[p];i=p;}heap[i]=node;}
 function pop(){const head=heap[0],last=heap.pop();if(heap.length){let i=0;while(2*i+1<heap.length){let j=2*i+1;if(j+1<heap.length&&heap[j+1].area>heap[j].area)j++;if(last.area>=heap[j].area)break;heap[i]=heap[j];i=j;}heap[i]=last;}return head;}
 for(let f=0;f<F;f++){
  const node=register(frames[f],f,true);if(!node)throw Error('Repeated retained chamber in universal tessellation');
  for(let k=0;k<3;k++){const p=net.positions[net.corners[f][k]];retainedError=Math.max(retainedError,Math.hypot(node.points[k][0]-p[0],node.points[k][1]-p[1]));}
 }
 if(retainedError>1e-9)throw Error('Cover tessellation does not match its retained region');
 // Start at every boundary side.  Prioritizing projected area spends work on
 // visible chambers before the indefinitely small triangles at the disk edge.
 for(const b of net.boundary){const n=register(M.mul(frames[b.face],g.mirrors[b.side]),data.neighbors[b.face][b.side],false);if(n)push(n);}
 const limit=g.k===0?5000:F>10000?26000:20000;
 while(heap.length&&triangles.length<limit){const n=pop();triangles.push({points:n.points,parity:n.label&1});for(let s=0;s<3;s++){const h=register(M.mul(n.matrix,g.mirrors[s]),data.neighbors[n.label][s],false);if(h)push(h);}}
 return {triangles,spherical:false,verification:{retainedChambers:F,additionalChambers:triangles.length,maxRetainedCornerError:retainedError,projection:g.k===-1?'Klein disk':'Euclidean plane',finiteVisiblePatch:true,unresolvedSmallChambers:rejectedTiny,queuedChambers:heap.length}};
}
return {build};
});
