import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithCustomToken, signOut } from 'firebase/auth';
import { onValue, ref } from 'firebase/database';
import { API_BASE, wearableFirebase } from '@/features/wearables/firebase';
import { isFresh, parsePose, Pose, STALE_MS } from '@/features/wearables/protocol';
import { defaultCalibration, DisplayCalibration } from '@/features/wearables/WearableScene';
const Scene = dynamic(()=>import('@/features/wearables/WearableScene'),{ssr:false});
export default function Wearables() {
  const [uid,setUid]=useState<string|null>(null),[code,setCode]=useState(''),[status,setStatus]=useState('Connect your WMCYN iPhone app.'),[error,setError]=useState('');
  const [anchored,setAnchored]=useState(false),[details,setDetails]=useState(true),[stats,setStats]=useState(''),[connected,setConnected]=useState(false);
  const [calibration,setCalibration]=useState<DisplayCalibration>(defaultCalibration);
  const pose=useRef<Pose|null>(null),received=useRef(0),lastSeq=useRef(-1),count=useRef(0),pairGeneration=useRef(0),clockOffset=useRef(0);
  useEffect(()=>{try{const raw=JSON.parse(localStorage.getItem('wmcyn-wearables-calibration')||'null');if(raw&&Object.keys(defaultCalibration).every(k=>Number.isFinite(raw[k])))setCalibration({...defaultCalibration,...raw});}catch{}
    const {auth}=wearableFirebase();return onAuthStateChanged(auth,u=>setUid(u?.uid||null));},[]);
  useEffect(()=>()=>{pairGeneration.current++;},[]);
  useEffect(()=>{
    if(!uid)return;
    const {database}=wearableFirebase();let offPose=()=>{};let runId='';
    const offClock=onValue(ref(database,'.info/serverTimeOffset'),s=>{clockOffset.current=Number(s.val())||0;});
    const offConnection=onValue(ref(database,'.info/connected'),s=>{setConnected(s.val()===true);if(s.val()!==true)pose.current=null;});
    const offActive=onValue(ref(database,`wearables/${uid}/active`),s=>{
      offPose();pose.current=null;lastSeq.current=-1;const active=s.val();
      if(!active||typeof active.runId!=='string'||active.expiresAt<Date.now()+clockOffset.current){setStatus('Start a session in the iPhone app.');return;}
      runId=active.runId;setStatus('Connected · waiting for fresh tracking');
      offPose=onValue(ref(database,`wearables/${uid}/runs/${runId}/latest`),sample=>{
        const p=parsePose(sample.val());if(!p||!isFresh(p,Date.now()+clockOffset.current,lastSeq.current))return;
        lastSeq.current=p.seq;pose.current=p;received.current=performance.now();count.current++;
        setStatus(p.synthetic?'Synthetic test · not camera tracking':p.tracking?'Banner found':'Looking for the HQ banner');
      },e=>setError(e.message));
    },e=>setError(e.message));
    const timer=setInterval(()=>{const p=pose.current;setStats(`${count.current} received/s · processing ${p?.processingMs.toFixed(0)||'—'} ms · delivery age ${p?Math.max(0,Date.now()+clockOffset.current-p.publishedAtMs).toFixed(0):'—'} ms`);count.current=0;if(performance.now()-received.current>STALE_MS){pose.current=null;setStatus('Waiting for fresh tracking');}},1000);
    return()=>{offActive();offPose();offClock();offConnection();clearInterval(timer);pose.current=null;};
  },[uid]);
  async function pair(){
    const generation=++pairGeneration.current;setError('');setCode('');
    try{
      const receiverSecret=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
      const request=async(path:string,body:object)=>{const res=await fetch(`${API_BASE}/v1/auth/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});const data=await res.json();return{res,data};};
      const {res,data}=await request('code.create',{receiverSecret});if(!res.ok)throw Error(data.error||'Pairing unavailable');
      if(generation!==pairGeneration.current)return;setCode(data.code);setStatus('Enter this code in iOS → Account → Meta glasses.');
      const expires=Date.parse(data.expiresAt);
      while(generation===pairGeneration.current&&Date.now()<expires){
        await new Promise(r=>setTimeout(r,5000));if(generation!==pairGeneration.current)return;
        const next=await request('code.exchange',{code:data.code,receiverSecret});
        if(generation!==pairGeneration.current)return;
        if(next.res.status===200&&next.data.customToken){await signInWithCustomToken(wearableFirebase().auth,next.data.customToken);setCode('');return;}
        if(next.res.status!==202)throw Error(next.data.error||'Pairing failed');
      }
      if(generation===pairGeneration.current){setCode('');setStatus('Code expired. Generate another.');}
    }catch(e){if(generation===pairGeneration.current){setCode('');setError(e instanceof Error?e.message:String(e));}}
  }
  function updateCalibration(k:keyof DisplayCalibration,value:string){const n=Number(value);if(!Number.isFinite(n))return;const next={...calibration,[k]:k==='fov'?Math.max(5,Math.min(90,n)):Math.max(-180,Math.min(180,n))};setCalibration(next);localStorage.setItem('wmcyn-wearables-calibration',JSON.stringify(next));}
  return <>
    <Head><title>WMCYN · Glasses</title><meta name="mrbd-web-app-capable" content="yes"/><meta name="robots" content="noindex"/></Head>
    <div className="wearables">
      <Scene pose={pose} received={received} anchored={anchored} calibration={calibration} onError={setError}/>
      <div className="panel">
        <header><b>WMCYN / GLASSES</b><button onClick={()=>setDetails(!details)}>{details?'Hide controls':'Controls'}</button></header>
        <p role="status">{status}{uid&&!connected?' · offline':''}</p>
        {error&&<p role="alert" className="error">{error}</p>}
        {!uid&&<><strong className="code">{code}</strong><button onClick={pair}>Generate pairing code</button></>}
        {details&&uid&&<>
          <small>{stats}</small>
          <button onClick={()=>setAnchored(!anchored)}>{anchored?'Experimental marker alignment':'Fixed HUD preview'} · switch</button>
          {anchored&&<><p>Manual calibration. Not motion-stabilized. Default values are estimates.</p><div className="calibration">{(Object.keys(defaultCalibration) as (keyof DisplayCalibration)[]).map(k=><label key={k}>{k}<input type="number" step={k==='fov'||['yaw','pitch','roll'].includes(k)?1:.005} value={calibration[k]} onChange={e=>updateCalibration(k,e.target.value)}/></label>)}</div></>}
          <button onClick={()=>{pose.current=null;pairGeneration.current++;void signOut(wearableFirebase().auth);}}>Disconnect account</button>
        </>}
      </div>
    </div>
    <style jsx>{`
      .wearables{position:fixed;inset:0;background:#000;color:#fff;font:18px system-ui;overflow:hidden}
      .panel{position:relative;z-index:1;max-height:100%;overflow:auto;padding:24px;pointer-events:none}
      .panel button,.panel input{pointer-events:auto}header{display:flex;align-items:center;justify-content:space-between;gap:12px}
      button,input{font:inherit;color:white;background:#000;border:2px solid #aaa;border-radius:10px;padding:10px;margin:5px 0}
      button:focus-visible,input:focus-visible{outline:4px solid #7affba;outline-offset:3px}button{cursor:pointer}p{margin:12px 0}
      .code{display:block;font:44px monospace;letter-spacing:8px}.error{color:#ffab9a}.calibration{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
      label{display:flex;flex-direction:column}input{width:100%;min-width:0}small{display:block;font-size:14px}
    `}</style>
  </>;
}
