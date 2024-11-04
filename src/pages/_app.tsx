// _app.js

import "@/styles/globals.module.css";
import type { AppProps } from "next/app";
import Head from "next/head";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
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
