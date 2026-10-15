// Clearance for the password-gated case studies. Unlocking once lasts the
// browser session so a refresh on /banana-phone doesn't re-prompt.
const KEY = 'tc-clearance';
const CODE = 'cosmic1';

export function checkCode(input) {
  return input.trim().toLowerCase() === CODE;
}

export function isUnlocked() {
  try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; }
}

export function rememberUnlock() {
  try { sessionStorage.setItem(KEY, '1'); } catch { /* private mode — gate again next load */ }
}
