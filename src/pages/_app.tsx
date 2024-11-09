import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { useEffect } from "react";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Load A-Frame
    const aframeScript = document.createElement("script");
    aframeScript.src = "https://cdnjs.cloudflare.com/ajax/libs/aframe/1.2.0/aframe.min.js";
    aframeScript.async = true;
    document.head.appendChild(aframeScript);

    // Load AR.js after A-Frame has loaded
    aframeScript.onload = () => {
      const arjsScript = document.createElement("script");
      arjsScript.src = "https://raw.githack.com/AR-js-org/AR.js/master/aframe/build/aframe-ar.js";
      arjsScript.async = true;
      document.head.appendChild(arjsScript);
    };

    // Cleanup to avoid multiple script instances
    return () => {
      aframeScript.remove();
      document.querySelectorAll("script[src*='aframe-ar.js']").forEach(script => script.remove());
    };
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
        <link rel="icon" href="/wmcyn_logo_condensed.png" type="image/png" />
        <title>WMCYN</title>
        <meta name="description" content="WMCYN - A future-forward startup combining modern technology with everyday lifestyle." />
        <meta name="keywords" content="WMCYN, technology, lifestyle, newsletter, shop, VR, AR" />
        <meta property="og:title" content="WMCYN" />
        <meta property="og:description" content="A future-forward startup combining modern technology with lifestyle essentials." />
        <meta property="og:image" content="/wmcyn_logo_condensed.png" />
        <meta property="og:url" content="https://wmcyn.online/" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://wmcyn.online/" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
