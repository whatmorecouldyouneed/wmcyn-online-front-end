import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

// server-side template generator for QR code AR experiences
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const config = req.body;
    
    // validate required fields
    if (!config.code || !config.productName) {
      return res.status(400).json({ error: 'Missing required fields: code, productName' });
    }

    // generate template files
    console.log('Starting template generation for:', config);

    const templateDir = path.join(process.cwd(), 'src', 'ar', 'templates', config.code);
    
    // create template directory
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
    }

    // generate main AR component using ARCameraQR structure
    const componentName = config.productName.replace(/[^a-zA-Z0-9]/g, '');
    const componentNameCapitalized = componentName.charAt(0).toUpperCase() + componentName.slice(1);
    const mainComponent = `import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { useARScene } from '@/hooks/useARScene';
import { type MarkerConfig } from '@/config/markers';
import type { ResolvedOverlay } from '@/types/arSessions';
import { ${componentNameCapitalized}Effects } from './effects';
import styles from '@/components/ARCamera.module.scss';

interface ${componentNameCapitalized}ARProps {
  overlays: ResolvedOverlay[];
  onMarkerFound?: () => void;
  onMarkerLost?: () => void;
  onClose?: () => void;
  qrCode?: string;
}

export const ${componentNameCapitalized}AR = ({ 
  overlays, 
  onMarkerFound, 
  onMarkerLost,
  onClose,
  qrCode
}: ${componentNameCapitalized}ARProps): JSX.Element => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [detectedMarker, setDetectedMarker] = useState<boolean>(false);
  
  // convert overlays to marker configs for useARScene
  const markerConfigs: MarkerConfig[] = useMemo(() => {
    return overlays.map((overlay, index) => ({
      name: \`${componentNameCapitalized.toLowerCase()}_overlay_\${index}\`,
      patternUrl: '/patterns/pattern-wmcyn_logo_full.patt', // default pattern
      modelUrl: overlay.src || '/models/wmcyn_3d_logo.glb', // fallback to default logo
      scale: overlay.scale ? overlay.scale[0] : 0.3, // use first scale component
      label: overlay.text || \`${config.productName} AR Overlay \${index + 1}\`,
      onFound: () => {
        if (!detectedMarker) {
          setDetectedMarker(true);
          onMarkerFound?.();
        }
      }
    }));
  }, [overlays, detectedMarker, onMarkerFound]);

  // use the existing ar scene hook
  useARScene({ mountRef, configs: markerConfigs, setIsLoading });

  // handle marker lost detection
  const handleMarkerLost = useCallback(() => {
    if (detectedMarker) {
      setDetectedMarker(false);
      onMarkerLost?.();
    }
  }, [detectedMarker, onMarkerLost]);

  // useEffect for body class management and mobile fullscreen (reuse from ARCamera)
  React.useEffect(() => {
    console.log('${componentNameCapitalized}AR: Adding cameraActive classes and applying body styles');
    document.body.classList.add('cameraActive');
    document.documentElement.classList.add('cameraActive');
    
    // prevent mobile browser ui from showing during ar experience
    const htmlElement = document.documentElement;
    const bodyElement = document.body;
    
    // store original styles to restore later
    const originalStyles = {
      htmlOverflow: htmlElement.style.overflow,
      htmlWidth: htmlElement.style.width,
      htmlHeight: htmlElement.style.height,
      bodyOverflow: bodyElement.style.overflow,
      bodyPosition: bodyElement.style.position,
      bodyWidth: bodyElement.style.width,
      bodyHeight: bodyElement.style.height,
      bodyLeft: bodyElement.style.left,
      bodyTop: bodyElement.style.top,
      bodyMargin: bodyElement.style.margin,
      bodyPadding: bodyElement.style.padding
    };
    
    // force full viewport coverage
    htmlElement.style.overflow = 'hidden';
    htmlElement.style.width = '100vw';
    htmlElement.style.height = '100vh';
    
    bodyElement.style.overflow = 'hidden';
    bodyElement.style.position = 'fixed';
    bodyElement.style.width = '100vw';
    bodyElement.style.height = '100vh';
    bodyElement.style.left = '0';
    bodyElement.style.top = '0';
    bodyElement.style.margin = '0';
    bodyElement.style.padding = '0';
    
    // hide mobile browser ui
    window.scrollTo(0, 1);
    
    // handle orientation changes
    const handleOrientationChange = () => {
      setTimeout(() => {
        window.scrollTo(0, 1);
        if (mountRef.current) {
          const event = new Event('resize');
          window.dispatchEvent(event);
        }
      }, 100);
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);
    
    return () => {
      document.body.classList.remove('cameraActive');
      document.documentElement.classList.remove('cameraActive');
      
      // restore original styles
      htmlElement.style.overflow = originalStyles.htmlOverflow;
      htmlElement.style.width = originalStyles.htmlWidth;
      htmlElement.style.height = originalStyles.htmlHeight;
      
      bodyElement.style.overflow = originalStyles.bodyOverflow;
      bodyElement.style.position = originalStyles.bodyPosition;
      bodyElement.style.width = originalStyles.bodyWidth;
      bodyElement.style.height = originalStyles.bodyHeight;
      bodyElement.style.left = originalStyles.bodyLeft;
      bodyElement.style.top = originalStyles.bodyTop;
      bodyElement.style.margin = originalStyles.bodyMargin;
      bodyElement.style.padding = originalStyles.bodyPadding;
      
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  return (
    <div className={styles.arCameraContainer}>
      <div ref={mountRef} className={styles.mountPoint}></div>
      
      {isLoading && (
        <div className={styles.loadingOverlay}>
          Initializing AR...
        </div>
      )}
      
      {/* custom effects overlay */}
      <${componentNameCapitalized}Effects 
        intensity={1.0}
        theme="${config.metadata?.effects?.theme || 'default'}"
        onMarkerFound={onMarkerFound}
        onMarkerLost={onMarkerLost}
        isVisible={detectedMarker}
      />
      
      {onClose && (
        <button 
          onClick={onClose} 
          className={styles.closeButton}
        >
          Close AR
        </button>
      )}
    </div>
  );
};

export default ${componentNameCapitalized}AR;
`;

    // generate effects component
    const effectsComponent = `import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ${componentNameCapitalized}EffectsProps {
  intensity: number;
  theme: string;
  onMarkerFound?: () => void;
  onMarkerLost?: () => void;
  isVisible?: boolean;
}

export const ${componentNameCapitalized}Effects = ({ 
  intensity, 
  theme, 
  onMarkerFound, 
  onMarkerLost,
  isVisible = false
}: ${componentNameCapitalized}EffectsProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // custom effects implementation for ${config.productName}
    // this is where you add rain, particles, animations, etc.
    
    console.log(\`${componentNameCapitalized} effects loaded with intensity: \${intensity}, theme: \${theme}, visible: \${isVisible}\`);
    
    // example: add custom three.js scene for effects
    if (containerRef.current && isVisible) {
      // implement your custom effects here
      // - rain particles
      // - patriotic colors
      // - memorial day animations
      // - product-specific interactions
      
      // example: add a simple visual indicator
      containerRef.current.style.background = 'rgba(0, 255, 0, 0.1)';
    } else if (containerRef.current) {
      containerRef.current.style.background = 'transparent';
    }

    return () => {
      // cleanup effects
    };
  }, [intensity, theme, isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      ref={containerRef}
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10,
        transition: 'opacity 0.3s ease'
      }}
    >
      {/* custom effects overlay */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        color: '#fff',
        textAlign: 'center',
        fontSize: 14,
        opacity: 0.8,
        background: 'rgba(0, 0, 0, 0.5)',
        padding: '8px 16px',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.3)'
      }}>
        ${config.productName} Effects
        <br />
        Theme: {theme}
        <br />
        Intensity: {intensity}
      </div>
    </div>
  );
};
`;

    // generate configuration
    const configJson = JSON.stringify({
      code: config.code,
      productName: config.productName,
      campaign: config.campaign,
      targetType: config.targetType,
      targetId: config.targetId,
      metadata: config.metadata,
      effects: {
        type: 'default',
        intensity: 1.0,
        theme: 'default',
        customProps: {}
      },
      customization: {
        instructions: [
          'edit effects.tsx to add custom three.js effects',
          'modify intensity and theme in config.json',
          'add custom props for advanced effects',
          'test changes by visiting /ar/' + config.code
        ]
      }
    }, null, 2);

    // generate readme
    const readme = `# ${config.productName} AR Template

## QR Code: ${config.code}

This template was auto-generated for the "${config.productName}" product/campaign.

## Files

- \`index.tsx\` - Main AR component (renders default logo + custom effects)
- \`effects.tsx\` - Custom effects implementation (rain, particles, animations)
- \`config.json\` - Configuration for effects and customization
- \`README.md\` - This file

## Customization

### 1. Edit Effects
Open \`effects.tsx\` and implement your custom Three.js effects:
- Rain particles
- Patriotic colors
- Memorial day animations
- Product-specific interactions

### 2. Configure Effects
Edit \`config.json\` to adjust:
- Effect intensity
- Theme colors
- Custom properties

### 3. Test Changes
Visit \`/ar/${config.code}\` to test your customizations.

## Example Effects

\`\`\`typescript
// rain effect
const rainParticles = new THREE.Points(rainGeometry, rainMaterial);

// patriotic colors
const colors = ['#ff0000', '#ffffff', '#0000ff'];

// memorial day animation
const animate = () => {
  // your animation logic
};
\`\`\`

## Integration

This template integrates with the existing AR system:
- Uses \`ARCameraQR\` component
- Follows \`ResolvedOverlay\` interface
- Maintains mobile optimization
- Supports marker detection events
`;

    // write files
    fs.writeFileSync(path.join(templateDir, 'index.tsx'), mainComponent);
    fs.writeFileSync(path.join(templateDir, 'effects.tsx'), effectsComponent);
    fs.writeFileSync(path.join(templateDir, 'config.json'), configJson);
    fs.writeFileSync(path.join(templateDir, 'README.md'), readme);

    console.log(`✅ Generated QR template for ${config.code} at ${templateDir}`);
    
    res.status(200).json({
      success: true,
      templatePath: templateDir,
      config
    });
  } catch (error) {
    console.error('Template generation failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
