// Global Privacy Control — https://globalprivacycontrol.org/
// when true, the visitor's browser/extension is signaling an opt-out preference.
export function getGlobalPrivacyControl(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}
