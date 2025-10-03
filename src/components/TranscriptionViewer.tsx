import React, { useState } from 'react';
import { Edit3, Wand2, FileText } from 'lucide-react';
import { ClinicalRecord } from '../types/medical';
import { saveTranscription } from '../utils/storage';
import { useEffect } from 'react';

interface TranscriptionViewerProps {
  transcription: string;
  onClinicalRecordGenerated: (record: ClinicalRecord) => void;
  setIsProcessing: (processing: boolean) => void;
}

const TranscriptionViewer: React.FC<TranscriptionViewerProps> = ({
  transcription,
  onClinicalRecordGenerated,
  setIsProcessing
}) => {
  const [editedTranscription, setEditedTranscription] = useState(transcription);
  useEffect(() => { saveTranscription(editedTranscription); }, [editedTranscription]);
  const [isEditing, setIsEditing] = useState(false);

  const generateClinicalRecord = async () => {
    setIsProcessing(true);

    try {
      // Simular procesamiento con IA
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extraer información usando patrones simples (en producción usarías IA real)
      const fallbackFromKeywords = (text: string, keywords: string[]): string | null => {
        const lowerText = text.toLowerCase();

        for (const keyword of keywords) {
          const lowerKeyword = keyword.toLowerCase();
          const keywordIndex = lowerText.indexOf(lowerKeyword);

          if (keywordIndex !== -1) {
            const startIndex = keywordIndex + lowerKeyword.length;
            const remainingText = text.slice(startIndex).trim();
            if (!remainingText) continue;

            const sentenceCandidate = remainingText.split(/(?<=[.!?])\s+|\n+/)[0]?.trim();
            if (sentenceCandidate) {
              return sentenceCandidate;
            }

            return remainingText;
          }
        }

        return null;
      };

      const withFallback = (
        primary: string | null,
        keywords: string[],
        transcriptionText: string
      ) => primary ?? fallbackFromKeywords(transcriptionText, keywords);

      const fullTranscription = editedTranscription.trim();

      const motivoConsulta =
        withFallback(
          extractSection(editedTranscription, [
            /motivo(?:\s+de)?\s+consulta[:-]?\s*(.*?)(?=antecedentes|examen|diagn[oó]stico|plan|tratamiento|$)/is,
            /consulta(?:\s+por|\s+debido\s+a)?[:-]?\s*(.*?)(?=antecedentes|examen|diagn[oó]stico|plan|tratamiento|$)/is,
            /presenta[:-]?\s*(.*?)(?=antecedentes|examen|diagn[oó]stico|plan|tratamiento|$)/is
          ]),
          ['motivo de consulta', 'consulta por', 'consulta debido', 'presenta'],
          editedTranscription
        ) ?? fullTranscription;

      const antecedentesMedicos =
        withFallback(
          extractSection(editedTranscription, [
            /antecedentes?\s+m[eé]dicos?[:-]?\s*(.*?)(?=antecedentes\s+quir[úu]rgicos|antecedentes\s+familiares|h[aá]bitos|examen|$)/is,
            /historia\s+m[eé]dica[:-]?\s*(.*?)(?=antecedentes\s+quir[úu]rgicos|antecedentes\s+familiares|h[aá]bitos|examen|$)/is
          ]),
          ['antecedentes médicos', 'historia médica'],
          editedTranscription
        ) ?? fullTranscription;

      const antecedentesQuirurgicos =
        withFallback(
          extractSection(editedTranscription, [
            /antecedentes?\s+quir[úu]rgicos?[:-]?\s*(.*?)(?=antecedentes\s+familiares|h[aá]bitos|examen|$)/is
          ]),
          ['antecedentes quirúrgicos'],
          editedTranscription
        ) ?? fullTranscription;

      const antecedentesFamiliares =
        withFallback(
          extractSection(editedTranscription, [
            /antecedentes?\s+familiares?[:-]?\s*(.*?)(?=h[aá]bitos|examen|diagn[oó]stico|plan|tratamiento|$)/is
          ]),
          ['antecedentes familiares'],
          editedTranscription
        ) ?? fullTranscription;

      const habitos =
        withFallback(
          extractSection(editedTranscription, [
            /h[aá]bitos?[:-]?\s*(.*?)(?=examen|diagn[oó]stico|plan|tratamiento|$)/is
          ]),
          ['hábitos', 'habitos'],
          editedTranscription
        ) ?? fullTranscription;

      const examenFisico =
        withFallback(
          extractSection(editedTranscription, [
            /examen\s+f[ií]sico[:-]?\s*(.*?)(?=diagn[oó]stico|plan|tratamiento|$)/is
          ]),
          ['examen físico', 'evaluación física'],
          editedTranscription
        ) ?? fullTranscription;

      const diagnostico =
        withFallback(
          extractSection(editedTranscription, [
            /diagn[oó]stico[:-]?\s*(.*?)(?=plan|tratamiento|$)/is,
            /se\s+diagnostica[:-]?\s*(.*?)(?=plan|tratamiento|$)/is
          ]),
          ['diagnóstico', 'diagnostica'],
          editedTranscription
        ) ?? fullTranscription;

      const planTratamiento =
        withFallback(
          extractSection(editedTranscription, [
            /(?:plan|tratamiento)[:-]?\s*(.*?)$/is,
            /se\s+indica[:-]?\s*(.*?)$/is
          ]),
          ['plan de tratamiento', 'plan', 'tratamiento', 'se indica'],
          editedTranscription
        ) ?? fullTranscription;

      const record: ClinicalRecord = {
        datosPaciente: {
          nombre:
            extractPattern(editedTranscription, [
              /(?:paciente|nombre)(?:\s+de\s+nombre|\s+llamad[oa]|\s+es)?\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)/i,
              /de\s+nombre\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)/i,
              /se\s+identifica\s+como\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)/i
            ]) || '',
          edad: parseInt(extractPattern(editedTranscription, /(\d+)\s+años?/i) || '0'),
          genero: extractPattern(editedTranscription, /(masculino|femenino|hombre|mujer)/i) || '',
          fechaNacimiento:
            extractPattern(editedTranscription, [
              /(?:nacid[oa]|fecha\s+de\s+nacimiento)(?:\s+el)?\s+(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})/i
            ]) || '',
          numeroHistoriaClinica: `HC-${Date.now().toString().slice(-6)}`
        },
        motivoConsulta,
        historiaMedica: {
          antecedentesMedicos,
          antecedentesQuirurgicos,
          antecedentesFamiliares,
          habitos
        },
        examenFisico,
        diagnostico,
        planTratamiento,
        fechaGeneracion: new Date().toLocaleDateString('es-ES')
      };

      onClinicalRecordGenerated(record);
    } catch (error) {
      console.error('Error generando historia clínica:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const extractPattern = (text: string, pattern: RegExp | RegExp[]): string | null => {
    const patterns = Array.isArray(pattern) ? pattern : [pattern];
    for (const currentPattern of patterns) {
      const match = text.match(currentPattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  };

  const extractSection = (text: string, pattern: RegExp | RegExp[]): string | null => {
    const patterns = Array.isArray(pattern) ? pattern : [pattern];
    for (const currentPattern of patterns) {
      const match = text.match(currentPattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transcripción de Audio</h2>
          <p className="text-gray-600">Revisa y edita la transcripción antes de generar la historia clínica.</p>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Edit3 className="h-4 w-4 mr-2" />
          {isEditing ? 'Vista Previa' : 'Editar'}
        </button>
      </div>

      <div className="bg-gray-50 rounded-lg border-2 border-gray-200">
        {isEditing ? (
          <textarea
            value={editedTranscription}
            onChange={(e) => setEditedTranscription(e.target.value)}
            className="w-full h-64 p-4 border-none bg-transparent resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-lg"
            placeholder="Transcripción del audio..."
          />
        ) : (
          <div className="p-4 h-64 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-gray-800 font-mono text-sm leading-relaxed">
              {editedTranscription || 'No hay transcripción disponible...'}
            </pre>
          </div>
        )}
      </div>

      {editedTranscription && (
        <div className="flex justify-center">
          <button
            onClick={generateClinicalRecord}
            className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
          >
            <Wand2 className="h-5 w-5 mr-2" />
            Generar Historia Clínica
          </button>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <FileText className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-yellow-900">Procesamiento con IA</h3>
            <p className="text-sm text-yellow-800 mt-1">
              El sistema usa análisis de texto inteligente para extraer automáticamente los datos del paciente, 
              motivo de consulta, antecedentes médicos, examen físico, diagnóstico y plan de tratamiento de la transcripción.
              Puedes editar cualquier campo después de la generación.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranscriptionViewer;