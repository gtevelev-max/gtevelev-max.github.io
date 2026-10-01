"""Precompute verified spectra by exact elliptic division polynomials.

Run with the installed Sage Python and DOT_SAGE set to a writable cache.
The finite critical algebra identification and imprimitive action formula
are in the manuscript's global LG section.  The recurrence below follows
by substituting its marked point in the usual elliptic division recurrence.
"""
import argparse,json,math,time
from fractions import Fraction
from pathlib import Path
import numpy as np
from scipy.optimize import linear_sum_assignment
from sage.all import QQ,PolynomialRing,ComplexBallField,ComplexField,divisors
from core_engine import pencil

R=PolynomialRing(QQ,'rho');rho=R.gen();K=R.fraction_field()
T=PolynomialRing(K,'t');t=T.gen();Q=(t+2)**2-4*rho
ss={0:T(0),1:T(1),2:T(-1),3:t+1-rho,4:(rho-1)*t}


def sigma(n):
    if n not in ss:
        m=n//2
        if n%2:
            a=sigma(m+2)*sigma(m)**3;b=sigma(m-1)*sigma(m+1)**3
            ss[n]=Q*a-b if m%2==0 else a-Q*b
        else:
            ss[n]=-sigma(m)*(sigma(m+2)*sigma(m-1)**2-sigma(m-2)*sigma(m+1)**2)
    return ss[n]


primitive={}
def primitive_polynomial(n):
    if n not in primitive:
        f=sigma(n)
        assert f.degree()==(n*n-1)//8,(n,f.degree())
        for d in divisors(n):
            if 1<d<n:
                f,rem=f.quo_rem(primitive_polynomial(d));assert rem==0
        primitive[n]=f.monic()
    return primitive[n]


def orbit_value(n,r,tv,CF):
    """Value of the actual regular potential on a primitive n-torsion orbit."""
    b=[CF(0),CF(1),tv/(r-1)]
    for i in range(2,n-1):
        b.append((b[i]**2-1)/(b[i-1]*(1-r*b[i]**2)))
    # b[n-1]=1. c0 is the Wronskian sum, and each other c_i follows
    # the unfolded stationary identity; all denominators are nonzero.
    w=sum(1/(b[i]*b[i+1]) for i in range(1,n-1))
    w+=sum(-tv/(1-r*b[i]**2) for i in range(1,n))
    w+=r*sum(b[i]*b[i+1] for i in range(1,n-1))
    return w,abs(b[-1]-1)


def primitive_values(n,rq,bits=320):
    poly=primitive_polynomial(n)
    for precision in (bits,2*bits,4*bits,8*bits,16*bits,32*bits):
        CB=ComplexBallField(precision);CF=ComplexField(precision)
        U=PolynomialRing(CB,'u')
        coeff=[c(rq) for c in poly.list()]
        try:
            roots=U(coeff).roots(multiplicities=False)
            if len(roots)!=poly.degree():continue
            out=[];error=0.
            for root in roots:
                tv=CF(root);wv,closure=orbit_value(n,CF(rq),tv,CF)
                error=max(error,float(closure))
                out.append((complex(wv),complex(tv)))
            if error<1e-35:return out,error,precision
        except (ValueError,ArithmeticError,ZeroDivisionError):pass
    raise ArithmeticError(f'Failed certified root count/orbit closure: n={n},rho={rq}')


def core_values(k,rq):
    n=2*k+1;out=[];closure=0.;precision=0
    for d in divisors(n):
        if d==1:continue
        data,err,prec=primitive_values(d,rq)
        closure=max(closure,err);precision=max(precision,prec)
        out.extend((complex(n/d)*w,tv,int(d)) for w,tv in data)
    assert len(out)==k*(k+1)//2
    maxres=0.
    P=np.array(pencil(k,float(rq)),dtype=complex)
    C,A,B=P[:,:,0],P[:,:,1]/(4*k),P[:,:,2]
    for w,tv,_ in out:
        S=C+w*A+tv*B
        S=S/np.maximum(1,np.max(abs(S),axis=1))[:,None]
        sing=np.linalg.svd(S,compute_uv=False)
        maxres=max(maxres,float(sing[-1]/max(sing[0],1)))
    sep=min((abs(a[1]-b[1])/(1+abs(a[1])+abs(b[1])) for i,a in enumerate(out) for b in out[:i]),default=1.)
    return out,{'pencil_residual':maxres,'orbit_closure_error':closure,'min_t_separation':sep,'bits':precision}


def grid():
    # Finite spectrum only for rho>0. Near 1 use high-precision roots;
    # the final frame is the exact terminal specialization.
    x=np.unique(np.concatenate((np.geomspace(1e-4,.05,55),np.linspace(.05,.95,181),1-np.geomspace(.05,1e-5,60))))
    return sorted(set(float(format(r,'.14g')) for r in x))+[1.]


def track_core(k,frames,outdir):
    cache=outdir/f'core{k}.json'
    if cache.exists():
        old=json.loads(cache.read_text())
        if old['frames']==frames:return old
    rows=[];validation=[]
    for i,r in enumerate(frames[:-1]):
        points,stats=core_values(k,QQ(str(Fraction(str(r)))))
        rows.append(points);validation.append(stats)
        if i%40==0:print(f'core {k}: {i+1}/{len(frames)-1}, residual={stats["pencil_residual"]:.2g}',flush=True)
    # Track separately inside each primitive-order component.  This keeps
    # imprimitive subcovers distinct even at critical-value crossings.
    last=rows[-1];labels=[]
    terminals=[4*(-1)**ell*(2*k-1-2*ell) for ell in range(k)]
    for w,_,d in last:labels.append(int(np.argmin(abs(w-np.array(terminals)))))
    assert [labels.count(j) for j in range(k)]==list(range(1,k+1)),(k,labels)
    tracked=[last]
    for row in reversed(rows[:-1]):
        nxt=tracked[-1]
        cost=np.empty((len(nxt),len(row)))
        for i,(w,tv,d) in enumerate(nxt):
            for j,(v,tj,dj) in enumerate(row):
                cost[i,j]=(abs(tv-tj)/(1+abs(tv)+abs(tj))+.15*abs(w-v)/(1+abs(w)+abs(v))) if d==dj else 1e12
        ii,jj=linear_sum_assignment(cost)
        assert list(ii)==list(range(len(nxt)))
        tracked.append([row[j] for j in jj])
    tracked.reverse()
    tracked.append([(complex(terminals[ell]),0j,last[j][2]) for j,ell in enumerate(labels)])
    data={'core':k,'frames':frames,'labels':labels,'orders':[x[2] for x in last],
          'w':[[[float(w.real),float(w.imag)] for w,_,_ in row] for row in tracked],
          't':[[[float(tv.real),float(tv.imag)] for _,tv,_ in row] for row in tracked],
          'validation':{'max_pencil_residual':max(x['pencil_residual'] for x in validation),
                        'max_orbit_closure_error':max(x['orbit_closure_error'] for x in validation),
                        'minimum_rounded_t_separation':min(x['min_t_separation'] for x in validation),
                        'arithmetic_bits':max(x['bits'] for x in validation),
                        'distinct_t_roots_isolated_before_double_rounding':True,
                        'isolated_t_root_count_verified_every_frame':True}}
    assert data['validation']['max_pencil_residual']<1e-10,data['validation']
    cache.write_text(json.dumps(data,separators=(',',':')))
    return data


def genus_data(g,cores,frames):
    n=2*g+1;branches=[]
    for k in range(1,g+1):
        s=g-k;core=cores[k]
        for j,ell in enumerate(core['labels']):
            branches.append({'core':k,'cluster':s+ell,'multiplicity':math.comb(n,s),
                             'primitiveOrder':core['orders'][j],
                             'points':[[(-1)**s*x for x in row[j]] for row in core['w']]})
    clusters=[{'k':j,'value':4*(-1)**j*(2*g-1-2*j),'multiplicity':sum(math.comb(n,s)*(j-s+1) for s in range(j+1))} for j in range(g)]
    assert sum(x['multiplicity'] for x in branches)==g*4**(g-1)
    return {'g':g,'n':n,'N':g*4**(g-1),'frames':frames,'branches':branches,'clusters':clusters,
            'validation':{'method':'Exact normalized elliptic division polynomials; Arb root isolation; actual primitive orbit potential; original determinantal pencil residuals',
                          'minimumRho':frames[0],'rhoZero':'singular limit; not a finite spectrum',
                          'terminalFrame':'exact algebraic specialization',
                          'maxPencilResidual':max(c['validation']['max_pencil_residual'] for c in cores.values() if c['core']<=g),
                          'arithmeticBits':max(c['validation']['arithmetic_bits'] for c in cores.values() if c['core']<=g),
                          'rootCountVerifiedEveryFrame':True}}


if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--max-g',type=int,default=10);ap.add_argument('--output',type=Path,default=Path(__file__).resolve().parent/'data');args=ap.parse_args()
    args.output.mkdir(parents=True,exist_ok=True);frames=grid();cores={}
    for k in range(1,args.max_g+1):
        start=time.time();cores[k]=track_core(k,frames,args.output)
        if k>=2:
            data=genus_data(k,cores,frames);(args.output/f'g{k}.json').write_text(json.dumps(data,separators=(',',':')))
            print(f'WROTE g{k}.json in {time.time()-start:.1f}s',flush=True)
