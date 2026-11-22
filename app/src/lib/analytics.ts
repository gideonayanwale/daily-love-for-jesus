const CONSENT_KEY = 'dlfj:analytics-consent:v1';
const SESSION_KEY = 'dlfj:anonymous-session:v1';

export type AnalyticsConsent = 'granted' | 'denied' | null;

export function getAnalyticsConsent(): AnalyticsConsent {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

export function setAnalyticsConsent(consent: Exclude<AnalyticsConsent, null>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CONSENT_KEY, consent);
    if (consent === 'denied') window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Analytics remains disabled if browser storage is unavailable.
  }
}

function getAnonymousSessionId(): string | null {
  if (getAnalyticsConsent() !== 'granted' || typeof window === 'undefined') return null;
  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
    const id = window.crypto.randomUUID();
    window.localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return null;
  }
}

export function getAnonymousAnalyticsHeaders(): Record<string, string> {
  if (getAnalyticsConsent() !== 'granted') return {};
  const sessionId = getAnonymousSessionId();
  return sessionId
    ? { 'x-analytics-consent': 'granted', 'x-anonymous-session': sessionId }
    : {};
}

export function openAnalyticsConsentChoices(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dlfj:open-analytics-consent'));
  }
}
