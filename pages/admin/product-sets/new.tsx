import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { createProductSet } from '@/lib/apiClient';
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
      // Convert AR product data to ProductSet format
      const productSetData: CreateProductSetRequest = {
        name: data.name,
        description: data.description,
        campaign: data.campaign,
        items: [{ 
          productId: 'ar-product', 
          quantity: 1 
        }], // AR products need at least one item
        checkout: {
          type: 'product',
          cartLink: '',
          discountCode: ''
        },
        remainingInventory: 0
      };
      
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
