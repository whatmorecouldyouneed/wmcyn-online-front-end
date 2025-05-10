import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import ShopifyBuy from 'shopify-buy';

// 1. Define CartItem Structure
export interface CartItem {
  variantId: string; // Shopify GID, e.g., "gid://shopify/ProductVariant/12345"
  productId: string; // Shopify GID, e.g., "gid://shopify/Product/12345"
  handle: string; // Product handle for URL generation or linking
  title: string;
  variantTitle?: string; // e.g. "Small / Red"
  imageSrc?: string;
  quantity: number;
  price: string; // Price of a single unit
  currencyCode: string;
}

// 2. Define Cart Context State and Actions
interface CartContextState {
  cartItems: CartItem[];
  isCartOpen: boolean;
  cartCount: number;
  cartTotal: number;
  addToCart: (product: ShopifyBuy.Product, variant: ShopifyBuy.ProductVariant, quantity: number) => void;
  removeFromCart: (variantId: string) => void;
  updateQuantity: (variantId: string, newQuantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  // Note: The actual checkout function will be called from the cart component, using useShopifyCheckout
}

// 3. Create Context
const CartContext = createContext<CartContextState | undefined>(undefined);

// 4. Create Provider Component
interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [cartCount, setCartCount] = useState<number>(0);
  const [cartTotal, setCartTotal] = useState<number>(0);

  // Load cart from localStorage on initial render
  useEffect(() => {
    const storedCart = localStorage.getItem('shopify_cart');
    if (storedCart) {
      setCartItems(JSON.parse(storedCart));
    }
  }, []);

  // Update localStorage and cart count/total whenever cartItems change
  useEffect(() => {
    localStorage.setItem('shopify_cart', JSON.stringify(cartItems));
    let count = 0;
    let total = 0;
    cartItems.forEach(item => {
      count += item.quantity;
      total += parseFloat(item.price) * item.quantity;
    });
    setCartCount(count);
    setCartTotal(total);
  }, [cartItems]);

  const addToCart = (product: ShopifyBuy.Product, variant: ShopifyBuy.ProductVariant, quantity: number) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.variantId === String(variant.id));
      if (existingItem) {
        return prevItems.map(item =>
          item.variantId === String(variant.id)
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        const newItem: CartItem = {
          variantId: String(variant.id),
          productId: String(product.id),
          handle: product.handle,
          title: product.title,
          variantTitle: variant.title === 'Default Title' ? undefined : variant.title,
          imageSrc: variant.image?.src || product.images[0]?.src,
          quantity,
          price: String(variant.price.amount),
          currencyCode: variant.price.currencyCode,
        };
        return [...prevItems, newItem];
      }
    });
  };

  const removeFromCart = (variantId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.variantId !== variantId));
  };

  const updateQuantity = (variantId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(variantId);
    } else {
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.variantId === variantId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        isCartOpen,
        cartCount,
        cartTotal,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        openCart,
        closeCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// 5. Create Hook to use Cart Context
export const useShopifyCart = (): CartContextState => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useShopifyCart must be used within a CartProvider');
  }
  return context;
}; 