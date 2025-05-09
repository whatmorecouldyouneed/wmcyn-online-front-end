// Cleaned and fixed ARCamera.tsx
// Removed non-critical logging, simplified animation error handling

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface ARCameraProps {
  onClose: () => void;
}

const ARCamera: React.FC<ARCameraProps> = ({ onClose }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { THREE: WinThree, THREEx } = window as any;
    if (!WinThree || !THREEx) return;

    let renderer: THREE.WebGLRenderer;
    let scene: THREE.Scene;
    let camera: THREE.Camera;
    let arToolkitSource: any;
    let arToolkitContext: any;
    let markerControls: any;
    let markerRoot: THREE.Group;
    let animationFrameId: number;
    let mixer: THREE.AnimationMixer | null = null;
    let clock: THREE.Clock;

    const onResize = () => {
      if (!arToolkitSource || !renderer || !mountRef.current) return;
      arToolkitSource.onResizeElement();
      arToolkitSource.copyElementSizeTo(renderer.domElement);
      if (arToolkitContext?.arController) {
        arToolkitSource.copyElementSizeTo(arToolkitContext.arController.canvas);
      }
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!renderer || !scene || !camera || !arToolkitSource || !arToolkitContext || !arToolkitSource.ready) return;
      try {
        arToolkitContext.update(arToolkitSource.domElement);
        scene.visible = markerRoot.visible;
        renderer.render(scene, camera);
        if (mixer) {
          mixer.update(clock.getDelta());
        }
      } catch {}
    };

    const loadGLB = () => {
      const loader = new GLTFLoader();
      loader.load('/wmcyn_3d_logo.glb', gltf => {
        const model = gltf.scene;
        if (model) {
          model.scale.set(2.0, 2.0, 2.0);
          model.scale.set(0.7, 0.7, 0.7);
          model.position.set(0.75, 0.75, 1.25);
          // model.rotation.x = -Math.PI / 2;
          markerRoot.add(model);

          if (gltf.animations && gltf.animations.length) {
            mixer = new THREE.AnimationMixer(model);
            const action = mixer.clipAction(gltf.animations[0]);
            action.play();
          }
        }
      });
    };

    const init = () => {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setClearColor(new THREE.Color('lightgrey'), 0);
      if (!mountRef.current) return;
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      mountRef.current.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      camera = new THREE.Camera();
      scene.add(camera);

      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
      dirLight.position.set(0, 10, 5);
      scene.add(dirLight);

      markerRoot = new THREE.Group();
      scene.add(markerRoot);

      clock = new THREE.Clock();

      arToolkitSource = new THREEx.ArToolkitSource({ sourceType: 'webcam', sourceWidth: 640, sourceHeight: 480 });
      arToolkitSource.init(() => {
        setTimeout(() => {
          onResize();
          setIsLoading(false);
        }, 1000);
      });

      arToolkitContext = new THREEx.ArToolkitContext({
        cameraParametersUrl: THREEx.ArToolkitContext.baseURL + '../data/data/camera_para.dat',
        detectionMode: 'mono',
      });

      arToolkitContext.init(() => {
        camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
        markerControls = new THREEx.ArMarkerControls(arToolkitContext, markerRoot, {
          type: 'pattern',
          patternUrl: THREEx.ArToolkitContext.baseURL + '../data/data/patt.hiro',
          changeMatrixMode: 'modelViewMatrix'
        });
        loadGLB();
      });

      window.addEventListener('resize', onResize);
    };

    init();
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', onResize);
      renderer?.dispose();
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {isLoading && <div>Initializing AR...</div>}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }}></div>
      <button onClick={onClose} style={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }}>Close AR View</button>
    </div>
  );
};

export default ARCamera;
