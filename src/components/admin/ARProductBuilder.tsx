import { useState, useEffect, useRef, useCallback } from 'react';
import { markerPatterns as markerPatternsAPI } from '@/lib/apiClient';
import { MarkerPattern } from '@/types/arSessions';
import styles from '@/styles/Admin.module.scss';

// extend window for MindAR
declare global {
  interface Window {
    MINDAR?: {
      IMAGE?: {
        Compiler?: new () => {
          compileImageTargets: (images: HTMLImageElement[], onProgress: (progress: number) => void) => Promise<void>;
          exportData: () => Promise<ArrayBuffer>;
        };
      };
    };
  }
}

interface ARProductBuilderProps {
  onSubmit: (data: {
    name: string;
    description: string;
    campaign: string;
    markerPatternId: string;
    mindFileUrl?: string | null; // url to the compiled .mind file
    arTitle: string;
    arDescription: string;
    arActions: Array<{ type: string; label: string; url?: string }>;
  }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function ARProductBuilder({ onSubmit, onCancel, loading = false }: ARProductBuilderProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    campaign: '',
    markerPatternId: '',
    mindFileUrl: null as string | null, // url to the compiled .mind file
    arTitle: '',
    arDescription: '',
    arActions: [] as Array<{ type: string; label: string; url?: string }>
  });

  const [availableMarkerPatterns, setAvailableMarkerPatterns] = useState<MarkerPattern[]>([]);
  const [loadingMarkerPatterns, setLoadingMarkerPatterns] = useState(false);
  const [uploadingMarker, setUploadingMarker] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [uploadedPatternInfo, setUploadedPatternInfo] = useState<{name: string, patternId: string, mindFileUrl?: string | null} | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // load available marker patterns
  useEffect(() => {
    loadMarkerPatterns();
  }, []);

  const loadMarkerPatterns = async () => {
    try {
      setLoadingMarkerPatterns(true);
      const response = await markerPatternsAPI.list();
      setAvailableMarkerPatterns(response.markerPatterns || []);
    } catch (error) {
      console.error('failed to load marker patterns:', error);
      setAvailableMarkerPatterns([]); // ensure it's always an array
    } finally {
      setLoadingMarkerPatterns(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'product name is required';
    }

    if (!formData.markerPatternId.trim()) {
      newErrors.markerPattern = 'marker pattern is required for AR experience';
    }

    if (!formData.arTitle.trim()) {
      newErrors.arTitle = 'AR overlay title is required';
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


  // dynamically load the mindar compiler script
  const loadCompilerScript = useCallback(async (): Promise<void> => {
    if (window.MINDAR?.IMAGE?.Compiler) return;

    const existingScript = document.querySelector('script[src*="mindar-image.prod.js"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mind-ar@1.1.5/dist/mindar-image.prod.js';
      script.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load MindAR compiler script'));
        document.head.appendChild(script);
      });
    }
  }, []);

  // wait for mindar compiler to load (max 10 seconds)
  const waitForCompiler = useCallback(async (): Promise<typeof window.MINDAR.IMAGE.Compiler> => {
    await loadCompilerScript();

    const maxAttempts = 100;
    for (let i = 0; i < maxAttempts; i++) {
      if (window.MINDAR?.IMAGE?.Compiler) {
        return window.MINDAR.IMAGE.Compiler;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('MindAR compiler failed to load after 10 seconds. Please refresh the page.');
  }, [loadCompilerScript]);

  // convert arraybuffer to base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // load image element from file
  const loadImageElement = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const [compilationProgress, setCompilationProgress] = useState(0);

  const handleFileUpload = async (file: File) => {
    setUploadingMarker(true);
    setUploadedImagePreview(null);
    setUploadedPatternInfo(null);
    setCompilationProgress(0);
    
    try {
      // create preview immediately
      const previewUrl = URL.createObjectURL(file);
      setUploadedImagePreview(previewUrl);

      // read file as base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // remove data:...;base64, prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // load image element for compiler
      const imageElement = await loadImageElement(file);
      const CompilerClass = await waitForCompiler();
      
      // compile the image
      const compiler = new CompilerClass();
      await compiler.compileImageTargets([imageElement], (progress: number) => {
        setCompilationProgress(Math.round(progress * 100));
      });

      const exportedData = await compiler.exportData();
      const mindFileData = arrayBufferToBase64(exportedData);
      const quality = Math.min(100, Math.round((exportedData.byteLength / 50000) * 100));

      // upload to backend with pre-compiled data
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://us-central1-wmcyn-online-mobile.cloudfunctions.net/api';
      const url = `${API_BASE}/v1/marker-patterns/upload`;

      const requestBody = {
        type: 'upload',
        name: file.name.split('.')[0],
        imageFile: {
          data: base64Data,
          mimeType: file.type,
          filename: file.name,
        },
        mindFileData: mindFileData,
        filename: file.name,
        quality: quality,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': process.env.NEXT_PUBLIC_ADMIN_API_TOKEN || '',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${text}`);
      }

      const result = await response.json();
      
      if (result && result.patternId) {
        // capture both patternId and mindFileUrl from response
        setFormData(prev => ({ 
          ...prev, 
          markerPatternId: result.patternId,
          mindFileUrl: result.mindFileUrl || result.mindUrl || null
        }));
        setUploadedPatternInfo({
          name: file.name.split('.')[0],
          patternId: result.patternId,
          mindFileUrl: result.mindFileUrl || result.mindUrl || null
        });
        await loadMarkerPatterns();
      } else {
        throw new Error('Invalid response - missing patternId');
      }

    } catch (error: any) {
      console.error('[ARProductBuilder] Error:', error);
      alert(`Marker upload failed: ${error.message || 'Unknown error'}`);
      setUploadedImagePreview(null);
      setUploadedPatternInfo(null);
    } finally {
      setUploadingMarker(false);
      setCompilationProgress(0);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const clearUploadPreview = () => {
    setUploadedImagePreview(null);
    setUploadedPatternInfo(null);
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
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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

      {/* AR marker pattern upload */}
      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>AR marker pattern *</h3>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginBottom: '16px' }}>
          upload an image that will be used as the AR marker pattern
        </p>
        
        <div className={styles.formRow}>
          <div className={styles.formRowItem}>
            <div
              className={`${styles.uploadArea} ${dragActive ? styles.dragActive : ''} ${uploadingMarker ? styles.disabled : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !uploadingMarker && fileInputRef.current?.click()}
              style={{ 
                border: '2px dashed rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                padding: '24px',
                textAlign: 'center',
                cursor: uploadingMarker ? 'not-allowed' : 'pointer',
                background: dragActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                transition: 'all 0.2s ease'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
                disabled={uploadingMarker}
              />
              {uploadingMarker ? (
                <div>
                  <div style={{ 
                    width: '100%', 
                    height: '8px', 
                    background: 'rgba(255, 255, 255, 0.1)', 
                    borderRadius: '4px',
                    marginBottom: '12px',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      width: `${compilationProgress}%`, 
                      height: '100%', 
                      background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <p style={{ color: 'white', margin: '0' }}>
                    {compilationProgress > 0 ? `compiling .mind file... ${compilationProgress}%` : 'loading image...'}
                  </p>
                </div>
              ) : (
                <>
                  <p style={{ color: 'white', margin: '0 0 8px 0', fontSize: '1rem' }}>
                    drag & drop image here or click to upload
                  </p>
                  <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: '0', fontSize: '0.9rem' }}>
                    (PNG or JPG, max 5MB)
                  </p>
                </>
              )}
            </div>
            {errors.markerPattern && (
              <div style={{ color: '#ff6b6b', fontSize: '0.8rem', marginTop: '8px' }}>
                {errors.markerPattern}
              </div>
            )}
          </div>
        </div>

        {/* show uploaded image preview */}
        {uploadedImagePreview && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ 
              padding: '16px', 
              background: 'rgba(34, 197, 94, 0.1)', 
              border: '1px solid rgba(34, 197, 94, 0.3)', 
              borderRadius: '8px' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ color: 'white', margin: '0', fontSize: '1rem' }}>
                  uploaded marker pattern
                </h4>
                <button
                  type="button"
                  onClick={clearUploadPreview}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    color: 'white',
                    padding: '4px 8px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }}
                >
                  clear
                </button>
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ 
                  width: '120px', 
                  height: '120px', 
                  borderRadius: '8px', 
                  overflow: 'hidden',
                  background: 'rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <img 
                    src={uploadedImagePreview} 
                    alt="Uploaded marker pattern"
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover' 
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  {uploadedPatternInfo ? (
                    <>
                      <p style={{ color: 'white', margin: '0 0 8px 0', fontSize: '1rem', fontWeight: '500' }}>
                        {uploadedPatternInfo.name}
                      </p>
                      <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 8px 0', fontSize: '0.9rem' }}>
                        pattern id: {uploadedPatternInfo.patternId}
                      </p>
                      <p style={{ color: 'rgba(34, 197, 94, 0.9)', margin: '0', fontSize: '0.9rem' }}>
                        ✓ successfully uploaded and ready to use
                      </p>
                    </>
                  ) : (
                    <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: '0', fontSize: '0.9rem' }}>
                      processing upload...
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* show selected marker pattern */}
        {formData.markerPatternId && (
          <div style={{ marginTop: '16px' }}>
            {(() => {
              const selectedPattern = availableMarkerPatterns?.find(p => p.id === formData.markerPatternId);
              return selectedPattern ? (
                <div style={{ 
                  padding: '12px', 
                  background: 'rgba(96, 165, 250, 0.1)', 
                  border: '1px solid rgba(96, 165, 250, 0.3)', 
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <img 
                    src={selectedPattern.previewUrl || '/patterns/pattern-wmcyn_logo_full.patt'} 
                    alt={selectedPattern.name}
                    style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                  />
                  <div>
                    <p style={{ color: 'white', margin: '0 0 4px 0', fontWeight: '500' }}>
                      {selectedPattern.name}
                    </p>
                    <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: '0', fontSize: '0.9rem' }}>
                      {selectedPattern.type} • uploaded {new Date(selectedPattern.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        )}
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
              overlay title *
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
