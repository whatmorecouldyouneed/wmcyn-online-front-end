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
      console.error('missing required shopify environment variables:', missingVars);
      throw new Error(`missing required shopify environment variables: ${missingVars.join(', ')}`);
    }

    // log the domain being used (without the token for security)
    console.log('initializing shopify client with domain:', requiredEnvVars.domain);

    try {
      // ensure the domain is properly formatted
      const domain = requiredEnvVars.domain!.replace(/^https?:\/\//, '').replace(/\/$/, '');
      
      client = ShopifyBuy.buildClient({
        domain,
        storefrontAccessToken: requiredEnvVars.storefrontAccessToken!,
        apiVersion: '2024-01',
      });

      // verify client initialization
      if (!client || !client.product) {
        throw new Error('failed to initialize shopify client');
      }
    } catch (error) {
      console.error('error initializing shopify client:', error);
      client = null; // reset client on error
      throw error;
    }
  }

  if (!client) {
    throw new Error('failed to initialize shopify client');
  }

  return client;
};

export default getClient; 