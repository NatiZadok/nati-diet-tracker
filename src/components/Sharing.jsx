import React,{useCallback,useEffect,useMemo,useState} from 'react';
import { MailPlus, Users, Check, X, Trash2, LockKeyhole, ShieldCheck, Eye, Send, RefreshCcw, Share2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { displayDate, formatWeight } from '../lib/dates';
import { MEASUREMENTS } from '../data/foods';
import { EmptyState, Notice, Pill, SectionHeading, Spinner } from './UI';
import { MiniChart } from './Weight';

export default function Sharing({user,profile,onNotify}) {
  const [email,setEmail]=useState('');
  const [allowWeight,setAllowWeight]=useState(true);
  const [allowMeasurements,setAllowMeasurements]=useState(false);
  const [shares,setShares]=useState([]);
  const [invites,setInvites]=useState([]);
  const [profiles,setProfiles]=useState([]);
  const [activeOwner,setActiveOwner]=useState(null);
  const [sharedWeight,setSharedWeight]=useState([]);
  const [sharedMeasure,setSharedMeasure]=useState([]);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);

  const reload=useCallback(async()=>{
    const [s,i]=await Promise.all([
      supabase.from('progress_shares').select('*').or(`owner_id.eq.${user.id},viewer_id.eq.${user.id}`),
      supabase.from('progress_invites').select('*').or(`owner_id.eq.${user.id},invitee_email.eq.${user.email}`).order('created_at',{ascending:false}),
    ]);
    if(s.error)onNotify(s.error.message,'error');
    else {setShares(s.data||[]);const ids=[...new Set((s.data||[]).flatMap(x=>[x.owner_id,x.viewer_id]))];
      if(ids.length){const p=await supabase.from('profiles').select('id,display_name').in('id',ids);if(!p.error)setProfiles(p.data||[]);}}
    if(i.error)onNotify(i.error.message,'error');else setInvites(i.data||[]);
    setLoading(false);
  },[user.id,user.email,onNotify]);
  useEffect(()=>{reload()},[reload]);
  const myShares=shares.filter(s=>s.owner_id===user.id);
  const sharedWithMe=shares.filter(s=>s.viewer_id===user.id);
  const incoming=invites.filter(i=>i.owner_id!==user.id&&i.status==='pending'&&new Date(i.expires_at)>new Date());
  const sent=invites.filter(i=>i.owner_id===user.id&&i.status==='pending'&&new Date(i.expires_at)>new Date());
  const getName=id=>profiles.find(p=>p.id===id)?.display_name || 'משתמשת';
  const activeAccess=sharedWithMe.find(s=>s.owner_id===activeOwner);
  useEffect(()=>{
    if(!activeOwner || !activeAccess){setSharedWeight([]);setSharedMeasure([]);return;}
    let alive=true;
    Promise.all([
      activeAccess.share_weight?supabase.from('weight_logs').select('log_date,weight_kg').eq('user_id',activeOwner).order('log_date'):Promise.resolve({data:[]}),
      activeAccess.share_measurements?supabase.from('measurement_logs').select('*').eq('user_id',activeOwner).order('log_date'):Promise.resolve({data:[]}),
    ]).then(([w,m])=>{if(!alive)return;if(w.error||m.error)onNotify('לא הצלחנו לקרוא את הנתונים המשותפים','error');setSharedWeight(w.data||[]);setSharedMeasure(m.data||[])});
    return ()=>{alive=false};
  },[activeOwner,activeAccess?.share_weight,activeAccess?.share_measurements,onNotify]);

  async function sendInvite(e){
    e.preventDefault();if(!allowWeight&&!allowMeasurements){onNotify('יש לבחור לפחות סוג נתון אחד לשיתוף.','error');return;}
    const normalized=email.trim().toLowerCase();
    if(normalized===user.email?.toLowerCase()){onNotify('אין צורך להזמין את עצמך.','error');return;}
    setBusy(true);
    const {error}=await supabase.from('progress_invites').insert({owner_id:user.id,invitee_email:normalized,inviter_name:profile?.display_name||'משתמשת',share_weight:allowWeight,share_measurements:allowMeasurements});
    setBusy(false);
    if(error)onNotify(error.message,'error');else {setEmail('');onNotify('ההזמנה נוצרה. שתפי עם המוזמנת את קישור האתר כדי שתוכל לאשר אותה.');await reload();}
  }
  async function accept(id){setBusy(true);const {error}=await supabase.rpc('accept_progress_invite',{p_invite_id:id});setBusy(false);if(error)onNotify(error.message,'error');else{onNotify('ההזמנה אושרה, השיתוף פעיל');await reload();}}
  async function cancelInvite(id){const {error}=await supabase.from('progress_invites').delete().eq('id',id);if(error)onNotify(error.message,'error');else{onNotify('ההזמנה הוסרה');await reload();}}
  async function revoke(viewerId){if(!window.confirm('לבטל את הגישה של משתמשת זו להתקדמות שלך?'))return;const {error}=await supabase.from('progress_shares').delete().eq('owner_id',user.id).eq('viewer_id',viewerId);if(error)onNotify(error.message,'error');else{onNotify('הרשאת השיתוף בוטלה');await reload();}}
  async function editPermission(viewerId,flag,value){
    const prev=shares.find(s=>s.owner_id===user.id&&s.viewer_id===viewerId);if(!prev)return;
    if(!value && !(flag==='share_weight'?prev.share_measurements:prev.share_weight)){onNotify('כדי לבטל את שתי ההרשאות, לחצי "ביטול שיתוף".','error');return;}
    const {error}=await supabase.from('progress_shares').update({[flag]:value}).eq('owner_id',user.id).eq('viewer_id',viewerId);
    if(error)onNotify(error.message,'error');else await reload();
  }
  return <div><SectionHeading eyebrow="אנחנו בדרך יחד" title="שיתוף התקדמות, רק בהסכמתך" sub="הנתונים שלך פרטיים כברירת מחדל. את בוחרת מי יכולה לראות משקל או היקפים."/>
    <div className="sharing-grid"><section className="panel"><div className="panel-top"><div><h2><MailPlus size={20}/> הזמנת משתמשת</h2><p>הקלידי כתובת מייל של משתמשת שתוכל לצפות בהתקדמות שלך.</p></div></div>
      <form className="share-form" onSubmit={sendInvite}><label>כתובת מייל של המוזמנת<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} dir="ltr" placeholder="friend@example.com"/></label><div className="permission-checks"><span>איזה נתונים לשתף?</span><label><input type="checkbox" checked={allowWeight} onChange={e=>setAllowWeight(e.target.checked)}/> משקל וגרף המשקל</label><label><input type="checkbox" checked={allowMeasurements} onChange={e=>setAllowMeasurements(e.target.checked)}/> היקפים וגרפים</label></div><button className="btn btn-primary" disabled={busy}><Send size={17}/> יצירת הזמנה</button></form>
      <Notice><span>האתר לא שולח מייל בעצמו. לאחר יצירת ההזמנה, שלחי למוזמנת את קישור האתר. היא תירשם או תתחבר עם אותה כתובת מייל ותאשר בעמוד השיתוף. הארוחות עצמן לא משותפות.</span></Notice>
      {sent.length>0&&<div className="sharing-subsection"><h3>הזמנות ממתינות</h3>{sent.map(i=><div key={i.id} className="shared-row"><div><strong dir="ltr">{i.invitee_email}</strong><small>{i.share_weight?'משקל ':''}{i.share_measurements?'היקפים':''}</small></div><button className="icon-btn danger" aria-label="ביטול הזמנה" onClick={()=>cancelInvite(i.id)}><X size={17}/></button></div>)}</div>}
    </section>
    <section className="panel"><div className="panel-top"><div><h2><ShieldCheck size={20}/> הרשאות פעילות שנתת</h2><p>אפשר לשנות את סוג הנתונים המשותפים או לבטל גישה בכל רגע.</p></div></div>
      {loading?<Spinner/>:myShares.length===0?<EmptyState emoji="🔐" title="כרגע לא שיתפת התקדמות" text="כשתאושר הזמנה, היא תופיע כאן עם ההרשאות שבחרת."/>:myShares.map(s=><div className="permission-row" key={s.viewer_id}><strong>{getName(s.viewer_id)}</strong><label><input type="checkbox" checked={s.share_weight} onChange={e=>editPermission(s.viewer_id,'share_weight',e.target.checked)}/> משקל</label><label><input type="checkbox" checked={s.share_measurements} onChange={e=>editPermission(s.viewer_id,'share_measurements',e.target.checked)}/> היקפים</label><button className="btn btn-small btn-outline danger-text" onClick={()=>revoke(s.viewer_id)}><Trash2 size={15}/> ביטול שיתוף</button></div>)}
    </section></div>
    {incoming.length>0&&<section className="panel pending-invites"><div className="panel-top"><h2>💌 הזמנות שקיבלת</h2><Pill>{incoming.length} ממתינות</Pill></div>{incoming.map(i=><div className="incoming-row" key={i.id}><div><strong>{i.inviter_name||'משתמשת'} רוצה לשתף איתך התקדמות</strong><p>{i.share_weight?'משקל ':''}{i.share_measurements?'והיקפים':''} · אפשר לאשר או לדחות.</p></div><div className="incoming-actions"><button className="btn btn-primary btn-small" disabled={busy} onClick={()=>accept(i.id)}><Check size={16}/> אישור</button><button className="btn btn-outline btn-small" onClick={()=>cancelInvite(i.id)}><X size={16}/> דחייה</button></div></div>)}</section>}
    <section className="panel"><div className="panel-top"><div><h2><Users size={20}/> התקדמות שמשתפים איתי</h2><p>הצגת נתונים של משתמשות שנתנו לך הרשאה.</p></div></div>
      {sharedWithMe.length===0?<EmptyState emoji="🌱" title="עדיין לא שותפו איתך נתונים" text="לאחר אישור הזמנה תוכלי לצפות בנתונים שנבחרו לשיתוף."/>:<><div className="shared-list">{sharedWithMe.map(s=><button key={s.owner_id} className={`shared-person ${activeOwner===s.owner_id?'selected':''}`} onClick={()=>setActiveOwner(s.owner_id)}><span className="avatar">{getName(s.owner_id).slice(0,1)}</span><span><strong>{getName(s.owner_id)}</strong><small>{s.share_weight?'משקל ':''}{s.share_measurements?'היקפים':''}</small></span><Eye size={17}/></button>)}</div>
      {activeAccess&&<div className="shared-preview"><h3>התקדמות של {getName(activeOwner)}</h3>{activeAccess.share_weight&&<><h4>משקל</h4>{sharedWeight.length>0?<><div className="shared-latest">מדידה אחרונה: <strong>{formatWeight(sharedWeight.at(-1).weight_kg)} ק״ג</strong> · {displayDate(sharedWeight.at(-1).log_date)}</div><MiniChart rows={sharedWeight} keyName="weight_kg"/></>:<p className="muted">עדיין אין משקלים להצגה.</p>}</>}{activeAccess.share_measurements&&<><h4>היקפים</h4>{sharedMeasure.length?<div className="shared-measures">{MEASUREMENTS.map(m=><div key={m.key}><span>{m.label}</span><strong>{sharedMeasure.at(-1)[m.key]??'—'} ס״מ</strong></div>)}</div>:<p className="muted">אין מדידות היקפים להצגה.</p>}</>}</div>}
      </>}
    </section></div>;
}
