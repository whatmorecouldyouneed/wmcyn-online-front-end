// import { INSTAGRAM_CONFIG } from '../config/markers';

// todo: move this to config/markers.ts
const INSTAGRAM_CONFIG = {
  CUSTOM_URL_SCHEME: 'instagram://story-camera',
  FACEBOOK_APP_ID: 'your_facebook_app_id_here',
  FALLBACK_URL: 'https://instagram.com'
};

interface InstagramShareOptions {
  backgroundImage?: Blob;
  stickerImage?: Blob;
  backgroundTopColor?: string;
  backgroundBottomColor?: string;
  text?: string;
  url?: string;
}

interface ARSceneShareOptions {
  metadata: {
    id: string;
    title: string;
    price: { amount: string; currencyCode: string };
    printLocation: string;
    quantity: number;
  };
  canvasElement?: HTMLCanvasElement;
  videoElement?: HTMLVideoElement;
}

interface DeviceInfo {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  supportsWebShare: boolean;
}

// detect device capabilities
export const getDeviceInfo = (): DeviceInfo => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isIOS = /ipad|iphone|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  const supportsWebShare = 'share' in navigator && typeof navigator.share === 'function';

  return { isMobile, isIOS, isAndroid, supportsWebShare };
};

// convert blob to base64 for sharing
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]); // Remove data:image/png;base64, prefix
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// iOS Instagram Stories sharing using custom URL scheme
export const shareToInstagramStoriesIOS = async (options: InstagramShareOptions): Promise<boolean> => {
  const { backgroundImage, stickerImage, backgroundTopColor, backgroundBottomColor } = options;
  
  try {
    const urlScheme = `${INSTAGRAM_CONFIG.CUSTOM_URL_SCHEME}?source_application=${INSTAGRAM_CONFIG.FACEBOOK_APP_ID}`;
    
    // Check if Instagram app is available
    const canOpen = await new Promise<boolean>((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = urlScheme;
      
      const timeout = setTimeout(() => {
        resolve(false);
        document.body.removeChild(iframe);
      }, 2000);
      
      iframe.onload = () => {
        clearTimeout(timeout);
        resolve(true);
        document.body.removeChild(iframe);
      };
      
      document.body.appendChild(iframe);
    });

    if (!canOpen) {
      throw new Error('Instagram app not available');
    }

    // Prepare pasteboard data (simulated for web)
    const pasteboardData: any = {};
    
    if (backgroundImage) {
      pasteboardData['com.instagram.sharedSticker.backgroundImage'] = await blobToBase64(backgroundImage);
    }
    
    if (stickerImage) {
      pasteboardData['com.instagram.sharedSticker.stickerImage'] = await blobToBase64(stickerImage);
    }
    
    if (backgroundTopColor) {
      pasteboardData['com.instagram.sharedSticker.backgroundTopColor'] = backgroundTopColor;
    }
    
    if (backgroundBottomColor) {
      pasteboardData['com.instagram.sharedSticker.backgroundBottomColor'] = backgroundBottomColor;
    }

    // Store data in localStorage for the Instagram app to potentially access
    localStorage.setItem('instagram_share_data', JSON.stringify(pasteboardData));
    
    // Open Instagram app
    window.location.href = urlScheme;
    return true;
    
  } catch (error) {
    console.error('iOS Instagram sharing failed:', error);
    return false;
  }
};

// Android Instagram Stories sharing using intent
export const shareToInstagramStoriesAndroid = async (options: InstagramShareOptions): Promise<boolean> => {
  const { backgroundImage, text, url } = options;
  
  try {
    // Android uses implicit intents - we'll simulate this with a custom URL
    const intentAction = 'com.instagram.share.ADD_TO_STORY';
    const intentUrl = `intent://${intentAction}#Intent;package=com.instagram.android;scheme=https;S.source_application=${INSTAGRAM_CONFIG.FACEBOOK_APP_ID};end`;
    
    // For web, we'll try to use the Web Share API with fallback
    if (navigator.share && backgroundImage) {
      const shareData = {
        files: [new File([backgroundImage], 'wmcyn-ar-experience.png', { type: 'image/png' })],
        title: 'WMCYN AR Experience',
        text: text || 'Check out this amazing AR experience!',
        url: url
      };

      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return true;
      }
    }

    // Fallback: try to open Instagram app directly
    const instagramUrl = `instagram://story-camera?source_application=${INSTAGRAM_CONFIG.FACEBOOK_APP_ID}`;
    window.location.href = instagramUrl;
    
    // After a delay, open web version as fallback
    setTimeout(() => {
      window.open(INSTAGRAM_CONFIG.FALLBACK_URL, '_blank');
    }, 2000);

    return true;
    
  } catch (error) {
    console.error('Android Instagram sharing failed:', error);
    return false;
  }
};

// Enhanced Instagram Stories sharing with multiple fallback methods
export const shareToInstagramStories = async (options: InstagramShareOptions): Promise<{
  success: boolean;
  method: string;
  message: string;
}> => {
  const deviceInfo = getDeviceInfo();
  const { backgroundImage, text, url } = options;

  // Method 1: Native mobile app sharing
  if (deviceInfo.isMobile) {
    try {
      let success = false;
      
      if (deviceInfo.isIOS) {
        success = await shareToInstagramStoriesIOS(options);
        if (success) {
          return {
            success: true,
            method: 'ios_custom_url_scheme',
            message: 'Opening Instagram app...'
          };
        }
      } else if (deviceInfo.isAndroid) {
        success = await shareToInstagramStoriesAndroid(options);
        if (success) {
          return {
            success: true,
            method: 'android_intent',
            message: 'Opening Instagram app...'
          };
        }
      }
    } catch (error) {
      console.warn('Native app sharing failed, trying web methods');
    }
  }

  // Method 2: Web Share API with file
  if (deviceInfo.supportsWebShare && backgroundImage) {
    try {
      const shareData = {
        files: [new File([backgroundImage], 'wmcyn-ar-experience.png', { type: 'image/png' })],
        title: 'WMCYN AR Experience',
        text: text || 'Check out this amazing AR experience!',
        url: url
      };

      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return {
          success: true,
          method: 'web_share_api_with_file',
          message: 'Shared successfully!'
        };
      }
    } catch (error) {
      console.warn('Web Share API with file failed');
    }
  }

  // Method 3: Web Share API text only
  if (deviceInfo.supportsWebShare) {
    try {
      await navigator.share({
        title: 'WMCYN AR Experience',
        text: text || 'Check out this amazing AR experience!',
        url: url || 'https://wmcyn.online'
      });
      
      return {
        success: true,
        method: 'web_share_api_text',
        message: 'Shared successfully!'
      };
    } catch (error) {
      console.warn('Web Share API text sharing failed');
    }
  }

  // Method 4: Download image and copy text
  if (backgroundImage) {
    try {
      const imageUrl = URL.createObjectURL(backgroundImage);
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = 'wmcyn-ar-experience.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(imageUrl);

      // Copy share text
      const shareText = `${text || 'Check out this amazing WMCYN AR experience!'} ${url || 'https://wmcyn.online'}`;
      await navigator.clipboard.writeText(shareText);

      return {
        success: true,
        method: 'download_and_copy',
        message: 'Image downloaded! Share text copied to clipboard. Upload to your Instagram Story and paste the text.'
      };
    } catch (error) {
      console.warn('Download method failed');
    }
  }

  // Method 5: Copy URL only (final fallback)
  try {
    const fallbackUrl = url || 'https://wmcyn.online';
    await navigator.clipboard.writeText(fallbackUrl);
    
    return {
      success: true,
      method: 'copy_url_fallback',
      message: 'Link copied to clipboard! Share it manually on Instagram Story.'
    };
  } catch (error) {
    // Ultimate fallback
    const fallbackUrl = url || 'https://wmcyn.online';
    return {
      success: false,
      method: 'manual_fallback',
      message: `Please copy this link manually: ${fallbackUrl}`
    };
  }
};

// capture AR scene and create Instagram story image
export const captureARSceneForInstagram = async (options: ARSceneShareOptions): Promise<Blob | null> => {
  try {
    console.log('Capturing AR scene for Instagram story...');
    
    // create a canvas to composite the final image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    // set canvas size for Instagram story (9:16 aspect ratio)
    canvas.width = 1080;
    canvas.height = 1920;
    
    // fill with black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // capture video frame if available
    if (options.videoElement && options.videoElement.videoWidth > 0) {
      const videoAspect = options.videoElement.videoWidth / options.videoElement.videoHeight;
      const canvasAspect = canvas.width / canvas.height;
      
      let drawWidth, drawHeight, drawX, drawY;
      
      if (videoAspect > canvasAspect) {
        // video is wider, fit height
        drawHeight = canvas.height;
        drawWidth = drawHeight * videoAspect;
        drawX = (canvas.width - drawWidth) / 2;
        drawY = 0;
      } else {
        // video is taller, fit width
        drawWidth = canvas.width;
        drawHeight = drawWidth / videoAspect;
        drawX = 0;
        drawY = (canvas.height - drawHeight) / 2;
      }
      
      ctx.drawImage(options.videoElement, drawX, drawY, drawWidth, drawHeight);
    }
    
    // overlay 3D canvas if available
    if (options.canvasElement) {
      const canvasAspect = options.canvasElement.width / options.canvasElement.height;
      const targetAspect = canvas.width / canvas.height;
      
      let overlayWidth, overlayHeight, overlayX, overlayY;
      
      if (canvasAspect > targetAspect) {
        overlayHeight = canvas.height;
        overlayWidth = overlayHeight * canvasAspect;
        overlayX = (canvas.width - overlayWidth) / 2;
        overlayY = 0;
      } else {
        overlayWidth = canvas.width;
        overlayHeight = overlayWidth / canvasAspect;
        overlayX = 0;
        overlayY = (canvas.height - overlayHeight) / 2;
      }
      
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(options.canvasElement, overlayX, overlayY, overlayWidth, overlayHeight);
    }
    
    // add metadata overlay
    await addMetadataOverlay(ctx, canvas, options.metadata);
    
    // convert to blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.95);
    });
    
  } catch (error) {
    console.error('Error capturing AR scene:', error);
    return null;
  }
};

// add styled metadata overlay to the canvas
const addMetadataOverlay = async (
  ctx: CanvasRenderingContext2D, 
  canvas: HTMLCanvasElement, 
  metadata: ARSceneShareOptions['metadata']
): Promise<void> => {
  const padding = 60;
  const overlayHeight = 300;
  const overlayY = canvas.height - overlayHeight - padding;
  
  // create gradient background for metadata
  const gradient = ctx.createLinearGradient(0, overlayY, 0, overlayY + overlayHeight);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(padding, overlayY, canvas.width - padding * 2, overlayHeight);
  
  // add border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(padding, overlayY, canvas.width - padding * 2, overlayHeight);
  
  // add WMCYN logo/branding
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('WMCYN', canvas.width / 2, overlayY + 60);
  
  // add product title
  ctx.font = 'bold 64px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(metadata.title.toUpperCase(), canvas.width / 2, overlayY + 130);
  
  // add price and location
  const price = `${metadata.price.currencyCode === 'USD' ? '$' : metadata.price.currencyCode}${metadata.price.amount}`;
  ctx.font = '42px Arial';
  ctx.fillStyle = '#10b981';
  ctx.textAlign = 'left';
  ctx.fillText(price, padding + 40, overlayY + 190);
  
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'right';
  ctx.fillText(metadata.printLocation, canvas.width - padding - 40, overlayY + 190);
  
  // add edition info
  ctx.font = '36px Arial';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.textAlign = 'center';
  ctx.fillText(`LIMITED EDITION • ${metadata.quantity} PIECES`, canvas.width / 2, overlayY + 240);
  
  // add scan instruction
  ctx.font = '32px Arial';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.textAlign = 'center';
  ctx.fillText('SCAN WMCYN QR CODE TO EXPERIENCE IN AR', canvas.width / 2, overlayY + 280);
};

// main function to share AR scene to Instagram
export const shareARSceneToInstagram = async (options: ARSceneShareOptions): Promise<void> => {
  try {
    console.log('Sharing AR scene to Instagram...', options.metadata);
    
    // capture the scene
    const imageBlob = await captureARSceneForInstagram(options);
    if (!imageBlob) {
      throw new Error('Failed to capture AR scene');
    }
    
    // get device info
    const deviceInfo = getDeviceInfo();
    
    if (deviceInfo.isMobile) {
      // on mobile, try to use native Instagram sharing
      await shareToInstagramStories({ backgroundImage: imageBlob });
    } else {
      // on desktop, download the image and show instructions
      downloadImage(imageBlob, `wmcyn-ar-${options.metadata.id}.jpg`);
      
      // show user instructions
      alert('Image saved! Please upload this image to your Instagram story manually.');
    }
    
  } catch (error) {
    console.error('Error sharing to Instagram:', error);
    
    // fallback: just open Instagram
    window.open('https://instagram.com', '_blank');
  }
};

// helper function to download image on desktop
const downloadImage = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};