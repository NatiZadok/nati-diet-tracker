import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, ChevronLeft, CalendarDays, Check, Clock3, CloudUpload, AlertTriangle, RotateCcw, Info } from 'lucide-react';
import { FOOD_BY_GROUP, FOOD_BY_ID, MEAL_DEFINITIONS } from '../data/foods';
import { addDays, dayNumber, displayDate, todayISO } from '../lib/dates';
import { supabase } from '../lib/supabase';
import { Pill, SectionHeading, Notice, Spinner } from './UI';
import Steps from './Steps';
import Water from './Water';
import {dayMealStats, hasFood, mealCalories, mealComplete} from '../lib/calories';

const empty = () => ({});

function FoodSelect({ group, label, value = '', onChange, optional = false }) {
  return <label className="food-field"><span>{label} {optional && <small>(רשות)</small>}</span>
    <select className="food-select" value={value} onChange={e=>onChange(e.target.value)}>
      <option value="">לבחירה מתוך הרשימה...</option>
      {FOOD_BY_GROUP[group].items.map((food) => <option key={food.id} value={food.id}>{food.label}</option>)}
    </select></label>;
}
function VegFields({ choices, update, amount = 4 }) {
  return <div className="veg-fields">{Array.from({length: amount}, (_, i) => (
    <FoodSelect key={i} group="veg" label={`ירק ${i+1}`} optional={i===3} value={choices[`veg${i+1}`] || ''} onChange={v=>update(`veg${i+1}`,v)}/>
  ))}</div>;
}
function MealCard({ definition: meal, choices = {}, onChange, saveState, retry }) {
  const mode = choices.mode || 'carb';
  const update = (key, value) => onChange({...choices, [key]: value, ...(key === 'calorieOverride' ? {} : {calorieOverride: ''})});
  const updateMode = (v) => onChange({ ...choices, mode:v, carb:'', fat1:'', fat2:'', snackbar:'', calorieOverride:'' });
  const totalSelected = Object.entries(choices).filter(([key, value]) => key !== 'mode' && (FOOD_BY_ID[value] || key === 'snackbar' && value)).length;
  const mealSnackIsBar = meal.no === 3 && mode === 'bar';
  const calories = mealCalories(choices);
  const isComplete = mealComplete(meal.no, choices);
  return <article className="meal-card">
    <header className="meal-head"><div className="meal-head-main"><span className="meal-icon">{meal.emoji}</span><div><h3>ארוחה {meal.no} <span className="meal-dot">·</span> {meal.title}</h3><p>{meal.formula}</p></div></div><div className="meal-head-side"><Pill tone="pink">{calories.value} / {meal.calories} קק״ל</Pill><span className={`meal-completeness ${isComplete ? 'complete' : ''}`}>{isComplete ? '✓ ארוחה הושלמה' : 'ארוחה לא הושלמה'}</span>{saveState === 'saved' && <span className="save-indicator saved"><Check size={14}/> נשמר</span>}{saveState === 'saving' && <span className="save-indicator"><CloudUpload size={14}/> שומר...</span>}{saveState === 'error' && <button className="save-indicator error" onClick={retry}><RotateCcw size={13}/> שגיאה · נסי שוב</button>}</div></header>
    <div className="meal-body">
      {(meal.no === 2 || meal.no === 3) && <div className="choose-switch" role="group" aria-label="סוג תחליף">
        <button type="button" className={mode === 'carb'?'active':''} onClick={()=>updateMode('carb')}>מנת פחמימה</button>
        <button type="button" className={mode === 'fat'?'active':''} onClick={()=>updateMode('fat')}>2 מנות שומן</button>
        {meal.no === 3 && <button type="button" className={mode === 'bar'?'active':''} onClick={()=>updateMode('bar')}>חטיף חלבון</button>}
      </div>}
      {meal.no === 1 && <div className="meal-fields three"><FoodSelect group="carb" label="פחמימה" value={choices.carb} onChange={v=>update('carb',v)}/><FoodSelect group="proteinSmall" label="חלבון קטן" value={choices.protein1} onChange={v=>update('protein1',v)}/><FoodSelect group="veg" label="ירק" value={choices.veg1} onChange={v=>update('veg1',v)}/></div>}
      {meal.no === 2 && <div className="meal-fields">
        {mode==='carb' ? <FoodSelect group="carb" label="פחמימה אחת" value={choices.carb} onChange={v=>update('carb',v)}/> : <div className="dual"><FoodSelect group="fat" label="שומן 1" value={choices.fat1} onChange={v=>update('fat1',v)}/><FoodSelect group="fat" label="שומן 2" value={choices.fat2} onChange={v=>update('fat2',v)}/></div>}
        <div className="dual"><FoodSelect group="proteinBig" label="חלבון גדול 1" value={choices.protein1} onChange={v=>update('protein1',v)}/><FoodSelect group="proteinBig" label="חלבון גדול 2" value={choices.protein2} onChange={v=>update('protein2',v)}/></div>
        <VegFields choices={choices} update={update}/></div>}
      {meal.no === 3 && (mealSnackIsBar ? <div className="snack-alt"><div className="field-caption">חלופה לכל ארוחת הביניים</div><select className="food-select" value={choices.snackbar || ''} onChange={e=>update('snackbar',e.target.value)}><option value="">בחרי חטיף...</option><option value="חטיף חלבון עד 210 קק״ל">חטיף חלבון עד 210 קק״ל</option></select><p className="fine-print">כאשר בוחרים חטיף חלבון, הוא מחליף את הארוחה כולה.</p></div> : <div className="meal-fields"><div className="dual">{mode==='carb' ? <FoodSelect group="carb" label="מנת פחמימה" value={choices.carb} onChange={v=>update('carb',v)}/> : <div className="dual nested"><FoodSelect group="fat" label="שומן 1" value={choices.fat1} onChange={v=>update('fat1',v)}/><FoodSelect group="fat" label="שומן 2" value={choices.fat2} onChange={v=>update('fat2',v)}/></div>}<FoodSelect group="proteinSmall" label="חלבון קטן" value={choices.protein1} onChange={v=>update('protein1',v)}/></div></div>)}
      {meal.no === 4 && <div className="meal-fields"><FoodSelect group="proteinSmall" label="מנת חלבון קטנה" value={choices.protein1} onChange={v=>update('protein1',v)}/><VegFields choices={choices} update={update}/></div>}
      <div className="meal-calorie-box">
        <div className="meal-calorie-header"><div><strong>קלוריות בארוחה</strong><span>{calories.manuallyEntered ? 'לפי הערך המדויק שהזנת' : 'הערכה לפי מנות התחליפים'}</span></div><strong className="calorie-fraction">{calories.value} / {meal.calories} <small>קק״ל</small></strong></div>
        <div className="calorie-progress"><div style={{width:`${Math.min(100,calories.value / meal.calories * 100)}%`}}/></div>
        <label className="calorie-manual-field">אם יש לך קלוריות מדויקות מהאריזה או שקילה, אפשר להזין אותן כאן:
          <input type="number" inputMode="numeric" min="0" max="5000" step="1" placeholder={`מחושב: ${calories.estimated} קק״ל`} value={choices.calorieOverride ?? ''} onChange={e=>update('calorieOverride',e.target.value)} />
        </label>
        <small className="calorie-hint">החישוב האוטומטי משוער בלבד. כשמשנים מזון, הערך הידני מתאפס כדי למנוע מספר לא מעודכן.</small>
      </div>
      <footer className="meal-footer"><span><Check size={14}/>{totalSelected} מרכיבים נבחרו</span><span>השינויים נשמרים אוטומטית בענן</span></footer>
    </div>
  </article>;
}

export default function Meals({ user, date, setDate, startDate, onNotify, onOpenStepSummary }) {
  const [entries, setEntries] = useState({});
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const timers = useRef(new Map());
  const drafts = useRef(new Map());
  const saveQueues = useRef(new Map());
  const activeDateRef = useRef(date);
  activeDateRef.current = date;
  const dateKey = date;

  useEffect(() => {
    let alive = true;
    setLoading(true); setStatuses({}); setEntries({});
    (async () => {
      const { data, error } = await supabase.from('meal_logs').select('meal_number, choices').eq('user_id',user.id).eq('log_date',dateKey);
      if (!alive) return;
      if (error) onNotify(error.message,'error');
      else setEntries(Object.fromEntries((data || []).map(row=>[row.meal_number,row.choices || {}])));
      setLoading(false);
    })();
    return () => {alive = false;};
  }, [user.id, dateKey, onNotify]);

  const persist = useCallback(async (key, d, mealNo, next) => {
    setStatuses(prev => d === activeDateRef.current ? {...prev,[mealNo]:'saving'}:prev);
    const res = hasFood(next)
      ? await supabase.from('meal_logs').upsert({user_id:user.id,log_date:d,meal_number:mealNo,choices:next,updated_at:new Date().toISOString()},{onConflict:'user_id,log_date,meal_number'})
      : await supabase.from('meal_logs').delete().eq('user_id',user.id).eq('log_date',d).eq('meal_number',mealNo);
    if (drafts.current.get(key)?.value !== next) return; // Another edit is already pending.
    setStatuses(prev => d === activeDateRef.current ? {...prev,[mealNo]:res.error?'error':'saved'}:prev);
    if (res.error) onNotify('שמירת הארוחה נכשלה. נסי שוב.', 'error');
  },[user.id,onNotify]);

  function updateMeal(mealNo, next) {
    setEntries(prev=>({...prev,[mealNo]:next}));
    setStatuses(prev=>({...prev,[mealNo]:'pending'}));
    const key=`${user.id}:${dateKey}:${mealNo}`;
    drafts.current.set(key,{value:next});
    if (timers.current.has(key)) clearTimeout(timers.current.get(key));
    timers.current.set(key,setTimeout(()=>{
      timers.current.delete(key);
      const previous = saveQueues.current.get(key) || Promise.resolve();
      const queued = previous.catch(()=>{}).then(()=>persist(key,dateKey,mealNo,next));
      saveQueues.current.set(key, queued);
    },550));
  }
  function retry(mealNo) {
    const key=`${user.id}:${dateKey}:${mealNo}`;
    const next = entries[mealNo] || {};
    drafts.current.set(key,{value:next});
    if(timers.current.has(key)) clearTimeout(timers.current.get(key));
    persist(key,dateKey,mealNo,next);
  }
  useEffect(()=>()=>{for (const timer of timers.current.values())clearTimeout(timer);},[]);
  const daily = dayMealStats(entries);
  return <div>
    <SectionHeading eyebrow="התפריט היומי שלי" title="היום בוחרת בשבילי 🌷" sub="ארבע ארוחות, אפשרויות בחירה ושמירה אוטומטית של כל יום"/>
    <div className="date-toolbar"><div className="date-info"><CalendarDays size={22}/><div><strong>{displayDate(date,true)}</strong><span>יום {Math.max(1,dayNumber(date,startDate))} לתפריט</span></div></div>
      <div className="date-actions"><button className="icon-btn" aria-label="יום קודם" disabled={date<=startDate} onClick={()=>setDate(addDays(date,-1))}><ChevronRight size={20}/></button><input aria-label="בחירת תאריך" type="date" value={date} min={startDate} onChange={e=>e.target.value&&setDate(e.target.value)}/><button className="icon-btn" aria-label="יום הבא" onClick={()=>setDate(addDays(date,1))}><ChevronLeft size={20}/></button><button className="btn btn-quiet" onClick={()=>setDate(todayISO()<startDate?startDate:todayISO())}>היום</button></div>
    </div>
    <div className="daily-progress"><div className="daily-progress-title"><div><strong>הארוחות שלי</strong><span>הושלמו {daily.completed}/4 ארוחות • הוזנו מזונות ב־{daily.logged}/4</span></div><Pill tone="pink">{daily.actual} / {daily.target} קק״ל</Pill></div><div className="progress-track"><div style={{width:`${daily.completed*25}%`}}/></div><div className="daily-calorie-summary"><span>סה״כ קלוריות לפי הבחירות: <strong>{daily.actual} קק״ל</strong></span><span>יעד יומי: <strong>{daily.target} קק״ל</strong></span></div><p className="daily-calorie-note">ערכים לפי קבוצות התחליפים הם הערכה; אפשר לתקן קלוריות בכל ארוחה לפי מוצר או שקילה.</p></div>
    <div className="daily-habits"><Steps key={`steps:${user.id}:${date}`} user={user} date={date} onNotify={onNotify} onOpenSummary={onOpenStepSummary}/><Water key={`water:${user.id}:${date}`} user={user} date={date} onNotify={onNotify}/></div>
    {loading ? <Spinner text="טוענת את התפריט השמור..."/> : <div className="meal-stack">{MEAL_DEFINITIONS.map(meal=><MealCard key={`${date}-${meal.no}`} definition={meal} choices={entries[meal.no] || empty()} onChange={next=>updateMeal(meal.no,next)} saveState={statuses[meal.no]} retry={()=>retry(meal.no)}/>)}</div>}
    <Notice><span>הקלוריות המחושבות הן אומדן לפי קבוצות התחליפים, ולא מדידה מדויקת של המזון בפועל. מספרי האריזות, שיטת הבישול, שמן ותוספות יכולים לשנות את הערכים. ניתן להזין ערך מדויק ידנית בארוחה.</span></Notice>
  </div>;
}
