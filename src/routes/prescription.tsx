import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { PrescriptionForm } from "@/components/prescription/PrescriptionForm";
import { PrescriptionPreview } from "@/components/prescription/PrescriptionPreview";
import { EditorLayout, useLocalStorageList } from "@/components/EditorLayout";
import { useCloudAssetSync } from "@/hooks/useCloudSync";
import {
  saveDownloadedPrescription,
  listRequests,
  getRequest,
  setRequestStatus,
} from "@/lib/cloud.functions";
import type { PrescriptionData } from "@/lib/types";
import { getFormattedDate } from "@/lib/dateUtils";
import { Inbox, ChevronDown, ChevronUp } from "lucide-react";

export const Route = createFileRoute("/prescription")({
  validateSearch: (search: Record<string, unknown>) => ({
    request: typeof search.request === "string" ? search.request : undefined,
  }),
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

interface RequestRow {
  id: string;
  patient_name: string;
  patient_age: string;
  patient_gender: string;
  product: string;
  dose: string;
  quantity: string;
  instructions: string;
  status: string;
  created_at: string;
}


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
  const navigate = useNavigate();
  const { request: requestParam } = Route.useSearch();
  const [data, setData] = useState<PrescriptionData>(INITIAL_PRESCRIPTION);
  const [savedSignatures, setSavedSignatures] = useLocalStorageList("docgenie_signatures");
  const [savedStamps, setSavedStamps] = useLocalStorageList("docgenie_stamps");
  const [savedLogos, setSavedLogos] = useLocalStorageList("docgenie_logos");

  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [panelOpen, setPanelOpen] = useState(true);
  const currentRequestId = useRef<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      const res = await listRequests();
      setRequests((res.requests as RequestRow[]) ?? []);
    } catch {
      /* not signed in or no access; ignore */
    }
  }, []);
  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const applyRequest = useCallback((r: RequestRow) => {
    currentRequestId.current = r.id;
    setData((d) => ({
      ...d,
      patientName: r.patient_name || d.patientName,
      patientDob: r.patient_age || d.patientDob,
      patientGender: r.patient_gender || d.patientGender,
      medications: [
        {
          id: Date.now().toString(),
          name: r.product,
          dosage: r.dose,
          quantity: r.quantity,
          instructions: r.instructions,
        },
      ],
    }));
  }, []);

  // One-click prefill from the Admin "Open in creator" button (?request=<id>).
  const prefilledParam = useRef(false);
  useEffect(() => {
    if (prefilledParam.current || !requestParam) return;
    prefilledParam.current = true;
    getRequest({ data: { id: requestParam } })
      .then((res) => {
        if (res.request) applyRequest(res.request as RequestRow);
      })
      .catch(() => {})
      .finally(() => navigate({ to: "/prescription", search: {}, replace: true }));
  }, [requestParam, applyRequest, navigate]);


  // Restore the last-used active logo/signature/stamp on mount.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const logo = localStorage.getItem("docgenie_active_logo") || undefined;
    const signature = localStorage.getItem("docgenie_active_signature") || undefined;
    const stamp = localStorage.getItem("docgenie_active_stamp") || undefined;
    const erxSerial = localStorage.getItem("docgenie_erx_serial") || undefined;
    if (logo || signature || stamp || erxSerial) {
      setData((d) => ({
        ...d,
        logo: logo ?? d.logo,
        signature: signature ?? d.signature,
        stamp: stamp ?? d.stamp,
        erxIdSerial: erxSerial ?? d.erxIdSerial,
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

  // Persist the eRx serial so it keeps incrementing across sessions.
  useEffect(() => {
    if (!restored.current) return;
    if (data.erxIdSerial) localStorage.setItem("docgenie_erx_serial", data.erxIdSerial);
  }, [data.erxIdSerial]);

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
    // If this prescription came from a client request, mark it handled.
    if (currentRequestId.current) {
      const id = currentRequestId.current;
      currentRequestId.current = null;
      setRequestStatus({ data: { id, status: "handled" } })
        .then(loadRequests)
        .catch(() => {});
    }
    // Advance the eRx serial for the next prescription (00001 -> 00002).
    setData((d) => {
      const next = (parseInt(d.erxIdSerial || "0", 10) + 1)
        .toString()
        .padStart(5, "0");
      return { ...d, erxIdSerial: next };
    });
  }, [data, erxLabel, loadRequests]);

  const pending = requests.filter((r) => r.status !== "handled");
  const requestsPanel = (
    <div className="mb-4 rounded-2xl border border-[#E5E3DD] bg-white">
      <button
        type="button"
        onClick={() => setPanelOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-[#173B3D]">
          <Inbox className="h-4 w-4" /> Incoming requests
          {pending.length > 0 && (
            <span className="rounded-full bg-amber-400 px-1.5 text-[10px] font-black text-[#173B3D]">
              {pending.length}
            </span>
          )}
        </span>
        {panelOpen ? (
          <ChevronUp className="h-4 w-4 text-[#6B7575]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[#6B7575]" />
        )}
      </button>
      {panelOpen && (
        <div className="max-h-64 overflow-y-auto border-t border-[#F0EEE8]">
          {pending.length === 0 ? (
            <p className="px-4 py-4 text-xs text-[#6B7575]">
              No pending client requests.
            </p>
          ) : (
            pending.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => applyRequest(r)}
                className="flex w-full items-center justify-between gap-3 border-b border-[#F0EEE8] px-4 py-3 text-left hover:bg-[#f8efe1]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[#173B3D]">
                    {r.patient_name || "Unnamed"}{" "}
                    <span className="font-normal text-[#6B7575]">
                      · {r.patient_age} · {r.patient_gender}
                    </span>
                  </span>
                  <span className="block truncate text-xs text-[#6B7575]">
                    {r.product} · {r.dose}
                  </span>
                </span>
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-[#173B3D]">
                  Load →
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );


  return (
    <EditorLayout
      title="Prescription"
      previewId="prescription-preview"
      fileName={fileName}
      onDownload={handleDownload}
      form={
        <>
          {requestsPanel}
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
        </>
      }

      preview={<PrescriptionPreview data={data} id="prescription-preview" />}
    />
  );
}
