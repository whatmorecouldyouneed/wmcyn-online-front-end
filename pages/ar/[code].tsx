import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { fetchArConfigByCode } from '@/lib/apiClient';
import { resolveArConfig } from '@/ar/overlayRegistry';
import type { ResolvedArConfig } from '@/types/arSessions';
import ARCameraQR from '@/components/ARCameraQR';
import { usePrivacy } from '@/components/privacy/PrivacyProvider';
import { SITE_URL } from '@/lib/wmcynUrl';
import { trackProductScan } from '@/lib/scanAnalytics';

// qr codes resolve here from /qr?code=; all content comes from the api so new codes need no deploy
export default function ARByCode() {
  const { query, isReady } = useRouter();
  const code = (query.code as string) || '';
  const [config, setConfig] = useState<ResolvedArConfig | null>(null);
  const [startAR, setStartAR] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { consent } = usePrivacy();

  useEffect(() => {
    if (!isReady || !code) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchArConfigByCode(code)
      .then((raw) => {
        if (!cancelled) setConfig(resolveArConfig(raw));
      })
      .catch((e: Error) => {
        console.error('failed to load AR config:', e);
        if (!cancelled) setError('this QR code is invalid, expired, or not set up for AR yet.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isReady, code]);

  useEffect(() => {
    if (config && code) void trackProductScan(consent.analytics, `${SITE_URL}/ar/${encodeURIComponent(code)}`);
  }, [config, code, consent.analytics]);

  const handleViewWithoutAR = () => {
    window.open(`/viewer/${encodeURIComponent(code)}`, '_self');
  };

  if (loading) {
    return (
      <main style={{ padding: 24, textAlign: 'center' }}>
        <h1>Loading AR Experience...</h1>
        <p>Please wait while we prepare your AR content.</p>
      </main>
    );
  }

  if (error || !config) {
    return (
      <main style={{ padding: 24, textAlign: 'center' }}>
        <h1>AR experience unavailable</h1>
        <p>{error || "this QR code doesn't contain any AR content."}</p>
        <button onClick={() => window.history.back()}>
          Go Back
        </button>
      </main>
    );
  }

  if (startAR) {
    // build the canonical share url for this experience so the story card and
    // copy-link fallback both point to the same public address
    const experienceShareUrl = `${window.location.origin}/ar/${encodeURIComponent(code)}`;

    return (
      <ARCameraQR
        markerType={config.markerType || 'custom'}
        markerDataUrl={config.markerDataUrl || ''}
        overlays={config.overlays || []}
        onClose={() => setStartAR(false)}
        qrCode={code}
        meta={config.meta}
        shareUrl={experienceShareUrl}
      />
    );
  }

  return (
    <main style={{ padding: 24, textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
      <h1>{config.meta?.title || 'WMCYN AR Experience'}</h1>
      
      {config.meta?.description && (
        <p style={{ marginBottom: 32, color: '#666' }}>
          {config.meta.description}
        </p>
      )}

      <div style={{ marginBottom: 32 }}>
        <p>Allow camera access to view the AR overlay.</p>
        <p style={{ fontSize: 14, color: '#888' }}>
          Point your camera at the marker to see the AR content.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        <button 
          onClick={() => setStartAR(true)}
          style={{
            padding: '12px 24px',
            fontSize: 16,
            backgroundColor: '#000',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            minWidth: 200
          }}
        >
          Start AR Experience
        </button>
        
        <button 
          onClick={handleViewWithoutAR}
          style={{
            padding: '12px 24px',
            fontSize: 16,
            backgroundColor: 'transparent',
            color: '#000',
            border: '1px solid #000',
            borderRadius: 8,
            cursor: 'pointer',
            minWidth: 200
          }}
        >
          View without AR
        </button>
      </div>

      {config.meta?.actions && config.meta.actions.length > 0 && (
        <div style={{ marginTop: 32, paddingTop: 32, borderTop: '1px solid #eee' }}>
          <h3>Available Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            {config.meta.actions.map((action, index) => (
              <button
                key={index}
                onClick={() => action.url && window.open(action.url, '_blank')}
                style={{
                  padding: '8px 16px',
                  fontSize: 14,
                  backgroundColor: 'transparent',
                  color: '#000',
                  border: '1px solid #ccc',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
