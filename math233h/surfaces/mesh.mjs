import {byId,defaults} from './math.mjs';
const tetrahedra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
const corners=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
const edges=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const subtract=(a,b)=>a.map((x,i)=>x-b[i]);
const dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0);
const unit=a=>{const d=Math.hypot(...a);return d>1e-12?a.map(x=>x/d):[0,0,0];};
export function makeMesh({id,p=defaults,bound,n=36}){
 const surface=byId[id],f=surface.field,grad=surface.grad,side=n+1,step=2*bound/n;
 const grid=new Float64Array(side**3),vertices=[],normals=[];
 const index=(i,j,k)=>(k*side+j)*side+i;
 for(let k=0;k<=n;k++)for(let j=0;j<=n;j++)for(let i=0;i<=n;i++)grid[index(i,j,k)]=f(-bound+i*step,-bound+j*step,-bound+k*step,p);
 let singularFallbacks=0;
 for(let k=0;k<n;k++)for(let j=0;j<n;j++)for(let i=0;i<n;i++){
  const values=corners.map(([u,v,w])=>grid[index(i+u,j+v,k+w)]);
  if(values.every(v=>v>=0)||values.every(v=>v<0))continue;
  const points=corners.map(([u,v,w])=>[-bound+(i+u)*step,-bound+(j+v)*step,-bound+(k+w)*step]);
  for(const tet of tetrahedra){
   const hits=[];
   for(const [ea,eb] of edges){const a=tet[ea],b=tet[eb],fa=values[a],fb=values[b];if((fa>=0)===(fb>=0))continue;
    const A=points[a],B=points[b];let low=0,high=1,fl=fa,fh=fb,t=fa/(fa-fb),q;
    // Safeguarded secant refinement keeps each vertex on its original edge.
    for(let iteration=0;iteration<22;iteration++){q=A.map((v,d)=>v+(B[d]-v)*t);const v=f(...q,p);if(Math.abs(v)<1e-12)break;if((v>=0)===(fl>=0)){low=t;fl=v;}else{high=t;fh=v;}const next=low-fl*(high-low)/(fh-fl);if(!Number.isFinite(next))break;t=iteration%2===1||next<low+.05*(high-low)||next>high-.05*(high-low)?(low+high)/2:Math.max(low,Math.min(high,next));}
    hits.push(q);
   }
   if(hits.length<3)continue;
   const center=[0,1,2].map(d=>hits.reduce((sum,q)=>sum+q[d],0)/hits.length),normal=unit(grad(...center,p));
   const face=unit(cross(subtract(hits[1],hits[0]),subtract(hits[2],hits[0]))),normalUse=Math.hypot(...normal)>0?normal:face;
   const u=unit(subtract(hits[0],center)),v=cross(normalUse,u);
   hits.sort((a,b)=>Math.atan2(dot(subtract(a,center),v),dot(subtract(a,center),u))-Math.atan2(dot(subtract(b,center),v),dot(subtract(b,center),u)));
   for(let h=1;h<hits.length-1;h++){
    const tri=[hits[0],hits[h],hits[h+1]];let faceNormal=unit(cross(subtract(tri[1],tri[0]),subtract(tri[2],tri[0])));
    const triangleCenter=[0,1,2].map(d=>(tri[0][d]+tri[1][d]+tri[2][d])/3);
    if(dot(faceNormal,grad(...triangleCenter,p))<0){[tri[1],tri[2]]=[tri[2],tri[1]];faceNormal=faceNormal.map(v=>-v);}
    if(Math.hypot(...faceNormal)<.5)continue;
    for(const q of tri){const g=unit(grad(...q,p));if(Math.hypot(...g)<.5){normals.push(...faceNormal);singularFallbacks++;}else normals.push(...g);vertices.push(...q);}
   }
  }
 }
 return {positions:new Float32Array(vertices),normals:new Float32Array(normals),triangles:vertices.length/9,singularFallbacks};
}
