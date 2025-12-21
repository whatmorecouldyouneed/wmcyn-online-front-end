import { useRouter } from 'next/router';
import { useEffect, useState, ComponentType } from 'react';
import dynamic from 'next/dynamic';
import { fetchArConfigByCode } from '@/lib/apiClient';
import { resolveArConfig } from '@/ar/overlayRegistry';
import type { ResolvedArConfig, ResolvedOverlay } from '@/types/arSessions';

// dynamically import ARCamera exactly like homepage does - this is critical for proper loading
const ARCamera = dynamic(
  () => import('@/components/ARCamera'),
  {
    ssr: false,
    loading: () => <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      background: '#000', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      color: '#fff' 
    }}>Initializing AR Scanner...</div>
  }
);

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
  const [templateConfig, setTemplateConfig] = useState<any>(null);

  useEffect(() => {
    if (!code) return;
    
    const loadConfig = async () => {
      let hasTemplate = false;
      try {
        setLoading(true);
        
        // first, try to load the generated template using dynamic import
        try {
          const templateModule = await import(`@/ar/templates/${code}/index`);
          
          if (templateModule && templateModule.default) {
            setGeneratedTemplate(() => templateModule.default);
            setUseGeneratedTemplate(true);
            hasTemplate = true;
            
            // try to load template config.json for fallback metadata
            // (API config will override this if available)
            try {
              const configModule = await import(`@/ar/templates/${code}/config.json`);
              if (configModule.default) {
                setTemplateConfig(configModule.default);
              }
            } catch (configError) {
              // template config not found, will use API config
            }
            // continue to fetch config for meta data - don't return early
          }
        } catch (templateError: any) {
          // template doesn't exist, this is expected for codes without templates
        }
        
        // always try to fetch config to get meta data (even if template exists)
        
        // fallback to API config
        try {
          const rawConfig = await fetchArConfigByCode(code);
          const resolvedConfig = resolveArConfig(rawConfig);
          setConfig(resolvedConfig);
        } catch (arConfigError: any) {
          // try to get product set data instead
          try {
            const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://us-central1-wmcyn-online-mobile.cloudfunctions.net/api';
            
            // first try the qrcode/product-set sub-resource
            let productSetResponse = await fetch(`${API_BASE}/v1/qrcodes/${code}/product-set`, {
              method: 'GET',
              credentials: 'omit'
            });
            
            // if that fails, try to get qr code data first, then fetch product set
            if (!productSetResponse.ok) {
              const qrResponse = await fetch(`${API_BASE}/v1/qrcodes/${code}`, {
                method: 'GET',
                credentials: 'omit'
              });
              
              if (qrResponse.ok) {
                const qrData = await qrResponse.json();
                
                // get product set id from qr code target
                const productSetId = qrData.target?.productSetId || qrData.productSetId;
                if (productSetId) {
                  productSetResponse = await fetch(`${API_BASE}/v1/productSets/${productSetId}`, {
                    method: 'GET',
                    credentials: 'omit'
                  });
                }
              }
            }
            
            if (productSetResponse.ok) {
              const productSetData = await productSetResponse.json();
              
              console.log('[ARByCode] Product set data:', productSetData);
              console.log('[ARByCode] Product set arMetadata:', productSetData.arMetadata);
              console.log('[ARByCode] Product set createdAt:', productSetData.createdAt);
              console.log('[ARByCode] Product set campaign:', productSetData.campaign);
              
              // resolve marker from product set - check for nft marker first
              let markerType: 'mind' | 'nft' | 'custom' = 'custom';
              let markerDataUrl = '/patterns/pattern-wmcyn_logo_full.patt';
              
              // check if product set has nft marker (from backend .mind file upload)
              if (productSetData.nftMarker?.mindFileUrl) {
                markerType = 'mind';
                markerDataUrl = productSetData.nftMarker.mindFileUrl;
              }
              // check if product set has marker pattern url
              else if (productSetData.markerPatternUrl) {
                markerDataUrl = productSetData.markerPatternUrl;
              }
              // check if product set has linked ar session
              else if (productSetData.linkedARSessionId) {
                try {
                  // try to fetch the linked ar session's config
                  const sessionConfigResponse = await fetch(`${API_BASE}/v1/ar-sessions/${productSetData.linkedARSessionId}/data`, {
                    method: 'GET',
                    credentials: 'omit'
                  });
                  if (sessionConfigResponse.ok) {
                    const sessionData = await sessionConfigResponse.json();
                    if (sessionData.markerPattern?.url) {
                      markerDataUrl = sessionData.markerPattern.url;
                    } else if (sessionData.markerPattern?.patternId) {
                      markerDataUrl = `/patterns/${sessionData.markerPattern.patternId}.patt`;
                    }
                  }
                } catch (sessionError) {
                  console.warn('[ARByCode] Failed to fetch linked session:', sessionError);
                }
              }
              
              // create AR config with resolved marker
              // use arMetadata if available, otherwise fall back to name/description
              const arMeta = productSetData.arMetadata;
              
              // build meta with description and additional product set info
              // prioritize arMetadata fields (from form) over productSetData fields
              const metaConfig = {
                title: arMeta?.title || productSetData.name || 'WMCYN AR Experience',
                // use arMetadata.description if it exists and is not empty, otherwise use productSetData.description
                description: (arMeta?.description && arMeta.description.trim()) 
                  ? arMeta.description 
                  : (productSetData.description && productSetData.description.trim())
                    ? productSetData.description
                    : undefined, // don't set fallback - let overlay handle empty description
                actions: arMeta?.actions || [],
                // include product set metadata for "printed on" display
                createdAt: productSetData.createdAt,
                campaign: productSetData.campaign
              };
              
              console.log('[ARByCode] Built metaConfig:', metaConfig);
              
              setConfig({
                markerType: markerType,
                markerDataUrl: markerDataUrl,
                overlays: [DEFAULT_OVERLAY],
                meta: metaConfig
              });
            } else {
              throw new Error(`Product set lookup failed: ${productSetResponse.status}`);
            }
          } catch (productSetError) {
            console.log('[ARByCode] Product set lookup also failed:', productSetError);
            // if we have a template, don't throw - just continue without config
            if (!hasTemplate) {
              throw arConfigError; // re-throw original error only if no template
            }
            console.log('[ARByCode] Using template without API config');
          }
        }
      } catch (e: any) {
        console.error('Failed to load AR config:', e);
        console.error('Error details:', {
          message: e.message,
          status: e.status,
          code: code
        });
        // only set error if we don't have a template to fall back to
        if (!hasTemplate) {
          setError(`Invalid or expired QR code. Error: ${e.message}`);
        } else {
          console.log('[ARByCode] Config failed but template exists, continuing...');
        }
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
    // if we have a generated template, use it instead of direct ARCamera
    if (useGeneratedTemplate && GeneratedTemplate) {
      // get mind file url from config
      let mindFileUrl = config?.markerDataUrl;
      
      // if the url is from firebase storage, proxy it to avoid cors issues
      if (mindFileUrl && (
        mindFileUrl.includes('storage.googleapis.com') || 
        mindFileUrl.includes('firebasestorage.googleapis.com')
      )) {
        mindFileUrl = `/api/proxy-mind?url=${encodeURIComponent(mindFileUrl)}`;
      }
      
      // build meta from config (which should have product set data with arMetadata)
      // use API config if available, otherwise fall back to template config
      // prioritize actual form data, don't use generic fallbacks
      const arMeta = config?.meta ? {
        title: config.meta.title || 'WMCYN AR Experience',
        description: (config.meta.description && config.meta.description.trim()) 
          ? config.meta.description 
          : undefined,
        actions: config.meta.actions || [],
        createdAt: config.meta.createdAt,
        campaign: config.meta.campaign
      } : templateConfig?.metadata ? {
        title: templateConfig.metadata.title || templateConfig.productName || 'WMCYN AR Experience',
        description: (templateConfig.metadata.description && templateConfig.metadata.description.trim())
          ? templateConfig.metadata.description
          : undefined,
        actions: templateConfig.metadata.actions || [],
        createdAt: templateConfig.generatedAt,
        campaign: templateConfig.campaign
      } : {
        title: 'WMCYN AR Experience',
        actions: []
      };
      
      console.log('[ARByCode] Rendering GeneratedTemplate with meta:', arMeta);
      console.log('[ARByCode] Config meta:', config?.meta);
      console.log('[ARByCode] Template config:', templateConfig);
      
      return (
        <GeneratedTemplate 
          onClose={handleCloseAR}
          meta={arMeta}
          mindTargetSrc={mindFileUrl}
        />
      );
    }
    
    // fallback to direct ARCamera (for non-template flows)
    // check if we have a custom .mind file from the backend
    const hasCustomMindFile = config?.markerType === 'mind' && config?.markerDataUrl;
    
    // if we have a custom .mind file, create a config for it
    // otherwise, pass undefined to use default markerConfigs (like homepage)
    let mindFileUrl = config?.markerDataUrl;
    
    // if the url is from firebase storage, proxy it to avoid cors issues
    if (mindFileUrl && (
      mindFileUrl.includes('storage.googleapis.com') || 
      mindFileUrl.includes('firebasestorage.googleapis.com')
    )) {
      mindFileUrl = `/api/proxy-mind?url=${encodeURIComponent(mindFileUrl)}`;
    }
    
    const customConfigs = hasCustomMindFile ? [{
      name: `${code}_marker`,
      modelUrl: '/models/wmcyn_3d_logo.glb',
      scale: 0.5,
      markerType: 'nft' as const,
      mindTargetSrc: mindFileUrl,
      label: config?.meta?.title || 'AR Experience'
    }] : undefined;

    // build meta - prioritize actual form data, don't use generic fallbacks
    const arMeta = config?.meta ? {
      title: config.meta.title || 'WMCYN AR Experience',
      // only use description if it exists and is not empty
      description: (config.meta.description && config.meta.description.trim()) 
        ? config.meta.description 
        : undefined,
      actions: config.meta.actions || [],
      createdAt: config.meta.createdAt,  // pass through for "printed on" display
      campaign: config.meta.campaign     // pass through for campaign display
    } : {
      title: 'WMCYN AR Experience',
      actions: []
    };
    
    return (
      <ARCamera 
        onClose={handleCloseAR}
        configs={customConfigs}
        meta={arMeta}
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
