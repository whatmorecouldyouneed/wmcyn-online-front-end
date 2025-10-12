# business card AR Template

## QR Code: 5TCDSYAD

This template was auto-generated for the "business card" product/campaign.

## Files

- `index.tsx` - Main AR component (renders default logo + custom effects)
- `effects.tsx` - Custom effects implementation (rain, particles, animations)
- `config.json` - Configuration for effects and customization
- `README.md` - This file

## Customization

### 1. Edit Effects
Open `effects.tsx` and implement your custom Three.js effects:
- Rain particles
- Patriotic colors
- Memorial day animations
- Product-specific interactions

### 2. Configure Effects
Edit `config.json` to adjust:
- Effect intensity
- Theme colors
- Custom properties

### 3. Test Changes
Visit `/ar/5TCDSYAD` to test your customizations.

## Example Effects

```typescript
// rain effect
const rainParticles = new THREE.Points(rainGeometry, rainMaterial);

// patriotic colors
const colors = ['#ff0000', '#ffffff', '#0000ff'];

// memorial day animation
const animate = () => {
  // your animation logic
};
```

## Integration

This template integrates with the existing AR system:
- Uses `ARCameraQR` component
- Follows `ResolvedOverlay` interface
- Maintains mobile optimization
- Supports marker detection events
