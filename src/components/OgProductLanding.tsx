import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { useRouter } from 'next/router';
import LiquidGlassEffect from '@/components/ui/LiquidGlassEffect';
import { type MarkerConfig } from '@/config/markers';
import styles from '@/styles/Index.module.scss';

const ARCamera = dynamic(() => import('@/components/ARCamera'), { ssr: false });

interface OgProductLandingProps {
  // seo
  pageTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  // copy
  productName: string;
  vibeCopy: string;
  // garment word used in aiming instructions, e.g. "shirt" or "hoodie"
  garmentWord: string;
  // ar
  marker: MarkerConfig;
  shareUrl: string;
}

type CameraState = 'idle' | 'allowed' | 'denied' | 'unavailable';

export default function OgProductLanding({
  pageTitle,
  metaDescription,
  canonicalUrl,
  productName,
  vibeCopy,
  garmentWord,
  marker,
  shareUrl,
}: OgProductLandingProps) {
  const router = useRouter();
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [showAR, setShowAR] = useState(false);

  const handleAllowCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unavailable');
      return;
    }
    try {
      // warm up permission only — stop tracks immediately after grant
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      stream.getTracks().forEach((t) => t.stop());
      setCameraState('allowed');
    } catch {
      setCameraState('denied');
    }
  }, []);

  const handleStartExperience = useCallback(() => {
    setShowAR(true);
  }, []);

  const handleClose = useCallback(() => {
    setShowAR(false);
  }, []);

  if (showAR) {
    return (
      <ARCamera
        configs={[marker]}
        shareUrl={shareUrl}
        onClose={handleClose}
      />
    );
  }

  const cameraAllowed = cameraState === 'allowed';

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/wmcyn_logo_condensed.png" />
        <link rel="canonical" href={canonicalUrl} />
      </Head>

      <div className={`${styles.pageContainer}`}>
        <div className={`${styles.container} ${styles.aboutSection}`}>
          <div className={styles.contentPanel}>

            {/* logo */}
            <img
              src="/wmcyn_logo_white.png"
              alt="WMCYN"
              style={{ width: 72, height: 'auto', opacity: 0.9 }}
            />

            {/* product name */}
            <h1 className={styles.sectionHeading} style={{ fontSize: '1.4rem' }}>
              {productName}
            </h1>

            {/* vibe copy */}
            <p className={styles.scannerText} style={{ fontWeight: 400, opacity: 0.6 }}>
              {vibeCopy}
            </p>

            {/* divider */}
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
                `point your camera at the logo on your ${garmentWord}`,
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

            {/* divider */}
            <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.08)' }} />

            {/* camera feedback */}
            {cameraState === 'denied' && (
              <p className={styles.scannerText} style={{ color: '#ff6b6b', fontWeight: 400, fontSize: '0.82rem', textAlign: 'center' }}>
                camera access was denied. enable it in your browser settings and reload.
              </p>
            )}
            {cameraState === 'unavailable' && (
              <p className={styles.scannerText} style={{ color: '#ff6b6b', fontWeight: 400, fontSize: '0.82rem', textAlign: 'center' }}>
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
                  onClick={handleStartExperience}
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

            {/* back link */}
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

          </div>
        </div>
      </div>
    </>
  );
}
