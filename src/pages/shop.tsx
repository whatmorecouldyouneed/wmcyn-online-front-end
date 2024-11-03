import { useEffect } from 'react';
import Head from 'next/head';

declare global {
  interface Window {
    shopifyScriptInitialized?: boolean;
    ShopifyBuy?: any;
    ShopifyBuyInit?: () => void;
  }
}

const Shop = () => {
  useEffect(() => {
    // Declare a custom window property to track initialization

    // If already initialized, don't proceed
    if (window.shopifyScriptInitialized) {
      return;
    }

    // Set initialization flag
    window.shopifyScriptInitialized = true;

    // Define the initialization function globally so it's accessible
    window.ShopifyBuyInit = function() {
      const client = window.ShopifyBuy.buildClient({
        domain: 'wmcyn-online-shop.myshopify.com',
        storefrontAccessToken: '4c1fff0b93d13d31f5cebbb8ac9f10c0',
      });

      window.ShopifyBuy.UI.onReady(client).then(function (ui: any) {
        ui.createComponent('product', {
          id: '8779870208235',
          node: document.getElementById('product-component-1730653944519'),
          moneyFormat: '%24%7B%7Bamount%7D%7D',
          options: {
            "product": {
              "styles": {
                "product": {
                  "@media (min-width: 601px)": {
                    "max-width": "100%",
                    "margin-left": "0",
                    "margin-bottom": "50px"
                  },
                  "text-align": "center"
                },
                "title": {
                  "font-size": "26px"
                },
                "button": {
                  "font-family": "Montserrat, sans-serif",
                  "font-weight": "bold",
                  "font-size": "14px",
                  "padding-top": "15px",
                  "padding-bottom": "15px",
                  ":hover": {
                    "background-color": "#000000"
                  },
                  "background-color": "#000000",
                  ":focus": {
                    "background-color": "#000000"
                  },
                  "border-radius": "4px",
                  "padding-left": "30px",
                  "padding-right": "30px"
                },
                "quantityInput": {
                  "font-size": "14px",
                  "padding-top": "15px",
                  "padding-bottom": "15px"
                },
                "price": {
                  "font-size": "18px"
                },
                "compareAt": {
                  "font-size": "15.299999999999999px"
                },
                "unitPrice": {
                  "font-size": "15.299999999999999px"
                }
              },
              "buttonDestination": "checkout",
              "layout": "horizontal",
              "contents": {
                "img": false,
                "imgWithCarousel": true,
                "description": true
              },
              "width": "100%",
              "text": {
                "button": "Buy now"
              },
              "googleFonts": [
                "Montserrat"
              ]
            },
            "productSet": {
              "styles": {
                "products": {
                  "@media (min-width: 601px)": {
                    "margin-left": "-20px"
                  }
                }
              }
            },
            "modalProduct": {
              "contents": {
                "img": false,
                "imgWithCarousel": true,
                "button": false,
                "buttonWithQuantity": true
              },
              "styles": {
                "product": {
                  "@media (min-width: 601px)": {
                    "max-width": "100%",
                    "margin-left": "0px",
                    "margin-bottom": "0px"
                  }
                },
                "button": {
                  "font-family": "Montserrat, sans-serif",
                  "font-weight": "bold",
                  "font-size": "14px",
                  "padding-top": "15px",
                  "padding-bottom": "15px",
                  ":hover": {
                    "background-color": "#000000"
                  },
                  "background-color": "#000000",
                  ":focus": {
                    "background-color": "#000000"
                  },
                  "border-radius": "4px",
                  "padding-left": "30px",
                  "padding-right": "30px"
                }
              },
              "googleFonts": [
                "Montserrat"
              ],
              "text": {
                "button": "Add to cart"
              }
            },
            "cart": {
              "styles": {
                "button": {
                  "font-family": "Montserrat, sans-serif",
                  "font-weight": "bold",
                  "font-size": "14px",
                  "padding-top": "15px",
                  "padding-bottom": "15px",
                  ":hover": {
                    "background-color": "#000000"
                  },
                  "background-color": "#000000",
                  ":focus": {
                    "background-color": "#000000"
                  },
                  "border-radius": "4px"
                }
              },
              "text": {
                "total": "Subtotal",
                "button": "Checkout"
              },
              "popup": false,
              "googleFonts": [
                "Montserrat"
              ]
            },
            "toggle": {
              "styles": {
                "toggle": {
                  "font-family": "Montserrat, sans-serif",
                  "font-weight": "bold",
                  "background-color": "#000000",
                  ":hover": {
                    "background-color": "#000000"
                  },
                  ":focus": {
                    "background-color": "#000000"
                  }
                },
                "count": {
                  "font-size": "14px"
                }
              },
              "googleFonts": [
                "Montserrat"
              ]
            }
          }
        });
      });
    };

    // Function to load script
    function loadScript() {
      const scriptURL = 'https://sdks.shopifycdn.com/buy-button/latest/buy-button-storefront.min.js';
      const script = document.createElement('script');
      script.async = true;
      script.src = scriptURL;
      script.onload = () => {
        if (window.ShopifyBuyInit) {
          window.ShopifyBuyInit();
        }
      };
      document.head.appendChild(script);
    }

    // Initial load logic
    if (window.ShopifyBuy) {
      if (window.ShopifyBuy.UI) {
        window.ShopifyBuyInit();
      } else {
        loadScript();
      }
    } else {
      loadScript();
    }

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