import { Html, Head, Main, NextScript } from "next/document";

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
        
        {/* Three.js and MindAR for NFT/image tracking */}
        {/* Loading in document head to avoid ngrok CORS issues */}
        <script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js" crossOrigin="anonymous" />
        <script src="https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/loaders/GLTFLoader.js" crossOrigin="anonymous" />
        <script src="https://cdn.jsdelivr.net/npm/mind-ar@1.1.5/dist/mindar-image-three.prod.js" crossOrigin="anonymous" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
