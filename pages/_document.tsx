import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Mobile web app meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </Head>
      <body>
        <Main />
        <NextScript />
        
        {/* scripts loaded in strict order using next/script with beforeInteractive */}
        {/* Three.js - must load first */}
        <Script 
          src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js" 
          strategy="beforeInteractive"
          id="three-js"
        />
        <Script 
          src="https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/loaders/GLTFLoader.js" 
          strategy="beforeInteractive"
          id="three-gltf-loader"
        />
        
        {/* MindAR - the -three version is a standalone bundle that includes everything for AR viewing */}
        <Script 
          src="https://cdn.jsdelivr.net/npm/mind-ar@1.1.5/dist/mindar-image-three.prod.js" 
          strategy="beforeInteractive"
          id="mindar-three"
        />
      </body>
    </Html>
  );
}
