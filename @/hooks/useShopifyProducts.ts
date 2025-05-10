import { useEffect, useState } from 'react';
import ShopifyBuy from 'shopify-buy';
import shopifyClient from '@/utils/shopifyClient';

interface UseShopifyProductsReturn {
  products: ShopifyBuy.Product[];
  loading: boolean;
  error: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export const useShopifyProducts = (): UseShopifyProductsReturn => {
  const [products, setProducts] = useState<ShopifyBuy.Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        // The SDK returns a paginated list, by default 20 items.
        // For more than 20 products, pagination needs to be handled.
        const fetchedProducts = await shopifyClient.product.fetchAll();
        setProducts(fetchedProducts);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []); // Runs once on mount

  return { products, loading, error };
}; 