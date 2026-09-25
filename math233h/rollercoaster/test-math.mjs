import assert from 'node:assert/strict';
import {curves,geometry,circlePoint,norm,dot,cross,sub} from './math.mjs';
let error=0,frameError=0,decompositionError=0,circleError=0;
for(const c of curves)for(let j=0;j<=80;j++){
 const t=c.range[0]+(c.range[1]-c.range[0])*j/80,h=1e-5,g=geometry(c,t),lo=c.evaluate(t-h),hi=c.evaluate(t+h);
 for(let k=0;k<3;k++)error=Math.max(error,Math.abs((hi.r[k]-lo.r[k])/(2*h)-g.v[k]),Math.abs((hi.v[k]-lo.v[k])/(2*h)-g.a[k]));
 if(g.N){
  frameError=Math.max(frameError,Math.abs(norm(g.T)-1),Math.abs(norm(g.N)-1),Math.abs(norm(g.B)-1),Math.abs(dot(g.T,g.N)),Math.abs(dot(g.N,g.B)),norm(sub(cross(g.T,g.N),g.B)));
  decompositionError=Math.max(decompositionError,norm(g.a.map((x,k)=>x-g.aT*g.T[k]-g.aN*g.N[k])));
  assert(g.kappa>=0); assert(g.aN>=0);
  circleError=Math.max(circleError,norm(sub(circlePoint(g,0),g.r)));
  const P=circlePoint(g,1.234),delta=sub(P,g.center);
  circleError=Math.max(circleError,Math.abs(norm(delta)-g.rho),Math.abs(dot(delta,g.B)));
 }else {assert.equal(c.id,'line'); assert.equal(g.kappa,0); assert.equal(g.center,null);}
}
const helix=geometry(curves[0],.71);
assert(Math.abs(helix.kappa-.5)<1e-12);assert(Math.abs(helix.rho-2)<1e-12);assert.equal(helix.aT,0);assert(Math.abs(helix.aN-1)<1e-12);
assert(error<1e-7);assert(frameError<1e-12);assert(decompositionError<1e-12);assert(circleError<1e-12);
console.log(JSON.stringify({curves:curves.length,samplesPerCurve:81,derivativeError:error,frameError,decompositionError,circleError,result:'PASS'},null,2));
