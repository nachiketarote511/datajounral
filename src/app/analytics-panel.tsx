"use client";

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";

type Item = { name: string; value: string; count: number };
type Analytics = {
  totalTrades:number; wins:number; losses:number; winRate:string; avgWinner:string; avgLoser:string;
  largestWinner:string; largestLoser:string; profitFactor:string|null; expectancy:string;
  totalFeesInr:string; totalGstInr:string; totalFundingInr:string; maxDrawdownPct:string;
  maxDrawdownAmount:string; winStreak:number; lossStreak:number;
  setupPerformance:{setup:string;pnl:string;count:number}[];
  mistakeCost:{mistake:string;cost:string;count:number}[];
  emotionAnalysis:{emotion:string;pnl:string;count:number}[];
};
const inr=(v:string)=>`₹${Number(v||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}`;

export default function AnalyticsPanel(){
  const [data,setData]=useState<Analytics|null>(null);
  const [error,setError]=useState("");
  useEffect(()=>{fetch("/api/analytics").then(r=>r.ok?r.json():Promise.reject()).then(j=>setData(j.data)).catch(()=>setError("Unable to load analytics. Try again."))},[]);
  if(error)return <div className="error-banner">{error}</div>;
  if(!data)return <div className="empty-panel">Loading analytics…</div>;
  if(!data.totalTrades)return <div className="empty-state analytics-empty"><div className="empty-icon"><BarChart3 size={19}/></div><strong>Analytics will appear after trades are recorded.</strong><span>Record trades to see expectancy, fee impact, drawdown, setups, and execution patterns.</span></div>;
  const metrics=[
    ["TOTAL TRADES",String(data.totalTrades),`${data.wins} wins · ${data.losses} losses`],
    ["WIN RATE",`${Number(data.winRate).toFixed(1)}%`,"Wins / total trades"],
    ["PROFIT FACTOR",data.profitFactor===null?"No losses":Number(data.profitFactor).toFixed(2),"Gross wins / gross losses"],
    ["EXPECTANCY",inr(data.expectancy),"Average net P&L per trade"],
  ];
  const performance=[
    ["Average winner",inr(data.avgWinner),`Largest winner · ${inr(data.largestWinner)}`],
    ["Average loser",inr(data.avgLoser),`Largest loser · ${inr(data.largestLoser)}`],
    ["Maximum drawdown",`${Number(data.maxDrawdownPct).toFixed(2)}%`,`${inr(data.maxDrawdownAmount)} peak to trough`],
    ["Longest streaks",`${data.winStreak} wins`,`${data.lossStreak} losses`],
  ];
  const lists:[string,Item[]][]=[
    ["Setup performance",data.setupPerformance.map(x=>({name:x.setup,value:x.pnl,count:x.count}))],
    ["Mistake cost",data.mistakeCost.map(x=>({name:x.mistake,value:x.cost,count:x.count}))],
    ["Emotion analysis",data.emotionAnalysis.map(x=>({name:x.emotion,value:x.pnl,count:x.count}))],
  ];
  return <>
    <div className="summary-strip analytics-strip">{metrics.map(([label,value,note])=><div key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>)}</div>
    <div className="section-heading"><div><h2>Performance profile</h2><span>Net realized results in INR unless stated otherwise.</span></div></div>
    <div className="analytics-grid">{performance.map(([label,value,note])=><div className="analytics-metric" key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>)}</div>
    <div className="section-heading"><div><h2>Trading costs</h2><span>Converted at each trade’s stored FX rate.</span></div></div>
    <div className="execution-panel"><div className="execution-stat"><span>FEES · INR</span><strong>{inr(data.totalFeesInr)}</strong></div><div className="execution-stat"><span>GST · INR</span><strong>{inr(data.totalGstInr)}</strong></div><div className="execution-stat"><span>FUNDING · INR</span><strong>{inr(data.totalFundingInr)}</strong></div></div>
    {lists.filter(([,items])=>items.length>0).map(([title,items])=><div className="analytics-list" key={title}><h3>{title}</h3>{items.map(item=><div className="analytics-list-row" key={item.name}><span>{item.name}<small>{item.count} trades</small></span><b className={title==="Mistake cost"?"negative":Number(item.value)>=0?"positive":"negative"}>{title==="Mistake cost"?inr(item.value):inr(item.value)}</b></div>)}</div>)}
  </>;
}
