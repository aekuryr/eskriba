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

export interface RecognitionHandle {
  stop: () => void;
}

const SIMULATED_AUDIO_TRANSCRIPTION = `
Paciente de nombre Ana Rodríguez, 28 años, femenino, nacida el 5 de julio de 1996.
Motivo de consulta: dolor de cabeza intenso de 2 días de evolución, localizado en región frontal.
Antecedentes médicos: migraña desde la adolescencia.
Antecedentes quirúrgicos: ninguno.
Antecedentes familiares: madre con historia de migraña.
Hábitos: no fumadora, consume café regularmente.
Examen físico: paciente alerta, signos vitales normales, sin signos neurológicos focales.
Diagnóstico: crisis migrañosa.
Plan de tratamiento: sumatriptán 50mg vía oral, reposo en lugar oscuro, seguimiento en 48 horas.
`.trim();

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Estado interno de reconocimiento
let currentRecognition: any | null = null;
let shouldRestart = false;     // auto-reinicio mientras la UI esté grabando
let restartTimer: any = null;
let restartCount = 0;

export function isRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/**
 * Inicia el reconocimiento en vivo (micro) y se auto-reinicia si Chrome corta
 * por 'aborted'/'no-speech' o porque dispara onend tras pocos segundos.
 */
export function startRecognition(
  onResult: (r: TranscriptionResult) => void,
  onError?: (msg: string) => void,
  onEnd?: () => void,
  opts: TranscriptionOptions = { language: 'es-ES', continuous: true, interimResults: true }
): RecognitionHandle | null {
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

  const scheduleRestart = () => {
    // programa un nuevo start() con backoff si la UI aún quiere seguir
    if (!shouldRestart) return;
    if (restartTimer) clearTimeout(restartTimer);
    const delay = Math.min(200 * Math.pow(2, restartCount), 2000); // 200ms → 2s
    restartTimer = setTimeout(() => {
      try {
        rec.start();
        restartCount++;
      } catch {
        // si falla start(), reintentaremos en el próximo onend/onerror
      }
    }, delay);
  };

  rec.onstart = () => {
    // cuando arranca bien, reseteamos el backoff
    restartCount = 0;
  };

  rec.onresult = (event: any) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      const alt = res[0];
      onResult({
        text: alt?.transcript ?? '',
        confidence:
          typeof alt?.confidence === 'number'
            ? alt.confidence
            : res.isFinal
            ? 0.9
            : 0.5,
        isFinal: !!res.isFinal,
      });
    }
  };

  rec.onerror = (event: any) => {
    const code = event?.error ?? 'unknown';
    // Errores típicos cuando Chrome corta solo
    if (code === 'aborted' || code === 'no-speech' || code === 'network') {
      onError?.(`Reconocimiento: ${code}`);
      scheduleRestart();
      return;
    }
    // Otros errores: reportar y no forzar reinicio
    onError?.(getErrorMessage(code));
  };

  rec.onend = () => {
    // Chrome dispara onend incluso con continuous: true
    if (shouldRestart) {
      scheduleRestart();
    } else {
      currentRecognition = null;
      onEnd?.();
    }
  };

  try {
    rec.start();
    currentRecognition = rec;
    shouldRestart = true; // habilita auto-reinicio hasta que stopRecognition() lo apague
  } catch {
    onError?.('No se pudo iniciar el reconocimiento de voz.');
    return null;
  }

  return { stop: () => stopRecognition() };
}

export function stopRecognition() {
  // apaga el auto-reinicio y detén la sesión actual
  shouldRestart = false;
  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }
  try {
    currentRecognition?.stop();
  } finally {
    currentRecognition = null;
  }
}

function getErrorMessage(error: string): string {
  switch (error) {
    case 'no-speech':
      return 'No se detectó voz. Intenta hablar más cerca del micrófono.';
    case 'audio-capture':
      return 'Error al capturar audio. Verifica los permisos del micrófono.';
    case 'not-allowed':
      return 'Permisos de micrófono denegados. Permite el acceso al micrófono.';
    case 'network':
      return 'Error de red. Verifica tu conexión a internet.';
    default:
      return `Error de reconocimiento de voz: ${error}`;
  }
}

export async function transcribeAudioFile(file: File): Promise<string> {
  if (!file.type.startsWith('audio/')) {
    throw new Error('El archivo proporcionado no es un audio válido.');
  }

  // Simula una espera de procesamiento como placeholder para una integración real
  await delay(1500);

  return SIMULATED_AUDIO_TRANSCRIPTION;
}

/** Esta app NO soporta transcribir blobs/URL en el navegador */
export function canTranscribeFromUrl(): boolean {
  return false;
}

export interface TranscriptionService {
  isRecognitionSupported: () => boolean;
  startRecognition: (
    onResult: (r: TranscriptionResult) => void,
    onError?: (msg: string) => void,
    onEnd?: () => void,
    opts?: TranscriptionOptions
  ) => RecognitionHandle | null;
  stopRecognition: () => void;
  transcribeAudioFile: (file: File) => Promise<string>;
  canTranscribeFromUrl: () => boolean;
}

export const transcriptionService: TranscriptionService = {
  isRecognitionSupported,
  startRecognition,
  stopRecognition,
  transcribeAudioFile,
  canTranscribeFromUrl,
};
