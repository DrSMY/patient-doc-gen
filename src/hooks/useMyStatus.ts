import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getMyStatus } from "@/lib/cloud.functions";

export interface MyStatus {
  approved: boolean;
  isAdmin: boolean;
  email: string | null;
}

/**
 * Resolves the signed-in user's approval + admin status.
 * Ensures a profile row exists on first load.
 */
export function useMyStatus() {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<MyStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (authLoading) return;
    if (!user) {
      setStatus(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getMyStatus()
      .then((res) => {
        if (active) setStatus(res as MyStatus);
      })
      .catch(() => {
        if (active) setStatus({ approved: false, isAdmin: false, email: null });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, authLoading]);

  return { user, status, loading: authLoading || loading };
}
