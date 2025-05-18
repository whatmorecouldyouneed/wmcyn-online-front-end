import { useShopifyCart } from '@/contexts/CartContext';
import { useShopifyCheckout } from '@/hooks/useShopifyCheckout';
import Image from 'next/image';
import styles from './Cart.module.scss';

interface CartItemImageProps {
  src: string;
  alt: string;
}

function CartItemImage({ src, alt }: CartItemImageProps) {
  return (
    <div className={styles.imageContainer}>
      <Image
        src={src}
        alt={alt}
        fill
        className={styles.image}
      />
    </div>
  );
}

export default function Cart({ isOpen, closeCart }: { isOpen: boolean; closeCart: () => void }) {
  const { cartItems, removeFromCart, cartCount, cartTotal } = useShopifyCart();
  const { createShopifyCheckout, loading: checkoutLoading, error: checkoutError } = useShopifyCheckout();

  if (!isOpen) return null;

  const handleCheckout = async () => {
    const lineItems = cartItems.map(item => ({
      variantId: item.variantId,
      quantity: item.quantity
    }));
    await createShopifyCheckout(lineItems);
  };

  return (
    <div className={styles.modalOverlay} onClick={closeCart}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={closeCart}>
          ×
        </button>
        <h2 className={styles.title}>your cart</h2>
        {cartItems.length === 0 ? (
          <p className={styles.text}>your cart is empty.</p>
        ) : (
          <>
            {cartItems.map((item) => (
              <div key={item.variantId} className={styles.item}>
                <CartItemImage src={item.image} alt={item.title} />
                <div className={styles.itemDetails}>
                  <h3 className={styles.itemTitle}>{item.title}</h3>
                  {item.variantTitle && (
                    <p className={styles.itemVariant}>
                      {item.variantTitle}
                    </p>
                  )}
                  <p className={styles.itemPrice}>
                    {item.price} {item.currencyCode}
                  </p>
                  <button
                    onClick={() => removeFromCart(item.variantId)}
                    className={styles.removeButton}
                  >
                    remove
                  </button>
                </div>
              </div>
            ))}
            <div className={styles.summary}>
              <p className={styles.text}>subtotal: {cartTotal.toFixed(2)} {cartItems[0]?.currencyCode}</p>
              <p className={styles.text}>items: {cartCount}</p>
              <button 
                onClick={handleCheckout} 
                disabled={checkoutLoading} 
                className={styles.checkoutButton}
              >
                {checkoutLoading ? 'processing...' : 'checkout'}
              </button>
              {checkoutError && <p className={styles.errorText}>error: {checkoutError.message}</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
} 