const LOCAL_STORAGE_PREFIX = '$$BD_SETTINGS_';
const SIDEBAR_KEY = LOCAL_STORAGE_PREFIX + 'sidebarWidth';

function clamp(x: number, min: number, max: number) {
  return x < min && min || (x > max && max || x);
}

export function saveSidebarWidth(width = 250) {
  const newWidth = clamp(width, 100, 500);
  localStorage.setItem(SIDEBAR_KEY, newWidth.toString());
  return newWidth;
}

export function getSidebarWidth() {
  const width = localStorage.getItem(SIDEBAR_KEY);
  return width ? Number(width) : 250;
}

export function debounce(callback: (...args: unknown[]) => void, wait = 350) {
  let timer: number;

  return (...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), wait);
  };
}

// asdfasdfasdf