import React, { useState } from 'react';
import { FileAudio, Mic, Download, Save, User, Activity } from 'lucide-react';
import AudioUploader from './components/AudioUploader';
import VoiceRecorder from './components/VoiceRecorder';
import TranscriptionViewer from './components/TranscriptionViewer';
import ClinicalRecordForm from './components/ClinicalRecordForm';
import { ClinicalRecord } from './types/medical';
import { loadTranscription, loadClinicalRecord, saveTranscription, saveClinicalRecord } from './utils/storage';
import { useEffect } from 'react';

function App() {
  const [transcription, setTranscription] = useState<string>('');
  const [clinicalRecord, setClinicalRecord] = useState<ClinicalRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'record' | 'transcription' | 'clinical'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  // Cargar última sesión desde localStorage
  useEffect(() => {
    const lastT = loadTranscription();
    if (lastT) setTranscription(lastT);
    const lastC = loadClinicalRecord<ClinicalRecord>();
    if (lastC) setClinicalRecord(lastC);
  }, []);

  // Guardar cambios
  useEffect(() => { saveTranscription(transcription); }, [transcription]);
  useEffect(() => { if (clinicalRecord) saveClinicalRecord(clinicalRecord); }, [clinicalRecord]);


  const handleTranscriptionComplete = (text: string) => {
    setTranscription(text);
    setActiveTab('transcription');
  };

  const handleClinicalRecordGenerated = (record: ClinicalRecord) => {
    setClinicalRecord(record);
    setActiveTab('clinical');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">MedRecord AI</h1>
                <p className="text-sm text-gray-600">Generación de Historias Clínicas por Voz</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">Dr. Usuario</span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white rounded-lg shadow-sm border border-blue-100 p-1">
          <nav className="flex space-x-1">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'upload'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <FileAudio className="h-4 w-4" />
              <span>Subir Audio</span>
            </button>
            <button
              onClick={() => setActiveTab('record')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'record'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <Mic className="h-4 w-4" />
              <span>Grabar Audio</span>
            </button>
            <button
              onClick={() => setActiveTab('transcription')}
              disabled={!transcription}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'transcription'
                  ? 'bg-blue-600 text-white'
                  : transcription
                  ? 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              <span>Transcripción</span>
            </button>
            <button
              onClick={() => setActiveTab('clinical')}
              disabled={!clinicalRecord}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'clinical'
                  ? 'bg-blue-600 text-white'
                  : clinicalRecord
                  ? 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              <span>Historia Clínica</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 pb-12">
        <div className="bg-white rounded-lg shadow-sm border border-blue-100 min-h-[600px]">
          {/* Processing Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50 rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Procesando grabación...</p>
              </div>
            </div>
          )}

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'upload' && (
              <AudioUploader
                onTranscriptionComplete={handleTranscriptionComplete}
                setIsProcessing={setIsProcessing}
              />
            )}
            
            {activeTab === 'record' && (
              <VoiceRecorder
                onTranscriptionComplete={handleTranscriptionComplete}
                setIsProcessing={setIsProcessing}
              />
            )}
            
            {activeTab === 'transcription' && (
              <TranscriptionViewer
                transcription={transcription}
                onClinicalRecordGenerated={handleClinicalRecordGenerated}
                setIsProcessing={setIsProcessing}
              />
            )}
            
            {activeTab === 'clinical' && clinicalRecord && (
              <ClinicalRecordForm
                initialRecord={clinicalRecord}
                onRecordUpdate={setClinicalRecord}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;