/** Daily walking goal. Missing values never count as meeting the goal. */
export const STEP_TARGET = 10000;
export const stepsReached = (steps) => steps !== null && steps !== undefined && steps !== '' && Number.isInteger(Number(steps)) && Number(steps) >= STEP_TARGET;
export const stepPercent = (steps) => steps === null || steps === undefined || steps === '' ? 0 : Math.min(100, Math.max(0, Number(steps) / STEP_TARGET * 100));


/** Period metrics: missing entries are excluded from the average and success-rate denominator. */
export const stepStats = (rows, dateList) => {
  const allowed = new Set(dateList);
  const byDate = new Map();
  for (const row of rows) {
    const n = Number(row.steps);
    if (allowed.has(row.log_date) && row.steps !== null && row.steps !== undefined && Number.isSafeInteger(n) && n >= 0 && n <= 200000) {
      byDate.set(row.log_date, n);
    }
  }
  const counts = [...byDate.values()];
  const total = counts.reduce((sum, n) => sum + n, 0);
  const goalDays = counts.filter(stepsReached).length;
  return {
    total,
    periodDays: dateList.length,
    loggedDays: counts.length,
    missingDays: dateList.length - counts.length,
    average: counts.length ? Math.round(total / counts.length) : null,
    goalDays,
    goalRate: counts.length ? Math.round(goalDays / counts.length * 100) : null,
  };
};
