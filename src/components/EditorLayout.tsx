import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, ImageIcon, ArrowLeft, Loader2 } from "lucide-react";
import { generatePDF, generatePNG } from "@/lib/pdfService";

export function useLocalStorageList(key: string) {
  const [list, setList] = useState<string[]>([]);
  useEffect(() => {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setList(JSON.parse(saved));
      } catch {
        /* ignore */
      }
    }
  }, [key]);
  const update = (next: string[]) => {
    setList(next);
    localStorage.setItem(key, JSON.stringify(next));
  };
  return [list, update] as const;
}

export function useLocalStorageString(key: string) {
  const [value, setValue] = useState<string | undefined>(undefined);
  useEffect(() => {
    const saved = localStorage.getItem(key);
    if (saved) setValue(saved);
  }, [key]);
  const update = (next: string | undefined) => {
    setValue(next);
    if (next) localStorage.setItem(key, next);
    else localStorage.removeItem(key);
  };
  return [value, update] as const;
}

interface EditorLayoutProps {
  title: string;
  previewId: string;
  fileName: string;
  form: React.ReactNode;
  preview: React.ReactNode;
}

export function EditorLayout({
  title,
  previewId,
  fileName,
  form,
  preview,
}: EditorLayoutProps) {
  const [busy, setBusy] = useState<null | "pdf" | "png">(null);

  const handlePdf = async () => {
    setBusy("pdf");
    try {
      await generatePDF(previewId, fileName);
    } finally {
      setBusy(null);
    }
  };
  const handlePng = async () => {
    setBusy("png");
    try {
      await generatePNG(previewId, fileName);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfbf8] text-[#173B3D]">
      <header className="sticky top-0 z-30 border-b border-[#E5E3DD] bg-[#fcfbf8]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-3">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#6B7575] hover:text-[#173B3D]"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            <h1 className="text-base font-bold tracking-tight">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePng}
              disabled={busy !== null}
              className="flex items-center gap-2 rounded-xl border border-[#E5E3DD] bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#173B3D] transition-all hover:bg-[#f8efe1] disabled:opacity-50"
            >
              {busy === "png" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
              PNG
            </button>
            <button
              onClick={handlePdf}
              disabled={busy !== null}
              className="flex items-center gap-2 rounded-xl bg-[#173B3D] px-4 py-2 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-[#0f2a2b] disabled:opacity-50"
            >
              {busy === "pdf" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              PDF
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-8 px-5 py-8 lg:grid-cols-[minmax(0,560px)_1fr]">
        <div className="min-w-0">{form}</div>
        <div className="min-w-0">
          <div className="lg:sticky lg:top-20">
            <div className="overflow-auto rounded-2xl border border-[#E5E3DD] bg-[#e9e6df] p-4 shadow-inner">
              <div className="mx-auto w-fit origin-top scale-[0.62] sm:scale-75 lg:scale-[0.68] xl:scale-[0.82]">
                {preview}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
