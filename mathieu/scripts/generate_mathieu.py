#!/usr/bin/env python3
"""Generate exact teaching data. Run with SageMath: sage -python scripts/generate_mathieu.py.

No enumeration of the large Mathieu groups. All exported permutations act on the
left: compose(a,b)[i] = a[b[i]]. GAP multiplication is used only for subgroup
operations; displayed words and triangle products are evaluated here.
"""
from sage.all import GF, matrix, LinearCode
from sage.libs.gap.libgap import libgap
from sage.version import version as sage_version
from collections import Counter, deque
from itertools import combinations, product, permutations
from pathlib import Path
from math import comb, lcm, prod
from fractions import Fraction
import json, random, hashlib, time

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data'
OUT.mkdir(exist_ok=True)
def compose(a,b): return tuple(a[i] for i in b)
def inverse(a): return tuple(a.index(i) for i in range(len(a)))
def identity(n): return tuple(range(n))
def power(a,k):
    if k<0: return power(inverse(a),-k)
    r=identity(len(a))
    while k:
        if k&1: r=compose(r,a)
        a=compose(a,a); k//=2
    return r
def cycles(a):
    seen=set(); out=[]
    for i in range(len(a)):
        if i in seen: continue
        c=[]; j=i
        while j not in seen:
            seen.add(j); c.append(j); j=a[j]
        if len(c)>1: out.append(c)
    return out
def order(a): return lcm(*(len(c) for c in cycles(a))) if cycles(a) else 1
def perm(n,*cs):
    a=list(range(n))
    for c in cs:
        for i,j in zip(c,c[1:]+c[:1]): a[i]=j
    return tuple(a)
def as_gap(a): return libgap.PermList([x+1 for x in a])
def as_array(a,n): return tuple(int(x)-1 for x in libgap.ListPerm(a,n))
def gap_group(gs): return libgap.Group([as_gap(g) for g in gs])
def generators(G,n): return [as_array(g,n) for g in libgap.GeneratorsOfGroup(G)]
def size(G): return int(libgap.Size(G))
GAP_CONTAINS=libgap.eval('function(g,G) return g in G; end')
def image(a,B): return tuple(sorted(a[i] for i in B))
def orbit_blocks(seed,gs):
    seed=tuple(sorted(seed)); arr=[seed]; seen={seed}; depth={seed:0}
    for B in arr:
        for g in gs:
            C=image(g,B)
            if C not in seen: seen.add(C); arr.append(C); depth[C]=depth[B]+1
    return sorted(seen),dict(sorted(Counter(depth.values()).items()))
def codewords(basis,q):
    words=[tuple([0]*len(basis[0]))]
    for row in basis:
        words=[tuple((x+c*y)%q for x,y in zip(w,row)) for w in words for c in range(q)]
    return sorted(words)
def weight(w): return sum(x!=0 for x in w)
def design_check(blocks,n,t,k):
    assert len(set(map(tuple,blocks)))==len(blocks)
    counts=Counter(T for B in blocks for T in combinations(B,t))
    assert len(counts)==comb(n,t) and set(counts.values())=={1}
    assert all(len(B)==k for B in blocks)
    return {'checked_subsets':comb(n,t),'incidences':len(blocks)*comb(k,t),
            'lambda':[comb(n-s,t-s)//comb(k-s,t-s) for s in range(t+1)],
            'intersection_histogram':dict(sorted(Counter(len(set(blocks[0])&set(B)) for B in blocks[1:]).items()))}
def make_chain(G,n):
    H=G; levels=[]
    for b in range(n):
        if size(H)==1: break
        gs=generators(H,n); trans={b:identity(n)}; queue=[b]; edges=[]
        for a in queue:
            for gi,g in enumerate(gs):
                c=g[a]
                if c not in trans:
                    trans[c]=compose(g,trans[a]); queue.append(c); edges.append([a,c,gi])
        K=libgap.Stabilizer(H,b+1)
        assert size(H)==len(trans)*size(K)
        assert all(all(g[j]==j for j in range(b)) for g in gs)
        levels.append({'base':b,'order':size(H),'next_order':size(K),'orbit':sorted(trans),
                       'generators':gs,'transversals':{str(a):g for a,g in sorted(trans.items())},'tree':edges})
        H=K
    assert size(H)==1 and prod(len(L['orbit']) for L in levels)==size(G)
    return levels
def sift(p,chain):
    for L in chain:
        t=L['transversals'].get(str(p[L['base']]))
        if t is None:return False
        p=compose(inverse(t),p)
    return p==identity(len(p))
def validate_chain(chain,n):
    """Deterministic Schreier certificate, independent of GAP's size report.

    Each level's Schreier generators sift to identity through the next levels.
    Exported transversals are words in level generators (BFS). This proves closure
    and the order upper bound. Membership in the original GAP group checks that
    the chain has not enlarged the original group; original generators sift too.
    """
    checks=0
    for j,L in enumerate(chain):
        T={int(k):tuple(v) for k,v in L['transversals'].items()}
        for a,ta in T.items():
            for s in L['generators']:
                h=compose(inverse(T[s[a]]),compose(s,ta))
                assert sift(h,chain[j+1:]); checks+=1
    return checks
def triangle_pair(G,n,gs,preferred=None):
    if preferred:
        a,b=preferred
        assert size(gap_group([a,b]))==size(G)
        return a,b
    # Reproducible search for a witness; exact generated-group order certifies it.
    rng=random.Random(611+n); candidates={2:[],3:[],4:[]}; seen=set(); pool=gs+[inverse(g) for g in gs]
    w=identity(n)
    for attempt in range(1,16001):
        w=compose(pool[rng.randrange(len(pool))],w)
        o=order(w)
        for d in (2,3,4):
            if o%d==0:
                v=power(w,o//d)
                if (d,v) not in seen:
                    seen.add((d,v)); candidates[d].append(v)
                    # Test only recent opposite-type witnesses; never assume
                    # large element order implies generation.
                    pairs=([(v,b) for b in candidates[3][-12:]+candidates[4][-12:]] if d==2
                           else [(a,v) for a in candidates[2][-12:]])
                    for a,b in pairs:
                        r=order(compose(a,b))
                        if r>=7 and size(gap_group([a,b]))==size(G): return a,b
    raise RuntimeError('No certified triangle pair found')

def main():
    start=time.time()
    rho=tuple((i+1)%11 for i in range(11))
    iota=perm(11,(3,4,5,10),(6,8,9,7)); jmath=perm(11,(3,6,5,9),(4,7,10,8))
    small11=[rho,iota,jmath]; G11=gap_group(small11)
    small12=[g+(11,) for g in small11]+[perm(12,(0,11),(1,10),(2,5),(3,7),(4,8),(6,9))]
    G12=gap_group(small12)
    R={1,3,4,5,9}; biplane=[sorted((r+b)%11 for r in R) for b in range(11)]
    hexads,_=orbit_blocks(sorted(R|{11}),small12)
    pentads=sorted(tuple(i for i in B if i!=11) for B in hexads if 11 in B)
    assert len(hexads)==132 and len(pentads)==66
    B=matrix(GF(3),[[1 if j in row else 2 for j in range(11)] for row in biplane])
    basis3=[[int(x) for x in row] for row in B.row_space().basis()]
    words3=codewords(basis3,3)
    assert len(words3)==729
    assert set(tuple(i for i,x in enumerate(w) if x) for w in words3 if weight(w)==5)==set(pentads)
    basis12=[row+[sum(row)%3] for row in basis3]
    # Binary cyclic Golay code, then parity extension: same labels as lecture.
    g=sum(1<<i for i in [11,9,7,6,5,1,0])
    basis23=[[(g<<k)>>i&1 for i in range(23)] for k in range(12)]
    basis24=[row+[sum(row)%2] for row in basis23]
    words24=codewords(basis24,2)
    octads=sorted(tuple(i for i,x in enumerate(w) if x) for w in words24 if weight(w)==8)
    assert len(octads)==759
    print('Computing binary-code automorphism group by partition backtracking...',flush=True)
    C24=LinearCode(matrix(GF(2),basis24))
    A24=C24.permutation_automorphism_group()
    G24=libgap(A24)
    G23=libgap.Stabilizer(G24,24)
    G22=libgap.Stabilizer(G23,23)
    specs={11:(G11,small11,pentads,4,5),12:(G12,small12,hexads,5,6),
           22:(G22,generators(G22,22),sorted(tuple(i for i in B if i<22) for B in octads if 22 in B and 23 in B),3,6),
           23:(G23,generators(G23,23),sorted(tuple(i for i in B if i<23) for B in octads if 23 in B),4,7),
           24:(G24,generators(G24,24),octads,5,8)}
    expected={11:7920,12:95040,22:443520,23:10200960,24:244823040}
    data={'schema':1,'sage':sage_version,'gap':str(libgap.eval('GAPInfo.Version')),
          'convention':'Zero-based labels; compose(a,b)=a after b. Small ∞=11; large parity ∞=23.',
          'groups':{},'biplane':biplane,'codes':{},'checks':{}}
    for n,(G,gs,blocks,t,k) in specs.items():
        print('M'+str(n),'order',size(G),flush=True)
        assert size(G)==expected[n]
        # Restriction for large point stabilizers is faithful; all omitted points fixed.
        H=gap_group(gs); assert size(H)==size(G); G=H
        dcheck=design_check(blocks,n,t,k)
        assert all(image(a,B) in set(blocks) for a in gs for B in blocks)
        chain=make_chain(G,n); count=validate_chain(chain,n)
        assert all(sift(a,chain) for a in gs)
        assert all(bool(GAP_CONTAINS(as_gap(a),G)) for L in chain for a in L['generators'])
        pref=None
        if n==11:
            pref=(perm(11,(1,7),(3,4),(5,6),(9,10)),perm(11,(0,10,2,3),(1,9,8,5)))
        a,b=triangle_pair(G,n,gs,pref)
        triangle=[order(a),order(b),order(compose(a,b))]
        genus=1+Fraction(size(G),2)*(1-sum(Fraction(1,x) for x in triangle))
        assert genus.denominator==1
        sylows=[]
        for p in [2,3,5,7,11,23]:
            if size(G)%p:continue
            P=libgap.SylowSubgroup(G,p); N=libgap.Normalizer(G,P)
            pg=generators(P,n); pn=size(P); nn=size(N); number=size(G)//nn
            assert number%p==1 and all(bool(GAP_CONTAINS(as_gap(g),G)) for g in pg)
            sylows.append({'p':p,'order':pn,'normalizer_order':nn,'number':number,
                'structure':str(libgap.StructureDescription(P)), 'exponent':int(libgap.Exponent(P)),
                'center_order':size(libgap.Center(P)),'derived_order':size(libgap.DerivedSubgroup(P)),
                'abelian':bool(libgap.IsAbelian(P)),'generators':pg,
                'orbit_sizes':sorted(len(x) for x in libgap.Orbits(P,list(range(1,n+1))))})
        classes=[]
        for C in libgap.ConjugacyClasses(G):
            r=as_array(libgap.Representative(C),n)
            classes.append({'order':order(r),'size':size(C),'representative':r,
                            'fixed':sum(i==x for i,x in enumerate(r)),
                            'centralizer_order':size(G)//size(C)})
        classes.sort(key=lambda C:(C['order'],C['size'],C['representative']))
        assert sum(C['size'] for C in classes)==size(G)
        orbit,layers=orbit_blocks(blocks[0],gs);assert orbit==blocks
        group={'n':n,'order':size(G),'generators':gs,'generator_names':['r','i','j'] if n==11 else (['r','i','j','w'] if n==12 else ['g'+str(i+1) for i in range(len(gs))]),
            'blocks':blocks,'t':t,'k':k,'design_check':dcheck,'orbit_layers':layers,'chain':chain,
            'sylows':sylows,'classes':classes,'triangle':{'x':a,'y':b,'orders':triangle,'image_order':size(G),'surface_genus':int(genus)},
            'schreier_checks':count}
        data['groups'][str(n)]=group
        data['checks']['M'+str(n)]={'order':size(G),'schreier_relations':count,'t_subsets':comb(n,t),'classes_sum':sum(C['size'] for C in classes)}
        print(' certified chain, design, Sylow normalizers, classes, triangle',triangle,flush=True)
    for name,basis,q in [('ternary11',basis3,3),('ternary12',basis12,3),('binary23',basis23,2),('binary24',basis24,2)]:
        words=codewords(basis,q); histogram=dict(sorted(Counter(map(weight,words)).items()))
        data['codes'][name]={'q':q,'n':len(basis[0]),'k':len(basis),'basis':basis,'weight_distribution':histogram,
                             'minimum_distance':min(w for w in histogram if w)}
    data['checks']['binary_octad_span_rank']=int(matrix(GF(2),[[int(i in B) for i in range(24)] for B in octads]).rank())
    assert data['checks']['binary_octad_span_rank']==12
    # Small-group witnesses which replace the former printed computation tables.
    a=rho; b=compose(iota,compose(rho,inverse(iota)))
    def word(text):
        w=identity(11)
        for c in text:
            g={'a':a,'b':b,'A':inverse(a),'B':inverse(b)}[c]
            w=compose(w,g)
        return w
    assert word('aBAbABaab')==iota and word('aaBBABBA')==jmath
    assert size(gap_group([a,b]))==7920
    u=perm(11,(2,7,8),(3,10,9),(4,5,6)); v=perm(11,(2,10,4),(3,6,8),(5,7,9))
    assert compose(u,v)==compose(v,u) and size(gap_group([u,v]))==9
    P3=gap_group([u,v]); pair_stabilizer=libgap.Stabilizer(libgap.Stabilizer(G11,1),2)
    assert size(pair_stabilizer)==72
    assert size(gap_group([u,v,iota,jmath]))==72
    assert bool(libgap.IsNormal(pair_stabilizer,P3))
    assert all(bool(GAP_CONTAINS(as_gap(g),G11)) for g in [u,v])
    affine=[[i,j,power(u,i)[power(v,j)[2]]] for i in range(3) for j in range(3)]
    signs=[[],[1,2,3,5,6,8],[0,1,3,7,8,9]]
    def signed_image(g,S,w):
        out=[0]*11
        for i in range(11):out[g[i]]=w[i]*(2 if i in S else 1)%3
        return tuple(out)
    Cset=set(words3); C0=sorted(w for w in words3 if sum(w)%3==0)
    assert len(C0)==243
    assert all(signed_image(g,S,w) in Cset for g,S in zip(small11,signs) for w in words3)
    visited=set(); module_orbits=[]
    for w in C0:
        if w in visited:continue
        queue=[w]; visited.add(w)
        for d in queue:
            for g,S in zip(small11,signs):
                e=signed_image(g,S,d)
                if e not in visited: visited.add(e);queue.append(e)
        module_orbits.append({'weight':weight(w),'size':len(queue)})
    assert sorted(x['size'] for x in module_orbits)==[1,110,132]
    # Embed signed permutations on the 22 signed coordinate vectors; forgetting
    # signs is onto G11. Equal order certifies a genuine lift, not a double cover.
    signed_perms=[]
    for g,S in zip(small11,signs):
        signed_perms.append(tuple(g[i%11]+11*((i//11+(i%11 in S))%2) for i in range(22)))
    assert size(gap_group(signed_perms))==7920
    # Orbit of the entire eleven-block biplane under M11.
    D0=tuple(sorted(tuple(B) for B in biplane)); bs=[D0]; seen={D0}
    for D in bs:
        for g in small11:
            E=tuple(sorted(image(g,B) for B in D))
            if E not in seen:seen.add(E);bs.append(E)
    assert len(bs)==12
    assert set(Counter(B for D in bs for B in D).values())=={2}
    bindex={D:i for i,D in enumerate(bs)}
    baction=[tuple(bindex[tuple(sorted(image(g,B) for B in D))] for D in bs) for g in small11]
    assert size(gap_group(baction))==7920
    assert int(libgap.Transitivity(gap_group(baction),list(range(1,13))))==3
    nonpentad=next(T for T in combinations(range(11),5) if T not in set(pentads))
    other_orbit,_=orbit_blocks(nonpentad,small11)
    assert len(other_orbit)==396 and set(other_orbit).isdisjoint(set(pentads))
    # Independent projective-line construction (HW2 Problem 20), before using G12.
    projective_gens=[rho+(11,),small12[-1]]
    assert size(gap_group(projective_gens))==660
    projective_hexads,projective_layers=orbit_blocks(sorted(R|{11}),projective_gens)
    assert projective_hexads==hexads
    # Any design automorphism fixing four points fixes the fifth point of their
    # unique block. Check all 6! permutations of the remaining coordinates.
    B0=next(B for B in pentads if set(range(4))<=set(B))
    complement=[i for i in range(11) if i not in B0]; surviving=[]; pset=set(pentads)
    for rest in permutations(complement):
        h=list(range(11))
        for i,j in zip(complement,rest):h[i]=j
        if all(image(h,B) in pset for B in pentads):surviving.append(h)
    assert surviving==[list(range(11))]
    data['small_witnesses']={'simplicity':{'a':a,'b':b,'iota_word':'a b^-1 a^-1 b a^-1 b^-1 a^2 b','jmath_word':'a^2 b^-2 a^-1 b^-2 a^-1'},
        'sylow3':{'u':u,'v':v,'affine_coordinates':affine},'signed_lifts':signs,'module_orbits':module_orbits,'biplanes':bs,
        'projective':{'generators':projective_gens,'order':660,'seed':sorted(R|{11}),'layers':projective_layers},
        'rigidity':{'frame':[0,1,2,3],'forced_block':B0,'remaining':complement,'tested':720,'survivors':1}}
    data['checks']['all_passed']=True
    text=json.dumps(data,separators=(',',':'),sort_keys=True)
    (OUT/'mathieu.json').write_text(text+'\n')
    (OUT/'mathieu.js').write_text('/* Exact data: regenerate with scripts/generate_mathieu.py. */\nwindow.MATHIEU_DATA='+text+';\n')
    (OUT/'verification.json').write_text(json.dumps({'sage':sage_version,'gap':data['gap'],'data_sha256':hashlib.sha256((OUT/'mathieu.json').read_bytes()).hexdigest(),'checks':data['checks']},indent=2)+'\n')
    print('Wrote',len(text),'bytes in',round(time.time()-start,2),'seconds',flush=True)

if __name__=='__main__':main()
