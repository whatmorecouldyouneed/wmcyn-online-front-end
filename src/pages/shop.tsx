/* eslint-enable @typescript-eslint/no-explicit-any */
// import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useShopifyProducts } from '../hooks/useShopifyProducts';
import ShopifyProductItem from '../components/shop/ShopifyProductItem';
import ShopifyBuy from 'shopify-buy'; // Import ShopifyBuy for the Product type
import Cart from '@/components/cart/Cart'; // Import Cart component
import { useShopifyCart } from '@/contexts/CartContext'; // Import useShopifyCart hook
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShoppingBag } from '@fortawesome/free-solid-svg-icons';

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


  if (loading) return <p>loading products...</p>;
  if (error) return <p>error fetching products: {error.message || 'unknown error'}</p>;

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
            {products.length > 0 ? (
              products.map((product: ShopifyBuy.Product) => (
                <ShopifyProductItem key={product.id.toString()} product={product} />
              ))
            ) : (
              <p>no products found.</p>
            )}
          </div>
        </div>
      </div>
      <Cart /> {/* Render the Cart modal component */}
    </>
  );
};

export default Shop;
