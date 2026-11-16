"""Extract source-backed values from Eco Chain workbook; intentionally NEVER reads Dashboard or Schedule."""
import json, re, pathlib, math, sys
from artifact_tool import Blob,SpreadsheetFile
ROOT=pathlib.Path(__file__).resolve().parent
SOURCE=ROOT/'source'/'Eco_Chain_Reaction_Model.xlsx'
w=SpreadsheetFile.import_xlsx(Blob.load(str(SOURCE)))
# SOURCE ALLOWLIST. Dashboard, Schedule, Audit are deliberately excluded.
RANGES={'Inputs':'A6:E326','Assumptions':'A6:C22','Routing':'A5:AB67',
        'Suppliers':'A5:S20','DC Locations':'A5:Q12','Energy':'A5:X17',
        'Transport':'A5:N112','Stock Policies':'A5:T389','Actions':'A5:K521',
        'Sensitivity':'A5:F45'}
source={}
for sheet,rg in RANGES.items():
    rows=w.worksheets.get_item(sheet).get_range(rg).values
    clean=[]
    for row in rows:
        clean.append([None if isinstance(v,float) and (math.isnan(v) or math.isinf(v)) else v for v in row])
    source[sheet]={'header':clean[0],'rows':clean[1:]}
actions=[]
stock={r[0]:r for r in source['Stock Policies']['rows'] if isinstance(r[0],str) and r[0].startswith('ST')}
transport={r[0]:r for r in source['Transport']['rows'] if isinstance(r[0],str) and '::' in r[0]}
energy={r[0]:r for r in source['Energy']['rows'] if isinstance(r[0],str) and (r[0].startswith('PV') or r[0].startswith('Trigeneration'))}
suppliers={r[0]:r for r in source['Suppliers']['rows'] if isinstance(r[0],str)}
dcs={r[0]:r for r in source['DC Locations']['rows'] if isinstance(r[0],str)}
for n,r in enumerate(source['Actions']['rows'],6):
    id=r[0]
    if not isinstance(id,str):continue
    tok, co2, opex, capex, dep, setup=r[1:7]
    if tok is None or opex is None:continue
    co2=float(co2) if isinstance(co2,(int,float)) else None
    opex=float(opex) if isinstance(opex,(int,float)) else None
    if opex is None: continue
    o={'id':id,'tokens':int(tok),'co2':co2,'opex':opex,'capex':float(capex or 0),
       'dep':float(dep or 0),'setup':float(setup or 0), 'source':f'Actions!A{n}:K{n}',
       'note':str(r[10] or ''),'category':'Other','group':'other', 'dc':'any', 'year':0,'risk':'unknown'}
    if id.startswith('Relocate '):
        city=id.split(' ',1)[1];o.update(category='Distribution',group='dc',dc=city,year=0,name=f'Relocate DC to {city}',risk='unknown',source=f'DC Locations!A{list(dcs).index(city)+6}:Q{list(dcs).index(city)+6}')
    elif id in energy:
        e=energy[id];o.update(category='Energy',group='energy',name=f'{e[1]} {e[3]} — Plant {e[2]}',site=e[2],year=0,risk='low',source=f'Energy!A{list(energy).index(id)+6}:X{list(energy).index(id)+6}')
    elif id in suppliers:
        s=suppliers[id];group=re.sub(r'\d+$','',id).lower();o.update(category='Packaging' if group=='pack' else 'Supplier',group=group,name=s[1],year=2 if group=='pack' else (1 if group in ('gamma','lactose') else (3 if group=='beta' else 4)),risk='unknown',share=s[3],source=f'Suppliers!A{list(suppliers).index(id)+6}:S{list(suppliers).index(id)+6}')
    elif id in stock:
        s=stock[id];facility=s[1];product=s[2];stockgroup=f'{facility}-{product}'.replace(' ','-').lower();o.update(category='Stock',group='stock-'+stockgroup,name=f'{facility} {product}: Q {int(round(s[6]*100)):+}% / R {int(round(s[7]*100)):+}%',year=4 if product=='API Beta' else 2,risk=str(s[18] or 'unknown'),stock={'facility':facility,'product':product,'dQ':s[6],'dR':s[7],'q0':s[4],'r0':s[5]},source=f'Stock Policies!A{list(stock).index(id)+6}:T{list(stock).index(id)+6}')
    elif id in transport:
        tr=transport[id];dc=tr[1];route=tr[2];fuel=tr[3];routeKey=route.replace(' HVO','').replace(' LNG','').replace(' Electric','');o.update(category='Transportation',group='transport-'+routeKey.lower().replace(' ','-'),name=route,dc=dc,year=2,risk='unknown',source=f'Transport!A{list(transport).index(id)+6}:N{list(transport).index(id)+6}')
    else:continue
    actions.append(o)
# Map all 25 group submissions. Stock rows must match user's exact Q/R moves.
def stock_id(facility,product,dq,dr):
    for id,r in stock.items():
        if str(r[1])==facility and str(r[2])==product and abs(r[6]-dq)<1e-8 and abs(r[7]-dr)<1e-8:return id
    raise ValueError('Unmatched stock alternative '+str((facility,product,dq,dr)))
team={
 'Distribution':['Relocate Rome','Relocate Florence','Relocate Brescia','Relocate Piacenza','Relocate Milan'],
 'Supplier':['Alpha1','Beta1','Gamma1','Lactose1','Pack1'],
 'Transportation':['Verona::CenterHVO','Verona::SouthHVO','Verona::North WestHVO','Verona::North WestElectric','Verona::BHVO'],
 'Stock':[stock_id('Plant B','API Beta',-.1,0),stock_id('Plant B','API Beta',-.2,0),stock_id('Plant B','API Beta',-.3,0),stock_id('Plant B','API Gamma',-.1,0),stock_id('DC','Heart tablets',-.1,0)],
 'Energy':['PVLargeB','PVMediumB','PVSmallA','TrigenerationLargeB','TrigenerationMediumB']
}
ids={a['id'] for a in actions}
for area,rows in team.items():
 for id in rows:
  if id not in ids:raise ValueError(f'Could not find {area}: {id}')
teamSet=set(sum(team.values(),[]))
for a in actions:a['team']=a['id'] in teamSet
metadata={
 'title':'LAMAK workbook-backed optimization', 'sourceFile':SOURCE.name,
 'sourceIncludedSheets':list(RANGES),
 'sourceExcludedSheets':['Dashboard','Schedule','Audit'],
 'baselineCO2':4074,'baselineEBIT':31200000,'tokenCap':10,'annualTokenCap':3,
 'method':'cached formula results calculated in workbook model sheets; no solution-sheet inputs',
 'team25':team,
 'financialConvention':'opex excludes D&A; EBIT savings = -opex - depreciation - setup in implementation year',
 'stockUncertainty':'20% annual carrying rate and €0 fixed order cost are analyst assumptions, not case facts',
 'electricEligibility':'Based on the workbook Transport rows and its adjacency rules, not independently confirmed by professor',
 'sourceControls':{'energyChoice':'at most one energy installation','DC':'at most one first-year relocation, €90,000 setup','supplier':'one alternative share tier per material','packaging':'one share tier','transport':'one fuel per route / geographical area','stock':'one policy per facility-product'},
}
output={'metadata':metadata,'actions':actions,'source':source}
path=ROOT/'data'/'workbook_model.json';path.parent.mkdir(exist_ok=True,parents=True)
path.write_text(json.dumps(output,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
(ROOT/'data'/'model.js').write_text('window.LAMAK_MODEL = '+path.read_text(encoding='utf-8')+';\n',encoding='utf-8')
print('Extracted',len(actions),'actions; team choices',len(teamSet),'stock choices',len(stock),'source sheets',len(source),'data bytes',path.stat().st_size)
print('Team Stock ids:',team['Stock'])
print('Energy PV Large B',next(a for a in actions if a['id']=='PVLargeB'))
