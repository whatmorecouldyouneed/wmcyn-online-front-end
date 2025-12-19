import { useRouter } from 'next/router';
import { useEffect, useState, ComponentType } from 'react';
import { fetchArConfigByCode } from '@/lib/apiClient';
import { resolveArConfig } from '@/ar/overlayRegistry';
import type { ResolvedArConfig, ResolvedOverlay } from '@/types/arSessions';
import ARCameraQR from '@/components/ARCameraQR';

// default overlay to use when no overlays are provided
const DEFAULT_OVERLAY: ResolvedOverlay = {
  type: 'model',
  src: '/models/wmcyn_3d_logo.glb',
  scale: [0.3, 0.3, 0.3],
  position: [0, 0, 0],
  rotation: [0, 0, 0]
};

export default function ARByCode() {
  const { query } = useRouter();
  const code = (query.code as string) || '';
  const [config, setConfig] = useState<ResolvedArConfig | null>(null);
  const [startAR, setStartAR] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [useGeneratedTemplate, setUseGeneratedTemplate] = useState(false);
  const [GeneratedTemplate, setGeneratedTemplate] = useState<ComponentType<any> | null>(null);

  useEffect(() => {
    if (!code) return;
    
    const loadConfig = async () => {
      try {
        setLoading(true);
        
        // first, try to load the generated template using dynamic import
        try {
          console.log('[ARByCode] Attempting to load generated template for:', code);
          const templateModule = await import(`@/ar/templates/${code}/index`);
          
          if (templateModule && templateModule.default) {
            console.log('[ARByCode] Generated template loaded successfully');
            setGeneratedTemplate(() => templateModule.default);
            setUseGeneratedTemplate(true);
            setLoading(false);
            return;
          }
        } catch (templateError: any) {
          // template doesn't exist, this is expected for codes without templates
          console.log('[ARByCode] No generated template found, falling back to API config:', templateError.message);
        }
        
        // fallback to API config
        console.log('[ARByCode] Fetching AR config for code:', code);
        try {
          const rawConfig = await fetchArConfigByCode(code);
          console.log('[ARByCode] Raw config received:', rawConfig);
          const resolvedConfig = resolveArConfig(rawConfig);
          console.log('[ARByCode] Resolved config:', resolvedConfig);
          setConfig(resolvedConfig);
        } catch (arConfigError: any) {
          console.log('[ARByCode] AR config failed, trying product set lookup:', arConfigError);
          // try to get product set data instead
          try {
            const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://us-central1-wmcyn-online-mobile.cloudfunctions.net/api';
            const productSetResponse = await fetch(`${API_BASE}/v1/qrcodes/${code}/product-set`, {
              method: 'GET',
              credentials: 'omit'
            });
            if (productSetResponse.ok) {
              const productSetData = await productSetResponse.json();
              console.log('[ARByCode] Product set data received:', productSetData);
              
              // resolve marker pattern url from product set or linked ar session
              let markerDataUrl = '/patterns/pattern-wmcyn_logo_full.patt';
              
              // check if product set has marker pattern url
              if (productSetData.markerPatternUrl) {
                markerDataUrl = productSetData.markerPatternUrl;
                console.log('[ARByCode] Using product set marker pattern:', markerDataUrl);
              }
              // check if product set has linked ar session
              else if (productSetData.linkedARSessionId) {
                console.log('[ARByCode] Product set has linked AR session:', productSetData.linkedARSessionId);
                try {
                  // try to fetch the linked ar session's config
                  const sessionConfigResponse = await fetch(`${API_BASE}/v1/ar-sessions/${productSetData.linkedARSessionId}/data`, {
                    method: 'GET',
                    credentials: 'omit'
                  });
                  if (sessionConfigResponse.ok) {
                    const sessionData = await sessionConfigResponse.json();
                    console.log('[ARByCode] Linked session data:', sessionData);
                    if (sessionData.markerPattern?.url) {
                      markerDataUrl = sessionData.markerPattern.url;
                      console.log('[ARByCode] Using linked session marker:', markerDataUrl);
                    } else if (sessionData.markerPattern?.patternId) {
                      markerDataUrl = `/patterns/${sessionData.markerPattern.patternId}.patt`;
                      console.log('[ARByCode] Using linked session pattern ID:', markerDataUrl);
                    }
                  }
                } catch (sessionError) {
                  console.warn('[ARByCode] Failed to fetch linked session:', sessionError);
                }
              }
              
              // create AR config with resolved marker pattern
              setConfig({
                markerType: 'custom',
                markerDataUrl: markerDataUrl,
                overlays: [DEFAULT_OVERLAY],
                meta: {
                  title: productSetData.name || 'WMCYN AR Experience',
                  description: productSetData.description || 'Scan to view AR content',
                  actions: []
                }
              });
            } else {
              throw new Error(`Product set lookup failed: ${productSetResponse.status}`);
            }
          } catch (productSetError) {
            console.log('[ARByCode] Product set lookup also failed:', productSetError);
            throw arConfigError; // re-throw original error
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
          overlays={[DEFAULT_OVERLAY]} // pass default wmcyn logo overlay
          onMarkerFound={handleMarkerFound}
          onMarkerLost={handleMarkerLost}
          onClose={handleCloseAR}
          qrCode={code}
        />
      );
    }
    
    // ensure we always have at least the default overlay
    const overlays = config?.overlays && config.overlays.length > 0 
      ? config.overlays 
      : [DEFAULT_OVERLAY];
    
    // determine mindar target for nft markers
    const isNFT = config?.markerType === 'nft';
    const mindTargetSrc = isNFT 
      ? (config?.markerDataUrl?.replace(/\.(fset|fset3|iset)$/, '.mind') || '/patterns/pinball.mind')
      : undefined;
    
    return (
      <ARCameraQR
        markerType={config?.markerType || 'custom'}
        markerDataUrl={config?.markerDataUrl || '/patterns/pattern-wmcyn_logo_full.patt'}
        mindTargetSrc={mindTargetSrc}
        overlays={overlays}
        onMarkerFound={handleMarkerFound}
        onMarkerLost={handleMarkerLost}
        onClose={handleCloseAR}
        qrCode={code}
        meta={config?.meta}
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
