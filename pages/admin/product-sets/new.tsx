import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { createProductSet, arSessions } from '@/lib/apiClient';
import { CreateProductSetRequest, UpdateProductSetRequest } from '@/types/productSets';
import ARProductBuilder from '@/components/admin/ARProductBuilder';
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

  const handleSubmit = async (data: {
    name: string;
    description: string;
    campaign: string;
    markerPatternId: string;
    arTitle: string;
    arDescription: string;
    arActions: Array<{ type: string; label: string; url?: string }>;
  }) => {
    try {
      setLoading(true);
      
      // Create the product set directly (AR session creation is not supported by backend)
      console.log('[AR Product] Creating product set with marker pattern:', data.markerPatternId);
      
      // Validate marker pattern ID
      if (!data.markerPatternId || data.markerPatternId.trim() === '') {
        throw new Error('Please select a marker pattern');
      }
      
      // Create the product set without linking to AR session (since backend doesn't support AR session creation)
      const productSetData: CreateProductSetRequest = {
        name: data.name,
        description: data.description,
        campaign: data.campaign,
        items: [{ 
          productId: 'ar-product',
          variantId: 'ar-product-variant', // required for inventory tracking
          qty: 1 
        }], // AR products need at least one item
        checkout: {
          type: 'product',
          cartLink: '',
          discountCode: ''
        }
        // Note: linkedARSessionId is omitted since AR session creation is not supported
      };

      
      console.log('[AR Product] Sending product set data:', productSetData);
      
      const productSet = await createProductSet(productSetData);
      
      router.push(`/admin/product-sets/${productSet.id}/details`);
    } catch (error: any) {
      console.error('failed to create AR product:', error);
      throw error; // let the form handle the error display
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
