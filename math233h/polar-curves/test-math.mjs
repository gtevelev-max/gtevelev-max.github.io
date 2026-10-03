import assert from 'node:assert/strict';
import {CURVES,LECTURE_EXAMPLES,TAU,curveById,defaults,polarValue,pointAt,domainIntervals,sampleCurve,suggestedRadius,formatPi} from './math.mjs';

let checks=0,derivativeSamples=0,maxDerivativeError=0;
function ok(value,message){checks++;assert.ok(value,message);}
function close(actual,expected,tolerance=1e-9,message='Identity'){
  checks++;assert.ok(Number.isFinite(actual)&&Number.isFinite(expected),`${message}: nonfinite value`);
  assert.ok(Math.abs(actual-expected)<=tolerance*Math.max(1,Math.abs(actual),Math.abs(expected)),`${message}: ${actual} ≠ ${expected}`);
}
function derivativeClose(actual,expected,message){
  const err=Math.abs(actual-expected)/Math.max(1,Math.abs(actual),Math.abs(expected));
  maxDerivativeError=Math.max(maxDerivativeError,err);close(actual,expected,3e-6,message);
}

// Compare independent central differences against every analytic first and second derivative.
// Parameter endpoints exercise all UI-admitted scales; singular neighborhoods are tested below.
for(const curve of CURVES){
  const def=defaults(curve.id);
  const cases=[def,...curve.parameters.flatMap(d=>[{...def,[d.key]:d.min},{...def,[d.key]:d.max}])];
  for(const p of cases){
    const [start,end]=curve.interval(p);
    ok(Number.isFinite(suggestedRadius(curve.id,p,start,end)),'Finite default view');
    for(let i=1;i<83;i++){
      const t=start+(end-start)*(i+.173)/84,v=polarValue(curve.id,p,t),h=1e-5;
      if(!v||v.endpoint||Math.abs(v.rp)>100||Math.abs(v.rpp)>500)continue;
      const a=pointAt(curve.id,p,t-h),b=pointAt(curve.id,p,t+h),q=pointAt(curve.id,p,t);
      if(!a||!b||a.endpoint||b.endpoint)continue;
      derivativeClose(v.rp,(b.r-a.r)/(2*h),`${curve.id} r′`);
      derivativeClose(v.rpp,(b.rp-a.rp)/(2*h),`${curve.id} r″`);
      derivativeClose(q.dx,(b.x-a.x)/(2*h),`${curve.id} x′`);
      derivativeClose(q.dy,(b.y-a.y)/(2*h),`${curve.id} y′`);
      close(q.x*q.x+q.y*q.y,v.r*v.r,1e-10,'Cartesian radius');
      close(q.speed*q.speed,v.r*v.r+v.rp*v.rp,1e-10,'Polar speed identity');
      close(q.x*q.dy-q.y*q.dx,v.r*v.r,1e-9,'Area determinant, including signed r');
      if(q.tangent)close(Math.hypot(...q.tangent),1,1e-12,'Unit tangent');
      derivativeSamples++;
    }
  }
}

// Independent Cartesian equations, rather than matching the implementation line by line.
for(let i=0;i<1000;i++){
  const t=-TAU+3*TAU*i/999;
  const circle=pointAt('offset-circle',{a:1.7},t);
  close((circle.x-1.7)**2+circle.y**2,1.7**2,1e-11,'Circle through pole');
  ok(circle.x>=-1e-12,'Signed circle never gains a false left half');
  const lem=pointAt('lemniscate',{a:2.3},t);
  if(lem)close((lem.x**2+lem.y**2)**2,2.3**2*(lem.x**2-lem.y**2),1e-10,'Lemniscate quartic');
  for(const e of [0,.6,.99,1,1.01,1.5,2.2]){
    const p=1.3,q=pointAt('conic',{p,e},t),d=1+e*Math.cos(t);
    if(d<=1e-12){ok(q===null,'Forbidden conic branch excluded');continue;}
    ok(q.r>0,'Physical radius positive');
    close(Math.hypot(q.x,q.y)+e*q.x,p,1e-7,'Unsquared Kepler equation');
    if(e>0){close(Math.hypot(q.x,q.y),e*Math.abs(p/e-q.x),1e-10,'Focus-directrix ratio');ok(q.x<p/e,'Selected physical side of directrix');}
    if(e===1)close(q.y*q.y,-2*p*(q.x-p/2),1e-9,'Cartesian parabola');
    if(e>1)ok(q.x<=p/(1+e)+1e-10,'Physical hyperbola branch is left of its vertex');
  }
}

// A whole odd rose is traced on [0,π]; an even rose requires [0,2π].
for(let n=2;n<=9;n++){
  const p={a:2,n},[lo,hi]=curveById('rose').interval(p),expected=n%2?n:2*n,tips=[];
  close(hi-lo,n%2?Math.PI:TAU,1e-12,'Minimal rose interval');
  for(let k=0;k<expected;k++){const q=pointAt('rose',p,k*Math.PI/n);close(Math.hypot(q.x,q.y),2,1e-12,'Rose tip');tips.push(q);}
  for(let i=0;i<tips.length;i++)for(let j=i+1;j<tips.length;j++)ok(Math.hypot(tips[i].x-tips[j].x,tips[i].y-tips[j].y)>1e-6,'No duplicate tips in a single tracing');
  const first=pointAt('rose',p,lo),last=pointAt('rose',p,hi);close(first.x,last.x,1e-12,'Rose closes');close(first.y,last.y,1e-12,'Rose closes');
  const t=.371,a=pointAt('rose',p,t),b=pointAt('rose',p,t+Math.PI);
  if(n%2){close(a.x,b.x,1e-12,'Odd rose retraces after π');close(a.y,b.y,1e-12,'Odd rose retraces after π');}
  else{close(a.x,-b.x,1e-12,'Even rose needs second half');close(a.y,-b.y,1e-12,'Even rose needs second half');}
}

// Negative radii retain their sign and place P opposite the parameter ray.
const negative=pointAt('offset-circle',{a:1},3*Math.PI/4);
ok(negative.r<0,'Negative radius example');close(negative.x,1);close(negative.y,-1);
ok(negative.x*Math.cos(negative.theta)+negative.y*Math.sin(negative.theta)<0,'Point opposite ray');
// Tangent classifications at regular points, regular pole passages, cusps and branch endpoints.
const vertical=pointAt('circle',{a:2},0);ok(vertical.slope===Infinity,'Vertical tangent, not invalid tangent');ok(vertical.kind==='regular','Vertical tangent is regular');
close(pointAt('circle',{a:2},Math.PI/2).slope,0,1e-10,'Horizontal tangent');
for(const [id,p] of [['cardioid',{a:1}],['limacon',{a:1,b:1}]]){
  const q=pointAt(id,p,Math.PI);ok(q.kind==='stationary','Cusp velocity vanishes');ok(q.slope===null,'No derivative quotient at cusp');close(q.speed,0);close(Math.abs(q.tangent[0]),1);close(q.tangent[1],0);
  for(const eps of [-1e-4,1e-4]){const near=pointAt(id,p,Math.PI+eps);close(near.y/near.x,0,2e-4,'Secants converge to cusp tangent');}
}
const regularPole=pointAt('rose',{a:2,n:5},Math.PI/10);ok(regularPole.kind==='regular','Rose pole passage is regular');close(regularPole.r,0);ok(regularPole.speed>1,'Nonzero velocity at rose pole');
for(const t of [-Math.PI/4,Math.PI/4,3*Math.PI/4,5*Math.PI/4]){
  const q=pointAt('lemniscate',{a:2},t);ok(q.kind==='pole-limit','Lemniscate endpoint uses a limiting tangent');ok(!Number.isFinite(q.rp),'Derivative is not invented at root endpoint');close(q.r,0);close(Math.abs(q.tangent[1]/q.tangent[0]),1,1e-10,'Node tangents y=±x');
}
ok(pointAt('lemniscate',{a:2},Math.PI/2)===null,'Lemniscate angular gap');
ok(pointAt('hyperbolic',{a:2},0)===null,'Hyperbolic spiral pole excluded');
for(const e of [1,1.1,2.2]){const t=Math.acos(-1/e);ok(pointAt('conic',{p:1,e},t)===null,'Conic asymptote angle has no finite point');if(e>1)ok(pointAt('conic',{p:1,e},Math.PI)===null,'Extra hyperbola branch not restored with signed radius');}

// Domain splitting ensures a rendered polyline cannot bridge a nonreal gap or a pole.
assert.deepEqual(domainIntervals('hyperbolic',{a:2},-1,1),[[-1,0],[0,1]]);checks++;
const lemParts=sampleCurve('lemniscate',{a:2},-Math.PI/4,5*Math.PI/4);
ok(lemParts.length===2,'Lemniscate has two plotted domain components');
close(lemParts[0][0].theta,-Math.PI/4);close(lemParts[0].at(-1).theta,Math.PI/4);close(lemParts[1][0].theta,3*Math.PI/4);close(lemParts[1].at(-1).theta,5*Math.PI/4);
for(const id of ['lemniscate','conic','hyperbolic']){
  const p=id==='conic'?{p:1,e:1.7}:defaults(id);
  for(const [a,b] of domainIntervals(id,p,-12*Math.PI,12*Math.PI))for(let i=1;i<10;i++)ok(pointAt(id,p,a+(b-a)*i/10)!==null,'Every sampled segment interior is in the real domain');
}
for(const c of CURVES){const p=defaults(c.id),[a,b]=c.interval(p);for(const part of sampleCurve(c.id,p,a,b))for(const q of part)if(q)ok(Number.isFinite(q.x)&&Number.isFinite(q.y),'Every plotted point is finite');}
// Qualitative spiral claims checked independently.
const arch={a:.3,b:.2},log={a:.3,b:.2};
for(const t of [.1,1,3]){
  close(polarValue('archimedean',arch,t+TAU).r-polarValue('archimedean',arch,t).r,TAU*arch.b,1e-11,'Archimedean spacing');
  close(polarValue('logarithmic',log,t+TAU).r/polarValue('logarithmic',log,t).r,Math.exp(TAU*log.b),1e-11,'Logarithmic scaling');
  const q=pointAt('logarithmic',log,t);close((q.dx*Math.cos(t)+q.dy*Math.sin(t))/q.speed,log.b/Math.sqrt(1+log.b**2),1e-11,'Equiangular logarithmic tangent');
}
close(pointAt('hyperbolic',{a:2},1e-5).y,2,1e-9,'Hyperbolic spiral asymptote y=a');
ok(polarValue('rose',defaults('rose'),NaN)===null,'Reject NaN');ok(polarValue('circle',defaults('circle'),Infinity)===null,'Reject infinite angle');ok(domainIntervals('circle',{a:1},1,0).length===0,'Reject reversed interval');
ok(formatPi(Math.PI/4)==='π/4','Exact angle label');ok(formatPi(-Math.PI/2)==='−π/2','Negative angle label');
ok(suggestedRadius('conic',{p:3,e:.99},-Math.PI,Math.PI)>3/(1-.99),'Fit includes a highly eccentric bounded ellipse');

// The lecture selector must recover the exact lecture equations, not only nearby family members.
const exactLectureValues={circle:t=>2*Math.cos(t),cardioid:t=>1+Math.cos(t),limacon:t=>1+2*Math.cos(t),'rose-three':t=>2*Math.cos(3*t),'rose-four':t=>2*Math.cos(2*t),archimedean:t=>t,logarithmic:t=>Math.exp(.2*t)};
for(const example of LECTURE_EXAMPLES){
  const p={...defaults(example.curve),...example.p};
  for(const def of curveById(example.curve).parameters)ok(p[def.key]>=def.min-1e-12&&p[def.key]<=def.max+1e-12,`${example.id} preset is reachable by parameter controls`);
  for(let i=0;i<33;i++){
    const theta=i/9,q=polarValue(example.curve,p,theta);
    if(exactLectureValues[example.id])close(q.r,exactLectureValues[example.id](theta),1e-11,`${example.id} exact lecture equation`);
    if(example.id==='lemniscate'&&q)close(q.r*q.r,4*Math.cos(2*theta),1e-10,'Exact lecture lemniscate');
  }
  if(example.id==='rose-three')close(curveById(example.curve).interval(p)[1],Math.PI,1e-12,'Three-petal lecture rose traces once');
  if(example.id==='rose-four')close(curveById(example.curve).interval(p)[1],TAU,1e-12,'Four-petal lecture rose traces once');
}

// Rotated conics: check rotation covariance and the original unsquared distance equation.
// The directrix has unit normal (cosφ,sinφ), hence its true Euclidean distance is |p/e − u|.
for(const phi of [-Math.PI,-1.23,-Math.PI/2,-Math.PI/4,0,.713,Math.PI/2,Math.PI]){
  const c=Math.cos(phi),s=Math.sin(phi);
  for(const e of [0,.4,.99,1,1.3,2.2]){
    const p={p:1.7,e,phi},half=e<1?Math.PI:Math.acos(-1/e),interval=curveById('conic').interval(p);
    close(interval[0],phi-half);close(interval[1],phi+half);
    for(let i=0;i<97;i++){
      const alpha=-3.6+7.2*i/96,theta=alpha+phi,q=pointAt('conic',p,theta),unrotated=pointAt('conic',{p:p.p,e},alpha),d=1+e*Math.cos(alpha);
      ok(Boolean(q)===Boolean(unrotated),'Rotating preserves admissible angles relative to the axis');
      if(d<=1e-12){ok(q===null,'Rotated forbidden branch is absent');continue;}
      const u=q.x*c+q.y*s,v=-q.x*s+q.y*c;
      close(q.x,unrotated.x*c-unrotated.y*s,1e-9,'Rotation covariance x');
      close(q.y,unrotated.x*s+unrotated.y*c,1e-9,'Rotation covariance y');
      close(q.dx,unrotated.dx*c-unrotated.dy*s,1e-9,'Rotated derivative x');
      close(q.dy,unrotated.dx*s+unrotated.dy*c,1e-9,'Rotated derivative y');
      close(Math.hypot(q.x,q.y)+e*u,p.p,1e-7,'Rotated unsquared focus equation');
      if(e>0){close(Math.hypot(q.x,q.y),e*Math.abs(p.p/e-u),1e-9,'Rotated focus-directrix distance ratio');ok(u<p.p/e,'Selected side of rotated directrix');}
      if(e===1)close(v*v,-2*p.p*(u-p.p/2),1e-9,'Rotated Cartesian parabola');
      if(e>1)ok(u<=p.p/(1+e)+1e-9,'Only rotated physical hyperbola branch');
    }
    if(e>=1){
      ok(pointAt('conic',p,phi-half)===null,'Rotated lower asymptote excluded');ok(pointAt('conic',p,phi+half)===null,'Rotated upper asymptote excluded');
      const pieces=domainIntervals('conic',p,phi-3*TAU,phi+3*TAU);
      for(const [a,b] of pieces){for(let i=1;i<11;i++)ok(pointAt('conic',p,a+(b-a)*i/11)!==null,'Rotated domain segment has only physical points');}
    }
    const vertex=pointAt('conic',p,phi);close(vertex.x,p.p/(1+e)*c);close(vertex.y,p.p/(1+e)*s);
  }
}
console.log(JSON.stringify({passed:true,checks,derivativeSamples,maxRelativeDerivativeError:maxDerivativeError,coverage:['analytic first and second derivatives','Cartesian equations','signed radii','odd/even rose tracing','vertical tangents','cardioid cusp','lemniscate branch limits','physical Kepler branch','focus-directrix ratios','area determinant','domain splitting','spiral geometry','exact lecture presets','rotated conic domains, derivatives and directrix']},null,2));
