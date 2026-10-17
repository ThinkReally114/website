const CONSENT_KEY = 'cookie-consent';

export type ConsentValue = 'accepted' | 'declined';

export const CONSENT_EVENT = 'cookie-consent-changed';

export function readConsent(): ConsentValue | null {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === 'accepted' || value === 'declined' ? value : null;
  } catch (error) {
    void error;
    return null;
  }
}

export function writeConsent(value: ConsentValue): void {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch (error) {
    void error;
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

export function clearConsent(): void {
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch (error) {
    void error;
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}
