import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface Loader3DLogoProps {
  size?: number;
  backgroundColor?: string;
}

// a minimal three.js scene that loads the wmcyn_3d_logo.glb and spins it
export default function Loader3DLogo({ size = 220, backgroundColor = 'transparent' }: Loader3DLogoProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef<number | null>(null);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    renderer.setClearColor(new THREE.Color('#000000'), backgroundColor === 'transparent' ? 0 : 1);
    mountEl.appendChild(renderer.domElement);

    // lighting
    const ambient = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(2, 3, 4);
    scene.add(dir);

    const group = new THREE.Group();
    scene.add(group);

    const loader = new GLTFLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      '/models/wmcyn_3d_logo.glb',
      (gltf) => {
        const model = gltf.scene || gltf.scenes?.[0];
        if (model) {
          // center and scale to fit
          const box = new THREE.Box3().setFromObject(model);
          const sizeVec = new THREE.Vector3();
          box.getSize(sizeVec);
          const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
          const scale = 1.4 / maxDim;
          model.scale.setScalar(scale);

          const center = new THREE.Vector3();
          box.getCenter(center);
          model.position.sub(center);
          group.add(model);
        }
      },
      undefined,
      (error) => {
        console.error('failed to load 3d logo:', error);
      }
    );

    const animate = () => {
      requestIdRef.current = requestAnimationFrame(animate);
      group.rotation.y += 0.02;
      group.rotation.x = Math.sin(performance.now() * 0.001) * 0.06;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (requestIdRef.current) cancelAnimationFrame(requestIdRef.current);
      renderer.dispose();
      mountEl.removeChild(renderer.domElement);
      scene.clear();
    };
  }, [size, backgroundColor]);

  return (
    <div
      ref={mountRef}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: backgroundColor,
      }}
      aria-label="loading"
      role="img"
    />
  );
}





