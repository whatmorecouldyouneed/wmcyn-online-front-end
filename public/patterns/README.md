# AR Marker Patterns

This folder contains marker patterns for AR experiences.

## Pattern Types

### 1. Pattern Markers (.patt files)
Used with AR.js for black-and-white pattern-based tracking.
- `pattern-wmcyn_logo_full.patt` - WMCYN logo pattern
- `pattern-wmcyn-qr.patt` - QR code pattern

### 2. Image Targets (.mind files) - MindAR
Used with MindAR.js for natural feature/image tracking.
- `pinball.mind` - Compiled pinball image target (create this following steps below)

## Creating .mind Files for Image Tracking

MindAR requires `.mind` files which are compiled from target images. Follow these steps:

### Step 1: Prepare Your Image
- Use a high-contrast image with good detail
- Avoid images with too much repetition
- Recommended size: 512x512 to 1024x1024 pixels
- Formats: JPG, PNG

### Step 2: Use the MindAR Compiler
1. Go to: https://hiukim.github.io/mind-ar-js-doc/tools/compile/
2. Click "Add Image" and upload your target image
3. Click "Start" to compile
4. Wait for compilation to complete (may take a few seconds)
5. Click "Download" to save the `.mind` file

### Step 3: Add to Project
1. Save the `.mind` file to this `public/patterns/` folder
2. Update `src/config/markers.ts` to reference the new file:

```typescript
{
  name: 'your-marker-name',
  patternUrl: '/patterns/your-image', // not used by MindAR but kept for compatibility
  modelUrl: '/models/your-model.glb',
  scale: 0.3,
  markerType: 'nft',
  mindTargetSrc: '/patterns/your-image.mind', // path to .mind file
  label: 'Your Marker Label'
}
```

## Legacy AR.js NFT Files
The following files are for the older AR.js NFT format (not currently used):
- `pinball.fset`
- `pinball.fset3`
- `pinball.iset`

These can be removed if you're only using MindAR for image tracking.

## Tips for Good Image Targets

1. **High Contrast**: Images with strong contrast work better
2. **Unique Features**: Avoid repetitive patterns
3. **Non-Symmetric**: Asymmetric images are easier to track
4. **Detailed**: More detail = better tracking
5. **Matte Surface**: Avoid glossy prints that cause reflections

