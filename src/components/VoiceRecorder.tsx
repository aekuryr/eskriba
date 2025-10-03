import React, { useState, useRef, useEffect } from 'react';
import { transcriptionService } from '../services/transcriptionService';

type Props = {
  onTranscriptionComplete: (text: string) => void;
};

const VoiceRecorder: React.FC<Props> = ({ onTranscriptionComplete }) => {
  const support = transcriptionService.isRecognitionSupported();

  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Transcripción en vivo
  const [finalText, setFinalText] = useState('');
  const [interimText, setInterimText] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recoStopRef = useRef<null | { stop: () => void }>(null);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

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

      // Inicia reconocimiento en vivo
      setFinalText('');
      setInterimText('');
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
      recoStopRef.current?.stop();
      recoStopRef.current = null;
    } finally {
      setIsRecording(false);
      onTranscriptionComplete((finalText + (interimText ? ' ' + interimText : '')).trim());
      setInterimText('');
    }
  };

  // (Opcional) si mantienes un botón "Transcribir audio" por compatibilidad, muéstralo SOLO
  // cuando haya audio y NO estés grabando.
  const showTranscribeButton = !!audioUrl && !isRecording;

  const handleTranscribe = () => {
    // Aquí podrías abrir un modal/editor, o copiar el finalText a otra vista.
    // Si no usas transcripción desde blob, puedes incluso ocultar este botón permanentemente.
    alert('Este botón es opcional. La transcripción en vivo ya está funcionando.');
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
