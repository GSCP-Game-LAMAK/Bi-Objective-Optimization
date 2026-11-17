"""Reproducible exact MILP for the workbook-backed, 30-choice core.

Sources: extracted updated workbook (9 calculation sheets). Dashboard and Schedule
are excluded. The baseline scope includes the team choices EXCEPT stock policies,
plus 33/66/100 tiers for all four suppliers and packaging. Stock estimates have
no measured carbon/OTIF and are excluded from the certified core.

Packaging may ramp progressively; 55 nonzero monotone 5-year trajectories are
explicit candidate columns. Token increments and a single setup charge are
accounted in their actual implementation year. Other sourcing tiers are one-time.
"""
from __future__ import annotations
import csv
import itertools
import json
from pathlib import Path

import numpy as np
from scipy.optimize import Bounds, LinearConstraint, milp

ROOT = Path(__file__).resolve().parents[1]
D = json.loads((ROOT / 'data' / 'workbook_model.json').read_text(encoding='utf-8'))
A = {a['id']:a for a in D['actions']}
TOKEN_CAP = 10
ANNUAL_CAP = 3
YEARS = 5
# Financial decision limit: -€8.384875m, chosen from the high-abatement/high-cost region.
# This is a decision preference, not a confidence interval or professor requirement.
BOUNDED_EBIT_FLOOR = -8_384_875.34

team = D['metadata']['team25']
core_ids = set(team['Distribution'] + team['Transportation'] + team['Energy'])
core_ids |= {f'{group}{k}' for group in ('Alpha','Beta','Gamma','Lactose') for k in (1,2,3)}
core_ids |= {'Pack1','Pack2','Pack3'}
assert len(core_ids)==30, (len(core_ids),core_ids)
assert core_ids <= A.keys()
assert D['metadata']['sourceExcludedSheets'][:2] == ['Dashboard','Schedule']

columns = []
def make_col(name, family, tokens, save, ebit, capex, setup, cash, picks, dc='any'):
    v = dict(name=name, family=family, tokens=np.asarray(tokens, dtype=float),
             annualSaved=np.asarray(save,dtype=float), annualEbit=np.asarray(ebit,dtype=float),
             annualCapex=np.asarray(capex,dtype=float), annualSetup=np.asarray(setup,dtype=float),
             annualCash=np.asarray(cash,dtype=float), picks=picks, dc=dc)
    assert max(v['tokens'])<=3 and all(z>=0 for z in v['tokens'])
    columns.append(v)

for id in sorted(core_ids-{'Pack1','Pack2','Pack3'}):
    a=A[id]
    years=[0] if a['group']=='dc' else list(range(YEARS))
    for y in years:
        tokens=np.zeros(YEARS);tokens[y]=a['tokens']
        saved=np.zeros(YEARS);saved[y:]=a['co2'] or 0
        ebit=np.zeros(YEARS);ebit[y:]=-a['opex']-a['dep'];ebit[y]-=a['setup']
        capex=np.zeros(YEARS);capex[y]=a['capex']
        setup=np.zeros(YEARS);setup[y]=a['setup']
        cash=np.zeros(YEARS);cash[y:]=-a['opex'];cash[y]-=a['capex']+a['setup']
        make_col(f'{id}@Y{y}',a['group'],tokens,saved,ebit,capex,setup,cash,
                 [{'id':id,'y':y,'tokens':a['tokens'],'fromTier':0,'toTier':a.get('tokens')}],a['dc'])

PACK={k:A[f'Pack{k}'] for k in (1,2,3)}
assert len({p['setup'] for p in PACK.values()})==1
# All monotone year-by-year cumulative token tiers, excluding zero adoption.
for lev in itertools.combinations_with_replacement((0,1,2,3),YEARS):
    if not max(lev):continue
    saved=np.zeros(YEARS);ebit=np.zeros(YEARS);cash=np.zeros(YEARS)
    capex=np.zeros(YEARS);setup=np.zeros(YEARS);tokens=np.zeros(YEARS)
    picks=[];previous=0
    for y,tier in enumerate(lev):
        if tier>previous:
            tokens[y]=tier-previous
            if previous==0:
                setup[y]=PACK[1]['setup'];ebit[y]-=PACK[1]['setup'];cash[y]-=PACK[1]['setup']
            picks.append({'id':f'Pack{tier}','y':y,'tokens':int(tier-previous),'fromTier':previous,'toTier':tier})
        if tier:
            saved[y]=PACK[tier]['co2'];ebit[y]-=PACK[tier]['opex']+PACK[tier]['dep'];cash[y]-=PACK[tier]['opex']
        previous=tier
    make_col('PackRamp-'+''.join(str(x) for x in lev),'pack',tokens,saved,ebit,capex,setup,cash,picks)

N=len(columns)
C=np.array([c['annualSaved'].sum() for c in columns])
E=np.array([c['annualEbit'].sum() for c in columns])
T=np.array([c['tokens'].sum() for c in columns])
rows=[];upper=[];names=[]
def addrow(v, ub,name):
    rows.append(np.asarray(v,dtype=float));upper.append(float(ub));names.append(name)
addrow(T, TOKEN_CAP, 'total_tokens')
for t in range(YEARS): addrow([c['tokens'][t] for c in columns], ANNUAL_CAP,f'year_{t}_tokens')
for group in sorted({c['family'] for c in columns}):
    addrow([int(c['family']==group) for c in columns],1,f'exclusive_{group}')
# The 30-choice core has transport estimates specifically for Verona.
dcs=[i for i,c in enumerate(columns) if c['family']=='dc']
for id in sorted(team['Transportation']):
    addrow([int(i in dcs or c['name'].startswith(id+'@')) for i,c in enumerate(columns)],1,'dc_incompatible_'+id)
cons=LinearConstraint(np.asarray(rows),-np.inf,np.asarray(upper))
box=Bounds(np.zeros(N),np.ones(N));integrality=np.ones(N,dtype=np.int8)

solve_count=0
def solve(vector,lowerE=None,lowerC=None,abort=True):
    global solve_count
    restrictions=[cons]
    if lowerE is not None: restrictions.append(LinearConstraint(E[np.newaxis,:],float(lowerE),np.inf))
    if lowerC is not None: restrictions.append(LinearConstraint(C[np.newaxis,:],float(lowerC),np.inf))
    res=milp(-np.asarray(vector),integrality=integrality,bounds=box,constraints=restrictions,
             options={'time_limit':60,'mip_rel_gap':1e-9})
    solve_count+=1
    if res.status==2:return None
    if res.status!=0 or res.x is None:
        if abort:raise RuntimeError(f'Exact MILP did not prove optimality (status {res.status}, {res.message})')
        return None
    picked=np.rint(res.x).astype(int)
    assert np.max(np.asarray(rows)@picked-np.asarray(upper))<1e-6
    return picked

def schedule(selection):
    chosen=[c for i,c in enumerate(columns) if selection[i]]
    v=lambda key:np.sum([c[key] for c in chosen],axis=0) if chosen else np.zeros(YEARS)
    yt=v('tokens'); annualSaved=v('annualSaved'); annualEbit=v('annualEbit')
    annualCapex=v('annualCapex'); annualSetup=v('annualSetup');annualCash=v('annualCash')
    picks=sorted([p for c in chosen for p in c['picks']],key=lambda p:(p['y'],p['id']))
    solution=dict(picks=picks,yt=yt.astype(int).tolist(),tokens=int(sum(yt)),
       annualSaved=annualSaved.tolist(),annualEbit=annualEbit.tolist(),
       annualCapex=annualCapex.tolist(),annualSetup=annualSetup.tolist(),
       annualCash=annualCash.tolist(),saved=float(sum(annualSaved)),ebit=float(sum(annualEbit)),
       capex=float(sum(annualCapex)),setup=float(sum(annualSetup)),cash=float(sum(annualCash)),
       dc=next((c['dc'] for c in chosen if c['family']=='dc'),'Verona'),
       unknownCarbon=0,unknownOTIF=sum(1 for p in picks if A[p['id']]['risk']=='unknown'))
    assert solution['tokens']<=10 and max(solution['yt'])<=3
    assert sum(1 for p in picks if A[p['id']]['group']=='energy')<=1
    assert sum(1 for p in picks if A[p['id']]['group']=='pack' and p['fromTier']==0)<=1
    return solution

eOpt=solve(E);cOpt=solve(C)
maxE=float(E@eOpt);maxC=float(C@cOpt)
# Lexicographic tie-breaking gives unambiguous attainable payoff-table anchors.
eLex=solve(C,lowerE=maxE-0.00001)
cLex=solve(E,lowerC=maxC-0.0000001)
Ebest=schedule(eLex);Cbest=schedule(cLex)
assert abs(Ebest['ebit']-maxE)<1e-4 and abs(Cbest['saved']-maxC)<1e-5
Clo=Ebest['saved'];Chi=Cbest['saved'];Elo=Cbest['ebit'];Ehi=Ebest['ebit']
assert Chi>Clo and Ehi>Elo

def score(s,w):
    c=(s['saved']-Clo)/(Chi-Clo)
    e=(s['ebit']-Elo)/(Ehi-Elo)
    return w*c+(1-w)*e

# Re-solve payoff endpoints within the economically admissible feasible region.
# Both the carbon value and its associated EBIT MUST change together.
boundCChoice=solve(C,lowerE=BOUNDED_EBIT_FLOOR)
if boundCChoice is None:raise RuntimeError('Financially bounded reference is infeasible')
boundCarbonMax=float(C@boundCChoice)
boundCLex=solve(E,lowerE=BOUNDED_EBIT_FLOOR,lowerC=boundCarbonMax-0.000001)
boundCbest=schedule(boundCLex)
assert abs(boundCbest['saved']-boundCarbonMax)<1e-5
assert boundCbest['ebit']>=BOUNDED_EBIT_FLOOR-1e-3
boundedAnchors={'carbonLow':Clo,'carbonHigh':boundCarbonMax,'ebitLow':boundCbest['ebit'],'ebitHigh':Ehi}
rawAnchors={'carbonLow':Clo,'carbonHigh':Chi,'ebitLow':Elo,'ebitHigh':Ehi}
# The bound is part of the feasible set, not a replaced anchor alone.
assert boundCarbonMax<Chi
assert boundCbest['ebit']>Elo

def norm_score(s, anchors, w):
    return w*(s['saved']-anchors['carbonLow'])/(anchors['carbonHigh']-anchors['carbonLow']) + (1-w)*(s['ebit']-anchors['ebitLow'])/(anchors['ebitHigh']-anchors['ebitLow'])

def optimize_mode(anchors, fundamental_floor, weight_values):
    mode_guards={}
    candidate=[]
    for guard, extra in [('none',None),('loss1m',-1000000.),('nonnegative',0.)]:
        floor=fundamental_floor if extra is None else max(fundamental_floor, extra) if fundamental_floor is not None else extra
        by={}
        for w in weight_values:
            vec=w*C/(anchors['carbonHigh']-anchors['carbonLow'])+(1-w)*E/(anchors['ebitHigh']-anchors['ebitLow'])
            x=solve(vec,lowerE=floor)
            if x is None: raise RuntimeError(f'Infeasible mode/guard: {floor} {guard} {w}')
            s=schedule(x);s['score']=norm_score(s,anchors,w)
            by[f'{w:.2f}']=s
            if guard=='none':candidate.append(s)
        mode_guards[guard]={'minimumFiveYearEBIT':floor,'weighted':by}
    return mode_guards,candidate

# Original unbounded payoff data are kept as an explicit comparison mode.
# Default bounded mode recomputes every weight exactly under the new floor.
mode_weights=np.linspace(0,1,21)
boundedGuards,boundedChoices=optimize_mode(boundedAnchors,BOUNDED_EBIT_FLOOR,mode_weights)
unrestrictedGuards,unrestrictedChoices=optimize_mode(rawAnchors,None,mode_weights)

# For a readable plot, augment both modes with exact epsilon-bound sweeps;
# the frontier is sampled, not necessarily the entire integer Pareto set.
def sample_epsilon(anchors, fundamental_floor, choices):
    all_states=choices[:]
    for eps in np.linspace(anchors['ebitLow'],anchors['ebitHigh'],25):
        floor=eps if fundamental_floor is None else max(eps,fundamental_floor)
        x=solve(C,lowerE=floor-0.00005)
        if x is not None:
            s=schedule(x)
            if fundamental_floor is None or s['ebit']>=fundamental_floor-1e-4:
                all_states.append(s)
    return all_states

boundedChoices=sample_epsilon(boundedAnchors,BOUNDED_EBIT_FLOOR,boundedChoices)
unrestrictedChoices=sample_epsilon(rawAnchors,None,unrestrictedChoices)

def prune(states,anchors):
    keys={tuple((p['id'],p['y'],p.get('fromTier',0),p.get('toTier')) for p in s['picks']):s for s in states}
    ordered=sorted(keys.values(),key=lambda s:(-s['saved'],-s['ebit']))
    best=-float('inf');out=[]
    for s in ordered:
        if s['ebit']>best+1e-5:
            out.append(s);best=s['ebit']
    for s in out:s['score50']=norm_score(s,anchors,.5)
    return out

boundedFrontier=prune(boundedChoices+[boundCbest,Ebest],boundedAnchors)
unrestrictedFrontier=prune(unrestrictedChoices+[Cbest,Ebest],rawAnchors)

# Legacy unbounded code stays below to preserve the independent validation
# fields until output generation is converted to the v6 structure.
guards={}
weighted=[]
for guard,lower in [('none',None),('loss1m',-1000000.),('nonnegative',0.)]:
    byWeight={}
    for w in np.linspace(0,1,21):
        v=w*C/(Chi-Clo)+(1-w)*E/(Ehi-Elo)
        sol=solve(v,lowerE=lower)
        if sol is None:raise RuntimeError('Guard has no feasible portfolio')
        plan=schedule(sol)
        plan['score']=score(plan,float(w))
        byWeight[f'{w:.2f}']=plan
        if guard=='none':weighted.append(plan)
    guards[guard]={'minimumFiveYearEBIT':lower, 'weighted':byWeight}
balanced=guards['none']['weighted']['0.50']

# Epsilon-bound sweep produces an independently exact lower envelope sample.
for eps in np.linspace(Elo,Ehi,16):
    sol=solve(C,lowerE=eps-0.0001)
    if sol is not None:weighted.append(schedule(sol))
weighted.extend([Ebest,Cbest])
unique={tuple((p['id'],p['y'],p.get('fromTier',0),p.get('toTier')) for p in s['picks']):s for s in weighted}
ordered=sorted(unique.values(),key=lambda s:(-s['saved'],-s['ebit']))
non=[];bestE=-float('inf')
for s in ordered:
    if s['ebit']>bestE+1e-5:
        non.append(s);bestE=s['ebit']
for s in non:s['score50']=score(s,.5)
for s in (Ebest,Cbest,balanced):s['score50']=score(s,.5)

teammatePicks=[('PVLargeB',0),('Lactose3',1),('Pack3',2),('Verona::SouthHVO',3)]
teammateCols=[i for i,c in enumerate(columns) if len(c['picks'])==1 and (c['picks'][0]['id'],c['picks'][0]['y']) in teammatePicks]
teammateSolution=np.zeros(N,dtype=int);teammateSolution[teammateCols]=1
assert len(teammateCols)==4
assert np.max(np.asarray(rows)@teammateSolution-np.asarray(upper))<1e-6
teammate=schedule(teammateSolution);teammate['score50']=score(teammate,.5)

result={'method':'Core 30-action MILP; packaging progressive monotone 33/66/100 tiers with incremental token charges',
 'solver':'SciPy/HiGHS exact MILP',
 'source':'Updated workbook 9 sheets (excluding Dashboard, Schedule, Audit, Sensitivity)',
 'status':'optimal weighted 50/50; other reported solutions are MILP-optimal at sampled weights / epsilon bounds; full Pareto frontier not fully enumerated',
 'stock':'Excluded from certified core because carrying-cost EBIT and carbon/OTIF effects are unverified',
 'coreActionCount':len(core_ids),'packPatternCount':len([c for c in columns if c['family']=='pack']),
 'binaryColumns':N,'solves':solve_count,
 'anchors':{'carbonLow':Clo,'carbonHigh':Chi,'ebitLow':Elo,'ebitHigh':Ehi,
            'explanation':'Payoff table: CO2 of lexicographic EBIT-max optimum, CO2 maximum; EBIT at carbon-max optimum, EBIT maximum'},
 'ebitExtreme':Ebest,'carbonExtreme':Cbest,'balanced':balanced,
 'guards':guards,'teammate':teammate,'solutions':non,
 'defaultMode':'bounded','boundedEbitFloor':BOUNDED_EBIT_FLOOR,
 'modes':{'bounded':{'label':'Financially bounded','anchors':boundedAnchors,'carbonExtreme':boundCbest,
   'financialFloor':BOUNDED_EBIT_FLOOR,'guards':boundedGuards,'solutions':boundedFrontier},
   'unrestricted':{'label':'Unrestricted (academic reference)','anchors':rawAnchors,'carbonExtreme':Cbest,
   'financialFloor':None,'guards':unrestrictedGuards,'solutions':unrestrictedFrontier}}}
(ROOT/'data'/'exact_v6.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
(ROOT/'data'/'exact_v6.js').write_text('window.LAMAK_EXACT_V6 = '+json.dumps(result,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
with (ROOT/'data'/'exact_v6_frontier.csv').open('w',newline='',encoding='utf-8') as f:
    wr=csv.writer(f);wr.writerow(['rank','co2_saved_5y_t','delta_ebit_5y_eur','score50','tokens','annual_tokens','selected_actions'])
    for i,s in enumerate(sorted(boundedFrontier,key=lambda x:-x['score50']),1):
        wr.writerow([i,round(s['saved'],5),round(s['ebit'],2),round(s['score50'],7),s['tokens'],
                     '|'.join(map(str,s['yt'])),' | '.join(f"{p['id']}@Y{p['y']}[{p['tokens']}tok]" for p in s['picks'])])
print(f'v5 core options={len(core_ids)}, columns={N}, progressive packaging schedules={result["packPatternCount"]}, exact solves={solve_count}')
print('Pure EBIT:',round(maxE,2),'CO2',round(Clo,2),'picks',[(p['id'],p['y']) for p in Ebest['picks']])
print('Pure carbon:',round(maxC,2),'EBIT',round(Elo,2),'picks',[(p['id'],p['y']) for p in Cbest['picks']])
print('50/50 exact:',round(balanced['saved'],4),'t; EBIT',round(balanced['ebit'],2),'Score',round(balanced['score50'],5),'picks',[(p['id'],p['y'],p['tokens']) for p in balanced['picks']])
print('Teammate:',round(teammate['saved'],4),'t; EBIT',round(teammate['ebit'],2),'Score',round(teammate['score50'],5))

print('Bounded core: ceiling-on-loss floor €',BOUNDED_EBIT_FLOOR,
      'carbon anchor',boundCarbonMax,'associated EBIT',boundCbest['ebit'])
print('Bounded 50/50:',boundedGuards['none']['weighted']['0.50']['saved'],
      boundedGuards['none']['weighted']['0.50']['ebit'],
      boundedGuards['none']['weighted']['0.50']['score'])
