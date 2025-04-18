// eslint-disable-next-line @typescript-eslint/no-explicit-any
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    THREE: any;
    THREEx: any;
  }
}

import styles from '../styles/Home.module.css';

interface ARCameraProps {
  onClose: () => void;
}

const ARCamera: React.FC<ARCameraProps> = ({ onClose }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.THREE || !window.THREEx) {
      console.error("THREE.js or THREEx not found. Check CDN scripts in _document.tsx");
      setIsLoading(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const THREE = window.THREE;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const THREEx = window.THREEx;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderer: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let scene: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let camera: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let arToolkitSource: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let arToolkitContext: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let markerControls: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let markerRoot: any;
    let animationFrameId: number;

    const init = () => {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setClearColor(new THREE.Color('lightgrey'), 0);
      const container = mountRef.current;
      if (!container) return;
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.domElement.style.position = 'absolute';
      renderer.domElement.style.top = '0px';
      renderer.domElement.style.left = '0px';
      renderer.domElement.style.zIndex = 'auto';
      container.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      camera = new THREE.Camera();
      scene.add(camera);

      arToolkitSource = new THREEx.ArToolkitSource({ sourceType: 'webcam' });
      arToolkitSource.init(() => {
        setTimeout(() => {
          onResize();
          setIsLoading(false);
        }, 500);
      });

      arToolkitContext = new THREEx.ArToolkitContext({
        cameraParametersUrl: THREEx.ArToolkitContext.baseURL + '../data/data/camera_para.dat',
        detectionMode: 'mono',
      });
      arToolkitContext.init(() => {
        camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
      });

      markerRoot = new THREE.Group();
      scene.add(markerRoot);

      markerControls = new THREEx.ArMarkerControls(arToolkitContext, markerRoot, {
        type: 'pattern',
        patternUrl: THREEx.ArToolkitContext.baseURL + '../data/data/patt.hiro',
        changeMatrixMode: 'modelViewMatrix'
      });

      // -- commented out cube
      // const geometry = new THREE.BoxGeometry(1, 1, 1);
      // const material = new THREE.MeshNormalMaterial({ transparent: true, opacity: 0.7, side: THREE.DoubleSide });
      // const mesh = new THREE.Mesh(geometry, material);
      // mesh.position.y = 0.5;
      // markerRoot.add(mesh);
      const loader = new THREE.FontLoader();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font: any) => {
        const textGeometry = new THREE.TextGeometry(
          'wmcyn og logo tee (sample)\nnumber 1 of 1\nprinted april 17th, 2025\nin atlanta, ga',
          {
            font: font,
            size: 0.15,
            height: 0.01,
            curveSegments: 8,
          }
        );

        const textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.name = 'rotatingText';

        textGeometry.computeBoundingBox();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const centerOffsetX = (textGeometry.boundingBox!.max.x - textGeometry.boundingBox!.min.x) / -2;

        textMesh.position.set(centerOffsetX - 1.0, 0.01, 0);
        textMesh.rotation.set(-Math.PI / 2, 0, 0); // face up, flat on the marker

        markerRoot.add(textMesh);
      });

      window.addEventListener('resize', onResize);
    };

    const onResize = () => {
      if (!arToolkitSource || !renderer || !mountRef.current) return;

      arToolkitSource.onResizeElement();
      arToolkitSource.copyElementSizeTo(renderer.domElement);

      if (arToolkitContext && arToolkitContext.arController !== null) {
        arToolkitSource.copyElementSizeTo(arToolkitContext.arController.canvas);
      }

      const video = arToolkitSource.domElement;
      const aspectRatio = video.videoWidth / video.videoHeight;
      if (camera.isPerspectiveCamera) {
        camera.aspect = aspectRatio;
        camera.updateProjectionMatrix();
      } else {
        if (arToolkitContext) {
          camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
        }
      }

      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!arToolkitSource || !arToolkitContext || !arToolkitSource.ready) return;
      arToolkitContext.update(arToolkitSource.domElement);
      scene.visible = markerRoot ? markerRoot.visible : false;
      
      renderer.render(scene, camera);
    };

    try {
      init();
      animate();
    } catch (e) {
      console.error("Error initializing AR scene:", e);
      setIsLoading(false);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', onResize);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      markerRoot?.children.forEach((child: any) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            child.material.forEach((mat: any) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      if (scene) {
        while (scene.children.length > 0) {
          scene.remove(scene.children[0]);
        }
      }
      if (arToolkitSource && arToolkitSource.domElement) {
        const stream = arToolkitSource.domElement.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        arToolkitSource.domElement.remove();
      }
      renderer?.dispose();
      if (mountRef.current && renderer?.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className={styles.cameraOverlay}>
      {isLoading && <div className={styles.arjsLoader}>Initializing AR...</div>}
      <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}></div>
      <button 
        onClick={onClose}
        className={styles.cameraCloseButton} 
        style={{ zIndex: 2, position: 'absolute' }}>
        Close AR View
      </button>
    </div>
  );
};

export default ARCamera;
