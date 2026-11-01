import React, { useEffect, useMemo, useState } from 'react';
import { Footprints, ChevronLeft, ChevronRight, CalendarDays, CheckCircle2, BarChart3, ArrowUpLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { addDays, displayDate, monthDays, monthLabel, monthStart, parseISO, shiftMonth, todayISO, weekStartSunday } from '../lib/dates';
import { STEP_TARGET, stepsReached, stepStats } from '../lib/steps';
import { SectionHeading, Spinner, Notice } from './UI';

const fmt = number => Number(number).toLocaleString('he-IL');
const dayLabel = iso => parseISO(iso).toLocaleDateString('he-IL', { weekday: 'short' });
const shortDate = iso => parseISO(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
const initialAnchor = startDate => todayISO() < startDate ? startDate : todayISO();

/** Reports are calculated from the user's private daily step_logs; no new DB table is needed. */
export default function StepsSummary({ user, startDate, onSelectDay }) {
  const [period, setPeriod] = useState('week');
  const [anchor, setAnchor] = useState(() => initialAnchor(startDate));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { if (anchor < startDate) setAnchor(startDate); }, [anchor, startDate]);

  const periodStart = period === 'week' ? weekStartSunday(anchor) : monthStart(anchor);
  const periodDays = useMemo(() => period === 'week'
    ? Array.from({ length: 7 }, (_, i) => addDays(periodStart, i))
    : monthDays(periodStart), [period, periodStart]);
  const eligibleDays = useMemo(() => periodDays.filter(day => day >= startDate), [periodDays, startDate]);
  const first = periodDays[0];
  const last = periodDays.at(-1);
  const canPrevious = (period === 'week'
    ? addDays(first, -1)
    : addDays(monthStart(first), -1)) >= startDate;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    supabase.from('step_logs').select('log_date, steps')
      .eq('user_id', user.id).gte('log_date', first).lte('log_date', last)
      .order('log_date', { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (!alive) return;
        if (fetchError) { setError('לא ניתן לטעון את סיכום הצעדים. נסי לרענן את העמוד.'); setRows([]); }
        else setRows(data || []);
        setLoading(false);
      });
    return () => { alive = false; };
  }, [user.id, first, last]);

  const metrics = useMemo(() => stepStats(rows, eligibleDays), [rows, eligibleDays]);
  const lookup = useMemo(() => new Map(rows.map(row => [row.log_date, row.steps])), [rows]);
  const peak = Math.max(STEP_TARGET, ...eligibleDays.map(day => lookup.get(day) || 0));
  const targetLine = STEP_TARGET / peak * 100;
  const weeklyBreakdown = useMemo(() => {
    if (period !== 'month') return [];
    const grouped = new Map();
    eligibleDays.forEach(day => {
      const week = weekStartSunday(day);
      if (!grouped.has(week)) grouped.set(week, []);
      grouped.get(week).push(day);
    });
    return [...grouped.entries()].map(([week, days]) => ({ week, days, ...stepStats(rows, days) }));
  }, [period, eligibleDays, rows]);

  function changePeriod(next) {
    if (next === period) return;
    setPeriod(next);
  }
  function move(delta) {
    setAnchor(period === 'week' ? addDays(anchor, 7 * delta) : shiftMonth(monthStart(anchor), delta));
  }
  function openWeek(day) { setAnchor(day); setPeriod('week'); }

  const periodLabel = period === 'week'
    ? `${shortDate(first)} – ${shortDate(last)}`
    : monthLabel(first);
  return <div className="step-summary-page">
    <SectionHeading eyebrow="סיכום הצעדים שלי" title="כל צעד מצטבר להצלחה 👟" sub="מעקב שבועי וחודשי אחרי הצעדים, הממוצע והעמידה ביעד היומי של 10,000."/>
    <div className="steps-summary-toolbar panel">
      <div className="steps-period-tabs" role="group" aria-label="בחירת טווח סיכום">
        <button type="button" aria-pressed={period==='week'} className={period==='week'?'active':''} onClick={()=>changePeriod('week')}>סיכום שבועי</button>
        <button type="button" aria-pressed={period==='month'} className={period==='month'?'active':''} onClick={()=>changePeriod('month')}>סיכום חודשי</button>
      </div>
      <div className="steps-period-nav">
        <button type="button" className="icon-btn" aria-label="לתקופה הקודמת" disabled={!canPrevious} onClick={()=>move(-1)}><ChevronRight size={19}/></button>
        <strong>{periodLabel}</strong>
        <button type="button" className="icon-btn" aria-label="לתקופה הבאה" onClick={()=>move(1)}><ChevronLeft size={19}/></button>
      </div>
    </div>
    {loading ? <div className="panel"><Spinner text="טוענת צעדים..."/></div> : error ? <Notice tone="error">{error}</Notice> : <>
      <div className="steps-summary-stats">
        <div className="steps-summary-stat"><span><Footprints size={17}/> סה״כ צעדים</span><strong>{fmt(metrics.total)}</strong><small>בתקופה שנבחרה</small></div>
        <div className="steps-summary-stat"><span><BarChart3 size={17}/> ממוצע יומי</span><strong>{metrics.loggedDays ? fmt(metrics.average) : '—'}</strong><small>ליום שבו הוזנו צעדים</small></div>
        <div className="steps-summary-stat success"><span><CheckCircle2 size={17}/> ימים ביעד</span><strong>{metrics.goalDays} <small>מתוך {metrics.loggedDays}</small></strong><small>{metrics.loggedDays ? `${metrics.goalRate}% מהימים המדווחים` : 'עוד אין נתונים'}</small></div>
        <div className="steps-summary-stat"><span><CalendarDays size={17}/> ימים עם דיווח</span><strong>{metrics.loggedDays} <small>מתוך {metrics.periodDays}</small></strong><small>יום בלי דיווח אינו נספר כ־0</small></div>
      </div>
      <section className="panel steps-visual-panel" aria-label="גרף צעדים לכל יום">
        <div className="steps-chart-head"><div><h2>{period==='week'?'צעדים לפי יום':'הצעדים שלי במהלך החודש'}</h2><p>הקו המקווקו מציין יעד יומי של {fmt(STEP_TARGET)} צעדים. לחצי על עמודה לפתיחת אותו יום.</p></div><span className="steps-target-chip">◉ יעד: 10,000</span></div>
        {metrics.loggedDays===0 ? <div className="steps-empty-note">עדיין לא הזנת צעדים בתקופה הזו. אפשר לפתוח יום ביומן התפריט ולהוסיף.</div> : null}
        <div className="steps-chart-scroll"><div className={`steps-chart ${period==='month'?'monthly':''}`} style={{'--goal-height':`${targetLine}%`}}>
          <div className="steps-chart-plot"><div className="steps-goal-guide"><span>10k</span></div>
            {eligibleDays.map(day => {
              const stepCount = lookup.get(day);
              const recorded = stepCount !== undefined && stepCount !== null;
              const achieved = recorded && stepsReached(stepCount);
              return <button key={day} type="button" className="step-chart-day" onClick={()=>onSelectDay(day)} title={`${displayDate(day)}: ${recorded?fmt(stepCount)+' צעדים':'אין נתון'}`} aria-label={`${displayDate(day)}: ${recorded?fmt(stepCount)+' צעדים':'אין נתון'}; פתיחת היום`}>
                <span className="step-chart-value">{recorded ? fmt(stepCount) : '—'}</span>
                <span className="step-chart-bar-wrap"><span className={`step-chart-bar ${achieved?'achieved':recorded?'not-met':'missing'}`} style={{height:`${recorded ? Math.max(stepCount===0?2:4,stepCount/peak*100) : 0}%`}}/></span>
                <span className="step-chart-label">{period==='week'?dayLabel(day):Number(day.slice(-2))}</span>
                <span className="step-chart-check">{recorded ? achieved?'✓':'·' : ' '}</span>
              </button>;
            })}
          </div>
        </div></div>
        <div className="steps-chart-legend"><span><i className="swatch achieved"/> עמדת ביעד</span><span><i className="swatch pending"/> מתחת ליעד</span><span><i className="swatch missing"/> אין דיווח</span></div>
      </section>
      {period === 'month' && <section className="panel steps-weekly-breakdown"><div className="steps-chart-head"><div><h2>סיכום לפי שבועות</h2><p>השבועות מתחילים ביום ראשון; כל שורה כוללת רק ימים מהחודש הנבחר.</p></div></div>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>שבוע</th><th>סה״כ צעדים</th><th>ממוצע ליום מדווח</th><th>ימים ביעד</th><th></th></tr></thead><tbody>{weeklyBreakdown.map(item=><tr key={item.week}><td>{shortDate(item.days[0])}–{shortDate(item.days.at(-1))}</td><td>{fmt(item.total)}</td><td>{item.loggedDays?fmt(item.average):'—'}</td><td>{item.goalDays}/{item.loggedDays} ימים מדווחים</td><td><button className="btn btn-outline steps-week-button" onClick={()=>openWeek(item.days[0])}>הצגת שבוע <ArrowUpLeft size={14}/></button></td></tr>)}</tbody></table></div>
      </section>}
      <section className="panel steps-summary-notes"><p>הסיכום מחושב מהצעדים ששמרת בכל יום. **יום ללא דיווח אינו נחשב ליום שבו נכשלת ביעד** ואינו נכלל בממוצע. אפשר לעדכן צעדים בכל תאריך מתוך התפריט היומי; כאן יוצגו המספרים המעודכנים כשתחזרי למסך.</p></section>
    </>}
  </div>;
}
