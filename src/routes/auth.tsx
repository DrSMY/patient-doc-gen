import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Prescribe buddy" },
      {
        name: "description",
        content:
          "Sign in to keep your clinic logo, signature, stamp and medication database saved to your account across devices.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [user, loading, navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setInfo("Account created. You can now sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-[#fcfbf8] text-[#173B3D] flex flex-col">
      <header className="border-b border-[#E5E3DD] px-5 py-3">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#6B7575] hover:text-[#173B3D]"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm rounded-2xl border border-[#E5E3DD] bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <span className="text-sm font-black uppercase tracking-[0.2em] text-[#6B7575]">
              Prescribe buddy
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h1>
          <p className="mt-1 text-sm text-[#6B7575]">
            Keep your branding &amp; medications saved to your account.
          </p>

          <button
            onClick={handleGoogle}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-[#E5E3DD] bg-white px-4 py-2.5 text-sm font-bold text-[#173B3D] transition-all hover:bg-[#f8efe1]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
              <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.06L5.84 9.9C6.71 7.3 9.14 4.75 12 4.75z" />
            </svg>
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-[#6B7575]">
            <div className="h-px flex-1 bg-[#E5E3DD]" /> or <div className="h-px flex-1 bg-[#E5E3DD]" />
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[#E5E3DD] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#173B3D]"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[#E5E3DD] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#173B3D]"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            {info && <p className="text-sm text-green-700">{info}</p>}
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#173B3D] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#0f2a2b] disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setInfo(null);
            }}
            className="mt-4 w-full text-center text-xs font-semibold text-[#6B7575] hover:text-[#173B3D]"
          >
            {mode === "signin"
              ? "Don't have an account? Create one"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
