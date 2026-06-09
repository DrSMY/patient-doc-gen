import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const MODEL = "google/gemini-3-flash-preview";

function getProvider() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key);
}

const medicationSchema = z.object({
  name: z.string(),
  dosage: z.string(),
  instructions: z.string(),
  quantity: z.string(),
});

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
    const gateway = getProvider();
    const { output } = await generateText({
      model: gateway(MODEL),
      output: Output.object({
        schema: z.object({
          clinicName: z.string(),
          doctorName: z.string(),
          doctorTitle: z.string(),
          doctorRegNo: z.string(),
          patientName: z.string(),
          patientDob: z.string(),
          patientGender: z.string(),
          date: z.string(),
          notes: z.string(),
          medications: z.array(medicationSchema),
        }),
      }),
      prompt: `Extract full prescription details from the text.
For every field that is not found, use an empty string.
If a date of birth (DOB) is found, CALCULATE the age in years as of today and return ONLY the numeric age string (e.g. "40") in patientDob. If only an age is found, extract just the number.

Input Text: "${data.text}"`,
    });
    return output;
  });

export const parseMedications = createServerFn({ method: "POST" })
  .inputValidator((input: { text: string }) => input)
  .handler(async ({ data }) => {
    if (!data.text || data.text.trim().length === 0) return { medications: [] };
    const gateway = getProvider();
    const { output } = await generateText({
      model: gateway(MODEL),
      output: Output.object({
        schema: z.object({ medications: z.array(medicationSchema) }),
      }),
      prompt: `Extract medication details from the following text.
For each medication return name, dosage (strength e.g. "500 mg"), instructions (frequency/usage), and quantity (e.g. "x1"). Use empty strings or "x1" when not found.

Input Text: "${data.text}"`,
    });
    return output;
  });

export const parseMedicalReport = createServerFn({ method: "POST" })
  .inputValidator((input: { text: string }) => input)
  .handler(async ({ data }) => {
    if (!data.text || data.text.trim().length === 0) return null;
    const gateway = getProvider();
    const { output } = await generateText({
      model: gateway(MODEL),
      output: Output.object({
        schema: z.object({
          reportDate: z.string(),
          attendingPhysician: z.string(),
          consultationDate: z.string(),
          patientName: z.string(),
          patientGender: z.string(),
          patientDob: z.string(),
          height: z.string(),
          weight: z.string(),
          bmi: z.string(),
          weightLossGoal: z.string(),
          clinicalSummary: z.string(),
          clinicalFlags: z.string(),
          assessment: z.string(),
          treatmentPlan: z.string(),
          prognosis: z.string(),
          physicianNotes: z.string(),
          footerDoctorName: z.string(),
          footerDoctorTitle: z.string(),
          footerLocation: z.string(),
        }),
      }),
      prompt: `Extract medical report details from the text.
For every field that is not found, use an empty string.
If a date of birth (DOB) is found, CALCULATE the age in years as of today and return ONLY the numeric age string in patientDob. If only an age is found, extract just the number.

Input Text: "${data.text}"`,
    });
    return output;
  });
