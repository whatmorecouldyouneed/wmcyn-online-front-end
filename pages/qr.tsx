import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function QRRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    const code = (router.query.code as string) || '';
    if (code) {
      router.replace(`/ar/${encodeURIComponent(code)}`);
    }
  }, [router.query.code, router]);

  return (
    <main style={{ padding: 24 }}>
      Loading…
    </main>
  );
}

