import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  getClinicData,
  upsertClinicAssets,
  replaceMedications,
} from "@/lib/cloud.functions";

type Med = { name: string; dosage?: string; instructions?: string };

/**
 * Keeps the active logo / signature / stamp synced with the user's account.
 * - On sign-in: pulls saved assets from the cloud (or pushes local ones up if
 *   the account has none yet).
 * - On change: pushes the active assets back to the cloud.
 */
export function useCloudAssetSync(
  assets: { logo?: string; signature?: string; stamp?: string },
  apply: (next: { logo?: string; signature?: string; stamp?: string }) => void,
) {
  const { user } = useAuth();
  const pulled = useRef<string | null>(null);
  const assetsRef = useRef(assets);
  assetsRef.current = assets;

  // Pull on sign-in.
  useEffect(() => {
    if (!user) {
      pulled.current = null;
      return;
    }
    if (pulled.current === user.id) return;
    pulled.current = user.id;
    getClinicData()
      .then((res) => {
        const a = res.assets || {};
        if (a.logo || a.signature || a.stamp) {
          apply({
            logo: a.logo ?? assetsRef.current.logo,
            signature: a.signature ?? assetsRef.current.signature,
            stamp: a.stamp ?? assetsRef.current.stamp,
          });
        } else {
          const cur = assetsRef.current;
          if (cur.logo || cur.signature || cur.stamp) {
            upsertClinicAssets({ data: { ...cur } }).catch(() => {});
          }
        }
      })
      .catch(() => {});
  }, [user, apply]);

  // Push on change (after the initial pull).
  useEffect(() => {
    if (!user || pulled.current !== user.id) return;
    const t = setTimeout(() => {
      upsertClinicAssets({
        data: {
          logo: assets.logo ?? null,
          signature: assets.signature ?? null,
          stamp: assets.stamp ?? null,
        },
      }).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [user, assets.logo, assets.signature, assets.stamp]);
}

/**
 * Keeps the medication database synced with the user's account.
 * Returns a `persist` helper that writes locally and (when signed in) to cloud.
 */
export function useCloudMedications(
  meds: Med[],
  setMeds: (m: Med[]) => void,
) {
  const { user } = useAuth();
  const pulled = useRef<string | null>(null);
  const medsRef = useRef(meds);
  medsRef.current = meds;

  useEffect(() => {
    if (!user) {
      pulled.current = null;
      return;
    }
    if (pulled.current === user.id) return;
    pulled.current = user.id;
    getClinicData()
      .then((res) => {
        const cloud = (res.medications || []) as Med[];
        if (cloud.length) {
          setMeds(cloud);
          localStorage.setItem("docgenie_med_database", JSON.stringify(cloud));
        } else if (medsRef.current.length) {
          replaceMedications({
            data: {
              meds: medsRef.current.map((m) => ({
                name: m.name || "",
                dosage: m.dosage || "",
                instructions: m.instructions || "",
              })),
            },
          }).catch(() => {});
        }
      })
      .catch(() => {});
  }, [user, setMeds]);

  const persist = (updated: Med[]) => {
    setMeds(updated);
    localStorage.setItem("docgenie_med_database", JSON.stringify(updated));
    if (user && pulled.current === user.id) {
      replaceMedications({
        data: {
          meds: updated.map((m) => ({
            name: m.name || "",
            dosage: m.dosage || "",
            instructions: m.instructions || "",
          })),
        },
      }).catch(() => {});
    }
  };

  return { persist };
}
