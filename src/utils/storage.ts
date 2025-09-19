export const STORAGE_KEYS = {
  transcription: 'mvcr-last-transcription',
  clinical: 'mvcr-last-clinical-record'
} as const;

export function saveTranscription(text: string) {
  try { localStorage.setItem(STORAGE_KEYS.transcription, text); } catch {}
}

export function loadTranscription(): string {
  try { return localStorage.getItem(STORAGE_KEYS.transcription) || ''; } catch { return ''; }
}

export function saveClinicalRecord(record: unknown) {
  try { localStorage.setItem(STORAGE_KEYS.clinical, JSON.stringify(record)); } catch {}
}

export function loadClinicalRecord<T>(): T | null {
  try { const v = localStorage.getItem(STORAGE_KEYS.clinical); return v ? JSON.parse(v) as T : null; } catch { return null; }
}

export function clearAll() {
  try {
    localStorage.removeItem(STORAGE_KEYS.transcription);
    localStorage.removeItem(STORAGE_KEYS.clinical);
  } catch {}
}
