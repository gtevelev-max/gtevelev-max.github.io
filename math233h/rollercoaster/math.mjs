/* Analytic vector calculus. No numerical differentiation is used. */
export const add=(a,b)=>a.map((x,i)=>x+b[i]);
export const sub=(a,b)=>a.map((x,i)=>x-b[i]);
export const mul=(a,s)=>a.map(x=>x*s);
export const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const norm=a=>Math.hypot(...a);
export const unit=a=>norm(a)>1e-12?mul(a,1/norm(a)):null;
const pi=Math.PI;
export const curves=[
 {id:'helix',name:'Lecture 6 helix',subtitle:'A steady climb, a turning frame.',range:[0,6*pi],closed:false,distance:8,
  formula:'⟨cos t, sin t, t⟩',velocity:'⟨−sin t, cos t, 1⟩',acceleration:'⟨−cos t, −sin t, 0⟩',
  evaluate:t=>({r:[Math.cos(t),Math.sin(t),t],v:[-Math.sin(t),Math.cos(t),1],a:[-Math.cos(t),-Math.sin(t),0]})},
 {id:'wavy',name:'Wavy sky ring',subtitle:'A circle that refuses to stay in a plane.',range:[0,2*pi],closed:true,distance:8,
  formula:'⟨2 cos t, 2 sin t, 0.6 sin 3t⟩',velocity:'⟨−2 sin t, 2 cos t, 1.8 cos 3t⟩',acceleration:'⟨−2 cos t, −2 sin t, −5.4 sin 3t⟩',
  evaluate:t=>({r:[2*Math.cos(t),2*Math.sin(t),.6*Math.sin(3*t)],v:[-2*Math.sin(t),2*Math.cos(t),1.8*Math.cos(3*t)],a:[-2*Math.cos(t),-2*Math.sin(t),-5.4*Math.sin(3*t)]})},
 {id:'trefoil',name:'Trefoil knot',subtitle:'Three loops, one continuous adventure.',range:[0,2*pi],closed:true,distance:10,
  formula:'⟨sin t + 2 sin 2t, cos t − 2 cos 2t, −sin 3t⟩',velocity:'⟨cos t + 4 cos 2t, −sin t + 4 sin 2t, −3 cos 3t⟩',acceleration:'⟨−sin t − 8 sin 2t, −cos t + 8 cos 2t, 9 sin 3t⟩',
  evaluate:t=>({r:[Math.sin(t)+2*Math.sin(2*t),Math.cos(t)-2*Math.cos(2*t),-Math.sin(3*t)],v:[Math.cos(t)+4*Math.cos(2*t),-Math.sin(t)+4*Math.sin(2*t),-3*Math.cos(3*t)],a:[-Math.sin(t)-8*Math.sin(2*t),-Math.cos(t)+8*Math.cos(2*t),9*Math.sin(3*t)]})},
 {id:'ellipse',name:'Ellipse · changing speed',subtitle:'Watch acceleration split into two parts.',range:[0,2*pi],closed:true,distance:9,
  formula:'⟨3 cos u, 1.7 sin u, 0⟩; u = t + 0.45 sin t',velocity:'⟨−3 sin u · u′, 1.7 cos u · u′, 0⟩',acceleration:'⟨−3(cos u · u′² + sin u · u″), 1.7(−sin u · u′² + cos u · u″), 0⟩',extra:'u′ = 1 + 0.45 cos t; u″ = −0.45 sin t',
  evaluate:t=>{const u=t+.45*Math.sin(t),d=1+.45*Math.cos(t),dd=-.45*Math.sin(t);return {r:[3*Math.cos(u),1.7*Math.sin(u),0],v:[-3*Math.sin(u)*d,1.7*Math.cos(u)*d,0],a:[-3*(Math.cos(u)*d*d+Math.sin(u)*dd),1.7*(-Math.sin(u)*d*d+Math.cos(u)*dd),0]}}},
 {id:'parabola',name:'Parabolic swoop',subtitle:'A gentle valley with a changing bend.',range:[-2.5,2.5],closed:false,distance:8,
  formula:'⟨t, t²/2, 0⟩',velocity:'⟨1, t, 0⟩',acceleration:'⟨0, 1, 0⟩',
  evaluate:t=>({r:[t,t*t/2,0],v:[1,t,0],a:[0,1,0]})},
 {id:'spiral',name:'Expanding corkscrew',subtitle:'The loops get wider as the cart climbs.',range:[0,6*pi],closed:false,distance:9,
  formula:'⟨q cos t, q sin t, 0.25t⟩; q = 0.7 + 0.1t',velocity:'⟨0.1 cos t − q sin t, 0.1 sin t + q cos t, 0.25⟩',acceleration:'⟨−0.2 sin t − q cos t, 0.2 cos t − q sin t, 0⟩',
  evaluate:t=>{const q=.7+.1*t,c=Math.cos(t),s=Math.sin(t);return {r:[q*c,q*s,.25*t],v:[.1*c-q*s,.1*s+q*c,.25],a:[-.2*s-q*c,.2*c-q*s,0]}}},
 {id:'line',name:'Straight-line express',subtitle:'What happens when curvature is zero?',range:[-4,4],closed:false,distance:8,
  formula:'⟨t, 0, 0⟩',velocity:'⟨1, 0, 0⟩',acceleration:'⟨0, 0, 0⟩',
  evaluate:t=>({r:[t,0,0],v:[1,0,0],a:[0,0,0]})},
];
export function geometry(curve,t){
 const {r,v,a}=curve.evaluate(t),speed=norm(v),T=unit(v),vxA=cross(v,a),c=norm(vxA);
 if(!T)return {r,v,a,speed,T:null,N:null,B:null,aT:null,aN:null,kappa:null,rho:null,center:null};
 const B=c>1e-10?mul(vxA,1/c):null,N=B?cross(B,T):null;
 const aT=dot(v,a)/speed,aN=c/speed,kappa=c/speed**3,rho=kappa>1e-10?1/kappa:null;
 return {r,v,a,speed,T,N,B,aT,aN,kappa,rho,center:N&&rho?add(r,mul(N,rho)):null};
}
export function planeEquation(normal,point){return normal?{normal,constant:dot(normal,point)}:null}
export function circlePoint(g,theta){return g.center?add(g.center,add(mul(g.N,-g.rho*Math.cos(theta)),mul(g.T,g.rho*Math.sin(theta)))):null}
