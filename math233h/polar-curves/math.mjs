/** Analytic polar curves. Angles are radians. No expression evaluation or dependencies. */
export const TAU = 2 * Math.PI;
export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const parameter = (key, label, value, min, max, step = .05) => ({key, label, value, min, max, step});
export const CURVES = [
  {id:'circle', name:'Circle · centered at the pole', group:'Classics', formula:'r = a', derivative:'r′ = 0', parameters:[parameter('a','Radius a',1.5,.25,3)], description:'Every angle gives the same distance from the pole. A first encounter with a polar level set.', lesson:'Fix r and vary θ: this circle is a coordinate curve. Later, fix θ and vary r to get a radial line.', interval:()=>[0,TAU]},
  {id:'offset-circle', name:'Circle · through the pole', group:'Classics', formula:'r = 2a cos θ', derivative:'r′ = −2a sin θ', parameters:[parameter('a','Circle radius a',1,.25,2.5)], description:'The Cartesian circle (x − a)² + y² = a². On 0 ≤ θ ≤ π it is traced exactly once, with signed radii.', lesson:'After θ = π/2, r is negative: the point lies opposite the ray θ. The circle still stays to the right of the pole.', interval:()=>[0,Math.PI]},
  {id:'cardioid', name:'Cardioid', group:'Classics', formula:'r = a(1 + cos θ)', derivative:'r′ = −a sin θ', parameters:[parameter('a','Scale a',1,.25,2.5)], description:'A heart-shaped curve with a cusp at the pole. The velocity vanishes at θ = π.', lesson:'At θ = π both x′ and y′ vanish. The quotient y′/x′ cannot decide the tangent; a limiting calculation gives the x-axis.', interval:()=>[0,TAU]},
  {id:'limacon', name:'Limaçon · loops & dimples', group:'Classics', formula:'r = a + b cos θ', derivative:'r′ = −b sin θ', parameters:[parameter('a','Offset a',.7,.1,3),parameter('b','Amplitude b',1.2,.1,2)], description:'One family, several geometries: an inner loop for a < b, a cardioid at a = b, a dimple for b < a < 2b, and a convex curve for a ≥ 2b.', lesson:'With a < b, a negative radius draws the inner loop. At a = b the loop contracts to a cusp. Cross the threshold and watch the geometry change.', interval:()=>[0,TAU]},
  {id:'rose', name:'Rose · odd & even petals', group:'Classics', formula:'r = a cos(nθ)', derivative:'r′ = −an sin(nθ)', parameters:[parameter('a','Petal radius a',2,.25,3),parameter('n','Integer n',5,2,9,1)], description:'For integer n, there are n petals when n is odd and 2n petals when n is even. Negative radii supply essential parts of the drawing.', lesson:'Odd n needs only 0 ≤ θ ≤ π for one complete tracing; even n needs 0 ≤ θ ≤ 2π. Doubling the default interval retraces the odd rose.', interval:p=>[0,p.n%2?Math.PI:TAU]},
  {id:'lemniscate', name:'Bernoulli lemniscate', group:'Classics', formula:'r² = a² cos(2θ),  r ≥ 0', derivative:'r′ = −a sin(2θ) / √cos(2θ)', parameters:[parameter('a','Lobe radius a',2,.25,3)], description:'Two lobes of (x² + y²)² = a²(x² − y²). Real radii require cos(2θ) ≥ 0; no curve is drawn in the gaps.', lesson:'The nonnegative square root on [−π/4, π/4] and [3π/4, 5π/4] covers both lobes. Adding the negative square root only retraces them. The crossing at the pole has tangents y = ±x.', interval:()=>[-Math.PI/4,5*Math.PI/4]},
  {id:'archimedean', name:'Archimedean spiral', group:'Spirals', formula:'r = a + bθ', derivative:'r′ = b', parameters:[parameter('a','Starting radius a',0,0,1),parameter('b','Radial rate b',.18,.05,1,.01)], description:'Each full turn increases r by the constant amount 2πb. This window displays three turns.', lesson:'Equal angular steps produce equal radial steps. Compare this with the multiplicative growth of a logarithmic spiral.', interval:()=>[0,3*TAU]},
  {id:'logarithmic', name:'Logarithmic spiral', group:'Spirals', formula:'r = a e^(kθ)', derivative:'r′ = k r', parameters:[parameter('a','Initial radius a',.25,.1,1),parameter('b','Growth rate k',.2,.03,.3,.01)], description:'The tangent makes a constant angle with the radius. Each full turn multiplies r by e^(2πk).', lesson:'Because r′/r = k is constant, the angle between the radius and tangent is constant. The pole is approached only as θ → −∞.', interval:()=>[0,2*TAU]},
  {id:'hyperbolic', name:'Hyperbolic spiral', group:'Spirals', formula:'r = a / θ,  θ ≠ 0', derivative:'r′ = −a / θ²', parameters:[parameter('a','Scale a',2,.5,4)], description:'An unbounded spiral: as θ → 0, y → a while |x| → ∞. The line y = a is an asymptote.', lesson:'The missing value θ = 0 is not a missing point at the pole. It corresponds to escape to infinity. Extend the interval to negative angles to inspect the other arm.', interval:()=>[.12,2*TAU]},
  {id:'conic', name:'Kepler conic · positive radius', group:'Conics', formula:'r = p / (1 + e cos(θ − φ))', derivative:'r′ = pe sin(θ − φ) / (1 + e cos(θ − φ))²', parameters:[parameter('p','Semilatus rectum p',1.2,.3,3),parameter('e','Eccentricity e',.6,0,2.2,.01),parameter('phi','Axis angle φ (radians)',0,-Math.PI,Math.PI,Math.PI/12)], description:'A circle, ellipse, parabola, or one physical hyperbola branch, with a focus at the pole. Here r is a distance: the denominator must be positive. The angle φ rotates the conic and its directrix.', lesson:'Write u = x cos φ + y sin φ along the rotated axis. The unsquared condition r + eu = p selects the physical branch. For e > 1, squaring introduces another hyperbola branch that is deliberately excluded here.', interval:p=>{const phi=p.phi??0,half=p.e<1?Math.PI:Math.acos(-1/p.e);return [phi-half,phi+half];}}
];
export const LECTURE_EXAMPLES = [
  {id:'circle',label:'Circle · r = 2 cos θ',curve:'offset-circle',p:{a:1},formula:'r = 2 cos θ'},
  {id:'cardioid',label:'Cardioid · r = 1 + cos θ',curve:'cardioid',p:{a:1},formula:'r = 1 + cos θ'},
  {id:'limacon',label:'Inner loop · r = 1 + 2 cos θ',curve:'limacon',p:{a:1,b:2},formula:'r = 1 + 2 cos θ'},
  {id:'rose-three',label:'Three petals · r = 2 cos(3θ)',curve:'rose',p:{a:2,n:3},formula:'r = 2 cos(3θ)'},
  {id:'rose-four',label:'Four petals · r = 2 cos(2θ)',curve:'rose',p:{a:2,n:2},formula:'r = 2 cos(2θ)'},
  {id:'lemniscate',label:'Lemniscate · r² = 4 cos(2θ)',curve:'lemniscate',p:{a:2},formula:'r² = 4 cos(2θ),  r ≥ 0'},
  {id:'archimedean',label:'Archimedean spiral · r = θ',curve:'archimedean',p:{a:0,b:1},formula:'r = θ'},
  {id:'logarithmic',label:'Logarithmic spiral · r = e^(kθ)',curve:'logarithmic',p:{a:1},formula:'r = e^(kθ)'},
  {id:'conic',label:'Kepler conic · rotate by φ',curve:'conic',p:{},formula:'r = p / (1 + e cos(θ − φ))'}
];
export const curveById = id => CURVES.find(c=>c.id===id) || CURVES[4];
export const defaults = id => Object.fromEntries(curveById(id).parameters.map(p=>[p.key,p.value]));

/** Returns null outside a real/physical domain; r′ may be nonfinite at a true domain endpoint. */
export function polarValue(id, p, theta) {
  if (!Number.isFinite(theta)) return null;
  const c=Math.cos(theta), s=Math.sin(theta); let r, rp, rpp;
  switch(id) {
    case 'circle': r=p.a;rp=0;rpp=0;break;
    case 'offset-circle': r=2*p.a*c;rp=-2*p.a*s;rpp=-2*p.a*c;break;
    case 'cardioid': r=p.a*(1+c);rp=-p.a*s;rpp=-p.a*c;break;
    case 'limacon': r=p.a+p.b*c;rp=-p.b*s;rpp=-p.b*c;break;
    case 'rose': r=p.a*Math.cos(p.n*theta);rp=-p.a*p.n*Math.sin(p.n*theta);rpp=-p.a*p.n*p.n*Math.cos(p.n*theta);break;
    case 'lemniscate': {
      let q=Math.cos(2*theta);
      if(q < -1e-12) return null;
      if(Math.abs(q)<1e-12) return {r:0,rp:NaN,rpp:NaN,endpoint:true};
      q=Math.max(0,q);r=p.a*Math.sqrt(q);rp=-p.a*Math.sin(2*theta)/Math.sqrt(q);
      rpp=-2*p.a*Math.sqrt(q)-p.a*Math.sin(2*theta)**2/q**1.5;break;
    }
    case 'archimedean': r=p.a+p.b*theta;rp=p.b;rpp=0;break;
    case 'logarithmic': r=p.a*Math.exp(p.b*theta);rp=p.b*r;rpp=p.b*p.b*r;break;
    case 'hyperbolic': if(Math.abs(theta)<1e-12)return null;r=p.a/theta;rp=-p.a/theta**2;rpp=2*p.a/theta**3;break;
    case 'conic': {
      const angle=theta-(p.phi??0),cs=Math.cos(angle),sn=Math.sin(angle),d=1+p.e*cs;
      if(d<=1e-12) return null;
      r=p.p/d;rp=p.p*p.e*sn/d**2;rpp=p.p*p.e*cs/d**2+2*p.p*p.e**2*sn*sn/d**3;break;
    }
    default: return null;
  }
  if(!Number.isFinite(r)) return null;
  return {r,rp,rpp,endpoint:false};
}

export function pointAt(id,p,theta) {
  const v=polarValue(id,p,theta);if(!v)return null;
  const c=Math.cos(theta),s=Math.sin(theta);
  const x=v.r*c,y=v.r*s,dx=v.rp*c-v.r*s,dy=v.rp*s+v.r*c;
  let tangent=null,kind='regular';
  const speed=Math.hypot(dx,dy);
  if(v.endpoint) {kind='pole-limit';tangent=[c,s];}
  else if(speed<1e-9*Math.max(1,Math.abs(v.r),Math.abs(v.rpp))) {
    kind='stationary';
    const ddx=(v.rpp-v.r)*c-2*v.rp*s,ddy=(v.rpp-v.r)*s+2*v.rp*c;
    const a=Math.hypot(ddx,ddy);if(a>1e-10)tangent=[ddx/a,ddy/a];
  } else if(Number.isFinite(speed)) tangent=[dx/speed,dy/speed];
  const slope=kind==='regular' && tangent ? (Math.abs(tangent[0])<1e-9 ? Infinity : dy/dx) : null;
  return {...v,theta,x,y,dx,dy,speed,tangent,kind,slope};
}

/** Connected real-domain pieces; open endpoints are rejected by polarValue where required. */
export function domainIntervals(id,p,start,end) {
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return [];
  if(id==='lemniscate'||(id==='conic'&&p.e>=1)) {
    const period=id==='lemniscate'?Math.PI:TAU;
    const half=id==='lemniscate'?Math.PI/4:Math.acos(-1/p.e);
    const phase=id==='conic'?(p.phi??0):0;
    const out=[];
    for(let k=Math.floor((start-phase-half)/period);k<=Math.ceil((end-phase+half)/period);k++){
      const lo=Math.max(start,phase+k*period-half),hi=Math.min(end,phase+k*period+half);
      if(hi>lo+1e-12)out.push([lo,hi]);
    }
    return out;
  }
  if(id==='hyperbolic'&&start<=0&&end>=0)return [[start,Math.min(end,0)],[Math.max(start,0),end]].filter(([a,b])=>b>a);
  return [[start,end]];
}

export function sampleCurve(id,p,start,end,samples=1800) {
  return domainIntervals(id,p,start,end).map(([lo,hi])=>{
    const count=Math.max(40,Math.ceil(samples*(hi-lo)/(end-start)));
    return Array.from({length:count+1},(_,i)=>{
      const theta=lo+(hi-lo)*i/count;return pointAt(id,p,theta);
    });
  });
}

export function suggestedRadius(id,p,start,end) {
  // Keep unbounded conics and spirals readable; clipping is identified in the UI.
  if(id==='conic')return p.e<1?1.2*p.p/(1-p.e):6*p.p;
  if(id==='hyperbolic')return 3*p.a;
  const points=sampleCurve(id,p,start,end,500).flat().filter(Boolean);
  return Math.max(.5,...points.map(v=>Math.abs(v.r)))*1.19;
}

export function formatPi(theta,digits=2){
  if(Math.abs(theta)<1e-8)return '0';
  const q=theta/Math.PI;
  for(const den of [1,2,3,4,6,8,12]){
    const num=Math.round(q*den);
    if(Math.abs(q-num/den)<1e-6)return `${num===-1?'−':num===1?'':num}π${den===1?'':`/${den}`}`;
  }
  return `${q.toFixed(digits)}π`;
}

export function conicName(e){return e===0?'Circle':e<1?'Ellipse':e===1?'Parabola':'Hyperbola · physical branch';}
