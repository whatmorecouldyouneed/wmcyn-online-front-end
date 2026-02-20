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

    // generate ar component that wraps ARCamera
    // supports custom .mind file URL from props, or falls back to defaults
    const componentName = config.productName.replace(/[^a-zA-Z0-9]/g, '');
    const componentNameCapitalized = componentName.charAt(0).toUpperCase() + componentName.slice(1);
    
    const mainComponent = `import ARCamera from '@/components/ARCamera';
import type { MarkerConfig } from '@/config/markers';

interface ${componentNameCapitalized}ARProps {
  onClose?: () => void;
  meta?: {
    title?: string;
    description?: string;
    actions?: Array<{ type: string; label: string; url?: string }>;
    createdAt?: string;  // for "printed on" display
    campaign?: string;   // for campaign display
  };
  mindTargetSrc?: string; // custom .mind file URL from backend
}

export const ${componentNameCapitalized}AR = ({ 
  onClose,
  meta,
  mindTargetSrc
}: ${componentNameCapitalized}ARProps): JSX.Element => {
  console.log('[${componentNameCapitalized}AR] Rendering with:', { 
    mindTargetSrc,
    hasMeta: !!meta,
    meta: meta,
    metaTitle: meta?.title,
    metaDescription: meta?.description
  });

  // if custom .mind file provided, create config for it
  // otherwise pass undefined to use default markerConfigs (like homepage)
  const customConfigs: MarkerConfig[] | undefined = mindTargetSrc ? [{
    name: '${config.code}_marker',
    modelUrl: '/models/wmcyn_3d_logo.glb',
    scale: 0.5,
    markerType: 'nft' as const,
    mindTargetSrc: mindTargetSrc,
    label: meta?.title || '${config.productName}',
  }] : undefined;

  return (
    <ARCamera 
      onClose={onClose}
      configs={customConfigs}
      meta={meta}
    />
  );
};

export default ${componentNameCapitalized}AR;
`;

    // determine if this is a .mind file or .patt file
    const isMindFile = config.markerPatternUrl?.endsWith('.mind') || 
                       config.markerPatternUrl?.includes('storage.googleapis.com') ||
                       config.markerPatternUrl?.includes('firebasestorage.googleapis.com');
    
    // generate configuration
    const configJson = JSON.stringify({
      code: config.code,
      productName: config.productName,
      campaign: config.campaign,
      targetType: config.targetType,
      targetId: config.targetId,
      markerPatternUrl: config.markerPatternUrl,
      markerType: isMindFile ? 'mind' : 'patt',
      metadata: config.metadata,
      generatedAt: new Date().toISOString()
    }, null, 2);

    // generate readme
    const readme = `# ${config.productName} AR Template

## QR Code: ${config.code}

This template was auto-generated for the "${config.productName}" product/campaign.

## Files

- \`index.tsx\` - Main AR component (wraps ARCamera)
- \`config.json\` - Configuration metadata
- \`README.md\` - This file

## How It Works

This template uses the shared ARCamera component which handles:
- Camera initialization
- MindAR NFT tracking (using .mind files)
- 3D model rendering with Three.js
- ARMetadataOverlay display when marker is detected

## Testing

Visit \`/ar/${config.code}\` to test the AR experience.
`;

    // write files (no effects.tsx needed)
    fs.writeFileSync(path.join(templateDir, 'index.tsx'), mainComponent);
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
