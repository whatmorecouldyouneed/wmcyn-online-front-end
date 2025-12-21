import React, { useState, useRef, useCallback } from 'react';
import { markerPatterns as markerPatternsAPI } from '@/lib/apiClient';
import { MarkerPattern } from '@/types/arSessions';
import styles from '@/styles/Admin.module.scss';

// extend window for mindar types
declare global {
  interface Window {
    MINDAR?: {
      IMAGE?: {
        Compiler: new () => {
          compileImageTargets: (images: HTMLImageElement[], callback: (progress: number) => void) => Promise<void>;
          exportData: () => Promise<ArrayBuffer>;
        };
      };
    };
  }
}

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
  const [compilationProgress, setCompilationProgress] = useState(0);
  const [patterns, setPatterns] = useState<MarkerPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // wait for mindar compiler to load
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

  // load existing patterns
  React.useEffect(() => {
    loadPatterns();
  }, []);

  const loadPatterns = async () => {
    try {
      setLoading(true);
      const response = await markerPatternsAPI.list();
      console.log('[MarkerUpload] API response:', response);
      
      // handle different response formats
      let patternsData: MarkerPattern[] = [];
      if (Array.isArray(response)) {
        patternsData = response;
      } else if (response?.markerPatterns) {
        patternsData = response.markerPatterns;
      } else if (response?.patterns) {
        patternsData = response.patterns;
      } else if (response?.items) {
        patternsData = response.items;
      }
      
      setPatterns(patternsData);
    } catch (error: any) {
      console.error('failed to load marker patterns:', error);
      setError(error.message || 'failed to load marker patterns');
      setPatterns([]); // ensure patterns is always an array
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('please select an image file (png, jpg, etc.)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('file size must be less than 10MB');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setCompilationProgress(0);

      // convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // load image element for compiler
      const imageElement = await loadImageElement(file);
      
      // wait for compiler to load and compile the image
      const CompilerClass = await waitForCompiler();
      const compiler = new CompilerClass();
      
      await compiler.compileImageTargets([imageElement], (progress: number) => {
        setCompilationProgress(Math.round(progress * 100));
      });

      const exportedData = await compiler.exportData();
      const mindFileData = arrayBufferToBase64(exportedData);
      const quality = Math.min(100, Math.round((exportedData.byteLength / 50000) * 100));

      // upload with pre-compiled .mind file
      const uploadData = {
        name: file.name.replace(/\.[^/.]+$/, ''),
        type: 'upload' as const,
        imageFile: {
          data: base64,
          mimeType: file.type,
          filename: file.name
        },
        mindFileData: mindFileData,
        quality: quality
      };

      const response = await markerPatternsAPI.upload(uploadData);
      
      await loadPatterns();
      onPatternSelect(response.patternId);
      
    } catch (error: any) {
      console.error('failed to upload marker pattern:', error);
      setError(error.message || 'failed to upload marker pattern');
    } finally {
      setUploading(false);
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
            <p>
              {compilationProgress < 100 
                ? `Compiling marker... ${compilationProgress}%` 
                : 'Uploading to server...'}
            </p>
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
      {patterns && patterns.length > 0 && (
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
