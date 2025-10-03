let currentRecognition: any | null = null;
let shouldRestart = false;        // ← nuevo: bandera para auto-reinicio
let restartTimer: any = null;
let restartCount = 0;

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

  // reinicio seguro
  const scheduleRestart = () => {
    if (!shouldRestart) return;
    if (restartTimer) clearTimeout(restartTimer);
    // Backoff básico: 200ms, 400ms, 800ms… máx ~2s
    const delay = Math.min(200 * Math.pow(2, restartCount), 2000);
    restartTimer = setTimeout(() => {
      try {
        rec.start();
        restartCount++;
      } catch {
        // si falla start(), reintenta en el próximo onend/onerror
      }
    }, delay);
  };

  rec.onstart = () => {
    restartCount = 0; // se resetea backoff cuando arranca bien
  };

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
    // Estos códigos suelen aparecer cuando Chrome corta pronto
    if (code === 'aborted' || code === 'no-speech' || code === 'network') {
      onError?.(`Reconocimiento: ${code}`);
      scheduleRestart();
      return;
    }
    // Otros errores: reporta y no fuerces reinicio
    onError?.(getErrorMessage(code));
  };

  rec.onend = () => {
    // Chrome llama a onend cada vez que “cierra” un segmento.
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
    shouldRestart = true; // ← habilita auto-reinicio
  } catch {
    onError?.('No se pudo iniciar el reconocimiento de voz.');
    return null;
  }

  return {
    stop: () => stopRecognition()
  };
}

export function stopRecognition() {
  shouldRestart = false;          // ← desactiva auto-reinicio
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
