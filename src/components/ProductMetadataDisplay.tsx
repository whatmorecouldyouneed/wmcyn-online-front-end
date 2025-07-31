import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ProductMetadata } from '../config/markers';
import NextImage from './NextImage';
import styles from './ProductMetadataDisplay.module.scss';

interface ProductMetadataDisplayProps {
  metadata: ProductMetadata;
  onClose: () => void;
  onClaim: () => void;
  isLoggedIn: boolean;
  showLogoAnimation?: boolean;
}

// Generate Instagram story share URL with embedded purchase link
const generateInstagramShareUrl = (metadata: ProductMetadata, imageUrl: string) => {
  const storyUrl = `instagram://story-camera`;
  const text = `Check out this ${metadata.title} for $${metadata.price}! 🔥\n\nGet yours: ${metadata.purchaseUrl}`;
  
  // For web fallback, create a shareable link
  const webShareUrl = `https://www.instagram.com/create/story/?background_image=${encodeURIComponent(imageUrl)}&text=${encodeURIComponent(text)}`;
  
  return { storyUrl, webShareUrl, text };
};

// Capture canvas with 3D logo overlay for sharing
const captureLogoOverlay = async (logoImageUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      resolve('');
      return;
    }
    
    canvas.width = 1080;
    canvas.height = 1920; // Instagram story dimensions
    
    // Create background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#000000');
    gradient.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Load and draw the logo
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Draw logo in center with glow effect
      const logoSize = 300;
      const x = (canvas.width - logoSize) / 2;
      const y = (canvas.height - logoSize) / 2;
      
      // Add glow effect
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 50;
      ctx.drawImage(img, x, y, logoSize, logoSize);
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      
      // Add text overlay
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('WMCYN', canvas.width / 2, y + logoSize + 80);
      
      ctx.font = '32px Arial';
      ctx.fillStyle = '#cccccc';
      ctx.fillText('Scan to claim your exclusive item', canvas.width / 2, y + logoSize + 130);
      
      resolve(canvas.toDataURL('image/png'));
    };
    
    img.onerror = () => resolve('');
    img.src = logoImageUrl;
  });
};

const ProductMetadataDisplay: React.FC<ProductMetadataDisplayProps> = ({
  metadata,
  onClose,
  onClaim,
  isLoggedIn,
  showLogoAnimation = true
}) => {
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-capture the image with logo overlay for sharing
    if (showLogoAnimation) {
      const timer = setTimeout(async () => {
        setIsCapturing(true);
        const imageUrl = await captureLogoOverlay(metadata.imageUrl);
        setCapturedImage(imageUrl);
        setIsCapturing(false);
      }, 2000); // Wait for logo animation to settle

      return () => clearTimeout(timer);
    }
  }, [showLogoAnimation, metadata.imageUrl]);

  const handleShare = useCallback(async () => {
    if (!capturedImage) {
      setIsCapturing(true);
      const imageUrl = await captureLogoOverlay(metadata.imageUrl);
      setCapturedImage(imageUrl);
      setIsCapturing(false);
      
      if (!imageUrl) {
        alert('Failed to capture image for sharing');
        return;
      }
    }

    const { storyUrl, webShareUrl, text } = generateInstagramShareUrl(metadata, capturedImage);

    // Try to open Instagram app first
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isIOS || isAndroid) {
      // Mobile device - try to open Instagram app
      window.location.href = storyUrl;
      
      // Fallback to web version after delay
      setTimeout(() => {
        if (navigator.share) {
          navigator.share({
            title: metadata.title,
            text: text,
            url: metadata.purchaseUrl
          }).catch(() => {
            // Fallback to copying to clipboard
            navigator.clipboard.writeText(`${text}\n\n${metadata.purchaseUrl}`);
            alert('Link copied to clipboard! Paste it in your Instagram story.');
          });
        } else {
          // Copy to clipboard fallback
          navigator.clipboard.writeText(`${text}\n\n${metadata.purchaseUrl}`);
          alert('Link copied to clipboard! Paste it in your Instagram story.');
        }
      }, 1000);
    } else {
      // Desktop - copy to clipboard and show instructions
      try {
        await navigator.clipboard.writeText(`${text}\n\n${metadata.purchaseUrl}`);
        alert('Content copied to clipboard!\n\nOpen Instagram on your phone and paste this into your story.');
      } catch (err) {
        // Manual copy fallback
        const textArea = document.createElement('textarea');
        textArea.value = `${text}\n\n${metadata.purchaseUrl}`;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Content copied to clipboard!\n\nOpen Instagram on your phone and paste this into your story.');
      }
    }
  }, [capturedImage, metadata]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className={styles.overlay} ref={overlayRef}>
      <div className={styles.container}>
        {/* 3D Logo Animation Area */}
        {showLogoAnimation && (
          <div className={styles.logoAnimationArea}>
            <div className={styles.logoContainer}>
              <NextImage
                src={metadata.imageUrl}
                alt={metadata.title}
                className={styles.animatedLogo}
                priority
              />
              <div className={styles.glowEffect}></div>
            </div>
            <p className={styles.animationText}>3D logo detected!</p>
          </div>
        )}

        {/* Product Metadata */}
        <div className={styles.metadataContainer}>
          <div className={styles.header}>
            <h2 className={styles.title}>{metadata.title}</h2>
            <button onClick={onClose} className={styles.closeButton}>
              ✕
            </button>
          </div>

          <div className={styles.content}>
            <p className={styles.description}>{metadata.description}</p>
            
            <div className={styles.details}>
              <div className={styles.priceSection}>
                <span className={styles.price}>
                  {metadata.currency === 'USD' ? '$' : metadata.currency}
                  {metadata.price.toFixed(2)}
                </span>
                <span className={styles.quantity}>
                  {metadata.quantity} available
                </span>
              </div>

              <div className={styles.printInfo}>
                <div className={styles.printDetail}>
                  <span className={styles.label}>Print Date:</span>
                  <span className={styles.value}>{formatDate(metadata.printDate)}</span>
                </div>
                <div className={styles.printDetail}>
                  <span className={styles.label}>Location:</span>
                  <span className={styles.value}>{metadata.printLocation}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className={styles.actions}>
              {isLoggedIn ? (
                <>
                  <button onClick={onClaim} className={styles.claimButton}>
                    Claim Item
                  </button>
                  <button 
                    onClick={handleShare}
                    className={styles.shareButton}
                    disabled={isCapturing}
                  >
                    {isCapturing ? 'Preparing...' : 'Share to IG Story'}
                  </button>
                </>
              ) : (
                <div className={styles.loginPrompt}>
                  <p>Please log in to claim this item</p>
                  <button onClick={onClaim} className={styles.loginButton}>
                    Log In
                  </button>
                </div>
              )}
            </div>

            {/* Purchase Link */}
            <div className={styles.purchaseSection}>
              <a 
                href={metadata.purchaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.purchaseLink}
              >
                Purchase Online →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductMetadataDisplay;