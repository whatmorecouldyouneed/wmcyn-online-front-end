import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import Head from 'next/head';
import { useShopifyProducts } from '@/hooks/useShopifyProducts'; // Adjust if needed for collection
import ShopifyProductItem from '@/components/shop/ShopifyProductItem';
import Cart from '@/components/cart/Cart';
import { useShopifyCart } from '@/contexts/CartContext';
import { useState } from 'react';
import styles from '@/styles/Shop.module.scss';

// Note: For friends-and-family, we might need to fetch a specific collection.
// Assuming all products for now; modify useShopifyProducts or create new hook for collection.

export default function FriendsAndFamily() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { products, loading, error } = useShopifyProducts();
  const { cartCount } = useShopifyCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
    }
  }, [currentUser, router]);

  if (!currentUser) {
    return null; // Or loading spinner
  }

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  if (loading) return <div>loading...</div>;
  if (error) return <div>error loading products. please try again later.</div>;
  if (!products) return <div>no products found.</div>;

  const validProducts = products.filter((product) => product.id); // Basic filter

  return (
    <>
      <Head>
        <title>Shop | WMCYN</title>
        <meta name="description" content="Exclusive WMCYN merchandise." />
      </Head>
      
      <div className={styles.container}>
        <div className={styles.header}>
          {/* dashboard button on left */}
          <button
            onClick={() => router.push('/dashboard')}
            className={styles.dashboardButton}
          >
            ← dashboard
          </button>

          {/* title centered */}
          <h1 className={styles.title}>shop</h1>

          {/* cart button on right */}
          <button onClick={openCart} className={styles.cartButton}>
            cart {cartCount > 0 && `(${cartCount})`}
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.intro} style={{ margin: '0.5rem 0' }}>
            <p className={styles.introText} style={{ margin: '0.5rem 0' }}>
              welcome to the exclusive drop.
            </p>
          </div>

          <div className={styles.productGrid}>
            {validProducts.map((product) => (
              <ShopifyProductItem key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
      <Cart isOpen={isCartOpen} closeCart={closeCart} />
    </>
  );
} 