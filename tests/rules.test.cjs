'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
function initialize(){
  const defaults={weight:'50',timing:'flexible',cap:'','min-ebit':'',breadth:'450','baseline-ebit':'31200000',strict:true,inventory:false,corrected:true};
  const elements=new Map();let opened=0,scrolled=0,focused=0;
  function element(id){
    if(!elements.has(id)){
      const raw=defaults[id];const el={value:typeof raw==='string'?raw:'',checked:typeof raw==='boolean'?raw:false,type:typeof raw==='boolean'?'checkbox':'text',id,disabled:false,innerHTML:'',textContent:'',style:{},classList:{toggle(){}},querySelectorAll(){return []},addEventListener(){},setAttribute(){},scrollIntoView(){scrolled++},focus(){focused++},click(){}};
      elements.set(id,el);
    }
    return elements.get(id);
  }
  const document={getElementById:element,querySelectorAll(){return []},querySelector(sel){return sel==='button[data-view="strategies"]'?{click(){opened++}}:null},createElement(){return {style:{},click(){},remove(){}}},body:{appendChild(){}}};
  const sandbox={console,document,localStorage:{getItem(){return null},setItem(){}},window:{scrollTo(){}},setTimeout:(fn,ms)=>ms===120?null:setTimeout(fn,ms),clearTimeout,URL,Blob,Number,Math,JSON,Map,Set,Infinity,Date,structuredClone,alert:()=>{},confirm:()=>true};
  vm.createContext(sandbox);vm.runInContext(script,sandbox);
  const execute=code=>vm.runInContext(code,sandbox);
  return {execute,element,metrics:()=>({opened,scrolled,focused})};
}
test('case source permits only ONE energy installation globally',()=>{
  const {execute}=initialize();
  assert.equal(execute("ORIGINAL.filter(a=>a.area==='Energy').length"),5);
  assert.equal(execute("new Set(ORIGINAL.filter(a=>a.area==='Energy').map(a=>a.group)).size"),1);
  assert.equal(execute("groupOrder().filter(g=>g==='energy').length"),1);
  assert.equal(execute("(()=>{const a=ORIGINAL.find(x=>x.id==='pv-large'),b=ORIGINAL.find(x=>x.id==='pv-small-a');const s=addAction(addAction(initial(),a,0),b,1);return respectsHardRules(s,new Map(ORIGINAL.map(a=>[a.id,a])));})()"),false);
});
test('every DC relocation is only in Year 0 and charges €90,000 setup',()=>{
  const {execute}=initialize();
  assert.equal(execute("ORIGINAL.filter(a=>a.group==='dc').every(a=>a.setup===90000&&a.tokens===2)"),true);
  assert.equal(execute("(()=>{const d=ORIGINAL.find(a=>a.id==='dc-florence');return addAction(initial(),d,0).annualEbit[0]===-104293;})()"),true);
  assert.equal(execute("(()=>{const d=ORIGINAL.find(a=>a.id==='dc-florence');return respectsHardRules(addAction(initial(),d,1),new Map(ORIGINAL.map(a=>[a.id,a])));})()"),false);
});
test('the approximation returns feasible non-duplicated, energy-exclusive strategies',async()=>{
  const {execute}=initialize();
  const info=await execute('(async()=>{await run();return {n:frontier.length,selected:!!selected,valid:frontier.every(s=>respectsHardRules(s,new Map(ORIGINAL.map(a=>[a.id,a])))),noDouble:frontier.every(s=>s.picks.filter(p=>ORIGINAL.find(a=>a.id===p.id).group===\'energy\').length<=1),noDoubleMode:frontier.every(s=>s.picks.filter(p=>ORIGINAL.find(a=>a.id===p.id).group===\'tr-nw\').length<=1),year0:frontier.every(s=>s.picks.filter(p=>ORIGINAL.find(a=>a.id===p.id).group===\'dc\').every(p=>p.y===0))}})()');
  assert.ok(info.n>0); assert.equal(info.selected,true);assert.equal(info.valid,true);assert.equal(info.noDouble,true);assert.equal(info.noDoubleMode,true);assert.equal(info.year0,true);
});
test('Inspect opens and focuses strategy details',async()=>{
  const ctx=initialize();
  await ctx.execute('run()');
  ctx.execute('inspectStrategy(0)');
  assert.equal(ctx.execute('selected===frontier[0]'),true);
  assert.equal(ctx.metrics().opened,1);
  assert.equal(ctx.metrics().scrolled,1);
  assert.equal(ctx.metrics().focused,1);
});
