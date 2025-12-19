import { useEffect, useRef } from 'react';
import { type MarkerConfig } from '../config/markers';

interface UseARSceneProps {
  mountRef: React.RefObject<HTMLDivElement>;
  configs: MarkerConfig[];
  setIsLoading: (loading: boolean) => void;
}

// animation configuration
const ROTATION_SPEED = 0.005; // slower, more elegant rotation
const MODEL_Y_OFFSET = -0.6; // move model down below the marker (negative = down)

// helper to get mindar class from window (scripts loaded in _document.tsx)
const getMindARThree = (): any => {
  const win = window as any;
  const paths = [
    win.MINDAR?.IMAGE?.MindARThree,
    win.MindARThree,
    win.MINDAR?.MindARThree,
  ];
  
  for (const path of paths) {
    if (path && typeof path === 'function') {
      return path;
    }
  }
  return null;
};

// wait for MindARThree to be available (scripts loaded in _document.tsx)
const loadMindARScript = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    const existing = getMindARThree();
    if (existing) {
      resolve(existing);
      return;
    }

    // poll for it in case scripts are still loading
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds max
    
    const checkInterval = setInterval(() => {
      attempts++;
      const found = getMindARThree();
      
      if (found) {
        clearInterval(checkInterval);
        resolve(found);
        return;
      }
      
      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        reject(new Error('MindAR not available'));
      }
    }, 100);
  });
};

export const useARScene = ({ mountRef, configs, setIsLoading }: UseARSceneProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const isInitializedRef = useRef(false);
  const isCancelledRef = useRef(false);
  const threeRef = useRef<any>(null);
  const mindARRef = useRef<any>(null);

  useEffect(() => {
    if (!configs || configs.length === 0) return;

    const container = mountRef.current;
    if (!container) {
      setIsLoading(false);
      return;
    }

    if (isInitializedRef.current) return;

    isCancelledRef.current = false;
    const config = configs[0];
    const isNFTMarker = config?.markerType === 'nft' && config?.mindTargetSrc;

    // use nft detection or fallback to pattern ar
    if (isNFTMarker) {
      initNFTAR(container, config);
    } else {
      initPatternAR(container, config);
    }

    // cleanup
    return () => {
      isCancelledRef.current = true;
      
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      
      if (mindARRef.current) {
        try { mindARRef.current.stop(); } catch (e) { /* ignore */ }
        mindARRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.remove();
        videoRef.current = null;
      }
      
      if (threeRef.current?.renderer) {
        threeRef.current.renderer.dispose();
        threeRef.current.renderer.domElement.remove();
        threeRef.current = null;
      }
      
      isInitializedRef.current = false;
    };

    // nft marker initialization using mindar
    async function initNFTAR(container: HTMLDivElement, config: MarkerConfig) {
      try {
        const MindARThree = await loadMindARScript();
        if (isCancelledRef.current || !MindARThree) return;

        const THREE = (window as any).THREE;
        if (!THREE) throw new Error('THREE not available');

        if (isCancelledRef.current) return;

        // create mindar instance with built-in stabilization
        // filterMinCF: lower = smoother but more delay (default: 0.001)
        // filterBeta: higher = more responsive but more jitter (default: 1000)
        const mindar = new MindARThree({
          container: container,
          imageTargetSrc: config.mindTargetSrc,
          maxTrack: 1,
          uiLoading: 'no',
          uiScanning: 'no',
          uiError: 'no',
          filterMinCF: 0.0001, // very smooth tracking
          filterBeta: 0.01, // low responsiveness for stability
        });

        mindARRef.current = mindar;
        const { renderer, scene, camera } = mindar;

        if (!renderer || !scene || !camera) {
          throw new Error('MindAR missing components');
        }

        // add lighting
        scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.position.set(5, 10, 7);
        scene.add(directionalLight);

        // create anchor for tracking
        const anchor = mindar.addAnchor(0);
        
        if (anchor.group && !scene.children.includes(anchor.group)) {
          scene.add(anchor.group);
        }

        // load 3d model
        const modelUrl = config?.modelUrl || '/models/wmcyn_3d_logo.glb';
        let model: any = null;

        const GLTFLoader = (THREE as any).GLTFLoader;
        
        if (GLTFLoader) {
          try {
            const loader = new GLTFLoader();
            const gltf = await new Promise<any>((resolve, reject) => {
              loader.load(modelUrl, resolve, undefined, reject);
            });
            
            model = gltf.scene;
            
            // scale and position the model
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = (config.scale || 0.8) / maxDim;
            model.scale.setScalar(scale);
            
            // center the model and offset below the marker
            const center = box.getCenter(new THREE.Vector3());
            model.position.set(-center.x * scale, MODEL_Y_OFFSET, -center.z * scale);
            
          } catch (err) {
            console.warn('[useARScene] Model load failed, using fallback');
          }
        }
        
        // fallback cube if model didn't load
        if (!model) {
          const geometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
          const material = new THREE.MeshStandardMaterial({ color: 0x4CC3D9 });
          model = new THREE.Mesh(geometry, material);
          model.position.y = 0.15;
        }
        
        anchor.group.add(model);
        
        // track spin rotation separately
        let spinRotation = 0;
        threeRef.current = { renderer, scene, camera, model };

        // target callbacks
        anchor.onTargetFound = () => {
          if (anchor.group) {
            anchor.group.visible = true;
            anchor.group.children.forEach((child: any) => { child.visible = true; });
          }
          config?.onFound?.();
        };

        anchor.onTargetLost = () => {
          // target lost
        };

        // start mindar
        await mindar.start();

        if (isCancelledRef.current) {
          mindar.stop();
          return;
        }

        // animation loop - mindar handles position smoothing via filterMinCF/filterBeta
        let lastTime = performance.now();
        
        renderer.setAnimationLoop(() => {
          if (isCancelledRef.current) return;
          
          const now = performance.now();
          const delta = Math.min((now - lastTime) / 1000, 0.1);
          lastTime = now;
          
          // smooth spin animation (frame-rate independent)
          if (threeRef.current?.model) {
            spinRotation += ROTATION_SPEED * delta * 60;
            threeRef.current.model.rotation.y = spinRotation;
          }
          
          renderer.render(scene, camera);
        });

        isInitializedRef.current = true;
        setIsLoading(false);

      } catch (err: any) {
        console.error('[useARScene] NFT AR failed:', err?.message);
        // fallback to pattern ar
        initPatternAR(container, config);
      }
    }

    // pattern ar fallback (camera + 3d model overlay)
    async function initPatternAR(container: HTMLDivElement, config: MarkerConfig) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });

        if (isCancelledRef.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;

        // create video element
        const video = document.createElement('video');
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.muted = true;
        video.playsInline = true;
        video.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:1';
        container.appendChild(video);
        videoRef.current = video;

        await video.play();
        if (isCancelledRef.current) return;

        // set up three.js
        const THREE = await import('three');
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        if (isCancelledRef.current) return;

        const width = window.innerWidth;
        const height = window.innerHeight;

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);
        renderer.domElement.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:2;pointer-events:none';
        container.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        camera.position.set(0, 0, 3);
        camera.lookAt(0, 0, 0);

        scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.position.set(5, 10, 7);
        scene.add(directionalLight);

        // load model
        const modelUrl = config?.modelUrl || '/models/wmcyn_3d_logo.glb';
        let model: any;

        try {
          const loader = new GLTFLoader();
          const gltf = await new Promise<any>((resolve, reject) => {
            loader.load(modelUrl, resolve, undefined, reject);
          });
          if (isCancelledRef.current) return;

          model = gltf.scene;
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          model.position.sub(center);
          
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          model.scale.setScalar(1.5 / maxDim);
          model.position.y += 0.25;
          scene.add(model);
          
        } catch (modelErr) {
          const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
          const material = new THREE.MeshStandardMaterial({ color: 0x4CC3D9 });
          model = new THREE.Mesh(geometry, material);
          model.position.y = 0.25;
          scene.add(model);
        }

        threeRef.current = { renderer, scene, camera, model, spinRotation: 0 };

        let lastTime = performance.now();
        
        const animate = () => {
          if (isCancelledRef.current) return;
          animationIdRef.current = requestAnimationFrame(animate);
          
          const now = performance.now();
          const delta = Math.min((now - lastTime) / 1000, 0.1);
          lastTime = now;
          
          if (model && threeRef.current) {
            // smooth frame-rate independent rotation
            threeRef.current.spinRotation += ROTATION_SPEED * delta * 60;
            model.rotation.y = threeRef.current.spinRotation;
          }
          
          renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
          const w = window.innerWidth;
          const h = window.innerHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        isInitializedRef.current = true;
        config?.onFound?.();
        setIsLoading(false);

      } catch (err: any) {
        console.error('[useARScene] Fallback AR error:', err?.message);
        setIsLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // empty deps - only run once on mount
};
