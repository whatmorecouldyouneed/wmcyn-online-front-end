import { useState } from 'react';
import shopifyClient from '../utils/shopifyClient';
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
      // 1. Create an empty checkout
      const checkout = await shopifyClient.checkout.create();
      
      if (!checkout || !checkout.id) {
        throw new Error('Failed to create checkout.');
      }

      // 2. Add line items to the checkout
      // The line items need to be in the format expected by the SDK
      const shopifyLineItems = lineItems.map(item => ({
        variantId: item.variantId,
        quantity: item.quantity,
        ...(item.customAttributes && { customAttributes: item.customAttributes }),
      }));

      const checkoutWithItems = await shopifyClient.checkout.addLineItems(
        checkout.id,
        shopifyLineItems
      );

      if (checkoutWithItems && checkoutWithItems.webUrl) {
        setCheckoutUrl(checkoutWithItems.webUrl);
        // 3. Redirect to Shopify's hosted checkout page
        window.location.href = checkoutWithItems.webUrl;
      } else {
        throw new Error('Failed to add items to checkout or retrieve checkout URL.');
      }
    } catch (e: any) {
      console.error('Shopify Checkout Error:', e);
      setError(e instanceof Error ? e : new Error('An unknown error occurred during checkout.'));
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