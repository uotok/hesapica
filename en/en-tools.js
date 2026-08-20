
(function(){
'use strict';
const $=(id)=>document.getElementById(id);
const $$=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
const form=$('calcForm');
if(!form) return;
const tool=form.dataset.tool;
const resultPanel=$('resultsPanel');
const validationBox=$('validationBox');
const mainResult=$('mainResult');
const resultNote=$('resultNote');
const resultRange=$('rangeResult');
const rangeBox=$('rangeBox');
const kpiBox=$('kpiBox');
const statusBox=$('statusBox');
const detailBox=$('detailBox');
const copyBtn=$('copyBtn'), shareBtn=$('shareBtn'), printBtn=$('printBtn');
let lastResult=null, countdownTimer=null, rateData=null;

function parseNumber(raw){
  if(raw===null||raw===undefined) return null;
  let s=String(raw).trim().replace(/\s+/g,'').replace(/[^\d,.\-+eE]/g,'');
  if(!s) return null;
  if(s.includes(',')&&s.includes('.')){
    if(s.lastIndexOf(',')>s.lastIndexOf('.')) s=s.replace(/\./g,'').replace(',','.');
    else s=s.replace(/,/g,'');
  }else if(s.includes(',')){
    const parts=s.split(',');
    if(parts.length>2 || (parts.length===2 && parts[1].length===3 && parts[0].length>=1)) s=s.replace(/,/g,'');
    else s=s.replace(',','.');
  }
  const n=Number(s);
  return Number.isFinite(n)?n:null;
}
function num(id){const el=$(id);return el?parseNumber(el.value):null}
function txt(id){const el=$(id);return el?String(el.value||'').trim():''}
function checked(id){const el=$(id);return !!(el&&el.checked)}
function fmt(n,d=2){if(!Number.isFinite(n))return '—';return new Intl.NumberFormat('en-US',{maximumFractionDigits:d}).format(n)}
function pct(n,d=2){return Number.isFinite(n)?fmt(n,d)+'%':'—'}
function money(n,code=''){if(!Number.isFinite(n))return '—';if(code&&code!=='GEN'){try{return new Intl.NumberFormat('en-US',{style:'currency',currency:code,maximumFractionDigits:2}).format(n)}catch(e){}}return fmt(n,2)}
function monthsLabel(m){m=Math.max(0,Math.round(m));const y=Math.floor(m/12),mo=m%12;return [y?`${y} year${y===1?'':'s'}`:'',mo?`${mo} month${mo===1?'':'s'}`:''].filter(Boolean).join(' ')||'0 months'}
function field(id){return $(id)?.closest('.field')}
function invalidate(id,msg){
  const el=$(id), f=field(id); if(f)f.classList.add('invalid');
  if(el)el.setAttribute('aria-invalid','true');
  const er=f?.querySelector('.error'); if(er&&msg)er.textContent=msg;
}
function clearInvalid(){
  $$('.field.invalid').forEach(x=>x.classList.remove('invalid'));
  $$('[aria-invalid="true"]').forEach(x=>x.setAttribute('aria-invalid','false'));
  validationBox?.classList.remove('show');
  if(validationBox)validationBox.textContent='';
}
function fail(message,ids=[]){
  ids.forEach(x=>typeof x==='string'?invalidate(x):invalidate(x[0],x[1]));
  if(validationBox){validationBox.textContent=message;validationBox.classList.add('show');}
  resetResult();
  const first=$('.field.invalid input,.field.invalid select,.field.invalid textarea');
  if(first) first.focus({preventScroll:true});
  return null;
}
function resetResult(){
  lastResult=null;
  if(mainResult)mainResult.textContent='—';
  if(resultNote)resultNote.textContent='Enter valid values and calculate to see the result.';
  if(rangeBox)rangeBox.hidden=true;
  if(kpiBox)kpiBox.innerHTML='';
  if(statusBox)statusBox.innerHTML='<strong>Ready:</strong> Results and assumptions will appear here.';
  if(detailBox)detailBox.innerHTML='';
  [copyBtn,shareBtn,printBtn].forEach(b=>{if(b)b.disabled=true});
}
function render(r){
  if(!r)return;
  lastResult=r;
  mainResult.textContent=r.main??'—';
  resultNote.textContent=r.note||'';
  if(r.range){
    rangeBox.hidden=false;
    const lab=rangeBox.querySelector('.muted'); if(lab)lab.textContent=r.range.label||'Range';
    resultRange.textContent=r.range.value||'—';
    const desc=rangeBox.querySelector('.range-desc'); if(desc)desc.textContent=r.range.note||'';
  }else rangeBox.hidden=true;
  kpiBox.innerHTML=(r.metrics||[]).map(([k,v])=>`<div class="kpi-row"><strong>${escapeHtml(k)}</strong><span>${escapeHtml(String(v))}</span></div>`).join('');
  statusBox.innerHTML=r.status?`<strong>${escapeHtml(r.status.label||'Note')}:</strong> ${escapeHtml(r.status.text||'')}`:'';
  detailBox.innerHTML='';
  if(r.table&&r.table.rows?.length){
    const head=(r.table.headers||[]).map(x=>`<th>${escapeHtml(String(x))}</th>`).join('');
    const rows=r.table.rows.map(row=>`<tr>${row.map(x=>`<td>${escapeHtml(String(x))}</td>`).join('')}</tr>`).join('');
    detailBox.innerHTML=`<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }else if(r.detailHtml){detailBox.innerHTML=r.detailHtml;}
  [copyBtn,shareBtn,printBtn].forEach(b=>{if(b)b.disabled=false});
  persist();
  syncUrl();
  if(window.innerWidth<=760 && resultPanel) resultPanel.scrollIntoView({behavior:'smooth',block:'start'});
}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function serializeResult(){
  if(!lastResult)return '';
  const lines=[document.querySelector('h1')?.textContent||document.title,lastResult.main,lastResult.note||''];
  (lastResult.metrics||[]).forEach(([k,v])=>lines.push(`${k}: ${v}`));
  if(lastResult.status?.text)lines.push(`${lastResult.status.label||'Note'}: ${lastResult.status.text}`);
  return lines.filter(Boolean).join('\n');
}
async function copyText(text){
  try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);return true}}catch(e){}
  try{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();return ok}catch(e){return false}
}
function valuesState(){
  const data={};
  $$('input,select,textarea',form).forEach(el=>{
    if(!el.id||el.dataset.noStore==='1')return;
    data[el.id]=el.type==='checkbox'?el.checked:el.value;
  });
  if(tool==='debt-payoff-calculator'){
    data.__debts=$$('.debt-row',form).map(row=>({
      name:row.querySelector('[data-debt-name]')?.value||'',
      balance:row.querySelector('[data-debt-balance]')?.value||'',
      apr:row.querySelector('[data-debt-apr]')?.value||'',
      min:row.querySelector('[data-debt-min]')?.value||''
    }));
  }
  return data;
}
function applyState(data){
  if(!data||typeof data!=='object')return;
  if(tool==='debt-payoff-calculator'&&Array.isArray(data.__debts)){buildDebtRows(data.__debts)}
  Object.entries(data).forEach(([id,v])=>{
    if(id==='__debts')return;
    const el=$(id);if(!el)return;
    if(el.type==='checkbox')el.checked=!!v; else el.value=v;
  });
  updateModes();
}
function storageKey(){return 'hesapica_en_v4_'+tool}
function persist(){try{localStorage.setItem(storageKey(),JSON.stringify(valuesState()))}catch(e){}}
function restore(){try{const raw=localStorage.getItem(storageKey());if(raw)applyState(JSON.parse(raw))}catch(e){}}
function clearStore(){try{localStorage.removeItem(storageKey())}catch(e){}}
function syncUrl(){
  try{
    if(location.protocol==='file:')return;
    const u=new URL(location.href);u.search='';
    const data=valuesState();
    Object.entries(data).forEach(([k,v])=>{
      if(k==='__debts')return;
      if(v===true)u.searchParams.set(k,'1'); else if(v!==false&&v!==''&&v!==null)u.searchParams.set(k,String(v));
    });
    history.replaceState(null,'',u.pathname+(u.searchParams.toString()?`?${u.searchParams}`:'')+u.hash);
  }catch(e){}
}
function restoreUrl(){
  try{
    const p=new URLSearchParams(location.search); if(!p.size)return;
    p.forEach((v,k)=>{const el=$(k);if(!el)return;if(el.type==='checkbox')el.checked=v==='1'||v==='true';else el.value=v});
  }catch(e){}
}
function updateModes(){
  const mode=txt('mode');
  $$('.mode-btn').forEach(b=>{const on=b.dataset.mode===mode;b.classList.toggle('active',on);b.setAttribute('aria-selected',on?'true':'false')});
  $$('[data-modes]').forEach(el=>{const modes=(el.dataset.modes||'').split(',');el.hidden=!modes.includes(mode)});

  if(tool==='countdown-calculator'){
    const custom=txt('referenceMode')==='custom';
    if($('field_referenceDate'))$('field_referenceDate').hidden=!custom;
  }
  if(tool==='car-monthly-cost-calculator'){
    const show=!!$('includeBattery')?.checked;
    ['batteryCost','batteryYears','batteryKm'].forEach(id=>{if($(`field_${id}`))$(`field_${id}`).hidden=!show});
  }
  if(tool==='age-calculator'){
    const label=$('field_startDate')?.querySelector('label');
    if(label)label.textContent=mode==='elapsed'?'Start date':'Date of birth';
  }
}
function applyPreset(id){
  if(id==='example'&&tool==='countdown-calculator'){const d=new Date(Date.now()+3*864e5+5*36e5);$('eventName').value='Example event';$('targetDate').value=toLocalDateTime(d);$('referenceMode').value='now';calculate();return;}
  if(id==='example'&&tool==='days-between-dates-calculator'){const a=new Date(),b=new Date(Date.now()+45*864e5);$('startDate').value=toDate(a);$('endDate').value=toDate(b);$('startTime').value='';$('endTime').value='';$('inclusive').checked=false;calculate();return;}
  if(id==='example'&&tool==='currency-converter'){if($('amount'))$('amount').value='100';if($('fromCurrency'))$('fromCurrency').value='USD';if($('toCurrency'))$('toCurrency').value='EUR';calculate();return;}
  const p=(PRESETS[tool]||{})[id];if(!p)return;
  if(tool==='debt-payoff-calculator'&&p.__debts)buildDebtRows(p.__debts);
  Object.entries(p).forEach(([k,v])=>{if(k==='__debts')return;const el=$(k);if(!el)return;if(el.type==='checkbox')el.checked=!!v;else el.value=v});
  updateModes();calculate();
}
function commonEvents(){
  form.addEventListener('submit',e=>{e.preventDefault();calculate()});
  form.addEventListener('input',()=>{clearInvalid();persist()});
  form.addEventListener('change',()=>{clearInvalid();updateModes();persist()});
  $$('.mode-btn').forEach(b=>b.addEventListener('click',()=>{const el=$('mode');if(el){el.value=b.dataset.mode;updateModes();persist();resetResult()}}));
  $$('.preset-btn').forEach(b=>b.addEventListener('click',()=>applyPreset(b.dataset.preset)));
  $('exampleBtn')?.addEventListener('click',()=>applyPreset('example'));
  $('resetBtn')?.addEventListener('click',()=>{clearStore();form.reset();if(tool==='debt-payoff-calculator')buildDebtRows(DEFAULT_DEBTS);setupDefaults();updateModes();resetResult();});
  copyBtn?.addEventListener('click',async()=>{const old=copyBtn.textContent;const ok=await copyText(serializeResult());copyBtn.textContent=ok?'Copied':'Copy failed';setTimeout(()=>copyBtn.textContent=old,1400)});
  shareBtn?.addEventListener('click',async()=>{const data={title:document.title,text:serializeResult(),url:location.href};try{if(navigator.share)await navigator.share(data);else{await copyText(`${data.text}\n${data.url}`);const old=shareBtn.textContent;shareBtn.textContent='Copied link';setTimeout(()=>shareBtn.textContent=old,1400)}}catch(e){if(e?.name!=='AbortError')await copyText(`${data.text}\n${data.url}`)}});
  printBtn?.addEventListener('click',()=>window.print());
}
function setupDefaults(){
  if(tool==='countdown-calculator'&&!txt('targetDate')){const d=new Date(Date.now()+7*864e5);$('targetDate').value=toLocalDateTime(d)}
  if(tool==='days-between-dates-calculator'&&!txt('startDate')){const a=new Date(),b=new Date(Date.now()+30*864e5);$('startDate').value=toDate(a);$('endDate').value=toDate(b)}
  if(tool==='age-calculator'){if(!txt('startDate'))$('startDate').value='1990-01-01';if(!txt('endDate'))$('endDate').value=toDate(new Date())}
}
function toDate(d){return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)}
function toLocalDateTime(d){return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}
function localDate(s,time='00:00'){if(!s)return null;const d=new Date(`${s}T${time||'00:00'}:00`);return Number.isFinite(d.getTime())?d:null}
function pmt(P,r,n){if(n<=0)return NaN;if(Math.abs(r)<1e-14)return P/n;return P*r/(1-Math.pow(1+r,-n))}
function irrPayment(principal,payment,n){
  if(principal<=0||payment<=0||n<=0)return NaN;
  let lo=0,hi=2;
  for(let i=0;i<100;i++){const mid=(lo+hi)/2;const pv=payment*(1-Math.pow(1+mid,-n))/mid;if(pv>principal)lo=mid;else hi=mid}
  return (lo+hi)/2;
}
function quantile(sorted,q){if(!sorted.length)return NaN;const pos=(sorted.length-1)*q,base=Math.floor(pos),rest=pos-base;return sorted[base+1]!==undefined?sorted[base]+rest*(sorted[base+1]-sorted[base]):sorted[base]}
function parseList(s){return String(s||'').split(/[\s,;\n]+/).map(parseNumber).filter(x=>x!==null)}
function calendarParts(a,b){
  let y=b.getFullYear()-a.getFullYear(),m=b.getMonth()-a.getMonth(),d=b.getDate()-a.getDate();
  if(d<0){m--;d+=new Date(b.getFullYear(),b.getMonth(),0).getDate()}
  if(m<0){y--;m+=12}
  return {y,m,d}
}
function weekdayCount(a,b,inclusive=false){
  const start=new Date(a.getFullYear(),a.getMonth(),a.getDate()),end=new Date(b.getFullYear(),b.getMonth(),b.getDate());
  if(end<start)return 0;
  let days=Math.floor((Date.UTC(end.getFullYear(),end.getMonth(),end.getDate())-Date.UTC(start.getFullYear(),start.getMonth(),start.getDate()))/864e5)+(inclusive?1:0);
  if(!inclusive&&days===0)return 0;
  let count=0,full=Math.floor(days/7),rem=days%7;count=full*5;
  for(let i=0;i<rem;i++){const d=(start.getDay()+i)%7;if(d!==0&&d!==6)count++}
  return count;
}

/* ---------- calculators ---------- */
function calcCarMonthly(){
  const ids=['purchasePrice','resaleValue','ownershipYears','monthlyKm','fuelConsumption','fuelPrice','insuranceAnnual','maintenanceAnnual','taxAnnual','parkingMonthly','otherAnnual','loanMonthly','monthlyIncome'];
  const v=Object.fromEntries(ids.map(id=>[id,num(id)??0]));
  if(v.purchasePrice<0||v.resaleValue<0||v.ownershipYears<=0||v.monthlyKm<=0||v.fuelConsumption<0||v.fuelPrice<0)return fail('Enter valid values. Ownership period and monthly distance must be greater than zero.',['ownershipYears','monthlyKm']);
  const dep=Math.max(v.purchasePrice-v.resaleValue,0)/(v.ownershipYears*12);
  const fuel=v.monthlyKm*v.fuelConsumption/100*v.fuelPrice;
  const fixed=(v.insuranceAnnual+v.maintenanceAnnual+v.taxAnnual+v.otherAnnual)/12+v.parkingMonthly+v.loanMonthly;
  let battery=0;
  if(checked('includeBattery')){
    const bc=num('batteryCost')??0, by=num('batteryYears')??0, bkm=num('batteryKm')??0;
    const cal=bc>0&&by>0?bc/(by*12):0;
    const dist=bc>0&&bkm>0?bc/(bkm/v.monthlyKm):0;
    battery=Math.max(cal,dist);
  }
  const total=dep+fuel+fixed+battery, perKm=total/v.monthlyKm;
  return render({main:money(total),note:'Estimated average monthly ownership and use cost.',metrics:[
    ['Cost per km',money(perKm)],['Fuel / month',money(fuel)],['Depreciation reserve',money(dep)],['Fixed + finance',money(fixed)],['Battery reserve',money(battery)],['Annualized total',money(total*12)]
  ],status:{label:'Budget view',text:v.monthlyIncome>0?`This is about ${pct(total/v.monthlyIncome*100,1)} of the monthly income you entered.`:'Add monthly income if you want to see the cost burden ratio.'}});
}

function readDebts(){
  return $$('.debt-row').map((r,i)=>({
    name:r.querySelector('[data-debt-name]')?.value.trim()||`Debt ${i+1}`,
    balance:parseNumber(r.querySelector('[data-debt-balance]')?.value)||0,
    apr:parseNumber(r.querySelector('[data-debt-apr]')?.value)||0,
    min:parseNumber(r.querySelector('[data-debt-min]')?.value)||0
  })).filter(d=>d.balance>0);
}
const DEFAULT_DEBTS=[{name:'Credit card',balance:6500,apr:24,min:180},{name:'Personal loan',balance:12000,apr:11,min:280}];
function buildDebtRows(items=DEFAULT_DEBTS){
  const box=$('debtRows');if(!box)return;box.innerHTML='';
  items.forEach(addDebtRow);
}
function addDebtRow(d={name:'Debt',balance:0,apr:0,min:0}){
  const box=$('debtRows');if(!box)return;
  const row=document.createElement('div');row.className='debt-row';
  row.innerHTML=`<div class="debt-name"><label>Debt name</label><input data-debt-name value="${escapeHtml(String(d.name||''))}" autocomplete="off"></div>
  <div><label>Balance</label><input data-debt-balance inputmode="decimal" value="${escapeHtml(String(d.balance??''))}"></div>
  <div><label>APR (%)</label><input data-debt-apr inputmode="decimal" value="${escapeHtml(String(d.apr??''))}"></div>
  <div><label>Minimum payment</label><input data-debt-min inputmode="decimal" value="${escapeHtml(String(d.min??''))}"></div>
  <button class="btn btn-danger" type="button" data-remove-debt aria-label="Remove debt">Remove</button>`;
  box.appendChild(row);
}
function simulateDebts(debts,extra,lump,strategy,maxMonths=1200){
  let ds=debts.map(d=>({...d,balance:d.balance,interest:0,paid:0}));
  let totalInterest=0,totalPaid=0,month=0;
  const order=()=>ds.filter(d=>d.balance>0.005).sort((a,b)=>strategy==='snowball'?a.balance-b.balance:(b.apr-a.apr)||a.balance-b.balance);
  let lumpLeft=Math.max(lump,0);
  if(lumpLeft>0){for(const d of order()){const p=Math.min(lumpLeft,d.balance);d.balance-=p;d.paid+=p;totalPaid+=p;lumpLeft-=p;if(lumpLeft<=0)break}}
  while(ds.some(d=>d.balance>0.005)&&month<maxMonths){
    month++;
    let freed=0;
    for(const d of ds){
      if(d.balance<=0.005){freed+=d.min;continue}
      const interest=d.balance*(d.apr/100/12);d.balance+=interest;d.interest+=interest;totalInterest+=interest;
      const pay=Math.min(d.min,d.balance);d.balance-=pay;d.paid+=pay;totalPaid+=pay;if(d.balance<=0.005)freed+=Math.max(d.min-pay,0);
    }
    let pool=extra+freed;
    for(const d of order()){
      if(pool<=0)break;const pay=Math.min(pool,d.balance);d.balance-=pay;d.paid+=pay;totalPaid+=pay;pool-=pay;
    }
    const impossible=ds.some(d=>d.balance>0.005 && d.min<=d.balance*(d.apr/100/12)+1e-9)&&extra<=0;
    if(impossible&&month>2)return null;
  }
  return month>=maxMonths?null:{months:month,interest:totalInterest,paid:totalPaid,debts:ds};
}
function calcDebt(){
  const debts=readDebts();if(!debts.length)return fail('Add at least one debt with a positive balance.');
  if(debts.some(d=>d.apr<0||d.min<=0))return fail('Each debt needs a non-negative APR and a positive minimum payment.');
  const extra=num('extraPayment')??0,lump=num('lumpSum')??0,income=num('income')??0,fixed=num('fixedExpenses')??0,strategy=txt('strategy')||'avalanche';
  if(extra<0||lump<0||income<0||fixed<0)return fail('Enter non-negative planning amounts.');
  const planned=simulateDebts(debts,extra,lump,strategy),base=simulateDebts(debts,0,0,strategy);
  if(!planned)return fail('The current payments are not enough to amortize the debt plan. Increase the minimum or extra payment.');
  const monthlyMin=debts.reduce((s,d)=>s+d.min,0),budget=monthlyMin+extra,pressure=income>0?(fixed+budget)/income*100:NaN;
  const rows=debts.map(d=>[d.name,money(d.balance),pct(d.apr,2),money(d.min)]);
  return render({main:monthsLabel(planned.months),note:`Estimated payoff time using the ${strategy==='snowball'?'debt snowball':'debt avalanche'} strategy.`,metrics:[
    ['Total interest',money(planned.interest)],['Monthly debt budget',money(budget)],['Interest saved',base?money(Math.max(base.interest-planned.interest,0)):'—'],['Time saved',base?monthsLabel(Math.max(base.months-planned.months,0)):'—'],['Lump sum',money(lump)],['Budget pressure',Number.isFinite(pressure)?pct(pressure,1):'—']
  ],table:{headers:['Debt','Starting balance','APR','Minimum'],rows},status:{label:'Planning note',text:'This is a mathematical payoff simulation. Lender rules, changing rates, fees and missed payments can change the real schedule.'}});
}
function calcBudget(){
  const income=num('income'), target=num('targetSavings')??0, safety=num('safety')??0, annualReturn=num('annualReturn')??0;
  const ids=['housing','utilities','food','transport','debt','other'];const vals=ids.map(id=>num(id)??0);
  if(income===null||income<0||vals.some(x=>x<0)||target<0||target>100||safety<0||annualReturn<=-100)return fail('Enter valid non-negative budget values and a target savings rate from 0% to 100%.');
  const expenses=vals.reduce((a,b)=>a+b,0),free=income-expenses-safety,rate=income>0?free/income*100:NaN,targetAmt=income*target/100,gap=free-targetAmt;
  const monthly=Math.max(free,0), r=annualReturn/100/12,n=60, projected=Math.abs(r)<1e-12?monthly*n:monthly*(Math.pow(1+r,n)-1)/r;
  return render({main:money(free),note:free>=0?'Estimated monthly amount left after entered expenses and safety buffer.':'Your entered expenses and buffer are above monthly income.',metrics:[
    ['Total expenses',money(expenses)],['Savings rate',pct(rate,1)],['Target savings',money(targetAmt)],['Target gap',money(gap)],['12-month potential',money(monthly*12)],['5-year illustration',money(projected)]
  ],status:{label:'Budget signal',text:free<0?'The budget is currently negative. Review large fixed costs or debt payments first.':rate>=target?'The entered budget meets or exceeds your savings target.':'There is room between the current savings rate and your target.'}});
}
async function loadRates(force=false){
  const st=$('rateStatus');if(st)st.textContent='Loading reference rates…';
  try{
    const res=await fetch('../rates.json',{cache:force?'reload':'no-store'});if(!res.ok)throw new Error('rate');
    rateData=await res.json();const rates=rateData.rates_try||{},meta=rateData.currency_meta||{};
    for(const id of ['fromCurrency','toCurrency']){
      const sel=$(id);if(!sel)continue;const old=sel.value;sel.innerHTML='';
      Object.keys(rates).filter(k=>!['XAU','XAG'].includes(k)).forEach(code=>{const o=document.createElement('option');o.value=code;o.textContent=`${code} — ${(meta[code]?.name_en)||code}`;sel.appendChild(o)});
      if(rates[old])sel.value=old;
    }
    if(!$('fromCurrency').value)$('fromCurrency').value='USD';if(!$('toCurrency').value)$('toCurrency').value='EUR';
    if(st)st.textContent=`Reference table updated ${rateData.updated_at?new Date(rateData.updated_at).toLocaleString('en-US'):'recently'}.`;
  }catch(e){if(st)st.textContent='Reference rates could not be loaded in this preview.';rateData=null}
}
function calcCurrency(){
  if(!rateData)return fail('Reference rates are not available yet. If you opened the file directly, use a local web server for live rate loading.');
  const amount=num('amount'),from=txt('fromCurrency'),to=txt('toCurrency'),rates=rateData.rates_try||{};
  if(amount===null||amount<0||!rates[from]||!rates[to])return fail('Choose valid currencies and enter a non-negative amount.');
  const out=amount*rates[from]/rates[to],rate=rates[from]/rates[to];
  return render({main:`${fmt(out,4)} ${to}`,note:`${fmt(amount,4)} ${from} converted with the current Hesapica reference table.`,metrics:[
    [`1 ${from}`,`${fmt(rate,6)} ${to}`],[`1 ${to}`,`${fmt(1/rate,6)} ${from}`],['Rate source',(rateData.source_priority||[]).join(', ')||rateData.source||'Reference feed'],['Updated',rateData.updated_at?new Date(rateData.updated_at).toLocaleString('en-US'):'—']
  ],status:{label:'Important',text:'Banks, cards and exchange services can apply spreads, fees and different executable rates.'}});
}
function calcInflation(){
  const amount=num('amount'),years=num('years'),rate=num('rate'),method=txt('method'),mode=txt('mode');
  if(amount===null||amount<0||years===null||years<0||rate===null||rate<=-100)return fail('Enter a valid amount, period and inflation rate above -100%.');
  let factor;
  if(method==='total')factor=1+rate/100;else factor=Math.pow(1+rate/100,years);
  if(factor<=0||!Number.isFinite(factor))return fail('These inputs do not produce a valid inflation factor.');
  const future=amount*factor,power=amount/factor,equivAnnual=years>0?(Math.pow(factor,1/years)-1)*100:0;
  const main=mode==='purchasing'?power:future;
  return render({main:money(main),note:mode==='purchasing'?'Estimated future purchasing power of the amount entered.':'Estimated future amount needed to match today’s purchasing power.',metrics:[
    ['Inflation factor',fmt(factor,4)+'×'],['Future equivalent',money(future)],['Purchasing power',money(power)],['Equivalent annual rate',pct(equivAnnual,2)],['Cumulative change',pct((factor-1)*100,2)],['Period',fmt(years,2)+' years']
  ],status:{label:'Assumption',text:method==='annual'?'The annual rate is held constant for the entire period.':'The entered percentage is treated as the cumulative inflation over the whole period.'}});
}
function calcEcom(){
  const sale=num('salePrice'),qty=num('quantity'),cost=num('productCost'),comm=num('commissionRate'),pay=num('paymentRate'),ship=num('shipping'),ads=num('ads'),other=num('other'),returns=num('returnRate')??0;
  if([sale,qty,cost,comm,pay,ship,ads,other,returns].some(x=>x===null||x<0)||comm+pay>=100||returns>=100||qty<=0)return fail('Enter valid non-negative values. Quantity must be positive and percentage fees must stay below 100%.');
  const kept=qty*(1-returns/100),gross=sale*kept,product=cost*qty,commission=gross*comm/100,payment=gross*pay/100,shipping=ship*qty,ad=ads*qty,oth=other*qty,totalCost=product+commission+payment+shipping+ad+oth,profit=gross-totalCost,margin=gross>0?profit/gross*100:NaN;
  const variablePct=(comm+pay)/100, fixedPer=cost+ship+ads+other, breakEven=(1-returns/100)*(1-variablePct)>0?fixedPer/((1-returns/100)*(1-variablePct)):NaN;
  return render({main:money(profit),note:profit>=0?'Estimated profit for the entered order volume.':'Estimated loss for the entered order volume.',metrics:[
    ['Profit margin',pct(margin,1)],['Gross collected',money(gross)],['Product cost',money(product)],['Marketplace + payment fees',money(commission+payment)],['Fulfillment + ads + other',money(shipping+ad+oth)],['Break-even unit price',money(breakEven)]
  ],status:{label:'Model scope',text:'Taxes, refunds and marketplace rules vary by country and platform. Only the costs entered here are included.'}});
}
function calcRental(){
  const p=num('propertyPrice'),close=num('purchaseCosts')??0,rent=num('monthlyRent'),vac=num('vacancyRate')??0,op=num('annualCosts')??0,tax=num('propertyTax')??0,ins=num('insurance')??0,rg=num('rentGrowth')??0,eg=num('expenseGrowth')??0,app=num('appreciation')??0,infl=num('inflation')??0;
  if(p===null||p<=0||rent===null||rent<0||[close,vac,op,tax,ins,rg,eg,app,infl].some(x=>x===null)||vac<0||vac>100||[rg,eg,app,infl].some(x=>x<=-100))return fail('Enter valid values. Property price must be positive and vacancy must be between 0% and 100%.');
  const invested=p+close,gross=rent*12,effective=gross*(1-vac/100),expenses=op+tax+ins,net=effective-expenses,grossYield=gross/p*100,netYield=net/invested*100,payback=net>0?invested/net:NaN;
  let cum=0,yrRent=gross,yrExp=expenses;
  const rows=[];
  for(let y=1;y<=5;y++){const eff=yrRent*(1-vac/100),noi=eff-yrExp;cum+=noi;const value=p*Math.pow(1+app/100,y);rows.push([`Year ${y}`,money(eff),money(yrExp),money(noi),money(value)]);yrRent*=1+rg/100;yrExp*=1+eg/100}
  const realYield=(1+netYield/100)/(1+infl/100)-1;
  return render({main:pct(netYield,2),note:'Estimated first-year net rental yield before financing and income taxes.',metrics:[
    ['Gross yield',pct(grossYield,2)],['Net operating income',money(net)],['Simple payback',Number.isFinite(payback)?fmt(payback,1)+' years':'—'],['Initial invested amount',money(invested)],['5-year operating cash',money(cum)],['Inflation-adjusted yield',pct(realYield*100,2)]
  ],table:{headers:['Year','Effective rent','Expenses','Net income','Property value'],rows},status:{label:'Important',text:'Financing, income taxes, selling costs and local legal obligations are not automatically included.'}});
}
function calcInterest(){
  const mode=txt('mode'),P=num('principal'),rate=num('annualRate'),term=num('termValue'),unit=txt('termUnit'),freq=num('frequency')||12,contrib=num('contribution')??0,fee=num('feeRate')??0,target=num('target')??0;
  if(P===null||P<0||rate===null||rate<=-100||term===null||term<0||freq<=0||contrib<0||fee<0||fee>=100)return fail('Enter valid values. Rates must stay above -100% and fees must be below 100%.');
  const years=unit==='months'?term/12:term,netRate=(rate-fee)/100;let fv,total=P+contrib*Math.round(years*12),interest;
  if(mode==='simple'){fv=P*(1+netRate*years)+contrib*Math.round(years*12);interest=fv-total}
  else{
    const periodic=netRate/freq,periods=years*freq;
    let principalFV=P*Math.pow(1+periodic,periods);
    const monthlyRate=Math.pow(1+periodic,freq/12)-1,months=Math.round(years*12);
    const contribFV=months<=0?0:(Math.abs(monthlyRate)<1e-12?contrib*months:contrib*(Math.pow(1+monthlyRate,months)-1)/monthlyRate);
    fv=principalFV+contribFV;interest=fv-total;
  }
  let targetTime='—';
  if(target>P&&netRate>0&&contrib===0){const y=mode==='simple'?(target/P-1)/netRate:Math.log(target/P)/(freq*Math.log(1+netRate/freq));if(Number.isFinite(y)&&y>=0)targetTime=fmt(y,2)+' years'}
  return render({main:money(fv),note:`Estimated ${mode==='simple'?'simple':'compound'} growth after the entered period.`,metrics:[
    ['Estimated growth',money(interest)],['Total contributed',money(total)],['Net annual rate used',pct(rate-fee,2)],['Period',fmt(years,2)+' years'],['Growth vs contributions',pct(total>0?(fv/total-1)*100:NaN,2)],['Target time',targetTime]
  ],status:{label:'Assumption',text:'The optional annual fee is approximated by reducing the stated annual rate. Taxes and product-specific rules are not modeled.'}});
}
function calcCountdown(){
  if(countdownTimer){clearInterval(countdownTimer);countdownTimer=null}
  const name=txt('eventName')||'Target',refMode=txt('referenceMode'),targetRaw=txt('targetDate');
  if(!targetRaw)return fail('Choose a target date and time.',['targetDate']);
  const target=new Date(targetRaw);let ref=refMode==='custom'?new Date(txt('referenceDate')):new Date();
  if(!Number.isFinite(target.getTime())||!Number.isFinite(ref.getTime()))return fail('Choose valid target and reference date-times.');
  const draw=()=>{
    if(refMode!=='custom')ref=new Date();
    const diff=target-ref,past=diff<0,abs=Math.abs(diff),days=Math.floor(abs/864e5),hours=Math.floor(abs%864e5/36e5),mins=Math.floor(abs%36e5/6e4),secs=Math.floor(abs%6e4/1000);
    const parts=calendarParts(past?target:ref,past?ref:target);
    render({main:`${days}d ${hours}h ${mins}m`,note:past?`${name} has passed.`:`Time remaining until ${name}.`,metrics:[
      ['Calendar difference',`${parts.y}y ${parts.m}m ${parts.d}d`],['Total hours',fmt(abs/36e5,2)],['Total minutes',fmt(abs/6e4,0)],['Seconds',fmt(abs/1000,0)],['Reference',ref.toLocaleString('en-US')],['Target',target.toLocaleString('en-US')]
    ],status:{label:past?'Elapsed':'Countdown',text:`Detailed clock: ${days} days, ${hours} hours, ${mins} minutes, ${secs} seconds.`}});
  };
  draw();if(refMode!=='custom')countdownTimer=setInterval(draw,1000);
}
function calcWater(){
  const w=num('weight'),move=txt('movement'),ex=num('exerciseMinutes')??0,climate=txt('climate');
  if(w===null||w<20||w>400||ex<0||ex>600)return fail('Enter a body weight from 20–400 kg and exercise from 0–600 minutes.',['weight','exerciseMinutes']);
  const baseMlPerKg=move==='low'?30:move==='high'?38:34,base=w*baseMlPerKg,exercise=ex*10,weather=climate==='hot'?500:climate==='cool'?-200:0,total=Math.max(base+exercise+weather,1000);
  return render({main:fmt(total/1000,2)+' L',note:'A practical daily fluid planning estimate, not a medical prescription.',metrics:[
    ['Base estimate',fmt(base/1000,2)+' L'],['Exercise allowance',fmt(exercise/1000,2)+' L'],['Climate adjustment',fmt(weather/1000,2)+' L'],['Approx. 250 ml glasses',fmt(total/250,1)],['Per kg',fmt(total/w,0)+' ml'],['Weekly total',fmt(total*7/1000,1)+' L']
  ],status:{label:'Health note',text:'Needs can change with illness, pregnancy, medications, kidney/heart conditions, diet and individual sweat rate. Seek professional advice when relevant.'}});
}
function calcIdeal(){
  const h=num('height'),sex=txt('sex');if(h===null||h<120||h>250||!['male','female'].includes(sex))return fail('Enter a height from 120–250 cm and choose a formula sex.',['height','sex']);
  const inches=h/2.54,over=Math.max(inches-60,0);
  const base=sex==='male'?{dev:50,rob:52,mil:56.2,ham:48}:{dev:45.5,rob:49,mil:53.1,ham:45.5};
  const per=sex==='male'?{dev:2.3,rob:1.9,mil:1.41,ham:2.7}:{dev:2.3,rob:1.7,mil:1.36,ham:2.2};
  const vals={Devine:base.dev+per.dev*over,Robinson:base.rob+per.rob*over,Miller:base.mil+per.mil*over,Hamwi:base.ham+per.ham*over};
  const avg=Object.values(vals).reduce((a,b)=>a+b,0)/4,m=h/100,min=18.5*m*m,max=24.9*m*m;
  return render({main:fmt(avg,1)+' kg',note:'Average of four commonly cited adult ideal-weight formulas.',metrics:[
    ...Object.entries(vals).map(([k,v])=>[k,fmt(v,1)+' kg']),['BMI 18.5–24.9 range',`${fmt(min,1)}–${fmt(max,1)} kg`],['Height',fmt(h,1)+' cm']
  ],status:{label:'Important',text:'These formulas are rough reference tools and do not measure body composition or define a medically ideal weight for an individual.'}});
}
function calcDays(){
  const sd=txt('startDate'),ed=txt('endDate'),st=txt('startTime')||'00:00',et=txt('endTime')||'00:00';
  const a=localDate(sd,st),b=localDate(ed,et);if(!a||!b||b<a)return fail('Choose a valid end date/time that is not before the start.',['startDate','endDate']);
  const ms=b-a,exactDays=ms/864e5,inclusive=checked('inclusive'),dateOnly=st==='00:00'&&et==='00:00',displayDays=exactDays+(inclusive&&dateOnly?1:0),parts=calendarParts(a,b);
  const weekdays=dateOnly?weekdayCount(a,b,inclusive):weekdayCount(a,b,false);
  return render({main:fmt(displayDays,4)+' days',note:inclusive&&dateOnly?'Both calendar dates are included in the displayed day count.':'Exact elapsed duration between the two selected date-times.',metrics:[
    ['Calendar difference',`${parts.y} years, ${parts.m} months, ${parts.d} days`],['Total hours',fmt(ms/36e5,2)],['Total minutes',fmt(ms/6e4,0)],['Weeks',fmt(displayDays/7,3)],['Weekdays (Mon–Fri)',fmt(weekdays,0)],['Start',a.toLocaleString('en-US')],['End',b.toLocaleString('en-US')]
  ],status:{label:'Calendar note',text:'Calendar months have different lengths, so calendar differences and total-hour differences describe different concepts.'}});
}
function calcDiscount(){
  const p=num('originalPrice'),d=num('discountRate')??0,c=num('couponRate')??0,t=num('taxRate')??0,cur=txt('currency')||'USD';
  if(p===null||p<0||[d,c,t].some(x=>x<0||x>100))return fail('Enter a non-negative price and rates from 0% to 100%.');
  const after1=p*(1-d/100),after2=after1*(1-c/100),tax=after2*t/100,final=after2+tax,saved=p-after2,effective=p>0?saved/p*100:0;
  return render({main:money(final,cur),note:'Final price after sequential discount, coupon and optional tax.',metrics:[
    ['Price after first discount',money(after1,cur)],['Price after coupon',money(after2,cur)],['Total discount saved',money(saved,cur)],['Effective discount',pct(effective,2)],['Tax added',money(tax,cur)],['Original price',money(p,cur)]
  ],status:{label:'Method',text:'The coupon is applied after the first discount, so two percentages are not simply added together.'}});
}
function calcCalorie(){
  const age=num('age'),sex=txt('sex'),w=num('weight'),h=num('height'),act=num('activity');
  if(age===null||age<19||age>100||w===null||w<30||w>300||h===null||h<120||h>250||!['male','female'].includes(sex)||act===null)return fail('Enter an age from 19–100, valid height/weight, sex and activity level.');
  const ree=sex==='male'?10*w+6.25*h-5*age+5:10*w+6.25*h-5*age-161,tdee=ree*act,low=tdee*.9,high=tdee*1.1;
  return render({main:fmt(tdee,0)+' kcal/day',note:'Estimated daily energy to maintain current weight at the selected activity factor.',range:{label:'Approximate daily range',value:`${fmt(low,0)}–${fmt(high,0)} kcal`,note:'Shown as ±10% around the central estimate to emphasize uncertainty.'},metrics:[
    ['Estimated REE',fmt(ree,0)+' kcal/day'],['Activity factor',fmt(act,3)+'×'],['Weekly center estimate',fmt(tdee*7,0)+' kcal'],['Weight',fmt(w,1)+' kg'],['Height',fmt(h,1)+' cm'],['Age',fmt(age,0)]
  ],status:{label:'Health note',text:'This is an estimate, not a personalized diet prescription. Medical conditions, pregnancy, growth and individual metabolism can change needs.'}});
}
function calcCostKm(){
  let annual=num('annualKm'),monthly=num('monthlyKm'),cons=num('consumption'),price=num('fuelPrice'),mode=txt('mode');
  const dep=num('depreciation')??0,ins=num('insurance')??0,tax=num('taxes')??0,maint=num('maintenance')??0,other=num('other')??0;
  if((annual===null||annual<=0)&&(monthly===null||monthly<=0))return fail('Enter either a positive annual or monthly distance.',['annualKm','monthlyKm']);
  if(annual===null||annual<=0)annual=monthly*12;if(monthly===null||monthly<=0)monthly=annual/12;
  if([cons,price,dep,ins,tax,maint,other].some(x=>x===null||x<0))return fail('Enter valid non-negative cost inputs.');
  const fuelAnnual=annual*cons/100*price,otherAnnual=mode==='fuel'?0:dep+ins+tax+maint+other,total=fuelAnnual+otherAnnual,cost=total/annual;
  return render({main:money(cost)+'/km',note:mode==='fuel'?'Fuel-only cost per kilometer.':'Estimated full operating cost per kilometer from the items entered.',metrics:[
    ['Annual total',money(total)],['Monthly average',money(total/12)],['Fuel / year',money(fuelAnnual)],['Non-fuel / year',money(otherAnnual)],['Depreciation / year',mode==='fuel'?'—':money(dep)],['Distance / year',fmt(annual,0)+' km'],['Fuel share',pct(total>0?fuelAnnual/total*100:0,1)]
  ],status:{label:'Scope',text:'Depreciation and financing are not included unless you enter them in other annual costs. Use the Car Monthly Cost Calculator for a broader ownership view.'}});
}
function loanSchedule(P,annual,months,extra=0){
  const r=annual/100/12,payment=pmt(P,r,months);let bal=P,interest=0,paid=0,m=0;const rows=[];
  while(bal>0.005&&m<1200){m++;const i=bal*r;let pay=Math.min(payment+extra,bal+i);bal=bal+i-pay;interest+=i;paid+=pay;if(m<=12||bal<=0.005)rows.push([m,money(pay),money(i),money(Math.max(bal,0))])}
  return {payment,months:m,interest,paid,rows};
}
function calcLoan(){
  const mode=txt('mode');
  if(mode==='loan'){
    const P=num('principal'),r=num('annualRate'),n=num('months'),fees=num('fees')??0,extra=num('extraPayment')??0,income=num('monthlyIncome')??0;
    if(P===null||P<=0||r===null||r<0||n===null||n<1||extra<0||fees<0)return fail('Enter a positive loan amount and term, plus valid non-negative rates and fees.');
    const base=loanSchedule(P,r,n,0),plan=loanSchedule(P,r,n,extra),total=plan.paid+fees,burden=income>0?plan.payment/income*100:NaN;
    return render({main:money(plan.payment),note:'Estimated contractual monthly payment before any optional extra payment.',metrics:[
      ['Regular payment',money(plan.payment)],['With extra payment',money(plan.payment+extra)],['Estimated payoff',monthsLabel(plan.months)],['Total interest',money(plan.interest)],['Total cost incl. fees',money(total)],['Payment / income',Number.isFinite(burden)?pct(burden,1):'—']
    ],table:{headers:['Month','Payment','Interest','Balance'],rows:plan.rows},status:{label:'Loan note',text:'This is a standard amortization estimate. Lender rounding, compounding, insurance, taxes, penalties and settlement rules can differ.'}});
  }
  if(mode==='installment'){
    const cash=num('cashPrice'),down=num('downPayment')??0,total=num('installmentTotal'),n=num('installmentMonths'),fee=num('installmentFee')??0;
    if(cash===null||cash<=0||total===null||total<0||n===null||n<1||down<0||fee<0)return fail('Enter a positive cash price and installment term.');
    const financed=Math.max(cash-down,0),pay=(total+fee-down)/n,premium=total+fee-cash,premiumPct=cash>0?premium/cash*100:NaN,rm=financed>0&&pay>0?irrPayment(financed,pay,n):NaN,apr=Number.isFinite(rm)?(Math.pow(1+rm,12)-1)*100:NaN;
    return render({main:money(pay),note:'Average installment payment based on the entered total installment price.',metrics:[
      ['Cash price',money(cash)],['Total installment cost',money(total+fee)],['Financed amount',money(financed)],['Price premium',money(premium)],['Premium vs cash',pct(premiumPct,2)],['Implied annual rate',pct(apr,2)]
    ],status:{label:'Comparison',text:'The implied rate is a mathematical estimate from equal installments and may not match a lender’s disclosed APR methodology.'}});
  }
  const bal=num('remainingBalance'),r=num('earlyRate'),n=num('remainingMonths'),days=num('daysSincePayment')??0,fee=num('settlementFee')??0,quote=num('lenderQuote')??0;
  if(bal===null||bal<=0||r===null||r<0||n===null||n<1||days<0||fee<0||quote<0)return fail('Enter a positive remaining balance and term, plus valid non-negative values.');
  const daily=r/100/365,accrued=bal*daily*days,estimate=bal+accrued+fee,continuePlan=loanSchedule(bal,r,n,0),savings=continuePlan.paid-estimate;
  return render({main:money(estimate),note:'Simple early-payoff estimate using remaining principal, accrued interest and the fee entered.',metrics:[
    ['Remaining principal',money(bal)],['Accrued interest estimate',money(accrued)],['Settlement fee',money(fee)],['Continue scheduled payments',money(continuePlan.paid)],['Estimated interest avoided',money(Math.max(savings,0))],['Lender quote difference',quote>0?money(quote-estimate):'—']
  ],status:{label:'Important',text:'Only the lender can provide an authoritative settlement figure. Daily interest and payoff rules vary by product and jurisdiction.'}});
}
function calcCrypto(){
  const buy=num('buyPrice'),sell=num('sellPrice'),q=num('quantity'),bf=num('buyFee')??0,sf=num('sellFee')??0,supply=num('currentSupply')??0,ath=num('athPrice')??0,athSupply=num('athSupply')??0,target=num('targetPrice')??0,targetSupply=num('targetSupply')??supply,totalSupply=num('totalSupply')??0;
  if([buy,sell,q,bf,sf,supply,ath,athSupply,target,targetSupply,totalSupply].some(x=>x===null||x<0)||bf>=100||sf>=100)return fail('Enter valid non-negative prices, quantity, supply and fee rates below 100%.');
  const buyGross=buy*q,buyCost=buyGross*(1+bf/100),sellGross=sell*q,sellNet=sellGross*(1-sf/100),profit=sellNet-buyCost,roi=buyCost>0?profit/buyCost*100:NaN,currentCap=sell*supply,athCap=ath*athSupply,targetCap=target*targetSupply,targetNet=target*q*(1-sf/100),targetProfit=targetNet-buyCost;
  return render({main:money(profit),note:profit>=0?'Estimated net trading profit after the buy and sell fees entered.':'Estimated net trading loss after the fees entered.',metrics:[
    ['ROI',pct(roi,2)],['Net sale value',money(sellNet)],['Current market cap',supply>0?money(currentCap):'—'],['Historical ATH market cap',ath>0&&athSupply>0?money(athCap):'—'],['Target market cap',target>0&&targetSupply>0?money(targetCap):'—'],['Profit at target',target>0?money(targetProfit):'—']
  ],status:{label:'Tokenomics note',text:totalSupply>0&&supply>0?`Current circulating supply is ${pct(supply/totalSupply*100,1)} of the total supply entered.`:'Price comparisons can be misleading when circulating supply changes materially over time.'}});
}
function calcAverage(){
  const mode=txt('mode'),xs=parseList(txt('values'));if(!xs.length)return fail('Enter at least one valid number.',['values']);
  const sorted=[...xs].sort((a,b)=>a-b),sum=xs.reduce((a,b)=>a+b,0),mean=sum/xs.length,median=quantile(sorted,.5),q1=quantile(sorted,.25),q3=quantile(sorted,.75),variance=xs.reduce((s,x)=>s+(x-mean)**2,0)/xs.length,sd=Math.sqrt(variance),iqr=q3-q1,low=q1-1.5*iqr,high=q3+1.5*iqr,out=xs.filter(x=>x<low||x>high);
  let main=mean,note='Arithmetic mean of the entered values.',weighted='—';
  if(mode==='weighted'){
    const ws=parseList(txt('weights'));if(ws.length!==xs.length||ws.some(w=>w<0)||ws.reduce((a,b)=>a+b,0)<=0)return fail('Weighted mode needs one non-negative weight for each value.',['weights']);
    weighted=xs.reduce((s,x,i)=>s+x*ws[i],0)/ws.reduce((a,b)=>a+b,0);main=weighted;note='Weighted mean using the weights entered.';
  }
  const rows=sorted.map((x,i)=>[i+1,fmt(x,6),x<low||x>high?'Possible outlier':'—']);
  return render({main:fmt(main,6),note,metrics:[
    ['Count',xs.length],['Median',fmt(median,6)],['Minimum',fmt(sorted[0],6)],['Maximum',fmt(sorted.at(-1),6)],['Q1 / Q3',`${fmt(q1,4)} / ${fmt(q3,4)}`],['Std. deviation',fmt(sd,6)],['Possible outliers',out.length],['Arithmetic mean',fmt(mean,6)]
  ],table:{headers:['#','Sorted value','IQR signal'],rows},status:{label:'Method',text:'Quartiles use linear interpolation. The IQR rule is a screening signal, not proof that a value is invalid.'}});
}
function calcAsset(){
  const buy=num('buyPrice'),sell=num('sellPrice'),q=num('quantity'),bc=num('buyCost')??0,sc=num('sellCost')??0,fee=num('sellFee')??0,target=num('targetROI')??0;
  if([buy,sell,q,bc,sc,fee,target].some(x=>x===null||x<0)||fee>=100)return fail('Enter valid non-negative prices, quantity and costs. Sell fee must be below 100%.');
  const initial=q*buy+bc,gross=q*sell,net=gross*(1-fee/100)-sc,profit=net-initial,roi=initial>0?profit/initial*100:NaN,breakEven=q>0?(initial+sc)/(q*(1-fee/100)):NaN,targetPrice=q>0?(initial*(1+target/100)+sc)/(q*(1-fee/100)):NaN;
  return render({main:money(profit),note:profit>=0?'Estimated net profit after entered transaction costs.':'Estimated net loss after entered transaction costs.',metrics:[
    ['Net return',pct(roi,2)],['Initial cost',money(initial)],['Net exit value',money(net)],['Price change',pct(buy>0?(sell/buy-1)*100:NaN,2)],['Break-even price',money(breakEven)],['Price for target return',money(targetPrice)]
  ],status:{label:'Interpretation',text:'Price change and net return differ whenever transaction costs, fees or spreads are present.'}});
}
function calcBMI(){
  const h=num('height'),w=num('weight'),age=num('age')??0,sex=txt('sex')||'unspecified',act=txt('activity')||'unspecified';
  if(h===null||h<100||h>250||w===null||w<25||w>400)return fail('Enter a height from 100–250 cm and a weight from 25–400 kg.',['height','weight']);
  const m=h/100,bmi=w/(m*m);let cat=bmi<18.5?'Underweight':bmi<25?'Standard adult range':bmi<30?'Overweight':'Obesity range';const min=18.5*m*m,max=24.9*m*m;
  return render({main:fmt(bmi,1),note:`${cat}. BMI is a screening measure, not a diagnosis.`,range:{label:'Adult reference-weight range at this height',value:`${fmt(min,1)}–${fmt(max,1)} kg`,note:'Corresponds to BMI 18.5–24.9 for adults; it is not an individual target.'},metrics:[
    ['Category',cat],['Height',fmt(h,1)+' cm'],['Weight',fmt(w,1)+' kg'],['Age entered',age>0?fmt(age,0):'—'],['Sex',sex],['Activity',act]
  ],status:{label:'Health note',text:'BMI can misclassify muscular people and does not directly measure body fat distribution, fitness or metabolic health.'}});
}
function calcFuel(){
  const one=num('distance'),trip=txt('tripType'),cons=num('consumption'),price=num('fuelPrice'),corr=num('correction')??0,extraPct=num('extraRoute')??0,extraCosts=num('extraCosts')??0,people=num('people')??1;
  if(one===null||one<0||cons===null||cons<0||price===null||price<0||corr<=-100||extraPct<0||extraCosts<0||people<1)return fail('Enter valid non-negative trip values and at least one person.');
  let dist=one*(trip==='round'?2:1);dist*=1+extraPct/100;const adjCons=cons*(1+corr/100),liters=dist*adjCons/100,fuel=liters*price,total=fuel+extraCosts;
  return render({main:money(total),note:'Estimated trip cost including fuel and any extra trip costs entered.',metrics:[
    ['Effective distance',fmt(dist,1)+' km'],['Adjusted consumption',fmt(adjCons,2)+' L/100 km'],['Fuel used',fmt(liters,2)+' L'],['Fuel cost',money(fuel)],['Cost per km',money(dist>0?total/dist:NaN)],['Cost per person',money(total/people)]
  ],status:{label:'Trip note',text:'Real consumption changes with speed, traffic, weather, load, tire pressure, terrain and driving style.'}});
}
function calcAge(){
  const mode=txt('mode'),name=txt('eventName'),sd=txt('startDate'),ed=txt('endDate'),st=txt('startTime')||'00:00',et=txt('endTime')||'00:00',a=localDate(sd,st),b=localDate(ed,et);
  if(!a||!b||b<a)return fail('Choose a valid start date/time that is not after the end date/time.');
  const parts=calendarParts(a,b),ms=b-a,days=Math.floor(ms/864e5),hours=ms/36e5;
  let next='—';
  if(mode==='age'){
    let nb=new Date(b.getFullYear(),a.getMonth(),a.getDate(),a.getHours(),a.getMinutes());
    if(a.getMonth()===1&&a.getDate()===29&&nb.getMonth()!==1)nb=new Date(b.getFullYear(),1,28,a.getHours(),a.getMinutes());
    if(nb<=b){nb.setFullYear(nb.getFullYear()+1);if(a.getMonth()===1&&a.getDate()===29&&nb.getMonth()!==1)nb=new Date(nb.getFullYear(),1,28,a.getHours(),a.getMinutes())}
    next=Math.ceil((nb-b)/864e5)+' days';
  }
  return render({main:mode==='age'?`${parts.y} years`:`${parts.y}y ${parts.m}m ${parts.d}d`,note:mode==='age'?`${parts.y} years, ${parts.m} months and ${parts.d} days old on the selected date.`:`Elapsed time${name?` since ${name}`:''}.`,metrics:[
    ['Calendar years',parts.y],['Months after full years',parts.m],['Remaining days',parts.d],['Total days',fmt(days,0)],['Total hours',fmt(hours,0)],['Next birthday',mode==='age'?next:'—']
  ],status:{label:'Calendar note',text:'Calendar age uses calendar years/months/days; total days and hours are elapsed-time measures.'}});
}
function calcInvestment(){
  const mode=txt('mode');
  if(mode==='growth'){
    const initial=num('initial'),monthly=num('monthlyContribution')??0,years=num('years'),annual=num('annualReturn'),fee=num('feeRate')??0,infl=num('inflation')??0;
    if(initial===null||initial<0||monthly<0||years===null||years<0||annual===null||annual<=-100||fee<0||infl<=-100)return fail('Enter valid investment assumptions.');
    const net=(annual-fee)/100;if(net<=-1)return fail('The annual return after fees must stay above -100%.',['annualReturn','feeRate']);
    const rm=Math.pow(1+net,1/12)-1,n=Math.round(years*12);
    const monthlyFV=n<=0?0:(Math.abs(rm)<1e-12?monthly*n:monthly*(Math.pow(1+rm,n)-1)/rm);
    const fv=initial*Math.pow(1+rm,n)+monthlyFV;
    const contrib=initial+monthly*n,gain=fv-contrib,real=fv/Math.pow(1+infl/100,years);
    return render({main:money(fv),note:'Projected portfolio value using the constant return and contribution assumptions entered.',metrics:[
      ['Total contributed',money(contrib)],['Estimated investment gain',money(gain)],['Net annual return used',pct(annual-fee,2)],['Real value estimate',money(real)],['Nominal ROI vs contributions',pct(contrib>0?(fv/contrib-1)*100:NaN,2)],['Period',fmt(years,2)+' years']
    ],status:{label:'Projection',text:'Returns are assumed constant for illustration. Real markets are volatile and fees/taxes can be more complex.'}});
  }
  const cost=num('cost'),extra=num('extraCosts')??0,exit=num('exitValue'),income=num('cashIncome')??0,years=num('roiYears'),fees=num('roiFees')??0,target=num('targetROI')??0,alt=num('alternativeReturn')??0;
  if(cost===null||cost<0||extra<0||exit===null||exit<0||income<0||years===null||years<0||fees<0||fees>=100)return fail('Enter valid non-negative ROI values and a fee rate below 100%.');
  const invested=cost+extra,netExit=(exit+income)*(1-fees/100),profit=netExit-invested,roi=invested>0?profit/invested*100:NaN,annualized=years>0&&invested>0&&netExit>0?(Math.pow(netExit/invested,1/years)-1)*100:NaN,targetExit=invested*(1+target/100)/(1-fees/100),altEnd=invested*Math.pow(1+alt/100,years),opp=netExit-altEnd;
  return render({main:pct(roi,2),note:'Net ROI based on entered investment cost, exit value, cash income and exit fee.',metrics:[
    ['Net profit',money(profit)],['Annualized return',pct(annualized,2)],['Total invested',money(invested)],['Net exit + income',money(netExit)],['Exit value for target ROI',money(targetExit)],['Vs alternative scenario',money(opp)]
  ],status:{label:'Comparison',text:'ROI and annualized return answer different questions; annualized return is most useful when comparing investments held for different lengths of time.'}});
}
function calcPercentage(){
  const mode=txt('mode'),a=num('a'),b=num('b');if(a===null||b===null)return fail('Enter two valid numbers.',['a','b']);
  let main,note,metrics=[];
  if(mode==='percentOf'){main=a/100*b;note=`${fmt(a,6)}% of ${fmt(b,6)}`;metrics=[['Percentage',pct(a,6)],['Base value',fmt(b,6)],['Remaining after amount',fmt(b-main,6)]]}
  else if(mode==='whatPercent'){if(b===0)return fail('The second value cannot be zero for this calculation.',['b']);const x=a/b*100;main=pct(x,6);note=`${fmt(a,6)} is ${fmt(x,6)}% of ${fmt(b,6)}.`;metrics=[['Ratio',fmt(a/b,8)],['Difference',fmt(a-b,6)],['Reverse ratio',a!==0?fmt(b/a,8):'—']]}
  else if(mode==='increase'){main=b*(1+a/100);note=`${fmt(b,6)} increased by ${fmt(a,6)}%.`;metrics=[['Increase amount',fmt(main-b,6)],['Original',fmt(b,6)],['Multiplier',fmt(1+a/100,8)]]}
  else if(mode==='decrease'){main=b*(1-a/100);note=`${fmt(b,6)} decreased by ${fmt(a,6)}%.`;metrics=[['Decrease amount',fmt(b-main,6)],['Original',fmt(b,6)],['Multiplier',fmt(1-a/100,8)]]}
  else{if(a===0)return fail('The starting value cannot be zero for percentage change.',['a']);const x=(b-a)/Math.abs(a)*100;main=pct(x,6);note=`Percentage change from ${fmt(a,6)} to ${fmt(b,6)}.`;metrics=[['Absolute change',fmt(b-a,6)],['Direction',x>0?'Increase':x<0?'Decrease':'No change'],['New / old ratio',fmt(b/a,8)]]}
  return render({main:typeof main==='number'?fmt(main,6):main,note,metrics,status:{label:'Formula',text:mode==='change'?'Percentage change = (new − old) ÷ |old| × 100.':'The calculation follows the selected percentage relationship.'}});
}
const CALCS={
'car-monthly-cost-calculator':calcCarMonthly,'debt-payoff-calculator':calcDebt,'budget-calculator':calcBudget,'currency-converter':calcCurrency,
'inflation-calculator':calcInflation,'ecommerce-profit-calculator':calcEcom,'rental-property-calculator':calcRental,'interest-calculator':calcInterest,
'countdown-calculator':calcCountdown,'water-intake-calculator':calcWater,'ideal-weight-calculator':calcIdeal,'days-between-dates-calculator':calcDays,
'discount-calculator':calcDiscount,'calorie-calculator':calcCalorie,'cost-per-kilometer-calculator':calcCostKm,'loan-calculator':calcLoan,
'crypto-profit-calculator':calcCrypto,'average-calculator':calcAverage,'asset-return-calculator':calcAsset,'bmi-calculator':calcBMI,
'fuel-cost-calculator':calcFuel,'age-calculator':calcAge,'investment-return-calculator':calcInvestment,'percentage-calculator':calcPercentage
};
const PRESETS={
'car-monthly-cost-calculator':{
 example:{purchasePrice:42000,resaleValue:22000,ownershipYears:5,monthlyKm:1500,fuelConsumption:7.2,fuelPrice:1.75,insuranceAnnual:1100,maintenanceAnnual:850,taxAnnual:350,parkingMonthly:120,otherAnnual:450,loanMonthly:0,monthlyIncome:5500,includeBattery:false},
 city:{purchasePrice:28000,resaleValue:14000,ownershipYears:5,monthlyKm:900,fuelConsumption:8.5,fuelPrice:1.8,insuranceAnnual:900,maintenanceAnnual:750,taxAnnual:300,parkingMonthly:180,otherAnnual:300},
 electric:{purchasePrice:48000,resaleValue:25000,ownershipYears:6,monthlyKm:1600,fuelConsumption:0,fuelPrice:0,insuranceAnnual:1250,maintenanceAnnual:450,taxAnnual:250,parkingMonthly:100,otherAnnual:300,includeBattery:true,batteryCost:12000,batteryYears:10,batteryKm:220000}
},
'debt-payoff-calculator':{example:{strategy:'avalanche',extraPayment:250,lumpSum:1000,income:5200,fixedExpenses:2600,__debts:[{name:'Credit card',balance:6500,apr:24,min:180},{name:'Personal loan',balance:12000,apr:11,min:280},{name:'Store balance',balance:1800,apr:0,min:100}]}},
'budget-calculator':{example:{income:6000,targetSavings:20,housing:1700,utilities:320,food:700,transport:420,debt:550,other:480,safety:300,annualReturn:5},strong:{income:7000,targetSavings:25,housing:1600,utilities:280,food:650,transport:350,debt:250,other:400,safety:350,annualReturn:5},tight:{income:4500,targetSavings:10,housing:1800,utilities:350,food:750,transport:500,debt:700,other:500,safety:200,annualReturn:4}},
'inflation-calculator':{example:{mode:'future',method:'annual',amount:2500,years:10,rate:4},high:{mode:'future',method:'annual',amount:1000,years:5,rate:8},total:{mode:'purchasing',method:'total',amount:1000,years:5,rate:35}},
'ecommerce-profit-calculator':{example:{salePrice:95,quantity:100,productCost:32,commissionRate:14,paymentRate:2.9,shipping:9,ads:7,other:3,returnRate:5}},
'rental-property-calculator':{example:{propertyPrice:320000,purchaseCosts:12000,monthlyRent:2300,vacancyRate:6,annualCosts:3800,propertyTax:1800,insurance:900,rentGrowth:3,expenseGrowth:3,appreciation:3,inflation:2.5}},
'interest-calculator':{example:{mode:'compound',principal:15000,annualRate:7,termValue:12,termUnit:'years',frequency:12,contribution:150,feeRate:.5,target:40000},simple:{mode:'simple',principal:10000,annualRate:5,termValue:3,termUnit:'years',frequency:12,contribution:0,feeRate:0},savings:{mode:'compound',principal:5000,annualRate:6,termValue:10,termUnit:'years',frequency:12,contribution:300,feeRate:.3}},
'water-intake-calculator':{example:{weight:82,movement:'normal',exerciseMinutes:45,climate:'normal'},hot:{weight:75,movement:'high',exerciseMinutes:75,climate:'hot'},rest:{weight:68,movement:'low',exerciseMinutes:0,climate:'cool'}},
'ideal-weight-calculator':{example:{height:182,sex:'male'}},
'discount-calculator':{example:{originalPrice:250,discountRate:25,couponRate:10,taxRate:0,currency:'USD'},sale20:{originalPrice:100,discountRate:20,couponRate:0,taxRate:0,currency:'USD'},coupon:{originalPrice:180,discountRate:30,couponRate:15,taxRate:0,currency:'EUR'}},
'calorie-calculator':{example:{weight:68,height:168,age:35,sex:'female',activity:1.55}},
'cost-per-kilometer-calculator':{example:{monthlyKm:1500,annualKm:18000,consumption:7.2,fuelPrice:1.75,mode:'full',depreciation:3200,insurance:1100,taxes:350,maintenance:850,other:500},fuel:{monthlyKm:1200,annualKm:14400,consumption:6,fuelPrice:1.7,mode:'fuel',depreciation:0,insurance:0,taxes:0,maintenance:0,other:0}},
'loan-calculator':{example:{mode:'loan',principal:35000,annualRate:6.9,months:72,fees:250,extraPayment:75,monthlyIncome:5500},installment:{mode:'installment',cashPrice:3000,downPayment:500,installmentTotal:3420,installmentMonths:12,installmentFee:0},early:{mode:'early',remainingBalance:18000,earlyRate:7.2,remainingMonths:36,daysSincePayment:12,settlementFee:100,lenderQuote:0}},
'crypto-profit-calculator':{example:{buyPrice:45000,sellPrice:60000,quantity:.12,buyFee:.15,sellFee:.15,currentSupply:19800000,athPrice:69000,athSupply:19000000,totalSupply:21000000,targetPrice:80000,targetSupply:20000000}},
'average-calculator':{example:{mode:'arithmetic',values:'72, 85, 91, 78, 84',weights:''},outlier:{mode:'arithmetic',values:'10, 11, 12, 12, 13, 55',weights:''},weighted:{mode:'weighted',values:'70, 80, 95',weights:'1, 2, 3'}},
'asset-return-calculator':{example:{assetName:'Example asset',buyPrice:85,sellPrice:112,quantity:25,buyCost:15,sellCost:15,sellFee:.5,targetROI:25},loss:{assetName:'Example asset',buyPrice:120,sellPrice:95,quantity:10,buyCost:10,sellCost:10,sellFee:.4,targetROI:10}},
'bmi-calculator':{example:{height:180,weight:78,age:32,sex:'male',activity:'moderate'}},
'fuel-cost-calculator':{example:{distance:620,tripType:'round',consumption:7.2,fuelPrice:1.65,correction:5,extraRoute:3,extraCosts:28,people:3},short:{distance:35,tripType:'one',consumption:6.2,fuelPrice:1.65,correction:0,extraRoute:0,extraCosts:0,people:1}},
'age-calculator':{example:{mode:'age',eventName:'',startDate:'1990-05-15',startTime:'08:30',endDate:toDate(new Date()),endTime:'12:00'},elapsed:{mode:'elapsed',eventName:'starting this job',startDate:'2020-02-01',startTime:'09:00',endDate:toDate(new Date()),endTime:'12:00'}},
'investment-return-calculator':{example:{mode:'growth',initial:15000,monthlyContribution:300,years:10,annualReturn:7,feeRate:.5,inflation:2.5},roi:{mode:'roi',cost:15000,extraCosts:1000,exitValue:22000,cashIncome:900,roiYears:4,roiFees:1,targetROI:30,alternativeReturn:5}},
'percentage-calculator':{example:{mode:'change',a:80,b:100},percent:{mode:'percentOf',a:18,b:1000},what:{mode:'whatPercent',a:40,b:250},decrease:{mode:'decrease',a:12.5,b:45.5}}
};
function calculate(){clearInvalid();const fn=CALCS[tool];if(fn)return fn()}
if(tool==='debt-payoff-calculator'){
  $('addDebtBtn')?.addEventListener('click',()=>addDebtRow({name:'New debt',balance:0,apr:0,min:0}));
  $('debtRows')?.addEventListener('click',e=>{const b=e.target.closest('[data-remove-debt]');if(b){b.closest('.debt-row')?.remove();persist()}});
}
if(tool==='currency-converter'){
  $('swapBtn')?.addEventListener('click',()=>{const a=$('fromCurrency'),b=$('toCurrency'),x=a.value;a.value=b.value;b.value=x;calculate()});
  $('refreshRatesBtn')?.addEventListener('click',async()=>{await loadRates(true);calculate()});
}
setupDefaults();
if(tool==='debt-payoff-calculator'&&!$('debtRows')?.children.length)buildDebtRows(DEFAULT_DEBTS);
restore();
restoreUrl();
updateModes();
commonEvents();
resetResult();
if(tool==='currency-converter')loadRates().then(()=>{restore();restoreUrl();});
})();
