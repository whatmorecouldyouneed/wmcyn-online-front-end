import React, { useState } from 'react';
import { CreateARSessionRequest, UpdateARSessionRequest, ARSessionMetadata } from '@/types/arSessions';
import MarkerUpload from './MarkerUpload';
import styles from '@/styles/Admin.module.scss';

interface ARSessionFormProps {
  initialData?: Partial<CreateARSessionRequest>;
  onSubmit: (data: CreateARSessionRequest | UpdateARSessionRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  isEdit?: boolean;
}

export default function ARSessionForm({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
  isEdit = false
}: ARSessionFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    campaign: initialData?.campaign || '',
    productId: initialData?.productId || '',
    selectedPatternId: initialData?.markerPattern?.patternId || '',
    asset3DUrl: initialData?.asset3D?.url || '',
    asset3DType: initialData?.asset3D?.type || 'glb',
    metadata: {
      title: initialData?.metadata?.title || '',
      description: initialData?.metadata?.description || '',
      actions: initialData?.metadata?.actions || []
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'name is required';
    }

    if (!formData.selectedPatternId) {
      newErrors.pattern = 'marker pattern is required';
    }

    if (!formData.metadata.title.trim()) {
      newErrors.metadataTitle = 'metadata title is required';
    }

    if (!formData.metadata.description.trim()) {
      newErrors.metadataDescription = 'metadata description is required';
    }

    if (formData.asset3DUrl && !formData.asset3DUrl.match(/\.(glb|gltf)$/i)) {
      newErrors.asset3DUrl = '3d asset must be a .glb or .gltf file';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData: CreateARSessionRequest = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      campaign: formData.campaign.trim() || undefined,
      productId: formData.productId.trim() || undefined,
      markerPattern: {
        patternId: formData.selectedPatternId,
        type: 'custom' // for now, all uploaded patterns are custom
      },
      metadata: {
        title: formData.metadata.title.trim(),
        description: formData.metadata.description.trim(),
        actions: formData.metadata.actions
      },
      asset3D: formData.asset3DUrl ? {
        url: formData.asset3DUrl.trim(),
        type: formData.asset3DType as 'glb' | 'gltf'
      } : undefined
    };

    try {
      await onSubmit(submitData);
    } catch (error) {
      console.error('form submission error:', error);
    }
  };

  const addAction = () => {
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        actions: [...prev.metadata.actions, {
          type: 'info',
          label: 'new action',
          url: ''
        }]
      }
    }));
  };

  const updateAction = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        actions: prev.metadata.actions.map((action, i) => 
          i === index ? { ...action, [field]: value } : action
        )
      }
    }));
  };

  const removeAction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        actions: prev.metadata.actions.filter((_, i) => i !== index)
      }
    }));
  };

  return (
    <form onSubmit={handleSubmit} className={styles.arSessionForm}>
      <div className={styles.formSection}>
        <h3 className={styles.sectionTitle}>session details</h3>
        
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            name *
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={`${styles.formInput} ${errors.name ? styles.error : ''}`}
              placeholder="enter session name"
              disabled={loading}
            />
          </label>
          {errors.name && <span className={styles.errorText}>{errors.name}</span>}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            description
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className={styles.formTextarea}
              placeholder="enter session description"
              rows={3}
              disabled={loading}
            />
          </label>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            campaign
            <input
              type="text"
              value={formData.campaign}
              onChange={(e) => setFormData(prev => ({ ...prev, campaign: e.target.value }))}
              className={styles.formInput}
              placeholder="enter campaign name"
              disabled={loading}
            />
          </label>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            product id
            <input
              type="text"
              value={formData.productId}
              onChange={(e) => setFormData(prev => ({ ...prev, productId: e.target.value }))}
              className={styles.formInput}
              placeholder="enter product id (optional)"
              disabled={loading}
            />
          </label>
        </div>
      </div>

      <div className={styles.formSection}>
        <MarkerUpload
          onPatternSelect={(patternId) => setFormData(prev => ({ ...prev, selectedPatternId: patternId }))}
          selectedPatternId={formData.selectedPatternId}
          disabled={loading}
        />
        {errors.pattern && <span className={styles.errorText}>{errors.pattern}</span>}
      </div>

      <div className={styles.formSection}>
        <h3 className={styles.sectionTitle}>3d asset (optional)</h3>
        
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            3d model url
            <input
              type="url"
              value={formData.asset3DUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, asset3DUrl: e.target.value }))}
              className={`${styles.formInput} ${errors.asset3DUrl ? styles.error : ''}`}
              placeholder="https://example.com/model.glb"
              disabled={loading}
            />
          </label>
          {errors.asset3DUrl && <span className={styles.errorText}>{errors.asset3DUrl}</span>}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            model type
            <select
              value={formData.asset3DType}
              onChange={(e) => setFormData(prev => ({ ...prev, asset3DType: e.target.value as 'glb' | 'gltf' }))}
              className={styles.formSelect}
              disabled={loading}
            >
              <option value="glb">glb</option>
              <option value="gltf">gltf</option>
            </select>
          </label>
        </div>
      </div>

      <div className={styles.formSection}>
        <h3 className={styles.sectionTitle}>metadata overlay</h3>
        
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            title *
            <input
              type="text"
              value={formData.metadata.title}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                metadata: { ...prev.metadata, title: e.target.value }
              }))}
              className={`${styles.formInput} ${errors.metadataTitle ? styles.error : ''}`}
              placeholder="enter overlay title"
              disabled={loading}
            />
          </label>
          {errors.metadataTitle && <span className={styles.errorText}>{errors.metadataTitle}</span>}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            description *
            <textarea
              value={formData.metadata.description}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                metadata: { ...prev.metadata, description: e.target.value }
              }))}
              className={`${styles.formTextarea} ${errors.metadataDescription ? styles.error : ''}`}
              placeholder="enter overlay description"
              rows={3}
              disabled={loading}
            />
          </label>
          {errors.metadataDescription && <span className={styles.errorText}>{errors.metadataDescription}</span>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.actionsHeader}>
            <label className={styles.formLabel}>action buttons</label>
            <button
              type="button"
              onClick={addAction}
              className={styles.addButton}
              disabled={loading}
            >
              add action
            </button>
          </div>
          
          {formData.metadata.actions.map((action, index) => (
            <div key={index} className={styles.actionRow}>
              <select
                value={action.type}
                onChange={(e) => updateAction(index, 'type', e.target.value)}
                className={styles.actionTypeSelect}
                disabled={loading}
              >
                <option value="info">info</option>
                <option value="purchase">purchase</option>
                <option value="claim">claim</option>
                <option value="share">share</option>
              </select>
              
              <input
                type="text"
                value={action.label}
                onChange={(e) => updateAction(index, 'label', e.target.value)}
                className={styles.actionLabelInput}
                placeholder="button label"
                disabled={loading}
              />
              
              <input
                type="url"
                value={action.url || ''}
                onChange={(e) => updateAction(index, 'url', e.target.value)}
                className={styles.actionUrlInput}
                placeholder="action url (optional)"
                disabled={loading}
              />
              
              <button
                type="button"
                onClick={() => removeAction(index)}
                className={styles.removeButton}
                disabled={loading}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.formActions}>
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
          {loading ? 'saving...' : isEdit ? 'update session' : 'create session'}
        </button>
      </div>
    </form>
  );
}
