import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause } from 'lucide-react';
import { transcriptionService, TranscriptionResult } from '../services/transcriptionService';

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  setIsProcessing: (processing: boolean) => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ 
  onTranscriptionComplete, 
  setIsProcessing 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string>('');
  const [liveTranscription, setLiveTranscription] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const support = transcriptionService.isRecognitionSupported();
  const [support, setSupport] = useState<boolean>(transcriptionService.isRecognitionSupported());

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return (
    !support ? (
      <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-md text-yellow-900">
        El reconocimiento de voz no es compatible en este navegador. Usa <b>Chrome de escritorio</b> o prueba la opción de subir audio.
      </div>
    ) : () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      setError('');
      setLiveTranscription('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Detener todas las pistas del stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Iniciar contador de tiempo
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Iniciar transcripción en tiempo real
      if (transcriptionService.isRecognitionSupported()) {
        setIsTranscribing(true);
        transcriptionService.transcribeFromMicrophone(
          (result: TranscriptionResult) => {
            if (result.isFinal) {
              setLiveTranscription(prev => prev + ' ' + result.text);
            }
          },
          (error: string) => {
            console.warn('Error en transcripción en tiempo real:', error);
            // No mostramos error al usuario para no interrumpir la grabación
          }
        ).catch(err => {
          console.warn('Error iniciando transcripción:', err);
        });
      }
    } catch (err) {
      setError('Error al acceder al micrófono. Asegúrate de dar permisos de audio.');
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      transcriptionService.stopRecognition();
      setIsTranscribing(false);
      setIsRecording(false);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  };

  const playRecording = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const pauseRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const processRecording = async () => {
    if (!audioBlob) return;

    // Si ya tenemos transcripción en tiempo real, la usamos
    if (liveTranscription.trim()) {
      onTranscriptionComplete(liveTranscription.trim());
      return;
    }

    setIsProcessing(true);
    
    try {

      // Procesar la grabación como archivo de audio
      const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
      const transcriptionText = await transcriptionService.transcribeAudioFile(audioFile);
      onTranscriptionComplete(transcriptionText);
    } catch (error) {
      console.error('Error en transcripción:', error);
      setError('Error al procesar la grabación.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    !support ? (
      <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-md text-yellow-900">
        El reconocimiento de voz no es compatible en este navegador. Usa <b>Chrome de escritorio</b> o prueba la opción de subir audio.
      </div>
    ) : (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Grabar Audio</h2>
        <p className="text-gray-600">
          Graba directamente la información del paciente usando tu micrófono.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Recording Interface */}
      <div className="bg-gray-50 rounded-lg p-8">
        <div className="text-center">
          {!isRecording && !audioBlob && (
            <div>
              <button
                onClick={startRecording}
                className="inline-flex items-center justify-center w-20 h-20 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg"
              >
                <Mic className="h-8 w-8" />
              </button>
              <p className="mt-4 text-gray-600">Haz clic para comenzar a grabar</p>
            </div>
          )}

          {isRecording && (
            <div>
              <div className="relative">
                <button
                  onClick={stopRecording}
                  className="inline-flex items-center justify-center w-20 h-20 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg animate-pulse"
                >
                  <Square className="h-8 w-8" />
                </button>
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  REC
                </div>
              </div>
              <p className="mt-4 text-red-600 font-medium">Grabando: {formatTime(recordingTime)}</p>
              <p className="text-sm text-gray-500">Haz clic en el botón para detener</p>
              
              {/* Live Transcription Preview */}
              {liveTranscription && (
                <div className="mt-4 p-3 bg-white rounded-md border border-gray-200 max-h-32 overflow-y-auto">
                  <p className="text-xs text-gray-500 mb-1">Transcripción en tiempo real:</p>
                  <p className="text-sm text-gray-700">{liveTranscription}</p>
                </div>
              )}
            </div>
          )}

          {audioBlob && !isRecording && (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={isPlaying ? pauseRecording : playRecording}
                  className="inline-flex items-center justify-center w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </button>
                <span className="text-gray-600">Duración: {formatTime(recordingTime)}</span>
              </div>
              
              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="hidden"
              />

              <div className="flex space-x-3 justify-center">
                <button
                  onClick={() => {
                    setAudioBlob(null);
                    setLiveTranscription('');
                    setAudioUrl('');
                    setRecordingTime(0);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Grabar de Nuevo
                </button>
                <button
                  onClick={processRecording}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Procesar Grabación
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-900 mb-2">Consejos para una Grabación Óptima</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Habla claramente y a velocidad moderada (la transcripción es en tiempo real)</li>
          <li>• Menciona todos los datos del paciente: nombre, edad, género, fecha de nacimiento</li>
          <li>• Incluye motivo de consulta, antecedentes y examen físico</li>
          <li>• Asegúrate de estar en un ambiente silencioso para mejor precisión</li>
          <li>• Verás la transcripción aparecer en tiempo real mientras grabas</li>
        </ul>
      </div>
    </div>
  ));
};

export default VoiceRecorder;
