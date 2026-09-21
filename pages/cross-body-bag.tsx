import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function CrossBodyBagRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/wmcyn-shoulder-bag');
  }, [router]);

  return null;
}
