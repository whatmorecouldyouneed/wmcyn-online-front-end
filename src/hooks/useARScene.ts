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
  
  // check all possible paths where MindARThree might be
  const paths = [
    { name: 'MINDAR.IMAGE.MindARThree', value: win.MINDAR?.IMAGE?.MindARThree },
    { name: 'MindARThree', value: win.MindARThree },
    { name: 'MINDAR.MindARThree', value: win.MINDAR?.MindARThree },
  ];
  
  for (const path of paths) {
    if (path.value && typeof path.value === 'function') {
      console.log('[getMindARThree] Found at:', path.name);
      return path.value;
    }
  }
  
  // log what we do have for debugging
  console.log('[getMindARThree] Not found. Available:', {
    MINDAR: !!win.MINDAR,
    'MINDAR.IMAGE': win.MINDAR?.IMAGE ? Object.keys(win.MINDAR.IMAGE) : 'undefined',
    MindARThree: !!win.MindARThree,
    THREE: !!win.THREE
  });
  
  return null;
};

// wait for MindARThree to be available (scripts loaded in _document.tsx)
const loadMindARScript = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    const existing = getMindARThree();
    if (existing) {
      console.log('[useARScene] MindAR found immediately');
      resolve(existing);
      return;
    }

    console.log('[useARScene] Waiting for MindAR to load...');

    // poll for it in case scripts are still loading
    let attempts = 0;
    const maxAttempts = 200; // 20 seconds max (increased for slow mobile connections)
    
    const checkInterval = setInterval(() => {
      attempts++;
      const found = getMindARThree();
      
      if (found) {
        clearInterval(checkInterval);
        console.log('[useARScene] MindAR found after', attempts * 100, 'ms');
        resolve(found);
        return;
      }
      
      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.error('[useARScene] MindAR not available after 20 seconds. Window.MINDAR:', (window as any).MINDAR);
        reject(new Error('MindAR not available - scripts may have failed to load'));
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

    console.log('[useARScene] Initializing with config:', {
      name: config?.name,
      markerType: config?.markerType,
      mindTargetSrc: config?.mindTargetSrc,
      isNFTMarker,
      configCount: configs.length
    });

    // use nft detection or fallback to pattern ar
    if (isNFTMarker) {
      console.log('[useARScene] Using NFT AR mode with target:', config.mindTargetSrc);
      initNFTAR(container, config);
    } else {
      console.log('[useARScene] Using Pattern AR mode (fallback)');
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
        console.log('[useARScene] Starting NFT AR initialization...');
        
        // pre-flight check: verify camera permission
        console.log('[useARScene] Checking camera permission...');
        try {
          const permissionStatus = await navigator.permissions?.query({ name: 'camera' as PermissionName });
          console.log('[useARScene] Camera permission status:', permissionStatus?.state);
        } catch (permErr) {
          console.log('[useARScene] Could not query camera permission (normal on some browsers)');
        }
        
        // pre-flight check: verify .mind file is accessible
        const mindFileUrl = config.mindTargetSrc;
        console.log('[useARScene] Checking .mind file accessibility:', mindFileUrl);
        try {
          const response = await fetch(mindFileUrl!, { method: 'HEAD' });
          if (!response.ok) {
            throw new Error(`.mind file not accessible: ${response.status} ${response.statusText}`);
          }
          console.log('[useARScene] .mind file accessible, content-type:', response.headers.get('content-type'));
        } catch (fetchErr: any) {
          console.error('[useARScene] .mind file fetch failed:', fetchErr.message);
          // don't throw - let MindAR try to load it anyway (might be CORS issue with HEAD)
        }
        
        const MindARThree = await loadMindARScript();
        if (isCancelledRef.current || !MindARThree) return;

        const THREE = (window as any).THREE;
        if (!THREE) throw new Error('THREE not available');

        if (isCancelledRef.current) return;

        // create mindar instance with built-in stabilization
        // filterMinCF: lower = smoother but more delay (default: 0.001)
        // filterBeta: higher = more responsive but more jitter (default: 1000)
        console.log('[useARScene] Creating MindAR instance with target:', config.mindTargetSrc);
        
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
        
        console.log('[useARScene] MindAR instance created');

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

        console.log('[useARScene] Loading 3D model from:', modelUrl);
        const GLTFLoader = (THREE as any).GLTFLoader;
        
        if (GLTFLoader) {
          try {
            const loader = new GLTFLoader();
            const gltf = await new Promise<any>((resolve, reject) => {
              loader.load(
                modelUrl, 
                (loaded: any) => {
                  console.log('[useARScene] Model loaded successfully');
                  resolve(loaded);
                }, 
                (progress: any) => {
                  if (progress.lengthComputable) {
                    console.log('[useARScene] Model loading:', Math.round(progress.loaded / progress.total * 100) + '%');
                  }
                }, 
                (error: any) => {
                  console.error('[useARScene] Model load error:', error);
                  reject(error);
                }
              );
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
            
          } catch (err: any) {
            console.error('[useARScene] Model load failed:', err?.message || err);
          }
        } else {
          console.warn('[useARScene] GLTFLoader not available');
        }
        
        // only add model if it loaded successfully - no fallback cube
        if (model) {
          anchor.group.add(model);
        } else {
          console.error('[useARScene] No model loaded - check model path:', modelUrl);
        }
        
        // track spin rotation separately
        let spinRotation = 0;
        threeRef.current = { renderer, scene, camera, model };

        // target callbacks
        anchor.onTargetFound = () => {
          console.log('[useARScene] 🎯 TARGET FOUND! Config:', config?.name);
          if (anchor.group) {
            anchor.group.visible = true;
            anchor.group.children.forEach((child: any) => { child.visible = true; });
          }
          if (config?.onFound) {
            console.log('[useARScene] Calling onFound callback');
            config.onFound();
          } else {
            console.log('[useARScene] No onFound callback defined');
          }
        };

        anchor.onTargetLost = () => {
          console.log('[useARScene] Target lost');
        };

        // start mindar with timeout to prevent infinite hang
        console.log('[useARScene] Starting MindAR...');
        console.log('[useARScene] MindAR instance:', {
          hasRenderer: !!mindar.renderer,
          hasScene: !!mindar.scene,
          hasCamera: !!mindar.camera
        });
        
        const startPromise = mindar.start();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            console.error('[useARScene] Timeout reached - MindAR.start() did not complete');
            reject(new Error('MindAR start timed out after 30 seconds. Check camera permissions and .mind file.'));
          }, 30000);
        });
        
        // log progress every 5 seconds
        const progressInterval = setInterval(() => {
          console.log('[useARScene] Still waiting for MindAR.start()...');
        }, 5000);
        
        try {
          await Promise.race([startPromise, timeoutPromise]);
          clearInterval(progressInterval);
        } catch (startError: any) {
          clearInterval(progressInterval);
          console.error('[useARScene] MindAR start failed:', startError?.message || startError);
          throw startError;
        }
        
        console.log('[useARScene] MindAR started successfully');

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
        console.error('[useARScene] NFT AR failed:', err?.message || err);
        console.error('[useARScene] Full error:', err);
        
        // determine specific error message
        let errorMessage = err?.message || 'MindAR could not load';
        let suggestion = 'Try refreshing the page';
        
        if (errorMessage.includes('timed out')) {
          suggestion = 'Check your camera permissions and internet connection';
        } else if (errorMessage.includes('camera') || errorMessage.includes('permission')) {
          suggestion = 'Please allow camera access and try again';
        } else if (errorMessage.includes('not available')) {
          suggestion = 'The AR library failed to load. Check your internet connection';
        }
        
        // show error message instead of silent fallback
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.9);color:white;padding:24px;border-radius:12px;text-align:center;z-index:100;max-width:85%;';
        errorDiv.innerHTML = `
          <h3 style="margin:0 0 12px 0;font-size:18px;">AR Initialization Failed</h3>
          <p style="margin:0;font-size:14px;opacity:0.85;">${errorMessage}</p>
          <p style="margin:12px 0 16px 0;font-size:13px;opacity:0.65;">${suggestion}</p>
          <button onclick="location.reload()" style="background:#fff;color:#000;border:none;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer;">Reload Page</button>
        `;
        container.appendChild(errorDiv);
        setIsLoading(false);
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
          
        } catch (modelErr: any) {
          console.error('[useARScene] Pattern AR model load failed:', modelErr?.message || modelErr);
          // no fallback cube - just log the error
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
