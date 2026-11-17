const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/workbook_model.json'),'utf8'));
const exact=JSON.parse(fs.readFileSync(path.join(root,'data/exact_v6.json'),'utf8'));
function harness(scope='core'){
 const dom=new Map();const visited=[];
 const defaults={weight:'50',timing:'flexible',cap:'','min-ebit':'',breadth:'450',
  'baseline-ebit':'31200000',scope,'pv-utilization':'100','ebit-guard':'none','normalization':'bounded'};
 const checked={inventory:false,'risk-filter':true};
 function el(id){if(!dom.has(id))dom.set(id,{id,value:defaults[id]??'',checked:checked[id]??false,
  type:['inventory','risk-filter'].includes(id)?'checkbox':'text',
  style:{},classList:{toggle(){}},innerHTML:'',textContent:'',disabled:false,
  dataset:{},addEventListener(){},querySelectorAll(){return[]},setAttribute(){},
  scrollIntoView(){visited.push(`scroll:${id}`)},focus(){visited.push(`focus:${id}`)},click(){visited.push(`click:${id}`)}});
 return dom.get(id);}
 const document={getElementById:el,querySelectorAll(){return[]},querySelector(sel){
  if(sel.includes('data-view="strategies"'))return el('nav-strategies');
  return null;},createElement(){return{style:{},click(){},remove(){}}},body:{appendChild(){}}};
 const localStorage={getItem(){return null},setItem(){},removeItem(){}};
 const window={LAMAK_MODEL:data,LAMAK_EXACT_V6:exact,scrollTo(){}};
 const context=vm.createContext({document,window,localStorage,structuredClone,console,
  setTimeout(fn,ms){if(ms===0)fn()},clearTimeout(){},alert(){},confirm(){return true},
  Blob,URL:{createObjectURL(){return'blob:test'},revokeObjectURL(){}},Math,Date,Number,Object,String,Set,Map,JSON});
 vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),context,{timeout:5000});
 return{context,el,visited};
}
const get=(c,expr)=>vm.runInContext(expr,c,{timeout:5000});

test('workbook and excluded sheets: 25 teammate choices, 516 workbook actions',()=>{
 assert.equal(data.actions.length,516);
 assert.equal(data.actions.filter(x=>x.team).length,25);
 assert.equal(exact.coreActionCount,30);
 for(const sheet of ['Dashboard','Schedule','Audit','Sensitivity'])
  assert.ok(!data.metadata.sourceIncludedSheets.includes(sheet));
 for(const family of Object.values(data.metadata.team25))assert.equal(family.length,5);
 assert.ok(Math.abs(data.actions.find(a=>a.id==='PVLargeB').co2-540.2)<1e-9);
});
test('payoff anchors are separately optimized and coherent',()=>{
 const b=exact.anchors;
 assert.ok(Math.abs(exact.ebitExtreme.saved-b.carbonLow)<1e-6);
 assert.ok(Math.abs(exact.ebitExtreme.ebit-b.ebitHigh)<1e-6);
 assert.ok(Math.abs(exact.carbonExtreme.saved-b.carbonHigh)<1e-6);
 assert.ok(Math.abs(exact.carbonExtreme.ebit-b.ebitLow)<1e-6);
 assert.ok(b.carbonHigh>5980&&b.carbonLow>2700-0.1);
 assert.ok(b.ebitLow< -16000000&&b.ebitHigh>1780000);
});
test('core exact scores are proven for all 21 slider weights and all three guards',()=>{
 assert.equal(Object.keys(exact.guards).length,3);
 for(const [guard,v] of Object.entries(exact.guards)){
  assert.equal(Object.keys(v.weighted).length,21);
  for(const s of Object.values(v.weighted)){
   assert.ok(s.tokens<=10&&s.yt.every(x=>x<=3));
   assert.ok(s.ebit >= (v.minimumFiveYearEBIT??-Infinity)-1e-6);
   assert.ok(s.picks.filter(x=>data.actions.find(a=>a.id===x.id)?.group==='energy').length<=1);
  }
 }
});
test('teammate reference plan is reconstructed exactly',()=>{
 const s=exact.teammate;
 assert.ok(Math.abs(s.saved-3887.8185)<0.01);
 assert.ok(Math.abs(s.ebit-1116959.91)<0.03);
 assert.ok(Math.abs(s.cash-681959.91)<0.03);
 assert.deepEqual(s.yt,[3,3,3,1,0]);
 assert.deepEqual(s.picks.map(x=>[x.id,x.y]),[['PVLargeB',0],['Lactose3',1],['Pack3',2],['Verona::SouthHVO',3]]);
});
test('progressive bottles: incremental tokens, new full tier performance, setup once',()=>{
 const{context}=harness();
 const s=get(context,'packagingBundle([0,1,1,3,3])');
 assert.deepEqual(Array.from(s.yt),[0,1,0,2,0]);
 assert.equal(s.tokens,3);
 assert.equal(s.setup,75000);
 assert.equal(s.annualSetup[1],75000);
 assert.equal(s.annualSetup[3],0);
 assert.ok(Math.abs(s.annualSaved[1]-23.7765)<1e-6);
 assert.ok(Math.abs(s.annualSaved[3]-72.05)<1e-6);
 assert.equal(s.picks[1].tokens,2);
 assert.equal(get(Object.assign(context,{S:s}),'respectsHardRules(S)'),true);
 assert.equal(get(context,'packagingProfiles().length'),55);
});
test('a duplicate energy or invalid DC-transport pairing fails validation',()=>{
 const{context}=harness();
 const wrongEnergy=get(context,'sumProfiles(singleBundle(actions.find(a=>a.id==="PVLargeB"),0), singleBundle(actions.find(a=>a.id==="TrigenerationSmallB"),1))');
 assert.equal(get(Object.assign(context,{S:wrongEnergy}),'respectsHardRules(S)'),false);
 const wrongDC=get(context,'sumProfiles(singleBundle(actions.find(a=>a.id==="Relocate Rome"),0),singleBundle(actions.find(a=>a.id==="Verona::SouthHVO"),1))');
 assert.equal(get(Object.assign(context,{S:wrongDC}),'respectsHardRules(S)'),false);
 const correctDC=get(context,'sumProfiles(singleBundle(actions.find(a=>a.id==="Relocate Rome"),0),singleBundle(actions.find(a=>a.id==="Rome::SouthHVO"),1))');
 assert.equal(get(Object.assign(context,{S:correctDC}),'respectsHardRules(S)'),true);
});
test('exact view selects correct weight and chosen guardrail',()=>{
 const{context,el}=harness();
 assert.equal(get(context,'loadExact()'),true);
 let s=get(context,'selected');
 assert.ok(Math.abs(s.saved-exact.modes.bounded.guards.none.weighted['0.50'].saved)<1e-7);
 assert.match(el('search-note').textContent,/CERTIFIED SCORE OPTIMUM/);
 el('ebit-guard').value='nonnegative';
 assert.equal(get(context,'loadExact()'),true);
 s=get(context,'selected');assert.ok(s.ebit>=0);
 el('weight').value='40';
 get(context,'selectForWeight()');
 s=get(context,'selected');
 assert.equal(s.ebit,exact.modes.bounded.guards.nonnegative.weighted['0.40'].ebit);
});
test('Inspect navigates to the plan; teammate benchmark can be inspected',()=>{
 const{context,el,visited}=harness();
 get(context,'loadExact()');get(context,'inspectStrategy(0)');
 assert.match(el('plan-heading').textContent,/Inspecting strategy/);
 assert.ok(visited.includes('focus:plan-heading'));
 get(context,'viewTeammate()');
 assert.match(el('plan-heading').textContent,/Inspecting strategy/);
 assert.equal(get(context,'selected.saved'),exact.teammate.saved);
});
test('browser heuristic core mode never violates token or exclusivity constraints',async()=>{
 const{context,el}=harness();
 el('scope').value='core';
 await get(context,'runApprox()');
 const result=get(context,`({count:frontier.length,valid:frontier.every(s=>respectsHardRules(s)),
  selectedScore:selected?score(selected):null})`);
 assert.ok(result.count>2);
 assert.equal(result.valid,true);
 assert.ok(Number.isFinite(result.selectedScore));
});
test('workbook 516-action screening is labeled heuristic',async()=>{
 const{context,el}=harness('extended');
 el('breadth').value='450';
 await get(context,'run()');
 assert.equal(get(context,'lastEngine'),'heuristic');
 assert.match(el('search-note').textContent,/APPROXIMATE/);
 assert.ok(get(context,'frontier.length')>=1);
});
test('default is exact core, no unverified stock EBIT and PV default 100%',()=>{
 const{context,el}=harness();
 assert.equal(el('inventory').checked,false);
 assert.equal(el('pv-utilization').value,'100');
 assert.equal(get(context,'isReferenceEligible()'),true);
 el('pv-utilization').value='80';
 assert.equal(get(context,'isReferenceEligible()'),false);
});
test('PV sensitivity uses workbook energy and assumptions values',()=>{
 const{context,el}=harness();
 el('pv-utilization').value='80';
 const s=get(context,'correctedAction(actions.find(a=>a.id==="PVLargeB"),currentOptions())');
 assert.ok(Math.abs(s.co2-417.56)<1e-6);
 assert.ok(s.cost>data.actions.find(a=>a.id==='PVLargeB').opex+data.actions.find(a=>a.id==='PVLargeB').dep);
});
test('v6 exact script and anchor controls are used by the published page',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/data\/exact_v6\.js/);
 assert.doesNotMatch(html,/data\/exact_team\.js/);
 for(const id of ['normalization','anchor-rmax','anchor-ermax','reference-status','model-anchors','data-count','metric-score','metric-cash','ebit-guard','show-teammate','benchmark-compare'])
  assert.ok(html.includes(`id="${id}"`),`Missing ${id}`);
});


test('v6 default is financially bounded and reference inputs are paired consistently',()=>{
 assert.equal(exact.defaultMode,'bounded');
 assert.equal(exact.boundedEbitFloor,-8384875.34);
 const b=exact.modes.bounded.anchors;
 assert.ok(Math.abs(b.carbonHigh-5890.19687965)<0.00001);
 assert.ok(Math.abs(b.ebitLow-(-8384875.337768478))<0.01);
 assert.equal(b.carbonLow,2701);
 assert.ok(Math.abs(b.ebitHigh-1780451.6087)<0.1);
 assert.ok(Math.abs(exact.modes.bounded.carbonExtreme.saved-b.carbonHigh)<1e-5);
 assert.ok(Math.abs(exact.modes.bounded.carbonExtreme.ebit-b.ebitLow)<0.01);
 const {context,el}=harness();
 assert.equal(el('normalization').value,'bounded');
 get(context,'loadExact()');
 assert.ok(Math.abs(get(context,'selected.saved')-3887.8185378)<0.001);
 assert.ok(Math.abs(get(context,'selected.ebit')-1116959.9146)<0.01);
 assert.ok(Math.abs(get(context,'score(selected)')-.6534335198)<1e-8);
 assert.match(el('model-anchors').textContent,/5,890.20/);
 assert.match(el('reference-status').textContent,/BOUNDED/);
});

test('unrestricted original comparison uses its own independently proven endpoints',()=>{
 const {context,el}=harness();
 el('normalization').value='unrestricted';
 get(context,'loadExact()');
 assert.ok(Math.abs(get(context,'selected.saved')-5834.304)<0.001);
 assert.ok(Math.abs(get(context,'selected.ebit')-(-6165539.42))<0.1);
 assert.ok(Math.abs(get(context,'score(selected)')-.7617895)<.0001);
 assert.match(el('reference-status').textContent,/UNRESTRICTED/);
});

test('all v6 exact solutions obey their mode floor at all 21 weights and three guards',()=>{
 for(const [modeName,mode] of Object.entries(exact.modes)){
  const b=mode.anchors;
  assert.ok(b.carbonHigh>b.carbonLow&&b.ebitHigh>b.ebitLow);
  for(const [guard,data] of Object.entries(mode.guards)){
   assert.equal(Object.keys(data.weighted).length,21,`${modeName}:${guard}`);
   for(const [w,s] of Object.entries(data.weighted)){
    assert.ok(s.ebit>=(data.minimumFiveYearEBIT??-Infinity)-0.01);
    assert.ok(s.tokens<=10&&s.yt.every(x=>x<=3));
    const score=Number(w)*(s.saved-b.carbonLow)/(b.carbonHigh-b.carbonLow)+(1-Number(w))*(s.ebit-b.ebitLow)/(b.ebitHigh-b.ebitLow);
    assert.ok(Math.abs(score-s.score)<1e-9);
   }
  }
 }
});

test('heuristic respects bounded EBIT floor even when no additional guardrail selected',async()=>{
 const {context,el}=harness();
 el('scope').value='extended';
 el('normalization').value='bounded';
 await get(context,'runApprox()');
 assert.equal(get(context,'frontier.every(s=>s.ebit>=REFERENCE.boundedEbitFloor-.0001)'),true);
});

test('bounded and unbounded scores differ for the same plan',()=>{
 const {context}=harness();
 const v=get(context,"({a:scoreForMode(REFERENCE.teammate,'bounded',.5),b:scoreForMode(REFERENCE.teammate,'unrestricted',.5)})");
 assert.ok(Math.abs(v.a-.6534335198)<.0000001);
 assert.ok(Math.abs(v.b-.6627544)<.0001);
});
