import { useEffect, useState } from 'react';
import ShopifyBuy from 'shopify-buy';
import getClient from '@/utils/shopifyClient';

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
    // only run on client side
    if (typeof window === 'undefined') return;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        console.log('useShopifyProducts: Starting product fetch...');
        
        // log environment variables (without sensitive data)
        console.log('Shopify domain:', process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN);
        console.log('Shopify storefront token exists:', !!process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN);
        
        const client = getClient();
        if (!client) {
          throw new Error('Shopify client not initialized');
        }
        
        console.log('useShopifyProducts: Client initialized successfully');
        
        // The SDK returns a paginated list, by default 20 items.
        // For more than 20 products, pagination needs to be handled.
        const fetchedProducts = await client.product.fetchAll();
        
        console.log('useShopifyProducts: Successfully fetched products:', fetchedProducts.length);
        setProducts(fetchedProducts);
      } catch (e) {
        console.error('useShopifyProducts: Error fetching products:', e);
        // log additional error details
        if (e instanceof Error) {
          console.error('Error name:', e.name);
          console.error('Error message:', e.message);
          console.error('Error stack:', e.stack);
          
          // check if it's an environment variable issue
          if (e.message.includes('Missing required Shopify environment variables')) {
            console.error('Environment variables check:');
            console.error('NEXT_PUBLIC_SHOPIFY_DOMAIN:', process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN);
            console.error('NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN exists:', !!process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN);
          }
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