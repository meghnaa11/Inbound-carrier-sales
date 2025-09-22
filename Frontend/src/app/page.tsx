'use client';
import { useEffect, useMemo, useState } from 'react';
import { fetchLoads, Load, fetchCallAnalytics, fetchRecentCalls, CallAnalytics, CallEvent } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function ChartsPage(){
  const [loads,setLoads]=useState<Load[]|null>(null);
  const [err,setErr]=useState<string|null>(null);
  const [recent,setRecent]=useState<CallEvent[]|null>(null);
  const [an,setAn]=useState<CallAnalytics|null>(null);

  useEffect(()=>{ (async()=>{
    try{
      setLoads(await fetchLoads(100));
      setAn(await fetchCallAnalytics(7));
      setRecent(await fetchRecentCalls(25));
    }catch(e:any){ setErr(e.message??String(e)); }
  })(); },[]);

  // ---- Load charts ----
  const byEquipment = useMemo(()=>{
    const m = new Map<string,{equipment:string,count:number,total:number}>();
    (loads??[]).forEach(l=>{
      const k=l.equipment_type||'Unknown';
      const o=m.get(k)||{equipment:k,count:0,total:0};
      o.count++; o.total += Number(l.loadboard_rate||0); m.set(k,o);
    });
    return Array.from(m.values()).map(v=>({equipment:v.equipment,count:v.count, avgRate: v.count? Math.round(v.total/v.count):0}));
  },[loads]);

  const rateBuckets = useMemo(()=>{
    const buckets = [500,1000,1500,2000,2500,3000,3500];
    const counts = Array(buckets.length).fill(0);
    (loads??[]).forEach(l=>{
      const r = Number(l.loadboard_rate||0);
      let idx = buckets.findIndex(b=>r<=b);
      if(idx===-1) idx=buckets.length-1;
      counts[idx]++; });
    return buckets.map((b,i)=>({ bucket: `≤${b}`, count: counts[i]}));
  },[loads]);

  // ---- Call analytics transforms ----
  const outcomeSeries = useMemo(()=> !an ? [] : Object.entries(an.outcome_counts).map(([name,value])=>({name,value})), [an]);
  const sentimentSeries = useMemo(()=> !an ? [] : Object.entries(an.sentiment_counts).map(([name,value])=>({name,value})), [an]);
  const stackedByDay = useMemo(()=> an?.by_day ?? [],[an]);
  const outcomeKeys = useMemo(()=> an ? Array.from(new Set(stackedByDay.flatMap(d=>Object.keys(d).filter(k=>k!=='date')))) : [], [an, stackedByDay]);

  return (
    <div className="container">
      <div className="card">
        <h1 className="h1">Load & Call Analytics</h1>
        <p className="p">Loads from <span className="kbd">/loads/search</span> and call metrics from <span className="kbd">/analytics/calls</span>.</p>
        {err && <p className="p">Error: {err}</p>}
        {(!loads || !an) && !err && <p className="p">Loading…</p>}
        {(loads && an) && (
          <>
            {/* Load charts */}
            <div className="grid">
              <div className="card">
                <h3 style={{marginTop:0}}>Loads by Equipment</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={byEquipment}>
                    <defs>
                      <linearGradient id="gradCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8EA8FF" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#5B79F7" stopOpacity={1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
                    <XAxis dataKey="equipment" stroke="#a1a7b3" />
                    <YAxis stroke="#a1a7b3" />
                    <Tooltip contentStyle={{background:"#0f1115", border:"1px solid rgba(255,255,255,.1)", color:"#e8eaed"}}/>
                    <Bar dataKey="count" fill="url(#gradCount)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <h3 style={{marginTop:0}}>Avg Rate by Equipment ($)</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={byEquipment}>
                    <defs>
                      <linearGradient id="gradAvg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#12d579" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#0fb86a" stopOpacity={1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
                    <XAxis dataKey="equipment" stroke="#a1a7b3" />
                    <YAxis stroke="#a1a7b3" />
                    <Tooltip contentStyle={{background:"#0f1115", border:"1px solid rgba(255,255,255,.1)", color:"#e8eaed"}}/>
                    <Bar dataKey="avgRate" fill="url(#gradAvg)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <hr />

            {/* Call analytics charts */}
            <div className="grid">
              <div className="card">
                <h3 style={{marginTop:0}}>Call Outcomes (last 7 days)</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={outcomeSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
                    <XAxis dataKey="name" stroke="#a1a7b3" />
                    <YAxis stroke="#a1a7b3" />
                    <Tooltip contentStyle={{background:"#0f1115", border:"1px solid rgba(255,255,255,.1)", color:"#e8eaed"}}/>
                    <Bar dataKey="value" fill="#9fb2ff" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <h3 style={{marginTop:0}}>Sentiment Mix (last 7 days)</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={sentimentSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
                    <XAxis dataKey="name" stroke="#a1a7b3" />
                    <YAxis stroke="#a1a7b3" />
                    <Tooltip contentStyle={{background:"#0f1115", border:"1px solid rgba(255,255,255,.1)", color:"#e8eaed"}}/>
                    <Bar dataKey="value" fill="#ffd166" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card" style={{marginTop:16}}>
              <h3 style={{marginTop:0}}>Outcomes by Day (stacked)</h3>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={stackedByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
                  <XAxis dataKey="date" stroke="#a1a7b3" />
                  <YAxis stroke="#a1a7b3" />
                  <Tooltip contentStyle={{background:"#0f1115", border:"1px solid rgba(255,255,255,.1)", color:"#e8eaed"}}/>
                  {outcomeKeys.map(k=> (
                    <Bar key={k} dataKey={k} stackId="a" fill="#7c9cff" />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Recent calls table */}
            <div className="card" style={{marginTop:16}}>
              <h3 style={{marginTop:0}}>Recent Calls</h3>
              {recent && recent.length>0 ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>When</th><th>MC #</th><th>Legal Name</th><th>Verified</th>
                      <th>Load</th><th>Outcome</th><th>Sentiment</th><th>Agreed $</th><th>Rounds</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map(r=> (
                      <tr key={r.id}>
                        <td>{r.ts}</td>
                        <td>{r.mc_number ?? ''}</td>
                        <td>{r.legal_name ?? ''}</td>
                        <td>{(r.verified===1||r.verified===true)?'✔':''}</td>
                        <td>{r.load_id ?? ''}</td>
                        <td>{r.outcome ?? ''}</td>
                        <td>{r.sentiment ?? ''}</td>
                        <td>{r.agreed_price ?? ''}</td>
                        <td>{r.negotiation_rounds ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (<p className="p">No recent calls.</p>)}
            </div>

            <p className="small" style={{marginTop:12}}>Showing {loads.length} load(s).</p>
          </>
        )}
      </div>
    </div>
  );
}
