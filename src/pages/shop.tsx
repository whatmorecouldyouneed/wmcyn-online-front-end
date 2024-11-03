import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

declare global {
  interface Window {
    shopifyScriptInitialized?: boolean;
    ShopifyBuy?: {
      buildClient: (options: { domain: string; storefrontAccessToken: string }) => unknown;
      UI: {
        onReady: (client: unknown) => Promise<{ createComponent: Function }>;
      };
    };
    ShopifyBuyInit?: () => void;
  }
}

const Shop = () => {
  const router = useRouter();

  // Check user access on initial load
  useEffect(() => {
    const hasAccess = localStorage.getItem('hasAccessToShop');
    if (!hasAccess) {
      router.push('/'); // Redirect to home if access flag is not set
    }
  }, [router]);

  // Initialize Shopify Buy Button script if not already initialized
  useEffect(() => {
    if (window.shopifyScriptInitialized) return; // Prevent multiple script loads

    // Set initialization flag
    window.shopifyScriptInitialized = true;

    // Define the ShopifyBuyInit function
    window.ShopifyBuyInit = function () {
      const client = window.ShopifyBuy?.buildClient({
        domain: 'wmcyn-online-shop.myshopify.com',
        storefrontAccessToken: '4c1fff0b93d13d31f5cebbb8ac9f10c0',
      });

      if (client && window.ShopifyBuy?.UI) {
        window.ShopifyBuy.UI.onReady(client).then((ui) => {
          (ui as { createComponent: Function }).createComponent('product', {
            id: '8779870208235',
            node: document.getElementById('product-component-1730653944519'),
            moneyFormat: '%24%7B%7Bamount%7D%7D',
            options: {
              product: {
                styles: {
                  product: {
                    '@media (min-width: 601px)': {
                      'max-width': '100%',
                      'margin-left': '0',
                      'margin-bottom': '50px',
                    },
                    'text-align': 'center',
                  },
                  title: { 'font-size': '26px' },
                  button: {
                    'font-family': 'Montserrat, sans-serif',
                    'font-weight': 'bold',
                    'font-size': '14px',
                    'padding-top': '15px',
                    'padding-bottom': '15px',
                    ':hover': { 'background-color': '#000000' },
                    'background-color': '#000000',
                    ':focus': { 'background-color': '#000000' },
                    'border-radius': '4px',
                    'padding-left': '30px',
                    'padding-right': '30px',
                  },
                  quantityInput: { 'font-size': '14px', 'padding-top': '15px', 'padding-bottom': '15px' },
                  price: { 'font-size': '18px' },
                  compareAt: { 'font-size': '15.3px' },
                  unitPrice: { 'font-size': '15.3px' },
                },
                buttonDestination: 'checkout',
                layout: 'horizontal',
                contents: { img: false, imgWithCarousel: true, description: true },
                width: '100%',
                text: { button: 'Buy now' },
                googleFonts: ['Montserrat'],
              },
              cart: {
                styles: {
                  button: {
                    'font-family': 'Montserrat, sans-serif',
                    'font-weight': 'bold',
                    'font-size': '14px',
                    'padding-top': '15px',
                    'padding-bottom': '15px',
                    ':hover': { 'background-color': '#000000' },
                    'background-color': '#000000',
                    ':focus': { 'background-color': '#000000' },
                    'border-radius': '4px',
                  },
                },
                text: { total: 'Subtotal', button: 'Checkout' },
                googleFonts: ['Montserrat'],
              },
            },
          });
        });
      }
    };

    // Load Shopify Buy Button script
    const scriptURL = 'https://sdks.shopifycdn.com/buy-button/latest/buy-button-storefront.min.js';
    const script = document.createElement('script');
    script.src = scriptURL;
    script.async = true;
    script.onload = () => {
      if (window.ShopifyBuyInit) {
        window.ShopifyBuyInit();
      }
    };
    document.head.appendChild(script);
  }, []);

  return (
    <>
      <Head>
        <title>Shop | WMCYN</title>
        <meta name="description" content="Shop WMCYN's exclusive merchandise." />
      </Head>
      <div>
        <div id="product-component-1730653944519"></div>
      </div>
    </>
  );
};

export default Shop;
