## Goal
Move the saved **medication database, clinic logo, signature, and stamp** from browser-only storage into **Lovable Cloud**, tied to each user's account — so once saved, they follow the user across devices and browsers and are always available.

## Why this needs accounts
"Per account" storage requires knowing *who* the user is. So this adds a lightweight **login** (email/password + Google sign-in) so each user's branding and medication list is private to them.

## What gets built

### 1. Enable Lovable Cloud
Provision the backend (database + auth + storage).

### 2. Authentication
- Add an `/auth` route with email/password and Google sign-in.
- Add a small account indicator in the editor header (shows signed-in email + sign out).
- Keep the prescription/report editors usable; the "save to my account" features light up once signed in.

### 3. Database tables (per user, protected by row-level security)
- `clinic_assets` — one row per user holding the active `logo`, `signature`, `stamp` (stored as data URLs / uploaded files).
- `medications` — the user's medication database (`name`, `dosage`, `instructions`), supporting the existing bulk import.

Each table:
- `user_id` FK to the account, RLS so users only see their own rows.
- Proper GRANTs for the Data API.

### 4. Wire the app to Cloud
- On load (when signed in), fetch the user's assets + medications from Cloud instead of localStorage and pre-fill the forms.
- Saving a logo/signature/stamp or adding/importing medications writes to Cloud.
- Keep localStorage as an offline fallback for signed-out use, and offer a one-time migration of existing local data into the account on first sign-in.

## Result
After signing in once, a user's clinic logo, signature, stamp, and full medication database are permanently kept in their account and appear automatically in both the Prescription and Medical Report creators on any device.

## Technical notes
- Assets stored as text (data URLs) in `clinic_assets` for simplicity; can move to Storage buckets later if files get large.
- All reads/writes go through TanStack server functions with `requireSupabaseAuth`; no service-role key in the client.
- Medication reads/writes replace the current `docgenie_medications` localStorage logic while keeping the same UI (including bulk import).
