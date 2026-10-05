import assert from 'node:assert/strict';
import {limitExamples,limitById,pathSamples,graphSamples} from './limits-math.mjs';
const close=(a,b,tol=1e-12)=>assert.ok(Math.abs(a-b)<=tol,`${a} != ${b}`);
assert.equal(limitExamples.length,6);
for(const e of limitExamples){
  if(e.id!=='polynomial')assert.ok(Number.isNaN(e.evaluate(0,0)),`${e.id} must preserve the excluded origin`);
  for(const radius of [1,.5,.1,.01]){
    const graph=graphSamples(e,radius);
    for(const p of graph.points){assert.ok(Math.hypot(p[0],p[1])<=1+1e-12);assert.ok(Number.isFinite(p[3]));}
    for(const face of graph.faces)for(const i of face)assert.ok(Math.abs(graph.points[i][2])<=1,'clipped values cannot form a false plateau');
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
assert.equal(graphSamples(limitById.infinite,.1).faces.length,0,'graph wholly above z=20 must disappear, not flatten');
for(const id of ['squeeze','radial-sinc','polynomial']){
  const e=limitById[id],large=graphSamples(e,.25).points,small=graphSamples(e,.01).points;
  assert.ok(Math.max(...small.map(p=>Math.abs(p[3]-e.zCenter)))<Math.max(...large.map(p=>Math.abs(p[3]-e.zCenter))));
}
console.log('PASS: all six limits; domains, exact paths, uniform estimates, numerical tables, fixed height scales, and clipping.');
