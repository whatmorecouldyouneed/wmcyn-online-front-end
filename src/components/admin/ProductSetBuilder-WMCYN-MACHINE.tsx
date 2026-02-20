import { useState, useEffect } from 'react';
import { ProductSet, ProductSetItem, CheckoutConfig, CreateProductSetRequest, UpdateProductSetRequest } from '@/types/productSets';
import { markerPatterns as markerPatternsAPI } from '@/lib/apiClient';
import { MarkerPattern } from '@/types/arSessions';
import styles from '@/styles/Admin.module.scss';

interface ProductSetBuilderProps {
  productSet?: ProductSet;
  onSubmit: (data: CreateProductSetRequest | UpdateProductSetRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function ProductSetBuilder({ productSet, onSubmit, onCancel, loading = false }: ProductSetBuilderProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    campaign: '',
    // AR-specific fields
    markerPatternId: '',
    arTitle: '',
    arDescription: '',
    arActions: [] as Array<{ type: string; label: string; url?: string }>,
    // Simplified - no traditional product items
    items: [] as ProductSetItem[],
    checkout: {
      type: 'product' as 'cart' | 'checkout' | 'product',
      cartLink: '',
      discountCode: ''
    } as CheckoutConfig,
    remainingInventory: 0,
    linkedARSessionId: ''
  });

  const [availableMarkerPatterns, setAvailableMarkerPatterns] = useState<MarkerPattern[]>([]);
  const [loadingMarkerPatterns, setLoadingMarkerPatterns] = useState(false);
  const [availableARSessions, setAvailableARSessions] = useState<any[]>([]);
  const [loadingARSessions, setLoadingARSessions] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // load available marker patterns
  useEffect(() => {
    loadMarkerPatterns();
  }, []);

  // initialize form with existing data if editing
  useEffect(() => {
    if (productSet) {
      setFormData({
        name: productSet.name || '',
        description: productSet.description || '',
        campaign: productSet.campaign || '',
        markerPatternId: '', // TODO: add this field to ProductSet type
        arTitle: productSet.name || '', // Use product name as default AR title
        arDescription: productSet.description || '',
        arActions: [], // TODO: add this field to ProductSet type
        items: productSet.items || [],
        checkout: productSet.checkout || {
          type: 'product' as const,
          cartLink: '',
          discountCode: ''
        },
        remainingInventory: productSet.stats?.remainingInventory || 0,
        linkedARSessionId: productSet.linkedARSessionId || ''
      });
    }
  }, [productSet]);

  const loadMarkerPatterns = async () => {
    try {
      setLoadingMarkerPatterns(true);
      const response = await markerPatternsAPI.list();
      setAvailableMarkerPatterns(response.markerPatterns || []);
    } catch (error) {
      console.error('failed to load marker patterns:', error);
    } finally {
      setLoadingMarkerPatterns(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'name is required';
    }

    if (formData.items.length === 0) {
      newErrors.items = 'at least one item is required';
    }

    formData.items.forEach((item, index) => {
      if (!item.productId.trim()) {
        newErrors[`item_${index}_productId`] = 'product ID is required';
      }
      if (!item.quantity || item.quantity <= 0) {
        newErrors[`item_${index}_quantity`] = 'quantity must be greater than 0';
      }
    });

    if (!formData.checkout.type) {
      newErrors.checkoutType = 'checkout type is required';
    }

    if (formData.checkout.type === 'cart' && (!formData.checkout.cartLink || !formData.checkout.cartLink.trim())) {
      newErrors.cartLink = 'cart link is required for cart type';
    }

    if (formData.remainingInventory < 0) {
      newErrors.remainingInventory = 'remaining inventory cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      // ensure all required fields are present for create/update
      const submitData: CreateProductSetRequest = {
        name: formData.name,
        description: formData.description,
        campaign: formData.campaign,
        items: formData.items, // Keep empty for AR-only products
        checkout: formData.checkout,
        remainingInventory: formData.remainingInventory
      };
      
      await onSubmit(submitData);
    } catch (error) {
      console.error('form submission error:', error);
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: 1 }]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: keyof ProductSetItem, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const updateCheckout = (field: keyof CheckoutConfig, value: string) => {
    setFormData(prev => ({
      ...prev,
      checkout: { ...prev.checkout, [field]: value }
    }));
  };

  return (
    <form onSubmit={handleSubmit} className={styles.adminForm}>
      {/* basic info */}
      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>basic information</h3>
        
        <div className={styles.formRow}>
          <div className={styles.formRowItem}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
              name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={styles.inputField}
              placeholder="e.g., F&F Week One — WMCYN Hoodie Pack"
              disabled={loading}
            />
            {errors.name && (
              <div style={{ color: '#ff6b6b', fontSize: '0.8rem', marginTop: '4px' }}>
                {errors.name}
              </div>
            )}
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formRowItem}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
              description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className={styles.inputField}
              placeholder="describe this wmcyn product..."
              rows={3}
              disabled={loading}
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formRowItem}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
              campaign
            </label>
            <input
              type="text"
              value={formData.campaign}
              onChange={(e) => setFormData(prev => ({ ...prev, campaign: e.target.value }))}
              className={styles.inputField}
              placeholder="e.g., friends-and-family-2024"
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* items */}
      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>items *</h3>
        {errors.items && (
          <div style={{ color: '#ff6b6b', fontSize: '0.8rem', marginBottom: '16px' }}>
            {errors.items}
          </div>
        )}
        
        <div className={styles.itemsList}>
          {formData.items.map((item, index) => (
            <div key={index} className={styles.itemRow}>
              <div className={`${styles.itemInput} ${styles.formRowItem}`}>
                <input
                  type="text"
                  value={item.productId}
                  onChange={(e) => updateItem(index, 'productId', e.target.value)}
                  className={styles.inputField}
                  placeholder="product ID"
                  disabled={loading}
                />
                {errors[`item_${index}_productId`] && (
                  <div style={{ color: '#ff6b6b', fontSize: '0.8rem', marginTop: '4px' }}>
                    {errors[`item_${index}_productId`]}
                  </div>
                )}
              </div>
              <div className={`${styles.itemQuantity} ${styles.formRowItem}`}>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                  className={styles.inputField}
                  disabled={loading}
                />
                {errors[`item_${index}_quantity`] && (
                  <div style={{ color: '#ff6b6b', fontSize: '0.8rem', marginTop: '4px' }}>
                    {errors[`item_${index}_quantity`]}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className={styles.removeItemButton}
                disabled={loading}
              >
                remove
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addItem}
          className={styles.addItemButton}
          disabled={loading}
        >
          + add item
        </button>
      </div>

      {/* checkout config */}
      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>checkout configuration</h3>
        
        <div className={styles.formRow}>
          <div className={styles.formRowItem}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
              type *
            </label>
            <select
              value={formData.checkout.type}
              onChange={(e) => updateCheckout('type', e.target.value)}
              className={styles.inputField}
              disabled={loading}
            >
              <option value="cart">cart</option>
              <option value="checkout">checkout</option>
              <option value="product">product</option>
            </select>
            {errors.checkoutType && (
              <div style={{ color: '#ff6b6b', fontSize: '0.8rem', marginTop: '4px' }}>
                {errors.checkoutType}
              </div>
            )}
          </div>
        </div>

        {formData.checkout.type === 'cart' && (
          <div className={styles.formRow}>
            <div className={styles.formRowItem}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
                cart link *
              </label>
              <input
                type="url"
                value={formData.checkout.cartLink || ''}
                onChange={(e) => updateCheckout('cartLink', e.target.value)}
                className={styles.inputField}
                placeholder="https://shop.example.com/cart/..."
                disabled={loading}
              />
              {errors.cartLink && (
                <div style={{ color: '#ff6b6b', fontSize: '0.8rem', marginTop: '4px' }}>
                  {errors.cartLink}
                </div>
              )}
            </div>
          </div>
        )}

        <div className={styles.formRow}>
          <div className={styles.formRowItem}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
              discount code
            </label>
            <input
              type="text"
              value={formData.checkout.discountCode || ''}
              onChange={(e) => updateCheckout('discountCode', e.target.value)}
              className={styles.inputField}
              placeholder="e.g., FRIENDS20"
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* inventory */}
      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>inventory</h3>
        
        <div className={styles.formRow}>
          <div className={styles.formRowItem}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
              remaining inventory
            </label>
            <input
              type="number"
              min="0"
              value={formData.remainingInventory}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                remainingInventory: parseInt(e.target.value) || 0 
              }))}
              className={styles.inputField}
              placeholder="0"
              disabled={loading}
            />
            {errors.remainingInventory && (
              <div style={{ color: '#ff6b6b', fontSize: '0.8rem', marginTop: '4px' }}>
                {errors.remainingInventory}
              </div>
            )}
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem', marginTop: '4px' }}>
              leave as 0 to let the system calculate automatically
            </p>
          </div>
        </div>
      </div>

      {/* AR session link (optional) */}
      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>AR experience (optional)</h3>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginBottom: '16px' }}>
          link this product set to an AR session for enhanced customer experience
        </p>
        
        <div className={styles.formRow}>
          <div className={styles.formRowItem}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
              linked AR session
            </label>
            <select
              value={formData.linkedARSessionId}
              onChange={(e) => setFormData(prev => ({ ...prev, linkedARSessionId: e.target.value }))}
              className={styles.inputField}
              disabled={loading || loadingARSessions}
            >
              <option value="">no AR session (traditional QR code only)</option>
              {availableARSessions.map((session) => (
                <option key={session.sessionId} value={session.sessionId}>
                  {session.metadata.title} {session.campaign ? `(${session.campaign})` : ''}
                </option>
              ))}
            </select>
            {loadingARSessions && (
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem', marginTop: '4px' }}>
                loading AR sessions...
              </p>
            )}
            {formData.linkedARSessionId && (
              <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(96, 165, 250, 0.1)', border: '1px solid rgba(96, 165, 250, 0.3)', borderRadius: '8px' }}>
                <p style={{ color: 'white', fontSize: '0.9rem', margin: '0 0 8px 0', fontWeight: '500' }}>
                  AR session preview:
                </p>
                {(() => {
                  const selectedSession = availableARSessions.find(s => s.sessionId === formData.linkedARSessionId);
                  return selectedSession ? (
                    <div>
                      <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.8rem', margin: '0 0 4px 0' }}>
                        <strong>title:</strong> {selectedSession.metadata.title}
                      </p>
                      <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.8rem', margin: '0 0 4px 0' }}>
                        <strong>marker:</strong> {selectedSession.markerPattern.name}
                      </p>
                      <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.8rem', margin: '0 0 8px 0' }}>
                        <strong>actions:</strong> {selectedSession.metadata.actions.length} configured
                      </p>
                      <a 
                        href={`/ar-session/${selectedSession.sessionId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ 
                          color: '#60a5fa', 
                          fontSize: '0.8rem', 
                          textDecoration: 'none',
                          border: '1px solid rgba(96, 165, 250, 0.4)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          display: 'inline-block'
                        }}
                      >
                        preview AR session →
                      </a>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* actions */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px' }}>
        <button 
          type="button"
          onClick={onCancel}
          className={styles.buttonSecondary}
          disabled={loading}
        >
          cancel
        </button>
        <button 
          type="submit"
          className={styles.buttonPrimary}
          disabled={loading}
          style={{ 
            opacity: loading ? 0.6 : 1,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'saving...' : (productSet ? 'update wmcyn product' : 'create wmcyn product')}
        </button>
      </div>
    </form>
  );
}
