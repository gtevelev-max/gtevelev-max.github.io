/* Exact, dependency-free algorithms shared by the browser and Node tests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Mathieu=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const identity=n=>Array.from({length:n},(_,i)=>i);
 const compose=(a,b)=>b.map(i=>a[i]);
 const inverse=a=>{const b=[];a.forEach((v,i)=>b[v]=i);return b;};
 const same=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
 const gcd=(a,b)=>b?gcd(b,a%b):a;
 const lcm=(a,b)=>a/gcd(a,b)*b;
 function cycles(a,includeFixed=false){const used=new Set(),cs=[];for(let i=0;i<a.length;i++){if(used.has(i))continue;let j=i,c=[];while(!used.has(j)){used.add(j);c.push(j);j=a[j];}if(c.length>1||includeFixed)cs.push(c);}return cs;}
 const order=a=>cycles(a).reduce((m,c)=>lcm(m,c.length),1);
 function power(a,k){if(k<0)return power(inverse(a),-k);let r=identity(a.length);while(k){if(k%2)r=compose(r,a);a=compose(a,a);k=Math.floor(k/2);}return r;}
 const image=(g,B)=>B.map(i=>g[i]).sort((a,b)=>a-b);
 const cycleText=(p,label=String)=>cycles(p).map(c=>'('+c.map(label).join(' ')+')').join('')||'1';
 function parseWord(text,names,gens,n){
   text=text.trim();if(!text||text==='1')return {permutation:identity(n),tokens:[]};
   const tokens=[];let pos=0;
   const sorted=[...names].sort((a,b)=>b.length-a.length);
   while(pos<text.length){if(/[\s*·]/.test(text[pos])){pos++;continue;}
     const name=sorted.find(s=>text.startsWith(s,pos));if(!name)throw Error('Unknown generator at “'+text.slice(pos)+'”. Use '+names.join(', ')+'.');
     pos+=name.length;let exponent=1;
     if(text[pos]==='^'){const m=text.slice(pos+1).match(/^-?\d+/);if(!m)throw Error('An exponent must be an integer, for example r^-1.');exponent=Number(m[0]);pos+=1+m[0].length;if(Math.abs(exponent)>10000)throw Error('Please use exponents between −10000 and 10000.');}
     tokens.push({name,exponent,permutation:power(gens[names.indexOf(name)],exponent)});
     if(tokens.length>120)throw Error('Use at most 120 factors.');
   }
   let p=identity(n);for(const token of tokens)p=compose(p,token.permutation);
   return {permutation:p,tokens};
 }
 function sift(p,chain){let r=[...p];const steps=[];for(const L of chain){const a=r[L.base],t=L.transversals[a];steps.push({base:L.base,image:a,orbit:L.orbit,found:!!t,before:r});if(!t)return {member:false,steps,remainder:r};r=compose(inverse(t),r);steps[steps.length-1].after=r;}return {member:same(r,identity(p.length)),steps,remainder:r};}
 function combinations(xs,k){const out=[];function rec(s,a){if(a.length===k){out.push(a);return;}for(let i=s;i<=xs.length-k+a.length;i++)rec(i+1,[...a,xs[i]]);}rec(0,[]);return out;}
 function choose(n,k){if(k<0||k>n)return 0;let r=1;for(let i=1;i<=k;i++)r=r*(n-i+1)/i;return Math.round(r);}
 function auditDesign(blocks,n,t){const counts=new Map();for(const B of blocks)for(const T of combinations(B,t)){const key=T.join(',');counts.set(key,(counts.get(key)||0)+1);}const histogram={};for(const c of counts.values())histogram[c]=(histogram[c]||0)+1;return {distinct:counts.size,total:choose(n,t),histogram,pass:counts.size===choose(n,t)&&Object.keys(histogram).length===1&&!!histogram[1]};}
 function blockOrbit(seed,gs){const blocks=[[...seed].sort((a,b)=>a-b)],seen=new Set([blocks[0].join(',')]),depth=[0],layers=[1];for(let i=0;i<blocks.length;i++)for(const g of gs){const B=image(g,blocks[i]),key=B.join(',');if(!seen.has(key)){seen.add(key);blocks.push(B);depth.push(depth[i]+1);layers[depth[i]+1]=(layers[depth[i]+1]||0)+1;}}return {blocks,depth,layers};}
 function groupClosure(gs,n,limit=5000){const es=[identity(n)],seen=new Set([es[0].join(',')]);for(let i=0;i<es.length;i++)for(const g of gs){const h=compose(g,es[i]),k=h.join(',');if(!seen.has(k)){seen.add(k);es.push(h);if(es.length>limit)throw Error('Enumeration limit exceeded. Use a stabilizer chain for a large group.');}}return es;}
 function rref(rows,q){const a=rows.map(r=>r.map(x=>(x%q+q)%q)),pivots=[];let r=0;for(let c=0;c<(a[0]||[]).length&&r<a.length;c++){let s=r;while(s<a.length&&!a[s][c])s++;if(s===a.length)continue;[a[r],a[s]]=[a[s],a[r]];const inv=q===3&&a[r][c]===2?2:1;a[r]=a[r].map(x=>x*inv%q);for(let i=0;i<a.length;i++)if(i!==r&&a[i][c]){const m=a[i][c];a[i]=a[i].map((x,j)=>(x-m*a[r][j]+q*q)%q);}pivots.push(c);r++;}return {rows:a.slice(0,r),pivots,rank:r};}
 function inRowSpace(v,basis,q){const R=rref(basis,q);let w=[...v];R.rows.forEach((r,i)=>{const c=w[R.pivots[i]];w=w.map((x,j)=>(x-c*r[j]+q*q)%q);});return w.every(x=>x===0);}
 function codewords(basis,q){let words=[Array(basis[0].length).fill(0)];for(const row of basis){const next=[];for(const w of words)for(let c=0;c<q;c++)next.push(w.map((x,i)=>(x+c*row[i])%q));words=next;}return words;}
 const weight=w=>w.filter(x=>x!==0).length;
 const distance=(v,w)=>v.reduce((s,x,i)=>s+(x!==w[i]),0);
 function histogram(xs){const h={};for(const x of xs)h[x]=(h[x]||0)+1;return h;}
 function decode(received,words){let minimum=Infinity,winners=[];words.forEach((w,i)=>{const d=distance(w,received);if(d<minimum){minimum=d;winners=[i];}else if(d===minimum)winners.push(i);});return {minimum,winners};}
 function schreierAudit(chain){let count=0;for(let i=0;i<chain.length;i++){const L=chain[i];for(const [a,ta] of Object.entries(L.transversals))for(const s of L.generators){const h=compose(inverse(L.transversals[s[Number(a)]]),compose(s,ta));if(!sift(h,chain.slice(i+1)).member)return {pass:false,count};count++;}}return {pass:true,count};}
 return {identity,compose,inverse,same,cycles,order,power,image,cycleText,parseWord,sift,combinations,choose,auditDesign,blockOrbit,groupClosure,rref,inRowSpace,codewords,weight,distance,histogram,decode,schreierAudit};
});
