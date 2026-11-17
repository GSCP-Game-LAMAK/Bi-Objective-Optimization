"""Independent validation of LAMAK v6 (Excel -> NEW MILP formulation).

Reads workbook-extracted source SHEET rows, not v5 optimizer coefficients; does not
use Dashboard / Schedule / historical optimizer portfolios. Full direct-workbook
audit was separately run when freezing this source dataset.

Independent MILP encoding: individual (action,year) binaries + 15 cumulative
packaging-threshold binaries, INSTEAD of v5's 55 pre-enumerated trajectories.
Zero solver gap is required. Writes machine-readable audit and sensitivity CSV.
"""
from __future__ import annotations
import csv, hashlib, json, math
from pathlib import Path
from collections import Counter, defaultdict
import numpy as np
from scipy.optimize import milp, LinearConstraint, Bounds

ROOT=Path(__file__).resolve().parents[1]
wbpath=ROOT/'source'/'Eco_Chain_Reaction_Model_Updated.xlsx'
extract=json.loads((ROOT/'data'/'workbook_model.json').read_text(encoding='utf8'))
# These source tables were independently compared with ALL 516 workbook rows.
# Portable cross-check does not use the previous optimizer's action coefficients.
read=lambda sh,rng: extract['source'][sh]['rows']
wrows=read('Actions','A6:K521')
source={r[0]:dict(id=r[0],tokens=int(r[1]),co2=float(r[2]) if isinstance(r[2],(int,float)) else None,
                    opex=float(r[3]),capex=float(r[4] or 0),dep=float(r[5] or 0),setup=float(r[6] or 0),
                    source=f'Actions!A{i}:K{i}') for i,r in enumerate(wrows,6) if isinstance(r[0],str)}
assert len(source)==516,len(source)
reference=json.loads((ROOT/'data'/'exact_v6.json').read_text(encoding='utf8'))
assert hashlib.sha256(wbpath.read_bytes()).hexdigest()==extract['metadata']['sourceSha256']
for exclude in ['Dashboard','Schedule','Audit','Sensitivity']:
    assert exclude not in extract['metadata']['sourceIncludedSheets']
assert len(extract['metadata']['team25'])==5

# Independently reconcile ALL 516 cached values, including the stock rows.
fields=('tokens','co2','opex','capex','dep','setup')
all_diffs=[]
for a in extract['actions']:
    r=source[a['id']]
    for f in fields:
        x,y=a[f],r[f]
        if x is None or y is None:
            if x is not y:all_diffs.append((a['id'],f,x,y))
        elif not math.isclose(x,y,rel_tol=1e-11,abs_tol=1e-7):
            all_diffs.append((a['id'],f,x,y))
assert not all_diffs,all_diffs[:20]

# Independently reconcile numeric actions with the originating category sheets.
checks=[]
assum={r[0]:r[1] for r in read('Assumptions','A6:C22') if isinstance(r[0],str)}
assert assum['Days/year']==365
energy={r[0]:r for r in read('Energy','A6:X17') if isinstance(r[0],str)}
suppliers={r[0]:r for r in read('Suppliers','A6:S20') if isinstance(r[0],str)}
transport={r[0]:r for r in read('Transport','A6:N112') if isinstance(r[0],str)}
for id,r in energy.items():
    a=source[id]
    assert math.isclose(a['co2'],r[17],rel_tol=1e-10,abs_tol=1e-6)
    assert math.isclose(-a['opex']-a['dep'],r[19],rel_tol=1e-10,abs_tol=1e-4)
    if r[1]=='PV':
        carbon=(r[15]*assum['Grid EF']-r[11]*r[6])/1000
        op=-r[15]*assum['Grid electricity price']+r[9]*assum['Days/year']
        assert math.isclose(carbon,r[17],abs_tol=1e-6)
        assert math.isclose(op,a['opex'],abs_tol=1e-6)
    checks.append((id,'Energy',a['co2'],-a['opex']-a['dep']))
for id,r in suppliers.items():
    a=source[id]
    assert math.isclose(a['co2'],r[14],abs_tol=1e-6)
    assert math.isclose(a['opex'],r[13],abs_tol=1e-5)
    assert math.isclose(r[13],r[10]+r[11]-r[12],abs_tol=1e-5)
    assert math.isclose(a['setup'],r[15],abs_tol=1e-5)
    checks.append((id,'Suppliers',a['co2'],-a['opex']))
for id,r in transport.items():
    if id not in source:continue
    a=source[id]
    assert math.isclose(a['co2'],r[10],abs_tol=1e-6)
    assert math.isclose(a['opex'],r[11],abs_tol=1e-5)
    assert math.isclose(r[10],r[5]*(r[6]-r[8])/1000,abs_tol=1e-6)
    assert math.isclose(r[11],r[5]*(r[9]-r[7]),abs_tol=1e-5)
    checks.append((id,'Transport',a['co2'],-a['opex']))

team=extract['metadata']['team25']
nonpack_ids=team['Distribution']+team['Transportation']+team['Energy']
nonpack_ids += [f'{s}{t}' for s in ('Alpha','Beta','Gamma','Lactose') for t in (1,2,3)]
assert len(set(nonpack_ids))==27
assert len(set(nonpack_ids)|{'Pack1','Pack2','Pack3'})==30

# The two decision types are separate. x(a,t) for any non-pack action and
# b(t,k) for cumulative packaging tier threshold k achieved by end of year t.
# No shared solver logic or packaging trajectory enumeration from v5 is reused.
vars=[]
for id in nonpack_ids:
    yrs=(0,) if id.startswith('Relocate ') else range(5)
    for t in yrs:vars.append(('action',id,t))
for t in range(5):
    for k in range(1,4):vars.append(('pack',t,k))
N=len(vars);index={key:i for i,key in enumerate(vars)}
assert len(index)==N
pack=[source[f'Pack{k}'] for k in (1,2,3)]
def base_coefficients(which='baseline'):
    direct={id:dict(a) for id,a in source.items()}
    if which in ('solar80','combined'):
        for id,r in energy.items():
            if r[1]=='PV':
                used_now=float(r[15])*0.8
                direct[id]['co2']=(used_now*assum['Grid EF']-float(r[11])*float(r[6]))/1000
                direct[id]['opex']+=float(r[15])*0.2*assum['Grid electricity price']
    if which in ('suppliers20','combined'):
        for id,r in suppliers.items():
            if not id.startswith('Pack'):
                direct[id]['opex']+=0.20*float(r[10])
    if which in ('freight20','combined'):
        for id,r in transport.items():
            if id in direct:direct[id]['opex']*=1.2
    return direct

# Sparse constraint rows built independently by defining x- and b-variables.
rows=[];lb=[];ub=[];rules=[]
def restrict(mapping, lo=-np.inf, hi=np.inf, name=''):
    row=np.zeros(N)
    for key,v in mapping.items():row[index[key]]+=float(v)
    rows.append(row);lb.append(lo);ub.append(hi);rules.append(name)

# For packaging, number of additional tokens at year t = sum_k (b_t,k-b_t-1,k).
token_all={('action',id,t):source[id]['tokens'] for v,id,t in vars if v=='action'}
for k in range(1,4):token_all[('pack',4,k)]=1
restrict(token_all,hi=10,name='all_tokens')
for t in range(5):
    tk={('action',id,y):source[id]['tokens'] for kind,id,y in vars if kind=='action' and y==t}
    for k in range(1,4):
        tk[('pack',t,k)]=tk.get(('pack',t,k),0)+1
        if t:tk[('pack',t-1,k)]=tk.get(('pack',t-1,k),0)-1
    restrict(tk,hi=3,name=f'token_year_{t}')

# One choice per material, technology, geographical area and relocation.
groups=defaultdict(list)
for id in nonpack_ids:
    if id.startswith('Relocate '):group='dc'
    elif id.startswith('PV') or id.startswith('Trigeneration'):group='energy'
    elif id.startswith('Alpha'):group='alpha'
    elif id.startswith('Beta'):group='beta'
    elif id.startswith('Gamma'):group='gamma'
    elif id.startswith('Lactose'):group='lactose'
    elif 'North West' in id:group='transport_nw'
    else:group=id
    groups[group].append(id)
for g,ids in groups.items():
    restrict({key:1 for key in vars if key[0]=='action' and key[1] in ids},hi=1,name=f'group_{g}')

# Verona-specific transport coefficients may not be reused after a DC move.
dc_keys=[key for key in vars if key[0]=='action' and key[1].startswith('Relocate ')]
for id in team['Transportation']:
    restrict({**{key:1 for key in dc_keys},**{key:1 for key in vars if key[0]=='action' and key[1]==id}},hi=1,name=f'dc_conflict_{id}')

# Packaging threshold monotonicity across adoption tiers and across years.
for t in range(5):
    for k in (1,2):restrict({('pack',t,k):1,('pack',t,k+1):-1},lo=0,name=f'tier_{t}_{k}')
for t in range(4):
    for k in (1,2,3):restrict({('pack',t,k):1,('pack',t+1,k):-1},hi=0,name=f'nondecrease_{t}_{k}')

constraint=LinearConstraint(np.asarray(rows),np.asarray(lb),np.asarray(ub))
bounds=Bounds(np.zeros(N),np.ones(N))
integrality=np.ones(N,dtype=np.int8)

def coeffs(which):
    actions=base_coefficients(which)
    carbon=np.zeros(N);ebit=np.zeros(N);cash=np.zeros(N)
    tok=np.zeros(N)
    for i,k in enumerate(vars):
        if k[0]=='action':
            _,id,t=k;a=actions[id];life=5-t
            carbon[i]=life*(a['co2'] or 0)
            ebit[i]=-life*(a['opex']+a['dep'])-a['setup']
            cash[i]=-life*a['opex']-a['setup']-a['capex']
            tok[i]=a['tokens']
        else:
            _,t,kid=k;pk=actions[f'Pack{kid}'];prev=actions[f'Pack{kid-1}'] if kid>1 else {'co2':0,'opex':0,'dep':0}
            carbon[i]=pk['co2']-prev['co2']
            ebit[i]=-pk['opex']+prev['opex']-pk['dep']+prev['dep']
            cash[i]=-pk['opex']+prev['opex']
    # Setup billed when b_4,1=1. Monotonic b => billed exactly once.
    ebit[index[('pack',4,1)]]-=actions['Pack1']['setup']
    cash[index[('pack',4,1)]]-=actions['Pack1']['setup']
    return carbon,ebit,cash

def solve(objective,epsilon=None,extra_const=None):
    extra=[constraint]
    if epsilon is not None:
        vec,minimum=epsilon
        extra.append(LinearConstraint(vec.reshape(1,-1),minimum,np.inf))
    if extra_const is not None:
        vec,minimum=extra_const
        extra.append(LinearConstraint(vec.reshape(1,-1),minimum,np.inf))
    result=milp(-objective,bounds=bounds,integrality=integrality,constraints=extra,
                options={'time_limit':120,'mip_rel_gap':1e-9})
    if result.status!=0 or result.x is None:
        raise RuntimeError(f'Independent solver not proven optimal: {result.message}')
    x=np.rint(result.x).astype(int)
    assert np.max(np.asarray(rows)@x - np.asarray(ub)) <= 1e-5
    assert np.max(np.asarray(lb)-np.asarray(rows)@x)<=1e-5
    assert getattr(result,'mip_gap',0) is None or result.mip_gap<1e-6
    return x,result

def summarize(x,which='baseline'):
    C,E,K=coeffs(which)
    actions=base_coefficients(which)
    tokens=[0]*5
    picks=[]
    for key,v in zip(vars,x):
        if not v:continue
        if key[0]=='action':
            _,id,t=key
            picks.append(f'{id}@Y{t}')
            tokens[t]+=actions[id]['tokens']
    tiers=[]
    for t in range(5):tiers.append(sum(int(x[index[('pack',t,k)]]) for k in range(1,4)))
    for t in range(5):
        tokens[t]+=tiers[t]-(tiers[t-1] if t else 0)
        if tiers[t] != (tiers[t-1] if t else 0):
            picks.append(f'Pack{tiers[t]}@Y{t}[+{tiers[t]-(tiers[t-1] if t else 0)}t]')
    assert sum(tokens)<=10 and max(tokens)<=3
    return {'co2':float(C@x),'ebit':float(E@x),'cash':float(K@x),'tokens':tokens,
            'pack_tiers':tiers,'picks':sorted(picks)}

C,E,K=coeffs('baseline')
xE,resE=solve(E)
Emax=float(E@xE)
xElex,_=solve(C,epsilon=(E,Emax-1e-5))
xC,resC=solve(C)
Cmax=float(C@xC)
xClex,_=solve(E,epsilon=(C,Cmax-1e-7))
endpoints={'carbonLow':float(C@xElex),'carbonHigh':float(C@xClex),
           'ebitLow':float(E@xClex),'ebitHigh':float(E@xElex)}
assert math.isclose(endpoints['ebitHigh'],Emax,abs_tol=1e-4)
assert math.isclose(endpoints['carbonHigh'],Cmax,abs_tol=1e-5)
for k,v in endpoints.items():assert math.isclose(v,reference['anchors'][k],rel_tol=1e-8,abs_tol=1e-4),(k,v,reference['anchors'][k])

def score_vector(c,e,w=.5):return w*c/(endpoints['carbonHigh']-endpoints['carbonLow']) + (1-w)*e/(endpoints['ebitHigh']-endpoints['ebitLow'])
def score(c,e,w=.5):return w*(c-endpoints['carbonLow'])/(endpoints['carbonHigh']-endpoints['carbonLow']) + (1-w)*(e-endpoints['ebitLow'])/(endpoints['ebitHigh']-endpoints['ebitLow'])

def yearly_ebit_vector(year=4,which='baseline'):
    actions=base_coefficients(which)
    e=np.zeros(N)
    for i,k in enumerate(vars):
        if k[0]=='action':
            _,id,t=k;a=actions[id]
            if t<=year:e[i]=-a['opex']-a['dep']-(a['setup'] if t==year else 0)
        else:
            _,t,step=k
            if t==year:
                cur=actions[f'Pack{step}'];previous=actions[f'Pack{step-1}'] if step>1 else {'opex':0,'dep':0}
                e[i]=-cur['opex']+previous['opex']-cur['dep']+previous['dep']
    # One-off packaging charge only when initial adoption occurs in this year.
    e[index[('pack',year,1)]]-=actions['Pack1']['setup']
    if year>0:e[index[('pack',year-1,1)]]+=actions['Pack1']['setup']
    return e

# A different, meaningful interpretation of financial performance is the
# final-year EBIT impact, rather than 5y cumulative EBIT. Keep separate.
final_year_vector=yearly_ebit_vector(4)
final_year_pick,_=solve(score_vector(C,E),extra_const=(final_year_vector,0))
final_year_scenario=summarize(final_year_pick)
final_year_scenario['year4_ebit']=float(final_year_vector@final_year_pick)
assert final_year_scenario['year4_ebit']>=-1e-5

comparisons=[]
for name,guard,ref in [('Unrestricted 50/50',None,reference['balanced']),
                       ('EBIT loss ≤ €1m',-1e6,reference['guards']['loss1m']['weighted']['0.50']),
                       ('EBIT nonnegative',0.,reference['guards']['nonnegative']['weighted']['0.50'])]:
    x,r=solve(score_vector(C,E),extra_const=(E,guard) if guard is not None else None)
    s=summarize(x)
    assert math.isclose(s['co2'],ref['saved'],abs_tol=.0001),(name,'CO2',s,ref['saved'])
    assert math.isclose(s['ebit'],ref['ebit'],abs_tol=.01),(name,'EBIT',s,ref['ebit'])
    comparisons.append({'scenario':name,**s,'score':score(s['co2'],s['ebit'])})

# Independent bounded payoff anchors and ALL 21 exact weighted optima for each guard.
# This MILP's packaging binaries are fundamentally different from the 55
# pre-enumerated cumulative patterns used in the publication solver.
cap=reference['boundedEbitFloor']
mode=reference['modes']['bounded']
xB,_=solve(C,extra_const=(E,cap))
Bmax=float(C@xB)
xBLex,_=solve(E,epsilon=(C,Bmax-1e-6),extra_const=(E,cap))
B={'carbonLow':endpoints['carbonLow'], 'carbonHigh':Bmax,
   'ebitLow':float(E@xBLex), 'ebitHigh':endpoints['ebitHigh']}
for key,val in B.items():
    assert math.isclose(val, mode['anchors'][key],abs_tol=1e-3),(key,val,mode['anchors'][key])
assert abs(B['carbonHigh']-5890.19688)<.001
assert abs(B['ebitLow']+8384875.34)<.03

def norm(c,e,anchors,w):
    return w*(c-anchors['carbonLow'])/(anchors['carbonHigh']-anchors['carbonLow']) + (1-w)*(e-anchors['ebitLow'])/(anchors['ebitHigh']-anchors['ebitLow'])

def norm_coeff(w,anchors):
    return w*C/(anchors['carbonHigh']-anchors['carbonLow'])+(1-w)*E/(anchors['ebitHigh']-anchors['ebitLow'])

bounded_validation=[]
for modekey in ('bounded','unrestricted'):
    mm=reference['modes'][modekey]
    aa=mm['anchors']
    for guard,group in mm['guards'].items():
        e_floor=group['minimumFiveYearEBIT']
        for w_str,expected in group['weighted'].items():
            w=float(w_str)
            x,_=solve(norm_coeff(w,aa),extra_const=(E,e_floor) if e_floor is not None else None)
            c,e=float(C@x),float(E@x)
            assert math.isclose(c, expected['saved'],abs_tol=.001), (modekey,guard,w,'CO2',c,expected['saved'])
            assert math.isclose(e, expected['ebit'],abs_tol=.1), (modekey,guard,w,'EBIT',e,expected['ebit'])
            assert math.isclose(norm(c,e,aa,w),expected['score'],abs_tol=1e-7)
            if e_floor is not None:assert e>=e_floor-0.01
            bounded_validation.append((modekey,guard,w_str,c,e))
assert len(bounded_validation)==126
# Recompute teammate portfolio separately from source actions, no reference values.
peer={'PVLargeB':0,'Lactose3':1,'Pack3':2,'Verona::SouthHVO':3}
co2=ebit=cash=0.
for id,t in peer.items():
    a=source[id];life=5-t
    co2+=life*a['co2'];ebit-=life*(a['opex']+a['dep'])+a['setup'];cash-=life*a['opex']+a['capex']+a['setup']
assert math.isclose(co2,reference['teammate']['saved'],abs_tol=1e-4)
assert math.isclose(ebit,reference['teammate']['ebit'],abs_tol=.01)
assert math.isclose(cash,reference['teammate']['cash'],abs_tol=.01)
comparisons.append({'scenario':'Teammate benchmark','co2':co2,'ebit':ebit,'cash':cash,'tokens':[3,3,3,1,0],
                   'picks':[f'{id}@Y{t}' for id,t in peer.items()],'score':score(co2,ebit)})

# Robustness audit: fixed ORIGINAL normalization endpoints so scores comparable.
sensitivity=[]
for which in ['baseline','solar80','suppliers20','freight20','combined']:
    c,e,k=coeffs(which)
    for guard,loss in [('unrestricted',None),('no_ebit_loss',0.)]:
        x,r=solve(score_vector(c,e),extra_const=(e,loss) if loss is not None else None)
        s=summarize(x,which)
        sensitivity.append({'scenario':which,'guard':guard,'co2_saved_t':s['co2'],
           'ebit_change_eur':s['ebit'],'cash_change_eur':s['cash'],'score_fixed_anchors':score(s['co2'],s['ebit']),
           'year_tokens':s['tokens'],'actions':s['picks']})

# Check objective-weight stability in baseline model.
weights=[]
for w in [0.4,0.45,0.5,0.55,0.6]:
    for guard,minE in [('unrestricted',None),('no_ebit_loss',0.)]:
        x,_=solve(score_vector(C,E,w),extra_const=(E,minE) if minE is not None else None)
        s=summarize(x)
        weights.append({'carbon_weight':w,'guard':guard,'co2_saved_t':s['co2'],'ebit_change_eur':s['ebit'],
                        'score':score(s['co2'],s['ebit'],w),'actions':s['picks']})

assert all(len(s['actions']) for s in sensitivity)
result={'source_file':wbpath.name,'source_sha256':hashlib.sha256(wbpath.read_bytes()).hexdigest(),
 'source_action_rows_checked':len(source),'source_reconciliation_differences':len(all_diffs),
 'category_action_coefficients_reconciled':len(checks),
 'exact_model':'Independent binaries per action-year plus monotone packaging threshold-year binaries',
 'binary_vars':N,'constraints':len(rows),'endpoints':endpoints,
 'comparison':comparisons,'final_year_ebit_floor_scenario':final_year_scenario,'sensitivity':sensitivity,'weights':weights,
 'caveats':['No authoritative OTIF response','Inventory policy excluded','Subject to workbook solar, supplier, freight estimates',
            'Unknown professor grade normalization','Packaging upgrade token increments are modeling assumption'],
 'bounded_endpoints':B, 'published_modes_checked':len(bounded_validation),
 'status':'Independent MILP checks passed: all 126 v6 weighted exact optima plus both payoff reference anchors verified'}
(ROOT/'validation').mkdir(exist_ok=True)
(ROOT/'validation'/'independent_validation_v6.json').write_text(json.dumps(result,indent=2,ensure_ascii=False))
with (ROOT/'validation'/'sensitivity.csv').open('w',newline='',encoding='utf8') as f:
    wr=csv.writer(f);wr.writerow(['scenario','guard','five_year_co2_saved_t','five_year_delta_ebit_eur','five_year_delta_cash_eur','normalized_score','token_allocation','actions'])
    for s in sensitivity:wr.writerow([s['scenario'],s['guard'],f"{s['co2_saved_t']:.5f}",f"{s['ebit_change_eur']:.2f}",f"{s['cash_change_eur']:.2f}",f"{s['score_fixed_anchors']:.6f}",s['year_tokens'],'; '.join(s['actions'])])
with (ROOT/'validation'/'objective_weights.csv').open('w',newline='',encoding='utf8') as f:
    wr=csv.writer(f);wr.writerow(['carbon_weight','guard','co2_t','delta_ebit_eur','score','actions'])
    for s in weights:wr.writerow([s['carbon_weight'],s['guard'],f"{s['co2_saved_t']:.5f}",f"{s['ebit_change_eur']:.2f}",f"{s['score']:.6f}",'; '.join(s['actions'])])
with (ROOT/'validation'/'coefficient_trace.csv').open('w',newline='',encoding='utf8') as f:
    wr=csv.writer(f);wr.writerow(['action_id','source_cells','tokens','annual_co2_saved_t','annual_operating_cost_change_eur','capex_eur','annual_depreciation_eur','oneoff_setup_eur'])
    for id in sorted(source):
        a=source[id];wr.writerow([id,a['source'],a['tokens'],a['co2'],a['opex'],a['capex'],a['dep'],a['setup']])
print('VERIFIED workbook SHA',result['source_sha256'])
print('SOURCE: checked',len(source),'action rows,',len(checks),'specialized calculation rows')
print('INDEPENDENT MILP',N,'vars,',len(rows),'constraints')
for s in comparisons:print(f"  {s['scenario']}: CO2={s['co2']:.3f} EBIT={s['ebit']:.2f} cash={s['cash']:.2f} score={s['score']:.5%}, tokens={s['tokens']} PICKS={s['picks']}")
print('FINAL YEAR EBIT FLOOR:',final_year_scenario)
print('SENSITIVITY')
for s in sensitivity:print(f"  {s['scenario']:12} {s['guard']:13} CO2={s['co2_saved_t']:.2f}, EBIT={s['ebit_change_eur']:.0f}, score={s['score_fixed_anchors']:.2%}, picks={s['actions']}")
print('V6: independently verified 126 MILP optima; bounded anchors',B)
print('All validation checks PASSED')
