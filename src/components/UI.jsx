import React from 'react';
import { AlertCircle, CheckCircle2, X, LoaderCircle } from 'lucide-react';

export function Pill({ children, tone = 'pink', className = '' }) {
  return <span className={`pill pill-${tone} ${className}`}>{children}</span>;
}
export function SectionHeading({ eyebrow, title, sub, action }) {
  return <div className="section-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>{action}</div>;
}
export function EmptyState({ emoji = '🌷', title, text }) {
  return <div className="empty-state"><span>{emoji}</span><h3>{title}</h3><p>{text}</p></div>;
}
export function Notice({ tone = 'info', children }) {
  return <div className={`notice notice-${tone}`}><AlertCircle size={18} aria-hidden="true"/><span>{children}</span></div>;
}
export function Spinner({ text = 'טוענת...' }) {
  return <div className="spinner"><LoaderCircle className="spin" size={20}/><span>{text}</span></div>;
}
export function Toast({ message, onDismiss }) {
  if (!message) return null;
  return <div className={`toast ${message.type === 'error' ? 'toast-error' : ''}`} role="status">
    {message.type === 'error' ? <AlertCircle size={18}/> : <CheckCircle2 size={18}/>}
    <span>{message.text}</span>
    <button aria-label="סגירה" onClick={onDismiss}><X size={16}/></button>
  </div>;
}
