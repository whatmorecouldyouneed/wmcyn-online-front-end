import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import LiquidGlassEffect from '@/components/ui/LiquidGlassEffect';
import { usePrivacy } from '@/components/privacy/PrivacyProvider';
import { useAuth } from '@/contexts/AuthContext';
import { claimInstance, getInstance } from '@/lib/apiClient';
import { editionLabel, formatClaimCode, pendingClaimKey } from '@/lib/instances';
import { trackClaimEvent } from '@/lib/scanAnalytics';
import { fragmentParam } from '@/lib/wmcynUrl';
import type { PublicInstance } from '@/types/instances';
import styles from '@/styles/Index.module.scss';
import instanceStyles from '@/styles/Instance.module.scss';

type Phase = 'idle' | 'claiming' | 'done' | 'failed';

// the claim link printed inside the tag lands here with its code in the fragment (#k=), which
// never reaches a server. claiming always waits for an explicit tap.
export default function ClaimPage() {
  const router = useRouter();
  const publicId = typeof router.query.id === 'string' ? router.query.id.toUpperCase() : '';
  const { currentUser } = useAuth();
  const { consent } = usePrivacy();
  const [instance, setInstance] = useState<PublicInstance | null>(null);
  const [loadError, setLoadError] = useState('');
  const [code, setCode] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!router.isReady || !publicId) return;
    const fromLink = fragmentParam(window.location.href, 'k');
    const pending = sessionStorage.getItem(pendingClaimKey(publicId));
    const secret = fromLink || pending;
    if (secret) setCode(formatClaimCode(secret));
    // keep the code out of history, screenshots of the address bar, and shared links
    if (fromLink) window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }, [router.isReady, publicId]);

  useEffect(() => {
    if (!router.isReady || !publicId) return;
    let cancelled = false;
    getInstance(publicId)
      .then((found) => !cancelled && setInstance(found))
      .catch((error: Error) => !cancelled && setLoadError(error.message || 'could not load this item'));
    return () => {
      cancelled = true;
    };
  }, [router.isReady, publicId, currentUser]);

  const signInToClaim = () => {
    if (code) sessionStorage.setItem(pendingClaimKey(publicId), code);
    router.push(`/login?next=${encodeURIComponent(`/p/${publicId}/claim`)}`);
  };

  const claim = async () => {
    setPhase('claiming');
    setMessage('');
    void trackClaimEvent(consent.analytics, 'product_claim_started', publicId);
    try {
      await claimInstance(publicId, code);
      sessionStorage.removeItem(pendingClaimKey(publicId));
      setPhase('done');
      void trackClaimEvent(consent.analytics, 'product_claim_completed', publicId);
    } catch (error: any) {
      setPhase('failed');
      setMessage(String(error?.message || 'could not claim right now. try again.').toLowerCase());
    }
  };

  const name = instance?.productSet?.name || 'wmcyn item';
  const edition = instance ? editionLabel(instance) : null;
  const codeComplete = code.replace(/-/g, '').length === 16;

  return (
    <>
      <Head>
        <title>{`claim ${name} | WMCYN`}</title>
        <meta name="robots" content="noindex" />
        <meta name="referrer" content="no-referrer" />
      </Head>
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          <LiquidGlassEffect variant="menu">
            <div className={instanceStyles.card}>
              <p className={instanceStyles.eyebrow}>claim · {publicId}</p>
              <h1 className={instanceStyles.title}>{name}</h1>
              {edition && <p className={instanceStyles.edition}>{edition}</p>}
              {loadError && <p className={instanceStyles.error}>{loadError.toLowerCase()}</p>}

              {phase === 'done' || instance?.ownedByYou ? (
                <>
                  <p className={`${instanceStyles.status} ${instanceStyles.owned}`}>it&apos;s yours. it now shows in your collection.</p>
                  <Link className={instanceStyles.link} href="/dashboard">see your collection</Link>
                </>
              ) : instance?.status === 'void' ? (
                <p className={instanceStyles.error}>this item can no longer be claimed.</p>
              ) : instance?.status === 'claimed' ? (
                <p className={instanceStyles.status}>someone has already claimed this item.</p>
              ) : (
                <>
                  <p className={instanceStyles.note}>
                    enter the code printed inside the tag. it proves this item is in your hands; the code on the outside only shows what it is.
                  </p>
                  <input
                    className={instanceStyles.codeInput}
                    value={code}
                    onChange={(event) => setCode(formatClaimCode(event.target.value))}
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    aria-label="claim code"
                  />
                  {message && <p className={instanceStyles.error}>{message}</p>}
                  <div className={instanceStyles.actions}>
                    {currentUser ? (
                      <LiquidGlassEffect variant="button">
                        <button className={styles.ctaButton} onClick={claim} disabled={!codeComplete || phase === 'claiming'}>
                          {phase === 'claiming' ? 'claiming…' : 'claim it'}
                        </button>
                      </LiquidGlassEffect>
                    ) : (
                      <LiquidGlassEffect variant="button">
                        <button className={styles.ctaButton} onClick={signInToClaim}>
                          sign in to claim
                        </button>
                      </LiquidGlassEffect>
                    )}
                    <Link className={instanceStyles.link} href={`/p/${publicId}`}>back to the item</Link>
                  </div>
                </>
              )}
            </div>
          </LiquidGlassEffect>
        </div>
      </div>
    </>
  );
}
