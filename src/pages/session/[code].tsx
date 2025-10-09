import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Loader3DLogo from '@/components/Loader3DLogo';
import ModelViewer from '@/components/ModelViewer';
import ShopifyProductItem from '@/components/shop/ShopifyProductItem';
import { fetchQRCode, type QRResponse } from '@/utils/api';

// product type compatible with ShopifyProductItem
interface SerializableProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  descriptionHtml: string;
  images: Array<{ id: string; src: string; altText: string | null }>; 
  variants: Array<{ id: string; title: string; price: { amount: string; currencyCode: string }; image?: { src: string; altText: string | null } }>;
}

export default function SessionPage() {
  const router = useRouter();
  const { code } = router.query as { code?: string };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<QRResponse | null>(null);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchQRCode(code)
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof Error && e.message === 'expired_or_invalid') {
          setError('expired');
        } else {
          setError('failed');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16,
        background: 'radial-gradient(1200px 600px at 50% -20%, rgba(100,120,255,0.12), rgba(10,10,20,1))',
      }}>
        <Loader3DLogo size={200} />
        <div style={{ color: 'white', fontFamily: 'var(--font-outfit), sans-serif', opacity: 0.8 }}>loading…</div>
      </div>
    );
  }

  if (error === 'expired') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12,
        background: 'linear-gradient(180deg, rgba(20,20,30,1), rgba(10,10,15,1))'
      }}>
        <div style={{ color: 'white', fontSize: 22, letterSpacing: '-0.01em' }}>this code is no longer valid</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href="/shop" style={{ color: 'white', textDecoration: 'underline', opacity: 0.9 }}>shop</a>
          <a href="/" style={{ color: 'white', textDecoration: 'underline', opacity: 0.9 }}>home</a>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        something went wrong. try again later.
      </div>
    );
  }

  if (!data) return null;

  // render by target type
  if (data.target?.type === 'product') {
    const product: SerializableProduct | null = normalizeProductFromMetadata(data.metadata);
    return (
      <div style={{ minHeight: '100vh', padding: 16, color: 'white', fontFamily: 'var(--font-outfit), sans-serif' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {data.assetUrl ? (
              <ModelViewer src={data.assetUrl} width={580} height={420} />
            ) : (
              product?.images?.[0]?.src ? (
                <img src={product.images[0].src} alt={product.title || 'product'} style={{ maxWidth: '100%', borderRadius: 12 }} />
              ) : (
                <div style={{ opacity: 0.8 }}>no asset available</div>
              )
            )}
          </div>
          <div>
            {product ? (
              <ShopifyProductItem product={product} />
            ) : (
              <div>product information unavailable</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (data.target?.type === 'session') {
    return (
      <div style={{ minHeight: '100vh', padding: 16, color: 'white', fontFamily: 'var(--font-outfit), sans-serif' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {data.assetUrl ? (
              <ModelViewer src={data.assetUrl} width={580} height={420} />
            ) : (
              <div style={{ opacity: 0.8 }}>session preview not available</div>
            )}
          </div>
          <div>
            <h1 style={{ marginTop: 0, marginBottom: 12, fontWeight: 600, fontSize: 28 }}>{data.metadata?.title || 'session'}</h1>
            <p style={{ opacity: 0.9, lineHeight: 1.5 }}>{data.metadata?.description || 'no description'}</p>
            {data.metadata?.creator && (
              <p style={{ opacity: 0.8 }}>by {data.metadata.creator}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
      unsupported target
    </div>
  );
}

function normalizeProductFromMetadata(meta: any): SerializableProduct | null {
  if (!meta) return null;
  // minimal normalization to what ShopifyProductItem expects
  const title = meta.title || meta.name || 'untitled';
  const priceAmount = meta.price?.amount?.toString?.() || meta.price?.toString?.() || '0.00';
  const currency = meta.price?.currencyCode || meta.currency || 'USD';
  const imageSrc = meta.image || meta.imageUrl || meta.images?.[0];
  const variantId = meta.variantId || meta.variants?.[0]?.id || 'variant';
  const productId = meta.id || meta.productId || 'product';

  return {
    id: String(productId),
    title: String(title),
    handle: meta.handle || String(productId),
    description: meta.description || '',
    descriptionHtml: meta.descriptionHtml || meta.description || '',
    images: imageSrc ? [{ id: 'img', src: String(imageSrc), altText: title }] : [],
    variants: [
      {
        id: String(variantId),
        title: meta.variantTitle || 'Default Title',
        price: { amount: String(priceAmount), currencyCode: String(currency) },
        image: imageSrc ? { src: String(imageSrc), altText: title } : undefined,
      },
    ],
  };
}



