# Client Prescription Request Link

Build a shareable public link where clients enter their details and pick a GLP-1 medication + dose. Each submission becomes a request your team sees in both the Admin panel and the Prescription creator, and can load into the creator with one click.

## 1. GLP-1 / peptide medication data

Add `src/lib/glp1Database.ts` — a structured version of the uploaded CSV, grouped by product with dose variants:

```
Wegovy Injection → 0.25 / 0.5 / 1 / 1.7 / 2.4 / 7.2 mg  (1 pre-filled pen, "Inject subcutaneously once weekly…")
Wegovy Tablets   → 1.5 / 4 / 9 / 25 mg
Mounjaro Injection → 2.5 / 5 / 7.5 / 10 / 12.5 / 15 mg
Foundayo Tablets → 0.8 / 2.5 / 5.5 / 9 / 14.5 / 17.2 mg
Rybelsus Tablets → 3 / 7 / 14 mg
```
Each variant carries its dose, quantity, and instructions text from the CSV. Used by both the public form (dose dropdown appears after picking a product) and the prefill.

## 2. Database: requests table

New `prescription_requests` table (name, age, gender, product, dose, quantity, instructions, status `pending`/`handled`, created_at).
- Anonymous visitors can **create** a request (public link needs no login).
- Signed-in team members can **read** and **update status**; deletes admin-only.

## 3. Public request page (the shareable link)

New public route `src/routes/request.tsx` (`/request`, no login required). Content:
- Intro message: *"Kindly enter your name, age, and gender exactly as they appear on your passport in order to receive your prescription in the correct format. Once you provide this information, our team will send you your prescription copy."*
- Fields: Name, Age, Gender.
- Product dropdown (Wegovy Injection, Wegovy Tablets, Mounjaro Injection, Foundayo Tablets, Rybelsus Tablets).
- Dose dropdown that populates from the chosen product.
- Submit → inserts the request → success confirmation screen.

The shareable URL will be `https://patient-doc-gen.lovable.app/request`.

## 4. Team side — Admin panel

Add a **Requests** tab to `src/routes/admin.tsx` alongside Users and Records:
- Lists all requests (newest first) with name, age, gender, product, dose, status, date.
- "Open in creator" button and a "Mark handled" toggle.
- Export handled/all as part of the existing CSV pattern (optional, same as records).

## 5. Team side — Prescription creator

- Add a collapsible **Incoming requests** panel in the Prescription page listing pending requests, so any approved doctor can pick one up.
- **One-click prefill**: selecting a request fills patient Name, Age (into DOB/age field), Gender, and adds a medication row (product name, dose, quantity, instructions) ready to download. Reached either from this panel or via the Admin "Open in creator" button (navigates to `/prescription?request=<id>`).
- After the doctor downloads, the request can be marked handled.

## Technical notes

- Public insert uses the browser Supabase client against an `anon` INSERT policy (no auth needed for clients).
- Team reads/updates/prefill use `createServerFn` + `requireSupabaseAuth`: `listRequests`, `getRequest`, `setRequestStatus` (approved users), `adminDeleteRequest` (admin).
- Prefill maps a request into the existing `PrescriptionData` shape (adds one `PrescriptionMedication`).
- Age is stored as text and placed in the existing patient age/DOB field.
- Zod validation on both the public form and server functions; age bounded, strings length-capped.
