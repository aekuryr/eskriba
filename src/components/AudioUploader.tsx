import React, { useCallback, useState } from 'react';
import { Upload, FileAudio, X, Check } from 'lucide-react';
import { transcriptionService, type TranscriptionService } from '../services/transcriptionService';

interface AudioUploaderProps {
  onTranscriptionComplete: (text: string) => void;
  setIsProcessing: (processing: boolean) => void;
  service?: TranscriptionService;
}

const AudioUploader: React.FC<AudioUploaderProps> = ({
  onTranscriptionComplete,
  setIsProcessing,
  service = transcriptionService,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('audio/')) {
      alert('Por favor, selecciona un archivo de audio válido.');
      return;
    }

    setUploadedFile(file);
    setIsTranscribing(true);
    setIsProcessing(true);

    try {

      // Transcribir el archivo de audio real
      const transcriptionText = await service.transcribeAudioFile(file);
      onTranscriptionComplete(transcriptionText);
    } catch (error) {
      console.error('Error en transcripción:', error);
      alert('Error al procesar el archivo de audio. Asegúrate de que sea un archivo de audio válido.');
    } finally {
      setIsTranscribing(false);
      setIsProcessing(false);
    }
  }, [onTranscriptionComplete, setIsProcessing]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const removeFile = () => {
    setUploadedFile(null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Subir Grabación de Audio</h2>
        <p className="text-gray-600">
          Sube una grabación de voz con la información del paciente para generar automáticamente la historia clínica.
        </p>
      </div>

      {!uploadedFile && !isTranscribing && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            isDragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400'
          }`}
        >
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Arrastra tu archivo de audio aquí
          </h3>
          <p className="text-gray-600 mb-4">
            o haz clic para seleccionar un archivo
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Formatos soportados: MP3, WAV (máximo 50MB)
          </p>
          
          <label className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer transition-colors">
            <FileAudio className="h-5 w-5 mr-2" />
            Seleccionar Archivo
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>
      )}

      {uploadedFile && !isTranscribing && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Check className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">Archivo subido exitosamente</p>
                <p className="text-sm text-green-600">{uploadedFile.name}</p>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="text-green-600 hover:text-green-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {isTranscribing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="text-center">
            <div className="animate-pulse">
              <FileAudio className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            </div>
            <h3 className="text-lg font-medium text-blue-900 mb-2">
              Procesando Audio
            </h3>
            <p className="text-blue-700">
              Transcribiendo la grabación y extrayendo información médica...
            </p>
            <div className="mt-4 bg-blue-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse w-3/4"></div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-blue-900 mb-2">Información Importante</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Para mejor transcripción, usa la función de grabación en vivo</li>
            <li>• Los archivos subidos usan transcripción simulada para demostración</li>
            <li>• Incluye todos los datos del paciente y información médica relevante</li>
            <li>• Habla claramente y menciona cada sección (antecedentes, examen físico, etc.)</li>
            <li>• Podrás revisar y editar la información antes de guardarla</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AudioUploader;