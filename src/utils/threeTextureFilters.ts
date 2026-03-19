/**
 * webgl1 (safari): linear sampling on textures avoids overly soft npot mip paths.
 */

export function applyLinearTextureFiltersForWebGL1(model: { traverse: (cb: (o: unknown) => void) => void }, THREE: {
  LinearFilter: number;
}): void {
  const TEX_KEYS = [
    'map',
    'normalMap',
    'roughnessMap',
    'metalnessMap',
    'emissiveMap',
    'aoMap',
    'alphaMap',
    'lightMap',
    'bumpMap',
    'displacementMap',
  ] as const;

  model.traverse((obj: unknown) => {
    const child = obj as {
      isMesh?: boolean;
      material?: unknown | unknown[];
    };
    if (!child.isMesh || !child.material) return;

    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of mats) {
      if (!mat || typeof mat !== 'object') continue;
      const m = mat as Record<string, { isTexture?: boolean; needsUpdate?: boolean; minFilter?: number; magFilter?: number }>;
      for (const key of TEX_KEYS) {
        const t = m[key];
        if (t && t.isTexture) {
          t.minFilter = THREE.LinearFilter;
          t.magFilter = THREE.LinearFilter;
          t.needsUpdate = true;
        }
      }
    }
  });
}
