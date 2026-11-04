import { MutableRefObject, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Pose, STALE_MS } from './protocol';
export type DisplayCalibration = { fov: number; x: number; y: number; z: number; yaw: number; pitch: number; roll: number };
export const defaultCalibration: DisplayCalibration = {fov:20,x:0,y:0,z:0,yaw:0,pitch:0,roll:0};
export default function WearableScene({pose, received, anchored, calibration, onError}: {
  pose: MutableRefObject<Pose | null>; received: MutableRefObject<number>; anchored: boolean;
  calibration: DisplayCalibration; onError: (message: string) => void;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const settings = useRef({anchored, calibration});
  settings.current = {anchored, calibration};
  const errorRef = useRef(onError); errorRef.current = onError;
  useEffect(() => {
    if (!mount.current) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({alpha:true,antialias:false}); }
    catch { errorRef.current('WebGL unavailable on this runtime. Connection diagnostics still work.'); return; }
    const host = mount.current;
    renderer.setPixelRatio(1); renderer.setClearColor(0x000000, 1);
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(20,1,0.01,50);
    const root = new THREE.Group(); root.matrixAutoUpdate = false; scene.add(root);
    scene.add(new THREE.HemisphereLight(0xffffff,0x888888,3));
    const light = new THREE.DirectionalLight(0xffffff,3); light.position.set(1,2,2); scene.add(light);
    const placeholder = new THREE.Mesh(new THREE.TorusGeometry(.035,.004,8,24),new THREE.MeshBasicMaterial({color:0x62ffb0})); root.add(placeholder);
    let disposed = false;
    function disposeObject(object: THREE.Object3D) {
      object.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (Array.isArray(o.material)?o.material:[o.material]).forEach(m => {Object.values(m).forEach(v=>{if(v instanceof THREE.Texture)v.dispose();});m.dispose();}); } });
    }
    new GLTFLoader().load('/models/wmcyn_3d_logo.glb',gltf=>{
      if(disposed){disposeObject(gltf.scene);return;}
      const model=gltf.scene; const box=new THREE.Box3().setFromObject(model);const size=box.getSize(new THREE.Vector3());
      const center=box.getCenter(new THREE.Vector3());model.position.sub(center);const wrapper=new THREE.Group();wrapper.add(model);
      wrapper.scale.setScalar(.1/Math.max(size.x,size.y,size.z,.001));root.remove(placeholder);disposeObject(placeholder);root.add(wrapper);
    },undefined,()=>errorRef.current('Logo unavailable; showing tracking ring.'));
    const resize=()=>{const w=host.clientWidth||600,h=host.clientHeight||600;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};
    const observer=new ResizeObserver(resize);observer.observe(host);resize();
    const extrinsic=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(1,1,1);
    renderer.setAnimationLoop(()=>{
      const p=pose.current;root.visible=!!p?.tracking&&performance.now()-received.current<STALE_MS;
      const c=settings.current.calibration;camera.fov=c.fov;camera.updateProjectionMatrix();
      if(p&&root.visible){
        if(settings.current.anchored){
          position.set(c.x,c.y,c.z);rotation.setFromEuler(new THREE.Euler(c.pitch*Math.PI/180,c.yaw*Math.PI/180,c.roll*Math.PI/180));
          extrinsic.compose(position,rotation,scale);root.matrix.fromArray(p.matrix);root.matrix.premultiply(extrinsic);
        }else root.matrix.makeTranslation(0,0,-.7);
      }
      renderer.render(scene,camera);
    });
    return()=>{disposed=true;observer.disconnect();renderer.setAnimationLoop(null);disposeObject(root);renderer.dispose();renderer.domElement.remove();};
  },[pose,received]);
  return <div ref={mount} style={{position:'absolute',inset:0}} />;
}
