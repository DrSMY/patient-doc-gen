import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { PrescriptionForm } from "@/components/prescription/PrescriptionForm";
import { PrescriptionPreview } from "@/components/prescription/PrescriptionPreview";
import { EditorLayout, useLocalStorageList } from "@/components/EditorLayout";
import { useCloudAssetSync } from "@/hooks/useCloudSync";
import { saveDownloadedPrescription } from "@/lib/cloud.functions";
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
  showDispensedStamp: true,
};

function PrescriptionPage() {
  const [data, setData] = useState<PrescriptionData>(INITIAL_PRESCRIPTION);
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

  // Sync active logo/signature/stamp with the signed-in user's account.
  const applyAssets = useCallback(
    (next: { logo?: string; signature?: string; stamp?: string }) =>
      setData((d) => ({ ...d, ...next })),
    [],
  );
  useCloudAssetSync(
    { logo: data.logo, signature: data.signature, stamp: data.stamp },
    applyAssets,
  );
  const erxLabel = `Erx ${data.erxIdSerial}-${data.erxIdMonth}-${data.erxIdYear}`;
  const fileName = `${erxLabel}- ${data.patientName || "patient"}- prescription`;

  // On download: save the record to the database, then advance the eRx serial.
  const handleDownload = useCallback(async () => {
    try {
      await saveDownloadedPrescription({
        data: {
          erx: erxLabel,
          patient_name: data.patientName || "",
          patient_age: data.patientDob || "",
          patient_gender: data.patientGender || "",
          date_created: data.date || "",
          medications: data.medications.map((m) => ({
            name: m.name || "",
            dosage: m.dosage || "",
            instructions: m.instructions || "",
            quantity: m.quantity || "",
          })),
        },
      });
    } catch {
      /* saving is best-effort; do not block the download */
    }
    // Advance the eRx serial for the next prescription (00001 -> 00002).
    setData((d) => {
      const next = (parseInt(d.erxIdSerial || "0", 10) + 1)
        .toString()
        .padStart(5, "0");
      return { ...d, erxIdSerial: next };
    });
  }, [data, erxLabel]);

  return (
    <EditorLayout
      title="Prescription"
      previewId="prescription-preview"
      fileName={fileName}
      onDownload={handleDownload}
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
