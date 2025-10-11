import { useEffect, useState } from "react";
import { getMyProfile } from "@/lib/apiClient";

export function useProfile() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const profile = await getMyProfile();
        if (active) setData(profile);
      } catch (e: any) {
        if (active) setError(e?.message ?? "Failed to load profile");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return { data, loading, error };
}
