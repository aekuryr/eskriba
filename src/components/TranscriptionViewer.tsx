import React, { useState } from 'react';
import { Edit3, Wand2, FileText } from 'lucide-react';
import { ClinicalRecord } from '../types/medical';
import { saveTranscription } from '../utils/storage';
import { useEffect } from 'react';

interface SentenceMatch {
  text: string;
  indices: number[];
}

const normalizeForSearch = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

const splitIntoSentences = (text: string): string[] =>
  text
    .split(/(?<=[.!?])\s+|\n+/)
    .map(sentence => sentence.trim())
    .filter(Boolean);

const findSentenceContaining = (
  sentences: string[],
  keywords: string[],
  usedSentenceIndices: Set<number>
): SentenceMatch | null => {
  if (!sentences.length || !keywords.length) {
    return null;
  }

  const normalizedKeywords = keywords
    .map(keyword => normalizeForSearch(keyword))
    .filter(Boolean);

  if (!normalizedKeywords.length) {
    return null;
  }

  const containsKeyword = (candidate: string) => {
    const normalizedCandidate = normalizeForSearch(candidate);
    return normalizedKeywords.some(keyword => normalizedCandidate.includes(keyword));
  };

  for (let index = 0; index < sentences.length; index += 1) {
    if (usedSentenceIndices.has(index)) {
      continue;
    }

    const sentence = sentences[index];
    if (containsKeyword(sentence)) {
      return { text: sentence, indices: [index] };
    }
  }

  const maxWindowSize = Math.min(3, sentences.length);

  for (let windowSize = 2; windowSize <= maxWindowSize; windowSize += 1) {
    for (let startIndex = 0; startIndex <= sentences.length - windowSize; startIndex += 1) {
      const indices = Array.from({ length: windowSize }, (_, offset) => startIndex + offset);

      if (indices.some(index => usedSentenceIndices.has(index))) {
        continue;
      }

      const combined = indices.map(index => sentences[index]).join(' ');

      if (containsKeyword(combined)) {
        return { text: combined, indices };
      }
    }
  }

  return null;
};

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

      const sentences = splitIntoSentences(editedTranscription);
      const usedSentenceIndices = new Set<number>();

      const markSentencesAsUsed = (text: string) => {
        const normalizedText = normalizeForSearch(text);

        sentences.forEach((sentence, index) => {
          if (usedSentenceIndices.has(index)) {
            return;
          }

          const normalizedSentence = normalizeForSearch(sentence);

          if (normalizedSentence && normalizedText.includes(normalizedSentence)) {
            usedSentenceIndices.add(index);
          }
        });
      };

      const withHeuristicFallback = (
        primary: string | null,
        keywords: string[]
      ): string => {
        if (primary && primary.trim()) {
          markSentencesAsUsed(primary);
          return primary.trim();
        }

        const match = findSentenceContaining(sentences, keywords, usedSentenceIndices);

        if (match) {
          match.indices.forEach(index => usedSentenceIndices.add(index));
          return match.text;
        }

        return '';
      };

      const motivoConsulta =
        withHeuristicFallback(
          extractSection(editedTranscription, [
            /motivo(?:\s+de)?\s+consulta[:-]?\s*(.*?)(?=antecedentes|examen|diagn[oó]stico|plan|tratamiento|$)/is,
            /consulta(?:\s+por|\s+debido\s+a)?[:-]?\s*(.*?)(?=antecedentes|examen|diagn[oó]stico|plan|tratamiento|$)/is,
            /presenta[:-]?\s*(.*?)(?=antecedentes|examen|diagn[oó]stico|plan|tratamiento|$)/is
          ]),
          ['motivo de consulta', 'consulta', 'refiere', 'presenta']
        );

      const antecedentesMedicos =
        withHeuristicFallback(
          extractSection(editedTranscription, [
            /antecedentes?\s+m[eé]dicos?[:-]?\s*(.*?)(?=antecedentes\s+quir[úu]rgicos|antecedentes\s+familiares|h[aá]bitos|examen|$)/is,
            /historia\s+m[eé]dica[:-]?\s*(.*?)(?=antecedentes\s+quir[úu]rgicos|antecedentes\s+familiares|h[aá]bitos|examen|$)/is
          ]),
          ['antecedentes médicos', 'historia médica', 'enfermedad crónica', 'antecedentes personales']
        );

      const antecedentesQuirurgicos =
        withHeuristicFallback(
          extractSection(editedTranscription, [
            /antecedentes?\s+quir[úu]rgicos?[:-]?\s*(.*?)(?=antecedentes\s+familiares|h[aá]bitos|examen|$)/is
          ]),
          ['antecedentes quirúrgicos', 'cirug', 'operaci', 'intervención']
        );

      const antecedentesFamiliares =
        withHeuristicFallback(
          extractSection(editedTranscription, [
            /antecedentes?\s+familiares?[:-]?\s*(.*?)(?=h[aá]bitos|examen|diagn[oó]stico|plan|tratamiento|$)/is
          ]),
          ['antecedentes familiares', 'familia', 'heredit', 'padre', 'madre']
        );

      const habitos =
        withHeuristicFallback(
          extractSection(editedTranscription, [
            /h[aá]bitos?[:-]?\s*(.*?)(?=examen|diagn[oó]stico|plan|tratamiento|$)/is
          ]),
          ['hábitos', 'habitos', 'consumo', 'fuma', 'alcohol', 'actividad física']
        );

      const examenFisico =
        withHeuristicFallback(
          extractSection(editedTranscription, [
            /examen\s+f[ií]sico[:-]?\s*(.*?)(?=diagn[oó]stico|plan|tratamiento|$)/is
          ]),
          ['examen físico', 'exploración', 'signos vitales', 'evaluación física']
        );

      const diagnostico =
        withHeuristicFallback(
          extractSection(editedTranscription, [
            /diagn[oó]stico[:-]?\s*(.*?)(?=plan|tratamiento|$)/is,
            /se\s+diagnostica[:-]?\s*(.*?)(?=plan|tratamiento|$)/is
          ]),
          ['diagnóstico', 'diagnostica', 'impresión diagnóstica', 'dx']
        );

      const planTratamiento =
        withHeuristicFallback(
          extractSection(editedTranscription, [
            /(?:plan|tratamiento)[:-]?\s*(.*?)$/is,
            /se\s+indica[:-]?\s*(.*?)$/is
          ]),
          ['plan de tratamiento', 'plan', 'tratamiento', 'se indica', 'manejo', 'indicaciones']
        );

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
