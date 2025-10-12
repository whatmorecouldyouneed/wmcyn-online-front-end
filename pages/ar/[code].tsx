import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { fetchArConfigByCode } from '@/lib/apiClient';
import { resolveArConfig } from '@/ar/overlayRegistry';
import type { ResolvedArConfig } from '@/types/arSessions';
import ARCameraQR from '@/components/ARCameraQR';

export default function ARByCode() {
  const { query } = useRouter();
  const code = (query.code as string) || '';
  const [config, setConfig] = useState<ResolvedArConfig | null>(null);
  const [startAR, setStartAR] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    
    const loadConfig = async () => {
      try {
        setLoading(true);
        const rawConfig = await fetchArConfigByCode(code);
        const resolvedConfig = resolveArConfig(rawConfig);
        setConfig(resolvedConfig);
      } catch (e: any) {
        console.error('Failed to load AR config:', e);
        setError('Invalid or expired QR code.');
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [code]);

  const handleStartAR = () => {
    setStartAR(true);
  };

  const handleViewWithoutAR = () => {
    window.open(`/viewer/${encodeURIComponent(code)}`, '_self');
  };

  const handleCloseAR = () => {
    setStartAR(false);
  };

  const handleMarkerFound = () => {
    console.log('Marker found for code:', code);
    // todo: add analytics tracking
  };

  const handleMarkerLost = () => {
    console.log('Marker lost for code:', code);
    // todo: add analytics tracking
  };

  if (loading) {
    return (
      <main style={{ padding: 24, textAlign: 'center' }}>
        <h1>Loading AR Experience...</h1>
        <p>Please wait while we prepare your AR content.</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ padding: 24, textAlign: 'center' }}>
        <h1>Error</h1>
        <p>{error}</p>
        <button onClick={() => window.history.back()}>
          Go Back
        </button>
      </main>
    );
  }

  if (!config) {
    return (
      <main style={{ padding: 24, textAlign: 'center' }}>
        <h1>No AR Content Found</h1>
        <p>This QR code doesn&apos;t contain any AR content.</p>
        <button onClick={() => window.history.back()}>
          Go Back
        </button>
      </main>
    );
  }

  if (startAR) {
    return (
      <ARCameraQR
        markerType={config.markerType}
        markerDataUrl={config.markerDataUrl}
        overlays={config.overlays}
        onMarkerFound={handleMarkerFound}
        onMarkerLost={handleMarkerLost}
        onClose={handleCloseAR}
        qrCode={code}
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
          onClick={handleStartAR}
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
