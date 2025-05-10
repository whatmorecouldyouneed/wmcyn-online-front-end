import { useEffect, RefObject } from 'react';
import getClient from '@/utils/shopifyClient';

// type definition for styles, can be deeply nested
interface ShopifyStyles {
  [key: string]: string | number | ShopifyStyles;
}

interface ShopifyComponentTextOptions {
  button?: string;
  outOfStock?: string;
  unavailable?: string;
  title?: string;
  empty?: string;
  total?: string;
  currency?: string;
  notice?: string;
  noteDescription?: string;
  nextPageButton?: string;
  // other text options as needed
}

interface ShopifyProductContentsOptions {
  img?: boolean;
  imgWithCarousel?: boolean;
  title?: boolean;
  variantTitle?: boolean;
  price?: boolean;
  options?: boolean;
  quantity?: boolean;
  quantityIncrement?: boolean;
  quantityDecrement?: boolean;
  quantityInput?: boolean;
  button?: boolean;
  description?: boolean;
  // other content toggles as needed
}

interface ShopifyCartContentsOptions {
  title?: boolean;
  lineItems?: boolean;
  footer?: boolean;
  note?: boolean;
  discounts?: boolean;
  // other content toggles as needed
}

interface ShopifyProductOptions {
  styles?: ShopifyStyles; // a more specific type for styles can be created if needed
  buttonDestination?: 'cart' | 'modal' | 'checkout' | 'onlineStore';
  layout?: 'vertical' | 'horizontal';
  width?: string; // e.g., '240px'
  isButton?: boolean;
  contents?: ShopifyProductContentsOptions;
  text?: ShopifyComponentTextOptions;
  googleFonts?: string[];
  // other product-specific options
}

interface ShopifyCartOptions {
  styles?: ShopifyStyles;
  startOpen?: boolean;
  popup?: boolean;
  contents?: ShopifyCartContentsOptions;
  text?: ShopifyComponentTextOptions;
  googleFonts?: string[];
  // other cart-specific options
}

// main options structure for the hook
export interface ShopifyBuyButtonOptions {
  product?: ShopifyProductOptions;
  cart?: ShopifyCartOptions;
  modal?: Record<string, any>; // further typing can be added if modal is used
  productSet?: Record<string, any>; // further typing for productSet
  toggle?: Record<string, any>; // further typing for toggle
  modalProduct?: Record<string, any>; // further typing for modalProduct
  option?: Record<string, any>; // further typing for option selectors
  lineItem?: Record<string, any>; // further typing for lineItem
  // add other top-level component options if necessary
}

export interface HookOptions {
  moneyFormat?: string;
  options?: ShopifyBuyButtonOptions;
}

export function useShopifyBuyButton(
  containerRef: RefObject<HTMLElement>,
  productId: string,
  { moneyFormat = '${{amount}}', options = {} }: HookOptions = {}
) {
  useEffect(() => {
    const scriptId = 'shopify-buy-button';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const initialize = () => {
      if (!(window as any).ShopifyBuy || !(window as any).ShopifyBuy.UI) return;
      (window as any).ShopifyBuy.UI.onReady(getClient).then((ui: any) => {
        ui.createComponent('product', {
          id: productId,
          node: containerRef.current,
          moneyFormat,
          options,
        });
      });
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://sdks.shopifycdn.com/buy-button/latest/buy-button-storefront.min.js';
      script.async = true;
      document.head.appendChild(script);
      script.onload = initialize;
    } else {
      // if script already exists, check if ShopifyBuy UI is ready, otherwise wait for onload (though less common path)
      if ((window as any).ShopifyBuy && (window as any).ShopifyBuy.UI) {
        initialize();
      } else if (script.onload) { // if onload is set but not fired (rare), let it fire
         // it is already set to initialize
      } else { // script exists, but UI not ready and no onload attached, set it.
        script.onload = initialize;
      }
    }

    // cleanup function to remove the script if the component unmounts and no other component is using it.
    // this is a basic check; a more robust system might use a ref count for the script.
    return () => {
      const buyButtonScript = document.getElementById(scriptId);
      // consider a more sophisticated check if multiple buy buttons might be on different pages
      // and you want to unload the script when the last one is gone.
      // for now, this basic cleanup will not remove the script to avoid issues if other instances rely on it.
      // if (buyButtonScript && !document.querySelector('[data-shopify-buy-button]')) { // example of a check
      //   buyButtonScript.remove();
      // }
    };
  }, [containerRef, productId, moneyFormat, options]);
} 