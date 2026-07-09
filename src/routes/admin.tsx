import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Check,
  X,
  Trash2,
  UserPlus,
  Users,
  FileText,
  Download,
  KeyRound,
  Inbox,
  Send,
  ExternalLink,
} from "lucide-react";
import { useMyStatus } from "@/hooks/useMyStatus";
import { supabase } from "@/integrations/supabase/client";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import {
  adminListUsers,
  adminSetApproval,
  adminCreateUser,
  adminDeleteUser,
  adminListPrescriptions,
  adminSetUserPassword,
  listRequests,
  setRequestStatus,
  adminDeleteRequest,
} from "@/lib/cloud.functions";


export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Prescribe buddy" },
      { name: "description", content: "Manage users and prescription records." },
    ],
  }),
  component: AdminPage,
});

interface AdminUser {
  id: string;
  email: string | null;
  approved: boolean;
  created_at: string;
  isAdmin: boolean;
}

interface AdminRx {
  id: string;
  erx: string;
  patient_name: string;
  patient_age: string;
  patient_gender: string;
  date_created: string;
  medications: Array<{
    name?: string;
    dosage?: string;
    instructions?: string;
    quantity?: string;
  }>;
  created_at: string;
  doctor_email: string | null;
}

interface AdminRequest {
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

function AdminPage() {
  const navigate = useNavigate();
  const { user, status, loading } = useMyStatus();
  const [tab, setTab] = useState<"users" | "records" | "requests">("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [records, setRecords] = useState<AdminRx[]>([]);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waNumber, setWaNumber] = useState("+971561729928");


  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (status && !status.isAdmin) {
      navigate({ to: "/" });
    }
  }, [user, status, loading, navigate]);

  const refresh = useCallback(async () => {
    setDataLoading(true);
    try {
      const [u, r, q] = await Promise.all([
        adminListUsers(),
        adminListPrescriptions(),
        listRequests(),
      ]);
      setUsers((u.users as AdminUser[]) ?? []);
      setRecords((r.prescriptions as AdminRx[]) ?? []);
      setRequests((q.requests as AdminRequest[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data.");
    } finally {
      setDataLoading(false);
    }

  }, []);

  useEffect(() => {
    if (status?.isAdmin) refresh();
  }, [status?.isAdmin, refresh]);

  const setApproval = async (id: string, approved: boolean) => {
    await adminSetApproval({ data: { userId: id, approved } }).catch(() => {});
    refresh();
  };
  const removeUser = async (id: string) => {
    if (!confirm("Delete this user permanently?")) return;
    await adminDeleteUser({ data: { userId: id } }).catch((e) =>
      setError(e instanceof Error ? e.message : "Delete failed."),
    );
    refresh();
  };
  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminCreateUser({
        data: { email: newEmail, password: newPassword },
      });
      setNewEmail("");
      setNewPassword("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (id: string, email: string | null) => {
    const pwd = prompt(`Set a new password for ${email ?? "this user"}:`);
    if (!pwd) return;
    if (pwd.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    try {
      await adminSetUserPassword({ data: { userId: id, password: pwd } });
      alert("Password updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password update failed.");
    }
  };

  const toggleRequest = async (id: string, status: string) => {
    const next = status === "handled" ? "pending" : "handled";
    await setRequestStatus({ data: { id, status: next } }).catch(() => {});
    refresh();
  };
  const removeRequest = async (id: string) => {
    if (!confirm("Delete this request permanently?")) return;
    await adminDeleteRequest({ data: { id } }).catch(() => {});
    refresh();
  };
  const openInCreator = (id: string) => {
    navigate({ to: "/prescription", search: { request: id } });
  };


  const exportCsv = () => {
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const headers = [
      "eRx",
      "Patient",
      "Age",
      "Gender",
      "Date",
      "Medications",
      "Doctor",
      "Downloaded at",
    ];
    const rows = records.map((r) => {
      const meds = (r.medications ?? [])
        .map((m) =>
          [m.name, m.dosage, m.quantity, m.instructions]
            .filter(Boolean)
            .join(" "),
        )
        .join(" | ");
      return [
        r.erx,
        r.patient_name,
        r.patient_age,
        r.patient_gender,
        r.date_created,
        meds,
        r.doctor_email ?? "",
        new Date(r.created_at).toLocaleString(),
      ]
        .map(esc)
        .join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prescriptions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };


  if (loading || !status?.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fcfbf8]">
        <Loader2 className="h-6 w-6 animate-spin text-[#173B3D]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfbf8] text-[#173B3D]">
      <header className="sticky top-0 z-30 border-b border-[#E5E3DD] bg-[#fcfbf8]/90 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#6B7575] hover:text-[#173B3D]"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            <h1 className="flex items-center gap-2 text-base font-bold tracking-tight">
              <ShieldCheck className="h-5 w-5" /> Admin
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ChangePasswordDialog />
            <button
              onClick={() => supabase.auth.signOut()}
              className="rounded-xl border border-[#E5E3DD] bg-white px-3 py-2 text-xs font-bold uppercase tracking-widest text-[#173B3D] hover:bg-[#f8efe1]"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-5 py-8">
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setTab("users")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${
              tab === "users"
                ? "bg-[#173B3D] text-white"
                : "border border-[#E5E3DD] bg-white text-[#173B3D]"
            }`}
          >
            <Users className="h-4 w-4" /> Users
          </button>
          <button
            onClick={() => setTab("records")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${
              tab === "records"
                ? "bg-[#173B3D] text-white"
                : "border border-[#E5E3DD] bg-white text-[#173B3D]"
            }`}
          >
            <FileText className="h-4 w-4" /> Prescription records
          </button>
          <button
            onClick={() => setTab("requests")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${
              tab === "requests"
                ? "bg-[#173B3D] text-white"
                : "border border-[#E5E3DD] bg-white text-[#173B3D]"
            }`}
          >
            <Inbox className="h-4 w-4" /> Requests
            {requests.some((r) => r.status !== "handled") && (
              <span className="ml-1 rounded-full bg-amber-400 px-1.5 text-[10px] font-black text-[#173B3D]">
                {requests.filter((r) => r.status !== "handled").length}
              </span>
            )}
          </button>
        </div>


        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        {dataLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#173B3D]" />
          </div>
        ) : tab === "users" ? (
          <div className="space-y-6">
            <form
              onSubmit={createUser}
              className="flex flex-wrap items-end gap-3 rounded-2xl border border-[#E5E3DD] bg-white p-5"
            >
              <div className="flex-1 min-w-[180px]">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#6B7575]">
                  New user email
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E3DD] px-3 py-2 text-sm outline-none focus:border-[#173B3D]"
                />
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#6B7575]">
                  Temporary password
                </label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E3DD] px-3 py-2 text-sm outline-none focus:border-[#173B3D]"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="flex items-center gap-2 rounded-xl bg-[#173B3D] px-4 py-2 text-sm font-bold text-white hover:bg-[#0f2a2b] disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Add user
              </button>
            </form>

            <div className="overflow-x-auto rounded-2xl border border-[#E5E3DD] bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E3DD] text-left text-[10px] uppercase tracking-wider text-[#6B7575]">
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-[#F0EEE8]">
                      <td className="px-4 py-3 font-medium">{u.email ?? "—"}</td>
                      <td className="px-4 py-3">
                        {u.approved ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                            Approved
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-[#6B7575]">
                        {u.isAdmin ? "Admin" : "User"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {u.approved ? (
                            <button
                              onClick={() => setApproval(u.id, false)}
                              disabled={u.isAdmin}
                              title="Revoke approval"
                              className="rounded-lg border border-[#E5E3DD] p-1.5 hover:bg-[#f8efe1] disabled:opacity-30"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setApproval(u.id, true)}
                              title="Approve"
                              className="rounded-lg border border-[#E5E3DD] p-1.5 text-green-700 hover:bg-green-50"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => resetPassword(u.id, u.email)}
                            title="Reset password"
                            className="rounded-lg border border-[#E5E3DD] p-1.5 text-[#173B3D] hover:bg-[#f8efe1]"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removeUser(u.id)}
                            disabled={u.isAdmin}
                            title="Delete user"
                            className="rounded-lg border border-[#E5E3DD] p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-[#6B7575]">
                        No users yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : tab === "records" ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={exportCsv}
                disabled={records.length === 0}
                className="flex items-center gap-2 rounded-xl bg-[#173B3D] px-4 py-2 text-sm font-bold text-white hover:bg-[#0f2a2b] disabled:opacity-50"
              >
                <Download className="h-4 w-4" /> Export CSV
              </button>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-[#E5E3DD] bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E3DD] text-left text-[10px] uppercase tracking-wider text-[#6B7575]">
                  <th className="px-4 py-3">eRx</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Age</th>
                  <th className="px-4 py-3">Gender</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Medications</th>
                  <th className="px-4 py-3">Doctor</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-[#F0EEE8] align-top">
                    <td className="px-4 py-3 font-mono text-xs font-bold">{r.erx}</td>
                    <td className="px-4 py-3 font-medium">{r.patient_name || "—"}</td>
                    <td className="px-4 py-3">{r.patient_age || "—"}</td>
                    <td className="px-4 py-3">{r.patient_gender || "—"}</td>
                    <td className="px-4 py-3 text-xs">{r.date_created || "—"}</td>
                    <td className="px-4 py-3">
                      <ul className="space-y-1">
                        {(r.medications ?? []).map((m, i) => (
                          <li key={i} className="text-xs">
                            <span className="font-bold">{m.name}</span>
                            {m.dosage ? ` · ${m.dosage}` : ""}
                            {m.quantity ? ` · ${m.quantity}` : ""}
                            {m.instructions ? (
                              <span className="block text-[#6B7575]">
                                {m.instructions}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6B7575]">
                      {r.doctor_email ?? "—"}
                    </td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[#6B7575]">
                      No prescriptions downloaded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-[#E5E3DD] bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7575]">
                    Shareable client link
                  </p>
                  <p className="truncate text-sm font-medium text-[#173B3D]">
                    {typeof window !== "undefined" ? window.location.origin : ""}/request
                  </p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard
                      ?.writeText(`${window.location.origin}/request`)
                      .then(() => alert("Link copied."))
                      .catch(() => {});
                  }}
                  className="flex items-center gap-2 rounded-xl bg-[#173B3D] px-4 py-2 text-sm font-bold text-white hover:bg-[#0f2a2b]"
                >
                  <ExternalLink className="h-4 w-4" /> Copy link
                </button>
              </div>
              <div className="flex flex-wrap items-end gap-3 border-t border-[#F0EEE8] pt-3">
                <div className="flex-1 min-w-[180px]">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#6B7575]">
                    WhatsApp number
                  </label>
                  <input
                    type="tel"
                    value={waNumber}
                    onChange={(e) => setWaNumber(e.target.value)}
                    placeholder="+971561729928"
                    className="w-full rounded-xl border border-[#E5E3DD] px-3 py-2 text-sm outline-none focus:border-[#173B3D]"
                  />
                </div>
                <button
                  onClick={() => {
                    const num = waNumber.replace(/[^\d]/g, "");
                    if (!num) {
                      alert("Enter a WhatsApp number first.");
                      return;
                    }
                    const link = `${window.location.origin}/request`;
                    const msg = `Hello! Kindly fill in your details to receive your prescription in the correct format: ${link}`;
                    window.open(
                      `https://wa.me/${num}?text=${encodeURIComponent(msg)}`,
                      "_blank",
                    );
                  }}
                  className="flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-sm font-bold text-white hover:bg-[#1da851]"
                >
                  <Send className="h-4 w-4" /> Share on WhatsApp
                </button>
              </div>
            </div>
          <div className="overflow-x-auto rounded-2xl border border-[#E5E3DD] bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E3DD] text-left text-[10px] uppercase tracking-wider text-[#6B7575]">
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Age</th>
                  <th className="px-4 py-3">Gender</th>
                  <th className="px-4 py-3">Medication</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Received</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-[#F0EEE8] align-top">
                    <td className="px-4 py-3 font-medium">{r.patient_name || "—"}</td>
                    <td className="px-4 py-3">{r.patient_age || "—"}</td>
                    <td className="px-4 py-3">{r.patient_gender || "—"}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className="font-bold">{r.product}</span>
                      {r.dose ? ` · ${r.dose}` : ""}
                      {r.quantity ? ` · ${r.quantity}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "handled" ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                          Handled
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6B7575]">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openInCreator(r.id)}
                          title="Open in creator"
                          className="rounded-lg border border-[#E5E3DD] p-1.5 text-[#173B3D] hover:bg-[#f8efe1]"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toggleRequest(r.id, r.status)}
                          title={r.status === "handled" ? "Mark pending" : "Mark handled"}
                          className="rounded-lg border border-[#E5E3DD] p-1.5 text-green-700 hover:bg-green-50"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeRequest(r.id)}
                          title="Delete request"
                          className="rounded-lg border border-[#E5E3DD] p-1.5 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[#6B7575]">
                      No client requests yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </div>
        )}

      </div>
    </div>
  );
}
