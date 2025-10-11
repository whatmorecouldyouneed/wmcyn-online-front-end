import { useEffect, useState } from "react";
import { useApi } from "@/utils/api";

export function useInventory(includeProduct = true) {
  const api = useApi();
  const [items, setItems] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get(`/v1/profile/inventory?includeProduct=${includeProduct}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (active) setItems(json);
      } catch (e: any) {
        if (active) setError(e?.message ?? "Failed to load inventory");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [includeProduct]);

  return { items, loading, error };
}
