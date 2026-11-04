// Pin the controller ABI: detect/match/track/trackUpdate and projectionTransform are
// intentionally isolated here. No getUserMedia, video capture, or glasses-side CV.
const canvas = document.getElementById('frame');
const context = canvas.getContext('2d');
const status = document.getElementById('status');
let Controller, controller, lastTransform, configuration, targetBytes, busy = false;
let shape = '', lastSeq = -1;
const report = data => window.webkit?.messageHandlers?.wmcynTracker?.postMessage(data);
const fail = error => { status.textContent = String(error?.message || error); report({type:'error',message:status.textContent}); };
window.addEventListener('unhandledrejection',event=>fail(event.reason));
window.wmcynTracker = {
  async configure(config) {
    try {
      if (!Number.isFinite(config.physicalWidthMeters) || config.physicalWidthMeters <= 0) throw Error('Measure the printed target width first.');
      configuration = config;
      ({Controller} = await import('https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js'));
      const response = await fetch('/patterns/wmcyn-full-hq-banner-local.mind');
      if (!response.ok) throw Error(`Target download failed (${response.status})`);
      targetBytes = await response.arrayBuffer();
      status.textContent = 'Ready for glasses frames';report({type:'ready'});
    } catch(error) { fail(error); }
  },
  async frame(packet) {
    if (busy || !Controller || !targetBytes || packet.seq <= lastSeq) return;
    busy = true;lastSeq = packet.seq;const started = performance.now();
    try {
      const image = new Image();image.src = `data:image/jpeg;base64,${packet.jpeg}`;await image.decode();
      const w=image.naturalWidth,h=image.naturalHeight;
      if(shape!==`${w}x${h}`){
        // The old GPU runtime is reclaimed by reloading the WebView on a new capture
        // session. Within one stream the input is normalized natively to 360x640.
        if(controller){controller.dispose();controller.worker?.terminate();}
        canvas.width=w;canvas.height=h;
        controller=new Controller({inputWidth:w,inputHeight:h,maxTrack:1});
        const k=configuration.intrinsics;
        if(k){
          if(![k.fx,k.fy,k.cx,k.cy,k.width,k.height].every(Number.isFinite)||k.fx<=0||k.fy<=0||k.width<=0||k.height<=0)throw Error('Invalid camera intrinsics');
          controller.projectionTransform=[[k.fx*w/k.width,0,k.cx*w/k.width],[0,k.fy*h/k.height,k.cy*h/k.height],[0,0,1]];
        }
        controller.addImageTargetsFromBuffer(targetBytes);lastTransform=null;shape=`${w}x${h}`;
      }
      context.drawImage(image,0,0,w,h);
      if(lastTransform){
        const features=await controller.track(canvas,lastTransform,0);
        lastTransform=await controller.trackUpdate(lastTransform,features);
      }
      if(!lastTransform){const {featurePoints}=await controller.detect(canvas);const result=await controller.match(featurePoints,0);lastTransform=result.modelViewTransform;}
      let matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,-1,1];
      if(lastTransform){
        matrix=controller.getWorldMatrix(lastTransform,0);
        const [tw,th]=controller.markerDimensions[0];
        // MindAR uses target-image pixels and a bottom-left origin. Send a centered
        // OpenGL camera-space transform with translation in metres, column-major.
        for(let row=0;row<3;row++)matrix[12+row]=(matrix[12+row]+matrix[row]*tw/2+matrix[4+row]*th/2)*configuration.physicalWidthMeters/tw;
      }
      report({type:'pose',v:1,seq:packet.seq,receivedAtMs:packet.receivedAtMs,processingMs:performance.now()-started,tracking:!!lastTransform,synthetic:false,targetId:'wmcyn-hq-banner',matrix,width:w,height:h});
      status.textContent=lastTransform?'HQ banner tracked':'Looking for HQ banner';
    } catch(error){fail(error);} finally {busy=false;report({type:'frameDone',seq:packet.seq});}
  }
};
report({type:'loaded'});
