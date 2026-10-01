"""Determinantal core spectra; all coefficients derive from manuscript S_k.

No inferred coefficient or Newton pattern is used.  Coefficient arithmetic
uses extended precision and exact rational inversion of the leading forms.
"""
from functools import lru_cache
import math
import numpy as np
import sympy as sp
from scipy.linalg import eig

DT = np.longdouble


def pencil(k, rho, leading=False):
    """Entries (constant, W coefficient, T coefficient), w=4k W,t=T."""
    r = DT(rho)
    rows = list(range((k+1) % 2, 2*k, 2))
    cols = list(range((k+1) % 2, 2*k+2, 2))
    pos = {a:i for i,a in enumerate(cols)}
    S = np.zeros((k,k+1,3), dtype=DT)
    for i,a in enumerate(rows):
        e=(k-1-a)//2
        S[i,pos[a],1] += 4*k
        S[i,pos[a],2] -= 2*a+1
        S[i,pos[a+2],1] -= 4*k
        S[i,pos[a+2],2] += 2*a-4*k+1
        if not leading:
            for b,c in ((2*k-2-a,4*r**e*(-2*k+1+a)),
                        (2*k-a,4*r**e*(k-a-1+(k-a)*r)),
                        (2*k+2-a,4*a*r**(e+1))):
                if b in pos: S[i,pos[b],0] += c
    return S


def minors(k, rho, leading=False):
    """All maximal minors, via subset determinant DP and linear shifts."""
    S=pencil(k,rho,leading)
    z=np.zeros((k+1,k+1),dtype=DT);z[0,0]=1
    dp={0:z}
    for i in range(k):
        nxt={}
        for mask,f in dp.items():
            for j in range(k+1):
                if mask>>j&1:continue
                c,a,b=S[i,j]
                if c==0 and a==0 and b==0:continue
                sign=-1 if (mask>>(j+1)).bit_count()%2 else 1
                target=mask|(1<<j)
                if target not in nxt:nxt[target]=np.zeros_like(z)
                g=nxt[target]
                if c:g += (sign*c)*f
                if a:g[1:,:] += (sign*a)*f[:-1,:]
                if b:g[:,1:] += (sign*b)*f[:,:-1]
        dp=nxt
    full=(1<<(k+1))-1
    return np.array([dp.get(full^(1<<j),np.zeros_like(z)) for j in range(k+1)])


@lru_cache(None)
def leading_inverse(k):
    # Leading minors are products of the bidiagonal entries; obtain their
    # integer coefficient matrix exactly rather than round a float inverse.
    W,T=sp.symbols('W T');a0=(k+1)%2
    ds=[4*k*W-(2*a0+4*i+1)*T for i in range(k)]
    es=[-4*k*W+(2*a0+4*i+1-4*k)*T for i in range(k)]
    fs=[sp.Poly(sp.prod(ds[:j])*sp.prod(es[j:]),W,T) for j in range(k+1)]
    L=sp.Matrix([[f.coeff_monomial(W**a*T**(k-a)) for a in range(k+1)] for f in fs])
    return np.array([[DT(str(x.evalf(30))) for x in row] for row in L.inv().tolist()],dtype=DT)


def multiplication(k,rho):
    """Matrices of multiplication by w and t in degree < k basis."""
    basis=[(a,total-a) for total in range(k) for a in range(total+1)]
    pos={e:i for i,e in enumerate(basis)}
    fs=minors(k,rho)
    lower=np.array([[f[a,b] for a,b in basis] for f in fs],dtype=DT)
    red=-leading_inverse(k)@lower
    N=len(basis)
    MW=np.zeros((N,N),dtype=DT);MT=np.zeros_like(MW)
    for j,(a,b) in enumerate(basis):
        for M,aa,bb in ((MW,a+1,b),(MT,a,b+1)):
            if aa+bb<k:M[pos[aa,bb],j]=1
            else:M[:,j]=red[aa]
    return np.asarray(MW*DT(4*k),dtype=float),np.asarray(MT,dtype=float)


def spectrum(k,rho):
    MW,MT=multiplication(k,rho)
    # t separates the geometric core points more effectively near the
    # terminal fiber; compute w in the corresponding common eigenbasis.
    ts,vec=eig(MT)
    transformed=np.linalg.solve(vec,MW@vec)
    ws=np.diag(transformed)
    off=transformed-np.diag(ws)
    scale=max(1.0,float(np.linalg.norm(MW)))
    return ws,ts,{'commutator':float(np.linalg.norm(MW@MT-MT@MW)/(1+np.linalg.norm(MW)*np.linalg.norm(MT))),
                  'common_eigenbasis_residual':float(np.linalg.norm(off)/scale),
                  'eigenvector_condition':float(np.linalg.cond(vec))}


def terminal(k):
    return [(4*(-1)**ell*(2*k-1-2*ell),ell+1) for ell in range(k)]


def polish(k,rho,w,t,ell=None,tol=3e-14,maxiter=20):
    """Newton solve the original k+1 pencil equations, with normalized kernel."""
    P=np.asarray(pencil(k,rho),dtype=complex)
    C,A,B=P[:,:,0],P[:,:,1]/(4*k),P[:,:,2]
    if ell is None:
        _,_,vh=np.linalg.svd((C+w*A+t*B).T)
        ell=vh[-1].conj()
    else:ell=np.array(ell,dtype=complex)
    for iteration in range(maxiter):
        pivot=int(np.argmax(abs(ell)));ell=ell/ell[pivot]
        free=[i for i in range(k) if i!=pivot]
        S=C+w*A+t*B
        residual=S.T@ell
        eqscale=np.maximum(1,np.max(abs(S),axis=0))
        error=float(max(abs(residual)/eqscale)/(1+np.linalg.norm(ell)))
        if error<tol:return complex(w),complex(t),ell,error,iteration
        ws=max(1,abs(w));ts=max(1,abs(t))
        J=np.column_stack([S.T[:,free],ws*(A.T@ell),ts*(B.T@ell)])
        try:delta=np.linalg.solve(J/eqscale[:,None],-residual/eqscale)
        except np.linalg.LinAlgError:break
        ell[free]+=delta[:k-1];w+=ws*delta[-2];t+=ts*delta[-1]
    return complex(w),complex(t),ell,error,iteration


if __name__=='__main__':
    import time,json
    for k in range(1,11):
        for r in (0.0001,0.1,0.5,0.9,0.99,0.999):
            start=time.time();ws,ts,d=spectrum(k,r)
            expected=2*k+1+(-1)**(k+1)*r**((-1)**(k+1)*math.ceil(k/2))
            d.update(k=k,rho=r,seconds=time.time()-start,trace_relative_error=float(abs(sum(ws)-expected)/(1+abs(expected))),max_w=float(max(abs(ws))))
            print(json.dumps(d),flush=True)
