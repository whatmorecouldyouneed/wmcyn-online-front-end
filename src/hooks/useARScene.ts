import React, { useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { type MarkerConfig, DEFAULT_HIRO_PATTERN_URL_PLACEHOLDER } from '../config/markers';

interface UseARSceneProps {
  mountRef: React.RefObject<HTMLDivElement>;
  configs: MarkerConfig[];
  setIsLoading: (loading: boolean) => void;
  // onLoaded?: () => void; // Optional: if more granular control is needed
  // onError?: (message: string) => void; // Optional: for error handling
}

export const useARScene = ({ mountRef, configs, setIsLoading }: UseARSceneProps) => {
  useEffect(() => {
    const mountElement = mountRef.current; // Capture current mount element
    const { THREE: WinThree, THREEx } = window as any;
    if (!WinThree || !THREEx) {
      console.error("three.js or ar.js (THREEx) not found on window object.");
      setIsLoading(false);
      // onError?.("AR libraries not found.");
      return;
    }

    let renderer: THREE.WebGLRenderer;
    let scene: THREE.Scene;
    let camera: THREE.Camera;
    let arToolkitSource: any;
    let arToolkitContext: any;
    const markerRoots: THREE.Group[] = [];
    const markerControlsArray: any[] = [];
    const mixers: THREE.AnimationMixer[] = [];
    let clock: THREE.Clock;
    let animationFrameId: number;

    const onResize = () => {
      if (!arToolkitSource || !renderer || !mountRef.current) return;
      arToolkitSource.onResizeElement();
      arToolkitSource.copyElementSizeTo(renderer.domElement);
      if (arToolkitContext?.arController) {
        arToolkitSource.copyElementSizeTo(arToolkitContext.arController.canvas);
      }
      if (mountRef.current) { // Check mountRef.current before accessing clientWidth/Height
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      }
    };

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!renderer || !scene || !camera || !arToolkitSource || !arToolkitContext || !arToolkitSource.ready) return;
      try {
        arToolkitContext.update(arToolkitSource.domElement);
        markerRoots.forEach(mr => {
          if (mr) scene.visible = mr.visible; // Revisit if multiple markers need independent visibility logic
        });
        renderer.render(scene, camera);
        mixers.forEach(m => m.update(clock.getDelta()));
      } catch (error) {
        console.error("error during animation frame:", error);
        // Consider stopping animation or notifying user
      }
    };

    const init = () => {
      if (!mountRef.current) {
        console.error("mountRef.current is null in init. Aborting AR setup.");
        setIsLoading(false);
        // onError?.("AR Mount point not available.");
        return;
      }

      renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance'
      });
      renderer.setClearColor(new THREE.Color(0x000000), 0); // Transparent background
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.domElement.style.position = 'absolute';
      renderer.domElement.style.top = '0px';
      renderer.domElement.style.left = '0px';
      renderer.domElement.style.right = '0px';
      renderer.domElement.style.bottom = '0px';
      renderer.domElement.style.width = '100vw';
      renderer.domElement.style.height = '100vh';
      renderer.domElement.style.zIndex = '2';
      mountRef.current.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      camera = new THREE.Camera();
      scene.add(camera);

      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
      dirLight.position.set(0, 10, 5);
      scene.add(dirLight);

      clock = new THREE.Clock();

      // Enhanced camera configuration for better mobile support
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      arToolkitSource = new THREEx.ArToolkitSource({ 
        sourceType: 'webcam', 
        sourceWidth: isMobile ? 480 : 640, 
        sourceHeight: isMobile ? 320 : 480,
        // Add camera constraints for mobile devices
        facingMode: isMobile ? 'environment' : 'user'
      });
      
      arToolkitSource.init(() => {
        console.log('ArToolkitSource initialized successfully');
        
        // Ensure video element is properly configured and visible
        if (arToolkitSource.domElement) {
          console.log('Video element found:', arToolkitSource.domElement);
          
          // Critical styling for video visibility - force viewport dimensions
          arToolkitSource.domElement.style.position = 'absolute';
          arToolkitSource.domElement.style.top = '0px';
          arToolkitSource.domElement.style.left = '0px';
          arToolkitSource.domElement.style.right = '0px';
          arToolkitSource.domElement.style.bottom = '0px';
          arToolkitSource.domElement.style.width = '100vw';
          arToolkitSource.domElement.style.height = '100vh';
          arToolkitSource.domElement.style.maxWidth = '100vw';
          arToolkitSource.domElement.style.maxHeight = '100vh';
          arToolkitSource.domElement.style.minWidth = '100vw';
          arToolkitSource.domElement.style.minHeight = '100vh';
          arToolkitSource.domElement.style.margin = '0';
          arToolkitSource.domElement.style.padding = '0';
          arToolkitSource.domElement.style.boxSizing = 'border-box';
          arToolkitSource.domElement.style.zIndex = '1';
          arToolkitSource.domElement.style.objectFit = 'cover';
          arToolkitSource.domElement.style.display = 'block';
          
          // Mobile video attributes
          arToolkitSource.domElement.setAttribute('playsinline', 'true');
          arToolkitSource.domElement.setAttribute('webkit-playsinline', 'true');
          arToolkitSource.domElement.setAttribute('autoplay', 'true');
          arToolkitSource.domElement.setAttribute('muted', 'true');
          
          // Ensure video is appended to mount point
          if (mountRef.current && !mountRef.current.contains(arToolkitSource.domElement)) {
            mountRef.current.appendChild(arToolkitSource.domElement);
          }
        } else {
          console.error('No video element created by ArToolkitSource');
        }
        
        // Delay resize and setIsLoading(false) until AR source is truly ready
        setTimeout(() => {
          if (arToolkitSource && arToolkitSource.ready) {
            onResize();
            setIsLoading(false);
            console.log('AR Scene ready with video dimensions:', {
              videoWidth: arToolkitSource.domElement?.videoWidth,
              videoHeight: arToolkitSource.domElement?.videoHeight,
              ready: arToolkitSource.ready
            });
          } else {
            console.warn('ArToolkitSource not ready after timeout');
            setIsLoading(false);
          }
        }, 2000); // Increased delay for mobile compatibility
      }, (error: any) => {
        console.error('ArToolkitSource initialization failed:', error);
        setIsLoading(false);
      });

      arToolkitContext = new THREEx.ArToolkitContext({
        cameraParametersUrl: THREEx.ArToolkitContext.baseURL + '../data/data/camera_para.dat',
        detectionMode: 'mono',
        matrixCodeType: '3x3',
        // Improved detection settings for better responsiveness
        canvasWidth: 640,
        canvasHeight: 480,
        imageSmoothingEnabled: false,
      });

      arToolkitContext.init(() => {
        if (!arToolkitContext || !camera) return; // Guard against uninitialized context/camera
        camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());

        configs.forEach(config => {
          const markerRoot = new THREE.Group();
          scene.add(markerRoot);
          markerRoots.push(markerRoot);

          let actualPatternUrl = config.patternUrl;
          if (config.patternUrl === DEFAULT_HIRO_PATTERN_URL_PLACEHOLDER) {
            if (THREEx.ArToolkitContext && THREEx.ArToolkitContext.baseURL) {
              actualPatternUrl = THREEx.ArToolkitContext.baseURL + '../data/data/patt.hiro';
            } else {
              console.error('THREEx.ArToolkitContext.baseURL is not available to construct default hiro pattern URL.');
              // onError?.(`Failed to resolve pattern for ${config.name}`);
              return; 
            }
          }

          const markerControls = new THREEx.ArMarkerControls(arToolkitContext, markerRoot, {
            type: 'pattern',
            patternUrl: actualPatternUrl,
            changeMatrixMode: 'modelViewMatrix'
          });
          markerControlsArray.push(markerControls);

          const loader = new GLTFLoader();
          loader.load(config.modelUrl, gltf => {
            const model = gltf.scene;
            if (model) {
              const scale = config.scale || 1.0;
              model.scale.set(scale, scale, scale);
              markerRoot.add(model);

              if (gltf.animations && gltf.animations.length) {
                const newMixer = new THREE.AnimationMixer(model);
                mixers.push(newMixer);
                const action = newMixer.clipAction(gltf.animations[0]);
                action.play();
              }
              
              if (config.onFound) {
                // Marker visibility can be checked using markerControls.object3d.visible in animate loop,
                // or by listening to 'markerFound' / 'markerLost' events if AR.js version supports them reliably.
                markerControls.addEventListener('markerFound', () => {
                  // console.log(`Marker found: ${config.name}`);
                  if(config.onFound) config.onFound();
                });
                // markerControls.addEventListener('markerLost', () => {
                //   console.log(`Marker lost: ${config.name}`);
                // });
              }
            }
          }, undefined, error => {
            console.error(`error loading model ${config.modelUrl} for marker ${config.name}:`, error);
            // onError?.(`Failed to load model for ${config.name}`);
          });
        });
      });

      window.addEventListener('resize', onResize);
      
      // Start animation loop
      animate(); 
    };

    init();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', onResize);

      mixers.forEach(mixer => {
        // Basic cleanup for mixers. More thorough cleanup might involve stopping actions and uncaching.
        // mixer.stopAllAction(); // if available and needed
      });
      mixers.length = 0;

      markerRoots.forEach(markerRoot => {
        scene?.remove(markerRoot);
        markerRoot.traverse(object => {
          if (object instanceof THREE.Mesh) {
            object.geometry?.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material?.dispose();
            }
          }
        });
      });
      markerRoots.length = 0;
      markerControlsArray.length = 0; // Controls are associated with markerRoots, no specific dispose needed beyond this

      arToolkitSource?.domElement?.remove(); // remove video element
      arToolkitSource?.destroy?.(); // if ar.js provides a destroy method for source
      arToolkitContext?.arController?.dispose?.(); // if ar.js provides a dispose method for controller

      renderer?.dispose();
      if (mountElement && renderer?.domElement && mountElement.contains(renderer.domElement)) {
        mountElement.removeChild(renderer.domElement);
      }
      // Scene children are disposed above, scene itself doesn't have a .dispose()
    };
  }, [mountRef, configs, setIsLoading]); // Dependencies for the hook's useEffect
}; 