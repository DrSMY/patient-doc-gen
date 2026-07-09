import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Pill, ClipboardList, FileText, Send } from "lucide-react";

const REQUEST_LINK = "https://patient-doc-gen.lovable.app/request";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DocuGenie — Prescription & Medical Report Creator" },
      {
        name: "description",
        content:
          "Create professional prescriptions and medical reports with live preview and instant PDF or PNG export.",
      },
      {
        property: "og:title",
        content: "DocuGenie — Prescription & Medical Report Creator",
      },
      {
        property: "og:description",
        content:
          "Create professional prescriptions and medical reports with live preview and instant PDF or PNG export.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const [waNumber, setWaNumber] = useState("+971561729928");

  const shareWhatsApp = () => {
    const digits = waNumber.replace(/[^\d]/g, "");
    const message = `Kindly put your name, age, and gender as per your passport in order to receive your prescription in the right format. Once you provide this information the team will be able to send you your prescription copy.\n\n${REQUEST_LINK}`;
    const url = digits
      ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#fcfbf8] text-[#173B3D]">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-6 w-6 text-[#173B3D]" />
          <span className="text-sm font-black uppercase tracking-[0.25em] text-[#6B7575]">
            DocuGenie
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-light tracking-tight">
          Clinical document creator
        </h1>
        <p className="mt-4 max-w-xl text-[#6B7575]">
          Build polished prescriptions and medical reports with a live A4
          preview, reusable signatures &amp; stamps, AI auto-fill, and one-click
          PDF / PNG export.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/prescription"
            className="group rounded-3xl border border-[#E5E3DD] bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f8efe1] text-[#173B3D]">
              <Pill className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Prescription</h2>
            <p className="mt-2 text-sm text-[#6B7575]">
              Medications, dosage, eRx ID, clinical notes and a built-in
              medication library.
            </p>
            <span className="mt-5 inline-block text-xs font-black uppercase tracking-widest text-[#173B3D] group-hover:underline">
              Create prescription →
            </span>
          </Link>

          <Link
            to="/medical-report"
            className="group rounded-3xl border border-[#E5E3DD] bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f8efe1] text-[#173B3D]">
              <ClipboardList className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Medical Report</h2>
            <p className="mt-2 text-sm text-[#6B7575]">
              Patient vitals, clinical summary, assessment, treatment plan and
              prognosis.
            </p>
            <span className="mt-5 inline-block text-xs font-black uppercase tracking-widest text-[#173B3D] group-hover:underline">
              Create report →
            </span>
          </Link>

          <div className="group flex flex-col rounded-3xl border border-[#E5E3DD] bg-white p-8 shadow-sm">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f8efe1] text-[#173B3D]">
              <Send className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              Send WhatsApp link
            </h2>
            <p className="mt-2 text-sm text-[#6B7575]">
              Share the client request link on WhatsApp so patients can submit
              their details for a prescription.
            </p>
            <div className="mt-5 space-y-3">
              <input
                type="tel"
                value={waNumber}
                onChange={(e) => setWaNumber(e.target.value)}
                placeholder="+9715XXXXXXXX"
                className="w-full rounded-xl border border-[#E5E3DD] bg-[#fcfbf8] px-4 py-2.5 text-sm text-[#173B3D] outline-none focus:border-[#173B3D]"
              />
              <button
                type="button"
                onClick={shareWhatsApp}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#173B3D] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0f2b2d]"
              >
                <Send className="h-4 w-4" /> Share on WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
