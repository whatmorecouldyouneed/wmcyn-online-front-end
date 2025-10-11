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
import { useState } from 'react';
import styles from '@/styles/Shop.module.scss';

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

export default function Shop() {
  const { products, loading, error } = useShopifyProducts();
  const { cartCount } = useShopifyCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

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
      
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>shop</h1>
          <div className={styles.cartButtonContainer}>
            <button onClick={openCart} className={styles.cartIconButton} aria-label="open cart">
              cart
              {cartCount > 0 && (
                <span className={styles.cartCountBadge}>{cartCount}</span>
              )}
            </button>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.intro}>
            <p className={styles.introText}>
              welcome fam. <br /> browse our collection of products below.
              <br />
              scan the hiro markers on the products <br /> to see it come to life.
            </p>
          </div>

          <div className={styles.productGrid}>
            {validProducts.map((product) => (
              <ShopifyProductItem 
                key={product.id} 
                product={product} 
              />
            ))}
          </div>
        </div>
      </div>
      <Cart isOpen={isCartOpen} closeCart={closeCart} />
    </>
  );
}
