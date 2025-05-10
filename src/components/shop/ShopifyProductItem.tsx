import { useRef, useState, useEffect } from 'react';
import ShopifyBuy from 'shopify-buy';
import { useShopifyBuyButton } from '@/hooks/useShopifyBuyButton';
import { useShopifyCheckout, LineItemToAdd } from '@/hooks/useShopifyCheckout'; // Re-import for Buy Now
import { useShopifyCart } from '@/contexts/CartContext';
import { defaultShopifyButtonStyles } from '@/styles/shopifyStyles';
import type { Settings } from 'react-slick';
import Image from 'next/image';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Slider: any = require('react-slick');
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
// import useEmblaCarousel, { UseEmblaCarouselType } from 'embla-carousel-react';
// import { EmblaOptionsType, EmblaCarouselType } from 'embla-carousel';

interface ShopifyProductItemProps {
  product: ShopifyBuy.Product;
}

const ShopifyProductItem: React.FC<ShopifyProductItemProps> = ({ product }) => {
  const buyButtonRef = useRef<HTMLDivElement>(null);
  const [nav1, setNav1] = useState<any>(null);
  const [nav2, setNav2] = useState<any>(null);
  const [activeThumbIndex, setActiveThumbIndex] = useState(0);
  const sliderRef1 = useRef<any>(null);
  const sliderRef2 = useRef<any>(null);

  const { addToCart } = useShopifyCart();
  const { 
    createShopifyCheckout, 
    loading: buyNowLoading, 
    error: buyNowError 
  } = useShopifyCheckout(); // For Buy Now button
  
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // validate product id early for the hook
  const productId = product?.id ? String(product.id) : '';

  // Move the hook to the top, before any conditional returns
  useShopifyBuyButton(buyButtonRef, productId, {
    moneyFormat: '%24%7B%7Bamount%7D%7D',
    options: defaultShopifyButtonStyles, 
  });

  useEffect(() => {
    if (sliderRef1.current) {
      setNav1(sliderRef1.current);
    }
    if (sliderRef2.current) {
      setNav2(sliderRef2.current);
    }
  }, []);

  // Add safety checks for product data
  if (!product || typeof product !== 'object') {
    console.error('Invalid product data:', product);
    return null;
  }

  // add more detailed validation
  if (!product.images || !Array.isArray(product.images)) {
    console.error('Product missing images array:', product);
    return null;
  }

  if (!product.variants || !Array.isArray(product.variants) || product.variants.length === 0) {
    console.error('Product missing valid variants:', product);
    return null;
  }

  // validate product title
  if (!product.title) {
    console.error('Product missing title:', product);
    return null;
  }

  // validate product price
  const firstVariant = product.variants[0];
  if (!firstVariant || !firstVariant.price || typeof firstVariant.price.amount !== 'string') {
    console.error('Product missing valid price:', product);
    return null;
  }

  // This hook is for Shopify's own embedded button, which we might still want or phase out.
  // For now, we keep it as it might control variant selection UI that our custom buttons don't yet.
  // const options: EmblaOptionsType = { loop: false, align: 'start', containScroll: false, startIndex: 0 };
  // const [emblaRef, emblaApi] = useEmblaCarousel(options);
  // const [emblaThumbsRef, emblaThumbsApi] = useEmblaCarousel({
  //   loop: false,
  //   containScroll: 'keepSnaps',
  //   dragFree: true,
  // });
  // const [selectedIndex, setSelectedIndex] = useState(0);

  // const onThumbClick = useCallback(
  //   (index: number) => {
  //     if (!emblaApi || !emblaThumbsApi) return;
  //     emblaApi.scrollTo(index);
  //   },
  //   [emblaApi, emblaThumbsApi]
  // );

  // const onSelect = useCallback(() => {
  //   if (!emblaApi || !emblaThumbsApi) return;
  //   const currentSnap = emblaApi.selectedScrollSnap();
  //   console.log('[onSelect] emblaApi.selectedScrollSnap():', currentSnap);
  //   setSelectedIndex(currentSnap);
  //   console.log('[onSelect] setSelectedIndex to:', currentSnap);
  //   emblaThumbsApi.scrollTo(currentSnap);
  // }, [emblaApi, emblaThumbsApi, setSelectedIndex]);

  // useEffect(() => {
  //   if (!emblaApi) return;
  //   console.log('[useEffect] emblaApi is available');

  //   emblaApi.on('select', onSelect);
  //   emblaApi.on('reInit', onSelect);

  //   console.log('[useEffect] Before reInit - current snap:', emblaApi.selectedScrollSnap());
  //   emblaApi.reInit();
  //   console.log('[useEffect] After reInit - current snap:', emblaApi.selectedScrollSnap());

  //   if (emblaApi.selectedScrollSnap() !== 0) {
  //     console.log('[useEffect] Current snap is NOT 0, scrolling to 0. Current snap:', emblaApi.selectedScrollSnap());
  //     emblaApi.scrollTo(0, true);
  //   } else {
  //     console.log('[useEffect] Current snap IS 0, calling onSelect. Current snap:', emblaApi.selectedScrollSnap());
  //     onSelect();
  //   }

  //   return () => {
  //     if (emblaApi) {
  //       emblaApi.off('select', onSelect);
  //       emblaApi.off('reInit', onSelect);
  //     }
  //   };
  // }, [emblaApi, onSelect]); // emblaApi and onSelect are the key dependencies here

  const mainSliderSettings: Settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    adaptiveHeight: true,
    asNavFor: nav2 || undefined,
    arrows: true,
    afterChange: (current: number) => setActiveThumbIndex(current),
    responsive: [
      {
        breakpoint: 600,
        settings: {
          arrows: false,
        }
      }
    ]
  };

  const thumbSliderSettings: Settings = {
    slidesToShow: product.images?.length >= 3 ? 3 : Math.max(1, product.images?.length || 1),
    slidesToScroll: 1,
    asNavFor: nav1 || undefined,
    dots: false,
    centerMode: product.images?.length > 1,
    swipeToSlide: true,
    focusOnSelect: true,
    infinite: product.images?.length > (product.images?.length >= 3 ? 3 : Math.max(1, product.images?.length || 1)),
    arrows: true,
    responsive: [
      {
        breakpoint: 600,
        settings: {
          arrows: false,
        }
      }
    ]
  };

  // Basic styling for the product card
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

  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: 'auto',
    maxHeight: '300px',
    objectFit: 'contain',
    borderRadius: '4px',
    margin: '0 auto',
    border: 'none',
    outline: 'none',
  };

  const thumbWrapperStyle: React.CSSProperties = {
    padding: '5px',
    cursor: 'pointer',
    margin: '0 10px',
  };

  const activeThumbWrapperStyle: React.CSSProperties = {
    ...thumbWrapperStyle,
    // Example: add a subtle background to the wrapper of the active thumb if desired
    // backgroundColor: 'rgba(0, 123, 255, 0.1)',
  };

  const thumbImageStyle: React.CSSProperties = {
    width: '100%', // Image takes full width of its padded wrapper
    height: '60px', // Fixed height for consistency
    objectFit: 'cover',
    borderRadius: '4px',
    opacity: 0.7,
    border: 'none',
    outline: 'none',
    display: 'block', // Prevents extra space below image
  };

  const activeThumbImageStyle: React.CSSProperties = {
    ...thumbImageStyle,
    opacity: 1,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '1.5em',
    fontWeight: 'bold',
    margin: '10px 0',
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: '0.9em',
    color: '#ffffff',
    marginBottom: '15px',
    // Limit height and add scroll for long descriptions
    maxHeight: '100px',
    overflowY: 'auto',
  };

  const priceStyle: React.CSSProperties = {
    fontSize: '1.2em',
    fontWeight: 'bold',
    color: '#ffffff',         // Changed to white
    margin: '10px 0',
  };

  // console.log('Product Images:', product.images); // for debugging

  const handleAddToCart = () => {
    if (product.variants && product.variants.length > 0) {
      setIsAddingToCart(true);
      // For simplicity, add the first variant. 
      // A real app might have variant selection UI.
      const variant = product.variants[0]; 
      addToCart(product, variant, 1); // Add 1 quantity
      setTimeout(() => setIsAddingToCart(false), 1000); // Reset "Adding..." text after a short delay
    } else {
      console.error("No product variants available to add to cart.");
      // Optionally, inform the user (e.g., with a toast notification)
    }
  };

  const handleBuyNow = async () => {
    if (product.variants && product.variants.length > 0) {
      const variantId = String(product.variants[0].id);
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
    flexDirection: 'column', // Stack buttons vertically on small screens
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
    width: '100%', // Make buttons take full width of container
    textTransform: 'lowercase', // Ensure all button text is lowercase
  };

  const addToCartButtonStyle: React.CSSProperties = {
    ...baseButtonStyle,
    backgroundColor: '#ffffff', // White background
    color: '#000000',         // Black text
    border: '1px solid #000000', // Black border
    opacity: isAddingToCart ? 0.7 : 1,
  };

  const buyNowButtonStyle: React.CSSProperties = {
    ...baseButtonStyle,
    backgroundColor: '#000000', // Black background
    color: '#ffffff',         // White text
    opacity: buyNowLoading ? 0.7 : 1,
  };

  // Add a wrapper component for the slider images
  const SliderImage: React.FC<{
    src: string;
    alt: string;
    style: React.CSSProperties;
  }> = ({ src, alt, style }) => (
    <div style={{ position: 'relative', width: '100%', height: '300px' }}>
      <Image
        src={src}
        alt={alt}
        fill
        style={{ objectFit: 'contain' }}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  );

  return (
    <div style={cardStyle}>
      {/* Embla Carousel JSX commented out */}
      {/* <div className="embla" ref={emblaRef}>
        <div className="embla__container">
          {product.images && product.images.length > 0 &&
            product.images.map((image, index) => (
              <div className="embla__slide" key={image.id || index}>
                <img
                  src={image.src}
                  alt={image.altText || product.title}
                  style={imageStyle}
                />
              </div>
            ))}
        </div>
      </div> */}

      {/* React Slick Carousel */}
      {product.images && Array.isArray(product.images) && product.images.length > 0 ? (
        <div style={{ width: '100%', marginBottom: '10px' }}>
          <Slider 
            {...mainSliderSettings}
            ref={sliderRef1}
          >
            {product.images.map((image) => (
              <div key={image.id || image.src}>
                <SliderImage
                  src={image.src}
                  alt={image.altText || product.title || 'Product image'}
                  style={imageStyle}
                />
              </div>
            ))}
          </Slider>
        </div>
      ) : (
        // Optional: Placeholder if no images
        <div style={{ height: '250px', width: '100%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#777', marginBottom: '20px' }}>
          No images available
        </div>
      )}

      {/* Thumbnail Slider */}
      {product.images && Array.isArray(product.images) && product.images.length > 1 && (
        <div style={{ width: '90%', margin: '10px auto 20px auto' }}>
          <Slider
            {...thumbSliderSettings}
            ref={sliderRef2}
          >
            {product.images.map((image, index) => (
              <div 
                key={`thumb-wrapper-${image.id || index}`}
                style={index === activeThumbIndex ? activeThumbWrapperStyle : thumbWrapperStyle}
              >
                <div style={{ position: 'relative', width: '100%', height: '60px' }}>
                  <Image
                    src={image.src}
                    alt={`Thumbnail ${image.altText || product.title || 'Product image'}`}
                    fill
                    style={{ 
                      objectFit: 'cover',
                      borderRadius: '4px',
                      opacity: index === activeThumbIndex ? 1 : 0.7,
                    }}
                    sizes="60px"
                  />
                </div>
              </div>
            ))}
          </Slider>
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
      {/* The Buy Button will be rendered here by the hook */}
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