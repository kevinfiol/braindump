const LOCAL_STORAGE_PREFIX = '$$BD_SETTINGS_';
const SIDEBAR_KEY = LOCAL_STORAGE_PREFIX + 'sidebarWidth';

function clamp(x, min, max) {
  return x < min && min || (x > max && max || x);
}

export function saveSidebarWidth(width = 250) {
  const newWidth = clamp(width, 100, 500);
  localStorage.setItem(SIDEBAR_KEY, newWidth);
  return newWidth;
}

export function getSidebarWidth() {
  return localStorage.getItem(SIDEBAR_KEY) || 250;
}