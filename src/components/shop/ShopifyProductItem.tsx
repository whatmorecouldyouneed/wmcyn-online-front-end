import { useRef, useState, useEffect } from 'react';
import { useShopifyBuyButton } from '@/hooks/useShopifyBuyButton';
import { useShopifyCheckout, LineItemToAdd } from '@/hooks/useShopifyCheckout';
import { useShopifyCart } from '@/contexts/CartContext';
import { defaultShopifyButtonStyles } from '@/styles/shopifyStyles';
import styles from './ShopifyProductItem.module.scss';

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

export default function ShopifyProductItem({ product }: ShopifyProductItemProps) {
  const buyButtonRef = useRef<HTMLDivElement>(null);
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperCore | null>(null);
  const mainSwiperRef = useRef<SwiperCore | null>(null);
  
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

  // Add effect to reset swiper position after mount
  useEffect(() => {
    if (mainSwiperRef.current) {
      setTimeout(() => {
        mainSwiperRef.current?.slideTo(0);
      }, 0);
    }
  }, [product.id]);

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

  return (
    <div className={styles.card}>
      {product.images && Array.isArray(product.images) && product.images.length > 0 ? (
        <>
          <div className={styles.mainSwiper}>
            <Swiper
              modules={[Navigation, Thumbs, Pagination]}
              spaceBetween={10}
              slidesPerView={1}
              navigation
              pagination={{ clickable: true }}
              thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
              className={styles.swiperWrapper}
              onSwiper={(swiper) => { mainSwiperRef.current = swiper; }}
              initialSlide={0}
            >
              {product.images.map((image, index) => (
                <SwiperSlide key={`main-${image.id || image.src || index}`} className={styles.mainSlide}>
                  <div className={styles.imageContainer}>
                    <img
                      src={image.src}
                      alt={image.altText || product.title || 'Product image'}
                      className={styles.mainImage}
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>

          {product.images.length > 1 && (
            <div className={styles.thumbSwiper}>
              <Swiper
                modules={[Thumbs, Navigation]}
                onSwiper={setThumbsSwiper}
                spaceBetween={5}
                slidesPerView="auto"
                watchSlidesProgress={true}
                freeMode={true}
                className={styles.swiperWrapper}
                initialSlide={0}
                centeredSlides={false}
              >
                {product.images.map((image, index) => (
                  <SwiperSlide 
                    key={`thumb-${image.id || index}`}
                    className={styles.thumbSlide}
                  >
                    {({ isActive }) => (
                      <div className={styles.thumbContainer}>
                        <img
                          src={image.src}
                          alt={`Thumbnail ${image.altText || product.title || 'Product image'}`}
                          className={`${styles.thumbImage} ${isActive ? styles.thumbImageActive : styles.thumbImageInactive}`}
                        />
                      </div>
                    )}
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          )}
        </>
      ) : (
        <div className={styles.noImages}>
          No images available
        </div>
      )}

      <h2 className={styles.title}>{product.title || 'Untitled Product'}</h2>
      {product.variants && Array.isArray(product.variants) && product.variants.length > 0 && (
        <div className={styles.price}>
          {Number(product.variants[0].price.amount).toFixed(2)} {product.variants[0].price.currencyCode}
        </div>
      )}
      {product.descriptionHtml && typeof product.descriptionHtml === 'string' && (
        <div 
          className={styles.description}
          dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
        />
      )}
      <div ref={buyButtonRef}></div>

      <div className={styles.buttonContainer}>
        <button 
          onClick={handleAddToCart} 
          disabled={isAddingToCart || !product.variants || product.variants.length === 0} 
          className={styles.addToCartButton}
        >
          {isAddingToCart ? 'adding...' : 'add to cart'}
        </button>
        <button 
          onClick={handleBuyNow} 
          disabled={buyNowLoading || !product.variants || product.variants.length === 0} 
          className={styles.buyNowButton}
        >
          {buyNowLoading ? 'processing...' : 'buy now'}
        </button>
      </div>
      {buyNowError && (
        <p className={styles.error}>
          buy now error: {buyNowError.message}
        </p>
      )}
    </div>
  );
} 