export interface MarkerConfig {
  name: string;
  patternUrl: string; // can be a local path or a special identifier
  modelUrl: string;
  scale?: number;
  position?: { x: number; y: number; z: number };
  label?: string;
  onFound?: () => void;
}

export const DEFAULT_HIRO_PATTERN_URL_PLACEHOLDER = 'USE_DEFAULT_HIRO_PATTERN';

export const markerConfigs: MarkerConfig[] = [
  {
    name: 'hiro',
    patternUrl: DEFAULT_HIRO_PATTERN_URL_PLACEHOLDER,
    modelUrl: '/models/wmcyn_3d_logo.glb',
    scale: 1.0,
    position: { x: 2, y: 6.5, z: 0 },
  },

  // add new product entries here
  // example:
  // {
  //   name: 'product_xyz',
  //   patternUrl: '/patterns/product_xyz.patt', // local path
  //   modelUrl: '/models/product_xyz.glb',
  //   scale: 0.5,
  //   label: 'Product XYZ',
  //   onFound: () => console.log('Product XYZ found!'),
  // },
]; 