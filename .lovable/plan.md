## Goal

Recreate two document generators from the `DrSMY/documents` (DocuGenie) project inside this TanStack Start app: a **Prescription creator** and a **Medical Report creator**. Each has an editor form on the left and a live A4-style document preview on the right, with PDF and PNG download. A home page links to both. The original's clinical look (cream `#FAF9F6`-style background, dark teal `#173B3D` accents, rounded cards) is reproduced. AI-powered text parsing/enhancement is wired through Lovable AI.

## Routes & navigation

```text
/                  Home — two cards: "Prescription" and "Medical Report"
/prescription      Prescription editor + live preview + export
/medical-report    Medical report editor + live preview + export
```

Each route gets its own `head()` (unique title + description). Home uses cards with icons (Pill, ClipboardList).

## What gets built

**Dependencies** (added via bun): `lucide-react`, `jspdf`, `html2canvas`.

**Shared library**
- `src/lib/dateUtils.ts` — `getTodayDate`, `getFormattedDate` (ported).
- `src/lib/pdfService.ts` — `generatePDF` / `generatePNG` using html2canvas + jsPDF (client-only; ported as-is). Captures a target element by id, clones it at A4 width, renders to canvas, exports.
- `src/lib/types.ts` — `PrescriptionData`, `PrescriptionMedication`, `MedicalReportData` interfaces (ported, trimmed to the two document types).

**Prescription feature**
- `src/components/prescription/PrescriptionForm.tsx` — clinic/doctor fields, patient fields, eRx ID, medication rows (add/remove, quantity, dosage, instructions), built-in common-meds quick-add + searchable user med library persisted in `localStorage`, notes/warnings/footer, and image uploads (signature, stamp, logo) with a reusable saved-asset library.
- `src/components/prescription/PrescriptionPreview.tsx` — A4 document layout matching the original.
- AI: "Paste text → auto-fill prescription" (parsePrescription) and medication parsing.

**Medical Report feature**
- `src/components/medical-report/MedicalReportForm.tsx` — report/consultation dates, physician, patient, vitals (height/weight/BMI/goal), clinical summary, flags, assessment, treatment plan, prognosis, notes, footer, and the same signature/stamp/logo uploads.
- `src/components/medical-report/MedicalReportPreview.tsx` — A4 document layout matching the original.
- AI: "Enhance text" buttons on the long free-text fields (clinical summary, assessment, treatment plan, etc.).

**Reusable UI**
- `src/components/AssetUpload.tsx` — shared signature/stamp/logo upload + saved-library widget used by both forms.
- A shared editor layout shell (form column + sticky preview column, with Download PDF / Download PNG buttons).

State lives in each route component (seeded with the original sensible defaults). Saved signatures/stamps/logos and the medication database persist to `localStorage` so they're reusable across both creators.

## AI integration (Lovable AI)

The original calls Google Gemini directly from the browser with a `GEMINI_API_KEY`. That is replaced with Lovable AI through a server boundary — no user key, no browser exposure:

- Enable Lovable Cloud / ensure `LOVABLE_API_KEY` exists.
- `src/lib/ai-gateway.server.ts` — Lovable AI Gateway provider helper.
- `src/lib/ai.functions.ts` — two `createServerFn` calls:
  - `parsePrescription(text)` → structured JSON (clinic, doctor, patient, medications[]) via the AI SDK `Output` API.
  - `enhanceText(text, context)` → improved professional copy for report fields.
- Forms call these via `useServerFn`, with loading spinners and error handling (including 429/402 messaging). If AI is unavailable, manual editing still works fully.

## Design

Match the original: cream page background, white rounded-3xl cards with subtle borders, dark teal (`#173B3D`) headings/accents, uppercase tracked section labels, lucide icons. Document previews mirror the original A4 typography and spacing. Tokens added to `src/styles.css` where practical; the document previews keep their literal print colors for fidelity.

## Out of scope

Invoice, Resume, Certificate, Sign-&-Fill, and Quotation creators; the AI connectivity/quota status banner and quota modal; any auth or database persistence (assets/meds stay in `localStorage`).

## Verification

Build passes; both routes render form + live preview; editing updates the preview; PDF and PNG download work; AI auto-fill and enhance return results or show a clean error; home cards navigate correctly.
