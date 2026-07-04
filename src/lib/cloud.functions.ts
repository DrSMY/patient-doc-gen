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
