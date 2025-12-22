import React, { useState, useRef, useCallback } from 'react';
import styles from '@/styles/Admin.module.scss';

// MINDAR types are now in src/types/globals.d.ts

interface NFTMarkerCompilerProps {
  productSetId: string;
  onCompiled: (data: {
    mindFileData: string;      // base64 encoded .mind file
    sourceImageData: string;   // base64 encoded source image
    filename: string;
    quality?: number;
  }) => void;
  existingMarker?: {
    mindFileUrl: string;
    sourceImageUrl: string;
    compiledAt: string;
    quality?: number;
  };
  disabled?: boolean;
}

interface CompilationState {
  status: 'idle' | 'loading' | 'compiling' | 'complete' | 'error';
  progress: number;
  message: string;
}

export default function NFTMarkerCompiler({
  productSetId,
  onCompiled,
  existingMarker,
  disabled = false,
}: NFTMarkerCompilerProps) {
  const [compilationState, setCompilationState] = useState<CompilationState>({
    status: 'idle',
    progress: 0,
    message: '',
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingMarker?.sourceImageUrl || null);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // dynamically load the mindar compiler script
  const loadCompilerScript = useCallback(async (): Promise<void> => {
    // check if already loaded
    if (window.MINDAR?.IMAGE?.Compiler) {
      console.log('[NFTMarkerCompiler] Compiler already loaded');
      return;
    }

    // check if script tag already exists
    const existingScript = document.querySelector('script[src*="mindar-image.prod.js"]');
    if (!existingScript) {
      console.log('[NFTMarkerCompiler] Loading compiler script dynamically...');
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mind-ar@1.1.5/dist/mindar-image.prod.js';
      script.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        script.onload = () => {
          console.log('[NFTMarkerCompiler] Compiler script loaded');
          resolve();
        };
        script.onerror = () => reject(new Error('Failed to load MindAR compiler script'));
        document.head.appendChild(script);
      });
    }
  }, []);

  // wait for mindar compiler to load (max 10 seconds)
  const waitForCompiler = useCallback(async () => {
    // first, ensure the script is loaded
    await loadCompilerScript();

    const maxAttempts = 100; // 10 seconds
    for (let i = 0; i < maxAttempts; i++) {
      if (window.MINDAR?.IMAGE?.Compiler) {
        console.log('[NFTMarkerCompiler] MindAR compiler available');
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

  // convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // remove data:...;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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

  // compile image to .mind file
  const compileImage = async (file: File) => {
    try {
      setCompilationState({
        status: 'loading',
        progress: 5,
        message: 'loading image...',
      });

      // create preview
      const imageUrl = URL.createObjectURL(file);
      setPreviewUrl(imageUrl);

      // load image element for compiler
      const imageElement = await loadImageElement(file);
      console.log('[NFTMarkerCompiler] Image loaded:', imageElement.width, 'x', imageElement.height);

      // get source image as base64
      const sourceImageData = await fileToBase64(file);
      console.log('[NFTMarkerCompiler] Source image base64 length:', sourceImageData.length);

      setCompilationState({
        status: 'compiling',
        progress: 10,
        message: 'waiting for compiler to load...',
      });

      // wait for compiler to load
      const CompilerClass = await waitForCompiler();
      
      setCompilationState({
        status: 'compiling',
        progress: 12,
        message: 'initializing compiler...',
      });

      const compiler = new CompilerClass();
      console.log('[NFTMarkerCompiler] Starting compilation...');

      // compile image targets with progress callback
      await compiler.compileImageTargets([imageElement], (progress: number) => {
        const percent = Math.round(progress * 100);
        setCompilationState({
          status: 'compiling',
          progress: 10 + (percent * 0.8), // 10-90%
          message: `compiling .mind file... ${percent}%`,
        });
      });

      console.log('[NFTMarkerCompiler] Compilation complete, exporting data...');

      setCompilationState({
        status: 'compiling',
        progress: 92,
        message: 'exporting .mind file...',
      });

      // export compiled data
      const exportedData = await compiler.exportData();
      console.log('[NFTMarkerCompiler] Exported data size:', exportedData.byteLength, 'bytes');

      // convert to base64
      const mindFileData = arrayBufferToBase64(exportedData);
      console.log('[NFTMarkerCompiler] Mind file base64 length:', mindFileData.length);

      // estimate quality based on file size (larger = more features = better tracking)
      const quality = Math.min(100, Math.round((exportedData.byteLength / 50000) * 100));

      setCompilationState({
        status: 'complete',
        progress: 100,
        message: 'marker compiled successfully!',
      });

      // get filename without extension
      const filename = file.name.replace(/\.[^/.]+$/, '');

      console.log('[NFTMarkerCompiler] Calling onCompiled with:', {
        filenameLength: filename.length,
        mindFileDataLength: mindFileData.length,
        sourceImageDataLength: sourceImageData.length,
        quality,
      });

      // call callback with compiled data
      onCompiled({
        mindFileData,
        sourceImageData,
        filename,
        quality,
      });

    } catch (error: any) {
      console.error('[NFTMarkerCompiler] Compilation failed:', error);
      setCompilationState({
        status: 'error',
        progress: 0,
        message: error?.message || 'compilation failed',
      });
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setCompilationState({
        status: 'error',
        progress: 0,
        message: 'please select an image file (png, jpg, etc.)',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setCompilationState({
        status: 'error',
        progress: 0,
        message: 'file size must be less than 10MB',
      });
      return;
    }

    await compileImage(file);
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

    if (disabled || compilationState.status === 'compiling') return;

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

  const handleReset = () => {
    setCompilationState({ status: 'idle', progress: 0, message: '' });
    setPreviewUrl(existingMarker?.sourceImageUrl || null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isProcessing = compilationState.status === 'loading' || compilationState.status === 'compiling';

  return (
    <div className={styles.nftMarkerCompiler}>
      <h3 className={styles.sectionTitle}>nft marker</h3>
      <p className={styles.sectionDescription}>
        upload an image to create an ar tracking target. the browser will compile it into a .mind file.
      </p>

      {/* existing marker display */}
      {existingMarker && compilationState.status === 'idle' && (
        <div className={styles.existingMarkerCard}>
          <div className={styles.existingMarkerPreview}>
            <img src={existingMarker.sourceImageUrl} alt="current marker" />
          </div>
          <div className={styles.existingMarkerInfo}>
            <p className={styles.existingMarkerLabel}>current marker</p>
            <p className={styles.existingMarkerDate}>
              compiled {new Date(existingMarker.compiledAt).toLocaleDateString()}
            </p>
            {existingMarker.quality && (
              <p className={styles.existingMarkerQuality}>
                quality: {existingMarker.quality}%
              </p>
            )}
          </div>
        </div>
      )}

      {/* upload area */}
      <div
        className={`${styles.uploadArea} ${dragActive ? styles.dragActive : ''} ${disabled ? styles.disabled : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && !isProcessing && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          disabled={disabled || isProcessing}
        />

        {isProcessing ? (
          <div className={styles.compilingState}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${compilationState.progress}%` }}
              />
            </div>
            <p className={styles.compilingMessage}>{compilationState.message}</p>
          </div>
        ) : compilationState.status === 'complete' && previewUrl ? (
          <div className={styles.completeState}>
            <div className={styles.previewImage}>
              <img src={previewUrl} alt="compiled marker" />
            </div>
            <p className={styles.completeMessage}>✓ marker compiled successfully</p>
            <button
              type="button"
              className={styles.resetButton}
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
            >
              upload different image
            </button>
          </div>
        ) : compilationState.status === 'error' ? (
          <div className={styles.errorState}>
            <p className={styles.errorMessage}>{compilationState.message}</p>
            <button
              type="button"
              className={styles.retryButton}
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
            >
              try again
            </button>
          </div>
        ) : (
          <div className={styles.uploadPrompt}>
            <div className={styles.uploadIcon}>🎯</div>
            <p>drag & drop an image here or click to browse</p>
            <p className={styles.uploadHint}>
              png or jpg • max 10mb • high contrast recommended
            </p>
          </div>
        )}
      </div>

      {/* tips */}
      <div className={styles.markerTips}>
        <h4>tips for best tracking:</h4>
        <ul>
          <li>use images with high contrast and distinct features</li>
          <li>avoid repetitive patterns or solid colors</li>
          <li>qr codes and logos work great</li>
          <li>minimum recommended size: 300x300px</li>
        </ul>
      </div>
    </div>
  );
}
