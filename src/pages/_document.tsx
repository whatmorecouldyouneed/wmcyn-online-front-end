import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Add AR.js CDN scripts - Load older working versions used in the working CodePen I found https://codepen.io/egor-sorokin/pen/EwYaze */}
        <script src="https://cdn.rawgit.com/jeromeetienne/AR.js/1.5.1/aframe/examples/vendor/aframe/build/aframe.min.js"></script>
        <script src="https://cdn.rawgit.com/jeromeetienne/AR.js/1.5.1/aframe/build/aframe-ar.js"></script>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
