import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface ModelViewerProps {
  src: string;
  width?: number;
  height?: number;
  background?: string;
}

// reusable three.js viewer with simple orbit controls
export default function ModelViewer({ src, width = 480, height = 360, background = 'transparent' }: ModelViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
    camera.position.set(0, 0.6, 2.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(new THREE.Color('#000000'), background === 'transparent' ? 0 : 1);
    mountEl.appendChild(renderer.domElement);

    // lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    hemi.position.set(0, 1, 0);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(2, 2, 2);
    scene.add(dir);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;

    const group = new THREE.Group();
    scene.add(group);

    const loader = new GLTFLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      src,
      (gltf) => {
        const model = gltf.scene || gltf.scenes?.[0];
        if (model) {
          const box = new THREE.Box3().setFromObject(model);
          const sizeVec = new THREE.Vector3();
          box.getSize(sizeVec);
          const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
          const scale = 1.6 / maxDim;
          model.scale.setScalar(scale);
          const center = new THREE.Vector3();
          box.getCenter(center);
          model.position.sub(center);
          group.add(model);
        }
      },
      undefined,
      (err) => {
        console.error('model viewer failed to load model:', err);
      }
    );

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      controls.dispose();
      renderer.dispose();
      mountEl.removeChild(renderer.domElement);
      scene.clear();
    };
  }, [src, width, height, background]);

  return (
    <div
      ref={mountRef}
      style={{ width, height, background }}
      aria-label="3d-model-viewer"
    />
  );
}



