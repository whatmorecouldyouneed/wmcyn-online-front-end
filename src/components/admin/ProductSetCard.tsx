import { useState } from 'react';
import { useRouter } from 'next/router';
import { ProductSet } from '@/types/productSets';
import { deleteProductSet } from '@/lib/apiClient';
import styles from '@/styles/Admin.module.scss';

interface ProductSetCardProps {
  productSet: ProductSet;
  onDelete: (id: string) => void;
  onGenerateQR: (productSet: ProductSet) => void;
}

export default function ProductSetCard({ productSet, onDelete, onGenerateQR }: ProductSetCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleEdit = () => {
    router.push(`/admin/product-sets/${productSet.id}`);
  };

  const handleViewDetails = () => {
    router.push(`/admin/product-sets/${productSet.id}/details`);
  };

  const handleDelete = async () => {
    if (!confirm(`are you sure you want to delete "${productSet.name}"? this action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      await deleteProductSet(productSet.id);
      onDelete(productSet.id);
    } catch (error) {
      console.error('failed to delete wmcyn product:', error);
      alert('failed to delete wmcyn product. please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTotalItems = () => {
    return productSet.items.reduce((total, item) => total + item.quantity, 0);
  };

  return (
    <div className={styles.productSetCard}>
      <div className={styles.productSetCardHeader}>
        <div>
          <h3 className={styles.productSetCardTitle}>{productSet.name}</h3>
          {productSet.description && (
            <p className={styles.productSetCardDescription}>{productSet.description}</p>
          )}
          {productSet.campaign && (
            <p className={styles.productSetCardDescription}>
              <strong>campaign:</strong> {productSet.campaign}
            </p>
          )}
          {productSet.linkedARSessionId && (
            <p className={styles.productSetCardDescription}>
              <strong>AR experience:</strong> <span style={{ color: '#60a5fa' }}>enabled</span>
            </p>
          )}
        </div>
      </div>

      <div className={styles.productSetCardStats}>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{getTotalItems()}</div>
          <div className={styles.statLabel}>total items</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{productSet.stats.totalClaims}</div>
          <div className={styles.statLabel}>claims</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{productSet.stats.remainingInventory}</div>
          <div className={styles.statLabel}>remaining</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{productSet.stats.qrCodesGenerated}</div>
          <div className={styles.statLabel}>qr codes</div>
        </div>
      </div>

      <div style={{ 
        fontSize: '0.8rem', 
        color: 'rgba(255, 255, 255, 0.5)', 
        marginBottom: '16px',
        textAlign: 'center'
      }}>
        created {formatDate(productSet.createdAt)}
        {productSet.updatedAt !== productSet.createdAt && (
          <span> • updated {formatDate(productSet.updatedAt)}</span>
        )}
      </div>

      <div className={styles.productSetCardActions}>
        <button 
          onClick={handleEdit}
          className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
        >
          edit
        </button>
        <button 
          onClick={() => onGenerateQR(productSet)}
          className={`${styles.buttonPrimary} ${styles.buttonSmall}`}
        >
          generate qr
        </button>
        <button 
          onClick={handleViewDetails}
          className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
        >
          details
        </button>
        <button 
          onClick={handleDelete}
          disabled={deleting}
          className={`${styles.buttonDanger} ${styles.buttonSmall}`}
          style={{ 
            opacity: deleting ? 0.6 : 1,
            cursor: deleting ? 'not-allowed' : 'pointer'
          }}
        >
          {deleting ? 'deleting...' : 'delete'}
        </button>
      </div>
    </div>
  );
}
