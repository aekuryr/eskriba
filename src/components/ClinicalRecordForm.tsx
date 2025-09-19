import React, { useState } from 'react';
import { Save, Download, Edit3, User, Heart, Stethoscope, Clipboard, Presentation as PrescriptionBottle } from 'lucide-react';
import { ClinicalRecord } from '../types/medical';

interface ClinicalRecordFormProps {
  initialRecord: ClinicalRecord;
  onRecordUpdate: (record: ClinicalRecord) => void;
}

const ClinicalRecordForm: React.FC<ClinicalRecordFormProps> = ({
  initialRecord,
  onRecordUpdate
}) => {
  const [record, setRecord] = useState<ClinicalRecord>(initialRecord);
  const [isEditing, setIsEditing] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('patient');
  // Exportar JSON
  const exportToJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(record, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    const fileSafe = (record.datosPaciente?.nombre || 'historia') + '-' + (record.datosPaciente?.numeroHistoriaClinica || 'NHC');
    a.download = `historia-clinica-${fileSafe}.json`;
    a.click();
  };

  // Imprimir / Guardar PDF (usa diálogo del navegador)
  const exportToPDF = () => {
    window.print();
  };


  const updateRecord = (section: keyof ClinicalRecord, value: any) => {
    const updatedRecord = { ...record, [section]: value };
    setRecord(updatedRecord);
    onRecordUpdate(updatedRecord);
  };

  const updatePatientData = (field: string, value: string | number) => {
    const updatedPatientData = { ...record.datosPaciente, [field]: value };
    updateRecord('datosPaciente', updatedPatientData);
  };

  const updateMedicalHistory = (field: string, value: string) => {
    const updatedHistory = { ...record.historiaMedica, [field]: value };
    updateRecord('historiaMedica', updatedHistory);
  };

  const exportToPDF = () => {
    // En producción, usarías una librería como jsPDF
    const content = generatePrintableContent();
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(content);
      newWindow.document.close();
      newWindow.print();
    }
  };

  const generatePrintableContent = () => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Historia Clínica - ${record.datosPaciente.nombre}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .section-title { font-weight: bold; color: #1E40AF; margin-bottom: 10px; border-bottom: 1px solid #E5E7EB; }
            .field { margin-bottom: 8px; }
            .label { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>HISTORIA CLÍNICA MÉDICA</h1>
            <p>Fecha de Generación: ${record.fechaGeneracion}</p>
          </div>
          
          <div class="section">
            <div class="section-title">DATOS DEL PACIENTE</div>
            <div class="field"><span class="label">Nombre:</span> ${record.datosPaciente.nombre}</div>
            <div class="field"><span class="label">Edad:</span> ${record.datosPaciente.edad} años</div>
            <div class="field"><span class="label">Género:</span> ${record.datosPaciente.genero}</div>
            <div class="field"><span class="label">Fecha de Nacimiento:</span> ${record.datosPaciente.fechaNacimiento}</div>
            <div class="field"><span class="label">Número de Historia Clínica:</span> ${record.datosPaciente.numeroHistoriaClinica}</div>
          </div>

          <div class="section">
            <div class="section-title">MOTIVO DE CONSULTA</div>
            <p>${record.motivoConsulta}</p>
          </div>

          <div class="section">
            <div class="section-title">HISTORIA MÉDICA</div>
            <div class="field"><span class="label">Antecedentes Médicos:</span> ${record.historiaMedica.antecedentesMedicos}</div>
            <div class="field"><span class="label">Antecedentes Quirúrgicos:</span> ${record.historiaMedica.antecedentesQuirurgicos}</div>
            <div class="field"><span class="label">Antecedentes Familiares:</span> ${record.historiaMedica.antecedentesFamiliares}</div>
            <div class="field"><span class="label">Hábitos:</span> ${record.historiaMedica.habitos}</div>
          </div>

          <div class="section">
            <div class="section-title">EXAMEN FÍSICO</div>
            <p>${record.examenFisico}</p>
          </div>

          <div class="section">
            <div class="section-title">DIAGNÓSTICO</div>
            <p>${record.diagnostico}</p>
          </div>

          <div class="section">
            <div class="section-title">PLAN DE TRATAMIENTO</div>
            <p>${record.planTratamiento}</p>
          </div>
        </body>
      </html>
    `;
  };

  const sections = [
    { id: 'patient', label: 'Datos del Paciente', icon: User },
    { id: 'consultation', label: 'Consulta', icon: Clipboard },
    { id: 'history', label: 'Historia Médica', icon: Heart },
    { id: 'examination', label: 'Examen Físico', icon: Stethoscope },
    { id: 'diagnosis', label: 'Diagnóstico', icon: PrescriptionBottle }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Historia Clínica Generada</h2>
          <p className="text-gray-600">Revisa y edita la información extraída de la transcripción.</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Edit3 className="h-4 w-4 mr-2" />
            {isEditing ? 'Vista Previa' : 'Editar'}
          </button>
          <button
            onClick={exportToPDF}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1 p-1">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeSection === id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeSection === 'patient' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <User className="h-5 w-5 mr-2 text-blue-600" />
                Datos del Paciente
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={record.datosPaciente.nombre}
                      onChange={(e) => updatePatientData('nombre', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="px-3 py-2 bg-gray-50 rounded-md">{record.datosPaciente.nombre || 'No especificado'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Edad</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={record.datosPaciente.edad}
                      onChange={(e) => updatePatientData('edad', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="px-3 py-2 bg-gray-50 rounded-md">{record.datosPaciente.edad} años</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Género</label>
                  {isEditing ? (
                    <select
                      value={record.datosPaciente.genero}
                      onChange={(e) => updatePatientData('genero', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                    </select>
                  ) : (
                    <p className="px-3 py-2 bg-gray-50 rounded-md">{record.datosPaciente.genero || 'No especificado'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={record.datosPaciente.fechaNacimiento}
                      onChange={(e) => updatePatientData('fechaNacimiento', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="DD/MM/AAAA"
                    />
                  ) : (
                    <p className="px-3 py-2 bg-gray-50 rounded-md">{record.datosPaciente.fechaNacimiento || 'No especificado'}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número de Historia Clínica</label>
                  <p className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-md font-mono">
                    {record.datosPaciente.numeroHistoriaClinica}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'consultation' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Clipboard className="h-5 w-5 mr-2 text-blue-600" />
                Motivo de Consulta
              </h3>
              {isEditing ? (
                <textarea
                  value={record.motivoConsulta}
                  onChange={(e) => updateRecord('motivoConsulta', e.target.value)}
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Describe el motivo de la consulta..."
                />
              ) : (
                <div className="px-4 py-3 bg-gray-50 rounded-md">
                  <p className="text-gray-800">{record.motivoConsulta || 'No especificado'}</p>
                </div>
              )}
            </div>
          )}

          {activeSection === 'history' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Heart className="h-5 w-5 mr-2 text-blue-600" />
                Historia Médica
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Antecedentes Médicos</label>
                  {isEditing ? (
                    <textarea
                      value={record.historiaMedica.antecedentesMedicos}
                      onChange={(e) => updateMedicalHistory('antecedentesMedicos', e.target.value)}
                      className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  ) : (
                    <p className="px-3 py-2 bg-gray-50 rounded-md">{record.historiaMedica.antecedentesMedicos || 'No especificado'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Antecedentes Quirúrgicos</label>
                  {isEditing ? (
                    <textarea
                      value={record.historiaMedica.antecedentesQuirurgicos}
                      onChange={(e) => updateMedicalHistory('antecedentesQuirurgicos', e.target.value)}
                      className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  ) : (
                    <p className="px-3 py-2 bg-gray-50 rounded-md">{record.historiaMedica.antecedentesQuirurgicos || 'No especificado'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Antecedentes Familiares</label>
                  {isEditing ? (
                    <textarea
                      value={record.historiaMedica.antecedentesFamiliares}
                      onChange={(e) => updateMedicalHistory('antecedentesFamiliares', e.target.value)}
                      className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  ) : (
                    <p className="px-3 py-2 bg-gray-50 rounded-md">{record.historiaMedica.antecedentesFamiliares || 'No especificado'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hábitos</label>
                  {isEditing ? (
                    <textarea
                      value={record.historiaMedica.habitos}
                      onChange={(e) => updateMedicalHistory('habitos', e.target.value)}
                      className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  ) : (
                    <p className="px-3 py-2 bg-gray-50 rounded-md">{record.historiaMedica.habitos || 'No especificado'}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'examination' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Stethoscope className="h-5 w-5 mr-2 text-blue-600" />
                Examen Físico
              </h3>
              {isEditing ? (
                <textarea
                  value={record.examenFisico}
                  onChange={(e) => updateRecord('examenFisico', e.target.value)}
                  className="w-full h-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Describe los hallazgos del examen físico..."
                />
              ) : (
                <div className="px-4 py-3 bg-gray-50 rounded-md">
                  <p className="text-gray-800">{record.examenFisico || 'No especificado'}</p>
                </div>
              )}
            </div>
          )}

          {activeSection === 'diagnosis' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <PrescriptionBottle className="h-5 w-5 mr-2 text-blue-600" />
                Diagnóstico y Tratamiento
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diagnóstico</label>
                  {isEditing ? (
                    <textarea
                      value={record.diagnostico}
                      onChange={(e) => updateRecord('diagnostico', e.target.value)}
                      className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Diagnóstico preliminar o definitivo..."
                    />
                  ) : (
                    <p className="px-3 py-2 bg-gray-50 rounded-md">{record.diagnostico || 'No especificado'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan de Tratamiento</label>
                  {isEditing ? (
                    <textarea
                      value={record.planTratamiento}
                      onChange={(e) => updateRecord('planTratamiento', e.target.value)}
                      className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Plan de tratamiento, medicamentos, seguimiento..."
                    />
                  ) : (
                    <p className="px-3 py-2 bg-gray-50 rounded-md">{record.planTratamiento || 'No especificado'}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-900 mb-2">Resumen de Historia Clínica</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-blue-800">Paciente:</span>
            <p className="text-blue-700">{record.datosPaciente.nombre}</p>
          </div>
          <div>
            <span className="font-medium text-blue-800">Edad:</span>
            <p className="text-blue-700">{record.datosPaciente.edad} años</p>
          </div>
          <div>
            <span className="font-medium text-blue-800">HC:</span>
            <p className="text-blue-700 font-mono">{record.datosPaciente.numeroHistoriaClinica}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => {
            localStorage.setItem(`clinical-record-${record.datosPaciente.numeroHistoriaClinica}`, JSON.stringify(record));
            alert('Historia clínica guardada exitosamente');
          }}
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
        >
          <Save className="h-5 w-5 mr-2" />
          Guardar Historia Clínica
        </button>
      </div>
    </div>
  );
};

export default ClinicalRecordForm;