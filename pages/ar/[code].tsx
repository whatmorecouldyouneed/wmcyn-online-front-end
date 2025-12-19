import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { fetchArConfigByCode } from '@/lib/apiClient';
import { resolveArConfig } from '@/ar/overlayRegistry';
import type { ResolvedArConfig } from '@/types/arSessions';
import ARCameraQR from '@/components/ARCameraQR';
import dynamic from 'next/dynamic';

export default function ARByCode() {
  const { query } = useRouter();
  const code = (query.code as string) || '';
  const [config, setConfig] = useState<ResolvedArConfig | null>(null);
  const [startAR, setStartAR] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [useGeneratedTemplate, setUseGeneratedTemplate] = useState(false);
  const [GeneratedTemplate, setGeneratedTemplate] = useState<any>(null);

  useEffect(() => {
    if (!code) return;
    
    const loadConfig = async () => {
      try {
        setLoading(true);
        
        // First, try to load the generated template
        try {
          const GeneratedComponent = dynamic(() => import(`@/ar/templates/${code}/index`), {
            ssr: false,
            loading: () => <div>Loading AR template...</div>
          });
          setGeneratedTemplate(GeneratedComponent);
          setUseGeneratedTemplate(true);
          setLoading(false);
          return;
        } catch (templateError) {
          console.log('No generated template found, falling back to API config');
        }
        
        // Fallback to API config
        console.log('[ARByCode] Fetching AR config for code:', code);
        try {
          const rawConfig = await fetchArConfigByCode(code);
          console.log('[ARByCode] Raw config received:', rawConfig);
          const resolvedConfig = resolveArConfig(rawConfig);
          console.log('[ARByCode] Resolved config:', resolvedConfig);
          setConfig(resolvedConfig);
        } catch (arConfigError) {
          console.log('[ARByCode] AR config failed, trying product set lookup:', arConfigError);
          // Try to get product set data instead
          try {
            const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://us-central1-wmcyn-online-mobile.cloudfunctions.net/api';
            const productSetResponse = await fetch(`${API_BASE}/v1/qrcodes/${code}/product-set`, {
              method: 'GET',
              credentials: 'omit'
            });
            if (productSetResponse.ok) {
              const productSetData = await productSetResponse.json();
              console.log('[ARByCode] Product set data received:', productSetData);
              // TODO: Convert product set data to AR config
              setError('Product set QR code detected, but AR conversion not implemented yet.');
            } else {
              throw new Error(`Product set lookup failed: ${productSetResponse.status}`);
            }
          } catch (productSetError) {
            console.log('[ARByCode] Product set lookup also failed:', productSetError);
            throw arConfigError; // Re-throw original error
          }
        }
      } catch (e: any) {
        console.error('Failed to load AR config:', e);
        console.error('Error details:', {
          message: e.message,
          status: e.status,
          code: code
        });
        setError(`Invalid or expired QR code. Error: ${e.message}`);
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
        <div style={{ background: '#f0f0f0', padding: '10px', margin: '10px 0', fontSize: '12px', textAlign: 'left' }}>
          <strong>Debug Info:</strong><br/>
          Code: {code}<br/>
          Loading: {loading.toString()}<br/>
          Error: {error || 'none'}<br/>
          Config: {config ? 'loaded' : 'not loaded'}<br/>
          Use Generated Template: {useGeneratedTemplate.toString()}
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ padding: 24, textAlign: 'center' }}>
        <h1>Error</h1>
        <p>{error}</p>
        <div style={{ background: '#f0f0f0', padding: '10px', margin: '10px 0', fontSize: '12px', textAlign: 'left' }}>
          <strong>Debug Info:</strong><br/>
          Code: {code}<br/>
          Error: {error}<br/>
          Loading: {loading.toString()}<br/>
          Config: {config ? 'loaded' : 'not loaded'}<br/>
          Use Generated Template: {useGeneratedTemplate.toString()}
        </div>
        <button onClick={() => window.history.back()}>
          Go Back
        </button>
      </main>
    );
  }

  if (!config && !useGeneratedTemplate) {
    return (
      <main style={{ padding: 24, textAlign: 'center' }}>
        <h1>No AR Content Found</h1>
        <p>This QR code doesn&apos;t contain any AR content.</p>
        <div style={{ background: '#f0f0f0', padding: '10px', margin: '10px 0', fontSize: '12px', textAlign: 'left' }}>
          <strong>Debug Info:</strong><br/>
          Code: {code}<br/>
          Loading: {loading.toString()}<br/>
          Error: {error || 'none'}<br/>
          Config: {config ? 'loaded' : 'not loaded'}<br/>
          Use Generated Template: {useGeneratedTemplate.toString()}<br/>
          Generated Template: {GeneratedTemplate ? 'loaded' : 'not loaded'}
        </div>
        <button onClick={() => window.history.back()}>
          Go Back
        </button>
      </main>
    );
  }

  if (startAR) {
    if (useGeneratedTemplate && GeneratedTemplate) {
      return (
        <GeneratedTemplate
          overlays={[]} // Generated template handles its own overlays
          onMarkerFound={handleMarkerFound}
          onMarkerLost={handleMarkerLost}
          onClose={handleCloseAR}
          qrCode={code}
        />
      );
    }
    
    return (
      <ARCameraQR
        markerType={config?.markerType || 'custom'}
        markerDataUrl={config?.markerDataUrl || ''}
        overlays={config?.overlays || []}
        onMarkerFound={handleMarkerFound}
        onMarkerLost={handleMarkerLost}
        onClose={handleCloseAR}
        qrCode={code}
      />
    );
  }

  return (
    <main style={{ padding: 24, textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
      <h1>{useGeneratedTemplate ? 'Business Card AR Experience' : (config?.meta?.title || 'WMCYN AR Experience')}</h1>
      
      {(useGeneratedTemplate || config?.meta?.description) && (
        <p style={{ marginBottom: 32, color: '#666' }}>
          {useGeneratedTemplate ? 'Point your camera at the WMCYN logo to see AR effects' : config?.meta?.description}
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

      {!useGeneratedTemplate && config?.meta?.actions && config.meta.actions.length > 0 && (
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
