const assert = require('node:assert/strict');
const O = require('./mechanics.js');
function close(a,b,tol,msg){assert.ok(Math.abs(a-b)<=tol,`${msg}: ${a} vs ${b}`);}
for(const p of O.bodies){
  const initial=O.state(p,0),energy=-O.MU/(2*p.a),h=Math.sqrt(O.MU*p.a*(1-p.e*p.e));
  for(let k=0;k<36;k++){
    const t=p.period*k/36,s=O.state(p,t),eps=p.period*(p.e>.8?1e-7:1e-5),before=O.state(p,t-eps),after=O.state(p,t+eps);
    close(O.norm(s.h),h,h*1e-12,`${p.name} h constant`);
    close(s.speed*s.speed/2-O.MU/s.radius,energy,Math.abs(energy)*1e-12,`${p.name} energy constant`);
    close(O.dot(s.r,s.h),0,p.a*h*1e-12,`${p.name} planar r`);
    close(O.dot(s.v,s.h),0,s.speed*h*1e-12,`${p.name} planar v`);
    close(O.norm(s.force),p.mass*O.norm(s.acc)*O.AU_METERS/O.YEAR_SECONDS**2,O.norm(s.force)*1e-12,`${p.name} force SI conversion`);
    for(let j=0;j<3;j++){
      close((after.r[j]-before.r[j])/(2*eps),s.v[j],s.speed*2e-8,`${p.name} velocity derivative`);
      close((after.v[j]-before.v[j])/(2*eps),s.acc[j],O.norm(s.acc)*2e-8,`${p.name} acceleration derivative`);
      close(s.h[j],initial.h[j],h*1e-12,`${p.name} h direction`);
    }
  }
  // Independently triangulate time-uniform sectors in 3D; all have the same area.
  for(let j=0;j<12;j++){
    const points=O.sector(p,j*O.TAU/12,(j+1)*O.TAU/12,p.e>.8?2400:500);let area=0;
    for(let k=1;k<points.length;k++)area+=O.norm(O.cross(points[k-1],points[k]))/2;
    close(area,h*p.period/24,h*p.period/24*5e-7,`${p.name} equal swept sector ${j}`);
  }
  const closed=O.state(p,p.period);
  initial.r.forEach((x,j)=>close(x,closed.r[j],p.a*1e-12,`${p.name} closed orbit`));
}
const c=O.comet,near=O.stateAtMean(c,0),far=O.stateAtMean(c,Math.PI);
close(near.radius,c.a*(1-c.e),1e-12,'Halley perihelion');
close(far.radius,c.a*(1+c.e),1e-12,'Halley aphelion');
close(near.speed/far.speed,(1+c.e)/(1-c.e),1e-10,'Halley perihelion/aphelion speed ratio');
close(O.norm(near.force)/O.norm(far.force),((1+c.e)/(1-c.e))**2,1e-8,'Halley inverse-square force ratio');
assert.ok(near.h[2]<0,'Halley retrograde h must point below the ecliptic');
for(const M of [0,1e-8,1e-5,.001,-.001,.05,-.05,Math.PI]){
  const state=O.stateAtMean(c,M),dM=1e-7*(state.radius/c.a)**1.5,dt=dM*c.period/O.TAU;
  const before=O.stateAtMean(c,M-dM),after=O.stateAtMean(c,M+dM);
  for(let j=0;j<3;j++){
    close((after.r[j]-before.r[j])/(2*dt),state.v[j],state.speed*2e-5,'Halley near-perihelion velocity derivative');
    close((after.v[j]-before.v[j])/(2*dt),state.acc[j],O.norm(state.acc)*2e-5,'Halley near-perihelion acceleration derivative');
  }
}
for(const e of [c.e,.99,.9999])for(let j=-120;j<=120;j++){
  const M=Math.PI*j/120,E=O.eccentricAnomaly(M,e),wrapped=O.mod(M+Math.PI,O.TAU)-Math.PI;
  close(E-e*Math.sin(E),wrapped,8e-15,`safeguarded Kepler solver e=${e},M=${M}`);
}
console.log('PASS: 8 planets + Halley; analytic velocity/acceleration, conserved energy/angular momentum, orbit planes, SI force conversion, periodicity, equal-time areas, comet perihelion/aphelion ratios, retrograde h, and high-e Kepler solver.');
