import { useState } from 'react';
import getClient from '@/utils/shopifyClient';
import ShopifyBuy from 'shopify-buy';

// Define the structure for line items to be added to the checkout
export interface LineItemToAdd {
  variantId: string; // Typically looks like 'gid://shopify/ProductVariant/1234567890'
  quantity: number;
  customAttributes?: Array<{ key: string; value: string }>; // Corrected type
}

interface UseShopifyCheckoutReturn {
  checkoutUrl: string | null;
  loading: boolean;
  error: Error | null;
  createShopifyCheckout: (lineItems: LineItemToAdd[]) => Promise<void>;
}

export const useShopifyCheckout = (): UseShopifyCheckoutReturn => {
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const createShopifyCheckout = async (lineItems: LineItemToAdd[]) => {
    setLoading(true);
    setError(null);
    try {
      const client = getClient();
      if (!client) {
        throw new Error('Shopify client not initialized');
      }

      // 1. Create an empty checkout
      const checkout = await client.checkout.create();
      
      if (!checkout || !checkout.id) {
        throw new Error('Failed to create checkout');
      }

      // 2. Format the items for Shopify
      const shopifyLineItems = lineItems.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
        ...(item.customAttributes && { customAttributes: item.customAttributes }),
      }));

      // 3. Add the items to the checkout
      const checkoutWithItems = await client.checkout.addLineItems(
        checkout.id,
        shopifyLineItems
      );

      if (checkoutWithItems && checkoutWithItems.webUrl) {
        setCheckoutUrl(checkoutWithItems.webUrl);
        // 4. Redirect to Shopify's hosted checkout page
        window.location.href = checkoutWithItems.webUrl;
      } else {
        throw new Error('Failed to add items to checkout or retrieve checkout URL.');
      }
    } catch (e: any) {
      console.error('Shopify Checkout Error:', e);
      const error = e instanceof Error ? e : new Error('An unknown error occurred during checkout.');
      setError(error);
      setCheckoutUrl(null); // Reset checkout URL on error
    } finally {
      setLoading(false);
    }
  };

  return {
    checkoutUrl,
    loading,
    error,
    createShopifyCheckout,
  };
}; 