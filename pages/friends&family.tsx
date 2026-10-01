import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function FriendsAndFamilyCompatibilityRoute() {
  const router = useRouter();

  useEffect(() => {
    void router.replace('/friends-and-family');
  }, [router]);

  return null;
}
