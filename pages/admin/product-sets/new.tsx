import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { createProductSet, arSessions } from '@/lib/apiClient';
import { CreateProductSetRequest } from '@/types/productSets';
import ARProductBuilder, { ARProductFormData } from '@/components/admin/ARProductBuilder';
import { landingPayload } from '@/components/admin/LandingFields';
import NextImage from '@/components/NextImage';
import styles from '@/styles/Admin.module.scss';

const WMCYNLOGO = '/wmcyn_logo_white.png';

export default function CreateProductSet() {
  const { isAuthenticated, loading: authLoading } = useAdminAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (data: ARProductFormData) => {
    try {
      setLoading(true);

      const productSetData: CreateProductSetRequest = {
        name: data.name.trim(),
        description: data.description.trim() || undefined,
        campaign: data.campaign.trim() || undefined,
        ...landingPayload(data, false),
        // the backend requires at least one item to track inventory against
        items: [{
          productId: 'ar-product',
          variantId: 'ar-product-variant',
          qty: 1
        }],
        checkoutMode: 'NONE'
      };

      const productSet = await createProductSet(productSetData);

      if (data.markerPatternId.trim()) {
        try {
          await arSessions.create({
            name: data.name.trim(),
            productId: 'ar-product',
            productSetId: productSet.id,
            campaign: productSetData.campaign,
            markerPattern: { patternId: data.markerPatternId.trim(), type: 'mind' },
            metadata: {
              title: data.arTitle.trim(),
              description: data.arDescription.trim(),
              actions: data.arActions.map((action) => ({
                ...action,
                type: action.type as 'purchase' | 'share' | 'claim' | 'info'
              }))
            }
          });
        } catch (sessionError: any) {
          // the product set already exists, so continue to it and let the founder retry the session
          alert(`product saved, but the AR session failed: ${sessionError.message || 'unknown error'}`);
        }
      }

      router.push(`/admin/product-sets/${productSet.id}/details`);
    } catch (error: any) {
      console.error('failed to create AR product:', error);
      alert('failed to create product: ' + (error.message || 'unknown error'));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin');
  };



  if (authLoading) {
    return (
      <div className={styles.adminPageContainer}>
        <div className={styles.adminContainer}>
          <div className={styles.loadingContainer}>
            loading...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // will redirect
  }

  return (
    <div className={styles.adminPageContainer}>
      <div className={styles.adminContainer}>
        {/* header */}
        <div className={styles.adminHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <NextImage
              src={WMCYNLOGO}
              alt="WMCYN Logo"
              width={80}
              height={40}
              priority
            />
            <h1 className={styles.adminTitle}>create AR product</h1>
          </div>
          <button 
            onClick={handleCancel}
            className={styles.buttonSecondary}
          >
            back to dashboard
          </button>
        </div>

        {/* form */}
            <ARProductBuilder
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              loading={loading}
            />
      </div>
    </div>
  );
}
