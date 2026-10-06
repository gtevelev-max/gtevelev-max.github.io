/* Run: node tests/verify_data.cjs. Independent exact checks of the exported data. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require('../core.js'),D=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/mathieu.json')));
const report={groups:{},codes:{},checks:0};
const check=(v,msg)=>{assert.ok(v,msg);report.checks++;};
const ids=n=>Array.from({length:n},(_,i)=>i);
for(const [n,G] of Object.entries(D.groups)){
 const blockKeys=new Set(G.blocks.map(B=>B.join(',')));
 for(const g of G.generators){check(M.same([...g].sort((a,b)=>a-b),ids(G.n)),`M${n} permutation`);check(M.sift(g,G.chain).member,'generator membership');for(const B of G.blocks)check(blockKeys.has(M.image(g,B).join(',')),'block preservation');}
 const orbit=M.blockOrbit(G.blocks[0],G.generators);check(orbit.blocks.length===G.blocks.length&&orbit.blocks.every(B=>blockKeys.has(B.join(','))),'full block orbit');
 const design=M.auditDesign(G.blocks,G.n,G.t);check(design.pass,'Steiner property');
 const chain=M.schreierAudit(G.chain);check(chain.pass&&chain.count===G.schreier_checks,'Schreier relations');
 check(G.chain.reduce((p,L)=>p*L.orbit.length,1)===G.order,'order from orbit-stabilizer');
 for(const [i,L] of G.chain.entries()){
  check(L.order===L.orbit.length*L.next_order,'stabilizer index');
  check(L.next_order===(G.chain[i+1]?.order||1),'chain continuity');
  for(const [a,t] of Object.entries(L.transversals)){check(t[L.base]===+a,'transversal image');check(G.chain.slice(0,i).every(K=>t[K.base]===K.base),'transversal fixes earlier base');}
 }
 const odd=ids(G.n);[odd[0],odd[1]]=[odd[1],odd[0]];check(!M.sift(odd,G.chain).member,'reject transposition');
 for(const P of G.sylows){const es=M.groupClosure(P.generators,G.n,1100);check(es.length===P.order,'Sylow order');check(es.every(p=>M.sift(p,G.chain).member),'Sylow membership');check(G.order/P.normalizer_order===P.number&&P.number%P.p===1,'Sylow count');const center=es.filter(a=>P.generators.every(b=>M.same(M.compose(a,b),M.compose(b,a))));check(center.length===P.center_order,'Sylow center independently enumerated');check(Math.max(...es.map(M.order))===P.exponent,'p-group exponent');}
 check(G.classes.reduce((s,C)=>s+C.size,0)===G.order,'class equation');
 for(const C of G.classes){check(M.order(C.representative)===C.order,'class element order');check(M.sift(C.representative,G.chain).member,'class membership');check(C.representative.filter((x,i)=>x===i).length===C.fixed,'fixed points');}
 check(G.classes.reduce((s,C)=>s+C.size*(C.fixed-1)**2,0)===G.order,'irreducible augmentation character');
 const T=G.triangle;check(M.same(T.orders,[M.order(T.x),M.order(T.y),M.order(M.compose(T.x,T.y))]),'triangle exact orders');check(M.sift(T.x,G.chain).member&&M.sift(T.y,G.chain).member,'triangle pair membership');
 const [a,b,c]=T.orders;check((2-2*T.surface_genus)*a*b*c===G.order*(b*c+a*c+a*b-a*b*c),'exact Euler characteristic');
 report.groups[n]={order:G.order,blocks:G.blocks.length,incidences:design.total,schreierRelations:chain.count,sylows:G.sylows.length,classes:G.classes.length,triangle:T.orders};
}
for(const [name,C] of Object.entries(D.codes)){
 const words=M.codewords(C.basis,C.q),hist=M.histogram(words.map(M.weight));
 check(M.rref(C.basis,C.q).rank===C.k,'code dimension');check(words.length===C.q**C.k,'code size');assert.deepEqual(hist,C.weight_distribution);report.checks++;
 const nonzero=words.filter(w=>M.weight(w));check(Math.min(...nonzero.map(M.weight))===C.minimum_distance,'code minimum distance');
 const supports=[...new Set(words.filter(w=>M.weight(w)===C.minimum_distance).map(w=>w.flatMap((x,i)=>x?[i]:[]).join(',')))],blocks=new Set(D.groups[C.n].blocks.map(B=>B.join(',')));check(supports.length===blocks.size&&supports.every(s=>blocks.has(s)),'code supports equal Witt design');
 const radius=Math.floor((C.minimum_distance-1)/2);
 for(const index of [0,1,Math.floor(words.length/3),words.length-1])for(let count=0;count<=radius;count++){
  const w=[...words[index]];for(let j=0;j<count;j++)w[(j*7+2)%C.n]=(w[(j*7+2)%C.n]+1)%C.q;
  const result=M.decode(w,words);check(result.winners.length===1&&result.winners[0]===index,'correctable errors decoded');
 }
 const low=words.find(w=>M.weight(w)===C.minimum_distance),bad=Array(C.n).fill(0);low.flatMap((x,i)=>x?[i]:[]).slice(0,radius+1).forEach(i=>bad[i]=low[i]);const beyond=M.decode(bad,words);check(beyond.winners.length>1||beyond.winners[0]!==0,'beyond-radius ambiguity or wrong unique answer demonstrated');
 report.codes[name]={words:words.length,distance:C.minimum_distance,weights:hist};
}
report.quaternionStabilizers={};
for(const n of [11,12]){
 const Q=M.quaternionStabilizer(D.groups[n],D.groups[11]);
 check(Q.pass,`M${n} quaternion stabilizer: every certificate check`);
 assert.deepEqual(Q.fixed,n===12?[11,0,1,2]:[0,1,2]);report.checks++;
 assert.deepEqual(Q.chain.map(L=>L.base),n===12?[11,0,1,2,3]:[0,1,2,3]);report.checks++;
 assert.deepEqual(Q.entries.map(e=>e.image),[3,4,5,10,6,8,9,7]);report.checks++;
 assert.deepEqual(M.histogram(Q.entries.map(e=>e.order)),{1:1,2:1,4:6});report.checks++;
 check(Q.entries.filter(e=>e.permutation[3]===3).length===1,'one more fixed point gives the identity');
 const last=Q.chain.at(-1),fullStabilizer=M.groupClosure(last.generators,n,8);
 check(fullStabilizer.length===8&&fullStabilizer.every(p=>Q.entries.some(e=>M.same(p,e.permutation))),'enumerated final strong generators give precisely the quaternion words');
 check(M.same(M.compose(Q.i,Q.j),M.compose(Q.z,M.compose(Q.j,Q.i))),'ij = zji: quaternion anticommutation');
 for(const [k,L] of Q.chain.entries())for(const [a,t] of Object.entries(L.transversals)){
  check(t[L.base]===+a&&Q.chain.slice(0,k).every(K=>t[K.base]===K.base),'lecture-base transversals');
  check(M.sift(t,D.groups[n].chain).member,'lecture-base transversals belong to the original ambient group');
 }
 report.quaternionStabilizers[n]={fixed:Q.fixed,imagesOf3:Q.entries.map(e=>e.image),elementOrders:M.histogram(Q.entries.map(e=>e.order)),order:Q.stabilizerOrder,nextOrder:Q.nextOrder};
}
const badQuaternion={...D.groups[11],generators:[...D.groups[11].generators]};badQuaternion.generators[2]=badQuaternion.generators[1];
check(!M.quaternionStabilizer(D.groups[11],badQuaternion).pass,'a cyclic order-four replacement is not misidentified as Q8');
const W=D.small_witnesses.simplicity,G=D.groups[11];
check(M.same(M.parseWord(W.iota_word,['a','b'],[W.a,W.b],11).permutation,G.generators[1]),'simplicity word iota');
check(M.same(M.parseWord(W.jmath_word,['a','b'],[W.a,W.b],11).permutation,G.generators[2]),'simplicity word jmath');
check(M.groupClosure([W.a,W.b],11,8000).length===G.order,'two eleven-cycles generate M11');
assert.throws(()=>M.parseWord('<script>',G.generator_names,G.generators,11));assert.throws(()=>M.parseWord('r^',G.generator_names,G.generators,11));
check(M.same(M.parseWord('r r^-1',G.generator_names,G.generators,11).permutation,ids(11)),'word inverse convention');
report.passed=true;console.log(JSON.stringify(report,null,2));
