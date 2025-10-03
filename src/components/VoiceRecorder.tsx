import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Mic, Square, AudioWaveform, Loader2 } from 'lucide-react';
import { transcriptionService } from '../services/transcriptionService';

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  setIsProcessing: (processing: boolean) => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onTranscriptionComplete, setIsProcessing }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [finalText, setFinalText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isStartingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recoStopRef = useRef<{ stop: () => void } | null>(null);
  const finalTextRef = useRef('');
  const interimTextRef = useRef('');

  const isRecognitionSupported = useMemo(() => transcriptionService.isRecognitionSupported(), []);

  useEffect(() => {
    const onVis = () => console.log('[visibility]', document.visibilityState);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      try {
        recoStopRef.current?.stop();
      } catch (err) {
        console.warn('Error deteniendo reconocimiento en cleanup:', err);
      }
      transcriptionService.stopRecognition();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (err) {
          console.warn('Error deteniendo MediaRecorder en cleanup:', err);
        }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    finalTextRef.current = finalText;
  }, [finalText]);

  useEffect(() => {
    interimTextRef.current = interimText;
  }, [interimText]);

  const resetState = useCallback(() => {
    setFinalText('');
    finalTextRef.current = '';
    setInterimText('');
    interimTextRef.current = '';
    setError(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  }, [audioUrl]);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const stopRecognition = useCallback(() => {
    try {
      recoStopRef.current?.stop();
    } catch (err) {
      console.warn('Error deteniendo reconocimiento:', err);
    }
    recoStopRef.current = null;
    transcriptionService.stopRecognition();
  }, []);

  const stopRecording = useCallback(() => {
    if (!isRecording && !isStartingRef.current) {
      return;
    }

    setIsProcessing(true);
    isStartingRef.current = false;

    stopRecognition();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error('Error al detener MediaRecorder:', err);
        setIsProcessing(false);
      }
    } else {
      stopStream();
      setIsProcessing(false);
    }

    setIsRecording(false);
  }, [isRecording, setIsProcessing, stopRecognition, stopStream]);

  const startRecording = useCallback(async () => {
    if (isStartingRef.current || isRecording) return;

    isStartingRef.current = true;
    setError(null);
    setIsProcessing(true);
    resetState();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false,
        } as MediaTrackConstraints,
      });
      streamRef.current = stream;

      const track = stream.getAudioTracks()[0];
      track.addEventListener('ended', () => {
        console.warn('[MediaStreamTrack] ended');
        stopRecording();
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (evt) => {
        if (evt.data && evt.data.size > 0) {
          audioChunksRef.current.push(evt.data);
        }
      };

      mediaRecorder.onerror = (e) => {
        console.error('[MediaRecorder] onerror:', e);
        setError('Ocurrió un error durante la grabación.');
        stopRecording();
      };

      mediaRecorder.onpause = () => console.log('[MediaRecorder] pause');
      mediaRecorder.onresume = () => console.log('[MediaRecorder] resume');

      mediaRecorder.onstop = () => {
        console.log('[MediaRecorder] stop; chunks:', audioChunksRef.current.length);
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
          stopStream();
          setIsProcessing(false);
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setIsProcessing(false);

      setFinalText('');
      finalTextRef.current = '';
      setInterimText('');
      interimTextRef.current = '';

      setTimeout(() => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
          isStartingRef.current = false;
          return;
        }

        recoStopRef.current = transcriptionService.startRecognition(
          (result) => {
            const trimmed = result.text.trim();
            if (result.isFinal) {
              setFinalText((prev) => {
                const next = trimmed ? (prev ? `${prev} ${trimmed}` : trimmed) : prev;
                finalTextRef.current = next;
                const combined = interimTextRef.current
                  ? [next, interimTextRef.current].filter(Boolean).join(' ')
                  : next;
                if (combined) {
                  onTranscriptionComplete(combined);
                }
                return next;
              });
              setInterimText('');
              interimTextRef.current = '';
            } else if (trimmed) {
              setInterimText(trimmed);
              interimTextRef.current = trimmed;
              const combined = [finalTextRef.current, trimmed].filter(Boolean).join(' ');
              if (combined) {
                onTranscriptionComplete(combined);
              }
            } else {
              setInterimText('');
              interimTextRef.current = '';
            }
          },
          (msg) => console.warn('Reconocimiento:', msg),
          undefined,
          { language: 'es-ES', continuous: true, interimResults: true }
        );
        isStartingRef.current = false;
      }, 250);
    } catch (err) {
      console.error('Error al iniciar la grabación:', err);
      alert('No se pudo acceder al micrófono. Revisa permisos del navegador.');
      isStartingRef.current = false;
      setIsRecording(false);
      stopRecognition();
      stopStream();
      setIsProcessing(false);
    }
  }, [isRecording, onTranscriptionComplete, resetState, setIsProcessing, stopRecognition, stopRecording, stopStream]);

  const toggleRecording = useCallback(() => {
    if (isRecording || isStartingRef.current) {
      stopRecording();
    } else {
      void startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Grabación en Vivo</h2>
        <p className="text-gray-600">
          Graba dictados clínicos directamente desde tu navegador para generar automáticamente la transcripción.
        </p>
      </div>

      {!isRecognitionSupported && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          El reconocimiento de voz no es compatible con este navegador. Por favor, utiliza Google Chrome en un computador de escritorio.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white border border-blue-100 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col items-center space-y-4">
          <div
            className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
              isRecording
                ? 'bg-red-100 ring-4 ring-red-300'
                : 'bg-blue-50 ring-2 ring-blue-200'
            }`}
          >
            {isRecording ? (
              <AudioWaveform className="h-16 w-16 text-red-500 animate-pulse" />
            ) : (
              <Mic className="h-16 w-16 text-blue-500" />
            )}
          </div>

          <button
            type="button"
            onClick={toggleRecording}
            disabled={!isRecognitionSupported}
            className={`px-8 py-3 rounded-lg font-semibold text-white flex items-center space-x-2 transition-colors ${
              isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {isRecording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            <span>{isRecording ? 'Detener grabación' : 'Iniciar grabación'}</span>
          </button>

          {isStartingRef.current && (
            <div className="flex items-center space-x-2 text-blue-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Preparando micrófono...</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
        <h3 className="text-lg font-semibold text-blue-900">Transcripción en tiempo real</h3>
        <p className="text-sm text-blue-800 whitespace-pre-wrap min-h-[80px]">
          {finalText || interimText ? `${finalText}${finalText && interimText ? '\n' : ''}${interimText}` : 'La transcripción aparecerá aquí mientras hablas.'}
        </p>
      </div>

      {audioUrl && (
        <div className="bg-white border border-blue-100 rounded-lg p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Grabación reciente</h3>
          <audio controls src={audioUrl} className="w-full" />
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;
