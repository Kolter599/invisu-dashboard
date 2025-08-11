'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Pie, PieChart, Cell
} from 'recharts';

/* ---------- utils ---------- */
const fmt = {
  num: (n) => Math.round(n ?? 0).toLocaleString(),
  pct: (n) => `${((n ?? 0) * 100).toFixed(1)}%`,
  cur: (n, c='USD') => new Intl.NumberFormat(undefined, { style:'currency', currency:c }).format(n ?? 0),
};
const toCSV = (rows) => rows.length
  ? Object.keys(rows[0]).join(',') + '\n' + rows.map(r => Object.keys(rows[0]).map(k => JSON.stringify(r[k] ?? '')).join(',')).join('\n')
  : '';
const downloadFile = (name, text) => { const b=new Blob([text],{type:'text/csv'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download=name; a.click(); URL.revokeObjectURL(u); };

const presets = [
  { key:'last14', label:'Last 14 days', days:14 },
  { key:'last30', label:'Last 30 days', days:30 },
  { key:'last90', label:'Last 90 days', days:90 },
];

const datesRange = (startISO, endISO) => {
  const start=new Date(startISO), end=new Date(endISO), out=[];
  for (let d=new Date(start); d<=end; d.setDate(d.getDate()+1)) out.push(new Date(d).toISOString().slice(0,10));
  return out;
};
const lastNDates = (n) => { const out=[], end=new Date(); for (let i=n-1;i>=0;i--){ const d=new Date(end); d.setDate(end.getDate()-i); out.push(d.toISOString().slice(0,10)); } return out; };
const rng = (s)=>{ let x=Math.sin(s)*1e4; return ()=>{ x=Math.sin(x)*1e4; return x-Math.floor(x);} };
const genSeries = (days, mix=1) => {
  const ds=lastNDates(days), r=rng(days*13+mix*7); let followers=1000+Math.round(r()*500);
  return ds.map((date,i)=>{
    const paid = (i%3===0?1:0)*(50+r()*250);
    const organic = 300 + r()*300*mix + r()*200;
    const impressions = organic*(1.6+r()*0.6) + paid*(2.2+r()*0.8);
    const clicks = impressions*(0.02+r()*0.02);
    const engagements = clicks*(0.6+r()*0.5);
    const spend = paid*(0.5+r()*0.5);
    followers += Math.round(r()*5 + (i%7===0?10:2));
    const sessions = clicks*(0.6+r()*0.4);
    const conversions = sessions*(0.03+r()*0.03);
    const srcs=['linkedin / organic','linkedin / paid','direct / none','google / cpc','newsletter / email'];
    return { date,
      organicReach:Math.round(organic), paidReach:Math.round(paid), impressions:Math.round(impressions),
      clicks:Math.round(clicks), engagements:Math.round(engagements), spend:Number(spend.toFixed(2)),
      followers, sessions:Math.round(sessions), conversions:Math.round(conversions), source:srcs[Math.floor(r()*srcs.length)]
    };
  });
};
const fetchLinkedInSeries = async (ids, len)=>{ await new Promise(r=>setTimeout(r,120)); const out={}; ids.forEach((id,i)=>out[id]=genSeries(len,i+1)); return out; };
const fetchGA4Series = async (len)=>{ await new Promise(r=>setTimeout(r,120)); return genSeries(len,2).map(d=>({ date:d.date, sessions:d.sessions, conversions:d.conversions, source:d.source,
  organicReach:d.organicReach, paidReach:d.paidReach, impressions:d.impressions, engagements:d.engagements, clicks:d.clicks, spend:d.spend })); };

/* ---------- invisu style theme ---------- */
const THEME = { pageBg:'#EFEDE7', text:'#0A0A0A', muted:'#6B6B6B', card:'#FFFFFF', border:'#E7E2DA', radius:20, maxw:1180 };
const pill = {
  base:{ padding:'10px 16px', borderRadius:999, border:`1px solid ${THEME.border}`, background:'#0A0A0A', color:'#fff', fontWeight:600, cursor:'pointer' },
  outline:{ padding:'10px 16px', borderRadius:999, border:`1px solid ${THEME.border}`, background:'#fff', color:THEME.text, fontWeight:600, cursor:'pointer' },
};

export default function Page(){
  const [accounts] = useState([
    { id:'pers_1', name:'Philip Treiner', type:'personal' },
    { id:'pers_2', name:'Jesper Kring', type:'personal' },
    { id:'pers_3', name:'Mia Lena', type:'personal' },
    { id:'biz_1', name:'Valified (Company Page)', type:'business' },
  ]);
  const [selected,setSelected]=useState(accounts.map(a=>a.id));
  const [preset,setPreset]=useState(presets[1]);
  const [manualStart,setManualStart]=useState(''); const [manualEnd,setManualEnd]=useState('');
  const [compare,setCompare]=useState(true);
  const [liByAccount,setLiByAccount]=useState({}); const [ga4,setGa4]=useState([]);
  const [prevLiByAccount,setPrevLiByAccount]=useState({}); const [prevGa4,setPrevGa4]=useState([]);
  const [loading,setLoading]=useState(false);

  const load = async ()=>{
    setLoading(true);
    try{
      const dates = manualStart&&manualEnd ? datesRange(manualStart,manualEnd) : lastNDates(preset.days);
      const len=dates.length;
      const [li,ga] = await Promise.all([fetchLinkedInSeries(selected,len), fetchGA4Series(len)]);
      setLiByAccount(li); setGa4(ga);
      if(compare){
        const [pli,pga] = await Promise.all([fetchLinkedInSeries(selected,len), fetchGA4Series(len)]);
        setPrevLiByAccount(pli); setPrevGa4(pga);
      } else { setPrevLiByAccount({}); setPrevGa4([]); }
    } finally{ setLoading(false); }
  };
  useEffect(()=>{ load(); /* eslint-disable-next-line */ },[preset,selected,manualStart,manualEnd,compare]);

  const liAgg = useMemo(()=> {
    const byDate={};
    Object.keys(liByAccount).forEach(id=>{
      (liByAccount[id]||[]).forEach(d=>{
        if(!byDate[d.date]) byDate[d.date]={...d};
        else{ const x=byDate[d.date]; x.organicReach+=d.organicReach; x.paidReach+=d.paidReach; x.impressions+=d.impressions; x.engagements+=d.engagements; x.clicks+=d.clicks; x.spend+=d.spend; x.followers=(x.followers||0)+(d.followers||0); }
      });
    });
    const dates = manualStart&&manualEnd ? datesRange(manualStart,manualEnd) : lastNDates(preset.days);
    return dates.map(date => byDate[date] || { date, organicReach:0, paidReach:0, impressions:0, engagements:0, clicks:0, spend:0, followers:0 });
  }, [liByAccount, preset.days, manualStart, manualEnd]);

  const totals = useMemo(()=> {
    const t={ org:0, paid:0, impr:0, eng:0, clicks:0, spend:0, sessions:0, conv:0 };
    liAgg.forEach(d=>{ t.org+=d.organicReach; t.paid+=d.paidReach; t.impr+=d.impressions; t.eng+=d.engagements; t.clicks+=d.clicks; t.spend+=d.spend; });
    ga4.forEach(g=>{ t.sessions+=g.sessions||0; t.conv+=g.conversions||0; });
    return t;
  }, [liAgg,ga4]);

  const prevTotals = useMemo(()=> {
    const byDate={};
    Object.keys(prevLiByAccount).forEach(id=>{
      (prevLiByAccount[id]||[]).forEach(d=>{
        if(!byDate[d.date]) byDate[d.date]={...d};
        else{ const x=byDate[d.date]; x.organicReach+=d.organicReach; x.paidReach+=d.paidReach; x.impressions+=d.impressions; x.engagements+=d.engagements; x.clicks+=d.clicks; x.spend+=d.spend; }
      });
    });
    const prevAgg=Object.values(byDate).sort((a,b)=>a.date<b.date?-1:1).slice(0,liAgg.length);
    const t={ org:0, paid:0, impr:0, eng:0, clicks:0, spend:0, sessions:0, conv:0 };
    prevAgg.forEach(d=>{ t.org+=d.organicReach; t.paid+=d.paidReach; t.impr+=d.impressions; t.eng+=d.engagements; t.clicks+=d.clicks; t.spend+=d.spend; });
    prevGa4.slice(0,ga4.length).forEach(g=>{ t.sessions+=g.sessions||0; t.conv+=g.conversions||0; });
    return t;
  }, [prevLiByAccount, prevGa4, liAgg.length, ga4.length]);

  const ctr = totals.impr ? totals.clicks/totals.impr : 0;
  const cpc = totals.clicks ? totals.spend/totals.clicks : 0;
  const cpm = totals.impr ? (totals.spend/totals.impr)*1000 : 0;
  const cr  = totals.sessions ? (totals.conv||0)/totals.sessions : 0;

  const series = useMemo(()=> {
    const map={};
    liAgg.forEach(d=>{ map[d.date]={ date:d.date, ...d }; });
    ga4.forEach(g=>{ map[g.date]={ ...(map[g.date]||{ date:g.date, organicReach:0, paidReach:0, impressions:0, engagements:0, clicks:0, spend:0 }), sessions:g.sessions||0, conversions:g.conversions||0 }; });
    const cur=Object.values(map).sort((a,b)=>a.date<b.date?-1:1);
    let prev=[];
    if(compare){
      const byDate={};
      Object.keys(prevLiByAccount).forEach(id=>{
        (prevLiByAccount[id]||[]).forEach(d=>{
          if(!byDate[d.date]) byDate[d.date]={...d};
          else{ const x=byDate[d.date]; x.organicReach+=d.organicReach; x.paidReach+=d.paidReach; x.impressions+=d.impressions; x.engagements+=d.engagements; x.clicks+=d.clicks; x.spend+=d.spend; }
        });
      });
      const prevAgg=Object.values(byDate).sort((a,b)=>a.date<b.date?-1:1);
      prev = cur.map((d,i)=>({ date:d.date, prevReach:(prevAgg[i]?.organicReach||0)+(prevAgg[i]?.paidReach||0), prevSessions:prevGa4[i]?.sessions||0, prevConversions:prevGa4[i]?.conversions||0 }));
    }
    return cur.map((d,i)=>({ ...d, ...(prev[i]||{}) }));
  }, [liAgg, ga4, compare, prevLiByAccount, prevGa4]);

  const trafficBySource = useMemo(()=>{
    const by={}; ga4.forEach(g=>{ const k=g.source||'unknown'; if(!by[k]) by[k]={ source:k, sessions:0, conversions:0 }; by[k].sessions+=g.sessions||0; by[k].conversions+=g.conversions||0; });
    return Object.values(by).sort((a,b)=>b.sessions-a.sessions);
  }, [ga4]);

  const exportCSV = ()=> {
    const rows = series.map(d=>({
      date:d.date, organicReach:d.organicReach, paidReach:d.paidReach, impressions:d.impressions, clicks:d.clicks,
      engagements:d.engagements, spend:d.spend, sessions:d.sessions||0, conversions:d.conversions||0,
      prevReach:d.prevReach||0, prevSessions:d.prevSessions||0, prevConversions:d.prevConversions||0
    }));
    downloadFile('dashboard_timeseries.csv', toCSV(rows));
  };

  const delta = (cur, prev)=> (!compare || !prev || prev===0) ? null : `${(cur-prev>=0?'▲':'▼')} ${Math.abs(((cur-prev)/prev)*100).toFixed(1)}% vs prev`;

  /* ---------- render (invisu style) ---------- */
  return (
    <div style={{ minHeight:'100vh', background:THEME.pageBg, color:THEME.text, fontFamily:'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' }}>
      <div style={{ maxWidth:THEME.maxw, margin:'0 auto', padding:'28px 20px' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, marginBottom:18 }}>
          <div>
            <h1 style={{ margin:0, fontSize:44, lineHeight:1.04, letterSpacing:'-0.02em', fontWeight:800 }}>Marketing & content der spiller.</h1>
            <div style={{ color:THEME.muted, marginTop:6 }}>LinkedIn (organic + paid) · Website (GA4)</div>
          </div>
          <div><button onClick={exportCSV} style={pill.outline}>Export CSV</button></div>
        </div>

        {/* Controls */}
        <div style={{ background:THEME.card, border:`1px solid ${THEME.border}`, borderRadius:THEME.radius, padding:18 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
            <div>
              <div style={{ marginBottom:10, color:THEME.muted, fontWeight:600 }}>Date range</div>
              <div style={{ marginBottom:10 }}>
                {presets.map(p=>{
                  const active=!manualStart && preset.key===p.key;
                  return <button key={p.key} onClick={()=>{ setPreset(p); setManualStart(''); setManualEnd(''); }} style={{ ...(active?pill.base:pill.outline), marginRight:8, marginBottom:8 }}>{p.label}</button>;
                })}
              </div>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <input type="date" value={manualStart} onChange={e=>setManualStart(e.target.value)} style={{ padding:'10px 14px', borderRadius:999, border:`1px solid ${THEME.border}`, background:'#fff' }} />
                <span style={{ color:THEME.muted }}>to</span>
                <input type="date" value={manualEnd} onChange={e=>setManualEnd(e.target.value)} style={{ padding:'10px 14px', borderRadius:999, border:`1px solid ${THEME.border}`, background:'#fff' }} />
                <button onClick={load} disabled={!manualStart||!manualEnd} style={{ ...(manualStart&&manualEnd?pill.base:pill.outline), opacity:manualStart&&manualEnd?1:0.7 }}>Apply</button>
                <label style={{ marginLeft:10 }}>
                  <input type="checkbox" checked={compare} onChange={e=>setCompare(e.target.checked)} style={{ marginRight:6 }} />
                  Compare to previous period
                </label>
              </div>
            </div>

            <div>
              <div style={{ marginBottom:10, color:THEME.muted, fontWeight:600 }}>Accounts</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                {accounts.map(a=>{
                  const checked=selected.includes(a.id);
                  return (
                    <label key={a.id} style={{ ...(checked?pill.base:pill.outline), display:'inline-flex', alignItems:'center', gap:8 }}>
                      <input type="checkbox" checked={checked}
                        onChange={e=>setSelected(prev=> e.target.checked ? [...prev,a.id] : prev.filter(x=>x!==a.id))}
                        style={{ display:'none' }} />
                      {a.name} · {a.type}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0, 1fr))', gap:18, marginTop:18 }}>
          <KPI label="Total Reach" value={fmt.num(totals.org+totals.paid)} sub={delta(totals.org+totals.paid,(prevTotals.org+prevTotals.paid)||0) || `${fmt.num(totals.org)} organic · ${fmt.num(totals.paid)} paid`} />
          <KPI label="Impressions" value={fmt.num(totals.impr)} sub={delta(totals.impr,prevTotals.impr) || `CTR ${fmt.pct(ctr)}`} />
          <KPI label="Spend" value={fmt.cur(totals.spend)} sub={delta(totals.spend,prevTotals.spend) || `CPC ${fmt.cur(cpc)} · CPM ${fmt.cur(cpm)}`} />
          <KPI label="Website" value={fmt.num(totals.sessions)} sub={delta(totals.sessions,prevTotals.sessions) || `${fmt.num(totals.conv)} conv · CR ${fmt.pct(cr)}`} />
        </div>

        {/* Charts */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:18, marginTop:18 }}>
          <Card title="Reach over time (stacked)">
            <div style={{ height:300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ left:8,right:8,top:8,bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickMargin={8} /><YAxis /><Tooltip formatter={(v)=> typeof v==='number'? v.toLocaleString():v} /><Legend />
                  <Area type="monotone" dataKey="organicReach" name="Organic" stackId="1" strokeWidth={2} />
                  <Area type="monotone" dataKey="paidReach" name="Paid" stackId="1" strokeWidth={2} />
                  {compare && <Line type="monotone" dataKey="prevReach" name="Prev period (total reach)" strokeDasharray="4 4" strokeWidth={2} dot={false} />}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Sessions & Conversions (GA4)">
            <div style={{ height:300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ left:8,right:8,top:8,bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickMargin={8} /><YAxis /><Tooltip /><Legend />
                  <Line type="monotone" dataKey="sessions" name="Sessions" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="conversions" name="Conversions" strokeDasharray="4 4" strokeWidth={2} dot={false} />
                  {compare && <>
                    <Line type="monotone" dataKey="prevSessions" name="Prev Sessions" strokeWidth={2} dot={false} strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="prevConversions" name="Prev Conversions" strokeWidth={2} dot={false} strokeDasharray="2 6" />
                  </>}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:18, marginTop:18 }}>
          <Card title="Impressions, Clicks & Spend">
            <div style={{ height:300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ left:8,right:8,top:8,bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickMargin={8} /><YAxis /><Tooltip /><Legend />
                  <Bar dataKey="impressions" name="Impressions" stackId="a" />
                  <Bar dataKey="clicks" name="Clicks" stackId="a" />
                  <Bar dataKey="spend" name="Spend" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Traffic by Source (GA4)">
            <div style={{ height:300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={trafficBySource} dataKey="sessions" nameKey="source" innerRadius={50} outerRadius={90}>
                    {trafficBySource.map((_,i)=><Cell key={i} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Table */}
        <Card title="Account breakdown (LinkedIn)" style={{ marginTop:18 }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead style={{ color:THEME.muted, textAlign:'left' }}>
                <tr>
                  <th style={{ padding:'10px 12px' }}>Account</th>
                  <th style={{ padding:'10px 12px' }}>Type</th>
                  <th style={{ padding:'10px 12px' }}>Reach (Org)</th>
                  <th style={{ padding:'10px 12px' }}>Reach (Paid)</th>
                  <th style={{ padding:'10px 12px' }}>Impr.</th>
                  <th style={{ padding:'10px 12px' }}>Clicks</th>
                  <th style={{ padding:'10px 12px' }}>Engagements</th>
                  <th style={{ padding:'10px 12px' }}>Spend</th>
                </tr>
              </thead>
              <tbody>
                {accounts.filter(a=>selected.includes(a.id)).map(a=>{
                  const s=(liByAccount[a.id]||[]);
                  const sum=s.reduce((acc,d)=>({ org:acc.org+d.organicReach, paid:acc.paid+d.paidReach, impr:acc.impr+d.impressions, clicks:acc.clicks+d.clicks, eng:acc.eng+d.engagements, spend:acc.spend+d.spend }),{ org:0,paid:0,impr:0,clicks:0,eng:0,spend:0 });
                  return (
                    <tr key={a.id} style={{ borderTop:`1px solid ${THEME.border}` }}>
                      <td style={{ padding:'10px 12px', fontWeight:600 }}>{a.name}</td>
                      <td style={{ padding:'10px 12px' }}>{a.type}</td>
                      <td style={{ padding:'10px 12px' }}>{fmt.num(sum.org)}</td>
                      <td style={{ padding:'10px 12px' }}>{fmt.num(sum.paid)}</td>
                      <td style={{ padding:'10px 12px' }}>{fmt.num(sum.impr)}</td>
                      <td style={{ padding:'10px 12px' }}>{fmt.num(sum.clicks)}</td>
                      <td style={{ padding:'10px 12px' }}>{fmt.num(sum.eng)}</td>
                      <td style={{ padding:'10px 12px' }}>{fmt.cur(sum.spend)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div style={{ color:THEME.muted, fontSize:12, marginTop:12 }}>
          <b>How to connect real data:</b> swap the <code>fetchLinkedInSeries</code> and <code>fetchGA4Series</code> functions for API routes that return the same shape.
        </div>
      </div>
    </div>
  );
}

/* ---------- presentational components ---------- */
function KPI({ label, value, sub }){
  return (
    <div style={{ background:THEME.card, border:`1px solid ${THEME.border}`, borderRadius:THEME.radius, padding:18 }}>
      <div style={{ color:THEME.muted, fontSize:12, marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:34, fontWeight:800, letterSpacing:'-0.02em' }}>{value}</div>
      {sub ? <div style={{ color:THEME.muted, fontSize:12, marginTop:6 }}>{sub}</div> : null}
    </div>
  );
}

function Card({ title, children, style }){
  return (
    <div style={{ background:THEME.card, border:`1px solid ${THEME.border}`, borderRadius:THEME.radius, padding:18, ...style }}>
      <div style={{ fontWeight:700, marginBottom:10, letterSpacing:'-0.01em' }}>{title}</div>
      {children}
    </div>
  );
