import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PrescriptionForm } from "@/components/prescription/PrescriptionForm";
import { PrescriptionPreview } from "@/components/prescription/PrescriptionPreview";
import { EditorLayout, useLocalStorageList } from "@/components/EditorLayout";
import type { PrescriptionData } from "@/lib/types";
import { getFormattedDate } from "@/lib/dateUtils";

export const Route = createFileRoute("/prescription")({
  head: () => ({
    meta: [
      { title: "Prescription Creator — DocuGenie" },
      {
        name: "description",
        content:
          "Create a professional prescription with medications, dosage, eRx ID and instant PDF or PNG export.",
      },
      { property: "og:title", content: "Prescription Creator — DocuGenie" },
      {
        property: "og:description",
        content:
          "Create a professional prescription with medications, dosage, eRx ID and instant PDF or PNG export.",
      },
    ],
  }),
  component: PrescriptionPage,
});

const now = new Date();
const INITIAL_PRESCRIPTION: PrescriptionData = {
  clinicName: "DARDOC HEALTH SERVICES L.L.C",
  doctorName: "Dr. Sami M. Yesuf",
  doctorTitle: "Senior General Practitioner/Medical Director",
  doctorRegNo: "LICENCE 00221713",
  patientName: "DarDoc Pharmacy stock",
  patientDob: "00",
  patientGender: "Other",
  date: getFormattedDate(),
  erxIdSerial: "00001",
  erxIdMonth: String(now.getMonth() + 1).padStart(2, "0"),
  erxIdYear: now.getFullYear().toString().slice(-2),
  medications: [
    { id: "1", name: "GHK-Cu", dosage: "10 mg/ml · 5 ml vial", quantity: "x1", instructions: "" },
    { id: "2", name: "BPC-157", dosage: "2000 mcg/ml · 5 ml vial", quantity: "x1", instructions: "" },
  ],
  notes: "",
  warnings: "",
  footerNote: "",
  signature: undefined,
  stamp: undefined,
  logo: undefined,
};

function PrescriptionPage() {
  const [data, setData] = useState<PrescriptionData>(INITIAL_PRESCRIPTION);
  const [savedSignatures, setSavedSignatures] = useLocalStorageList("docgenie_signatures");
  const [savedStamps, setSavedStamps] = useLocalStorageList("docgenie_stamps");
  const [savedLogos, setSavedLogos] = useLocalStorageList("docgenie_logos");

  return (
    <EditorLayout
      title="Prescription"
      previewId="prescription-preview"
      fileName={`prescription-${data.patientName || "document"}`}
      form={
        <PrescriptionForm
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
      preview={<PrescriptionPreview data={data} id="prescription-preview" />}
    />
  );
}
