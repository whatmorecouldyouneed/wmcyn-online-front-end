import { useEffect, useState } from "react";
import { getInventory } from "@/lib/apiClient";

export function useInventory(includeProduct = true) {
  const [items, setItems] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const inventory = await getInventory(includeProduct);
        if (active) setItems(inventory);
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
