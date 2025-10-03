import React, { useEffect, useState } from 'react';
import { ClinicalRecord } from '../types/medical';
import { Download, FileDown } from 'lucide-react';

interface ClinicalRecordFormProps {
  initialRecord: ClinicalRecord;
  onRecordUpdate: (record: ClinicalRecord) => void;
}

const ClinicalRecordForm: React.FC<ClinicalRecordFormProps> = ({
  initialRecord,
  onRecordUpdate,
}) => {
  const [localRecord, setLocalRecord] = useState<ClinicalRecord>(initialRecord);
  const [activeSection, setActiveSection] = useState<string>('patient');

  useEffect(() => {
    setLocalRecord(initialRecord);
  }, [initialRecord]);

  // ── utilidades de exportación ───────────────────────────────────────────────
  const exportToJSON = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(localRecord, null, 2));
    const a = document.createElement('a');
    const fileSafe =
      (localRecord.datosPaciente?.nombre || 'historia') +
      '-' +
      (localRecord.datosPaciente?.numeroHistoriaClinica || 'NHC');
    a.href = dataStr;
    a.download = `historia-clinica-${fileSafe}.json`;
    a.click();
  };

  const exportToPDF = () => {
    // Para esta versión usamos el diálogo de impresión nativo (PDF)
    window.print();
  };

  // ── funciones de manejo de cambios ─────────────────────────────────────────
  const handleChange = (
    section: keyof ClinicalRecord,
    field: string,
    value: string
  ) => {
    setLocalRecord((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRecordUpdate(localRecord);
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="print-container">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selector de sección */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            className={`px-3 py-2 rounded-md ${
              activeSection === 'datosPaciente'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200'
            }`}
            onClick={() => setActiveSection('datosPaciente')}
          >
            Datos del Paciente
          </button>
          <button
            type="button"
            className={`px-3 py-2 rounded-md ${
              activeSection === 'antecedentes'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200'
            }`}
            onClick={() => setActiveSection('antecedentes')}
          >
            Antecedentes
          </button>
          <button
            type="button"
            className={`px-3 py-2 rounded-md ${
              activeSection === 'diagnostico'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200'
            }`}
            onClick={() => setActiveSection('diagnostico')}
          >
            Diagnóstico
          </button>
          <button
            type="button"
            className={`px-3 py-2 rounded-md ${
              activeSection === 'tratamiento'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200'
            }`}
            onClick={() => setActiveSection('tratamiento')}
          >
            Tratamiento
          </button>
        </div>

        {/* Campos dinámicos según sección */}
        {activeSection === 'datosPaciente' && (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Nombre"
              value={localRecord.datosPaciente?.nombre || ''}
              onChange={(e) =>
                handleChange('datosPaciente', 'nombre', e.target.value)
              }
              className="w-full border p-2 rounded-md"
            />
            <input
              type="text"
              placeholder="Número de Historia Clínica"
              value={localRecord.datosPaciente?.numeroHistoriaClinica || ''}
              onChange={(e) =>
                handleChange(
                  'datosPaciente',
                  'numeroHistoriaClinica',
                  e.target.value
                )
              }
              className="w-full border p-2 rounded-md"
            />
          </div>
        )}

        {activeSection === 'antecedentes' && (
          <textarea
            placeholder="Antecedentes médicos"
            value={localRecord.antecedentes || ''}
            onChange={(e) =>
              setLocalRecord({ ...localRecord, antecedentes: e.target.value })
            }
            className="w-full border p-2 rounded-md"
          />
        )}

        {activeSection === 'diagnostico' && (
          <textarea
            placeholder="Diagnóstico"
            value={localRecord.diagnostico || ''}
            onChange={(e) =>
              setLocalRecord({ ...localRecord, diagnostico: e.target.value })
            }
            className="w-full border p-2 rounded-md"
          />
        )}

        {activeSection === 'tratamiento' && (
          <textarea
            placeholder="Plan de tratamiento"
            value={localRecord.tratamiento || ''}
            onChange={(e) =>
              setLocalRecord({ ...localRecord, tratamiento: e.target.value })
            }
            className="w-full border p-2 rounded-md"
          />
        )}

        {/* Botones */}
        <div className="flex gap-3 mt-6 no-print">
          <button
            type="submit"
            className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
          >
            💾 Guardar Historia Clínica
          </button>

          <button
            type="button"
            onClick={exportToPDF}
            className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-md"
          >
            <FileDown className="h-5 w-5 mr-2" />
            Exportar PDF
          </button>

          <button
            type="button"
            onClick={exportToJSON}
            className="inline-flex items-center px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors shadow-md"
          >
            <Download className="h-5 w-5 mr-2" />
            Exportar JSON
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClinicalRecordForm;
