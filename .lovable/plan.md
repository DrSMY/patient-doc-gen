# Always-Save Logo, Signature & Stamp

## Goal
Make the currently attached clinic **logo, signature, and stamp** automatically saved and available — so they persist after a page reload and appear pre-filled in both the Prescription and Medical Report creators, without needing to click "Save to Library" each time.

## Current behavior
- Active logo/signature/stamp live only in component state (`data.logo`, `data.signature`, `data.stamp`) and start empty.
- They're only persisted if the user manually clicks "Save to Library" (stored in `localStorage` lists `docgenie_logos`, `docgenie_signatures`, `docgenie_stamps`).
- On reload, the active selection is lost; the user has to re-pick from the library.

## Changes

### 1. Persist the active selection
Add three new localStorage keys for the *currently active* assets:
- `docgenie_active_logo`
- `docgenie_active_signature`
- `docgenie_active_stamp`

Create a small helper hook (e.g. `useLocalStorageString`) in `src/components/EditorLayout.tsx` alongside the existing `useLocalStorageList`, to read/write a single string value.

### 2. Wire into both route pages
In `src/routes/prescription.tsx` and `src/routes/medical-report.tsx`:
- On mount, initialize `data.logo`, `data.signature`, `data.stamp` from the active-asset localStorage keys (falling back to the existing defaults).
- Whenever the active logo/signature/stamp changes, write it back to the corresponding active key (and clear the key when removed).

### 3. Auto-save uploads to the library
In both `PrescriptionForm.tsx` and `MedicalReportForm.tsx`:
- When a new logo/signature/stamp is uploaded, automatically add it to its library list (if not already present) instead of requiring the manual "Save to Library" click — and set it as the active asset.
- Keep the existing library grid and manual remove (X) controls so users can still manage/delete saved assets.

## Result
Once a user uploads or selects a logo, signature, or stamp, it is remembered: it stays attached on reload and is shared across both the Prescription and Medical Report creators, and remains in the library for quick re-selection.

## Technical notes
- Shared storage keys mean a logo/signature/stamp saved in one creator is available in the other (the library keys are already shared; this extends the same to the active selection).
- All persistence stays client-side via `localStorage`; no backend changes.
