import React, { useState, useRef, useEffect } from 'react';
import { transcriptionService } from '../services/transcriptionService';

type Props = {
  onTranscriptionComplete: (text: string) => void;
};

const VoiceRecorder: React.FC<Props> = ({ onTranscriptionComplete }) => {
  const support = transcriptionService.isRecognitionSupported();

  // estado UI
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [finalText, setFinalText] = useState('');
  const [interimText, setInterimText] = useState('');

  // refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recoStopRef = useRef<null | { stop: () => void }>(null);
  const isStartingRef = useRef(false);   // ← evita dobles inicios

  // limpiar URL al desmontar/cambiar
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      // si desmonta la pestaña, frenamos todo
      hardStopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!support) {
    return (
      <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-md text-yellow-900">
        El reconocimiento de voz no es compatible en este navegador.
        Usa <b>Chrome de escritorio</b> o prueba la opción de <b>Subir audio</b>.
      </div>
    );
  }

  /** Detiene reconocimiento y media, usado en unmount/tab-change también */
  const hardStopAll = () => {
    try {
      transcriptionService.stopRecognition();
    } catch {}
    try {
      recoStopRef.current?.stop();
      recoStopRef.current = null;
    } catch {}
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    } catch {}
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    } catch {}
    isStartingRef.current = false;
    setIsRecording(false);
  };

  const startRecording = async () => {
    // SEGURIDAD: no iniciar si ya estamos iniciando o grabando
    if (isStartingRef.current || isRecording) return;
    isStartingRef.current = true;

    try {
      // 1) Pedimos micro
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 2) MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (evt) => {
        if (evt.data && evt.data.size > 0) audioChunksRef.current.push(evt.data);
      };

      mediaRecorder.onstop = () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
          const url = URL.createObjectURL(audioBlob);
          setAudioUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        } catch (e) {
          console.error('Error creando blob/URL de audio:', e);
          setAudioUrl(null);
        } finally {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // 3) Arrancamos reconocimiento con un pequeño delay
      setFinalText('');
      setInterimText('');
      setTimeout(() => {
        // si mientras tanto el usuario ya detuvo, no seguimos
        if (!isRecording && (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording')) {
          isStartingRef.current = false;
          return;
        }
        recoStopRef.current = transcriptionService.startRecognition(
          (r) => {
            if (r.isFinal) {
              setFinalText((prev) => {
                const next = (prev ? prev + ' ' : '') + r.text.trim();
                onTranscriptionComplete(next + (interimText ? ' ' + interimText : ''));
                return next;
              });
              setInterimText('');
            } else {
              setInterimText(r.text.trim());
              onTranscriptionComplete(finalText + (r.text ? ' ' + r.text.trim() : ''));
            }
          },
          (msg) => console.warn('Reconocimiento:', msg),
          undefined,
          { language: 'es-ES', continuous: true, interimResults: true }
        );
        isStartingRef.current = false;
      }, 200); // 150–300ms suele ser suficiente
    } catch (err) {
      console.error('Error al iniciar la grabación:', err);
      alert('No se pudo acceder al micrófono. Revisa permisos del navegador.');
      isStartingRef.current = false;
      setIsRecording(false);
      // por si quedó algo a medias
      hardStopAll();
    }
  };

  const stopRecording = () => {
    try {
      // Cortamos reconocimiento primero (para que no pelee con el stop del micro)
      try { recoStopRef.current?.stop(); } catch {}
      recoStopRef.current = null;

      // Luego MediaRecorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    } finally {
      setIsRecording(false);
      onTranscriptionComplete((finalText + (interimText ? ' ' + interimText : '')).trim());
      setInterimText('');
      isStartingRef.current = false;
    }
  };

  // Solo muestra "Transcribir audio" si ya hay audio y NO estás grabando
  const showTranscribeButton = !!audioUrl && !isRecording;

  const handleTranscribe = () => {
    alert('La transcripción en vivo ya está en marcha; este botón es opcional (solo para un flujo extra).');
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

        {showTranscribeButton && (
          <button
            onClick={handleTranscribe}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Transcribir audio
          </button>
        )}
      </div>

      {(finalText || interimText) && (
        <div className="p-3 rounded-md bg-gray-50 border text-gray-800">
          <div className="whitespace-pre-wrap leading-relaxed">
            {finalText}
            {interimText && <span className="opacity-70"> {interimText}</span>}
          </div>
        </div>
      )}

      {audioUrl && (
        <audio controls src={audioUrl} className="w-full mt-2 rounded-lg shadow-md" />
      )}
    </div>
  );
};

export default VoiceRecorder;
