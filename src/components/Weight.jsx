import React, {useCallback, useEffect, useMemo, useState} from 'react';
import { ArrowDownRight, ArrowUpRight, Scale, Plus, Trash2, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { displayDate, formatWeight, monthDays, monthLabel, monthStart, shiftMonth, todayISO, weeklyDates } from '../lib/dates';
import { EmptyState, Notice, Pill, SectionHeading, Spinner } from './UI';

export function MiniChart({ rows, keyName, unit = '', color = '#ce819c' }) {
  const data=rows.filter(row=>row[keyName]!==null && row[keyName]!==undefined).map(row=>({value:Number(row[keyName]),date:row.log_date}));
  if(data.length<2)return <div className="chart-empty">הגרף יוצג לאחר לפחות שתי מדידות 🌱</div>;
  const vals=data.map(x=>x.value);
  const min=Math.min(...vals),max=Math.max(...vals);
  const padding=Math.max((max-min)*.2, 1);
  const lo=min-padding,hi=max+padding;
  const pts=data.map((entry,i)=>({ x: 24+(i/(data.length-1))*612,y:30+(1-(entry.value-lo)/(hi-lo))*178, ...entry }));
  const points=pts.map(p=>`${p.x},${p.y}`).join(' ');
  return <div className="chart-box"><svg role="img" aria-label={`גרף ${unit}, ${data.length} מדידות`} viewBox="0 0 660 244" preserveAspectRatio="xMidYMid meet">
    {[52,96,140,184].map(y=><line key={y} x1="20" x2="640" y1={y} y2={y} stroke="#f0e9ec" strokeWidth="1" />)}
    <polyline fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" points={points}/>
    {pts.map((p,i)=><g key={i}><circle cx={p.x} cy={p.y} r="6" fill="white" stroke={color} strokeWidth="3"/><text x={p.x} y={p.y-13} fontSize="13" fontWeight="700" fill="#40404d" textAnchor="middle">{p.value}</text></g>)}
    <text x="24" y="235" fontSize="12" fill="#888493">{data[0].date.split('-').reverse().slice(0,2).join('.')}</text><text x="636" y="235" fontSize="12" textAnchor="end" fill="#888493">{data.at(-1).date.split('-').reverse().slice(0,2).join('.')}</text>
  </svg></div>;
}

export default function Weight({user,startDate,onNotify}) {
  const [rows,setRows]=useState([]);
  const [month,setMonth]=useState(monthStart(todayISO()<startDate?startDate:todayISO()));
  const [editing,setEditing]=useState({});
  const [busy,setBusy]=useState('');
  const [loading,setLoading]=useState(true);
  const [extraDate,setExtraDate]=useState('');
  const [manualDates,setManualDates]=useState([]);
  const reload=useCallback(async()=>{
    const {data,error}=await supabase.from('weight_logs').select('log_date,weight_kg').eq('user_id',user.id).order('log_date');
    if(error)onNotify(error.message,'error');else setRows(data||[]);
    setLoading(false);
  },[user.id,onNotify]);
  useEffect(()=>{reload();},[reload]);
  const monthSchedule=weeklyDates(month,startDate);
  const dates=[...new Set([...monthSchedule,...manualDates.filter(d=>d.startsWith(month.slice(0,7))),...rows.map(r=>r.log_date).filter(d=>d.startsWith(month.slice(0,7)))])].sort();
  const initial=rows.find(r=>r.log_date===startDate),current=rows.at(-1);
  const delta=initial&&current ? Number(current.weight_kg)-Number(initial.weight_kg):null;
  async function save(date){
    const value=editing[date]??rows.find(r=>r.log_date===date)?.weight_kg;
    if(value===''||value===null||value===undefined || !Number.isFinite(Number(value)) || Number(value)<20 || Number(value)>400){onNotify('נא להזין משקל תקין בק״ג.','error');return;}
    setBusy(date);
    const {error}=await supabase.from('weight_logs').upsert({user_id:user.id,log_date:date,weight_kg:Number(value),updated_at:new Date().toISOString()},{onConflict:'user_id,log_date'});
    setBusy(''); if(error)onNotify(error.message,'error');else {onNotify('המשקל נשמר בהצלחה');await reload();setEditing(p=>({...p,[date]:undefined}));}
  }
  async function remove(date){
    if(!window.confirm('למחוק את מדידת המשקל בתאריך הזה?'))return;
    const {error}=await supabase.from('weight_logs').delete().eq('user_id',user.id).eq('log_date',date);
    if(error)onNotify(error.message,'error');else {onNotify('המדידה נמחקה');await reload();}
  }
  return <div><SectionHeading eyebrow="מסע המשקל" title="כל צעד קטן הוא התקדמות" sub="מדידת פתיחה ב־1.11.2026, ולאחר מכן שקילה בכל יום חמישי."/>
    <div className="stats-grid three">
      <div className="stat-card"><span>משקל התחלתי</span><strong>{initial?formatWeight(initial.weight_kg):'—'} <small>ק״ג</small></strong><p>{initial?displayDate(initial.log_date):'טרם הוזן'}</p></div>
      <div className="stat-card"><span>המשקל האחרון</span><strong>{current?formatWeight(current.weight_kg):'—'} <small>ק״ג</small></strong><p>{current?displayDate(current.log_date):'טרם הוזן'}</p></div>
      <div className="stat-card highlighted"><span>שינוי מההתחלה</span><strong>{delta===null?'—':`${delta>0?'+':''}${formatWeight(delta)}`} <small>ק״ג</small></strong><p>{delta===null?'נראה כאן את השינוי':delta<0?<><ArrowDownRight size={15}/> ירידה במשקל</>:delta>0?<><ArrowUpRight size={15}/> עלייה במשקל</>:'ללא שינוי'}</p></div>
    </div>
    <section className="panel chart-panel"><div className="panel-top"><h2>מגמת המשקל שלי</h2><Pill tone="neutral">ק״ג לאורך זמן</Pill></div>{loading?<Spinner/>:<MiniChart rows={rows} keyName="weight_kg" unit="משקל בק״ג"/>}</section>
    <section className="panel"><div className="panel-top"><div><h2>טבלת השקילות</h2><p>המדידה הראשונה נרשמת ביום ההתחלה, והשאר בימי חמישי.</p></div><div className="calendar-arrows"><button className="icon-btn" disabled={monthDays(shiftMonth(month,-1)).at(-1)<startDate} onClick={()=>setMonth(shiftMonth(month,-1))}><ChevronRight size={18}/></button><span>{monthLabel(month)}</span><button className="icon-btn" onClick={()=>setMonth(shiftMonth(month,1))}><ChevronLeft size={18}/></button></div></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>תאריך</th><th>משקל (ק״ג)</th><th>שמירה</th></tr></thead><tbody>{dates.map(d=>{const r=rows.find(row=>row.log_date===d);return <tr key={d}><td><strong>{displayDate(d)}</strong>{d===startDate&&<span className="tiny-tag">פתיחה</span>}</td><td><input type="number" inputMode="decimal" min="20" max="400" step="0.1" className="table-input" placeholder="למשל 80.0" value={editing[d]??r?.weight_kg??''} onChange={e=>setEditing(p=>({...p,[d]:e.target.value}))}/></td><td><div className="table-action"><button className="btn btn-small btn-primary" disabled={busy===d} onClick={()=>save(d)}><Save size={15}/> {busy===d?'שומרת':'שמירה'}</button>{r&&<button className="icon-btn danger" aria-label="מחיקה" onClick={()=>remove(d)}><Trash2 size={16}/></button>}</div></td></tr>})}</tbody></table></div>
      <div className="add-measure"><label>שקילה נוספת בתאריך אחר <input type="date" min={startDate} value={extraDate} onChange={e=>setExtraDate(e.target.value)}/></label><button className="btn btn-soft" disabled={!extraDate} onClick={()=>{setMonth(monthStart(extraDate));setManualDates(p=>[...new Set([...p,extraDate])]);setEditing(p=>({...p,[extraDate]:p[extraDate]||''}));setExtraDate('');}}><Plus size={17}/> הוספת תאריך</button></div>
      <Notice>לשקילות השבועיות אפשר להוסיף גם שקילה בכל תאריך אחר. משקל ההתחלה מחושב רק ממדידת 1.11.2026 (או מתאריך ההתחלה המעודכן של המשתמשת).</Notice>
    </section></div>;
}
