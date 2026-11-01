export const WATER_TARGET_ML = 3000;
export const waterReached = (ml) => ml !== null && ml !== undefined && ml !== '' && Number(ml) >= WATER_TARGET_ML;
export const waterPercent = (ml) => ml == null || ml === '' ? 0 : Math.max(0,Math.min(100,Number(ml)/WATER_TARGET_ML*100));
export const formatLiters = (ml) => (Number(ml)/1000).toLocaleString('he-IL',{minimumFractionDigits:1,maximumFractionDigits:2});
