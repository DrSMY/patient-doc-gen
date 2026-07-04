import { useState } from "react";
import { KeyRound, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Self-service password change for the signed-in user.
 * Renders a trigger button that opens a small modal.
 */
export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setDone(true);
    setPassword("");
    setConfirm("");
  };

  const close = () => {
    setOpen(false);
    setError(null);
    setDone(false);
    setPassword("");
    setConfirm("");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Change password"
        className="flex items-center gap-1.5 rounded-xl border border-[#E5E3DD] bg-white px-3 py-2 text-xs font-bold uppercase tracking-widest text-[#173B3D] transition-all hover:bg-[#f8efe1]"
      >
        <KeyRound className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#E5E3DD] bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold text-[#173B3D]">
                <KeyRound className="h-4 w-4" /> Change password
              </h2>
              <button
                onClick={close}
                className="rounded-lg p-1 text-[#6B7575] hover:bg-[#f8efe1]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {done ? (
              <div className="space-y-4">
                <p className="text-sm text-green-700">
                  Your password has been updated.
                </p>
                <button
                  onClick={close}
                  className="w-full rounded-xl bg-[#173B3D] px-4 py-2 text-sm font-bold text-white hover:bg-[#0f2a2b]"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#6B7575]">
                    New password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-[#E5E3DD] px-3 py-2 text-sm outline-none focus:border-[#173B3D]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#6B7575]">
                    Confirm new password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full rounded-xl border border-[#E5E3DD] px-3 py-2 text-sm outline-none focus:border-[#173B3D]"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#173B3D] px-4 py-2 text-sm font-bold text-white hover:bg-[#0f2a2b] disabled:opacity-50"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Update password
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
