"""Certified MILP solves at selected epsilon levels, for the unedited team 25-option workbook baseline.
SciPy/HiGHS. This is a sampled Pareto set, not a full enumeration of the integer frontier.
Dashboard and Schedule sheets are not imported or referenced.
"""
import json, pathlib, math, csv
from scipy.optimize import milp, Bounds, LinearConstraint
from scipy.sparse import lil_matrix, vstack, csr_matrix
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[1]
D=json.loads((ROOT/'data'/'workbook_model.json').read_text(encoding='utf-8'))
A={a['id']:a for a in D['actions'] if a['team']}
assert len(A)==25
cand=[]
for id,a in A.items():
    for year in ([0] if a['group']=='dc' else range(5)):
        cand.append((id,year))
n=len(cand)
T=np.array([A[id]['tokens'] for id,y in cand],dtype=float)
R=np.array([(A[id]['co2'] or 0)*(5-y) for id,y in cand],dtype=float)
EB=np.array([(-A[id]['opex']-A[id]['dep'])*(5-y)-A[id]['setup'] for id,y in cand],dtype=float)
rows=[];bounds=[]
def row(indices,limit):
    v=np.zeros(n,dtype=float);v[indices]=1;rows.append(v);bounds.append(limit)
# total tokens and per-year tokens
rows.append(T.copy());bounds.append(10.)
for year in range(5):rows.append(np.array([T[i] if y==year else 0 for i,(_,y) in enumerate(cand)]));bounds.append(3.)
# exactly one action per exclusive family, with no requirements for taking any family
for grp in sorted({a['group'] for a in A.values()}):
    row([i for i,(id,y) in enumerate(cand) if A[id]['group']==grp],1.)
# Relocation excludes the five Verona-specific transportation actions, each independent.
dcIds={id for id,a in A.items() if a['group']=='dc'}
for trId,tr in A.items():
    if tr['category']!='Transportation':continue
    row([i for i,(id,y) in enumerate(cand) if id in dcIds or id==trId],1.)
baseRows=np.array(rows);baseBounds=np.array(bounds)
con=LinearConstraint(baseRows,-np.inf,baseBounds)
bd=Bounds(np.zeros(n),np.ones(n));integrality=np.ones(n,dtype=np.int8)
def solve(obj,lowerEB=None):
    cons=[con]
    if lowerEB is not None:
        cons.append(LinearConstraint(EB[np.newaxis,:],lowerEB,np.inf))
    res=milp(-obj,integrality=integrality,bounds=bd,constraints=cons,options={'time_limit':15,'mip_rel_gap':1e-8})
    if res.x is None or res.status!=0:
        return None
    return np.rint(res.x).astype(int)
solE=solve(EB);solC=solve(R)
assert solE is not None and solC is not None
maxEB=float(EB@solE);minEB=float(EB@solC)
def schedule(sol):
    selected=[(A[id],year) for (id,year),v in zip(cand,sol) if v>=1]
    yt=[0]*5;annualSaved=[0.]*5;annualEbit=[0.]*5;annualCapex=[0.]*5;annualSetup=[0.]*5
    capex=setup=0.
    for a,y in selected:
        yt[y]+=a['tokens'];annualCapex[y]+=a['capex'];annualSetup[y]+=a['setup'];
        annualEbit[y]-=a['setup'];capex+=a['capex'];setup+=a['setup']
        for year in range(y,5):
            annualSaved[year]+=a['co2'] or 0
            annualEbit[year]-=a['opex']+a['dep']
    return {'picks':[{'id':a['id'],'y':y} for a,y in selected],
            'yt':yt,'tokens':sum(yt),'annualSaved':annualSaved,'annualEbit':annualEbit,
            'annualCapex':annualCapex,'annualSetup':annualSetup,
            'saved':sum(annualSaved),'ebit':sum(annualEbit),'capex':capex,'setup':setup,
            'cash':sum(-sum(a['opex'] for a,y in selected if y<=i) - annualCapex[i]-annualSetup[i] for i in range(5)),
            'dc':next((a['dc'] for a,y in selected if a['group']=='dc'),'Verona'),
            'unknownCarbon':sum(a['co2'] is None for a,y in selected),
            'unknownOTIF':sum(a['risk']=='unknown' for a,y in selected)}
solutions=[]
for eps in np.linspace(minEB,maxEB,25):
    sol=solve(R,eps-1e-3)
    if sol is not None:
        s=schedule(sol);solutions.append(s)
for sol in (solC,solE):solutions.append(schedule(sol))
unique={','.join(f"{p['id']}:{p['y']}" for p in s['picks']):s for s in solutions}
results=list(unique.values())
# Each MILP solve is certified optimal at its fixed epsilon bound; filtering nondominated for display.
results.sort(key=lambda a:(-a['saved'],-a['ebit']))
non=[];bestE=-float('inf')
for s in results:
    if s['ebit']>bestE+1e-4:
        non.append(s);bestE=s['ebit']
for s in non:
    assert s['tokens']<=10 and max(s['yt'])<=3
    assert len([x for x in s['picks'] if A[x['id']]['group']=='energy'])<=1
    assert not(any(A[x['id']]['group']=='dc' for x in s['picks']) and any(A[x['id']]['category']=='Transportation' for x in s['picks']))
result={'description':'Exact MILP optima at sampled epsilon (minimum EBIT) thresholds; incomplete discrete Pareto enumeration','solver':'SciPy/HiGHS milp', 'source':'workbook_model.json, team shortlist only','excludedSheets':['Dashboard','Schedule','Audit'], 'epsilonBounds':[minEB,maxEB], 'solves':27,'solutions':non}
out=ROOT/'data'/'exact_team_frontier.json';out.write_text(json.dumps(result,separators=(',',':')),encoding='utf-8')
(ROOT/'data'/'exact_team.js').write_text('window.LAMAK_EXACT = '+json.dumps(result,separators=(',',':'))+';\n',encoding='utf-8')
print('Exact MILP 25-option baseline:',len(non),'nondominated sampled epsilon strategies; max carbon',round(max(x['saved'] for x in non),2),'t/5y, max EBIT',round(max(x['ebit'] for x in non)))

with (ROOT/'data'/'exact_team_frontier.csv').open('w',encoding='utf-8',newline='') as fp:
    writer=csv.writer(fp)
    writer.writerow(['solution','five_year_CO2_saved_t','five_year_delta_EBIT_EUR','final_year_delta_EBIT_EUR','tokens','energy','selected_actions'])
    for rank,s in enumerate(non,1):
        energy=next((A[p['id']]['name'] for p in s['picks'] if A[p['id']]['category']=='Energy'),'No energy action')
        writer.writerow([rank,round(s['saved'],3),round(s['ebit'],2),round(s['annualEbit'][4],2),s['tokens'],energy,' | '.join(f"{p['id']}@Year{p['y']}" for p in s['picks'])])
