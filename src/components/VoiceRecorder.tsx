import React, { useState, useRef, useEffect } from 'react';
import { transcriptionService } from '../services/transcriptionService';

type Props = {
  onTranscriptionComplete: (text: string) => void;
};

const VoiceRecorder: React.FC<Props> = ({ onTranscriptionComplete }) => {
  const support = transcriptionService.isRecognitionSupported();
  // Flag de soporte para transcribir blobs/URL (Web Speech normalmente NO lo soporta)
  const canTranscribeBlob = transcriptionService.canTranscribeFromUrl?.() ?? false;

  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup: revoca la URL anterior y limpia intervalos al cambiar audioUrl o desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Si el navegador no soporta SpeechRecognition, mostramos aviso
  if (!support) {
    return (
      <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-md text-yellow-900">
        El reconocimiento de voz no es compatible en este navegador.
        Usa <b>Chrome de escritorio</b> o prueba la opción de <b>Subir audio</b>.
      </div>
    );
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (evt) => {
        if (evt.data && evt.data.size > 0) {
          audioChunksRef.current.push(evt.data);
        }
      };

      mediaRecorder.onstop = () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
          // revoca la URL previa (si existe) y crea una nueva
          if (audioUrl) URL.revokeObjectURL(audioUrl);
          const url = URL.createObjectURL(audioBlob);
          setAudioUrl(url);
        } catch (e) {
          console.error('Error creando blob/URL de audio:', e);
          setAudioUrl(null);
        } finally {
          // liberar el micrófono
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error al iniciar la grabación:', err);
      alert('No se pudo acceder al micrófono. Revisa permisos del navegador.');
    }
  };

  const stopRecording = () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    } finally {
      setIsRecording(false);
    }
  };

  const handleTranscribe = async () => {
    if (!audioUrl) return;
    if (!canTranscribeBlob || typeof transcriptionService.transcribeFromUrl !== 'function') {
      alert('La transcripción de audio grabado no está disponible en el navegador. Usa “Grabar y transcribir en vivo”.');
      return;
    }

    setIsTranscribing(true);
    try {
      const text = await transcriptionService.transcribeFromUrl(audioUrl);
      onTranscriptionComplete(text);
    } catch (err) {
      console.error('Error al transcribir:', err);
      alert('Ocurrió un error durante la transcripción.');
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            🎙️ Iniciar grabación
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            ⏹️ Detener grabación
          </button>
        )}

        {/* Botón de transcribir solo si el servicio lo soporta */}
        {canTranscribeBlob && audioUrl && (
          <button
            onClick={handleTranscribe}
            disabled={isTranscribing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isTranscribing ? 'Transcribiendo...' : 'Transcribir audio'}
          </button>
        )}

        {/* Mensaje si hay audio pero no hay soporte para transcripción desde blob */}
        {!canTranscribeBlob && audioUrl && (
          <span className="text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 px-2 py-1 rounded">
            La transcripción de audio grabado no está disponible en este navegador.
            Usa <b>Grabar y transcribir en vivo</b>.
          </span>
        )}
      </div>

      {audioUrl && (
        <audio controls src={audioUrl} className="w-full mt-2 rounded-lg shadow-md" />
      )}
    </div>
  );
};

export default VoiceRecorder;
