import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { useRouter } from 'next/router';
import LiquidGlassEffect from '@/components/ui/LiquidGlassEffect';
import { dyvscoStarTeeMarker, wmcynXDxscoTeeMarker, type MarkerConfig } from '@/config/markers';
import styles from '@/styles/Index.module.scss';

const ARCamera = dynamic(() => import('@/components/ARCamera'), { ssr: false });

type Product = 'dxsco-star-tee' | 'wmcyn-x-dxsco-tee';
type CameraState = 'idle' | 'allowed' | 'denied' | 'unavailable';

const PRODUCTS: Record<Product, {
  marker: MarkerConfig;
  name: string;
  vibeCopy: string;
  shareUrl: string;
}> = {
  'dxsco-star-tee': {
    marker: dyvscoStarTeeMarker,
    name: 'dxsco star tee',
    vibeCopy: '1 of 1. atlanta, ga. april 2026.',
    shareUrl: 'https://wmcyn.online/dyvsco-star-tee',
  },
  'wmcyn-x-dxsco-tee': {
    marker: wmcynXDxscoTeeMarker,
    name: 'wmcyn x dxsco collab tee',
    vibeCopy: '1 of 1. atlanta, ga. april 2026.',
    shareUrl: 'https://wmcyn.online/dyvsco-star-tee',
  },
};

export default function DyvscoStarTeePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Product | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [showAR, setShowAR] = useState(false);

  const handleSelect = useCallback((product: Product) => {
    setSelected(product);
    setCameraState('idle');
    setShowAR(false);
  }, []);

  const handleAllowCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unavailable');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      stream.getTracks().forEach((t) => t.stop());
      setCameraState('allowed');
    } catch {
      setCameraState('denied');
    }
  }, []);

  const product = selected ? PRODUCTS[selected] : null;
  const cameraAllowed = cameraState === 'allowed';

  if (showAR && product) {
    return (
      <ARCamera
        configs={[product.marker]}
        shareUrl={product.shareUrl}
        onClose={() => setShowAR(false)}
      />
    );
  }

  return (
    <>
      <Head>
        <title>dxsco — AR experience</title>
        <meta name="description" content="scan your dxsco shirt to unlock the AR experience." />
        <meta property="og:title" content="dxsco — AR experience" />
        <meta property="og:description" content="scan your dxsco shirt to unlock the AR experience." />
        <meta property="og:url" content="https://wmcyn.online/dyvsco-star-tee" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/wmcyn_logo_condensed.png" />
        <link rel="canonical" href="https://wmcyn.online/dyvsco-star-tee" />
      </Head>

      <div className={styles.pageContainer}>
        <div className={`${styles.container} ${styles.aboutSection}`}>
          <div className={styles.contentPanel}>

            {/* logo */}
            <img
              src="/wmcyn_logo_white.png"
              alt="WMCYN"
              style={{ width: 72, height: 'auto', opacity: 0.9 }}
            />

            {!selected ? (
              /* ── step 1: which shirt? ── */
              <>
                <h1 className={styles.sectionHeading} style={{ fontSize: '1.4rem' }}>
                  which shirt do you have?
                </h1>

                <p className={styles.scannerText} style={{ fontWeight: 400, opacity: 0.6 }}>
                  select your shirt to load the right experience
                </p>

                <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.08)' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                  <LiquidGlassEffect variant="button">
                    <button
                      onClick={() => handleSelect('dxsco-star-tee')}
                      className={styles.ctaButton}
                      style={{ width: '100%', fontSize: '15px', padding: '0.75rem 1rem' }}
                    >
                      dxsco star tee
                    </button>
                  </LiquidGlassEffect>

                  <LiquidGlassEffect variant="button">
                    <button
                      onClick={() => handleSelect('wmcyn-x-dxsco-tee')}
                      className={styles.ctaButton}
                      style={{ width: '100%', fontSize: '15px', padding: '0.75rem 1rem' }}
                    >
                      wmcyn x dxsco collab tee
                    </button>
                  </LiquidGlassEffect>
                </div>

                <button
                  onClick={() => router.push('/')}
                  className={styles.scannerText}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  back to wmcyn.online
                </button>
              </>
            ) : (
              /* ── step 2: camera allow + start ── */
              <>
                <h1 className={styles.sectionHeading} style={{ fontSize: '1.4rem' }}>
                  {product!.name}
                </h1>

                <p className={styles.scannerText} style={{ fontWeight: 400, opacity: 0.6 }}>
                  {product!.vibeCopy}
                </p>

                <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.08)' }} />

                {/* aiming instructions */}
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <p
                    className={styles.scannerText}
                    style={{ fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.1em', opacity: 0.4, textTransform: 'uppercase', margin: 0 }}
                  >
                    how to scan
                  </p>
                  {[
                    'point your camera at the logo on your shirt',
                    'hold steady and fill most of the frame',
                    'good lighting helps',
                  ].map((tip) => (
                    <p
                      key={tip}
                      className={styles.sectionText}
                      style={{ margin: 0, fontSize: '0.85rem', opacity: 0.75 }}
                    >
                      {tip}
                    </p>
                  ))}
                </div>

                <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.08)' }} />

                {/* camera feedback */}
                {cameraState === 'denied' && (
                  <p className={styles.scannerText} style={{ color: '#ff6b6b', fontWeight: 400, fontSize: '0.82rem' }}>
                    camera access was denied. enable it in your browser settings and reload.
                  </p>
                )}
                {cameraState === 'unavailable' && (
                  <p className={styles.scannerText} style={{ color: '#ff6b6b', fontWeight: 400, fontSize: '0.82rem' }}>
                    camera not available on this device or browser.
                  </p>
                )}
                {cameraState === 'allowed' && (
                  <p className={styles.scannerText} style={{ color: '#51cf66', fontWeight: 400, fontSize: '0.82rem' }}>
                    camera ready
                  </p>
                )}

                {/* action buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                  {!cameraAllowed && (
                    <LiquidGlassEffect variant="button">
                      <button
                        onClick={handleAllowCamera}
                        className={styles.ctaButton}
                        style={{ width: '100%', fontSize: '15px', padding: '0.65rem 1rem' }}
                      >
                        allow camera
                      </button>
                    </LiquidGlassEffect>
                  )}

                  <LiquidGlassEffect variant="button">
                    <button
                      onClick={() => setShowAR(true)}
                      disabled={!cameraAllowed}
                      className={styles.ctaButton}
                      style={{
                        width: '100%',
                        fontSize: '15px',
                        padding: '0.65rem 1rem',
                        opacity: cameraAllowed ? 1 : 0.35,
                        cursor: cameraAllowed ? 'pointer' : 'not-allowed',
                      }}
                    >
                      start experience
                    </button>
                  </LiquidGlassEffect>
                </div>

                {/* back to shirt selector */}
                <button
                  onClick={() => setSelected(null)}
                  className={styles.scannerText}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  wrong shirt? go back
                </button>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
