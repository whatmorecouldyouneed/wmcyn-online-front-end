import React from 'react';
import { useShopifyCart, CartItem } from '@/contexts/CartContext';
import { useShopifyCheckout, LineItemToAdd } from '@/hooks/useShopifyCheckout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faTrash } from '@fortawesome/free-solid-svg-icons';
import Image from 'next/image';

const Cart: React.FC = () => {
  const { 
    cartItems, 
    isCartOpen, 
    closeCart, 
    removeFromCart, 
    updateQuantity, 
    cartTotal, 
    cartCount 
  } = useShopifyCart();
  const { createShopifyCheckout, loading: checkoutLoading, error: checkoutError } = useShopifyCheckout();

  const removeButtonStyle = {
    background: 'transparent',
    border: 'none',
    color: 'red',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: '5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  if (!isCartOpen) {
    return null;
  }

  const handleCheckout = async () => {
    const lineItems: LineItemToAdd[] = cartItems.map(item => ({
      variantId: item.variantId,
      quantity: item.quantity,
    }));
    if (lineItems.length > 0) {
      await createShopifyCheckout(lineItems);
    } else {
      alert('your cart is empty.');
    }
  };

  // Basic styling - consider moving to a CSS module or styled-components
  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  };

  const modalContentStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '80vh',
    overflowY: 'auto',
    position: 'relative',
    color: '#333',
  };

  const closeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: 'transparent',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#333',
  };

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '15px',
    borderBottom: '1px solid #eee',
    paddingBottom: '10px',
  };

  const itemImageStyle: React.CSSProperties = {
    width: '60px',
    height: '60px',
    objectFit: 'cover',
    marginRight: '15px',
    borderRadius: '4px',
  };

  const itemDetailsStyle: React.CSSProperties = {
    flexGrow: 1,
  };

  const quantityInputStyle: React.CSSProperties = {
    width: '50px',
    textAlign: 'center',
    margin: '0 10px',
    color: '#333',
    border: '1px solid #ccc',
    padding: '5px',
  };
  
  const checkoutButtonStyle: React.CSSProperties = {
    backgroundColor: '#000000',
    color: '#ffffff',
    padding: '12px 20px',
    border: 'none',
    borderRadius: '5px',
    fontSize: '16px',
    cursor: 'pointer',
    fontWeight: 'bold',
    width: '100%',
    marginTop: '20px',
    opacity: checkoutLoading ? 0.7 : 1,
    textTransform: 'lowercase',
  };

  const titleStyle: React.CSSProperties = {
    color: '#000',
    marginBottom: '20px',
    textTransform: 'lowercase',
  };

  const textStyle: React.CSSProperties = {
    color: '#333',
    fontSize: '0.9em',
    textTransform: 'lowercase',
  };

  const errorTextStyle: React.CSSProperties = {
    color: 'red',
    marginTop: '10px',
    textTransform: 'lowercase',
  };

  // Add a wrapper component for cart item images
  const CartItemImage: React.FC<{
    src: string;
    alt: string;
  }> = ({ src, alt }) => (
    <div style={{ position: 'relative', width: '60px', height: '60px' }}>
      <Image
        src={src}
        alt={alt}
        fill
        style={{ objectFit: 'cover' }}
        sizes="60px"
      />
    </div>
  );

  return (
    <div style={modalOverlayStyle} onClick={closeCart}>
      <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
        <button style={closeButtonStyle} onClick={closeCart}>
          <FontAwesomeIcon icon={faTimes} />
        </button>
        <h2 style={titleStyle}>your cart</h2>
        {cartItems.length === 0 ? (
          <p style={textStyle}>your cart is empty.</p>
        ) : (
          <>
            {cartItems.map((item) => (
              <div key={item.variantId} style={itemStyle}>
                {item.imageSrc && (
                  <CartItemImage
                    src={item.imageSrc}
                    alt={item.title}
                  />
                )}
                <div style={{ marginLeft: '10px', flex: 1 }}>
                  <h3 style={{ margin: '0 0 5px 0' }}>{item.title}</h3>
                  {item.variantTitle && (
                    <p style={{ margin: '0 0 5px 0', fontSize: '0.9em', color: '#666' }}>
                      {item.variantTitle}
                    </p>
                  )}
                  <p style={{ margin: '0 0 5px 0' }}>
                    {item.price} {item.currencyCode} x {item.quantity}
                  </p>
                </div>
                <button
                  onClick={() => removeFromCart(item.variantId)}
                  style={removeButtonStyle}
                  aria-label="Remove item"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            ))}
            <div style={{ marginTop: '20px', textAlign: 'right', fontWeight: 'bold' }}>
              <p style={textStyle}>subtotal: {cartTotal.toFixed(2)} {cartItems[0]?.currencyCode}</p>
              <p style={textStyle}>items: {cartCount}</p>
            </div>
            <button onClick={handleCheckout} disabled={checkoutLoading} style={checkoutButtonStyle}>
              {checkoutLoading ? 'processing...' : 'checkout'}
            </button>
            {checkoutError && <p style={errorTextStyle}>error: {checkoutError.message}</p>}
          </>
        )}
      </div>
    </div>
  );
};

export default Cart; 