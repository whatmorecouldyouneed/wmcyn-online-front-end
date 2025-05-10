import React from 'react';
import { useShopifyCart, CartItem } from '@/contexts/CartContext';
import { useShopifyCheckout, LineItemToAdd } from '@/hooks/useShopifyCheckout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faTrash } from '@fortawesome/free-solid-svg-icons';

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
            {cartItems.map((item: CartItem) => (
              <div key={item.variantId} style={itemStyle}>
                <img src={item.imageSrc} alt={item.title} style={itemImageStyle} />
                <div style={itemDetailsStyle}>
                  <strong style={{color: '#000'}}>{item.title}</strong>
                  {item.variantTitle && <p style={{ fontSize: '0.9em', color: '#555' }}>{item.variantTitle}</p>}
                  <p style={{...textStyle, textTransform: 'none'}}>{item.price} {item.currencyCode}</p>
                </div>
                <div>
                  <input 
                    type="number" 
                    value={item.quantity} 
                    onChange={(e) => updateQuantity(item.variantId, parseInt(e.target.value))}
                    min="1"
                    style={quantityInputStyle}
                  />
                  <button onClick={() => removeFromCart(item.variantId)} style={{ background: 'transparent', border: 'none', color: 'red', cursor: 'pointer', fontSize: '1rem', paddingLeft: '10px'}}>
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
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