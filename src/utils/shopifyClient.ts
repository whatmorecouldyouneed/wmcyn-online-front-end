import ShopifyBuy from 'shopify-buy';

// validate required environment variables
const requiredEnvVars = {
  domain: process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN,
  storefrontAccessToken: process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN,
};

// create a client that will be initialized on the client side
let client: ReturnType<typeof ShopifyBuy.buildClient> | null = null;

// initialize the client only on the client side
const getClient = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!client) {
    // check for missing environment variables
    const missingVars = Object.entries(requiredEnvVars)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      console.error('Missing required Shopify environment variables:', missingVars);
      throw new Error(`Missing required Shopify environment variables: ${missingVars.join(', ')}`);
    }

    // log the domain being used (without the token for security)
    console.log('Initializing Shopify client with domain:', requiredEnvVars.domain);

    try {
      client = ShopifyBuy.buildClient({
        domain: requiredEnvVars.domain!,
        storefrontAccessToken: requiredEnvVars.storefrontAccessToken!,
        apiVersion: '2024-01',
      });

      // wrap the client's fetchAll method to add better error handling
      const originalFetchAll = client.product.fetchAll;
      client.product.fetchAll = async () => {
        try {
          console.log('Attempting to fetch products from Shopify...');
          const products = await originalFetchAll();
          console.log('Successfully fetched products:', products.length);
          return products;
        } catch (error) {
          console.error('Error fetching products from Shopify:', error);
          // log additional details about the error
          if (error instanceof Error) {
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
          }
          throw error;
        }
      };
    } catch (error) {
      console.error('Error initializing Shopify client:', error);
      throw error;
    }
  }

  return client;
};

export default getClient; 