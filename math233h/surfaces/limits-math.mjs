// Seven computed examples for Math 233H Lectures 9–11.
// Graph each function on its stated domain. An assigned value is included only
// when it is part of that example's definition; missing points stay missing.
const punctured = (x,y) => x !== 0 || y !== 0;
const colors = ['#ad5805','#c62850','#783bcc'];
const renderColors = ['#ffb339','#ff5584','#c779ff'];
const path = (name, point, result) => ({name,point,result});
export const limitExamples = [
  {
    id:'two-paths', name:'Two paths, two answers',
    equation:'f(x,y) = (x² − y²)/(x² + y²)', target:[0,0],
    evaluate:(x,y)=>punctured(x,y)?(x*x-y*y)/(x*x+y*y):NaN,
    result:'The limit does not exist.', shortResult:'DNE',
    domain:'All (x,y) except (0,0). The graph has no point over the origin.',
    zCenter:0,zScale:1.25,radius:1,
    paths:[path('x-axis: (t,0)',t=>[t,0],'1'),path('y-axis: (0,t)',t=>[0,t],'−1')],
    proof:'<p>Along the x-axis, <b>f(t,0) = 1</b> for t ≠ 0. Along the y-axis, <b>f(0,t) = −1</b>. Both paths approach the origin, but their limits differ.</p><p>In polar coordinates the same graph is z = cos(2θ), independent of r. Shrinking the disk never makes all heights approach one number.</p>',
    prompt:'Shrink the disk. The two colored paths keep their different heights.'
  },
  {
    id:'curved-path',name:'Every straight line can miss a path',
    equation:'g(x,y) = xy²/(x² + y⁴)',target:[0,0],
    evaluate:(x,y)=>punctured(x,y)?x*y*y/(x*x+y**4):NaN,
    result:'The limit does not exist, even though every line gives 0.',shortResult:'DNE',
    domain:'All (x,y) except (0,0). A narrow ridge follows x = y².',
    zCenter:0,zScale:.65,radius:1,
    paths:[path('line y = x: (t,t)',t=>[t,t],'0'),path('vertical line: (0,t)',t=>[0,t],'0'),path('parabola x = y²: (t²,t)',t=>[t*t,t],'1/2')],
    proof:'<p>On any nonvertical line y = kx, <b>g(x,kx) = k²x/(1 + k⁴x²) → 0</b>. On the remaining vertical line x = 0, g = 0 as well.</p><p>But on x = y², <b>g(t²,t) = t⁴/(2t⁴) = 1/2</b> for t ≠ 0. Hence there is no two-variable limit.</p><p>The purple parabola is evaluated directly. The surface mesh follows curves of the form x = ky², keeping both narrow ridges visible as the disk shrinks.</p>',
    prompt:'Compare the purple parabola with the straight paths. All fixed directions can agree while the full limit fails.'
  },
  {
    id:'infinite',name:'An infinite limit',
    equation:'f(x,y) = 1/(x² + y²)',target:[0,0],
    evaluate:(x,y)=>punctured(x,y)?1/(x*x+y*y):NaN,
    result:'The function tends to +∞; it has no finite limit.',shortResult:'+∞',
    domain:'All (x,y) except (0,0). The height window grows as the disk shrinks; the axis labels show actual function values.',
    zCenter:10,zScale:10,radius:1,
    paths:[path('x-axis: (t,0)',t=>[t,0],'+∞'),path('diagonal: (t,t)',t=>[t,t],'+∞')],
    proof:'<p>Write ρ = √(x² + y²). Then <b>f = 1/ρ²</b>, regardless of direction.</p><p>Given any M > 0, choose δ = 1/√M. If 0 < ρ < δ, then <b>f = 1/ρ² > M</b>. This proves the infinite limit using every point of the punctured disk.</p><p>On the disk of radius r, the smallest height is <b>1/r²</b>, at its boundary. The height window automatically grows in proportion to 1/r² so the rising graph remains visible. Read the axis labels and table for the actual values; increase the height ceiling to reveal more of the unbounded rise.</p>',
    prompt:'Shrink the disk and watch the actual height labels grow. Raise the height ceiling to see farther up the graph; its open top continues without bound.'
  },
  {
    id:'squeeze',name:'One estimate controls every path',
    equation:'q(x,y) = x²y/(x² + y²)',target:[0,0],
    evaluate:(x,y)=>punctured(x,y)?x*x*y/(x*x+y*y):NaN,
    result:'The limit is 0.',shortResult:'0',
    domain:'All (x,y) except (0,0). Defining q(0,0) = 0 would give a continuous extension.',
    zCenter:0,zScale:.8,radius:1,
    paths:[path('diagonal: (t,t)',t=>[t,t],'0'),path('parabola: (t,t²)',t=>[t,t*t],'0'),path('x-axis: (t,0)',t=>[t,0],'0')],
    proof:'<p>Since 0 ≤ x²/(x² + y²) ≤ 1, <b>|q(x,y)| ≤ |y| ≤ √(x² + y²) = r</b>. Thus q → 0 by the squeeze theorem.</p><p>For an ε–δ proof take <b>δ = ε</b>. In polar coordinates q = r cos²θ sinθ, so |q| ≤ r for <em>every</em> θ, even when θ changes as r → 0. The uniform bound is what proves the limit.</p>',
    prompt:'The height scale stays fixed while the disk shrinks. Every graph height is trapped between −r and r.'
  },
  {
    id:'continuous-not-differentiable',name:'Continuous, but not differentiable',
    equation:'q(x,y) = xy/√(x² + y²) for (x,y) ≠ (0,0); q(0,0) = 0',target:[0,0],includesTarget:true,
    evaluate:(x,y)=>punctured(x,y)?x*y/Math.hypot(x,y):0,
    result:'The limit is 0. The function is continuous, but not differentiable at the origin.',shortResult:'0',
    domain:'All of ℝ², with q(0,0) defined to be 0. The solid dot is the graph’s actual value at the origin.',
    zCenter:0,zScale:.65,radius:1,
    paths:[path('x-axis: (t,0)',t=>[t,0],'0'),path('y-axis: (0,t)',t=>[0,t],'0'),path('diagonal y = x: (t,t)',t=>[t,t],'0')],
    proof:'<p>Since 2|xy| ≤ x² + y², <b>|q(x,y)| ≤ ½√(x² + y²) = r/2</b>. Hence q → 0 uniformly over all approaches. The assigned value q(0,0) = 0 makes q continuous; for an ε–δ proof, take δ = 2ε.</p><p>On both coordinate axes q is identically zero, so <b>q<sub>x</sub>(0,0) = q<sub>y</sub>(0,0) = 0</b>. If q were differentiable, its linear approximation at the origin would therefore be zero.</p><p>But on the diagonal, <b>q(t,t) = |t|/√2</b>, and for every t ≠ 0, <b>q(t,t)/√(t² + t²) = 1/2</b>. This relative error does not tend to zero, so q is not differentiable at the origin.</p><p>The diagonal trace is V-shaped: q(t,t)/t = sign(t)/√2 has different one-sided limits. Thus even the two-sided directional derivative along this diagonal fails to exist. The graph has a conical saddle vertex, with no tangent plane there.</p>',
    prompt:'Both axis traces are flat, but the purple diagonal has a corner. Continuity and the existence of both partial derivatives do not imply differentiability.'
  },
  {
    id:'radial-sinc',name:'Reduce to a one-variable limit',
    equation:'f(x,y) = sin(x² + y²)/(x² + y²)',target:[0,0],
    evaluate:(x,y)=>{const u=x*x+y*y;return u===0?NaN:Math.sin(u)/u;},
    result:'The limit is 1.',shortResult:'1',
    domain:'All (x,y) except (0,0). The missing value can be filled with 1 to make the function continuous.',
    zCenter:1,zScale:.3,radius:1,
    paths:[path('x-axis: (t,0)',t=>[t,0],'1'),path('diagonal: (t,t)',t=>[t,t],'1')],
    proof:'<p>Set <b>u = x² + y²</b>. Whenever (x,y) → (0,0) through nonzero points, u → 0⁺. Therefore <b>sin(x² + y²)/(x² + y²) = sin u/u → 1</b>.</p><p>This is more than a test of selected rays: the expression depends only on the distance from the origin, so the substitution covers every approach.</p>',
    prompt:'The graph approaches height 1, although the displayed formula is undefined at the origin.'
  },
  {
    id:'polynomial',name:'Continuity at a nonzero point',
    equation:'f(x,y) = x³ − x²y⁶',target:[1,2],includesTarget:true,
    evaluate:(x,y)=>x**3-x*x*y**6,
    result:'The limit at (1,2) is −63.',shortResult:'−63',
    domain:'All of ℝ². The graph includes the point (1,2,−63).',
    zCenter:-63,zScale:150,radius:.5,
    paths:[path('horizontal: (1+t,2)',t=>[1+t,2],'−63'),path('vertical: (1,2+t)',t=>[1,2+t],'−63'),path('diagonal: (1+t,2+t)',t=>[1+t,2+t],'−63')],
    proof:'<p>Polynomials are continuous everywhere, so we may substitute the target point:</p><p><b>lim<sub>(x,y)→(1,2)</sub> (x³ − x²y⁶) = 1³ − 1²·2⁶ = 1 − 64 = −63.</b></p><p>The graph is centered above (1,2), not above the origin. Its vertical window is fixed around z = −63; the value at the center is an actual graph point.</p>',
    prompt:'The marked point is (1,2,−63). Shrink the disk to watch nearby graph heights approach it.'
  }
];
const teachingOrder = ['polynomial','infinite','radial-sinc','squeeze','continuous-not-differentiable','two-paths','curved-path'];
limitExamples.sort((a,b)=>teachingOrder.indexOf(a.id)-teachingOrder.indexOf(b.id));
for (const example of limitExamples) example.paths.forEach((p,i)=>{p.color=colors[i];p.renderColor=renderColors[i];});
export const limitById = Object.fromEntries(limitExamples.map(e=>[e.id,e]));
export function pathSamples(example,t){return example.paths.map(p=>{const [x,y]=p.point(t);return {name:p.name,x,y,value:example.evaluate(x,y)};});}

// Only the displayed coordinate window changes. The original function, domain,
// exact path values, and fixed-height windows of finite limits stay untouched.
export function limitViewExample(example,radius,heightMultiplier=32){
  if(!Number.isFinite(radius)||radius<=0)throw new RangeError('Radius must be positive and finite.');
  if(!Number.isFinite(heightMultiplier)||heightMultiplier<=1)throw new RangeError('Height multiplier must be finite and greater than one.');
  if(example.id!=='infinite')return {...example};
  const zMax=heightMultiplier/(radius*radius);
  return {...example,zCenter:zMax/2,zScale:zMax/2};
}
