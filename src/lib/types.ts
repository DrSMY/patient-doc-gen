export interface PrescriptionMedication {
  id: string;
  name: string;
  dosage: string;
  instructions: string;
  quantity?: string;
}

export interface PrescriptionData {
  clinicName: string;
  doctorName: string;
  doctorTitle: string;
  doctorRegNo: string;

  patientName: string;
  patientDob: string;
  patientGender: string;
  date: string;

  erxIdSerial: string;
  erxIdMonth: string;
  erxIdYear: string;

  medications: PrescriptionMedication[];
  notes: string;
  warnings: string;
  footerNote: string;
  signature?: string;
  stamp?: string;
  logo?: string;
  showDispensedStamp?: boolean;
}

export interface MedicalReportData {
  reportDate: string;
  attendingPhysician: string;
  consultationDate: string;

  patientName: string;
  patientGender: string;
  patientDob: string;

  height: string;
  weight: string;
  bmi: string;
  weightLossGoal: string;

  clinicalSummary: string;
  clinicalFlags: string;
  assessment: string;
  treatmentPlan: string;
  prognosis: string;
  physicianNotes: string;

  footerDoctorName: string;
  footerDoctorTitle: string;
  footerLocation: string;

  signature?: string;
  stamp?: string;
  logo?: string;
}

export interface AIAssistProps {
  currentText: string;
  onReplace: (newText: string) => void;
  context: string;
}
