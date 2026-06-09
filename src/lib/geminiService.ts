import {
  enhanceText as enhanceTextFn,
  parsePrescription as parsePrescriptionFn,
  parseMedications as parseMedicationsFn,
  parseMedicalReport as parseMedicalReportFn,
} from "./ai.functions";

export const enhanceText = async (
  text: string,
  context: string,
): Promise<string> => {
  if (!text || text.trim().length === 0) return "";
  try {
    const res = await enhanceTextFn({ data: { text, context } });
    return res?.text || text;
  } catch (error) {
    console.error("AI Error (enhanceText):", error);
    return text;
  }
};

export const parsePrescription = async (text: string): Promise<any> => {
  if (!text || text.trim().length === 0) return null;
  return parsePrescriptionFn({ data: { text } });
};

export const parseMedications = async (text: string): Promise<any[]> => {
  if (!text || text.trim().length === 0) return [];
  const res = await parseMedicationsFn({ data: { text } });
  return res?.medications || [];
};

export const parseMedicalReport = async (text: string): Promise<any> => {
  if (!text || text.trim().length === 0) return null;
  return parseMedicalReportFn({ data: { text } });
};
