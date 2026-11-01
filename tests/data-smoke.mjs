import assert from 'node:assert/strict';
import { dayNumber, monthDays, weeklyDates, weekStartSunday, addDays } from '../src/lib/dates.js';
import { FOOD_GROUPS, FOOD_BY_ID, MEASUREMENTS } from '../src/data/foods.js';
import { STEP_TARGET, stepsReached, stepPercent, stepStats } from '../src/lib/steps.js';
assert.equal(dayNumber('2026-11-01','2026-11-01'),1);
assert.equal(dayNumber('2026-11-30','2026-11-01'),30);
assert.equal(monthDays('2026-11-01').length,30);
assert.deepEqual(weeklyDates('2026-11-01'),['2026-11-01','2026-11-05','2026-11-12','2026-11-19','2026-11-26']);
assert.equal(MEASUREMENTS.length,6);
const all=FOOD_GROUPS.flatMap(g=>g.items);
assert.equal(all.length,160);
assert.equal(new Set(all.map(x=>x.id)).size,all.length);
assert.equal(Object.keys(FOOD_BY_ID).length,all.length);
assert.equal(STEP_TARGET,10000);
assert.equal(stepsReached(null),false);
assert.equal(stepsReached(0),false);
assert.equal(stepsReached(9999),false);
assert.equal(stepsReached(10000),true);
assert.equal(stepsReached(13456),true);
assert.equal(stepPercent(null),0);
assert.equal(stepPercent(5000),50);
assert.equal(stepPercent(10000),100);
assert.equal(stepPercent(15000),100);
assert.equal(weekStartSunday('2026-11-01'), '2026-11-01');
assert.equal(weekStartSunday('2026-11-05'), '2026-11-01');
assert.equal(weekStartSunday('2026-12-01'), '2026-11-29');
assert.equal(addDays('2026-11-29',7),'2026-12-06');
const firstWeek = Array.from({length:7},(_,i)=>addDays('2026-11-01',i));
const firstWeekStats = stepStats([
  {log_date:'2026-11-01',steps:0},
  {log_date:'2026-11-02',steps:9000},
  {log_date:'2026-11-03',steps:10000},
  {log_date:'2026-11-04',steps:12000},
  {log_date:'2026-11-11',steps:50000}, // outside the chosen week
],firstWeek);
assert.deepEqual(firstWeekStats,{total:31000,periodDays:7,loggedDays:4,missingDays:3,average:7750,goalDays:2,goalRate:50});
assert.deepEqual(stepStats([],firstWeek),{total:0,periodDays:7,loggedDays:0,missingDays:7,average:null,goalDays:0,goalRate:null});
assert.equal(stepStats([{log_date:'2026-11-01',steps:10000}],monthDays('2026-11-01')).goalDays,1);
console.log('PASS: dates, weekly schedule, 160 substitutions, 6 measurements, 10,000-step goal.');
