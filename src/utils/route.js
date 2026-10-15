// Minimal pathname router — four routes don't justify a router dependency.
// Components subscribe through useSyncExternalStore, so a navigate() from
// anywhere re-renders every useRoute() consumer in the same tick.
import { useSyncExternalStore } from 'react';

const listeners = new Set();

function subscribe(cb) {
  listeners.add(cb);
  window.addEventListener('popstate', cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('popstate', cb);
  };
}

export function getPath() {
  return window.location.pathname.replace(/\/+$/, '') || '/';
}

export function navigate(path, { replace = false } = {}) {
  if (path === getPath()) return;
  window.history[replace ? 'replaceState' : 'pushState'](null, '', path);
  listeners.forEach((l) => l());
}

export function useRoute() {
  return useSyncExternalStore(subscribe, getPath);
}
