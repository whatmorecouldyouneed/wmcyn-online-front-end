import React, { useState, useRef, useCallback } from 'react';
import { markerPatterns as markerPatternsAPI } from '@/lib/apiClient';
import { MarkerPattern, MarkerGenerationConfig, MarkerValidation } from '@/types/arSessions';
import { 
  generateCompleteMarker, 
  downloadFile, 
  downloadPattFile, 
  downloadMarkerBundle,
  type MarkerGenerationOptions 
} from '@/utils/markerGenerator';
import { validateBorderColor, validatePatternRatio } from '@/utils/markerValidation';
import { hasMarkerWritePermission } from '@/utils/permissions';
import MarkerValidator from './MarkerValidator';
import styles from '@/styles/Admin.module.scss';
import markerLabStyles from '@/styles/MarkerLab.module.scss';

interface MarkerUploadProps {
  onPatternSelect: (patternId: string) => void;
  selectedPatternId?: string;
  disabled?: boolean;
  compact?: boolean; // for inline use in builders
  user?: any; // current user for permission checks
}

type UploadMode = 'upload' | 'generate';

export default function MarkerUpload({ 
  onPatternSelect, 
  selectedPatternId, 
  disabled = false,
  compact = false,
  user
}: MarkerUploadProps) {
  // existing upload state
  const [uploading, setUploading] = useState(false);
  const [patterns, setPatterns] = useState<MarkerPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // generator mode state
  const [mode, setMode] = useState<UploadMode>('upload');
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [generationOptions, setGenerationOptions] = useState<MarkerGenerationOptions>({
    patternRatio: 0.5,
    imageSize: 512,
    borderColor: '#000000'
  });
  const [generatedMarker, setGeneratedMarker] = useState<{
    canvas: HTMLCanvasElement;
    blob: Blob;
    dataUrl: string;
    pattContent: string;
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [validationScore, setValidationScore] = useState<number | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [pattFileUrl, setPattFileUrl] = useState<string>('');
  
  // permission check
  const canWriteMarkers = hasMarkerWritePermission(user);

  // load existing patterns
  React.useEffect(() => {
    loadPatterns();
  }, []);


  const loadPatterns = async () => {
    try {
      setLoading(true);
      console.log('[MarkerUpload] Loading marker patterns...');
      const response = await markerPatternsAPI.list();
      console.log('[MarkerUpload] API response:', response);
      
      // handle different response structures
      let patterns: MarkerPattern[] = [];
      if (response && response.markerPatterns) {
        patterns = response.markerPatterns;
        console.log('[MarkerUpload] Using markerPatterns field:', patterns);
      } else if (response && (response as any).patterns) {
        patterns = (response as any).patterns;
        console.log('[MarkerUpload] Using patterns field:', patterns);
      } else if (response && Array.isArray(response)) {
        patterns = response as unknown as MarkerPattern[];
        console.log('[MarkerUpload] Using direct array response:', patterns);
      } else {
        console.warn('[MarkerUpload] Unexpected response structure:', response);
        patterns = [];
      }
      
      console.log('[MarkerUpload] Final patterns array:', patterns);
      setPatterns(patterns);
    } catch (error: any) {
      console.error('[MarkerUpload] Failed to load marker patterns:', error);
      setError(error.message || 'failed to load marker patterns');
      setPatterns([]); // ensure patterns is always an array
    } finally {
      setLoading(false);
    }
  };

  // handle source image upload for generator
  const handleSourceImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('please select an image file (png, jpg, etc.)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('file size must be less than 10MB');
      return;
    }

    setSourceImage(file);
    setError(null);
    
    // auto-generate marker with current options
    if (generationOptions) {
      await generateMarker(file, generationOptions);
    }
  }, [generationOptions]);

  // generate marker from source image
  const generateMarker = useCallback(async (image: File, options: MarkerGenerationOptions) => {
    try {
      setGenerating(true);
      setError(null);
      
      const result = await generateCompleteMarker(image, options);
      setGeneratedMarker(result);
      
      // create blob URL for .patt file
      const pattBlob = new Blob([result.pattContent], { type: 'text/plain' });
      const pattUrl = URL.createObjectURL(pattBlob);
      setPattFileUrl(pattUrl);
      
      // validate generation options
      const borderValidation = validateBorderColor(options.borderColor);
      const ratioValidation = validatePatternRatio(options.patternRatio);
      
      const warnings: string[] = [];
      if (!borderValidation.valid && borderValidation.warning) {
        warnings.push(borderValidation.warning);
      }
      if (!ratioValidation.valid && ratioValidation.warning) {
        warnings.push(ratioValidation.warning);
      }
      
      setValidationWarnings(warnings);
      
    } catch (error: any) {
      console.error('failed to generate marker:', error);
      setError(error.message || 'failed to generate marker');
    } finally {
      setGenerating(false);
    }
  }, []);

  // handle generation options change
  const handleOptionsChange = useCallback((newOptions: Partial<MarkerGenerationOptions>) => {
    const updatedOptions = { ...generationOptions, ...newOptions };
    setGenerationOptions(updatedOptions);
    
    // re-generate if we have a source image
    if (sourceImage) {
      generateMarker(sourceImage, updatedOptions);
    }
  }, [generationOptions, sourceImage, generateMarker]);

  // handle validation complete
  const handleValidationComplete = useCallback((score: number) => {
    setValidationScore(score);
  }, []);

  // save generated marker
  const saveGeneratedMarker = useCallback(async () => {
    if (!generatedMarker || !sourceImage) {
      setError('no marker generated to save');
      return;
    }

    if (validationScore === null || validationScore < 80) {
      setError('marker must be validated with score ≥ 80 before saving');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // convert blob to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(generatedMarker.blob);
      });

      const generationConfig: MarkerGenerationConfig = {
        patternRatio: generationOptions.patternRatio,
        imageSize: generationOptions.imageSize,
        borderColor: generationOptions.borderColor,
        source: 'generated'
      };

      const validation: MarkerValidation = {
        tested: true,
        detectionScore: validationScore,
        testedAt: new Date().toISOString(),
        testDevice: navigator.userAgent
      };

      const request = {
        name: sourceImage.name.replace(/\.[^/.]+$/, ''),
        description: `Generated marker from: ${sourceImage.name}`,
        type: 'upload' as const,
        imageFile: {
          data: base64,
          mimeType: generatedMarker.blob.type,
          filename: `${sourceImage.name.replace(/\.[^/.]+$/, '')}-marker.png`
        },
        pattFile: {
          data: generatedMarker.pattContent,
          filename: `${sourceImage.name.replace(/\.[^/.]+$/, '')}-marker.patt`
        },
        generationConfig,
        validation
      };

      const response = await markerPatternsAPI.upload(request);
      
      // reload patterns and select new one
      await loadPatterns();
      onPatternSelect(response.patternId);
      
      // cleanup
      if (pattFileUrl) {
        URL.revokeObjectURL(pattFileUrl);
      }
      
      // reset generator state
      setGeneratedMarker(null);
      setSourceImage(null);
      setValidationScore(null);
      setPattFileUrl('');
      setMode('upload');
      
    } catch (error: any) {
      console.error('failed to save marker:', error);
      setError(error.message || 'failed to save marker');
    } finally {
      setUploading(false);
    }
  }, [generatedMarker, sourceImage, validationScore, generationOptions, pattFileUrl, onPatternSelect]);

  // existing upload functionality
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

      const uploadData = {
        name: file.name.replace(/\.[^/.]+$/, ''),
        description: `Uploaded marker: ${file.name}`,
        type: 'upload' as const,
        imageFile: {
          data: base64,
          mimeType: file.type,
          filename: file.name
        },
        generationConfig: {
          patternRatio: 0.5,
          imageSize: 256,
          borderColor: '#000000',
          source: 'manual' as const
        },
        validation: {
          tested: false
        }
      };

      const response = await markerPatternsAPI.upload(uploadData);
      
      await loadPatterns();
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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (mode === 'upload') {
        handleFileUpload(file);
      } else {
        handleSourceImageUpload(file);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (mode === 'upload') {
        handleFileUpload(file);
      } else {
        handleSourceImageUpload(file);
      }
    }
  };

  if (compact) {
    // compact mode for inline use
    return (
      <div className={styles.formSection}>
        <div className={styles.formSectionTitle}>marker pattern</div>
        
        
        <div className={markerLabStyles.modeToggle}>
          <button
            className={`${markerLabStyles.modeButton} ${mode === 'upload' ? markerLabStyles.active : ''}`}
            onClick={() => setMode('upload')}
            disabled={disabled}
          >
            Upload
          </button>
          <button
            className={`${markerLabStyles.modeButton} ${mode === 'generate' ? markerLabStyles.active : ''}`}
            onClick={() => setMode('generate')}
            disabled={disabled || !canWriteMarkers}
          >
            Generate {!canWriteMarkers ? '(No Permission)' : ''}
          </button>
        </div>
        
        {!canWriteMarkers && (
          <div style={{ 
            padding: '8px 12px', 
            background: 'rgba(251, 191, 36, 0.1)', 
            border: '1px solid rgba(251, 191, 36, 0.3)', 
            borderRadius: '4px',
            fontSize: '0.8rem',
            color: '#fbbf24',
            marginTop: '8px'
          }}>
            ⚠️ You need admin.markers.write permission to generate new markers
          </div>
        )}

        {mode === 'upload' ? (
          <div>
            {/* existing upload UI - simplified */}
            <select
              value={selectedPatternId || ''}
              onChange={(e) => onPatternSelect(e.target.value)}
              className={styles.inputField}
              disabled={disabled || loading}
            >
              <option value="">select existing marker</option>
              {(patterns || []).map((pattern) => (
                <option key={pattern.id} value={pattern.id}>
                  {pattern.name} {pattern.validation?.tested ? '✓' : ''}
                </option>
              ))}
            </select>
            
            <div
              className={`${markerLabStyles.fileUpload} ${dragActive ? markerLabStyles.dragActive : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className={markerLabStyles.fileUploadIcon}>📁</div>
              <div className={markerLabStyles.fileUploadText}>
                {uploading ? 'uploading...' : 'drop image or click to upload'}
              </div>
              <div className={markerLabStyles.fileUploadSubtext}>
                png, jpg, gif (max 10MB)
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* generator UI - simplified */}
            {!sourceImage ? (
              <div
                className={`${markerLabStyles.fileUpload} ${dragActive ? markerLabStyles.dragActive : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className={markerLabStyles.fileUploadIcon}>🎨</div>
                <div className={markerLabStyles.fileUploadText}>
                  drop source image or click to select
                </div>
                <div className={markerLabStyles.fileUploadSubtext}>
                  we&apos;ll add the border and generate .patt file
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '12px', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                  source: {sourceImage.name}
                </div>
                
                {generatedMarker && (
                  <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                    <img 
                      src={generatedMarker.dataUrl} 
                      alt="Generated marker" 
                      style={{ maxWidth: '150px', height: 'auto', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '4px' }}
                    />
                  </div>
                )}
                
                {validationScore !== null && (
                  <div style={{ 
                    marginBottom: '12px', 
                    padding: '8px', 
                    background: validationScore >= 80 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                    border: `1px solid ${validationScore >= 80 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    color: validationScore >= 80 ? '#10b981' : '#fbbf24'
                  }}>
                    validation score: {validationScore}/100
                  </div>
                )}
                
                <button
                  onClick={saveGeneratedMarker}
                  disabled={!generatedMarker || validationScore === null || validationScore < 80 || uploading || !canWriteMarkers}
                  className={styles.buttonPrimary}
                  style={{ width: '100%' }}
                >
                  {uploading ? 'saving...' : canWriteMarkers ? 'save marker' : 'no permission'}
                </button>
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className={markerLabStyles.fileInput}
        />


        {error && (
          <div style={{ 
            color: '#ff6b6b', 
            fontSize: '0.8rem', 
            marginTop: '8px',
            padding: '8px',
            background: 'rgba(255, 107, 107, 0.1)',
            border: '1px solid rgba(255, 107, 107, 0.3)',
            borderRadius: '4px'
          }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  // full mode - complete generator interface
  return (
    <div className={markerLabStyles.markerLab}>
      <div className={markerLabStyles.markerLabHeader}>
        <h2 className={markerLabStyles.markerLabTitle}>marker lab</h2>
        <div className={markerLabStyles.modeToggle}>
          <button
            className={`${markerLabStyles.modeButton} ${mode === 'upload' ? markerLabStyles.active : ''}`}
            onClick={() => setMode('upload')}
            disabled={disabled}
          >
            Upload Existing
          </button>
          <button
            className={`${markerLabStyles.modeButton} ${mode === 'generate' ? markerLabStyles.active : ''}`}
            onClick={() => setMode('generate')}
            disabled={disabled || !canWriteMarkers}
          >
            Generate New {!canWriteMarkers ? '(No Permission)' : ''}
          </button>
        </div>
        
        {!canWriteMarkers && (
          <div style={{ 
            padding: '12px', 
            background: 'rgba(251, 191, 36, 0.1)', 
            border: '1px solid rgba(251, 191, 36, 0.3)', 
            borderRadius: '6px',
            fontSize: '0.9rem',
            color: '#fbbf24',
            marginBottom: '16px'
          }}>
            ⚠️ You need admin.markers.write permission to generate new markers
          </div>
        )}
      </div>

      {mode === 'upload' ? (
        <div>
          {/* existing upload interface */}
          <div className={styles.formSection}>
            <h3 className={styles.formSectionTitle}>select marker pattern</h3>
            
            <select
              value={selectedPatternId || ''}
              onChange={(e) => onPatternSelect(e.target.value)}
              className={styles.inputField}
              disabled={disabled || loading}
            >
              <option value="">select existing marker</option>
              {(patterns || []).map((pattern) => (
                <option key={pattern.id} value={pattern.id}>
                  {pattern.name} {pattern.validation?.tested ? '✓' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formSection}>
            <h3 className={styles.formSectionTitle}>or upload new marker</h3>
            
            <div
              className={`${markerLabStyles.fileUpload} ${dragActive ? markerLabStyles.dragActive : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className={markerLabStyles.fileUploadIcon}>📁</div>
              <div className={markerLabStyles.fileUploadText}>
                {uploading ? 'uploading...' : 'drop marker image or click to upload'}
              </div>
              <div className={markerLabStyles.fileUploadSubtext}>
                png, jpg, gif (max 10MB)
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={markerLabStyles.generatorLayout}>
          {/* controls panel */}
          <div className={markerLabStyles.controlsPanel}>
            <div className={markerLabStyles.controlGroup}>
              <label className={markerLabStyles.controlLabel}>source image</label>
              
              {!sourceImage ? (
                <div
                  className={`${markerLabStyles.fileUpload} ${dragActive ? markerLabStyles.dragActive : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className={markerLabStyles.fileUploadIcon}>🎨</div>
                  <div className={markerLabStyles.fileUploadText}>
                    drop source image or click to select
                  </div>
                  <div className={markerLabStyles.fileUploadSubtext}>
                    we&apos;ll add the border and generate .patt file
                  </div>
                </div>
              ) : (
                <div style={{ 
                  padding: '12px', 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  borderRadius: '6px',
                  fontSize: '0.9rem'
                }}>
                  <div style={{ marginBottom: '8px' }}>📄 {sourceImage.name}</div>
                  <button
                    onClick={() => {
                      setSourceImage(null);
                      setGeneratedMarker(null);
                      setValidationScore(null);
                      setPattFileUrl('');
                    }}
                    className={markerLabStyles.downloadButton}
                  >
                    change image
                  </button>
                </div>
              )}
            </div>

            {sourceImage && (
              <>
                <div className={markerLabStyles.controlGroup}>
                  <label className={markerLabStyles.controlLabel}>
                    pattern ratio: {generationOptions.patternRatio}
                  </label>
                  <div className={markerLabStyles.sliderContainer}>
                    <input
                      type="range"
                      min="0.3"
                      max="0.7"
                      step="0.05"
                      value={generationOptions.patternRatio}
                      onChange={(e) => handleOptionsChange({ patternRatio: parseFloat(e.target.value) })}
                      className={markerLabStyles.slider}
                    />
                    <span className={markerLabStyles.sliderValue}>
                      {Math.round(generationOptions.patternRatio * 100)}%
                    </span>
                  </div>
                </div>

                <div className={markerLabStyles.controlGroup}>
                  <label className={markerLabStyles.controlLabel}>image size</label>
                  <select
                    value={generationOptions.imageSize}
                    onChange={(e) => handleOptionsChange({ imageSize: parseInt(e.target.value) })}
                    className={markerLabStyles.controlInput}
                  >
                    <option value={256}>256px</option>
                    <option value={512}>512px</option>
                    <option value={1024}>1024px</option>
                  </select>
                </div>

                <div className={markerLabStyles.controlGroup}>
                  <label className={markerLabStyles.controlLabel}>border color</label>
                  <input
                    type="color"
                    value={generationOptions.borderColor}
                    onChange={(e) => handleOptionsChange({ borderColor: e.target.value })}
                    className={markerLabStyles.colorPicker}
                  />
                </div>

                {validationWarnings.length > 0 && (
                  <div className={markerLabStyles.warningBox}>
                    {validationWarnings.map((warning, index) => (
                      <div key={index}>{warning}</div>
                    ))}
                  </div>
                )}

                {generatedMarker && (
                  <div className={markerLabStyles.downloadButtons}>
                    <button
                      onClick={() => downloadFile(generatedMarker.blob, 'marker.png')}
                      className={`${markerLabStyles.downloadButton} ${markerLabStyles.primary}`}
                    >
                      📥 marker.png
                    </button>
                    <button
                      onClick={() => downloadPattFile(generatedMarker.pattContent, 'marker.patt')}
                      className={markerLabStyles.downloadButton}
                    >
                      📥 marker.patt
                    </button>
                    <button
                      onClick={() => downloadMarkerBundle(
                        generatedMarker.blob, 
                        generatedMarker.pattContent, 
                        sourceImage.name.replace(/\.[^/.]+$/, '')
                      )}
                      className={markerLabStyles.downloadButton}
                    >
                      📦 bundle.zip
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* preview panel */}
          <div className={markerLabStyles.previewPanel}>
            {generating ? (
              <div className={markerLabStyles.previewPlaceholder}>
                <span className={markerLabStyles.loadingSpinner}></span>
                generating marker...
              </div>
            ) : generatedMarker ? (
              <>
                <img 
                  src={generatedMarker.dataUrl} 
                  alt="Generated marker" 
                  className={markerLabStyles.previewCanvas}
                />
                
                {validationScore !== null && (
                  <div style={{ 
                    padding: '12px', 
                    background: validationScore >= 80 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                    border: `1px solid ${validationScore >= 80 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    color: validationScore >= 80 ? '#10b981' : '#fbbf24',
                    textAlign: 'center'
                  }}>
                    validation score: {validationScore}/100
                  </div>
                )}
                
                <button
                  onClick={saveGeneratedMarker}
                  disabled={validationScore === null || validationScore < 80 || uploading || !canWriteMarkers}
                  className={`${markerLabStyles.downloadButton} ${markerLabStyles.primary}`}
                  style={{ marginTop: '16px' }}
                >
                  {uploading ? 'saving...' : canWriteMarkers ? 'save marker' : 'no permission'}
                </button>
              </>
            ) : (
              <div className={markerLabStyles.previewPlaceholder}>
                upload a source image to generate marker
              </div>
            )}
          </div>
        </div>
      )}

      {/* validation component */}
      {mode === 'generate' && generatedMarker && pattFileUrl && (
        <MarkerValidator
          markerDataUrl={generatedMarker.dataUrl}
          pattFileUrl={pattFileUrl}
          onValidationComplete={handleValidationComplete}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className={markerLabStyles.fileInput}
      />

      {error && (
        <div className={markerLabStyles.errorBox}>
          {error}
        </div>
      )}
    </div>
  );
}