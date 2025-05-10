/* eslint-enable @typescript-eslint/no-explicit-any */
// import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useShopifyProducts } from '@/hooks/useShopifyProducts';
import ShopifyProductItem from '@/components/shop/ShopifyProductItem';
import ShopifyBuy from 'shopify-buy'; // Import ShopifyBuy for the Product type
import Cart from '@/components/cart/Cart'; // Import Cart component
import { useShopifyCart } from '@/contexts/CartContext'; // Import useShopifyCart hook
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShoppingBag } from '@fortawesome/free-solid-svg-icons';

// Define SerializableProduct if not already defined or imported from a shared location
// This should match the definition in useShopifyProducts.ts and ShopifyProductItem.tsx
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

const Shop: React.FC = () => { 
  const { products, loading, error } = useShopifyProducts();
  const { openCart, cartCount } = useShopifyCart(); 

  // Styles for the cart icon button - adjusted for non-sticky and no circle
  const cartIconButtonStyle: React.CSSProperties = {
    background: 'transparent', // Transparent background
    border: 'none',            // No border
    cursor: 'pointer',
    padding: '10px',          // Some padding so it's not too tight
    // position: 'absolute',  // Consider placement within layout flow
    // top: '20px',
    // right: '20px',
    fontSize: '1.5rem',       // Adjust icon size via font-size if needed
    color: '#333',            // Icon color, change as needed
    // zIndex: 1001, // May not be needed if not overlapping heavily
  };

  const cartCountBadgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: '0px',      // Adjusted for new icon style
    right: '0px',    // Adjusted for new icon style
    background: 'red',
    color: 'white',
    borderRadius: '50%',
    padding: '2px 6px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    minWidth: '20px', 
    textAlign: 'center',
  };

  const cartButtonContainerStyle: React.CSSProperties = {
    position: 'relative', // For badge positioning
    display: 'inline-block', // To keep it inline
    width: '100%', 
    textAlign: 'right',
    paddingRight: '20px', 
    marginBottom: '10px', // Add some space below the icon
  };

  if (loading) {
    return <div>loading...</div>;
  }

  if (error) {
    console.error('Shopify products error:', error);
    return <div>error loading products. please try again later.</div>;
  }

  if (!products) {
    return <div>no products found.</div>;
  }

  // Updated filter to work with SerializableProduct
  // The main validation of structure should ideally happen during serialization in useShopifyProducts
  const validProducts = products.filter((product): product is SerializableProduct => {
    // Basic check: ensure product is an object and has an id.
    // More specific checks can be added if necessary, based on SerializableProduct structure.
    if (typeof product === 'object' && product !== null && product.id) {
      // Example: Check for essential fields from SerializableProduct
      if (!product.title || !product.variants || product.variants.length === 0) {
        console.warn('Product missing essential fields after serialization:', product);
        return false;
      }
      return true;
    }
    console.warn('Invalid product object in products array:', product);
    return false;
  });

  if (validProducts.length === 0) {
    return <div>no valid products available to display.</div>;
  }

  return (
    <>
      <Head>
        <title>Shop | WMCYN</title>
        <meta name="description" content="Shop WMCYN's exclusive merchandise." />
      </Head>
      
      <div style={{ paddingTop: '20px' }}> {/* Added a wrapper div for layout control */}
        <div style={cartButtonContainerStyle}>
            <button onClick={openCart} style={cartIconButtonStyle} aria-label="open cart">
                <FontAwesomeIcon icon={faShoppingBag} size="lg" />
                {cartCount > 0 && (
                <span style={cartCountBadgeStyle}>{cartCount}</span>
                )}
            </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center'}}> 
          <h1>friends and family</h1>
          <p style={{ textAlign: 'center', maxWidth: '600px', margin: '20px 0' }}>
            welcome fam
            <br />
            scan to see your product come alive
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
            {validProducts.map((product) => (
              <ShopifyProductItem 
                key={product.id} 
                product={product} 
              />
            ))}
          </div>
        </div>
      </div>
      <Cart /> {/* Render the Cart modal component */}
    </>
  );
};

export default Shop;
