/* LAMAK v6 · financially bounded workbook-backed 30-action exact MILP reference + transparent scenario screening.
   Untrusted preset workbook Dashboard/Schedule portfolios are NEVER imported. */
'use strict';
if (!window.LAMAK_MODEL?.actions || !window.LAMAK_EXACT_V6?.modes) {
  throw new Error('Missing data/model.js or data/exact_v6.js; serve the complete v6 folder.');
}
const MODEL = window.LAMAK_MODEL;
const REFERENCE = window.LAMAK_EXACT_V6;
const BASE_CO2 = MODEL.metadata.baselineCO2;
const HORIZON = 5, TOKEN_CAP = 10, ANNUAL_CAP = 3;
const STORE = 'lamak-optimizer-v6';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (n, d=0) => Number(n || 0).toLocaleString('en-US',{minimumFractionDigits:d, maximumFractionDigits:d});
const euros = n => `${n < 0 ? '−':'+'}€${fmt(Math.abs(n))}`;
const briefEuro = n => Math.abs(n)>=1e6 ? `${n<0?'−':'+'}€${fmt(Math.abs(n)/1e6,2)}m` : Math.abs(n)>=1000 ? `${n<0?'−':'+'}€${fmt(Math.abs(n)/1000,1)}k` : euros(n);
const initialValue = () => ({picks:[],yt:[0,0,0,0,0],tokens:0,annualSaved:[0,0,0,0,0],annualEbit:[0,0,0,0,0],annualCapex:[0,0,0,0,0],annualSetup:[0,0,0,0,0],saved:0,ebit:0,capex:0,setup:0,cash:0,dc:'Verona',unknownCarbon:0,unknownOTIF:0});

const PROJECT_ACTIONS = MODEL.actions.map(a => ({...a,area:a.category,cost:a.opex+a.dep,
  co2Unknown:a.co2===null,co2:a.co2??0, quality:a.source,year:a.year??0,
  note:`${a.note}. Source: ${a.source}`,edited:{}}));
const ORIGINAL = structuredClone(PROJECT_ACTIONS);
let actions = structuredClone(ORIGINAL);
let frontier=[], selected=null, evaluated=0, running=false, lastOptions=null;
let lastEngine='exact', inspectedBenchmark=false, hasEdits=false;
const aMap = () => new Map(actions.map(a=>[a.id,a]));
const energyRows = new Map(MODEL.source.Energy.rows.filter(r=>typeof r[0]==='string').map(r=>[r[0],r]));
const assumptions = new Map(MODEL.source.Assumptions.rows.filter(r=>typeof r[0]==='string').map(r=>[r[0],r[1]]));
const coreIds = new Set([
  ...MODEL.metadata.team25.Distribution,...MODEL.metadata.team25.Transportation,
  ...MODEL.metadata.team25.Energy,
  ...['Alpha','Beta','Gamma','Lactose'].flatMap(n=>[1,2,3].map(k=>`${n}${k}`)),
  'Pack1','Pack2','Pack3'
]);
function currentOptions() {
  return {weight:Number($('weight').value)/100,scope:$('scope').value, guard:$('ebit-guard').value,
    normalization:$('normalization').value,
    timing:$('timing').value,cap:$('cap').value===''?Infinity:Number($('cap').value),
    minEbit:$('min-ebit').value===''?-Infinity:Number($('min-ebit').value),
    beam:Number($('breadth').value),baseline:Number($('baseline-ebit').value)||MODEL.metadata.baselineEBIT,
    inventory:$('inventory').checked,pvUse:Number($('pv-utilization').value)/100,
    riskFilter:$('risk-filter').checked};
}
function isReferenceEligible(o=currentOptions()) {
  return !hasEdits && o.scope==='core' && o.timing==='flexible' && !o.inventory && o.pvUse===1 &&
    o.cap===Infinity && o.minEbit===-Infinity;
}
function selectedMode(o=currentOptions()) {
  return REFERENCE.modes[o.normalization] || REFERENCE.modes.bounded;
}
function scoreForMode(s, mode='bounded', w=currentOptions().weight) {
  const b=REFERENCE.modes[mode].anchors;
  return w*(s.saved-b.carbonLow)/(b.carbonHigh-b.carbonLow) +
    (1-w)*(s.ebit-b.ebitLow)/(b.ebitHigh-b.ebitLow);
}
function score(s,w=currentOptions().weight) {
  return scoreForMode(s,currentOptions().normalization,w);
}
function requiredEbitFloor(o=currentOptions()) {
  const mode=selectedMode(o);
  const selectedGuard=o.guard==='nonnegative'?0:o.guard==='loss1m'?-1000000:-Infinity;
  return Math.max(mode.financialFloor??-Infinity,selectedGuard);
}
function correctedAction(base,o) {
  const a={...base};
  if(a.category==='Energy' && o.pvUse<1 && !base.edited?.co2 && !base.edited?.cost) {
    const e=energyRows.get(a.id);
    if(e && e[1]==='PV') {
      const utilized=Number(e[15])*o.pvUse, produced=Number(e[11]);
      const grid=Number(assumptions.get('Grid EF')), price=Number(assumptions.get('Grid electricity price'));
      const days=Number(assumptions.get('Days/year'));
      a.co2=(utilized*grid-produced*Number(e[6]))/1000;
      a.opex=Number(e[9])*days-utilized*price;
      a.cost=a.opex+a.dep;
      a.quality='PV utilization sensitivity';
      a.note+=` Sensitivity: ${Math.round(o.pvUse*100)}% of workbook-used PV power.`;
    }
  }
  return a;
}
function validAction(a,o) {
  if(!Number.isFinite(a.cost)||!Number.isFinite(a.co2)||!Number.isFinite(a.tokens))return false;
  if(a.category==='Stock' && !o.inventory)return false;
  if(a.category==='Stock' && o.riskFilter && /higher/i.test(a.risk||''))return false;
  if(o.scope==='team' && !a.team)return false;
  if(o.scope==='core' && !coreIds.has(a.id))return false;
  return true;
}

/* Simple single-action yearly profiles, with setup in start year and running
   operational costs throughout the remaining implementation horizon. */
function singleBundle(a,y) {
  const v=initialValue();v.picks=[{id:a.id,y,tokens:a.tokens,fromTier:0,toTier:a.tokens}];
  v.yt[y]=a.tokens;v.tokens=a.tokens;
  v.annualCapex[y]=a.capex;v.annualSetup[y]=a.setup;
  v.annualEbit[y]-=a.setup;v.capex=a.capex;v.setup=a.setup;
  v.dc=a.group==='dc'?a.dc:'any';
  v.unknownCarbon=Number(!!a.co2Unknown);v.unknownOTIF=Number(a.risk==='unknown');
  for(let t=y;t<HORIZON;t++) {
    v.annualSaved[t]+=a.co2;v.annualEbit[t]-=a.cost;
    v.saved+=a.co2;v.ebit-=a.cost;v.cash+=a.dep-a.cost;
  }
  v.ebit-=a.setup;v.cash-=a.capex+a.setup;
  return v;
}
/* The professor's packaging rule explicitly allows progression.
   levels[t] is the full adoption tier in year t (0/33/66/100%). A transition
   from level k to j costs j-k tokens. Setup is charged only at first adoption. */
function packagingBundle(levels, lookup=aMap()) {
  const v=initialValue();v.dc='any';
  let previous=0;
  for(let t=0;t<HORIZON;t++) {
    const k=levels[t];
    if(k<previous||k>3||k<0)throw Error('Packaging tier sequence must be nondecreasing 0..3.');
    if(k>previous) {
      const a=lookup.get(`Pack${k}`); if(!a)throw Error('Missing workbook packaging tier');
      const d=k-previous;
      v.yt[t]=d;v.tokens+=d;
      v.picks.push({id:a.id,y:t,tokens:d,fromTier:previous,toTier:k});
      if(previous===0){v.setup=a.setup;v.annualSetup[t]=a.setup;v.annualEbit[t]-=a.setup;v.ebit-=a.setup;v.cash-=a.setup;}
      v.unknownOTIF=1;
    }
    if(k) {
      const a=lookup.get(`Pack${k}`);
      v.annualSaved[t]=a.co2;v.annualEbit[t]-=a.cost;
      v.saved+=a.co2;v.ebit-=a.cost;v.cash+=a.dep-a.cost;
    }
    previous=k;
  }
  return v;
}
function packagingProfiles(lookup=aMap(), mode='core', preferred=false) {
  if(mode==='team') return (preferred?[2]:[0,1,2,3,4]).map(y=>packagingBundle(Array.from({length:5},(_,t)=>t>=y?1:0),lookup));
  const results=[];
  function enumerate(pos,minimum,sofar) {
    if(pos===5){if(sofar[4]>0 && (!preferred || sofar.slice(0,2).every(x=>x===0)))results.push(packagingBundle(sofar,lookup));return;}
    for(let k=minimum;k<=3;k++)enumerate(pos+1,k,[...sofar,k]);
  }
  enumerate(0,0,[]);
  return results;
}
function sumProfiles(base,addition) {
  const s={...base,picks:[...base.picks,...addition.picks]};
  for(const f of ['yt','annualSaved','annualEbit','annualCapex','annualSetup'])
    s[f]=base[f].map((x,i)=>x+addition[f][i]);
  for(const f of ['tokens','saved','ebit','capex','setup','cash','unknownCarbon','unknownOTIF'])
    s[f]=base[f]+addition[f];
  s.dc=addition.dc==='any'?base.dc:addition.dc;
  return s;
}
function respectsHardRules(s,lookup=aMap()) {
  if(s.tokens>TOKEN_CAP || s.yt.some(n=>n>ANNUAL_CAP||n<0) || s.tokens!==s.yt.reduce((x,y)=>x+y,0))return false;
  let dc='Verona',packTier=0,packStages=[],family=new Set();
  for(const p of s.picks) {
    const a=lookup.get(p.id);
    if(!a||p.y<0||p.y>4)return false;
    if(a.group==='pack'){packStages.push(p);continue;}
    if(family.has(a.group))return false;
    family.add(a.group);
    if(a.group==='dc') {if(p.y!==0)return false;dc=a.dc;}
  }
  if(packStages.length) {
    packStages.sort((a,b)=>a.y-b.y||a.toTier-b.toTier);
    for(const p of packStages) {
      if(p.fromTier!==packTier || p.toTier<=packTier || p.toTier>3 || p.tokens!==p.toTier-packTier) return false;
      if(p.id!==`Pack${p.toTier}`)return false;
      packTier=p.toTier;
    }
  }
  return s.picks.every(p=>{const a=lookup.get(p.id);return a.category!=='Transportation'||a.dc===dc;});
}
const searchWeights=[0,.125,.25,.375,.5,.625,.75,.875,1];
function scalar(s,w){return score(s,w);}
function trim(states,limit) {
  if(states.length<=limit)return states;
  const grouped=new Map();
  for(const s of states) {
    const key=`${s.tokens}:${s.yt.join('')}:${s.dc}`;
    let arr=grouped.get(key);if(!arr){arr=searchWeights.map(()=>null);grouped.set(key,arr);}
    for(let j=0;j<searchWeights.length;j++) {
      const val=scalar(s,searchWeights[j]);
      if(!arr[j] || val>arr[j].v)arr[j]={v:val,s};
    }
  }
  let pool=[...new Set([...grouped.values()].flatMap(x=>x.filter(Boolean).map(x=>x.s)))];
  if(pool.length<=limit)return pool;
  const lists=searchWeights.map(w=>pool.slice().sort((a,b)=>scalar(b,w)-scalar(a,w)));
  let chosen=[],used=new Set();
  while(chosen.length<limit) {
    let found=false;
    for(const list of lists) {
      const p=list.find(x=>!used.has(x));
      if(p){used.add(p);chosen.push(p);found=true;if(chosen.length>=limit)break;}
    }
    if(!found)break;
  }
  return chosen;
}
function pareto(states) {
  const dedupe=new Map();
  for(const s of states){const k=`${Math.round(s.saved*1000)}|${Math.round(s.ebit)}`;if(!dedupe.has(k)||s.tokens<dedupe.get(k).tokens)dedupe.set(k,s);}
  const all=[...dedupe.values()].sort((a,b)=>b.saved-a.saved||b.ebit-a.ebit);
  let e=-Infinity;let out=[];
  for(const s of all)if(s.ebit>e+1e-6){out.push(s);e=s.ebit;}
  return out;
}
function groups(o,rows) {
  const set=new Set(rows.map(a=>a.group));
  const preferred=['dc','energy','alpha','beta','gamma','lactose','pack'];
  return [...preferred.filter(x=>set.has(x)),...([...set].filter(x=>!preferred.includes(x)).sort())];
}
function exactDataForGuard(guard) {
  const mode=selectedMode();
  return mode.guards[guard] || mode.guards.none;
}
function loadExact() {
  if(!isReferenceEligible()) {
    $('status').textContent='Exact reference needs unedited core 30, flexible years and workbook defaults';
    return false;
  }
  lastOptions=currentOptions();lastEngine='exact';inspectedBenchmark=false;
  const guard=exactDataForGuard(lastOptions.guard);
  const optionset=Object.values(guard.weighted);
  const extra=lastOptions.guard==='none'?selectedMode(lastOptions).solutions:[];
  frontier=pareto([...optionset,...extra]);
  selected=guard.weighted[lastOptions.weight.toFixed(2)];
  evaluated=REFERENCE.solves;
  $('status').textContent=`Exact MILP · ${lastOptions.normalization==='bounded'?'bounded €8.385m EBIT-loss limit':'unrestricted reference'} · ${REFERENCE.binaryColumns} binary columns · ${lastOptions.guard}`;
  render();return true;
}
async function runApprox() {
  if(running)return;
  running=true;lastEngine='heuristic';inspectedBenchmark=false;
  const o=currentOptions();lastOptions=o;
  $('run-main').disabled=true;$('status').textContent='Exploring feasible schedules…';
  frontier=[];selected=null;evaluated=0;
  const rows=actions.map(a=>correctedAction(a,o)).filter(a=>validAction(a,o));
  const byId=new Map(rows.map(a=>[a.id,a]));
  let states=[initialValue()];
  for(const [gi,group] of groups(o,rows).entries()) {
    const candidates=[];
    if(group==='pack') {
      const packLookup=new Map(['Pack1','Pack2','Pack3'].map(k=>[k,correctedAction(actions.find(a=>a.id===k),o)]));
      candidates.push(...packagingProfiles(packLookup,o.scope,o.timing==='preferred'));
    } else {
      for(const a of rows.filter(a=>a.group===group)) {
        const years=a.group==='dc'?[0]:o.timing==='preferred'?[Math.min(4,Math.max(0,Number(a.year)||0))]:[0,1,2,3,4];
        for(const y of years)candidates.push(singleBundle(a,y));
      }
    }
    const expanded=[];
    for(const s of states) {
      expanded.push(s);
      for(const c of candidates) {
        if(c.dc!=='any'&&group!=='dc'&&c.dc!==s.dc)continue;
        if(s.tokens+c.tokens>TOKEN_CAP||s.capex+c.capex>o.cap)continue;
        if(s.yt.some((n,t)=>n+c.yt[t]>ANNUAL_CAP))continue;
        expanded.push(sumProfiles(s,c));
      }
    }
    evaluated+=expanded.length;
    states=trim(expanded,o.beam);
    $('status').textContent=`Exploring ${gi+1} model families · ${fmt(evaluated)} evaluations`;
    if(gi%2===0)await new Promise(r=>setTimeout(r,0));
  }
  const floor=requiredEbitFloor(o);
  const valid=states.filter(s=>respectsHardRules(s,byId)&&s.ebit>=floor-0.0001&&o.baseline+s.annualEbit[4]>=o.minEbit);
  frontier=pareto(valid);
  selected=frontier.length?frontier.reduce((best,s)=>score(s,o.weight)>score(best,o.weight)?s:best,frontier[0]):null;
  running=false;$('run-main').disabled=false;
  $('status').textContent=frontier.length?`Heuristic · ${fmt(evaluated)} screened profiles`:'No feasible strategy found';
  render();
}
async function run() {
  if(running)return;
  if(!loadExact())await runApprox();
}
function inspectStrategy(i) {
  const s=frontier[i];if(!s)return;
  selected=s;inspectedBenchmark=false;render();openPlan();
}
function openPlan() {
  const nav=document.querySelector('button[data-view="strategies"]');
  if(nav?.click)nav.click();
  const head=$('plan-heading');
  head.textContent=`Inspecting strategy · ${selected.picks.length} implementation steps · ${selected.tokens}/10 tokens`;
  head.setAttribute('tabindex','-1');
  if(head.scrollIntoView)head.scrollIntoView({behavior:'smooth',block:'start'});
  if(head.focus)head.focus({preventScroll:true});
  setTimeout(()=>{if(head.scrollIntoView)head.scrollIntoView({behavior:'smooth',block:'start'});},120);
}
function viewTeammate() {
  if(!loadExact())return;
  selected=REFERENCE.teammate;inspectedBenchmark=true;
  render();openPlan();
}
function selectForWeight(){
  $('weight-value').textContent=`${fmt(currentOptions().weight*100)}%`;
  if(lastEngine==='exact'&&isReferenceEligible())loadExact();
  else if(frontier.length){selected=frontier.reduce((b,s)=>score(s)>score(b)?s:b,frontier[0]);render();}
}
function navigation(){document.querySelectorAll('button[data-view]').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('button[data-view]').forEach(x=>x.classList.toggle('active',x===b));
  document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id==='view-'+b.dataset.view));
  if(window.scrollTo)window.scrollTo({top:0,behavior:'smooth'});
}));}
function render() {
  const opt=currentOptions();
  $('weight-value').textContent=`${fmt(opt.weight*100)}%`;
  $('pv-utilization-value').textContent=`${fmt(opt.pvUse*100)}%`;
  const b=selectedMode(opt).anchors;
  $('model-anchors').textContent=`${opt.normalization==='bounded'?'Financially bounded payoff table':'Unrestricted mathematical payoff table'} · R_Emax = ${fmt(b.carbonLow,2)} t · R_max = ${fmt(b.carbonHigh,2)} t · E_Rmax = ${euros(b.ebitLow)} · E_max = ${euros(b.ebitHigh)}. ${opt.normalization==='bounded'?'Cumulative ΔEBIT ≥ −€8,384,875.34 applies to every candidate.':'This mode is retained for comparison and allows economically extreme portfolios.'}`;
  $('reference-status').textContent=opt.normalization==='bounded'?'FINANCIALLY BOUNDED · DEFAULT':'UNRESTRICTED · REFERENCE';
  $('reference-price').textContent=`€${fmt((b.ebitHigh-b.ebitLow)/(b.carbonHigh-b.carbonLow),0)} / t CO₂`;
  $('reference-price-label').textContent='Implicit five-year EBIT sacrifice per extra tonne at 50/50 (reference normalization)';
  $('anchor-rmax').textContent=fmt(b.carbonHigh,2)+' t';
  $('anchor-ermax').textContent=euros(b.ebitLow);
  $('anchor-remax').textContent=fmt(b.carbonLow,2)+' t';
  $('anchor-emax').textContent=euros(b.ebitHigh);
  if(!selected){
    for(const id of ['metric-co2','metric-ebit','metric-final','metric-tokens','metric-score','metric-cash'])$(id).textContent='—';
    $('pareto').innerHTML='<div class="notice">No strategies available. Run optimization.</div>';
    for(const id of ['year-chart','selected-tags','token-years','frontier-table','plan-table','action-table'])$(id).innerHTML='';
    $('frontier-count').textContent='0 points';$('strategy-total').textContent='0 solutions';
    $('search-note').textContent='Run the optimizer to generate strategies.';
    return;
  }
  $('metric-co2').textContent=fmt(selected.saved,1)+' t';
  $('metric-ebit').textContent=briefEuro(selected.ebit);
  $('metric-final').textContent=briefEuro(selected.annualEbit[4]);
  $('metric-tokens').textContent=`${selected.tokens} / 10`;
  $('metric-score').textContent=fmt(score(selected)*100,2)+'%';
  $('metric-cash').textContent=briefEuro(selected.cash);
  $('frontier-count').textContent=`${frontier.length} sampled points`;
  $('strategy-total').textContent=`${frontier.length} alternatives`;
  $('search-note').className=lastEngine==='exact'?'notice good':'notice';
  $('search-note').textContent=lastEngine==='exact'
    ?`CERTIFIED SCORE OPTIMUM at the selected 5%-increment weight, for the 30-choice core and selected EBIT guardrail. ${REFERENCE.binaryColumns} MILP columns, including ${REFERENCE.packPatternCount} progressive packaging patterns. ${opt.normalization==='bounded'?'Financially bounded mode enforces the €8.385m cumulative EBIT-loss floor.':'Unrestricted academic reference mode allows high EBIT losses.'} The plotted Pareto points are a sampled—not exhaustive—set.${inspectedBenchmark?' You are inspecting your teammate’s benchmark, not the certified optimizer selection.':''}`
    :`APPROXIMATE scenario search: ${fmt(evaluated)} candidate profiles tested. Scores use the selected, fixed workbook-core reference endpoints. Bounded mode enforces its financial floor even during exploratory screening; inputs and anchors are not recalculated after edits. This is not a global optimality certificate.`;
  $('tokens-label').textContent=`${selected.tokens} / 10`;
  $('token-progress').style.width=`${selected.tokens*10}%`;
  $('plan-count').textContent=`${selected.picks.length} steps`;
  $('token-years').innerHTML=selected.yt.map((v,i)=>`<div class="year"><small>YEAR ${i}</small><strong>${v} / 3</strong></div>`).join('');
  const lookup=aMap();
  $('selected-tags').innerHTML=selected.picks.length?selected.picks.map(p=>{
    const a=lookup.get(p.id);return `<span class="tag" title="${p.tokens} tokens in year ${p.y}">${esc(a?.name||p.id)} · Y${p.y}${p.fromTier>0?' · upgrade':''}</span>`;
  }).join(''):'<span class="hint">Baseline: no interventions</span>';
  renderPareto();renderYear();renderFrontierTable();renderPlan();
}
function svgOpen(w,h){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Sampled Pareto frontier, emissions against EBIT">`;}
function renderPareto(){
  const w=750,h=350,x0=78,x1=726,y0=22,y1=289;
  const data=frontier.length?frontier:[selected];
  const xs=data.map(s=>BASE_CO2*5-s.saved),ys=data.map(s=>s.ebit);
  const xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);
  const xp=v=>x0+(v-xmin)/(xmax-xmin||1)*(x1-x0),yp=v=>y1-(v-ymin)/(ymax-ymin||1)*(y1-y0);
  let out=svgOpen(w,h);
  for(let i=0;i<=5;i++){
    const x=x0+(x1-x0)*i/5,y=y0+(y1-y0)*i/5;
    out+=`<line class="gridline" x1="${x}" y1="${y0}" x2="${x}" y2="${y1}"/><line class="gridline" x1="${x0}" y1="${y}" x2="${x1}" y2="${y}"/>`;
    out+=`<text class="axis" x="${x}" y="${h-40}" text-anchor="middle">${fmt(xmin+(xmax-xmin)*i/5,0)}</text>`;
    out+=`<text class="axis" x="${x0-10}" y="${y+4}" text-anchor="end">${briefEuro(ymax-(ymax-ymin)*i/5)}</text>`;
  }
  out+=`<text class="axis" x="${w/2}" y="${h-10}" text-anchor="middle">Five-year CO₂ emissions (tonnes) · lower is better ←</text><text class="axis" transform="translate(18 ${h/2}) rotate(-90)" text-anchor="middle">Five-year Δ EBIT (€) · higher is better ↑</text>`;
  const ordered=data.slice().sort((a,b)=>a.saved-b.saved);
  if(ordered.length>1)out+=`<polyline points="${ordered.map(s=>`${xp(BASE_CO2*5-s.saved)},${yp(s.ebit)}`).join(' ')}" fill="none" stroke="#64eccb66" stroke-width="2"/>`;
  data.forEach((s,i)=>{const active=s===selected;
    out+=`<circle class="pareto-dot" data-i="${i}" cx="${xp(BASE_CO2*5-s.saved)}" cy="${yp(s.ebit)}" r="${active?7:5}" fill="${active?'#8ebcff':'#64eccb'}" stroke="#0b2830" stroke-width="1.5" tabindex="0" role="button"><title>${fmt(s.saved,2)} t CO₂ avoided · ${euros(s.ebit)} EBIT · score ${fmt(score(s)*100,2)}%</title></circle>`;
  });out+='</svg>';
  $('pareto').innerHTML=out;
  $('pareto').querySelectorAll('.pareto-dot').forEach(dot=>{
    dot.addEventListener('click',()=>inspectStrategy(Number(dot.dataset.i)));
    dot.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault?.();inspectStrategy(Number(dot.dataset.i));}});
    dot.addEventListener('mouseenter',e=>{const s=data[Number(dot.dataset.i)],tip=$('tooltip');
      tip.textContent=`CO₂ ${fmt(s.saved,1)} t · Δ EBIT ${briefEuro(s.ebit)} · Score ${fmt(score(s)*100,1)}%`;
      tip.hidden=false;tip.style.left=(e.clientX+12)+'px';tip.style.top=(e.clientY+10)+'px';});
    dot.addEventListener('mouseleave',()=>{$('tooltip').hidden=true;});
  });
}
function renderYear(){
  const s=selected,w=750,h=275,l=64,r=28,t=25,b=44;
  const annual=s.annualSaved.map(v=>BASE_CO2-v);
  const min=Math.min(...annual,BASE_CO2)-50,max=Math.max(...annual,BASE_CO2)+50;
  const x=i=>l+(w-l-r)*i/4,y=v=>t+(max-v)/(max-min)*(h-t-b);
  let out=svgOpen(w,h);
  for(let j=0;j<5;j++){
    const yy=t+(h-t-b)*j/4;
    out+=`<line class="gridline" x1="${l}" y1="${yy}" x2="${w-r}" y2="${yy}"/><text class="axis" x="${l-8}" y="${yy+4}" text-anchor="end">${fmt(max-(max-min)*j/4,0)} t</text>`;
  }
  out+=`<line x1="${l}" y1="${y(BASE_CO2)}" x2="${w-r}" y2="${y(BASE_CO2)}" stroke="#d2e58b" stroke-dasharray="7 7"/>`;
  out+=`<polyline fill="none" stroke="#64eccb" stroke-width="3" points="${annual.map((v,i)=>`${x(i)},${y(v)}`).join(' ')}"/>`;
  annual.forEach((v,i)=>{out+=`<circle cx="${x(i)}" cy="${y(v)}" r="5" fill="#64eccb"/><text class="axis" x="${x(i)}" y="${h-17}" text-anchor="middle">YEAR ${i}</text><text class="axis" x="${x(i)}" y="${Math.max(12,y(v)-12)}" text-anchor="middle">${fmt(v,0)}</text>`;});
  $('year-chart').innerHTML=out+'</svg>';
}
function renderFrontierTable(){
  const sorted=frontier.slice().sort((a,b)=>score(b)-score(a));
  $('frontier-table').innerHTML=sorted.slice(0,80).map((s,i)=>{
    const ix=frontier.indexOf(s);
    return `<tr class="${s===selected?'active':''}"><td>#${i+1}</td><td class="right">${fmt(s.saved,2)}</td><td class="right ${s.ebit>=0?'positive':'negative'}">${euros(s.ebit)}</td><td class="right">${euros(s.annualEbit[4])}</td><td class="right">€${fmt(s.capex)}</td><td class="right">${s.tokens}</td><td class="right">${fmt(score(s)*100,2)}%</td><td><button data-inspect="${ix}">Inspect</button></td></tr>`;
  }).join('');
  $('frontier-table').querySelectorAll('button[data-inspect]').forEach(b=>b.addEventListener('click',()=>inspectStrategy(Number(b.dataset.inspect))));
}
function renderPlan(){
  $('plan-heading').textContent=`${inspectedBenchmark?'Teammate benchmark':'Selected strategy'} · ${selected.picks.length} steps · ${selected.tokens}/10 tokens`;
  $('plan-table').innerHTML=selected.yt.map((v,i)=>`<tr><td>Year ${i}</td><td>${v} / 3</td><td class="right positive">${fmt(selected.annualSaved[i],2)} t</td><td class="right ${selected.annualEbit[i]>=0?'positive':'negative'}">${euros(selected.annualEbit[i])}</td><td class="right">€${fmt(selected.annualCapex[i])}</td><td class="right">€${fmt(selected.annualSetup[i])}</td></tr>`).join('')+
    `<tr class="active"><td><b>Five-year total</b></td><td>${selected.tokens}/10</td><td class="right"><b>${fmt(selected.saved,2)} t</b></td><td class="right"><b>${euros(selected.ebit)}</b></td><td class="right">€${fmt(selected.capex)}</td><td class="right">€${fmt(selected.setup)}</td></tr>`;
  const lookup=aMap();
  $('action-table').innerHTML=selected.picks.slice().sort((a,b)=>a.y-b.y).map(p=>{
    const a=lookup.get(p.id);if(!a)return '';
    let annual=a.co2,annualCost=a.cost,name=a.name;
    let note=a.note;
    if(a.group==='pack') {
      const prior=p.fromTier?lookup.get(`Pack${p.fromTier}`):null;
      annual-=prior?.co2||0;annualCost-=prior?.cost||0;
      name+=` · ${fmt((prior?.share||0)*100)}% → ${fmt(a.share*100)}%`;
      note+=` Incremental ${p.tokens} token(s); single €75k setup only at first adoption.`;
    }
    return `<tr><td>${esc(name)}</td><td>Year ${p.y}</td><td>${p.tokens}</td><td class="right">${a.co2Unknown?'Unknown (0 screening proxy)':fmt(annual,2)+' t'}</td><td class="right">${euros(annualCost)}</td><td>${esc(note)}</td></tr>`;
  }).join('');
  $('benchmark-compare').textContent=lastEngine==='exact'
    ?`Your teammate's plan: ${fmt(REFERENCE.teammate.saved,2)} t avoided; ${euros(REFERENCE.teammate.ebit)} Δ EBIT; ${fmt(score(REFERENCE.teammate)*100,2)}% score under ${currentOptions().normalization} normalization. Select “Inspect teammate plan” to examine it.`
    :`Workbook inputs are editable, but the teammate benchmark and normalization anchors for either mode always refer to the unchanged workbook. Re-run exact MILP in Python after substantive input edits.`;
}
function renderAudit() {
  const warnings=[
    ['No preset answer leakage','The extractor imports only Inputs, Assumptions, Routing, Suppliers, DC Locations, Energy, Transport, Stock Policies, Actions. Dashboard, Schedule, Audit and historical Sensitivity are excluded.'],
    ['Payoff-table normalization','Core exact scores use separately proven EBIT-only and CO₂-only extremes, not minima/maxima of a truncated browser frontier. The professor has not specified an official score formula. Financially bounded mode recomputes BOTH R_max and its associated E_Rmax under the stated EBIT floor; the €8.385m threshold is a decision preference, NOT a 90–95% confidence interval.'],
    ['EBIT safeguards are scenarios','The default €8.385m loss boundary and additional guardrails (no five-year loss, or max €1m loss) are user-selected business preferences, not a professor-imposed project constraint.'],
    ['Inventory and service effects','Stock-policy CO₂ and OTIF effects remain unquantified. Stock carrying-cost proxies are OFF by default and excluded from the certified 30-action core.'],
    ['Progressive adoption','Slide 25 permits progressive packaging; charging only the incremental tokens for later upgrades is our explicit assumption, not a confirmed professor rule. Supplier sourcing remains a single 33/66/100% choice because staged sourcing is not established in the source.'],
    ['Energy and routing assumptions','The updated workbook uses daily-average PV matching. Distance/mass regional estimates and grid emission factors are assumptions, not measured company shipment records.'],
    ['Cash and EBIT are different','Annual EBIT = negative OpEx change less depreciation, with setup in adoption year. CapEx is deducted only from cash, not twice from EBIT.']
  ];
  $('audit').innerHTML=warnings.map(([h,d])=>`<div class="audit-row"><b>${esc(h)}</b><p>${esc(d)}</p></div>`).join('');
}
function visibleActions(o=currentOptions()) {
  if(o.scope==='team')return actions.filter(a=>a.team);
  if(o.scope==='core')return actions.filter(a=>coreIds.has(a.id));
  return actions;
}
function renderData() {
  const o=currentOptions();
  const rows=visibleActions(o);
  $('data-count').textContent=`${rows.length} source alternatives`;
  $('data-table').innerHTML=rows.map(a=>`<tr><td><b>${esc(a.name||a.id)}</b><div class="q source">${esc(a.source)}</div></td>${['tokens','co2','cost','capex','setup','dep','year'].map(k=>`<td><input type="number" step="any" data-id="${esc(a.id)}" data-edit="${k}" value="${a.co2Unknown&&k==='co2'?'':Number(a[k]??0)}" placeholder="${a.co2Unknown&&k==='co2'?'unknown':''}"/></td>`).join('')}<td>${esc(a.quality||a.risk)}</td></tr>`).join('');
  $('data-table').querySelectorAll('input[data-edit]').forEach(input=>input.addEventListener('change',()=>{
    const a=actions.find(x=>x.id===input.dataset.id);
    if(!a)return;
    const field=input.dataset.edit;
    if(field==='co2'&&input.value===''){a.co2=0;a.co2Unknown=true;}
    else {const n=Number(input.value);if(!Number.isFinite(n))return; a[field]=n;if(field==='co2')a.co2Unknown=false;}
    a.edited[field]=true;hasEdits=true;
    frontier=[];selected=null;render();$('status').textContent='Workbook input edited · exact reference disabled until reset';
  }));
}
function renderResearch() {
  const papers=[
    ['Naeeni & Sabbaghi (2022)','Multi-objective supply-chain design and normalized normal constraint','https://doi.org/10.1016/j.ijpe.2022.108483'],
    ['Mohebalizadehgashti et al. (2020)','Economic/environmental MILP; augmented ε-constraint frontier','https://doi.org/10.1016/j.ijpe.2019.07.007'],
    ['Ameknassi et al. (2016)','Stochastic, multi-period green supply-chain configuration','https://doi.org/10.1016/j.ijpe.2016.08.031'],
    ['Sepehri et al. (2024)','Integrated supply-chain reliability, emissions and cost objectives','https://doi.org/10.1007/s10479-024-05961-2']
  ];
  $('research-papers').innerHTML=papers.map(([name,theme,url])=>`<div class="formula"><h3><a target="_blank" rel="noopener" href="${url}">${esc(name)} ↗</a></h3><p>${esc(theme)}. Methodological background only; not a numeric source.</p></div>`).join('');
}
function download(name,content,mime) {
  const b=new Blob([content],{type:mime}),u=URL.createObjectURL(b),a=document.createElement('a');
  a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(u);
}
function exportCsv(){
  if(!frontier.length){alert('Run optimization first.');return;}
  const lines=['rank,co2_saved_t_5y,delta_EBIT_eur_5y,net_cash_eur,year4_EBIT_eur,tokens,normalized_score,steps'];
  frontier.slice().sort((a,b)=>score(b)-score(a)).forEach((s,i)=>{
    const fields=[i+1,s.saved.toFixed(5),s.ebit.toFixed(2),s.cash.toFixed(2),s.annualEbit[4].toFixed(2),s.tokens,score(s).toFixed(7),JSON.stringify(s.picks)];
    lines.push(fields.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(','));
  });download('LAMAK_v6_Pareto.csv',lines.join('\n'),'text/csv');
}
function exportPlan() {
  if(!selected){alert('No selected strategy');return;}
  const output={version:'v6',source:MODEL.metadata.sourceFile,excludedSheets:MODEL.metadata.sourceExcludedSheets,
    solver:lastEngine,optimality:lastEngine==='exact'?'Exact at selected 5% weight and guard':'Heuristic only',
    preferenceWeight:currentOptions().weight,guard:currentOptions().guard,normalizationMode:currentOptions().normalization,normalization:selectedMode().anchors,financialFloor:requiredEbitFloor(),
    originalUnrestrictedAnchors:REFERENCE.modes.unrestricted.anchors,
    selected:{...selected,score:score(selected),carbonReductionPct:selected.saved/(BASE_CO2*HORIZON)*100,year4CarbonReductionPct:selected.annualSaved[4]/BASE_CO2*100,
      year4EbitPct:selected.annualEbit[4]/currentOptions().baseline*100},
    caveats:['No measured OTIF impacts','Stock holding-cost and CO2 assumptions not validated','Workbook logistics and energy assumptions are modeled estimates']};
  download('LAMAK_v6_Selected_Plan.json',JSON.stringify(output,null,2),'application/json');
}
function exportModel(){return JSON.stringify({version:6,actions:actions.map(a=>({id:a.id,tokens:a.tokens,co2:a.co2,cost:a.cost,capex:a.capex,setup:a.setup,dep:a.dep,year:a.year,edited:a.edited}))},null,2);}
function save(){
  try{localStorage.setItem(STORE,JSON.stringify({version:6,actions:actions.filter(a=>Object.keys(a.edited).length).map(a=>({id:a.id,tokens:a.tokens,co2:a.co2,cost:a.cost,capex:a.capex,setup:a.setup,dep:a.dep,year:a.year,edited:a.edited})),options:Object.fromEntries(['scope','weight','timing','cap','min-ebit','breadth','baseline-ebit','inventory','risk-filter','pv-utilization','ebit-guard','normalization'].map(id=>[id,$(id).type==='checkbox'?$(id).checked:$(id).value]))}));
    $('status').textContent='Inputs saved locally in this browser';
  }catch(e){alert('Local save failed: '+e.message);}
}
function readSave(){
  try{const state=JSON.parse(localStorage.getItem(STORE)||'null');if(!state||state.version!==6)return;
    const changes=new Map((state.actions||[]).map(a=>[a.id,a]));
    actions=ORIGINAL.map(a=>changes.has(a.id)?{...a,...Object.fromEntries(['tokens','co2','cost','capex','setup','dep','year'].filter(k=>Object.hasOwn(changes.get(a.id),k)).map(k=>[k,changes.get(a.id)[k]])),edited:changes.get(a.id).edited||{}}:structuredClone(a));
    hasEdits=actions.some(a=>Object.keys(a.edited).length>0);
    for(const[id,value] of Object.entries(state.options||{})){const x=$(id);if(x){if(x.type==='checkbox')x.checked=!!value;else x.value=value;}}
  }catch(e){console.warn('Saved model unavailable',e);}
}
function handlers(){
  navigation();
  $('run-main').onclick=run;
  $('load-exact').onclick=()=>loadExact();
  $('show-teammate').onclick=viewTeammate;
  $('rerun').onclick=run;
  $('export-csv').onclick=exportCsv;$('export-csv-2').onclick=exportCsv;
  $('export-plan').onclick=exportPlan;
  $('save').onclick=save;$('export-model').onclick=()=>download('LAMAK_v6_Model_Edits.json',exportModel(),'application/json');
  $('weight').oninput=selectForWeight;
  $('reset').onclick=()=>{if(!confirm('Restore the supplied workbook values and v6 bounded default controls?'))return;
    actions=structuredClone(ORIGINAL);hasEdits=false;
    $('scope').value='core';$('weight').value='50';$('ebit-guard').value='none';$('normalization').value='bounded';$('timing').value='flexible';
    $('inventory').checked=false;$('pv-utilization').value='100';$('cap').value='';$('min-ebit').value='';
    $('baseline-ebit').value=String(MODEL.metadata.baselineEBIT);
    localStorage.removeItem(STORE);
    renderData();loadExact();};
  for(const id of ['scope','timing','cap','min-ebit','breadth','baseline-ebit','inventory','risk-filter','pv-utilization','ebit-guard','normalization']){
    $(id).addEventListener('change',()=>{
      frontier=[];selected=null;render();
      $('status').textContent=id==='scope'?'Choice universe changed · run optimizer':'Settings changed · run optimizer';
      if(id==='scope')renderData();
    });
  }
  $('import').onchange=async e=>{
    const file=e.target.files?.[0];if(!file)return;
    try{const parsed=JSON.parse(await file.text());
      if(!Array.isArray(parsed.actions))throw Error('Must contain a list of workbook action edits');
      const changes=new Map(parsed.actions.map(a=>[a.id,a]));
      if([...changes.keys()].some(id=>!ORIGINAL.some(a=>a.id===id)))throw Error('Unknown action id');
      actions=ORIGINAL.map(a=>changes.has(a.id)?{...a,...Object.fromEntries(['tokens','co2','cost','capex','setup','dep','year'].filter(k=>Object.hasOwn(changes.get(a.id),k)).map(k=>[k,changes.get(a.id)[k]])),edited:changes.get(a.id).edited||{cost:true}}:structuredClone(a));
      hasEdits=true;frontier=[];selected=null;renderData();render();$('status').textContent='Model edits imported · use approximate search';
    }catch(err){alert('Import failed: '+err.message);}e.target.value='';
  };
}
readSave();handlers();renderAudit();renderData();renderResearch();render();setTimeout(run,100);
