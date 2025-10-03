// src/services/transcriptionService.ts

export interface TranscriptionOptions {
  language?: string;        // 'es-ES' por defecto
  continuous?: boolean;     // reconocimiento continuo
  interimResults?: boolean; // resultados parciales
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  isFinal: boolean;
}

let currentRecognition: any | null = null;

export function isRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/** Inicia el reconocimiento en vivo (micro). Devuelve un handler con stop() */
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
      onResult({
        text: alt?.transcript ?? '',
        confidence: typeof alt?.confidence === 'number' ? alt.confidence : (res.isFinal ? 0.9 : 0.5),
        isFinal: !!res.isFinal,
      });
    }
  };

  rec.onerror = (event: any) => {
    const code = event?.error ?? 'unknown';
    onError?.(getErrorMessage(code));
  };

  rec.onend = () => {
    currentRecognition = null;
    onEnd?.();
  };

  try {
    rec.start();
    currentRecognition = rec;
  } catch {
    onError?.('No se pudo iniciar el reconocimiento de voz.');
    return null;
  }

  return { stop: () => stopRecognition() };
}

export function stopRecognition() {
  try {
    currentRecognition?.stop();
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

/** Esta app NO soporta transcribir blobs en el navegador */
export function canTranscribeFromUrl(): boolean {
  return false;
}

export const transcriptionService = {
  isRecognitionSupported,
  startRecognition,
  stopRecognition,
  canTranscribeFromUrl,
};
