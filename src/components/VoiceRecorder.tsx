import React, { useState, useRef, useEffect } from 'react';
import { transcriptionService } from '../services/transcriptionService';

const VoiceRecorder: React.FC<{ onTranscriptionComplete: (text: string) => void }> = ({ onTranscriptionComplete }) => {
  const support = transcriptionService.isRecognitionSupported();

  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // ⚠️ Early return si el navegador no soporta SpeechRecognition
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
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunks.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error al iniciar la grabación:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTranscribe = async () => {
    if (!audioUrl) return;
    setIsTranscribing(true);
    try {
      const text = await transcriptionService.transcribeFromUrl(audioUrl);
      onTranscriptionComplete(text);
    } catch (err) {
      console.error('Error al transcribir:', err);
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-4">
        {!isRecording ? (
          <button onClick={startRecording} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            🎙️ Iniciar grabación
          </button>
        ) : (
          <button onClick={stopRecording} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            ⏹️ Detener grabación
          </button>
        )}

        {audioUrl && (
          <button
            onClick={handleTranscribe}
            disabled={isTranscribing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isTranscribing ? 'Transcribiendo...' : 'Transcribir audio'}
          </button>
        )}
      </div>

      {audioUrl && (
        <audio controls src={audioUrl} className="w-full mt-4 rounded-lg shadow-md" />
      )}
    </div>
  );
};

export default VoiceRecorder;
