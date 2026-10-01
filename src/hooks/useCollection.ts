import { useEffect, useState } from 'react';
import { getMyCollection, type CollectionItem } from '@/lib/apiClient';

// claimed items, shopify purchases, and campaign redemptions in one list, from the same
// GET /v1/me/collection the app uses
export function useCollection() {
  const [items, setItems] = useState<CollectionItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const collection = await getMyCollection();
        if (active) setItems(collection.items);
      } catch (e: any) {
        if (active) setError(e?.message ?? 'could not load your collection');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return { items, loading, error };
}
