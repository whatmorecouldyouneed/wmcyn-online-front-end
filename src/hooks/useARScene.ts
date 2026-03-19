import { useEffect, useRef } from 'react';
import { type MarkerConfig } from '../config/markers';
import {
  buildARVideoConstraints,
  getMindArEnvironmentDeviceId,
  sharpenVideoElementTrack,
} from '../utils/cameraConstraints';
import { applyLinearTextureFiltersForWebGL1 } from '../utils/threeTextureFilters';
import {
  logActiveVideoResolutionSoon,
  logWebGLDrawBuffer,
} from '../utils/cameraResolutionLog';
import {
  popArGetUserMediaResolutionPatch,
  pushArGetUserMediaResolutionPatch,
} from '../utils/getUserMediaArPatch';

interface UseARSceneProps {
  mountRef: React.RefObject<HTMLDivElement>;
  configs: MarkerConfig[];
  setIsLoading: (loading: boolean) => void;
}

// animation configuration
const ROTATION_SPEED = 0.005;   // auto-spin speed (radians per normalised frame)
const DRAG_SENSITIVITY = 0.011; // radians per pixel for single-finger drag-to-spin
const SPIN_FRICTION = 0.92;     // momentum decay per normalised 60fps frame (frame-rate independent via Math.pow)
const MODEL_Y_OFFSET = -0.6;    // move model down below the marker (negative = down)

// get MindARThree from window global (loaded via script tags in _document.tsx Head)
const getMindARThree = (): any => {
  const win = window as any;
  const paths = [
    win.MINDAR?.IMAGE?.MindARThree,
    win.MindARThree,
    win.MINDAR?.MindARThree,
  ];
  for (const cls of paths) {
    if (cls && typeof cls === 'function') return cls;
  }
  return null;
};

// poll until the CDN scripts finish loading and expose the global
const waitForMindAR = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    const found = getMindARThree();
    if (found) { resolve(found); return; }

    console.log('[useARScene] Waiting for MindAR global...');
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const cls = getMindARThree();
      if (cls) {
        clearInterval(interval);
        console.log('[useARScene] MindAR global found after', attempts * 100, 'ms');
        resolve(cls);
      } else if (attempts >= 100) {
        clearInterval(interval);
        const win = window as any;
        console.error('[useARScene] MindAR not found after 10s. window.MINDAR:', win.MINDAR, 'window.THREE:', !!win.THREE);
        reject(new Error('MindAR not available after 10 seconds'));
      }
    }, 100);
  });
};

// shape exposed to consumers (e.g. ARCamera) so share capture can re-render on demand
export interface ThreeContext {
  renderer: any;
  scene: any;
  camera: any;
  model?: any;
  spinRotation?: number;
}

/** silent abort path when user leaves ar during init — not a real failure */
const MINDAR_INIT_CANCELLED = 'MINDAR_INIT_CANCELLED';

export const useARScene = ({ mountRef, configs, setIsLoading }: UseARSceneProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const isInitializedRef = useRef(false);
  const isCancelledRef = useRef(false);
  const threeRef = useRef<ThreeContext | null>(null);
  const mindARRef = useRef<any>(null);
  /** cleared on mindar start settle + on unmount — avoids orphaned timeout logging after success/cleanup */
  const mindArStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** abort preflight .mind fetch when leaving ar (stops “load failed” noise from cancelled requests) */
  const mindPrefetchAbortRef = useRef<AbortController | null>(null);

  // pinch-to-scale state
  const userScaleRef = useRef(1.0);         // multiplier driven by pinch gesture
  const baseScaleRef = useRef(1.0);         // model's computed scale at load time
  const lastPinchDistRef = useRef<number | null>(null); // finger distance on previous frame

  // drag-to-spin state
  const spinRotationRef = useRef(0);                    // shared accumulator for both auto and user spin
  const lastDragXRef = useRef<number | null>(null);     // x position of single finger on previous frame
  const dragVelocityRef = useRef(0);                    // angular momentum (radians/frame) — coasts after finger lifts

  // interaction highlight — yellow 3d outline that glows on touch
  const outlineMeshesRef = useRef<any[]>([]);
  const outlineOpacityRef = useRef(0);   // current animated opacity
  const outlineTargetRef = useRef(0);    // target: 1 while touching, 0 when released

  useEffect(() => {
    if (!configs || configs.length === 0) return;

    const container = mountRef.current;
    if (!container) {
      setIsLoading(false);
      return;
    }

    if (isInitializedRef.current) return;

    isCancelledRef.current = false;

    // light up the outline the moment any finger touches the model
    const handleTouchStart = () => {
      outlineTargetRef.current = 1;
    };

    // handles both single-finger drag-to-spin and two-finger pinch-to-scale
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // two-finger pinch — scale the model
        e.preventDefault(); // blocks browser zoom

        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (lastPinchDistRef.current !== null) {
          const ratio = dist / lastPinchDistRef.current;
          userScaleRef.current = Math.min(3.0, Math.max(0.3, userScaleRef.current * ratio));
        }
        lastPinchDistRef.current = dist;
        lastDragXRef.current = null; // reset drag tracking while pinching
      } else if (e.touches.length === 1) {
        // single-finger drag — apply immediately and capture as momentum for coasting
        const x = e.touches[0].clientX;
        if (lastDragXRef.current !== null) {
          const dragDelta = (x - lastDragXRef.current) * DRAG_SENSITIVITY;
          dragVelocityRef.current = dragDelta; // overwrite (not accumulate) — tracks current swipe speed
          spinRotationRef.current += dragDelta;
        }
        lastDragXRef.current = x;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) lastPinchDistRef.current = null;
      if (e.touches.length < 1) {
        lastDragXRef.current = null;
        outlineTargetRef.current = 0; // begin fading the outline once all fingers lift
      }
    };

    // passive: false is required on ios safari to allow preventDefault()
    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    
    // filter to only nft markers with .mind files for dynamic multi-marker support
    const nftConfigs = configs.filter(c => c?.markerType === 'nft' && c?.mindTargetSrc);
    const patternConfigs = configs.filter(c => c?.markerType === 'pattern' || (!c?.markerType && c?.patternUrl));
    
    console.log('[useARScene] Initializing with configs:', {
      totalConfigs: configs.length,
      nftConfigs: nftConfigs.length,
      patternConfigs: patternConfigs.length,
      nftMarkers: nftConfigs.map(c => ({ name: c.name, mindTargetSrc: c.mindTargetSrc })),
      markerOrder: nftConfigs.map(c => c.name)
    });

    // mindar only supports one .mind target per instance — use the first nft marker
    if (nftConfigs.length > 0) {
      const primaryConfig = nftConfigs[0];
      console.log('[useARScene] Using NFT AR mode with single marker:', primaryConfig.name);
      initNFTAR(container, [primaryConfig]);
    } else if (patternConfigs.length > 0) {
      console.log('[useARScene] Using Pattern AR mode (fallback)');
      const config = patternConfigs[0];
      initPatternAR(container, config);
    } else {
      console.error('[useARScene] No valid marker configs found');
      setIsLoading(false);
    }

    // cleanup
    return () => {
      isCancelledRef.current = true;

      mindPrefetchAbortRef.current?.abort();
      mindPrefetchAbortRef.current = null;
      if (mindArStartTimeoutRef.current) {
        clearTimeout(mindArStartTimeoutRef.current);
        mindArStartTimeoutRef.current = null;
      }

      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      outlineMeshesRef.current = [];
      
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
    // supports multiple markers by trying each one sequentially
    async function initNFTAR(container: HTMLDivElement, configs: MarkerConfig[]) {
      console.log('[useARScene] Initializing NFT AR with', configs.length, 'marker(s)');
      
      // try each marker config until one successfully initializes
      // mindar can only load one .mind file per instance, so we try them one at a time
      for (let i = 0; i < configs.length; i++) {
        const config = configs[i];
        console.log(`[useARScene] Attempting to initialize with marker ${i + 1}/${configs.length}:`, {
          name: config.name,
          mindTargetSrc: config.mindTargetSrc
        });
        
        try {
          await initSingleNFTMarker(container, config, configs);
          // if successful, break out of the loop
          console.log('[useARScene] Successfully initialized with marker:', config.name);
          break;
        } catch (err: any) {
          if (err?.message === MINDAR_INIT_CANCELLED || isCancelledRef.current) {
            break;
          }
          console.error(`[useARScene] Failed to initialize with marker ${config.name}:`, err);
          // if this is the last marker, throw the error
          if (i === configs.length - 1) {
            throw new Error(`Failed to initialize with any marker. Last error: ${err.message}`);
          }
          // otherwise, try the next marker
          console.log(`[useARScene] Trying next marker...`);
        }
      }
    }
    
    async function initSingleNFTMarker(container: HTMLDivElement, config: MarkerConfig, allConfigs: MarkerConfig[]) {
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
        if (!mindFileUrl || !/\.mind(\?|$)/i.test(mindFileUrl)) {
          throw new Error(`Invalid MindAR target: ${mindFileUrl || 'empty'}`);
        }
        console.log('[useARScene] Checking .mind file accessibility:', mindFileUrl);
        let fileAccessible = false;
        mindPrefetchAbortRef.current = new AbortController();
        const prefetchSignal = mindPrefetchAbortRef.current.signal;
        try {
          // try GET instead of HEAD to better simulate what MindAR will do
          const response = await fetch(mindFileUrl!, { method: 'GET', signal: prefetchSignal });
          if (!response.ok) {
            throw new Error(`.mind file not accessible: ${response.status} ${response.statusText}`);
          }
          const contentType = response.headers.get('content-type');
          const contentLength = response.headers.get('content-length');
          console.log('[useARScene] .mind file accessible:', {
            contentType,
            contentLength,
            url: mindFileUrl,
            status: response.status
          });
          // verify it's actually a .mind file by checking the response
          const blob = await response.blob();
          console.log('[useARScene] .mind file blob size:', blob.size, 'bytes');
          if (blob.size === 0) {
            throw new Error('.mind file is empty');
          }
          fileAccessible = true;
        } catch (fetchErr: any) {
          if (fetchErr?.name === 'AbortError' || prefetchSignal.aborted) {
            throw new Error(MINDAR_INIT_CANCELLED);
          }
          console.error('[useARScene] .mind file fetch failed:', fetchErr.message);
          console.error('[useARScene] .mind file URL:', mindFileUrl);
          console.error('[useARScene] Full fetch error:', fetchErr);
          // if file is not accessible, this is a critical error
          if (fetchErr.message.includes('not accessible') || fetchErr.message.includes('empty')) {
            throw new Error(`Cannot load .mind file: ${mindFileUrl}. Error: ${fetchErr.message}`);
          }
          // don't throw for other errors - let MindAR try to load it anyway (might be CORS issue)
        }
        
        const MindARThree = await waitForMindAR();
        if (isCancelledRef.current || !MindARThree) return;

        const THREE = (window as any).THREE;
        if (!THREE) throw new Error('THREE not available on window — CDN script may have failed');

        if (isCancelledRef.current) return;

        // mind-ar@1.2.5 ignores a custom `video` object; it only uses environmentDeviceId + facingMode.
        const mindArEnvDeviceId = await getMindArEnvironmentDeviceId();

        // create mindar instance with built-in stabilization
        // filterMinCF: lower = smoother but more delay (default: 0.001)
        // filterBeta: higher = more responsive but more jitter (default: 1000)
        console.log('[useARScene] Creating MindAR instance with target:', config.mindTargetSrc);
        console.log('[useARScene] File accessibility check result:', fileAccessible);
        
        let mindar: any;
        try {
          mindar = new MindARThree({
            container: container,
            imageTargetSrc: config.mindTargetSrc,
            maxTrack: 1,
            uiLoading: 'no',
            uiScanning: 'no',
            uiError: 'no',
            filterMinCF: 0.0001, // very smooth tracking
            filterBeta: 0.01, // low responsiveness for stability
            ...(mindArEnvDeviceId ? { environmentDeviceId: mindArEnvDeviceId } : {}),
          });
          console.log('[useARScene] MindAR instance created successfully');
          
          // add error listeners to catch MindAR internal errors
          if (mindar.on && typeof mindar.on === 'function') {
            mindar.on('error', (error: any) => {
              if (isCancelledRef.current) return;
              console.error('[useARScene] MindAR error event:', error);
              console.error('[useARScene] MindAR error details:', {
                error,
                targetFile: config.mindTargetSrc,
                configName: config.name
              });
            });
          }
          
          // also check for error property or methods
          if (mindar.error) {
            console.warn('[useARScene] MindAR has error property:', mindar.error);
          }
        } catch (initErr: any) {
          console.error('[useARScene] MindAR instance creation failed:', initErr);
          console.error('[useARScene] Error details:', {
            message: initErr?.message,
            stack: initErr?.stack,
            targetFile: config.mindTargetSrc
          });
          throw new Error(`Failed to create MindAR instance. Target file: ${config.mindTargetSrc}. Error: ${initErr?.message || initErr}`);
        }
        
          mindARRef.current = mindar;

          // push renderer to native device pixel ratio for sharper live view and captures
          if (mindar.renderer) {
            try {
              mindar.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3));
            } catch { /* ok if mindar doesn't expose renderer yet */ }
          }

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
        const GLTFLoader = THREE.GLTFLoader || (window as any).THREE?.GLTFLoader;
        
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
            applyLinearTextureFiltersForWebGL1(model, THREE);
            
            // scale and position the model
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = (config.scale || 0.8) / maxDim;
            model.scale.setScalar(scale);
            baseScaleRef.current = scale;
            
            // center the model and offset below the marker
            const center = box.getCenter(new THREE.Vector3());
            model.position.set(-center.x * scale, MODEL_Y_OFFSET, -center.z * scale);

            // build the interaction highlight: a slightly-scaled BackSide mesh on every surface
            // collect meshes first, then add outlines — avoids traverse visiting newly-added children
            outlineMeshesRef.current = [];
            const nftMeshesToOutline: any[] = [];
            model.traverse((child: any) => {
              if (child.isMesh) nftMeshesToOutline.push(child);
            });
            const nftOutlineMat = new THREE.MeshBasicMaterial({
              color: 0xffd700,
              side: THREE.BackSide,
              transparent: true,
              opacity: 0,
              depthWrite: false,
            });
            for (const child of nftMeshesToOutline) {
              const om = new THREE.Mesh(child.geometry, nftOutlineMat.clone());
              om.scale.setScalar(1.08);
              child.add(om);
              outlineMeshesRef.current.push(om);
            }
            
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
          hasCamera: !!mindar.camera,
          imageTargetSrc: config.mindTargetSrc
        });
        
        // mindar’s internal getusermedia omits width/height — patch merges 1280×720 so webkit does not pick vga
        pushArGetUserMediaResolutionPatch();

        // wrap start() in a promise to catch errors
        const startPromise = new Promise<void>((resolve, reject) => {
          try {
            const startResult = mindar.start();
            // if start() returns a promise, await it
            if (startResult && typeof startResult.then === 'function') {
              startResult
                .then(() => {
                  console.log('[useARScene] MindAR.start() promise resolved');
                  resolve();
                })
                .catch((err: any) => {
                  console.error('[useARScene] MindAR.start() promise rejected:', err);
                  reject(err);
                });
            } else {
              // if start() doesn't return a promise, resolve immediately
              console.log('[useARScene] MindAR.start() completed synchronously');
              resolve();
            }
          } catch (startErr: any) {
            console.error('[useARScene] MindAR.start() threw error:', startErr);
            reject(startErr);
          }
        });
        
        const timeoutPromise = new Promise<void>((_, reject) => {
          mindArStartTimeoutRef.current = setTimeout(() => {
            mindArStartTimeoutRef.current = null;
            if (isCancelledRef.current) {
              reject(new Error(MINDAR_INIT_CANCELLED));
              return;
            }
            console.error('[useARScene] Timeout reached - MindAR.start() did not complete');
            reject(new Error(`MindAR start timed out after 12 seconds. Check camera permissions and .mind file: ${config.mindTargetSrc}`));
          }, 12000);
        });
        
        // log progress every 5 seconds
        const progressInterval = setInterval(() => {
          if (isCancelledRef.current) return;
          console.log('[useARScene] Still waiting for MindAR.start()...', {
            targetFile: config.mindTargetSrc,
            configName: config.name
          });
        }, 5000);
        
        try {
          await Promise.race([startPromise, timeoutPromise]);
        } catch (startError: any) {
          const errorMsg = startError?.message || String(startError);
          if (errorMsg === MINDAR_INIT_CANCELLED || isCancelledRef.current) {
            throw new Error(MINDAR_INIT_CANCELLED);
          }
          console.error('[useARScene] MindAR start failed:', errorMsg);
          console.error('[useARScene] Error details:', {
            message: errorMsg,
            targetFile: config.mindTargetSrc,
            configName: config.name,
            error: startError
          });
          
          // if error mentions "Load failed" or "null", provide specific guidance
          if (errorMsg.includes('Load failed') || errorMsg.includes('null')) {
            throw new Error(`Failed to load .mind file: ${config.mindTargetSrc}. Please verify the file exists and is properly compiled. Original error: ${errorMsg}`);
          }
          
          throw startError;
        } finally {
          if (mindArStartTimeoutRef.current) {
            clearTimeout(mindArStartTimeoutRef.current);
            mindArStartTimeoutRef.current = null;
          }
          clearInterval(progressInterval);
          popArGetUserMediaResolutionPatch();
        }
        
        console.log('[useARScene] MindAR started successfully');

        if (isCancelledRef.current) {
          mindar.stop();
          return;
        }

        // mindar.resize() sets renderer buffer from container; refresh pixel ratio after internal setup
        try {
          mindar.resize?.();
          if (mindar.renderer?.setPixelRatio) {
            mindar.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3));
          }
        } catch { /* ok */ }

        logActiveVideoResolutionSoon('nft/mindar', mindar.video);
        logWebGLDrawBuffer('nft/mindar', mindar.renderer);

        // animation loop - mindar handles position smoothing via filterMinCF/filterBeta
        let lastTime = performance.now();
        
        renderer.setAnimationLoop(() => {
          if (isCancelledRef.current) return;
          
          const now = performance.now();
          const delta = Math.min((now - lastTime) / 1000, 0.1);
          lastTime = now;
          
          if (threeRef.current?.model) {
            // when not touching, decay drag momentum and coast — frame-rate independent friction
            if (lastDragXRef.current === null) {
              dragVelocityRef.current *= Math.pow(SPIN_FRICTION, delta * 60);
              spinRotationRef.current += dragVelocityRef.current;
            }
            // auto-spin always underlies the rotation
            spinRotationRef.current += ROTATION_SPEED * delta * 60;
            threeRef.current.model.rotation.y = spinRotationRef.current;
            threeRef.current.model.scale.setScalar(baseScaleRef.current * userScaleRef.current);

            // animate gold highlight outline: fast appear, slow linger-fade
            const oTarget = outlineTargetRef.current;
            const lerpRate = oTarget > outlineOpacityRef.current ? 0.2 : 0.06;
            outlineOpacityRef.current += (oTarget - outlineOpacityRef.current) *
              Math.min(lerpRate * delta * 60, 1);
            if (outlineMeshesRef.current.length > 0) {
              const op = outlineOpacityRef.current;
              outlineMeshesRef.current.forEach((m: any) => { m.material.opacity = op; });
            }
          }
          
          renderer.render(scene, camera);
        });

        isInitializedRef.current = true;
        setIsLoading(false);

      } catch (err: any) {
        if (err?.message === MINDAR_INIT_CANCELLED) {
          return;
        }
        console.error('[useARScene] NFT AR failed:', err?.message || err);
        console.error('[useARScene] Full error:', err);
        
        // determine specific error message
        const errorMessage = err?.message || 'MindAR could not load';
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
        const videoConstraints = await buildARVideoConstraints();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
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

        await sharpenVideoElementTrack(video);
        logActiveVideoResolutionSoon('pattern-ar (after sharpen)', video);

        // set up three.js
        const THREE = await import('three');
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        if (isCancelledRef.current) return;

        const width = window.innerWidth;
        const height = window.innerHeight;

        // preserveDrawingBuffer lets canvas.toBlob/drawImage read back a frame for share export
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3));
        renderer.setClearColor(0x000000, 0);
        renderer.domElement.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:2;pointer-events:none';
        container.appendChild(renderer.domElement);
        logWebGLDrawBuffer('pattern-ar', renderer);

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
          applyLinearTextureFiltersForWebGL1(model, THREE);
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          model.position.sub(center);
          
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const patternScale = 1.5 / maxDim;
          model.scale.setScalar(patternScale);
          baseScaleRef.current = patternScale;
          model.position.y += 0.25;
          scene.add(model);

          // build the interaction highlight — collect meshes first, then add outlines
          outlineMeshesRef.current = [];
          const patternMeshesToOutline: any[] = [];
          model.traverse((child: any) => {
            if (child.isMesh) patternMeshesToOutline.push(child);
          });
          const patternOutlineMat = new THREE.MeshBasicMaterial({
            color: 0xffd700,
            side: THREE.BackSide,
            transparent: true,
            opacity: 0,
            depthWrite: false,
          });
          for (const child of patternMeshesToOutline) {
            const om = new THREE.Mesh(child.geometry, patternOutlineMat.clone());
            om.scale.setScalar(1.08);
            child.add(om);
            outlineMeshesRef.current.push(om);
          }
          
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
            // when not touching, decay drag momentum and coast — frame-rate independent friction
            if (lastDragXRef.current === null) {
              dragVelocityRef.current *= Math.pow(SPIN_FRICTION, delta * 60);
              spinRotationRef.current += dragVelocityRef.current;
            }
            // auto-spin always underlies the rotation
            spinRotationRef.current += ROTATION_SPEED * delta * 60;
            model.rotation.y = spinRotationRef.current;
            model.scale.setScalar(baseScaleRef.current * userScaleRef.current);

            // animate gold highlight outline: fast appear, slow linger-fade
            const oTarget = outlineTargetRef.current;
            const lerpRate = oTarget > outlineOpacityRef.current ? 0.2 : 0.06;
            outlineOpacityRef.current += (oTarget - outlineOpacityRef.current) *
              Math.min(lerpRate * delta * 60, 1);
            if (outlineMeshesRef.current.length > 0) {
              const op = outlineOpacityRef.current;
              outlineMeshesRef.current.forEach((m: any) => { m.material.opacity = op; });
            }
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

  // expose for share capture — caller can read renderer/scene/camera to re-render on demand
  return { threeRef };
};
