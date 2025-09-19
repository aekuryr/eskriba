// Utility functions for audio transcription and medical text analysis

export class AudioTranscriptionService {
  private recognition: SpeechRecognition | null = null;

  constructor() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new (window as any).webkitSpeechRecognition();
      this.setupRecognition();
    } else if ('SpeechRecognition' in window) {
      this.recognition = new SpeechRecognition();
      this.setupRecognition();
    }
  }

  private setupRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'es-ES';
    this.recognition.maxAlternatives = 1;
  }

  public async transcribeAudio(audioBlob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      let finalTranscript = '';

      this.recognition.onresult = (event) => {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
      };

      this.recognition.onerror = (event) => {
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      this.recognition.onend = () => {
        resolve(finalTranscript);
      };

      // Para este ejemplo, simularemos la transcripción
      // En producción, aquí procesarías el audioBlob
      setTimeout(() => {
        resolve(`
          Paciente de nombre Ana Rodríguez, 28 años, femenino, nacida el 5 de julio de 1996.
          Motivo de consulta: dolor de cabeza intenso de 2 días de evolución, localizado en región frontal.
          Antecedentes médicos: migraña desde la adolescencia.
          Antecedentes quirúrgicos: ninguno.
          Antecedentes familiares: madre con historia de migraña.
          Hábitos: no fumadora, consume café regularmente.
          Examen físico: paciente alerta, signos vitales normales, no signos neurológicos focales.
          Diagnóstico: crisis migrañosa.
          Plan de tratamiento: sumatriptán 50mg vía oral, reposo en lugar oscuro, seguimiento en 48 horas.
        `.trim());
      }, 2000);
    });
  }

  public isSupported(): boolean {
    return this.recognition !== null;
  }
}

export const transcriptionService = new AudioTranscriptionService();