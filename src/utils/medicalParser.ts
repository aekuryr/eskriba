import { ClinicalRecord, PatientData, MedicalHistory } from '../types/medical';

export class MedicalTextParser {
  public static parseClinicalRecord(transcription: string): ClinicalRecord {
    const cleanText = transcription.toLowerCase().trim();
    
    return {
      datosPaciente: this.extractPatientData(cleanText),
      motivoConsulta: this.extractSection(cleanText, 'motivo de consulta') || '',
      historiaMedica: this.extractMedicalHistory(cleanText),
      examenFisico: this.extractSection(cleanText, 'examen físico') || '',
      diagnostico: this.extractSection(cleanText, 'diagnóstico') || '',
      planTratamiento: this.extractSection(cleanText, 'plan de tratamiento') || this.extractSection(cleanText, 'tratamiento') || '',
      fechaGeneracion: new Date().toLocaleDateString('es-ES')
    };
  }

  private static extractPatientData(text: string): PatientData {
    return {
      nombre: this.extractPattern(text, /(?:paciente|nombre)(?:\s+de\s+nombre|\s+llamad[oa]|\s+es)?\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)/i) || '',
      edad: parseInt(this.extractPattern(text, /(\d+)\s+años?/i) || '0'),
      genero: this.normalizeGender(this.extractPattern(text, /(masculino|femenino|hombre|mujer)/i) || ''),
      fechaNacimiento: this.extractPattern(text, /(?:nacid[oa]|fecha de nacimiento)(?:\s+el)?\s+(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})/i) || '',
      numeroHistoriaClinica: `HC-${Date.now().toString().slice(-6)}`
    };
  }

  private static extractMedicalHistory(text: string): MedicalHistory {
    return {
      antecedentesMedicos: this.extractSection(text, 'antecedentes médicos') || '',
      antecedentesQuirurgicos: this.extractSection(text, 'antecedentes quirúrgicos') || '',
      antecedentesFamiliares: this.extractSection(text, 'antecedentes familiares') || '',
      habitos: this.extractSection(text, 'hábitos') || ''
    };
  }

  private static extractSection(text: string, sectionName: string): string | null {
    const pattern = new RegExp(`${sectionName}[:\\-]?\\s*(.*?)(?=antecedentes|examen|diagnóstico|plan|tratamiento|$)`, 'is');
    const match = text.match(pattern);
    return match ? match[1].trim() : null;
  }

  private static extractPattern(text: string, pattern: RegExp): string | null {
    const match = text.match(pattern);
    return match ? match[1].trim() : null;
  }

  private static normalizeGender(gender: string): string {
    const g = gender.toLowerCase();
    if (g.includes('masculino') || g.includes('hombre')) return 'Masculino';
    if (g.includes('femenino') || g.includes('mujer')) return 'Femenino';
    return gender;
  }
}

export const medicalParser = MedicalTextParser;