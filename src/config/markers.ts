// Simplified marker configs - only tote bag vs t-shirt
// Focus on color-based detection: sand/charred vs pure white

export interface MarkerConfig {
  name: string;
  patternUrl: string;
  modelUrl: string;
  scale: number;
  metadata: {
    title: string;
    description: string;
    limited: boolean;
    print: string;
    price: string;
    status: string;
  };
}

export const DEFAULT_HIRO_PATTERN_URL_PLACEHOLDER = "/patterns/pattern-wmcyn_logo_full.patt";

export const markerConfigs: MarkerConfig[] = [
  // TOTE BAG (Sand/Charred finish)
  {
    name: 'wmcyn-tote-white-001',
    patternUrl: DEFAULT_HIRO_PATTERN_URL_PLACEHOLDER,
    modelUrl: '/models/wmcyn_3d_logo.glb',
    scale: 0.4, // Larger scale for tote bag
    metadata: {
      title: 'WMCYN Tote Bag',
      description: 'White tote bag with sand/charred finish and larger black hero marker',
      limited: true,
      print: 'Hero Marker Print',
      price: '$45',
      status: 'Limited Edition'
    }
  },
  
  // T-SHIRT (Pure white #FFF)
  {
    name: 'wmcyn-tshirt-white-001',
    patternUrl: DEFAULT_HIRO_PATTERN_URL_PLACEHOLDER,
    modelUrl: '/models/wmcyn_3d_logo.glb',
    scale: 0.2, // Smaller scale for t-shirt
    metadata: {
      title: 'WMCYN White T-Shirt',
      description: 'Pure white t-shirt with small black hero marker on back',
      limited: false,
      print: 'Back Print - Hero Marker',
      price: '$25',
      status: 'Available'
    }
  },

  // DEFAULT FALLBACK
  {
    name: 'wmcyn-default-001',
    patternUrl: DEFAULT_HIRO_PATTERN_URL_PLACEHOLDER,
    modelUrl: '/models/wmcyn_3d_logo.glb',
    scale: 0.3,
    metadata: {
      title: 'WMCYN Product',
      description: 'WMCYN product detected',
      limited: false,
      print: 'Hero Marker Print',
      price: 'TBD',
      status: 'Detected'
    }
  }
]; 