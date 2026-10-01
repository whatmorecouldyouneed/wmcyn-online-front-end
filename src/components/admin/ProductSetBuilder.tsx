import { useState, useEffect } from 'react';
import { ProductSet, ProductSetItem, CheckoutMode, UpdateProductSetRequest } from '@/types/productSets';
import LandingFields, { LandingFormValues, landingErrors, landingPayload, widthCmFromMeters } from './LandingFields';
import styles from '@/styles/Admin.module.scss';

interface ProductSetBuilderProps {
  productSet?: ProductSet;
  onSubmit: (data: UpdateProductSetRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

type FormData = LandingFormValues & {
  name: string;
  description: string;
  campaign: string;
  items: ProductSetItem[];
  checkoutMode: CheckoutMode;
  discountCode: string;
};

const EMPTY_FORM: FormData = {
  name: '',
  description: '',
  campaign: '',
  slug: '',
  garmentWord: '',
  modelUrl: '',
  physicalWidthCm: '',
  items: [],
  checkoutMode: 'NONE',
  discountCode: '',
};

const errorStyle = { color: '#ff6b6b', fontSize: '0.8rem', marginTop: '4px' };

export default function ProductSetBuilder({ productSet, onSubmit, onCancel, loading = false }: ProductSetBuilderProps) {
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // initialize form with existing data if editing
  useEffect(() => {
    if (productSet) {
      setFormData({
        name: productSet.name || '',
        description: productSet.description || '',
        campaign: productSet.campaign || '',
        slug: productSet.slug || '',
        garmentWord: productSet.garmentWord || '',
        modelUrl: productSet.modelUrl || '',
        physicalWidthCm: widthCmFromMeters(productSet.physicalWidthMeters),
        items: productSet.items || [],
        checkoutMode: productSet.checkoutMode || 'NONE',
        discountCode: productSet.discountCode || '',
      });
    }
  }, [productSet]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = { ...landingErrors(formData) };

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
      if (!item.qty || item.qty <= 0) {
        newErrors[`item_${index}_quantity`] = 'quantity must be greater than 0';
      }
    });

    if (formData.checkoutMode === 'DISCOUNT_CODE' && !formData.discountCode.trim()) {
      newErrors.discountCode = 'discount code is required for this checkout mode';
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
      await onSubmit({
        name: formData.name.trim(),
        description: formData.description.trim(),
        campaign: formData.campaign.trim(),
        ...landingPayload(formData, true),
        items: formData.items.map((item) => ({
          ...item,
          productId: item.productId.trim(),
          variantId: item.variantId?.trim() || undefined,
        })),
        checkoutMode: formData.checkoutMode,
        discountCode: formData.discountCode.trim(),
      });
    } catch (error) {
      console.error('form submission error:', error);
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', variantId: '', qty: 1 }]
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
            {errors.name && <div style={errorStyle}>{errors.name}</div>}
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

      <LandingFields
        values={formData}
        errors={errors}
        disabled={loading}
        onChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
      />

      {/* items */}
      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>items *</h3>
        {errors.items && (
          <div style={{ ...errorStyle, marginBottom: '16px' }}>
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
                  <div style={errorStyle}>{errors[`item_${index}_productId`]}</div>
                )}
              </div>
              <div className={`${styles.itemInput} ${styles.formRowItem}`}>
                <input
                  type="text"
                  value={item.variantId || ''}
                  onChange={(e) => updateItem(index, 'variantId', e.target.value)}
                  className={styles.inputField}
                  placeholder="variant ID (optional)"
                  disabled={loading}
                />
              </div>
              <div className={`${styles.itemQuantity} ${styles.formRowItem}`}>
                <input
                  type="number"
                  min="1"
                  value={item.qty}
                  onChange={(e) => updateItem(index, 'qty', parseInt(e.target.value) || 1)}
                  className={styles.inputField}
                  disabled={loading}
                />
                {errors[`item_${index}_quantity`] && (
                  <div style={errorStyle}>{errors[`item_${index}_quantity`]}</div>
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
              checkout mode
            </label>
            <select
              value={formData.checkoutMode}
              onChange={(e) => setFormData(prev => ({ ...prev, checkoutMode: e.target.value as CheckoutMode }))}
              className={styles.inputField}
              disabled={loading}
            >
              <option value="NONE">none (claim or view only)</option>
              <option value="SHOPIFY_CART_LINK">shopify cart link</option>
              <option value="DISCOUNT_CODE">discount code</option>
            </select>
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formRowItem}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
              discount code
            </label>
            <input
              type="text"
              value={formData.discountCode}
              onChange={(e) => setFormData(prev => ({ ...prev, discountCode: e.target.value }))}
              className={styles.inputField}
              placeholder="e.g., FRIENDS20"
              disabled={loading}
            />
            {errors.discountCode && <div style={errorStyle}>{errors.discountCode}</div>}
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
