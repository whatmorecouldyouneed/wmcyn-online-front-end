import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { getProductSet, updateProductSet } from '@/lib/apiClient';
import { ProductSet, UpdateProductSetRequest } from '@/types/productSets';
import ProductSetBuilder from '@/components/admin/ProductSetBuilder';
import NextImage from '@/components/NextImage';
import styles from '@/styles/Admin.module.scss';

const WMCYNLOGO = '/wmcyn_logo_white.png';

export default function EditProductSet() {
  const { isAuthenticated, loading: authLoading } = useAdminAuth();
  const router = useRouter();
  const { id } = router.query;
  const [productSet, setProductSet] = useState<ProductSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // load product set data
  useEffect(() => {
    if (isAuthenticated && id && typeof id === 'string') {
      loadProductSet(id);
    }
  }, [isAuthenticated, id]);

  const loadProductSet = async (productSetId: string) => {
    try {
      setLoading(true);
      setError('');
      const data = await getProductSet(productSetId);
      setProductSet(data);
    } catch (err: any) {
      console.error('failed to load product set:', err);
      setError(err.message || 'failed to load product set');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: UpdateProductSetRequest) => {
    if (!productSet) return;

    try {
      setSaving(true);
      await updateProductSet(productSet.id, data);
      router.push(`/admin/product-sets/${productSet.id}/details`);
    } catch (error: any) {
      console.error('failed to update product set:', error);
      throw error; // let the form handle the error display
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin');
  };

  if (authLoading || loading) {
    return (
      <div className={styles.adminPageContainer}>
        <div className={styles.adminContainer}>
          <div className={styles.loadingContainer}>
            {loading ? 'loading product set...' : 'loading...'}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // will redirect
  }

  if (error) {
    return (
      <div className={styles.adminPageContainer}>
        <div className={styles.adminContainer}>
          <div className={styles.errorContainer}>
            {error}
          </div>
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button 
              onClick={() => router.push('/admin')}
              className={styles.buttonSecondary}
            >
              back to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!productSet) {
    return (
      <div className={styles.adminPageContainer}>
        <div className={styles.adminContainer}>
          <div className={styles.emptyState}>
            <h2 className={styles.emptyStateTitle}>product set not found</h2>
            <p className={styles.emptyStateDescription}>
              the product set you&apos;re looking for doesn&apos;t exist or has been deleted
            </p>
            <button 
              onClick={() => router.push('/admin')}
              className={styles.buttonPrimary}
            >
              back to dashboard
            </button>
          </div>
        </div>
      </div>
    );
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
            <h1 className={styles.adminTitle}>edit product set</h1>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => router.push(`/admin/product-sets/${productSet.id}/details`)}
              className={styles.buttonSecondary}
            >
              view details
            </button>
            <button 
              onClick={handleCancel}
              className={styles.buttonSecondary}
            >
              back to dashboard
            </button>
          </div>
        </div>

        {/* form */}
        <ProductSetBuilder
          productSet={productSet}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={saving}
        />
      </div>
    </div>
  );
}
