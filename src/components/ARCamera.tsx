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
  const [isMarkerLarge, setIsMarkerLarge] = useState(false);

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
    // references to our two text meshes so we can quickly toggle visibility
    let textMeshSmall: any;
    let textMeshLarge: any;
    // local flag mirroring react state so we don't update state every frame unnecessarily
    let markerWasLarge = false;

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
        const createTextMesh = (
          label: string,
          size = 0.15,
          offsetX = -1.0,
          offsetY = 0.01
        ) => {
          const geometry = new THREE.TextGeometry(label, {
            font: font,
            size: size,
            height: 0.01,
            curveSegments: 8,
          });

          const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
          const mesh = new THREE.Mesh(geometry, material);

          geometry.computeBoundingBox();
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const centerOffsetX = (geometry.boundingBox!.max.x - geometry.boundingBox!.min.x) / -2;

          mesh.position.set(centerOffsetX + offsetX, offsetY, 0);
          mesh.rotation.set(-Math.PI / 2, 0, 0);
          return mesh;
        };

        // small / default message
        textMeshSmall = createTextMesh(
          'wmcyn og logo tee (sample)\nnumber 1 of 1\nprinted april 17th, 2025\nin atlanta, ga'
        );
        textMeshSmall.visible = true;
        textMeshSmall.name = 'textSmall';

        // large marker message – center above marker
        textMeshLarge = createTextMesh(
          'wmcyn charred holographic tote (sample)\nnumber 1 of 1\nprinted april 18th, 2025\nin atlanta, ga',
          0.09,
          0.55,
          -1.1
        );
        textMeshLarge.visible = false;
        textMeshLarge.name = 'textLarge';

        // add both to the scene but show only one at a time
        markerRoot.add(textMeshSmall);
        markerRoot.add(textMeshLarge);
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
      
      // when the marker is visible, check its distance from the camera to decide which text to show
      if (markerRoot.visible && textMeshSmall && textMeshLarge) {
        const markerWorldPos = new THREE.Vector3();
        markerRoot.getWorldPosition(markerWorldPos);
        const distance = markerWorldPos.length(); // camera is at origin (0,0,0)

        // heuristically, treat the marker as "large" when very close to the camera
        const threshold = 5; // tune as necessary – smaller values mean closer/larger marker
        const isNowLarge = distance < threshold;

        if (isNowLarge !== markerWasLarge) {
          // toggle visibility of meshes
          textMeshSmall.visible = !isNowLarge;
          textMeshLarge.visible = isNowLarge;

          markerWasLarge = isNowLarge;
          setIsMarkerLarge(isNowLarge);
        }
      }

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
