import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, Pill } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GLP1_PRODUCTS, findVariant } from "@/lib/glp1Database";

export const Route = createFileRoute("/request")({
  head: () => ({
    meta: [
      { title: "Request Your Prescription" },
      {
        name: "description",
        content:
          "Submit your details to receive your weight-management prescription from our medical team.",
      },
      { property: "og:title", content: "Request Your Prescription" },
      {
        property: "og:description",
        content:
          "Submit your details to receive your weight-management prescription from our medical team.",
      },
    ],
  }),
  component: RequestPage,
});

function RequestPage() {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [product, setProduct] = useState("");
  const [dose, setDose] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const doses = useMemo(
    () => GLP1_PRODUCTS.find((p) => p.product === product)?.variants ?? [],
    [product],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !age.trim() || !gender || !product || !dose) {
      setError("Please complete every field.");
      return;
    }
    setSubmitting(true);
    const variant = findVariant(product, dose);
    const { error: err } = await supabase.from("prescription_requests").insert({
      patient_name: name.trim().slice(0, 200),
      patient_age: age.trim().slice(0, 20),
      patient_gender: gender,
      product,
      dose,
      quantity: variant?.quantity ?? "",
      instructions: variant?.instructions ?? "",
    });
    setSubmitting(false);
    if (err) {
      setError("Something went wrong. Please try again.");
      return;
    }
    setDone(true);
  };

  return (
    <div className="min-h-screen bg-[#fcfbf8] text-[#173B3D]">
      <div className="mx-auto max-w-lg px-6 py-14">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f8efe1]">
            <Pill className="h-6 w-6 text-[#173B3D]" />
          </div>
          <span className="text-sm font-black uppercase tracking-[0.2em] text-[#6B7575]">
            Prescription Request
          </span>
        </div>

        {done ? (
          <div className="rounded-3xl border border-[#E5E3DD] bg-white p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-600" />
            <h1 className="text-2xl font-light tracking-tight">Thank you</h1>
            <p className="mt-3 text-[#6B7575]">
              We have received your request. Our team will prepare and send you
              your prescription copy shortly.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-light tracking-tight">
              Request your prescription
            </h1>
            <p className="mt-4 rounded-2xl bg-[#f8efe1] p-4 text-sm leading-relaxed text-[#173B3D]">
              Kindly put your name, age, and gender as per your passport in order
              to receive your prescription in the right format. Once you provide
              this information, our team will be able to send you your
              prescription copy.
            </p>

            <form
              onSubmit={handleSubmit}
              className="mt-6 space-y-4 rounded-3xl border border-[#E5E3DD] bg-white p-6 shadow-sm"
            >
              <Field label="Full name (as per passport)">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={200}
                  className="input"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Age">
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="input"
                  />
                </Field>
                <Field label="Gender">
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="input"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </Field>
              </div>

              <Field label="Prescription needed for">
                <select
                  value={product}
                  onChange={(e) => {
                    setProduct(e.target.value);
                    setDose("");
                  }}
                  className="input"
                >
                  <option value="">Select medication</option>
                  {GLP1_PRODUCTS.map((p) => (
                    <option key={p.product} value={p.product}>
                      {p.product}
                    </option>
                  ))}
                </select>
              </Field>

              {product && (
                <Field label="Dose">
                  <select
                    value={dose}
                    onChange={(e) => setDose(e.target.value)}
                    className="input"
                  >
                    <option value="">Select dose</option>
                    {doses.map((v) => (
                      <option key={v.dose} value={v.dose}>
                        {v.dose}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#173B3D] px-4 py-3 text-sm font-bold text-white hover:bg-[#0f2a2b] disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit request
              </button>
            </form>
          </>
        )}
      </div>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid #E5E3DD;
          padding: 0.6rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          background: white;
          color: #173B3D;
        }
        .input:focus { border-color: #173B3D; }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#6B7575]">
        {label}
      </span>
      {children}
    </label>
  );
}
