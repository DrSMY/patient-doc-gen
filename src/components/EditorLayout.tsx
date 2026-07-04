import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Download,
  ImageIcon,
  ArrowLeft,
  Loader2,
  LogIn,
  LogOut,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { useEffect } from "react";
import { generatePDF, generatePNG } from "@/lib/pdfService";
import { useMyStatus } from "@/hooks/useMyStatus";
import { supabase } from "@/integrations/supabase/client";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";

function AccountControl({ isAdmin }: { isAdmin?: boolean }) {
  const { user, loading } = useMyStatus();
  if (loading) return null;
  if (!user) {
    return (
      <Link
        to="/auth"
        className="flex items-center gap-1.5 rounded-xl border border-[#E5E3DD] bg-white px-3 py-2 text-xs font-bold uppercase tracking-widest text-[#173B3D] transition-all hover:bg-[#f8efe1]"
      >
        <LogIn className="h-4 w-4" /> Sign in
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-2">
      {isAdmin && (
        <Link
          to="/admin"
          className="flex items-center gap-1.5 rounded-xl border border-[#173B3D] bg-[#173B3D] px-3 py-2 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-[#0f2a2b]"
        >
          <ShieldCheck className="h-4 w-4" /> Admin
        </Link>
      )}
      <span className="hidden max-w-[160px] truncate text-xs font-semibold text-[#6B7575] sm:inline">
        {user.email}
      </span>
      <ChangePasswordDialog />
      <button
        onClick={() => supabase.auth.signOut()}
        title="Sign out"
        className="flex items-center gap-1.5 rounded-xl border border-[#E5E3DD] bg-white px-3 py-2 text-xs font-bold uppercase tracking-widest text-[#173B3D] transition-all hover:bg-[#f8efe1]"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

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
  /** Called after a successful PDF/PNG download (e.g. to save + increment eRx). */
  onDownload?: () => Promise<void> | void;
}

function GateScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fcfbf8] text-[#173B3D]">
      <header className="border-b border-[#E5E3DD] px-5 py-3">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#6B7575] hover:text-[#173B3D]"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-5 py-20">
        <div className="w-full max-w-md rounded-2xl border border-[#E5E3DD] bg-white p-8 text-center shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

export function EditorLayout({
  title,
  previewId,
  fileName,
  form,
  preview,
  onDownload,
}: EditorLayoutProps) {
  const [busy, setBusy] = useState<null | "pdf" | "png">(null);
  const { user, status, loading } = useMyStatus();

  const handlePdf = async () => {
    setBusy("pdf");
    try {
      await generatePDF(previewId, fileName);
      await onDownload?.();
    } finally {
      setBusy(null);
    }
  };
  const handlePng = async () => {
    setBusy("png");
    try {
      await generatePNG(previewId, fileName);
      await onDownload?.();
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fcfbf8]">
        <Loader2 className="h-6 w-6 animate-spin text-[#173B3D]" />
      </div>
    );
  }

  if (!user) {
    return (
      <GateScreen>
        <LogIn className="mx-auto mb-4 h-8 w-8 text-[#173B3D]" />
        <h1 className="text-xl font-bold">Sign in required</h1>
        <p className="mt-2 text-sm text-[#6B7575]">
          Please sign in to create and download prescriptions.
        </p>
        <Link
          to="/auth"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#173B3D] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0f2a2b]"
        >
          <LogIn className="h-4 w-4" /> Sign in
        </Link>
      </GateScreen>
    );
  }

  if (status && !status.approved) {
    return (
      <GateScreen>
        <Clock className="mx-auto mb-4 h-8 w-8 text-[#173B3D]" />
        <h1 className="text-xl font-bold">Waiting for approval</h1>
        <p className="mt-2 text-sm text-[#6B7575]">
          Your account (<span className="font-semibold">{user.email}</span>) is
          pending admin approval. You&apos;ll be able to create prescriptions
          once an administrator approves your access.
        </p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[#E5E3DD] bg-white px-5 py-2.5 text-sm font-bold text-[#173B3D] hover:bg-[#f8efe1]"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </GateScreen>
    );
  }

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
            <AccountControl isAdmin={status?.isAdmin} />
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
