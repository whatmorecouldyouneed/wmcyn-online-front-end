import { useState } from 'react';
import MarkerUpload from './MarkerUpload';
import LandingFields, { LandingFormValues, landingErrors } from './LandingFields';
import { slugify } from '@/config/productSlugs';
import styles from '@/styles/Admin.module.scss';

export type ARProductFormData = LandingFormValues & {
  name: string;
  description: string;
  campaign: string;
  markerPatternId: string;
  arTitle: string;
  arDescription: string;
  arActions: Array<{ type: string; label: string; url?: string }>;
};

interface ARProductBuilderProps {
  onSubmit: (data: ARProductFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function ARProductBuilder({ onSubmit, onCancel, loading = false }: ARProductBuilderProps) {
  const [formData, setFormData] = useState<ARProductFormData>({
    name: '',
    description: '',
    campaign: '',
    slug: '',
    garmentWord: '',
    modelUrl: '',
    physicalWidthCm: '',
    markerPatternId: '',
    arTitle: '',
    arDescription: '',
    arActions: []
  });
  const [slugTouched, setSlugTouched] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});


  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = { ...landingErrors(formData) };

    if (!formData.name.trim()) {
      newErrors.name = 'product name is required';
    }

    // the marker pattern and overlay create a linked AR session; both are optional
    if (formData.markerPatternId.trim() && !formData.arTitle.trim()) {
      newErrors.arTitle = 'AR overlay title is required when a marker pattern is selected';
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
      await onSubmit(formData);
    } catch (error) {
      console.error('form submission error:', error);
    }
  };

  const addAction = () => {
    setFormData(prev => ({
      ...prev,
      arActions: [...prev.arActions, { type: 'info', label: 'new action', url: '' }]
    }));
  };

  const updateAction = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      arActions: prev.arActions.map((action, i) => 
        i === index ? { ...action, [field]: value } : action
      )
    }));
  };

  const removeAction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      arActions: prev.arActions.filter((_, i) => i !== index)
    }));
  };



  return (
    <form onSubmit={handleSubmit} className={styles.adminForm}>
      {Object.keys(errors).length > 0 && (
        <div className={styles.errorContainer}>
          {Object.values(errors).map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </div>
      )}

      {/* product info */}
      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>product information</h3>
        
        <div className={styles.formRow}>
          <div className={styles.formRowItem}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
              product name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                const name = e.target.value;
                setFormData(prev => ({ ...prev, name, ...(slugTouched ? {} : { slug: slugify(name) }) }));
              }}
              className={`${styles.inputField} ${errors.name ? styles.error : ''}`}
              placeholder="e.g., WMCYN AR Experience"
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
              placeholder="describe this AR product experience..."
              rows={3}
              disabled={loading}
              style={{ 
                width: '100%',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: 'white',
                fontSize: '0.9rem',
                resize: 'vertical',
                minHeight: '80px'
              }}
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
              placeholder="e.g., Summer 2024"
              disabled={loading}
            />
          </div>
        </div>
      </div>

      <LandingFields
        values={formData}
        errors={errors}
        disabled={loading}
        onChange={(field, value) => {
          if (field === 'slug') setSlugTouched(true);
          setFormData(prev => ({ ...prev, [field]: value }));
        }}
      />

      {/* AR marker pattern upload */}
      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>AR session marker (optional)</h3>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginBottom: '16px' }}>
          pick a marker to also create a linked AR session with the overlay below. the landing page uses the
          image marker you compile on the details page after saving.
        </p>
        
        <MarkerUpload
          onPatternSelect={(patternId) => {
            setFormData(prev => ({ ...prev, markerPatternId: patternId }));
            setErrors(prev => ({ ...prev, markerPattern: '' }));
          }}
          selectedPatternId={formData.markerPatternId}
          compact={true}
          user={{ 
            id: 'admin', 
            email: 'admin@wmcyn.com', 
            permissions: ['admin.markers.write', 'admin.access'] 
          }}
        />

      </div>

      {/* AR overlay metadata */}
      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>AR overlay information</h3>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginBottom: '16px' }}>
          configure what users will see when they scan the marker
        </p>
        
        <div className={styles.formRow}>
          <div className={styles.formRowItem}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
              overlay title
            </label>
            <input
              type="text"
              value={formData.arTitle}
              onChange={(e) => setFormData(prev => ({ ...prev, arTitle: e.target.value }))}
              className={`${styles.inputField} ${errors.arTitle ? styles.error : ''}`}
              placeholder="e.g., WMCYN AR Experience"
              disabled={loading}
            />
            {errors.arTitle && (
              <div style={{ color: '#ff6b6b', fontSize: '0.8rem', marginTop: '4px' }}>
                {errors.arTitle}
              </div>
            )}
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formRowItem}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
              overlay description
            </label>
            <textarea
              value={formData.arDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, arDescription: e.target.value }))}
              className={styles.inputField}
              placeholder="description shown in AR overlay..."
              rows={3}
              disabled={loading}
              style={{ 
                width: '100%',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: 'white',
                fontSize: '0.9rem',
                resize: 'vertical',
                minHeight: '80px'
              }}
            />
          </div>
        </div>
      </div>

      {/* AR actions */}
      <div className={styles.formSection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className={styles.formSectionTitle}>AR action buttons</h3>
          <button
            type="button"
            onClick={addAction}
            className={styles.buttonSecondary}
            style={{ padding: '8px 12px', fontSize: '0.8rem' }}
          >
            add action
          </button>
        </div>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginBottom: '16px' }}>
          add buttons for users to interact with (e.g., &quot;buy now&quot;, &quot;share&quot;, &quot;claim&quot;)
        </p>
        
        {formData.arActions.length === 0 && (
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.9rem', fontStyle: 'italic' }}>
            no actions configured - users will only see the overlay information
          </p>
        )}

        {formData.arActions.map((action, index) => (
          <div key={index} className={styles.formRow} style={{ marginBottom: '12px', padding: '12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
            <div className={styles.formRowItem} style={{ flex: '0 0 120px' }}>
              <select
                value={action.type}
                onChange={(e) => updateAction(index, 'type', e.target.value)}
                className={styles.inputField}
                disabled={loading}
              >
                <option value="info">info</option>
                <option value="purchase">purchase</option>
                <option value="share">share</option>
                <option value="claim">claim</option>
              </select>
            </div>
            <div className={styles.formRowItem} style={{ flex: '1' }}>
              <input
                type="text"
                value={action.label}
                onChange={(e) => updateAction(index, 'label', e.target.value)}
                className={styles.inputField}
                placeholder="button label (e.g., Buy Now)"
                disabled={loading}
              />
            </div>
            <div className={styles.formRowItem} style={{ flex: '1' }}>
              <input
                type="url"
                value={action.url || ''}
                onChange={(e) => updateAction(index, 'url', e.target.value)}
                className={styles.inputField}
                placeholder="URL (optional)"
                disabled={loading}
              />
            </div>
            <div className={styles.formRowItem} style={{ flex: '0 0 40px' }}>
              <button
                type="button"
                onClick={() => removeAction(index)}
                className={styles.buttonDanger}
                style={{ padding: '8px', fontSize: '0.8rem' }}
                disabled={loading}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* form actions */}
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
        >
          {loading ? 'creating...' : 'create AR product'}
        </button>
      </div>
    </form>
  );
}
