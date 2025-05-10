import React, { createContext, useContext, useState, useEffect } from 'react';

// define the serialized product type
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

export interface CartItem {
  variantId: string;
  productId: string;
  handle: string;
  title: string;
  variantTitle?: string;
  imageSrc?: string;
  quantity: number;
  price: string;
  currencyCode: string;
}

interface CartContextType {
  cartItems: CartItem[];
  isCartOpen: boolean;
  cartCount: number;
  cartTotal: number;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (product: SerializableProduct, variant: SerializableProduct['variants'][0], quantity: number) => void;
  removeFromCart: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useShopifyCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useShopifyCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: React.ReactNode;
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

  const addToCart = (product: SerializableProduct, variant: SerializableProduct['variants'][0], quantity: number) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.variantId === variant.id);
      if (existingItem) {
        return prevItems.map(item =>
          item.variantId === variant.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        const newItem: CartItem = {
          variantId: variant.id,
          productId: product.id,
          handle: product.handle,
          title: product.title,
          variantTitle: variant.title === 'Default Title' ? undefined : variant.title,
          imageSrc: variant.image?.src || product.images[0]?.src,
          quantity,
          price: variant.price.amount,
          currencyCode: variant.price.currencyCode,
        };
        return [...prevItems, newItem];
      }
    });
  };

  const removeFromCart = (variantId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.variantId !== variantId));
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(variantId);
      return;
    }
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.variantId === variantId
          ? { ...item, quantity }
          : item
      )
    );
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
        openCart,
        closeCart,
        addToCart,
        removeFromCart,
        updateQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}; 