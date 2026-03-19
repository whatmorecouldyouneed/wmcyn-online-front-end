import "@/styles/globals.css";
// import "@/styles/embla.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import Script from "next/script";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { CartProvider } from '@/contexts/CartContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { AdminAuthProvider } from '@/contexts/AdminAuthContext';
import { Outfit } from 'next/font/google';

declare global {
  interface Window {
    eruda?: { init: () => void };
  }
}

function erudaShouldLoad(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_ERUDA === "true") return true;
  try {
    if (new URLSearchParams(window.location.search).get("eruda") === "1") return true;
    if (window.localStorage?.getItem("eruda") === "1") return true;
  } catch {
    /* ok */
  }
  return false;
}

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isAdminPage = router.pathname.startsWith('/admin');
  const [loadEruda, setLoadEruda] = useState(false);

  useEffect(() => {
    setLoadEruda(erudaShouldLoad());
  }, []);

  const AppContent = () => (
    <>
      {loadEruda && (
        <Script
          src="https://cdn.jsdelivr.net/npm/eruda/eruda.js"
          strategy="afterInteractive"
          onLoad={() => {
            // eruda shows "please call eruda init first" if plugins run before init — init immediately on script load
            window.eruda?.init?.();
          }}
        />
      )}
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo-512x512.png"></link>
        <meta name="theme-color" content="#000000" />
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

  if (isAdminPage) {
    return (
      <AdminAuthProvider>
        <AppContent />
      </AdminAuthProvider>
    );
  }

  return (
    <AuthProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AuthProvider>
  );
}