import React, { useState } from 'react';
import { HeartPulse, LockKeyhole, Mail, Eye, EyeOff, ArrowLeft, UserRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Notice } from './UI';

export default function Auth() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e) {
    e.preventDefault(); setBusy(true); setError(''); setSuccess('');
    try {
      if (mode === 'signup') {
        if (password.length < 8) throw new Error('יש לבחור סיסמה באורך 8 תווים לפחות.');
        const { error: err, data } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(), password,
          options: { data: { display_name: name.trim() }, emailRedirectTo: window.location.origin },
        });
        if (err) throw err;
        if (!data.session) setSuccess('נשלח אלייך מייל לאימות החשבון. לאחר האימות תוכלי להתחבר.');
      } else if (mode === 'reset') {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: window.location.origin,
        });
        if (err) throw err;
        setSuccess('אם כתובת המייל רשומה, יישלח אליה קישור לאיפוס סיסמה.');
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({email: email.trim().toLowerCase(), password});
        if (err) throw err;
      }
    } catch (err) { setError(err.message || 'שגיאה בהתחברות.'); }
    finally { setBusy(false); }
  }

  return <div className="auth-page">
    <div className="auth-side"><div className="brandmark large"><HeartPulse size={32}/></div>
      <div className="auth-side-copy"><span className="tiny-label">NATI DIET TRACKER</span>
        <h1>המסע שלך,<br/><em>בקצב שלך.</em></h1>
        <p>תפריט יומי, בחירות תזונתיות, מעקב מדידות והתקדמות במקום אחד — במחשב ובטלפון.</p>
        <div className="auth-checks"><span>✓ יומן יומי מסודר</span><span>✓ גרפים ומדידות</span><span>✓ נתונים פרטיים</span></div>
      </div><div className="auth-side-decoration">✦</div>
    </div>
    <div className="auth-form-side">
      <div className="auth-form-wrap"><div className="mobile-auth-logo"><div className="brandmark"><HeartPulse size={24}/></div><b>Nati Diet</b></div>
        <span className="eyebrow">ברוכה הבאה 🌸</span>
        <h2>{mode === 'signup' ? 'יוצרות חשבון חדש' : mode === 'reset' ? 'איפוס סיסמה' : 'איזה כיף שחזרת!'}</h2>
        <p className="muted">{mode === 'signup' ? 'כל התקדמות שלך תישמר בחשבון פרטי.' : mode === 'reset' ? 'נשלח לך הוראות איפוס למייל.' : 'התחברי כדי להמשיך בדיוק מהיכן שהפסקת.'}</p>
        {error && <Notice tone="error">{error}</Notice>}
        {success && <Notice tone="success">{success}</Notice>}
        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && <label>איך קוראים לך?<div className="input-icon"><UserRound size={18}/><input value={name} onChange={e=>setName(e.target.value)} placeholder="שם לתצוגה" required maxLength={60}/></div></label>}
          <label>כתובת אימייל<div className="input-icon"><Mail size={18}/><input value={email} onChange={e=>setEmail(e.target.value)} type="email" dir="ltr" placeholder="you@example.com" required autoComplete="email"/></div></label>
          {mode !== 'reset' && <label>סיסמה<div className="input-icon"><LockKeyhole size={18}/><input value={password} onChange={e=>setPassword(e.target.value)} type={showPass ? 'text' : 'password'} dir="ltr" placeholder="••••••••" required minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}/><button type="button" className="view-pass" onClick={()=>setShowPass(!showPass)} aria-label={showPass?'הסתרת סיסמה':'הצגת סיסמה'}>{showPass?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>}
          <button type="submit" className="btn btn-primary auth-submit" disabled={busy}>{busy?'רגע אחד...':mode === 'signup'?'יצירת חשבון':mode === 'reset'?'שליחת קישור איפוס':'כניסה לחשבון'} <ArrowLeft size={18}/></button>
        </form>
        <div className="auth-switch">{mode === 'signin' ? <><button onClick={()=>{setMode('reset');setError('');setSuccess('');}}>שכחת סיסמה?</button><span>אין לך חשבון? <button onClick={()=>{setMode('signup');setError('');setSuccess('');}}>להרשמה</button></span></> : <button onClick={()=>{setMode('signin');setError('');setSuccess('');}}>כבר יש חשבון? חזרה להתחברות</button>}</div>
        <p className="auth-footnote">היומן אישי ופרטי. השיתוף עם אחרות נעשה רק בהרשאה שלך.</p>
      </div>
    </div>
  </div>;
}
