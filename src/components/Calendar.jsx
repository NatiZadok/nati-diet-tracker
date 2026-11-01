import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, ArrowUpLeft, Check, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { dayNumber, displayDate, monthDays, monthLabel, monthStart, shiftMonth, todayISO, parseISO } from '../lib/dates';
import { MEAL_DEFINITIONS, foodLabel } from '../data/foods';
import { EmptyState, Pill, SectionHeading, Spinner } from './UI';
import { STEP_TARGET, stepsReached, stepPercent } from '../lib/steps';
import {WATER_TARGET_ML, formatLiters, waterReached, waterPercent} from '../lib/water';
import {dayMealStats, mealComplete} from '../lib/calories';

function chosenSummary(choices = {}) {
  const values = Object.entries(choices).filter(([key,value]) => key!=='mode' && key!=='calorieOverride' && value);
  return values.map(([key,value]) => key==='snackbar' ? value : foodLabel(value)).filter(Boolean);
}

export default function Calendar({ user, startDate, navigateToMeals }) {
  const [month,setMonth] = useState(monthStart(todayISO()<startDate?startDate:todayISO()));
  const [selected,setSelected] = useState(todayISO()<startDate?startDate:todayISO());
  const [rows,setRows] = useState([]);
  const [stepRows,setStepRows] = useState([]);
  const [waterRows,setWaterRows] = useState([]);
  const [fetchError,setFetchError] = useState('');
  const [loading,setLoading] = useState(true);
  useEffect(()=>{
    let alive=true;setLoading(true);setFetchError('');
    const first=monthDays(month)[0], last=monthDays(month).at(-1);
    Promise.all([
      supabase.from('meal_logs').select('log_date, meal_number, choices').eq('user_id',user.id).gte('log_date',first).lte('log_date',last),
      supabase.from('step_logs').select('log_date, steps').eq('user_id',user.id).gte('log_date',first).lte('log_date',last),
      supabase.from('water_logs').select('log_date, ml').eq('user_id',user.id).gte('log_date',first).lte('log_date',last)
    ]).then(([mealsResult, stepsResult, waterResult])=>{
      if(!alive)return;
      setRows(mealsResult.error ? [] : mealsResult.data||[]);
      setStepRows(stepsResult.error ? [] : stepsResult.data||[]);
      setWaterRows(waterResult.error ? [] : waterResult.data||[]);
      if(mealsResult.error || stepsResult.error || waterResult.error)setFetchError('חלק מנתוני היומן לא נטענו. אם טרם הרצת את עדכון המים, הריצי את קובץ ה־SQL ב־Supabase ורענני.');
      setLoading(false);
    });
    return ()=>{alive=false;};
  },[user.id,month]);
  const allDays=useMemo(()=>monthDays(month),[month]);
  const monthOffset=parseISO(allDays[0]).getDay();
  const byDay=useMemo(()=>{
    const out={};rows.forEach(row=>{if(!out[row.log_date])out[row.log_date]=[];out[row.log_date].push(row);});return out;
  },[rows]);
  const stepsByDate = useMemo(() => Object.fromEntries(stepRows.map(row=>[row.log_date,row.steps])), [stepRows]);
  const chosenSteps = stepsByDate[selected] ?? null;
  const waterByDate = useMemo(() => Object.fromEntries(waterRows.map(row=>[row.log_date,row.ml])), [waterRows]);
  const chosenWater = waterByDate[selected] ?? null;
  const goalDays = stepRows.filter(row => stepsReached(row.steps)).length;
  const today=todayISO();
  const chosen=byDay[selected]||[];
  const dayIsComplete = d => (byDay[d]||[]).length>=4 && [1,2,3,4].every(no=>(byDay[d]||[]).some(row=>Number(row.meal_number)===no && mealComplete(no,row.choices)));
  const greenDays = allDays.filter(d=>dayIsComplete(d) && stepsReached(stepsByDate[d])).length;
  const completedDays=allDays.filter(dayIsComplete).length;
  const selectedCalorieStats=dayMealStats(Object.fromEntries(chosen.map(r=>[r.meal_number,r.choices])));
  function changeMonth(step){
    const next=shiftMonth(month,step);
    if(step<0 && monthDays(next).at(-1)<startDate)return;
    setMonth(next);setSelected(monthDays(next).find(d=>d>=startDate)||monthDays(next).at(-1));
  }
  return <div><SectionHeading eyebrow="היומן האישי" title="המסע שלי, יום אחרי יום" sub="לחצי על תאריך כדי לראות ארוחות, מים וצעדים. יום ירוק = 4 ארוחות מלאות וגם 10,000 צעדים." />
    <div className="two-column calendar-layout"><section className="panel calendar-panel">
      <div className="calendar-head"><div><span className="eyebrow">יומן חודשי</span><h2>{monthLabel(month)}</h2></div><div className="calendar-arrows"><button className="icon-btn" aria-label="לחודש קודם" disabled={monthDays(shiftMonth(month,-1)).at(-1)<startDate} onClick={()=>changeMonth(-1)}><ChevronRight size={19}/></button><button className="icon-btn" aria-label="לחודש הבא" onClick={()=>changeMonth(1)}><ChevronLeft size={19}/></button></div></div>
      <div className="calendar-grid">{['א','ב','ג','ד','ה','ו','ש'].map((name,i)=><div key={i} className="calendar-weekday">{name}</div>)}
        {Array.from({length:monthOffset},(_,i)=><div key={`blank-${i}`} className="calendar-empty"/>)}
        {allDays.map(d=>{const logs=byDay[d]||[];const green=dayIsComplete(d) && stepsReached(stepsByDate[d]);const mealCount=logs.filter(row=>mealComplete(row.meal_number,row.choices)).length;return <button key={d} type="button" disabled={d<startDate} onClick={()=>setSelected(d)} className={`calendar-day ${selected===d?'selected':''} ${d===today?'is-today':''} ${d<startDate?'disabled':''} ${green?'all-goals-met':''}`} aria-label={`${displayDate(d)} - ${mealCount} ארוחות הושלמו${stepsByDate[d] == null ? '' : `, ${stepsByDate[d]} צעדים`}${waterByDate[d] == null ? '' : `, ${formatLiters(waterByDate[d])} ליטר מים`}${green ? ' - יום ירוק' : ''}`}><span>{parseISO(d).getDate()}</span><div className="day-dots">{logs.filter(r=>mealComplete(r.meal_number,r.choices)).map(r=><i key={r.meal_number}/>)}</div>{stepsByDate[d] != null && <span className={`calendar-step-badge ${stepsReached(stepsByDate[d])?'met':'logged'}`}>{green ? '✓ יום מלא' : stepsReached(stepsByDate[d]) ? '✓ צעדים' : '👟'}</span>}{waterByDate[d] != null && <span className="calendar-water-badge">💧{formatLiters(waterByDate[d])}ל׳</span>}</button>})}
      </div>
      <div className="calendar-legend"><span><i className="legend-dot"/> נקודה לכל ארוחה מלאה</span><span><CalendarDays size={14}/> {completedDays} ימים מלאים החודש</span><span>✓ {goalDays} ימים עם 10,000 צעדים</span><span className="legend-green"><i/> {greenDays} ימים ירוקים (ארוחות + צעדים)</span></div>
      {loading&&<Spinner/>}{fetchError&&<p className="steps-error" role="alert">{fetchError}</p>}
    </section>
    <section className="panel day-recap"><div className="day-recap-head"><span className="eyebrow">סיכום היום הנבחר</span><h2>{displayDate(selected,true)}</h2><Pill tone="pink">יום {Math.max(1,dayNumber(selected,startDate))} לתפריט</Pill></div>
      <div className="calendar-steps-recap">
        <strong>👟 צעדים ביום הזה</strong>
        {chosenSteps === null ? <span>טרם הוזנו צעדים</span> : <><span>{Number(chosenSteps).toLocaleString('he-IL')} / {STEP_TARGET.toLocaleString('he-IL')}</span><span className={stepsReached(chosenSteps) ? 'goal-success' : 'goal-pending'}>{stepsReached(chosenSteps) ? '✓ עמדת ביעד' : `עוד ${(STEP_TARGET - chosenSteps).toLocaleString('he-IL')} צעדים ליעד`}</span></>}
        <div className="steps-progress compact"><div className={stepsReached(chosenSteps) ? 'reached' : ''} style={{width:`${stepPercent(chosenSteps)}%`}}/></div>
      </div>
      <div className="calendar-water-recap"><strong>💧 מים ביום הזה</strong>{chosenWater===null?<span>טרם דווחה שתייה</span>:<><span>{formatLiters(chosenWater)} / 3 ליטר</span><span className={waterReached(chosenWater)?'goal-success':'goal-pending'}>{waterReached(chosenWater)?'✓ הגעת ליעד המים':`עוד ${formatLiters(WATER_TARGET_ML-chosenWater)} ליטר ליעד`}</span></>}<div className="steps-progress compact"><div className={waterReached(chosenWater)?'reached':''} style={{width:`${waterPercent(chosenWater)}%`}}/></div></div>
      <div className="calendar-calories-recap"><strong>🍽️ קלוריות לפי בחירות</strong><span>{selectedCalorieStats.actual} / {selectedCalorieStats.target} קק״ל (אומדן או ערך שהוזן ידנית)</span><span>ארוחות שהושלמו: {selectedCalorieStats.completed}/4</span>{dayIsComplete(selected) && stepsReached(chosenSteps) && <strong className="goal-success">✓ יום ירוק: ארבע ארוחות ויעד צעדים הושלמו!</strong>}</div>
      {chosen.length===0?<EmptyState emoji="🍽️" title="אין עדיין בחירות ביום הזה" text="אפשר לפתוח את התפריט ולהתחיל לבחור מאכלים."/>:<div className="recap-list">{MEAL_DEFINITIONS.map(meal=>{const row=chosen.find(r=>r.meal_number===meal.no);return <div className="recap-item" key={meal.no}><div className="recap-dot">{row?<Check size={14}/>:meal.no}</div><div><strong>{meal.emoji} {meal.title} {row && <small className="recap-meal-calories">· {dayMealStats({[meal.no]:row.choices}).items.find(x=>x.mealNo===meal.no)?.value} / {meal.calories} קק״ל</small>}</strong>{row ? <p>{chosenSummary(row.choices).join(' · ')||'טרם נבחרו מזונות'}</p>:<p>עדיין לא נבחרו מאכלים</p>}</div></div>})}</div>}
      <button className="btn btn-primary full" onClick={()=>navigateToMeals(selected)}><BookOpen size={18}/> פתיחת התפריט לתאריך זה <ArrowUpLeft size={18}/></button>
    </section></div></div>;
}
