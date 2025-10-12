import React, { useState, useRef } from 'react';
import { markerPatterns as markerPatternsAPI } from '@/lib/apiClient';
import { MarkerPattern } from '@/types/arSessions';
import styles from '@/styles/Admin.module.scss';

interface MarkerUploadProps {
  onPatternSelect: (patternId: string) => void;
  selectedPatternId?: string;
  disabled?: boolean;
}

export default function MarkerUpload({ 
  onPatternSelect, 
  selectedPatternId, 
  disabled = false 
}: MarkerUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [patterns, setPatterns] = useState<MarkerPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // load existing patterns
  React.useEffect(() => {
    loadPatterns();
  }, []);

  const loadPatterns = async () => {
    try {
      setLoading(true);
      const response = await markerPatternsAPI.list();
      setPatterns(response.markerPatterns);
    } catch (error: any) {
      console.error('failed to load marker patterns:', error);
      setError(error.message || 'failed to load marker patterns');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('please select an image file (png, jpg, etc.)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('file size must be less than 10MB');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // remove data:image/...;base64, prefix
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const uploadData = {
        name: file.name.replace(/\.[^/.]+$/, ''), // remove extension
        type: 'upload' as const,
        imageFile: {
          data: base64,
          mimeType: file.type,
          filename: file.name
        }
      };

      const response = await markerPatternsAPI.upload(uploadData);
      
      // reload patterns to include new one
      await loadPatterns();
      
      // select the new pattern
      onPatternSelect(response.patternId);
      
    } catch (error: any) {
      console.error('failed to upload marker pattern:', error);
      setError(error.message || 'failed to upload marker pattern');
    } finally {
      setUploading(false);
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
    
    if (disabled || uploading) return;
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  const handleDeletePattern = async (patternId: string) => {
    if (!confirm('are you sure you want to delete this marker pattern?')) {
      return;
    }

    try {
      await markerPatternsAPI.delete(patternId);
      await loadPatterns();
      
      // clear selection if deleted pattern was selected
      if (selectedPatternId === patternId) {
        onPatternSelect('');
      }
    } catch (error: any) {
      console.error('failed to delete marker pattern:', error);
      setError(error.message || 'failed to delete marker pattern');
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        loading marker patterns...
      </div>
    );
  }

  return (
    <div className={styles.markerUploadContainer}>
      <h3 className={styles.sectionTitle}>marker pattern</h3>
      
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      {/* upload area */}
      <div
        className={`${styles.uploadArea} ${dragActive ? styles.dragActive : ''} ${disabled ? styles.disabled : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          disabled={disabled || uploading}
        />
        
        {uploading ? (
          <div className={styles.uploadingState}>
            <div className={styles.spinner}></div>
            <p>generating marker pattern...</p>
          </div>
        ) : (
          <div className={styles.uploadPrompt}>
            <div className={styles.uploadIcon}>📁</div>
            <p>drag & drop an image here or click to browse</p>
            <p className={styles.uploadHint}>
              supported formats: png, jpg, jpeg (max 10MB)
            </p>
          </div>
        )}
      </div>

      {/* existing patterns */}
      {patterns.length > 0 && (
        <div className={styles.existingPatterns}>
          <h4 className={styles.subsectionTitle}>existing patterns</h4>
          <div className={styles.patternsGrid}>
            {patterns.map((pattern) => (
              <div
                key={pattern.id}
                className={`${styles.patternCard} ${selectedPatternId === pattern.id ? styles.selected : ''}`}
                onClick={() => !disabled && onPatternSelect(pattern.id)}
              >
                <div className={styles.patternPreview}>
                  <img
                    src={pattern.previewUrl}
                    alt={pattern.name}
                    className={styles.patternImage}
                  />
                </div>
                <div className={styles.patternInfo}>
                  <h5 className={styles.patternName}>{pattern.name}</h5>
                  <p className={styles.patternType}>{pattern.type}</p>
                  <p className={styles.patternDate}>
                    {new Date(pattern.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {!disabled && (
                  <button
                    className={styles.deletePatternButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePattern(pattern.id);
                    }}
                    title="delete pattern"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* selected pattern info */}
      {selectedPatternId && (
        <div className={styles.selectedPatternInfo}>
          <h4 className={styles.subsectionTitle}>selected pattern</h4>
          {(() => {
            const selectedPattern = patterns.find(p => p.id === selectedPatternId);
            return selectedPattern ? (
              <div className={styles.selectedPatternCard}>
                <img
                  src={selectedPattern.previewUrl}
                  alt={selectedPattern.name}
                  className={styles.selectedPatternImage}
                />
                <div className={styles.selectedPatternDetails}>
                  <h5>{selectedPattern.name}</h5>
                  <p>type: {selectedPattern.type}</p>
                </div>
              </div>
            ) : (
              <p>pattern not found</p>
            );
          })()}
        </div>
      )}
    </div>
  );
}
