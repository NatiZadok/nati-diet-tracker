export const INITIAL_DATE = '2026-11-01';
const pad = (n) => String(n).padStart(2, '0');
export const toISO = (date) => `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
export const parseISO = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (iso, days) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
};
export const todayISO = () => toISO(new Date());
export const displayDate = (iso, withWeekday = false) => parseISO(iso).toLocaleDateString('he-IL', {
  ...(withWeekday ? { weekday: 'long' } : {}), day: 'numeric', month: 'long', year: 'numeric',
});
export const dayNumber = (date, start) => Math.floor((Date.UTC(...date.split('-').map((n, i) => i === 1 ? Number(n) - 1 : Number(n))) - Date.UTC(...start.split('-').map((n, i) => i === 1 ? Number(n) - 1 : Number(n)))) / 86400000) + 1;
export const monthLabel = (iso) => parseISO(iso).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
export const monthStart = (iso) => iso.slice(0, 7) + '-01';
export const monthDays = (monthISO) => {
  const d = parseISO(monthISO);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Array.from({ length: end }, (_, i) => `${monthISO.slice(0, 7)}-${pad(i + 1)}`);
};
export const shiftMonth = (monthISO, delta) => {
  const d = parseISO(monthISO);
  d.setMonth(d.getMonth() + delta);
  return toISO(new Date(d.getFullYear(), d.getMonth(), 1));
};
export const weeklyDates = (monthISO, startISO = INITIAL_DATE) => {
  const days = monthDays(monthISO);
  return days.filter((day) => day >= startISO && (day === startISO || parseISO(day).getDay() === 4));
};
export const formatWeight = (n) => Number(n).toLocaleString('he-IL', { maximumFractionDigits: 2 });

/** Sunday–Saturday calendar week, matching the Israeli week layout. */
export const weekStartSunday = (iso) => addDays(iso, -parseISO(iso).getDay());
