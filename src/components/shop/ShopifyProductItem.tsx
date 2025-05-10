import { useRef, useState, useEffect } from 'react';
import { useShopifyBuyButton } from '@/hooks/useShopifyBuyButton';
import { useShopifyCheckout, LineItemToAdd } from '@/hooks/useShopifyCheckout';
import { useShopifyCart } from '@/contexts/CartContext';
import { defaultShopifyButtonStyles } from '@/styles/shopifyStyles';
import Image from 'next/image';

// swiper imports
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperCore } from 'swiper';
import { Navigation, Thumbs, Pagination } from 'swiper/modules';

// swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/thumbs';

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

interface ShopifyProductItemProps {
  product: SerializableProduct;
}

const ShopifyProductItem: React.FC<ShopifyProductItemProps> = ({ product }) => {
  const buyButtonRef = useRef<HTMLDivElement>(null);
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperCore | null>(null);
  
  const { addToCart } = useShopifyCart();
  const { 
    createShopifyCheckout, 
    loading: buyNowLoading, 
    error: buyNowError 
  } = useShopifyCheckout();
  
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // validate product id early for the hook
  const productId = product.id;

  useShopifyBuyButton(buyButtonRef, productId, {
    moneyFormat: '%24%7B%7Bamount%7D%7D',
    options: defaultShopifyButtonStyles, 
  });

  // Add safety checks for product data
  if (!product || typeof product !== 'object') {
    console.error('Invalid product data:', product);
    return null;
  }

  if (!product.images || !Array.isArray(product.images)) {
    console.error('Product missing images array:', product);
    return null;
  }

  if (!product.variants || !Array.isArray(product.variants) || product.variants.length === 0) {
    console.error('Product missing valid variants:', product);
    return null;
  }

  if (!product.title) {
    console.error('Product missing title:', product);
    return null;
  }

  const firstVariant = product.variants[0];
  if (!firstVariant || !firstVariant.price || typeof firstVariant.price.amount !== 'string') {
    console.error('Product missing valid price:', product);
    return null;
  }

  const cardStyle: React.CSSProperties = {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '20px',
    margin: '20px',
    maxWidth: '350px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  };

  // Style for the main SwiperSlide, defines its height
  const mainSlideStyle: React.CSSProperties = {
    height: '300px', 
    position: 'relative', // Needed for Next/Image with fill
  };

  // Style for the Next/Image component in the main slider
  const mainImageStyle: React.CSSProperties = {
    objectFit: 'contain',
  };
  
  // Base style for thumbnail Next/Image components (when using fill)
  const baseThumbImageStyle: React.CSSProperties = {
    objectFit: 'cover',
    cursor: 'pointer',
  };

  // Dynamically generates style for thumbnail images based on active state
  const getThumbImageStyle = (isActive: boolean): React.CSSProperties => ({
    ...baseThumbImageStyle,
    opacity: isActive ? 1 : 0.7,
    border: isActive ? '2px solid #007bff' : 'none',
  });

  const titleStyle: React.CSSProperties = {
    fontSize: '1.5em',
    fontWeight: 'bold',
    margin: '10px 0',
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: '0.9em',
    color: '#ffffff',
    marginBottom: '15px',
    maxHeight: '100px',
    overflowY: 'auto',
  };

  const priceStyle: React.CSSProperties = {
    fontSize: '1.2em',
    fontWeight: 'bold',
    color: '#ffffff',
    margin: '10px 0',
  };

  const handleAddToCart = () => {
    if (product.variants && product.variants.length > 0) {
      setIsAddingToCart(true);
      const variant = product.variants[0];
      addToCart(product, variant, 1);
      setTimeout(() => setIsAddingToCart(false), 1000);
    } else {
      console.error("No product variants available to add to cart.");
    }
  };

  const handleBuyNow = async () => {
    if (product.variants && product.variants.length > 0) {
      const variantId = product.variants[0].id;
      const lineItems: LineItemToAdd[] = [{ variantId, quantity: 1 }];
      try {
        await createShopifyCheckout(lineItems);
      } catch (e) {
        console.error("Buy Now failed from component", e);
      }
    } else {
      console.error("No product variants available for checkout.");
    }
  };

  const buttonContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%',
    marginTop: '15px',
  };

  const baseButtonStyle: React.CSSProperties = {
    padding: '12px 20px',
    border: 'none',
    borderRadius: '5px',
    fontSize: '16px',
    cursor: 'pointer',
    fontWeight: 'bold',
    width: '100%',
    textTransform: 'lowercase',
  };

  const addToCartButtonStyle: React.CSSProperties = {
    ...baseButtonStyle,
    backgroundColor: '#ffffff',
    color: '#000000',
    border: '1px solid #000000',
    opacity: isAddingToCart ? 0.7 : 1,
  };

  const buyNowButtonStyle: React.CSSProperties = {
    ...baseButtonStyle,
    backgroundColor: '#000000',
    color: '#ffffff',
    opacity: buyNowLoading ? 0.7 : 1,
  };

  return (
    <div style={cardStyle}>
      {product.images && Array.isArray(product.images) && product.images.length > 0 ? (
        <>
          <Swiper
            modules={[Navigation, Thumbs, Pagination]}
            spaceBetween={10}
            slidesPerView={1}
            navigation
            pagination={{ clickable: true }}
            thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
            style={{ width: '100%', marginBottom: '10px' }} // Main Swiper container
          >
            {product.images.map((image) => (
              <SwiperSlide key={`main-${image.id || image.src}`} style={mainSlideStyle}>
                <Image
                  src={image.src}
                  alt={image.altText || product.title || 'Product image'}
                  fill
                  style={mainImageStyle} // Only objectFit here
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority={true} // Consider adding priority for the first image
                />
              </SwiperSlide>
            ))}
          </Swiper>

          {product.images.length > 1 && (
            <Swiper
              modules={[Thumbs, Navigation]} // Navigation can be optional for thumbs
              onSwiper={setThumbsSwiper}
              spaceBetween={10}
              slidesPerView={product.images.length >= 4 ? 4 : product.images.length} // Show up to 4 thumbs
              watchSlidesProgress={true}
              freeMode={true}
              style={{ width: '100%', height: '70px', margin: '10px auto 0' }} // Thumb Swiper container
            >
              {product.images.map((image, index) => (
                <SwiperSlide 
                  key={`thumb-${image.id || index}`}
                  style={{height: '60px'}} // Slide for thumbnail
                >
                  {({ isActive }) => (
                    <div style={{ position: 'relative', width: '100%', height: '100%'}}>
                       <Image
                        src={image.src}
                        alt={`Thumbnail ${image.altText || product.title || 'Product image'}`}
                        fill
                        style={getThumbImageStyle(isActive)} // No width/height here, only objectFit, opacity etc.
                        sizes="60px"
                      />
                    </div>
                  )}
                </SwiperSlide>
              ))}
            </Swiper>
          )}
        </>
      ) : (
        <div style={{ height: '300px', width: '100%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#777', marginBottom: '20px' }}>
          No images available
        </div>
      )}

      <h2 style={titleStyle}>{product.title || 'Untitled Product'}</h2>
      {product.variants && Array.isArray(product.variants) && product.variants.length > 0 && (
        <div style={priceStyle}>
          {Number(product.variants[0].price.amount).toFixed(2)} {product.variants[0].price.currencyCode}
        </div>
      )}
      {product.descriptionHtml && typeof product.descriptionHtml === 'string' && (
        <div 
          style={descriptionStyle} 
          dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
        />
      )}
      <div ref={buyButtonRef}></div>

      <div style={buttonContainerStyle}>
        <button 
          onClick={handleAddToCart} 
          disabled={isAddingToCart || !product.variants || product.variants.length === 0} 
          style={addToCartButtonStyle}
        >
          {isAddingToCart ? 'adding...' : 'add to cart'}
        </button>
        <button 
          onClick={handleBuyNow} 
          disabled={buyNowLoading || !product.variants || product.variants.length === 0} 
          style={buyNowButtonStyle}
        >
          {buyNowLoading ? 'processing...' : 'buy now'}
        </button>
      </div>
      {buyNowError && (
        <p style={{ color: 'red', marginTop: '10px' }}>
          buy now error: {buyNowError.message}
        </p>
      )}
    </div>
  );
};

export default ShopifyProductItem; 