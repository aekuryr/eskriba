export interface PatientData {
  nombre: string;
  edad: number;
  genero: string;
  fechaNacimiento: string;
  numeroHistoriaClinica: string;
}

export interface MedicalHistory {
  antecedentesMedicos: string;
  antecedentesQuirurgicos: string;
  antecedentesFamiliares: string;
  habitos: string;
}

export interface ClinicalRecord {
  datosPaciente: PatientData;
  motivoConsulta: string;
  historiaMedica: MedicalHistory;
  examenFisico: string;
  diagnostico: string;
  planTratamiento: string;
  fechaGeneracion: string;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
}