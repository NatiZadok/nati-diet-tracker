import React,{useCallback,useEffect,useMemo,useState} from 'react';
import { HeartPulse, LayoutDashboard, CalendarDays, Footprints, Scale, Ruler, BookOpen, UsersRound, Settings as SettingsIcon, LogOut, Menu, X, ChevronLeft, Cloud, ShieldCheck } from 'lucide-react';
import { supabase, isConfigured } from './lib/supabase';
import { INITIAL_DATE, dayNumber, displayDate, todayISO } from './lib/dates';
import { Toast, Spinner, Notice, Pill } from './components/UI';
import Auth from './components/Auth';
import Meals from './components/Meals';
import Calendar from './components/Calendar';
import StepsSummary from './components/StepsSummary';
import Weight from './components/Weight';
import Measurements from './components/Measurements';
import Foods from './components/Foods';
import Sharing from './components/Sharing';
import Settings from './components/Settings';

const NAV=[
  {id:'meals',label:'התפריט היומי',icon:LayoutDashboard},
  {id:'calendar',label:'יומן חודשי',icon:CalendarDays},
  {id:'steps-summary',label:'סיכום צעדים',icon:Footprints},
  {id:'weight',label:'מעקב משקל',icon:Scale},
  {id:'measurements',label:'מעקב היקפים',icon:Ruler},
  {id:'foods',label:'רשימת תחליפים',icon:BookOpen},
  {id:'sharing',label:'שיתוף התקדמות',icon:UsersRound},
  {id:'settings',label:'הגדרות',icon:SettingsIcon},
];

function ConfigRequired(){return <div className="setup-page"><div className="setup-card"><div className="brandmark"><HeartPulse size={28}/></div><h1>Nati Diet Tracker</h1><p>קובצי האתר מוכנים 🌷 כדי להתחיל לשמור נתונים בענן, יש לחבר פרויקט Supabase.</p><ol><li>פתחי פרויקט ב־Supabase.</li><li>הריצי את הקובץ <code>supabase/schema.sql</code> ב־SQL Editor.</li><li>העתיקי את <code>.env.example</code> לקובץ <code>.env</code>, והזיני את כתובת הפרויקט ואת מפתח ה־publishable / anon.</li><li>הריצי <code>npm run dev</code> מחדש.</li></ol><Notice>אין להכניס מפתח secret או service_role לאפליקציה. הוראות מלאות בקובץ README.md.</Notice></div></div>}

export default function App(){
  const [session,setSession]=useState(undefined);
  const [profile,setProfile]=useState(null);
  const [profileReady,setProfileReady]=useState(false);
  const [page,setPage]=useState('meals');
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [date,setDate]=useState(todayISO()<INITIAL_DATE?INITIAL_DATE:todayISO());
  const [toast,setToast]=useState(null);
  const onNotify=useCallback((text,type='success')=>setToast({text,type}),[]);
  const user=session?.user;
  const startDate=profile?.start_date||INITIAL_DATE;

  useEffect(()=>{
    if(!supabase)return;
    let alive=true;
    supabase.auth.getSession().then(({data,error})=>{
      if(alive){setSession(data.session);if(error)onNotify('לא הצלחנו לטעון את ההתחברות.','error');}
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,newSession)=>{
      setSession(newSession);
    });
    return ()=>{alive=false;subscription.unsubscribe();};
  },[onNotify]);

  useEffect(()=>{
    if(!user){setProfile(null);setProfileReady(false);return;}
    let alive=true;setProfileReady(false);
    supabase.from('profiles').select('*').eq('id',user.id).single().then(({data,error})=>{
      if(!alive)return;
      if(error)onNotify('לא הצלחנו לטעון פרופיל: '+error.message,'error');
      else setProfile(data);
      setProfileReady(true);
    });
    return ()=>{alive=false;};
  },[user?.id,onNotify]);

  useEffect(()=>{if(profile && date<profile.start_date)setDate(profile.start_date);},[profile?.start_date]);
  const goto=useCallback((newPage)=>{setPage(newPage);setSidebarOpen(false);window.scrollTo({top:0,behavior:'smooth'});},[]);
  const gotoMeals=useCallback((chosenDate)=>{setDate(chosenDate);goto('meals');},[goto]);
  async function logout(){const {error}=await supabase.auth.signOut();if(error)onNotify(error.message,'error');else {setPage('meals');setSession(null);}}

  if(!isConfigured)return <ConfigRequired/>;
  if(session===undefined)return <div className="boot-screen"><div className="brandmark"><HeartPulse size={30}/></div><Spinner text="מכינה את היומן שלך..."/></div>;
  if(!session)return <Auth/>;
  if(!profileReady)return <div className="boot-screen"><div className="brandmark"><HeartPulse size={30}/></div><Spinner text="מעלה את הנתונים האישיים..."/></div>;
  if(!profile)return <div className="boot-screen"><Notice tone="error">החשבון מחובר, אבל לא הצלחנו לטעון פרופיל. בדקי שהרצת את schema.sql ב־Supabase ורענני את הדף.</Notice><button className="btn btn-outline" onClick={logout}>התנתקות</button></div>;

  const firstName=profile.display_name?.trim().split(' ')[0]||'יקרה';
  const day=Math.max(1,dayNumber(date,startDate));
  return <div className="app-shell">
    {sidebarOpen&&<button className="sidebar-scrim" aria-label="סגירת תפריט" onClick={()=>setSidebarOpen(false)}/>}
    <aside className={`sidebar ${sidebarOpen?'sidebar-open':''}`}>
      <div className="sidebar-brand"><div className="brandmark"><HeartPulse size={24}/></div><div><strong>Nati Diet</strong><span>MY WELLNESS JOURNEY</span></div><button className="sidebar-close" onClick={()=>setSidebarOpen(false)} aria-label="סגירת תפריט"><X size={20}/></button></div>
      <div className="nav-caption">המסע האישי שלך</div>
      <nav aria-label="ניווט ראשי">{NAV.map(n=>{const Icon=n.icon;return <button key={n.id} className={`nav-item ${page===n.id?'active':''}`} onClick={()=>goto(n.id)}><Icon size={19}/><span>{n.label}</span>{page===n.id&&<span className="nav-active-dot"/>}</button>})}</nav>
      <div className="sidebar-bottom"><div className="sidebar-tip"><span>✦ קטנות ועקביות</span><strong>כל בחירה טובה היא צעד קדימה.</strong><div className="tip-deco">♥</div></div><div className="sidebar-person"><div className="user-avatar">{firstName[0]}</div><div><strong>{profile.display_name}</strong><small>{user.email}</small></div><button onClick={logout} aria-label="התנתקות" title="התנתקות"><LogOut size={19}/></button></div></div>
    </aside>
    <div className="app-main"><header className="topbar"><div className="topbar-right"><button className="mobile-menu icon-btn" aria-label="פתיחת תפריט" onClick={()=>setSidebarOpen(true)}><Menu size={22}/></button><div className="topbar-hello"><span>ברוכה הבאה, {firstName} ♡</span><small>יום {day} לתפריט • {displayDate(date)}</small></div></div><div className="topbar-left"><Pill tone="neutral"><Cloud size={14}/> שמירה בענן</Pill><button className="profile-circle" aria-label="הגדרות פרופיל" title="הגדרות פרופיל" onClick={()=>goto('settings')}>{firstName[0]}</button></div></header>
      <main className="content-area">
        {page==='meals'&&<Meals user={user} date={date} setDate={setDate} startDate={startDate} onNotify={onNotify} onOpenStepSummary={()=>goto('steps-summary')}/>}
        {page==='calendar'&&<Calendar user={user} startDate={startDate} navigateToMeals={gotoMeals}/>}
        {page==='steps-summary'&&<StepsSummary user={user} startDate={startDate} onSelectDay={gotoMeals}/>}
        {page==='weight'&&<Weight user={user} startDate={startDate} onNotify={onNotify}/>}
        {page==='measurements'&&<Measurements user={user} startDate={startDate} onNotify={onNotify}/>}
        {page==='foods'&&<Foods/>}
        {page==='sharing'&&<Sharing user={user} profile={profile} onNotify={onNotify}/>}
        {page==='settings'&&<Settings user={user} profile={profile} setProfile={setProfile} onNotify={onNotify}/>}
        <footer className="page-footer">Nati Diet Tracker · נבנה באהבה ♡ <span>הנתונים נשמרים בחשבון האישי שלך</span></footer>
      </main>
    </div>
    <nav className="bottom-nav" aria-label="ניווט מהיר">{NAV.slice(0,5).map(n=>{const Icon=n.icon;return <button key={n.id} onClick={()=>goto(n.id)} className={page===n.id?'active':''}><Icon size={20}/><span>{n.id==='meals'?'ארוחות':n.id==='calendar'?'יומן':n.id==='steps-summary'?'צעדים':n.id==='weight'?'משקל':n.id==='measurements'?'היקפים':'תחליפים'}</span></button>})}</nav>
    <Toast message={toast} onDismiss={()=>setToast(null)}/>
  </div>;
}
