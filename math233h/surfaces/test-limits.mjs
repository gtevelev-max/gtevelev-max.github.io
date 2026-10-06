import assert from 'node:assert/strict';
import {limitExamples,limitById,pathSamples,limitViewExample} from './limits-math.mjs';
const close=(a,b,tol=1e-12)=>assert.ok(Math.abs(a-b)<=tol,`${a} != ${b}`);
assert.deepEqual(limitExamples.map(e=>e.id),['polynomial','infinite','radial-sinc','squeeze','two-paths','curved-path']);
for(const e of limitExamples){
  if(e.id!=='polynomial')assert.ok(Number.isNaN(e.evaluate(0,0)),`${e.id} must preserve the excluded origin`);
  for(const radius of [1,.5,.1,.01]){
    for(const t of [radius/2,radius/10,radius/100])for(const p of pathSamples(e,t)){
      assert.ok(Math.hypot(p.x-e.target[0],p.y-e.target[1])<radius+1e-12);
      assert.ok(Number.isFinite(p.value));
    }
  }
}
for(const t of [.5,.1,.01,.0001,-.5,-.01]){
  close(limitById['two-paths'].evaluate(t,0),1);close(limitById['two-paths'].evaluate(0,t),-1);
  close(limitById['curved-path'].evaluate(t*t,t),.5);close(limitById['curved-path'].evaluate(0,t),0);
  for(const k of [-10,-1,0,.3,5])close(limitById['curved-path'].evaluate(t,k*t),k*k*t/(1+k**4*t*t));
  close(limitById.infinite.evaluate(t,0),1/(t*t));
  close(limitById.squeeze.evaluate(t,t),t/2);
}
for(const radius of [1,.5,.1,.01,.0001])for(let i=0;i<37;i++){
  const a=2*Math.PI*i/37,x=radius*Math.cos(a),y=radius*Math.sin(a);
  assert.ok(Math.abs(limitById.squeeze.evaluate(x,y))<=radius+1e-14);
  close(limitById['radial-sinc'].evaluate(x,y),Math.sin(radius*radius)/(radius*radius));
}
close(limitById.polynomial.evaluate(1,2),-63);
// The infinite graph's changing scale must reveal a nonempty annulus at every
// radius, label genuine z values, and leave the mathematical example untouched.
const originalWindow=[limitById.infinite.zCenter,limitById.infinite.zScale];
for(const r of [1,.5,.1,.01])for(const multiplier of [8,16,32,64,128]){
  const example=limitViewExample(limitById.infinite,r,multiplier);
  const zMin=example.zCenter-example.zScale,zMax=example.zCenter+example.zScale;
  close(zMin,0);close(zMax,multiplier/(r*r));
  assert.ok(zMax>example.evaluate(r,0),'The outer boundary must remain visible.');
  close(example.evaluate(r,0),1/(r*r));
  close(example.evaluate(r/Math.sqrt(multiplier),0)/zMax,1);
  assert.equal(example.evaluate,limitById.infinite.evaluate);
  assert.equal(example.paths,limitById.infinite.paths);
}
assert.deepEqual([limitById.infinite.zCenter,limitById.infinite.zScale],originalWindow);
for(const example of limitExamples.filter(e=>e.id!=='infinite')){
  const view=limitViewExample(example,.01,128);
  assert.equal(view.zCenter,example.zCenter);assert.equal(view.zScale,example.zScale);
}
for(const badRadius of [0,-1,Infinity,NaN])assert.throws(()=>limitViewExample(limitById.infinite,badRadius),RangeError);
for(const badMultiplier of [0,1,-1,Infinity,NaN])assert.throws(()=>limitViewExample(limitById.infinite,1,badMultiplier),RangeError);
console.log('PASS: all six limits in teaching order; domains, exact paths, uniform estimates, numerical tables, and dynamic infinite-height windows.');
