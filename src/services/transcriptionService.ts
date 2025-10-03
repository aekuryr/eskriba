// src/services/transcriptionService.ts

export interface TranscriptionOptions {
  language?: string;        // ej: 'es-ES'
  continuous?: boolean;     // reconocimiento continuo
  interimResults?: boolean; // resultados parciales
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  isFinal: boolean;
}

/** ───────────────────── Reconocimiento en vivo (micro) ───────────────────── */

let currentRecognition: any | null = null;

export function isRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function startRecognition(
  onResult: (r: TranscriptionResult) => void,
  onError?: (msg: string) => void,
  onEnd?: () => void,
  opts: TranscriptionOptions = { language: 'es-ES', continuous: true, interimResults: true }
): { stop: () => void } | null {
  if (!isRecognitionSupported()) {
    onError?.('Reconocimiento de voz no soportado en este navegador');
    return null;
  }

  const w = window as any;
  const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
  const rec = new SR();

  rec.lang = opts.language ?? 'es-ES';
  rec.continuous = opts.continuous ?? true;
  rec.interimResults = opts.interimResults ?? true;
  rec.maxAlternatives = 1;

  rec.onresult = (event: any) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      const alt = res[0];
      const payload: TranscriptionResult = {
        text: alt?.transcript ?? '',
        confidence: typeof alt?.confidence === 'number' ? alt.confidence : (res.isFinal ? 0.9 : 0.5),
        isFinal: !!res.isFinal,
      };
      onResult(payload);
    }
  };

  rec.onerror = (event: any) => {
    const code = event?.error ?? 'unknown';
    const msg = getErrorMessage(code);
    onError?.(msg);
  };

  rec.onend = () => {
    currentRecognition = null;
    onEnd?.();
  };

  try {
    rec.start();
    currentRecognition = rec;
  } catch (e) {
    onError?.('No se pudo iniciar el reconocimiento de voz.');
    return null;
  }

  return { stop: () => stopRecognition() };
}

export function stopRecognition() {
  try {
    currentRecognition?.stop();
  } catch {
    /* ignore */
  } finally {
    currentRecognition = null;
  }
}

function getErrorMessage(error: string): string {
  switch (error) {
    case 'no-speech': return 'No se detectó voz. Intenta hablar más cerca del micrófono.';
    case 'audio-capture': return 'Error al capturar audio. Verifica los permisos del micrófono.';
    case 'not-allowed': return 'Permisos de micrófono denegados. Permite el acceso al micrófono.';
    case 'network': return 'Error de red. Verifica tu conexión a internet.';
    default: return `Error de reconocimiento de voz: ${error}`;
  }
}

/** ─────────────── Transcribir blobs/URLs (no soportado en navegador) ─────────────── */

export function canTranscribeFromUrl(): boolean {
  // La Web Speech API NO ofrece reconocimiento de audio pregrabado (Blob/URL)
  return false;
}

// Si prefieres que NO exista la función, comenta esta exportación y el botón se ocultará por la comprobación del componente.
export async function transcribeFromUrl(_url: string): Promise<string> {
  throw new Error(
    'Transcripción desde Blob/URL no está soportada por Web Speech API en el navegador. ' +
    'Usa reconocimiento en vivo o un servicio de backend.'
  );
}

/** ───────────────────── API agrupada (por compatibilidad) ─────────────────── */

export const transcriptionService = {
  isRecognitionSupported,
  startRecognition,
  stopRecognition,
  canTranscribeFromUrl,
  transcribeFromUrl, // comenta esta línea si quieres que la función "no exista"
};
