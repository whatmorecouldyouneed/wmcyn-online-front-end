import { useEffect, useState } from 'react';
import ShopifyBuy from 'shopify-buy';
import getClient from '@/utils/shopifyClient';

// define a serializable product type
interface SerializableProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  descriptionHtml: string;
  images: Array<{
    id: string;
    src: string;
    altText: string | null;
  }>;
  variants: Array<{
    id: string;
    title: string;
    price: {
      amount: string;
      currencyCode: string;
    };
    image?: {
      src: string;
      altText: string | null;
    };
  }>;
}

interface UseShopifyProductsReturn {
  products: SerializableProduct[];
  loading: boolean;
  error: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// helper function to serialize a Shopify product
const serializeProduct = (product: ShopifyBuy.Product): SerializableProduct => {
  return {
    id: String(product.id),
    title: product.title,
    handle: product.handle,
    description: product.description,
    descriptionHtml: product.descriptionHtml,
    images: product.images.map(image => ({
      id: String(image.id),
      src: image.src,
      altText: image.altText || null
    })),
    variants: product.variants.map(variant => ({
      id: String(variant.id),
      title: variant.title,
      price: {
        amount: String(variant.price.amount),
        currencyCode: variant.price.currencyCode
      },
      image: variant.image ? {
        src: variant.image.src,
        altText: variant.image.altText || null
      } : undefined
    }))
  };
};

export const useShopifyProducts = (): UseShopifyProductsReturn => {
  const [products, setProducts] = useState<SerializableProduct[]>([]);
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
        
        let client;
        try {
          client = getClient();
          if (!client) {
            throw new Error('Shopify client not initialized');
          }
        } catch (clientError) {
          console.error('Error initializing Shopify client:', clientError);
          throw clientError;
        }
        
        console.log('useShopifyProducts: Client initialized successfully');
        
        // verify client has required methods
        if (!client.product || typeof client.product.fetchAll !== 'function') {
          throw new Error('Shopify client missing required methods');
        }
        
        // The SDK returns a paginated list, by default 20 items.
        // For more than 20 products, pagination needs to be handled.
        const fetchedProducts = await client.product.fetchAll();
        
        // serialize the products before setting state
        const serializedProducts = fetchedProducts.map(serializeProduct);
        
        console.log('useShopifyProducts: Successfully fetched products:', serializedProducts.length);
        setProducts(serializedProducts);
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