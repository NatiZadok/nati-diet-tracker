import React, { useEffect, useState } from 'react';
import { CheckCircle2, Footprints, Save, LoaderCircle, CircleHelp, RotateCcw, BarChart3, ArrowUpLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { STEP_TARGET, stepsReached, stepPercent } from '../lib/steps';

const format = (n) => Number(n).toLocaleString('he-IL');

/** Manual daily step count; persisted separately from the meal selections. */
export default function Steps({ user, date, onNotify, onOpenSummary }) {
  const [input, setInput] = useState('');
  const [savedValue, setSavedValue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    setInput('');
    setSavedValue(null);
    supabase.from('step_logs').select('steps').eq('user_id', user.id).eq('log_date', date).maybeSingle()
      .then(({ data, error: fetchError }) => {
        if (!alive) return;
        if (fetchError) {
          setError('לא הצלחנו לטעון את הצעדים. ודאי שהטבלה step_logs קיימת ב־Supabase.');
        } else {
          setSavedValue(data?.steps ?? null);
          setInput(data?.steps == null ? '' : String(data.steps));
        }
        setLoading(false);
      });
    return () => { alive = false; };
  }, [user.id, date]);

  const parsed = input === '' ? null : Number(input);
  const invalid = parsed !== null && (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 200000);
  const reached = stepsReached(parsed);
  const modified = !loading && (parsed !== savedValue);

  async function handleSave(e) {
    e.preventDefault();
    if (invalid || saving || loading) return;
    setSaving(true);
    setError('');
    const { error: saveError } = parsed === null
      ? await supabase.from('step_logs').delete().eq('user_id', user.id).eq('log_date', date)
      : await supabase.from('step_logs').upsert({ user_id: user.id, log_date: date, steps: parsed, updated_at: new Date().toISOString() }, { onConflict: 'user_id,log_date' });
    setSaving(false);
    if (saveError) {
      setError('שמירת הצעדים נכשלה. נסי שוב.');
      onNotify('שמירת הצעדים נכשלה: ' + saveError.message, 'error');
    } else {
      setSavedValue(parsed);
      onNotify(parsed === null ? 'נתוני הצעדים לתאריך זה נוקו' : 'הצעדים נשמרו בהצלחה');
    }
  }

  return <section className="steps-card" aria-label="מעקב צעדים יומי">
    <div className="steps-card-heading">
      <div className="steps-identity"><span className="steps-icon"><Footprints size={23}/></span><div><h2>הצעדים שלי היום</h2><p>יעד אישי: {format(STEP_TARGET)} צעדים בכל יום</p></div></div>
      <span className={`steps-status ${parsed == null || invalid ? 'not-set' : reached ? 'success' : 'pending'}`}>
        {invalid ? 'מספר לא תקין' : parsed == null ? 'טרם הוזנו צעדים' : reached ? <><CheckCircle2 size={16}/> עמדת ביעד!</> : 'עדיין לא הגעת ליעד'}
      </span>
    </div>
    <div className="steps-numbers"><strong>{parsed == null || invalid ? '—' : format(parsed)}</strong><span>מתוך {format(STEP_TARGET)} צעדים</span></div>
    <div className="steps-progress" role="progressbar" aria-valuemin="0" aria-valuemax={STEP_TARGET} aria-valuenow={parsed == null || invalid ? 0 : Math.min(STEP_TARGET, parsed)} aria-label="התקדמות לעבר יעד צעדים יומי">
      <div className={reached && !invalid ? 'reached' : ''} style={{ width: `${invalid ? 0 : stepPercent(parsed)}%` }}/>
    </div>
    <div className="steps-progress-foot"><span>{parsed == null || invalid ? '0%' : `${Math.round(stepPercent(parsed))}% מהיעד`}</span><span>{parsed == null || invalid ? 'הזיני את מספר הצעדים שלך' : reached ? `מעבר ליעד ב־${format(parsed - STEP_TARGET)} צעדים` : `נשארו ${format(STEP_TARGET - parsed)} צעדים`}</span></div>
    <form className="steps-entry-form" onSubmit={handleSave}>
      <label htmlFor="daily-steps">מספר צעדים בתאריך הנבחר</label>
      <input id="daily-steps" type="number" min="0" max="200000" step="1" inputMode="numeric" placeholder="לדוגמה: 8500" value={input} onChange={e => setInput(e.target.value)} disabled={loading || saving} aria-invalid={invalid} />
      <button type="submit" className="btn btn-primary" disabled={loading || saving || invalid || !modified}>{saving ? <LoaderCircle size={16} className="spin"/> : <Save size={16}/>} שמירת צעדים</button>
      {!loading && !modified && savedValue !== null && <span className="steps-save-note"><CheckCircle2 size={15}/> נשמר בענן</span>}
    </form>
    {error && <p className="steps-error" role="alert">{error}</p>}
    {invalid && <p className="steps-error" role="alert">יש להזין מספר שלם בין 0 ל־200,000.</p>}
    <div className="steps-summary-cta"><button type="button" className="btn btn-outline" onClick={onOpenSummary}><BarChart3 size={16}/> לצפייה בסיכום שבועי וחודשי <ArrowUpLeft size={15}/></button></div>
    <p className="steps-footnote">הספירה מוזנת ידנית לפי הטלפון או השעון. שינוי המספר ועדכון השמירה ישפיעו רק על התאריך שנבחר למעלה. נתוני הצעדים נשארים פרטיים לחשבון שלך.</p>
  </section>;
}
