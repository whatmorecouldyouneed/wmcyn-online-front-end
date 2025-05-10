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
        console.log('useShopifyProducts: Starting product fetch...');
        
        // The SDK returns a paginated list, by default 20 items.
        // For more than 20 products, pagination needs to be handled.
        const fetchedProducts = await shopifyClient.product.fetchAll();
        
        console.log('useShopifyProducts: Successfully fetched products:', fetchedProducts.length);
        setProducts(fetchedProducts);
      } catch (e) {
        console.error('useShopifyProducts: Error fetching products:', e);
        // log additional error details
        if (e instanceof Error) {
          console.error('Error name:', e.name);
          console.error('Error message:', e.message);
          console.error('Error stack:', e.stack);
        }
        setError(e);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []); // Runs once on mount

  return { products, loading, error };
}; 