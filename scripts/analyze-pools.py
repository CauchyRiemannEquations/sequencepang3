"""Compare five-card pools by exact remainder cover, ignoring tableau accessibility.
Run: python3 scripts/analyze-pools.py
Reverse orders and physically identical copies count as the same sequence.
"""
from collections import Counter
from functools import lru_cache
import json

def analyze(pool):
    values=sorted(pool)
    patterns=set()
    for start in values:
        for difference in range(1,max(values)//4+1):
            run=tuple(start+difference*i for i in range(5))
            if all(v in pool for v in run): patterns.add(run)
        for ratio in (2,3):
            run=tuple(start*ratio**i for i in range(5))
            if all(v in pool for v in run): patterns.add(run)
    patterns=sorted(patterns)
    vectors=[tuple(Counter(p)[v] for v in values) for p in patterns]
    initial=tuple(pool[v] for v in values)
    @lru_cache(None)
    def solve(counts):
        if not any(counts): return ()
        usable=[i for i,p in enumerate(vectors) if all(n<=c for n,c in zip(p,counts))]
        options=[tuple(i for i in usable if vectors[i][j]) for j,c in enumerate(counts) if c]
        pivot=min(options,key=len)
        for i in pivot:
            rest=tuple(c-n for c,n in zip(counts,vectors[i]))
            suffix=solve(rest)
            if suffix is not None:return (i,)+suffix
        return None
    witness=solve(initial)
    safe=[p for i,p in enumerate(patterns) if solve(tuple(c-n for c,n in zip(initial,vectors[i]))) is not None]
    degree={v:sum(v in p for p in patterns) for v in values}
    return {'cards':sum(pool.values()),'counts':dict(sorted(pool.items())),'patterns':len(patterns),'geometric_patterns':sum(p[1]/p[0]==p[2]/p[1] for p in patterns),'safe_first_patterns':len(safe),'forced_numbers':[v for v,n in degree.items() if n==1],'minimum_number_options':min(degree.values()),'partition':None if witness is None else [patterns[i] for i in witness]}

candidates={
    'selected_1_to_16':Counter(n for p in [[11,12,13,14,15],[1,3,5,7,9],[2,3,4,5,6],[4,6,8,10,12],[12,13,14,15,16],[7,8,9,10,11],[1,2,4,8,16],[1,2,4,8,16]] for n in p),
    'compact_1_to_10_x4':Counter({i:4 for i in range(1,11)}),
    'balanced_1_to_16':Counter({i:2 for i in range(1,17)})+Counter([1,2,4,5,8,10,12,16]),
    'low_heavy_1_to_16':Counter({i:3 for i in range(1,13)})+Counter([13,14,15,16]),
    'mixed_large_numbers':Counter(n for p in [[1,3,5,7,9],[2,4,6,8,10],[3,6,9,12,15],[4,8,12,16,20],[1,2,4,8,16],[2,4,8,16,32],[1,4,7,10,13],[2,5,8,11,14]] for n in p),
}
def search(seed=20260923, samples=1000):
    import random
    rng=random.Random(seed)
    aps=[tuple(a+i*d for i in range(5)) for d in range(1,4) for a in range(1,17-4*d)]
    best=None
    tested=0
    for _ in range(samples):
        groups=rng.sample(aps,6)+[(1,2,4,8,16)]*2
        pool=Counter(n for p in groups for n in p)
        if len(pool)<16 or max(pool.values())>4:continue
        tested+=1
        info=analyze(pool)
        score=(info['safe_first_patterns'],-sum((n-2.5)**2 for n in pool.values()))
        if best is None or score>best[0]:best=(score,groups,info)
    return {'seed':seed,'samples':samples,'candidates_meeting_constraints':tested,'best':best}

if __name__=='__main__':
    import sys
    if '--search' in sys.argv:
        print(json.dumps(search(),ensure_ascii=False,indent=2))
        sys.exit(0)
    print(json.dumps({name:analyze(pool) for name,pool in candidates.items()},ensure_ascii=False,indent=2))
