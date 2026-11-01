import React, {useEffect, useState} from 'react';
import {Droplets, CheckCircle2, Save, LoaderCircle} from 'lucide-react';
import {supabase} from '../lib/supabase';
import {WATER_TARGET_ML, waterReached, waterPercent, formatLiters} from '../lib/water';

export default function Water({user, date, onNotify}) {
  const [input,setInput] = useState('');
  const [saved,setSaved] = useState(null);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState('');
  useEffect(()=>{
    let active=true;
    setLoading(true);setSaved(null);setInput('');setError('');
    supabase.from('water_logs').select('ml').eq('user_id',user.id).eq('log_date',date).maybeSingle()
      .then(({data,error:fetchError})=>{
        if(!active)return;
        if(fetchError)setError('לא הצלחנו לטעון את המים. ודאי שהרצת את קובץ עדכון המים ב־Supabase.');
        else {setSaved(data?.ml ?? null);setInput(data?.ml == null?'':String(data.ml));}
        setLoading(false);
      });
    return ()=>{active=false;};
  },[user.id,date]);
  const ml = input === ''? null:Number(input);
  const invalid = ml != null && (!Number.isSafeInteger(ml) || ml<0 || ml>15000);
  const changed = !loading && ml!==saved;
  const reached=waterReached(ml) && !invalid;
  function add(amount){setInput(String(Math.min(15000,Math.max(0,(Number(input)||0)+amount))));}
  async function saveWater(e){
    e.preventDefault();
    if(saving || loading || invalid || !changed)return;
    setSaving(true);setError('');
    const {error:saveError} = ml==null ? await supabase.from('water_logs').delete().eq('user_id',user.id).eq('log_date',date)
      : await supabase.from('water_logs').upsert({user_id:user.id,log_date:date,ml,updated_at:new Date().toISOString()},{onConflict:'user_id,log_date'});
    setSaving(false);
    if(saveError){setError('השמירה נכשלה. '+saveError.message);onNotify('שמירת המים נכשלה','error');}
    else {setSaved(ml);onNotify('כמות המים נשמרה בענן');}
  }
  return <section className="steps-card water-card" aria-label="מעקב שתיית מים יומי">
    <div className="steps-card-heading">
      <div className="steps-identity"><span className="steps-icon water-icon"><Droplets size={23}/></span><div><h2>המים שלי היום 💧</h2><p>יעד יומי: 3 ליטר ({WATER_TARGET_ML.toLocaleString('he-IL')} מ״ל)</p></div></div>
      <span className={`steps-status ${ml==null || invalid?'not-set':reached?'success':'pending'}`}>
        {invalid?'כמות לא תקינה':ml==null?'טרם הוזנו מים':reached?<><CheckCircle2 size={16}/> הגעת ליעד!</>:'בדרך ליעד'}
      </span>
    </div>
    <div className="steps-numbers"><strong>{ml==null || invalid?'—':formatLiters(ml)}</strong><span>מתוך 3 ליטר</span></div>
    <div className="steps-progress water-progress" role="progressbar" aria-label="התקדמות יעד שתייה" aria-valuemin={0} aria-valuemax={WATER_TARGET_ML} aria-valuenow={ml==null || invalid?0:Math.min(WATER_TARGET_ML,ml)}><div className={reached?'reached':''} style={{width:`${invalid?0:waterPercent(ml)}%`}}/></div>
    <div className="steps-progress-foot"><span>{ml==null||invalid?'0%':`${Math.round(waterPercent(ml))}% מהיעד`}</span><span>{ml==null||invalid?'הזיני את הכמות ששתית':reached?'✓ הגעת ליעד היומי':`נותרו ${formatLiters(WATER_TARGET_ML-ml)} ליטר`}</span></div>
    <div className="water-quick-add"><span>הוספה מהירה:</span>{[250,500,1000].map(amount=><button key={amount} type="button" disabled={loading||saving} className="btn btn-outline" onClick={()=>add(amount)}>+{amount>=1000?'1 ליטר':`${amount} מ״ל`}</button>)}</div>
    <form className="steps-entry-form" onSubmit={saveWater}>
      <label htmlFor="daily-water-ml">כמות מים מצטברת במ״ל</label>
      <input id="daily-water-ml" type="number" inputMode="numeric" min="0" max="15000" step="1" placeholder="למשל 1500" value={input} onChange={e=>setInput(e.target.value)} disabled={loading||saving} aria-invalid={invalid}/>
      <button type="submit" className="btn btn-primary" disabled={loading||saving||invalid||!changed}>{saving?<LoaderCircle size={16} className="spin"/>:<Save size={16}/>} שמירת מים</button>
      {!loading&&!changed&&saved!=null&&<span className="steps-save-note"><CheckCircle2 size={15}/> נשמר בענן</span>}
    </form>
    {invalid&&<p className="steps-error" role="alert">אפשר להזין כמות שלמה בין 0 ל־15,000 מ״ל.</p>}
    {error&&<p className="steps-error" role="alert">{error}</p>}
    <p className="steps-footnote">הכמות מוזנת ידנית ונשמרת לפי תאריך בחשבון הפרטי שלך. יעד המים משמש למעקב בלבד ואינו חלק מתנאי הסימון הירוק ביומן.</p>
  </section>;
}
