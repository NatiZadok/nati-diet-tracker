import React, {useEffect,useState} from 'react';
import { UserRound, Download, Save, LockKeyhole, Database, CalendarDays } from 'lucide-react';
import {supabase} from '../lib/supabase';
import {SectionHeading, Notice} from './UI';

function downloadJSON(object,filename){
  const blob=new Blob([JSON.stringify(object,null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename;a.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export default function Settings({user,profile,setProfile,onNotify}) {
  const [displayName,setDisplayName]=useState(profile?.display_name||'');
  const [startDate,setStartDate]=useState(profile?.start_date||'2026-11-01');
  const [targetWeight,setTargetWeight]=useState(profile?.target_weight??'');
  const [password,setPassword]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{setDisplayName(profile?.display_name||'');setStartDate(profile?.start_date||'2026-11-01');setTargetWeight(profile?.target_weight??'');},[profile]);
  async function saveProfile(e){
    e.preventDefault();setBusy(true);
    const patch={display_name:displayName.trim(),start_date:startDate,target_weight:targetWeight===''?null:Number(targetWeight)};
    const {data,error}=await supabase.from('profiles').update(patch).eq('id',user.id).select().single();
    setBusy(false);if(error)onNotify(error.message,'error');else{setProfile(data);onNotify('הפרטים נשמרו בהצלחה');}
  }
  async function changePassword(e){
    e.preventDefault();setBusy(true);
    const {error}=await supabase.auth.updateUser({password});setBusy(false);
    if(error)onNotify(error.message,'error');else{setPassword('');onNotify('הסיסמה עודכנה');}
  }
  async function exportData(){
    setBusy(true);
    const tables=['meal_logs','step_logs','water_logs','weight_logs','measurement_logs'];
    const result=await Promise.all(tables.map(t=>supabase.from(t).select('*').eq('user_id',user.id).order('log_date')));
    setBusy(false);
    const error=result.find(r=>r.error)?.error;
    if(error){onNotify('לא הצלחנו לייצא את הנתונים: '+error.message,'error');return;}
    downloadJSON({exported_at:new Date().toISOString(),user_email:user.email,profile,...Object.fromEntries(tables.map((t,i)=>[t,result[i].data]))},`nati-diet-backup-${new Date().toISOString().slice(0,10)}.json`);
    onNotify('קובץ הגיבוי הוכן');
  }
  return <div><SectionHeading eyebrow="החשבון שלי" title="ההגדרות האישיות" sub="תאריך התחלה, יעד אישי, פרטי חשבון וגיבוי הנתונים שלך."/>
    <div className="settings-grid"><section className="panel"><div className="panel-top"><h2><UserRound size={20}/> פרטי פרופיל</h2></div><form className="settings-form" onSubmit={saveProfile}><label>שם לתצוגה<input value={displayName} onChange={e=>setDisplayName(e.target.value)} maxLength={60} required/></label><label>תאריך תחילת התפריט<input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} required/></label><label>משקל יעד (ק״ג) — לא חובה<input type="number" value={targetWeight} onChange={e=>setTargetWeight(e.target.value)} step="0.1" min="25" max="400" placeholder="למשל 74"/></label><button className="btn btn-primary" disabled={busy}><Save size={17}/> שמירת פרטים</button></form><p className="fine-print">כברירת מחדל תחילת התוכנית היא 1.11.2026. משתמשות אחרות יכולות לשנות אותה באופן עצמאי.</p></section>
      <section className="panel"><div className="panel-top"><h2><LockKeyhole size={20}/> פרטיות ואבטחה</h2></div><p className="muted">מייל החשבון:</p><p dir="ltr" className="email-detail">{user.email}</p><form className="settings-form" onSubmit={changePassword}><label>סיסמה חדשה<input value={password} onChange={e=>setPassword(e.target.value)} type="password" minLength={8} required placeholder="8 תווים לפחות"/></label><button className="btn btn-outline" disabled={busy||password.length<8}>עדכון סיסמה</button></form><Notice>השיתוף האישי מנוהל בעמוד ״שיתוף״. שינוי או ביטול הרשאה משפיע מיד על גישה עתידית לנתונים באתר.</Notice></section>
      <section className="panel settings-backup"><div className="panel-top"><h2><Database size={20}/> גיבוי הנתונים</h2></div><p>הורידי עותק של הארוחות, הצעדים, המים, השקילות והמדידות האישיות שלך בקובץ JSON.</p><button className="btn btn-soft" disabled={busy} onClick={exportData}><Download size={18}/> הורדת גיבוי</button><p className="fine-print">קובץ הגיבוי מכיל נתונים אישיים. שמרי אותו במקום בטוח. האפשרות להעלאת גיבוי חזרה תוכל להתווסף בהמשך.</p></section>
    </div>
  </div>;
}
