import { useEffect, useState } from "react";
import { useApi } from "@/utils/api";

export function useProfile() {
  const api = useApi();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get("/profile");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (active) setData(json);
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
