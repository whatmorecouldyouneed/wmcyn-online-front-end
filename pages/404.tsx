import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '@/styles/Index.module.scss';

// github pages serves 404.html for any path without a matching file, with the url intact.
// dynamic routes are exported as client-rendered templates, so paths that match one are handed
// to the client router. keep in sync with the dynamic routes under pages/.
const DYNAMIC_ROUTES = [
  /^\/ar\/[^/]+$/,
  /^\/ar-session\/[^/]+$/,
  /^\/viewer\/[^/]+$/,
  /^\/session\/[^/]+$/,
  /^\/admin\/product-sets\/[^/]+$/,
  /^\/admin\/product-sets\/[^/]+\/details$/,
  /^\/admin\/ar-sessions\/[^/]+$/,
  /^\/[^/]+$/,
];

// an unmatched client route makes next hard-reload the url, which lands back here
const RETRY_WINDOW_MS = 10_000;

export default function NotFound() {
  const router = useRouter();
  const [showNotFound, setShowNotFound] = useState(false);

  useEffect(() => {
    const { pathname, search, hash } = window.location;
    const path = pathname.replace(/\/+$/, '') || '/';
    const target = `${pathname}${search}${hash}`;

    if (path === '/404' || !DYNAMIC_ROUTES.some((route) => route.test(path))) {
      setShowNotFound(true);
      return;
    }

    const key = `wmcyn_route_fallback:${target}`;
    const lastAttempt = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - lastAttempt < RETRY_WINDOW_MS) {
      sessionStorage.removeItem(key);
      setShowNotFound(true);
      return;
    }

    sessionStorage.setItem(key, String(Date.now()));
    router.replace(target).catch(() => setShowNotFound(true));
  }, [router]);

  return (
    <>
      <Head>
        <title>page not found | WMCYN</title>
        <meta name="robots" content="noindex" />
      </Head>
      {showNotFound && (
        <div className={styles.pageContainer}>
          <div className={styles.container}>
            <div style={{ textAlign: 'center', color: 'white' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 300, marginBottom: '12px' }}>page not found</h1>
              <p style={{ opacity: 0.7, marginBottom: '24px' }}>this link doesn&apos;t go anywhere yet.</p>
              <Link href="/" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                ← back to wmcyn.online
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
