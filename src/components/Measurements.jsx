import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Ruler, Save, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MEASUREMENTS } from '../data/foods';
import { displayDate, monthDays, monthLabel, monthStart, shiftMonth, todayISO, weeklyDates } from '../lib/dates';
import { MiniChart } from './Weight';
import { Notice, Pill, SectionHeading, Spinner } from './UI';

export default function Measurements({user,startDate,onNotify}) {
  const [rows,setRows]=useState([]);
  const [month,setMonth]=useState(monthStart(todayISO()<startDate?startDate:todayISO()));
  const [date,setDate]=useState(startDate);
  const [draft,setDraft]=useState({});
  const [saving,setSaving]=useState(false);
  const [loading,setLoading]=useState(true);
  const [chartKey,setChartKey]=useState('navel_waist');
  const reload=useCallback(async()=>{
    const {data,error}=await supabase.from('measurement_logs').select('*').eq('user_id',user.id).order('log_date');
    if(error)onNotify(error.message,'error');else setRows(data||[]);
    setLoading(false);
  },[user.id,onNotify]);
  useEffect(()=>{reload();},[reload]);
  useEffect(()=>{setDraft(Object.fromEntries(MEASUREMENTS.map(m=>[m.key, rows.find(r=>r.log_date===date)?.[m.key]??''])));},[rows,date]);
  const dates=[...new Set([...weeklyDates(month,startDate),...rows.map(r=>r.log_date).filter(d=>d.startsWith(month.slice(0,7)))])].sort();
  function changeMonth(delta){const next=shiftMonth(month,delta);setMonth(next);setDate(weeklyDates(next,startDate)[0]||monthDays(next)[0]);}
  function chooseDate(d){setDate(d);}
  async function save(e){
    e.preventDefault();
    const values={};let present=false;
    for(const m of MEASUREMENTS){const val=String(draft[m.key]??'').trim();if(val!==''){const n=Number(val);if(!Number.isFinite(n)||n<10||n>300){onNotify(`מדידה לא תקינה: ${m.label}`,'error');return;} values[m.key]=n;present=true;}else values[m.key]=null;}
    if(!present){onNotify('יש להזין לפחות היקף אחד.','error');return;}
    setSaving(true);
    const {error}=await supabase.from('measurement_logs').upsert({user_id:user.id,log_date:date,...values,updated_at:new Date().toISOString()},{onConflict:'user_id,log_date'});
    setSaving(false);if(error)onNotify(error.message,'error');else {onNotify('ההיקפים נשמרו בהצלחה');await reload();}
  }
  async function remove(){
    if(!window.confirm('למחוק את ההיקפים בתאריך הזה?'))return;
    const {error}=await supabase.from('measurement_logs').delete().eq('user_id',user.id).eq('log_date',date);
    if(error)onNotify(error.message,'error');else {onNotify('המדידה נמחקה');await reload();}
  }
  return <div><SectionHeading eyebrow="מעקב היקפים" title="רואה את השינוי גם בסנטימטרים" sub="שש מדידות, פעם בשבוע. נשמרות בטבלה ונוספות לגרף מגמה."/>
    <div className="two-column measurements-layout">
      <section className="panel"><div className="panel-top"><div><h2>המדידות השבועיות</h2><p>בחרי שבוע, הזיני את ההיקפים ולחצי שמירה.</p></div><Ruler size={23} color="#c885a0"/></div>
        <div className="calendar-arrows measure-month"><button className="icon-btn" disabled={monthDays(shiftMonth(month,-1)).at(-1)<startDate} onClick={()=>changeMonth(-1)}><ChevronRight size={18}/></button><span>{monthLabel(month)}</span><button className="icon-btn" onClick={()=>changeMonth(1)}><ChevronLeft size={18}/></button></div>
        <div className="week-chips">{dates.map(d=><button key={d} className={`week-chip ${date===d?'active':''}`} onClick={()=>chooseDate(d)}>{d.slice(8)}.{d.slice(5,7)} {rows.some(r=>r.log_date===d)?'✓':''}</button>)}<button className="week-chip add-chip" onClick={()=>{const chosen=window.prompt('תאריך נוסף בפורמט YYYY-MM-DD:',todayISO());if(chosen&&/^\d{4}-\d{2}-\d{2}$/.test(chosen)&&chosen>=startDate&&!Number.isNaN(new Date(chosen).getTime())){setDate(chosen);setMonth(monthStart(chosen));}}}>+ תאריך נוסף</button></div>
        <h3 className="measure-date">מדידה לתאריך {displayDate(date)}</h3>
        <form onSubmit={save} className="measure-form">{MEASUREMENTS.map(m=><label key={m.key}><span>{m.label}</span><div className="measure-input-wrap"><input type="number" inputMode="decimal" min="10" max="300" step="0.1" placeholder="—" value={draft[m.key]??''} onChange={e=>setDraft(p=>({...p,[m.key]:e.target.value}))}/><span>ס״מ</span></div></label>)}
          <div className="measure-actions"><button className="btn btn-primary" disabled={saving}><Save size={17}/> {saving?'שומרת...':'שמירת מדידות'}</button>{rows.some(r=>r.log_date===date)&&<button type="button" className="btn btn-outline danger-text" onClick={remove}><Trash2 size={16}/> מחיקה</button>}</div>
        </form>
      </section>
      <section className="measure-side"><div className="panel"><div className="panel-top"><div><h2>מגמת ההיקפים</h2><p>בחרי היקף כדי לראות את השינוי לאורך זמן.</p></div></div>
        <select className="food-select" value={chartKey} onChange={e=>setChartKey(e.target.value)}>{MEASUREMENTS.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}</select>
        {loading?<Spinner/>:<MiniChart rows={rows} keyName={chartKey} unit="היקפים בס״מ" color="#b89aca"/>}
      </div>
      <div className="panel"><div className="panel-top"><h2>טבלת ההיסטוריה</h2><Pill tone="neutral">{rows.length} מדידות</Pill></div><div className="table-scroll"><table className="data-table compact"><thead><tr><th>תאריך</th>{MEASUREMENTS.map(m=><th key={m.key}>{m.label.replace('היקף ','').split(' (')[0]}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.log_date} onClick={()=>{setDate(row.log_date);setMonth(monthStart(row.log_date));}} className="clickable-row"><td>{row.log_date.slice(8)}.{row.log_date.slice(5,7)}</td>{MEASUREMENTS.map(m=><td key={m.key}>{row[m.key]??'—'}</td>)}</tr>)}</tbody></table></div>{rows.length===0&&<p className="muted">לא נשמרו מדידות עדיין.</p>}</div>
      </section></div>
    <Notice>מומלץ למדוד באותם תנאים בכל שבוע. המדידות הן למעקב אישי בלבד.</Notice></div>;
}
