import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  const mindArImportMap = {
    imports: {
      three: 'https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.module.js',
      'three/addons/': 'https://cdn.jsdelivr.net/npm/three@0.147.0/examples/jsm/',
      'mindar-image-three': 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js',
    },
  };

  const mindArBootstrap = `
    import * as THREE from 'three';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    import { MindARThree } from 'mindar-image-three';

    window.THREE = { ...THREE, GLTFLoader };
    window.MINDAR = {
      IMAGE: { MindARThree },
      MindARThree
    };
  `;

  return (
    <Html lang="en">
      <Head>
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Mobile web app meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* github pages spa routing: restore url from ?p= query param set by 404.html */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var s = window.location.search;
                if (s.length > 1 && s.indexOf('?p=') === 0) {
                  var decoded = decodeURIComponent(s.slice(3));
                  window.history.replaceState(null, '', '/' + decoded);
                }
              })();
            `,
          }}
        />

        {/* MindAR 1.2.x is ESM-only for three.js integration, so bootstrap it with importmap + module. */}
        <script
          type="importmap"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(mindArImportMap) }}
        />
        <script
          type="module"
          dangerouslySetInnerHTML={{ __html: mindArBootstrap }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
