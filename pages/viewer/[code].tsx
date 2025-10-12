import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { fetchArConfigByCode } from '@/lib/apiClient';
import { resolveArConfig, DEFAULT_LOGO_URL } from '@/ar/overlayRegistry';
import ModelViewer from '@/components/ModelViewer';

export default function ViewerByCode() {
  const { query } = useRouter();
  const code = (query.code as string) || '';
  const [modelUrl, setModelUrl] = useState<string>(DEFAULT_LOGO_URL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('3D Model Viewer');

  useEffect(() => {
    if (!code) return;
    
    const loadConfig = async () => {
      try {
        setLoading(true);
        const rawConfig = await fetchArConfigByCode(code);
        const resolvedConfig = resolveArConfig(rawConfig);
        
        // extract first model overlay
        const firstModel = resolvedConfig.overlays.find(o => o.type === 'model' && o.src);
        if (firstModel?.src) {
          setModelUrl(firstModel.src);
        }
        
        // set title from metadata
        if (resolvedConfig.meta?.title) {
          setTitle(resolvedConfig.meta.title);
        }
        
      } catch (e: any) {
        console.error('Failed to load viewer config:', e);
        setError('Invalid or expired QR code.');
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [code]);

  if (loading) {
    return (
      <main style={{ 
        padding: 24, 
        textAlign: 'center', 
        background: '#000', 
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#fff'
      }}>
        <h1>Loading 3D Model...</h1>
        <p>Please wait while we prepare your content.</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ 
        padding: 24, 
        textAlign: 'center', 
        background: '#000', 
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#fff'
      }}>
        <h1>Error</h1>
        <p>{error}</p>
        <button 
          onClick={() => window.history.back()}
          style={{
            padding: '12px 24px',
            fontSize: 16,
            backgroundColor: '#fff',
            color: '#000',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            marginTop: 16
          }}
        >
          Go Back
        </button>
      </main>
    );
  }

  return (
    <main style={{ 
      padding: 0, 
      background: '#000', 
      height: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* header with title and back button */}
      <div style={{
        padding: '16px 24px',
        background: 'rgba(0,0,0,0.8)',
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10
      }}>
        <h1 style={{ margin: 0, fontSize: 18 }}>{title}</h1>
        <button 
          onClick={() => window.history.back()}
          style={{
            padding: '8px 16px',
            fontSize: 14,
            backgroundColor: 'transparent',
            color: '#fff',
            border: '1px solid #fff',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Back
        </button>
      </div>

      {/* 3d model viewer */}
      <div style={{ 
        flex: 1, 
        width: '100%', 
        height: '100vh',
        position: 'relative'
      }}>
        <ModelViewer 
          src={modelUrl}
          width={window.innerWidth}
          height={window.innerHeight}
          background="transparent"
        />
      </div>

      {/* instructions overlay */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        left: 24,
        right: 24,
        background: 'rgba(0,0,0,0.8)',
        color: '#fff',
        padding: 16,
        borderRadius: 8,
        textAlign: 'center'
      }}>
        <p style={{ margin: 0, fontSize: 14 }}>
          Drag to rotate • Scroll to zoom • Right-click to pan
        </p>
      </div>
    </main>
  );
}

