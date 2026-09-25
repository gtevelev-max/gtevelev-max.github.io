/* Constant-curvature reflection geometry. No third-party dependencies. */
(function(root){
'use strict';
const I=()=>[1,0,0,0,1,0,0,0,1];
const mul=(a,b)=>Array.from({length:9},(_,i)=>{let r=Math.floor(i/3),c=i%3;return a[r*3]*b[c]+a[r*3+1]*b[c+3]+a[r*3+2]*b[c+6]});
const mv=(m,v)=>[m[0]*v[0]+m[1]*v[1]+m[2]*v[2],m[3]*v[0]+m[4]*v[1]+m[5]*v[2],m[6]*v[0]+m[7]*v[1]+m[8]*v[2]];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const add=(a,b)=>a.map((x,i)=>x+b[i]);
const scale=(a,k)=>a.map(x=>x*k);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function dot(a,b,k){return a[0]*b[0]+a[1]*b[1]+k*a[2]*b[2]}
function norm(v,k){return k===0?[v[0]/v[2],v[1]/v[2],1]:scale(v,1/Math.sqrt(Math.abs(dot(v,v,k))))}
function boost(x,y){const t=Math.sqrt(1+x*x+y*y),d=t+1;return [1+x*x/d,x*y/d,x,x*y/d,1+y*y/d,y,x,y,t]}
function rotationBetween(a,b){let v=cross(a,b),c=dot(a,b,1);if(c<-.999999)return [-1,0,0,0,1,0,0,0,-1];let K=[0,-v[2],v[1],v[2],0,-v[0],-v[1],v[0],0],K2=mul(K,K);return I().map((x,i)=>x+K[i]+K2[i]/(1+c))}
function makeGeometry(p,q,r){
const values=[p,q,r];if(!values.every(n=>Number.isInteger(n)&&n>=2&&n<=100))throw Error('Use whole numbers from 2 to 100.');
const sum=1/p+1/q+1/r,k=Math.abs(sum-1)<1e-10?0:sum>1?1:-1,A=Math.PI/p,B=Math.PI/q,C=Math.PI/r;
let vertices;
if(!k){const b=Math.sin(B)/Math.sin(C);vertices=[[0,0,1],[1,0,1],[b*Math.cos(A),b*Math.sin(A),1]]}
else{const f=k===1?Math.acos:Math.acosh;const quotient=(x,y,z)=>(Math.cos(x)+Math.cos(y)*Math.cos(z))/(Math.sin(y)*Math.sin(z));let bc=quotient(B,A,C),cc=quotient(C,A,B);if(k===1){bc=clamp(bc,-1,1);cc=clamp(cc,-1,1)}const b=f(bc),c=f(cc),sn=k===1?Math.sin:Math.sinh,cs=k===1?Math.cos:Math.cosh;vertices=[[0,0,1],[sn(c),0,cs(c)],[sn(b)*Math.cos(A),sn(b)*Math.sin(A),cs(b)]]}
let center=norm(vertices.reduce(add,[0,0,0]),k),recenter=k===-1?boost(-center[0],-center[1]):k===1?rotationBetween(center,[0,0,1]):[1,0,-center[0],0,1,-center[1],0,0,1];
vertices=vertices.map(v=>mv(recenter,v));center=[0,0,1];
const mirrors=vertices.map((_,i)=>{let u=vertices[(i+1)%3],v=vertices[(i+2)%3];if(!k){let dx=v[0]-u[0],dy=v[1]-u[1],l=Math.hypot(dx,dy),nx=-dy/l,ny=dx/l,d=nx*u[0]+ny*u[1];return [1-2*nx*nx,-2*nx*ny,2*d*nx,-2*nx*ny,1-2*ny*ny,2*d*ny,0,0,1]}let n=cross(u,v);n[2]*=k;n=scale(n,1/Math.sqrt(dot(n,n,k)));return I().map((x,j)=>x-2*n[Math.floor(j/3)]*n[j%3]*(j%3===2?k:1))});
return {p,q,r,sum,k,vertices,center,mirrors,name:k===0?'Euclidean':k===1?'Spherical':'Hyperbolic',area:Math.PI*Math.abs(sum-1),order:k===1?Math.round(4/(sum-1)):Infinity};
}
function project(v,k){return k===-1?[v[0]/(v[2]+1),v[1]/(v[2]+1)]:[v[0],v[1]]}
function lift(p,k){if(k===-1){let d=1-p[0]*p[0]-p[1]*p[1];return [2*p[0]/d,2*p[1]/d,(1+p[0]*p[0]+p[1]*p[1])/d]}if(k===1)return [p[0],p[1],Math.sqrt(Math.max(0,1-p[0]*p[0]-p[1]*p[1]))];return [p[0],p[1],1]}
function parseWord(input,mode){let s=input.replace(/\s+/g,'').replace(/[·⋅*]/g,'').replace(/⁻¹/g,'^-1');if(!s||s==='1'||s==='e')return {letters:[],tokens:[]};let at=0,total=0;const allowed=mode==='T'?'abc':'xyzXYZ';function sequence(nested){let out=[];while(at<s.length&&s[at]!==')'){let block;if(s[at]==='('){at++;if(s[at]===')')throw Error('Parentheses must contain a word.');block=sequence(true);if(s[at]!==')')throw Error('A closing parenthesis is missing.');at++}else{let ch=s[at++];if(!allowed.includes(ch))throw Error(mode==='T'?'Use a, b, c, parentheses, and powers.':'Use x, y, z, inverses (x^-1), parentheses, and powers.');block=[ch]}let exponent=1;if(s[at]==='^'){at++;const m=s.slice(at).match(/^-?\d+/);if(!m)throw Error('Put an integer after ^.');exponent=Number(m[0]);at+=m[0].length;if(Math.abs(exponent)>120)throw Error('Use powers between −120 and 120.')}if(exponent<0)block=block.slice().reverse().map(c=>mode==='T'?c:c===c.toLowerCase()?c.toUpperCase():c.toLowerCase());for(let i=0;i<Math.abs(exponent);i++){out.push(...block);if(out.length>(mode==='T'?240:120))throw Error('Keep walks to 240 reflections or 120 rotations.')}}return out}const tokens=sequence(false);if(at!==s.length)throw Error('Unexpected closing parenthesis.');const mapping={x:'bc',y:'ca',z:'ab',X:'cb',Y:'ac',Z:'ba'};const letters=(mode==='T'?tokens.join(''):tokens.map(c=>mapping[c]).join('')).split('');return {tokens,letters};}
function wordMatrices(g,letters){let M=I(),out=[M];for(const a of letters){M=mul(M,g.mirrors['abc'.indexOf(a)]);if(M.some(x=>!Number.isFinite(x)||Math.abs(x)>1e9))throw Error('This word travels beyond the numerical display range. Try a shorter word.');out.push(M)}return out}
// A left action applies the rightmost letter first, using the original mirrors.
function fixedWordMatrices(g,letters){let M=I(),out=[M];for(const a of letters.slice().reverse()){M=mul(g.mirrors['abc'.indexOf(a)],M);if(M.some(x=>!Number.isFinite(x)||Math.abs(x)>1e9))throw Error('This word travels beyond the numerical display range. Try a shorter word.');out.push(M)}return out}
class Heap{constructor(){this.a=[]}push(v){let a=this.a,i=a.length;a.push(v);while(i){let p=(i-1)>>1;if(a[p].d<=v.d)break;a[i]=a[p];i=p}a[i]=v}pop(){let a=this.a,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1].d<a[j].d)j++;if(last.d<=a[j].d)break;a[i]=a[j];i=j}a[i]=last}return first}}
function tessellate(g,camera,seed,limit=3000,radius=5){let heap=new Heap(),seen=new Set(),out=[];const submit=(M,parity)=>{const c=mv(M,g.center);if(!c.every(Number.isFinite))return;const key=c.map(x=>Math.round(x*1e5)).join(',');if(seen.has(key))return;seen.add(key);let v=mv(camera,c),p=project(v,g.k),d=g.k===1?-v[2]:p[0]*p[0]+p[1]*p[1];if(g.k===-1&&(v[2]<0||d>.9986**2))return;if(g.k===0&&d>radius*radius)return;heap.push({M,parity,d})};submit(seed?.M||I(),seed?.parity||0);while(heap.a.length&&out.length<limit){let n=heap.pop();out.push(n);for(let i=0;i<3;i++)submit(mul(n.M,g.mirrors[i]),1-n.parity)}return out}
function inverseModel(m,k){return Array.from({length:9},(_,i)=>{let r=Math.floor(i/3),c=i%3;return m[c*3+r]*(r===2?k:1)*(c===2?k:1)})}
function rebase(g,camera,anchor,parity){
 if(g.k!==-1)return {camera,anchor,parity};
 let shift=I();
 for(let n=0;n<600;n++){let best=-1,d=camera[8],next;
 for(let j=0;j<3;j++){let m=mul(camera,g.mirrors[j]);if(m[8]<d-1e-8){best=j;d=m[8];next=m}}
 if(best<0)break;camera=next;shift=mul(shift,g.mirrors[best]);parity=1-parity;
 }
 anchor=mul(inverseModel(shift,-1),anchor);
 // Restore the model frame after repeated floating-point compositions.
 let t=[camera[2],camera[5],camera[8]];t[2]=Math.sqrt(1+t[0]*t[0]+t[1]*t[1]);
 let x=[camera[0],camera[3],camera[6]];x=norm(add(x,scale(t,dot(x,t,-1))),-1);
 let y=cross(t,x);y[2]*=-1;y=scale(y,parity?-1:1);
 camera=[x[0],y[0],t[0],x[1],y[1],t[1],x[2],y[2],t[2]];
 return {camera,anchor,parity,shift};
}
const API={I,mul,mv,cross,add,scale,clamp,dot,norm,boost,rotationBetween,makeGeometry,project,lift,parseWord,wordMatrices,fixedWordMatrices,tessellate,inverseModel,rebase};if(typeof module!=='undefined')module.exports=API;root.TriangleMath=API;
})(typeof window==='undefined'?globalThis:window);
