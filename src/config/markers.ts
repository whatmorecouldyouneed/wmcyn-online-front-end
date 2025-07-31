export interface ProductMetadata {
  title: string;
  description: string;
  price: number;
  currency: string;
  printDate: string;
  printLocation: string;
  quantity: number;
  imageUrl: string;
  purchaseUrl: string;
}

export interface MarkerConfig {
  name: string;
  patternUrl: string; // can be a local path or a special identifier
  modelUrl: string;
  scale?: number;
  position?: { x: number; y: number; z: number };
  label?: string;
  onFound?: () => void;
  productId: string;
  productMetadata: ProductMetadata;
}

export const DEFAULT_HIRO_PATTERN_URL_PLACEHOLDER = 'USE_DEFAULT_HIRO_PATTERN';

export const markerConfigs: MarkerConfig[] = [
  {
    name: 'hiro',
    patternUrl: DEFAULT_HIRO_PATTERN_URL_PLACEHOLDER,
    modelUrl: '/models/wmcyn_3d_logo.glb',
    scale: 1.0,
    position: { x: 2, y: 6.5, z: 0 },
    productId: 'hiro_product_1',
    productMetadata: {
      title: 'WMCYN Limited Edition Logo',
      description: 'Exclusive 3D logo collectible from WMCYN\'s inaugural collection',
      price: 49.99,
      currency: 'USD',
      printDate: '2024-01-15',
      printLocation: 'New York, NY',
      quantity: 100,
      imageUrl: '/wmcyn_logo_white.png',
      purchaseUrl: 'https://wmcyn.online/shop/limited-logo'
    }
  },

  // add new product entries here
  // example:
  // {
  //   name: 'product_xyz',
  //   patternUrl: '/patterns/product_xyz.patt', // local path
  //   modelUrl: '/models/product_xyz.glb',
  //   scale: 0.5,
  //   label: 'Product XYZ',
  //   productId: 'product_xyz_001',
  //   productMetadata: {
  //     title: 'Product XYZ',
  //     description: 'Amazing product description',
  //     price: 29.99,
  //     currency: 'USD',
  //     printDate: '2024-02-01',
  //     printLocation: 'Los Angeles, CA',
  //     quantity: 50,
  //     imageUrl: '/images/product_xyz.jpg',
  //     purchaseUrl: 'https://wmcyn.online/shop/product-xyz'
  //   }
  // },
]; 