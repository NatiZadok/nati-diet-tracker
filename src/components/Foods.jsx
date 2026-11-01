import React, {useMemo,useState} from 'react';
import { Search, BookOpen, SlidersHorizontal } from 'lucide-react';
import { FOOD_GROUPS } from '../data/foods';
import { SectionHeading, Pill, EmptyState, Notice } from './UI';

export default function Foods(){
  const [active,setActive]=useState('all');
  const [q,setQ]=useState('');
  const filtered=useMemo(()=>FOOD_GROUPS.filter(g=>active==='all'||g.id===active).map(g=>({...g,items:g.items.filter(item=>item.label.includes(q.trim()))})).filter(g=>g.items.length),[active,q]);
  return <div><SectionHeading eyebrow="המדריך האישי" title="כל התחליפים במקום אחד" sub="לכל מזון יש כמות מוגדרת. כל אפשרות מופיעה בנפרד כדי שיהיה קל לבחור."/>
    <div className="panel food-filters"><div className="food-search"><Search size={19}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="חיפוש מזון, לדוגמה טופו, לחם, מלון..." aria-label="חיפוש ברשימת המזונות"/></div><div className="food-pills"><button className={`food-tab ${active==='all'?'active':''}`} onClick={()=>setActive('all')}>כל הקבוצות</button>{FOOD_GROUPS.map(g=><button key={g.id} className={`food-tab ${active===g.id?'active':''}`} onClick={()=>setActive(g.id)}>{g.emoji} {g.title}</button>)}</div></div>
    {filtered.length===0?<EmptyState title="לא נמצאו מזונות" text="נסי לחפש מילה אחרת או לבחור קבוצת מזון אחרת."/>:<div className="food-sections">{filtered.map(g=><section className="panel food-group" key={g.id}><div className="food-group-heading"><div className="food-group-icon">{g.emoji}</div><div><h2>{g.title}</h2><p>{g.subtitle}</p></div><Pill tone="neutral">{g.items.length} אפשרויות</Pill></div><div className="food-list">{g.items.map(item=><div className="food-list-item" key={item.id}><span className="food-bullet"/>{item.label}</div>)}</div></section>)}</div>}
    <Notice>המידע הועתק מרשימת התחליפים שסיפקת. חלק מהכמויות עשויות להשתנות בין מוצרים, ויש ברשימה כמה הערכות קלוריות שאינן תואמות בהכרח את הכמות. מומלץ לוודא כמויות חריגות עם התזונאית.</Notice>
  </div>;
}
