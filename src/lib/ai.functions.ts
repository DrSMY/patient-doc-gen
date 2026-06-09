import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const MODEL = "google/gemini-3-flash-preview";

function getProvider() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key);
}

function extractJson(raw: string): any {
  if (!raw) return null;
  let text = raw.trim();
  // strip markdown code fences
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  // grab first {...} or [...] block if extra prose is present
  const objMatch = text.match(/[{[][\s\S]*[}\]]/);
  if (objMatch) text = objMatch[0];
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function generateJson(prompt: string): Promise<any> {
  const gateway = getProvider();
  const { text } = await generateText({
    model: gateway(MODEL),
    prompt,
  });
  return extractJson(text);
}

export const enhanceText = createServerFn({ method: "POST" })
  .inputValidator((input: { text: string; context: string }) => input)
  .handler(async ({ data }) => {
    if (!data.text || data.text.trim().length === 0) return { text: "" };
    const gateway = getProvider();
    const { text } = await generateText({
      model: gateway(MODEL),
      prompt: `You are a professional copywriter and document editor.
Task: Improve the following text to be more professional, concise, and impactful.
Context: This is for a ${data.context}.
Original Text: "${data.text}"

Return ONLY the improved text. Do not add quotes or explanations.`,
    });
    return { text: text.trim() || data.text };
  });

export const parsePrescription = createServerFn({ method: "POST" })
  .inputValidator((input: { text: string }) => input)
  .handler(async ({ data }) => {
    if (!data.text || data.text.trim().length === 0) return null;
    return generateJson(`Extract full prescription details from the text below.
Return ONLY a JSON object (no markdown, no commentary) with these keys, using an empty string for any field not found:
{
  "clinicName": "", "doctorName": "", "doctorTitle": "", "doctorRegNo": "",
  "patientName": "", "patientDob": "", "patientGender": "", "date": "", "notes": "",
  "medications": [{ "name": "", "dosage": "", "instructions": "", "quantity": "x1" }]
}
If a date of birth (DOB) is found, CALCULATE the age in years as of today and return ONLY the numeric age string (e.g. "40") in patientDob. If only an age is found, return just the number.

Input Text: "${data.text}"`);
  });

export const parseMedications = createServerFn({ method: "POST" })
  .inputValidator((input: { text: string }) => input)
  .handler(async ({ data }) => {
    if (!data.text || data.text.trim().length === 0) return { medications: [] };
    const result = await generateJson(`Extract medication details from the following text.
Return ONLY a JSON array (no markdown, no commentary). Each item: { "name": "", "dosage": "", "instructions": "", "quantity": "x1" }.
dosage is the strength (e.g. "500 mg"); instructions is frequency/usage; quantity defaults to "x1" when not found.

Input Text: "${data.text}"`);
    const medications = Array.isArray(result)
      ? result
      : Array.isArray(result?.medications)
        ? result.medications
        : [];
    return { medications };
  });

export const parseMedicalReport = createServerFn({ method: "POST" })
  .inputValidator((input: { text: string }) => input)
  .handler(async ({ data }) => {
    if (!data.text || data.text.trim().length === 0) return null;
    return generateJson(`Extract medical report details from the text below.
Return ONLY a JSON object (no markdown, no commentary) with these keys, using an empty string for any field not found:
{
  "reportDate": "", "attendingPhysician": "", "consultationDate": "",
  "patientName": "", "patientGender": "", "patientDob": "",
  "height": "", "weight": "", "bmi": "", "weightLossGoal": "",
  "clinicalSummary": "", "clinicalFlags": "", "assessment": "", "treatmentPlan": "",
  "prognosis": "", "physicianNotes": "",
  "footerDoctorName": "", "footerDoctorTitle": "", "footerLocation": ""
}
If a date of birth (DOB) is found, CALCULATE the age in years as of today and return ONLY the numeric age string in patientDob. If only an age is found, return just the number.

Input Text: "${data.text}"`);
  });
