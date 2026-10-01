import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import LiquidGlassEffect from '@/components/ui/LiquidGlassEffect';
import { usePrivacy } from '@/components/privacy/PrivacyProvider';
import { getInstance } from '@/lib/apiClient';
import { editionLabel } from '@/lib/instances';
import { trackProductScan } from '@/lib/scanAnalytics';
import type { PublicInstance } from '@/types/instances';
import styles from '@/styles/Index.module.scss';
import instanceStyles from '@/styles/Instance.module.scss';

type State =
  | { status: 'loading' }
  | { status: 'ready'; instance: PublicInstance }
  | { status: 'not-found' }
  | { status: 'error' };

// what anyone sees when they scan the outside of a wmcyn item. scanning never claims it:
// claiming needs the separate code inside the tag (see /p/[id]/claim).
export default function InstancePage() {
  const router = useRouter();
  const publicId = typeof router.query.id === 'string' ? router.query.id.toUpperCase() : '';
  const [state, setState] = useState<State>({ status: 'loading' });
  const { consent } = usePrivacy();

  useEffect(() => {
    if (!router.isReady || !publicId) return;
    let cancelled = false;
    getInstance(publicId)
      .then((instance) => !cancelled && setState({ status: 'ready', instance }))
      .catch((error: Error) => !cancelled && setState(/not found|no wmcyn item/i.test(error.message) ? { status: 'not-found' } : { status: 'error' }));
    return () => {
      cancelled = true;
    };
  }, [router.isReady, publicId]);

  useEffect(() => {
    if (state.status === 'ready') void trackProductScan(consent.analytics, state.instance.canonicalUrl);
  }, [state, consent.analytics]);

  const instance = state.status === 'ready' ? state.instance : null;
  const name = instance?.productSet?.name || 'wmcyn item';
  const edition = instance ? editionLabel(instance) : null;

  return (
    <>
      <Head>
        <title>{`${name} | WMCYN`}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          <LiquidGlassEffect variant="menu">
            <div className={instanceStyles.card}>
              {state.status === 'loading' && <p className={instanceStyles.status}>loading…</p>}
              {state.status === 'not-found' && (
                <>
                  <h1 className={instanceStyles.title}>not a wmcyn item</h1>
                  <p className={instanceStyles.note}>this id doesn&apos;t match anything we made.</p>
                </>
              )}
              {state.status === 'error' && <p className={instanceStyles.error}>could not load this item. try again in a moment.</p>}
              {instance && (
                <>
                  <p className={instanceStyles.eyebrow}>wmcyn · {instance.publicId}</p>
                  <h1 className={instanceStyles.title}>{name}</h1>
                  {edition && <p className={instanceStyles.edition}>{edition}</p>}
                  {instance.productSet?.description && <p className={instanceStyles.note}>{instance.productSet.description}</p>}
                  {instance.status === 'void' && <p className={instanceStyles.error}>this item is no longer valid.</p>}
                  {instance.status === 'claimed' && (
                    <p className={`${instanceStyles.status} ${instance.ownedByYou ? instanceStyles.owned : ''}`}>
                      {instance.ownedByYou ? 'this one is yours.' : 'this item has an owner.'}
                    </p>
                  )}
                  {instance.status === 'claimable' && (
                    <p className={instanceStyles.note}>
                      unclaimed. the claim code is inside the tag; only whoever has it can make this item theirs.
                    </p>
                  )}
                  <div className={instanceStyles.actions}>
                    {instance.productSet?.slug && (
                      <LiquidGlassEffect variant="button">
                        <button className={styles.ctaButton} onClick={() => router.push(`/${instance.productSet?.slug}`)}>
                          see it in ar
                        </button>
                      </LiquidGlassEffect>
                    )}
                    {instance.status === 'claimable' && (
                      <Link className={instanceStyles.link} href={`/p/${instance.publicId}/claim`}>
                        i have the claim code
                      </Link>
                    )}
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
