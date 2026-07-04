import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { MedicalReportForm } from "@/components/medical-report/MedicalReportForm";
import { MedicalReportPreview } from "@/components/medical-report/MedicalReportPreview";
import { EditorLayout, useLocalStorageList } from "@/components/EditorLayout";
import { useCloudAssetSync } from "@/hooks/useCloudSync";
import type { MedicalReportData } from "@/lib/types";
import { getTodayDate } from "@/lib/dateUtils";

export const Route = createFileRoute("/medical-report")({
  head: () => ({
    meta: [
      { title: "Medical Report Creator — DocuGenie" },
      {
        name: "description",
        content:
          "Create a professional medical report with patient vitals, clinical summary, assessment and PDF or PNG export.",
      },
      { property: "og:title", content: "Medical Report Creator — DocuGenie" },
      {
        property: "og:description",
        content:
          "Create a professional medical report with patient vitals, clinical summary, assessment and PDF or PNG export.",
      },
    ],
  }),
  component: MedicalReportPage,
});

const INITIAL_MEDICAL_REPORT: MedicalReportData = {
  reportDate: getTodayDate(),
  attendingPhysician: "Dr. Sarah Connor",
  consultationDate: getTodayDate(),
  patientName: "DarDoc pharmacy Stock",
  patientGender: "other",
  patientDob: "00",
  height: "180 cm",
  weight: "75 kg",
  bmi: "23.1",
  weightLossGoal: "Maintain",
  clinicalSummary:
    "Patient presented with mild exhaustion. Vital signs within normal range.",
  clinicalFlags: "• Low hydration\n• Sleep deprivation",
  assessment: "General fatigue due to overwork.",
  treatmentPlan: "Recommended 8 hours of sleep and increased fluid intake.",
  prognosis: "Excellent with lifestyle modifications.",
  physicianNotes: "Follow up in 2 weeks.",
  footerDoctorName: "Dr. Sarah Connor",
  footerDoctorTitle: "Medical Director",
  footerLocation: "San Francisco, USA",
  signature: undefined,
  stamp: undefined,
  logo: undefined,
};

function MedicalReportPage() {
  const [data, setData] = useState<MedicalReportData>(INITIAL_MEDICAL_REPORT);
  const [savedSignatures, setSavedSignatures] = useLocalStorageList("docgenie_signatures");
  const [savedStamps, setSavedStamps] = useLocalStorageList("docgenie_stamps");
  const [savedLogos, setSavedLogos] = useLocalStorageList("docgenie_logos");

  // Restore the last-used active logo/signature/stamp on mount.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const logo = localStorage.getItem("docgenie_active_logo") || undefined;
    const signature = localStorage.getItem("docgenie_active_signature") || undefined;
    const stamp = localStorage.getItem("docgenie_active_stamp") || undefined;
    if (logo || signature || stamp) {
      setData((d) => ({
        ...d,
        logo: logo ?? d.logo,
        signature: signature ?? d.signature,
        stamp: stamp ?? d.stamp,
      }));
    }
  }, []);

  // Persist the active assets whenever they change.
  useEffect(() => {
    if (!restored.current) return;
    if (data.logo) localStorage.setItem("docgenie_active_logo", data.logo);
    else localStorage.removeItem("docgenie_active_logo");
    if (data.signature) localStorage.setItem("docgenie_active_signature", data.signature);
    else localStorage.removeItem("docgenie_active_signature");
    if (data.stamp) localStorage.setItem("docgenie_active_stamp", data.stamp);
    else localStorage.removeItem("docgenie_active_stamp");
  }, [data.logo, data.signature, data.stamp]);

  return (
    <EditorLayout
      title="Medical Report"
      previewId="medical-report-preview"
      fileName={`medical-report-${data.patientName || "document"}`}
      form={
        <MedicalReportForm
          data={data}
          onChange={setData}
          savedSignatures={savedSignatures}
          setSavedSignatures={setSavedSignatures}
          savedStamps={savedStamps}
          setSavedStamps={setSavedStamps}
          savedLogos={savedLogos}
          setSavedLogos={setSavedLogos}
        />
      }
      preview={<MedicalReportPreview data={data} id="medical-report-preview" />}
    />
  );
}
