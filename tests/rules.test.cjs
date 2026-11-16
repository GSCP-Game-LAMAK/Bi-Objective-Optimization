const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const model=JSON.parse(fs.readFileSync(path.join(root,'data','workbook_model.json'),'utf8'));
function makeContext(scope='team'){
 const map=new Map();
 function el(id){if(!map.has(id))map.set(id,{
  id,value:({weight:'50',timing:'flexible',cap:'', 'min-ebit':'',breadth:'450','baseline-ebit':'31200000',scope,'energy-mode':'workbook'})[id]||'',
  checked:({inventory:true,'risk-filter':true})[id]||false,style:{},classList:{toggle(){}},dataset:{},
  textContent:'',innerHTML:'',disabled:false,type:['inventory','risk-filter'].includes(id)?'checkbox':'text',
  addEventListener(){},querySelectorAll(){return[]},setAttribute(){},scrollIntoView(){},focus(){}
 });return map.get(id)}
 const document={getElementById:el,querySelectorAll(){return []},querySelector(){return null},createElement(){return{click(){},remove(){},style:{}}},body:{appendChild(){}}};
 const reference=JSON.parse(fs.readFileSync(path.join(root,'data','exact_team_frontier.json'),'utf8'));
 const context=vm.createContext({window:{LAMAK_MODEL:model,LAMAK_EXACT:reference,scrollTo(){}},document,localStorage:{getItem(){return null},setItem(){}},console,structuredClone,setTimeout(fn,ms){if(ms===0)fn()},clearTimeout(){},URL:{createObjectURL(){return'blob:test'},revokeObjectURL(){}},Blob,alert(){},confirm(){return true},Math,Date,Number,Object,String,Set,Map,JSON});
 vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),context,{timeout:3000});
 return {context,el};
}
test('dataset: no preset portfolio sheet is imported and exactly 25 team choices',()=>{
 assert.deepEqual(model.metadata.sourceExcludedSheets,['Dashboard','Schedule','Audit']);
 assert.equal(model.actions.filter(a=>a.team).length,25);
 assert.equal(model.actions.length,516);
 assert.equal(model.actions.find(a=>a.id==='PVLargeB').co2.toFixed(2),'255.58');
 assert.equal(model.actions.find(a=>a.id==='Verona::SouthHVO').co2.toFixed(2),'17.75');
});
test('team shortlist contains five actions per member and matches source data',()=>{
 for(const ids of Object.values(model.metadata.team25)) assert.equal(ids.length,5);
 for(const ids of Object.values(model.metadata.team25))for(const id of ids)assert.ok(model.actions.some(a=>a.id===id));
 const a=model.actions.find(x=>x.id==='Alpha1');assert.ok(a.opex>74000&&a.opex<76000);
});
test('constraints block duplicate energy and validate DC-specific transport',()=>{
 const {context}=makeContext();
 const lookup=vm.runInContext('new Map(PROJECT_ACTIONS.map(a=>[a.id,a]))',context);
 const good=vm.runInContext('initial()',context);
 const energy=model.actions.find(a=>a.id==='PVLargeB');
 const tri=model.actions.find(a=>a.id==='TrigenerationSmallB');
 const s=vm.runInContext('addAction(addAction(initial(),PROJECT_ACTIONS.find(a=>a.id==="PVLargeB"),0),PROJECT_ACTIONS.find(a=>a.id==="TrigenerationSmallB"),1)',context);
 assert.equal(vm.runInContext('respectsHardRules(S,new Map(PROJECT_ACTIONS.map(a=>[a.id,a])))',Object.assign(context,{S:s})),false);
 const relocated=vm.runInContext('addAction(addAction(initial(),PROJECT_ACTIONS.find(a=>a.id==="Relocate Rome"),0),PROJECT_ACTIONS.find(a=>a.id==="Verona::SouthHVO"),1)',context);
 assert.equal(vm.runInContext('respectsHardRules(S,new Map(PROJECT_ACTIONS.map(a=>[a.id,a])))',Object.assign(context,{S:relocated})),false);
 const consistent=vm.runInContext('addAction(addAction(initial(),PROJECT_ACTIONS.find(a=>a.id==="Relocate Rome"),0),PROJECT_ACTIONS.find(a=>a.id==="Rome::SouthHVO"),1)',context);
 assert.equal(vm.runInContext('respectsHardRules(S,new Map(PROJECT_ACTIONS.map(a=>[a.id,a])))',Object.assign(context,{S:consistent})),true);
});
test('financial accounting correctly separates opex and depreciation',()=>{
 const {context}=makeContext();
 const item=model.actions.find(a=>a.id==='PVLargeB');
 const s=vm.runInContext('addAction(initial(),PROJECT_ACTIONS.find(a=>a.id==="PVLargeB"),0)',context);
 assert.ok(Math.abs(s.annualEbit[0]-(-item.opex-item.dep))<1e-6);
 assert.ok(Math.abs(s.cash-(-5*item.opex-item.capex))<1e-6);
});
test('browser search returns mutually exclusive energy choices and valid 10/3 token schedules',async()=>{
 const {context}=makeContext();
 await vm.runInContext('run()',context,{timeout:3000});
 const outcomes=vm.runInContext('frontier.map(s=>({picks:s.picks,yt:s.yt,tokens:s.tokens,saved:s.saved,ebit:s.ebit}))',context);
 assert.ok(outcomes.length>2);
 for(const s of outcomes){assert.ok(s.tokens<=10);assert.ok(s.yt.every(v=>v<=3));assert.ok(s.picks.filter(p=>['PVLargeB','PVMediumB','PVSmallA','TrigenerationLargeB','TrigenerationMediumB'].includes(p.id)).length<=1)}
});
test('expanded workbook mode creates feasible candidates with DC-specific routes',async()=>{
 const {context}=makeContext('extended');
 context.document.getElementById('breadth').value='450';
 await vm.runInContext('run()',context,{timeout:3000});
 const stats=vm.runInContext('({count:frontier.length, examined:evaluated, valid:frontier.every(s=>respectsHardRules(s,new Map(actions.map(a=>[a.id,a]))))})',context);
 assert.ok(stats.count>2);
 assert.equal(stats.valid,true);
});

test('exact MILP reference contains source-backed, inspected solutions',()=>{
 const {context}=makeContext();
 vm.runInContext('loadExact()',context);
 const s=vm.runInContext('({engine:lastEngine,frontier:frontier.length,selected})',context);
 assert.equal(s.engine,'exact');
 assert.ok(s.frontier>=4);
 assert.ok(s.selected&&s.selected.tokens<=10);
 const ref=JSON.parse(fs.readFileSync(path.join(root,'data','exact_team_frontier.json'),'utf8'));
 assert.equal(ref.solutions.length,s.frontier);
});
