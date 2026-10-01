"""Check terminal color transport by independently isolated midpoint roots."""
import json,sys,time
from pathlib import Path
from fractions import Fraction
import numpy as np
from scipy.optimize import linear_sum_assignment
from sage.all import QQ
from generate_spectrum import core_values

base=Path(__file__).resolve().parent/'data'


def assignment(a,b):
    cost=np.empty((len(a),len(b)))
    for i,(w,tv,d) in enumerate(a):
        for j,(v,tj,dj) in enumerate(b):
            cost[i,j]=(abs(tv-tj)/(1+abs(tv)+abs(tj))+.15*abs(w-v)/(1+abs(w)+abs(v))) if d==dj else 1e12
    ii,jj=linear_sum_assignment(cost)
    return jj


def getrow(data,index):
    return [(complex(*w),complex(*tv),d) for w,tv,d in zip(data['w'][index],data['t'][index],data['orders'])]


def check(k):
    start=time.time();data=json.loads((base/f'core{k}.json').read_text())
    labels=data['labels'];frames=data['frames'];changed=[];samecolor=0
    max_residual=0.;maxjump=0.;conjugate_errors=0
    for i in range(len(frames)-2):
        a=getrow(data,i);b=getrow(data,i+1)
        r=(frames[i]+frames[i+1])/2
        mid,stat=core_values(k,QQ(str(Fraction(str(r)))))
        max_residual=max(max_residual,stat['pencil_residual'])
        p=assignment(a,mid);q=assignment(mid,b);composed=q[p]
        wrong=[j for j,x in enumerate(composed) if labels[j]!=labels[x]]
        samecolor+=sum(j!=x for j,x in enumerate(composed))
        if wrong:changed.append({'interval':i,'rho':[frames[i],frames[i+1]],'branches':wrong,'permutation':[int(x) for x in composed]})
        for j,(w,tv,_) in enumerate(a):
            dist=[abs(w.conjugate()-v)/(1+abs(w)+abs(v))+abs(tv.conjugate()-tj)/(1+abs(tv)+abs(tj)) for v,tj,_ in a]
            # Rounding may make several roots coincide, so accept any equally
            # close conjugate of the same terminal color.
            candidates=[z for z,x in enumerate(dist) if x<min(dist)+1e-12]
            if not any(labels[z]==labels[j] for z in candidates):conjugate_errors+=1
        maxjump=max(maxjump,max(abs(w-v)/(1+abs(w)+abs(v)) for (w,_,_),(v,_,_) in zip(a,b)))
    report={'core':k,'intervals_checked':len(frames)-2,'cross_color_midpoint_mismatches':changed,
            'within_color_permutations':int(samecolor),'conjugate_color_errors':int(conjugate_errors),
            'max_midpoint_pencil_residual':max_residual,'max_normalized_value_step':maxjump,'seconds':time.time()-start}
    (base/f'tracking{k}.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report),flush=True)


if __name__=='__main__':
    for k in range(1,int(sys.argv[1] if len(sys.argv)>1 else 10)+1):
        if not (base/f'core{k}.json').exists():break
        if (base/f'tracking{k}.json').exists():continue
        check(k)
