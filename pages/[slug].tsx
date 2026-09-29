import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import OgProductLanding from '@/components/OgProductLanding';
import { type MarkerConfig } from '@/config/markers';
import { getPublicProductSetBySlug } from '@/lib/apiClient';
import type { PublicProductSet } from '@/types/productSets';
import styles from '@/styles/Index.module.scss';

const SITE_URL = 'https://wmcyn.online';
const DEFAULT_MODEL_URL = '/models/wmcyn_3d_logo.glb';

type State =
  | { status: 'loading' }
  | { status: 'ready'; product: PublicProductSet }
  | { status: 'not-ready'; product: PublicProductSet }
  | { status: 'not-found' }
  | { status: 'error' };

function toMarker(product: PublicProductSet, mindTargetSrc: string): MarkerConfig {
  return {
    name: product.slug,
    modelUrl: product.modelUrl || DEFAULT_MODEL_URL,
    scale: product.scale ?? 1.2,
    yOffset: product.yOffset ?? 0,
    rotationOffset: product.rotationOffset,
    markerType: 'nft',
    mindTargetSrc,
    label: 'wmcyn ar experience',
    metadata: {
      title: product.name,
      description: product.description || '',
      actions: [],
    },
  };
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        <div style={{ textAlign: 'center', color: 'white', maxWidth: 420 }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 300, marginBottom: '12px' }}>{title}</h1>
          <p style={{ opacity: 0.7, marginBottom: '24px' }}>{body}</p>
          <Link href="/" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            ← back to wmcyn.online
          </Link>
        </div>
      </div>
    </div>
  );
}

// product landing pages created in /admin; served from the api so a new product needs no deploy
export default function ProductSlugPage() {
  const router = useRouter();
  const slug = typeof router.query.slug === 'string' ? router.query.slug.toLowerCase() : '';
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    if (!router.isReady || !slug) return;
    let cancelled = false;
    setState({ status: 'loading' });

    getPublicProductSetBySlug(slug)
      .then((product) => {
        if (cancelled) return;
        setState(product.nftMarker?.mindFileUrl ? { status: 'ready', product } : { status: 'not-ready', product });
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setState(/not found/i.test(error.message) ? { status: 'not-found' } : { status: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, [router.isReady, slug]);

  if (state.status === 'loading') {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          <div style={{ color: 'white', fontSize: '1.2rem' }}>loading...</div>
        </div>
      </div>
    );
  }

  if (state.status === 'not-found') {
    return (
      <>
        <Head>
          <title>page not found | WMCYN</title>
          <meta name="robots" content="noindex" />
        </Head>
        <Message title="page not found" body="this link doesn't go anywhere yet." />
      </>
    );
  }

  if (state.status === 'error') {
    return <Message title="something went wrong" body="we couldn't load this product. try again in a moment." />;
  }

  const { product } = state;

  if (state.status === 'not-ready') {
    return (
      <>
        <Head>
          <title>{`${product.name} | WMCYN`}</title>
        </Head>
        <Message title={product.name} body="the AR experience for this piece is coming soon." />
      </>
    );
  }

  const url = `${SITE_URL}/${product.slug}`;
  const garmentWord = product.garmentWord || 'piece';

  return (
    <OgProductLanding
      pageTitle={`${product.name} — AR experience`}
      metaDescription={product.description || `scan the logo on your ${garmentWord} to unlock the AR experience.`}
      canonicalUrl={url}
      productName={product.name}
      vibeCopy={product.description || ''}
      garmentWord={garmentWord}
      marker={toMarker(product, product.nftMarker!.mindFileUrl)}
      shareUrl={url}
    />
  );
}
