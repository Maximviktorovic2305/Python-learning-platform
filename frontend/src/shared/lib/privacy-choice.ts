import { useSyncExternalStore } from "react";
const KEY = "privacy-choice-2026-10-13";
const EVENT = "privacy-choice-change";
export const OPEN_PRIVACY_EVENT = "privacy-settings-open";
export type PrivacyChoice = "essential" | "analytics";
let sessionChoice: PrivacyChoice | null = null;
let sessionOnly = false;
function readPrivacyChoice(): PrivacyChoice | null {
  if (typeof window === "undefined") return null;
  if (sessionOnly) return sessionChoice;
  try {
    const value = window.localStorage.getItem(KEY);
    return value === "essential" || value === "analytics" ? value : null;
  } catch {
    return sessionChoice;
  }
}
function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
export function usePrivacyChoice() {
  return useSyncExternalStore(subscribe, readPrivacyChoice, () => null);
}
export function savePrivacyChoice(choice: PrivacyChoice) {
  sessionChoice = choice;
  try {
    window.localStorage.setItem(KEY, choice);
    sessionOnly = false;
  } catch {
    sessionOnly = true;
    /* Honor the choice for this session when storage is blocked. */
  }
  window.dispatchEvent(new Event(EVENT));
}
export function openPrivacySettings() {
  window.dispatchEvent(new Event(OPEN_PRIVACY_EVENT));
}
