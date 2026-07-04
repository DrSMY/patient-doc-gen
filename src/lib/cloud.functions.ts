import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const medSchema = z.object({
  name: z.string().min(1),
  dosage: z.string().default(""),
  instructions: z.string().default(""),
});

export const getClinicData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [assetsRes, medsRes] = await Promise.all([
      supabase
        .from("clinic_assets")
        .select("logo, signature, stamp")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("medications")
        .select("name, dosage, instructions")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);
    return {
      assets: assetsRes.data ?? { logo: null, signature: null, stamp: null },
      medications: medsRes.data ?? [],
    };
  });

export const upsertClinicAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        logo: z.string().nullable().optional(),
        signature: z.string().nullable().optional(),
        stamp: z.string().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("clinic_assets")
      .upsert(
        {
          user_id: userId,
          logo: data.logo ?? null,
          signature: data.signature ?? null,
          stamp: data.stamp ?? null,
        },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const replaceMedications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ meds: z.array(medSchema).max(5000) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("medications").delete().eq("user_id", userId);
    // De-duplicate by name+dosage to satisfy the unique index.
    const seen = new Set<string>();
    const rows = data.meds
      .filter((m) => {
        const key = `${m.name.toLowerCase()}|${m.dosage}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((m) => ({ ...m, user_id: userId }));
    if (rows.length) {
      const { error } = await supabase.from("medications").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true, count: rows.length };
  });

// ---------------------------------------------------------------------------
// Accounts, approval, admin management, and saved downloaded prescriptions
// ---------------------------------------------------------------------------

const ADMIN_EMAIL = "drsamimoha2018@gmail.com";

/**
 * Ensures the signed-in user has a profile row and returns their status.
 * The designated admin email is auto-granted the admin role and approval.
 */
export const getMyStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const email = (claims.email as string | undefined) ?? null;
    const isDesignatedAdmin =
      !!email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    // Create the profile if it does not exist yet.
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, approved")
      .eq("id", userId)
      .maybeSingle();

    if (!existing) {
      await supabase.from("profiles").insert({
        id: userId,
        email,
        approved: isDesignatedAdmin,
      });
    } else if (email && !existing.email) {
      await supabase.from("profiles").update({ email }).eq("id", userId);
    }

    // Grant admin role + approval to the designated admin.
    if (isDesignatedAdmin) {
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
      await supabaseAdmin
        .from("user_roles")
        .upsert(
          { user_id: userId, role: "admin" },
          { onConflict: "user_id,role" },
        );
      await supabaseAdmin
        .from("profiles")
        .update({ approved: true })
        .eq("id", userId);
    }

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    const isAdmin = !!roleRow;
    const approved = isAdmin || isDesignatedAdmin || !!existing?.approved;

    return { approved, isAdmin, email };
  });

const savedMedSchema = z.object({
  name: z.string().default(""),
  dosage: z.string().default(""),
  instructions: z.string().default(""),
  quantity: z.string().default(""),
});

/** Saves a downloaded prescription to the records database. */
export const saveDownloadedPrescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        erx: z.string().default(""),
        patient_name: z.string().default(""),
        patient_age: z.string().default(""),
        patient_gender: z.string().default(""),
        date_created: z.string().default(""),
        medications: z.array(savedMedSchema).max(200).default([]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("prescriptions").insert({
      user_id: userId,
      erx: data.erx,
      patient_name: data.patient_name,
      patient_age: data.patient_age,
      patient_gender: data.patient_gender,
      date_created: data.date_created,
      medications: data.medications,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin access required");
}

/** Admin: list all users with approval status. */
export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, email, approved, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    const adminIds = new Set(
      (roles ?? [])
        .filter((r: any) => r.role === "admin")
        .map((r: any) => r.user_id),
    );
    return {
      users: (profiles ?? []).map((p: any) => ({
        id: p.id,
        email: p.email,
        approved: p.approved,
        created_at: p.created_at,
        isAdmin: adminIds.has(p.id),
      })),
    };
  });

/** Admin: approve or unapprove a user. */
export const adminSetApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ userId: z.string().uuid(), approved: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ approved: data.approved })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: create a new user (auto-approved). */
export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(6).max(72),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    const newId = created.user?.id;
    if (newId) {
      await supabaseAdmin
        .from("profiles")
        .upsert(
          { id: newId, email: data.email, approved: true },
          { onConflict: "id" },
        );
    }
    return { ok: true };
  });

/** Admin: delete a user entirely. */
export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ userId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) {
      throw new Error("You cannot delete your own admin account.");
    }
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: list all downloaded prescriptions across users. */
export const adminListPrescriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const [{ data: rows }, { data: profiles }] = await Promise.all([
      supabaseAdmin
        .from("prescriptions")
        .select(
          "id, user_id, erx, patient_name, patient_age, patient_gender, date_created, medications, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(1000),
      supabaseAdmin.from("profiles").select("id, email"),
    ]);
    const emailById = new Map(
      (profiles ?? []).map((p: any) => [p.id, p.email]),
    );
    return {
      prescriptions: (rows ?? []).map((r: any) => ({
        ...r,
        doctor_email: emailById.get(r.user_id) ?? null,
      })),
    };
  });
