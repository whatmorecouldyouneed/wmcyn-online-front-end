'use client';

import React, { useEffect, useState, useCallback, memo, CSSProperties } from 'react';
import Typewriter from 'typewriter-effect';
import NextImage from '../NextImage';
import { db, ref, push, set } from '../../utils/lib/firebase';
import styles from './InfiniteMirror.module.scss';
import glassStyles from './LiquidGlassForm.module.scss';

const WMCYNLOGO = '/wmcyn_logo_white.png';

interface InfiniteMirrorProps {
  depth?: number;
  className?: string;
}

function writeUserData(emailID: string) {
  if (!db) {
    console.error('Firebase database not initialized');
    return Promise.reject(new Error('Firebase not initialized'));
  }
  
  const emailListRef = ref(db, 'emailList');
  const newEmailRef = push(emailListRef);
  const emailData = { 
    email: emailID,
    timestamp: Date.now(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown'
  };
  
  return set(newEmailRef, emailData).catch((error) => {
    console.error('Firebase write failed:', error);
    throw error;
  });
}

// Keep content simple and consistent - only newsletter content
const ContentLayer = memo<{ 
  level: number; 
  hasSubscribed: boolean; 
  email: string; 
  error: string;
  isInteractive: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onEmailChange: (value: string) => void;
  onFormClick: (e: React.MouseEvent) => void;
}>(({ level, hasSubscribed, email, error, isInteractive, onSubmit, onEmailChange, onFormClick }) => {
  const isMainLevel = level === 0;
  
  return (
    <div className={styles.mainContent}>
      <NextImage 
        src={WMCYNLOGO} 
        alt="WMCYN Logo" 
        className={styles.logo}
        priority={isMainLevel}
      />
      
      <h1 className={styles.typewriter}>
        {hasSubscribed ? (
          <Typewriter 
            options={{ 
              strings: ['WMCYN WELCOMES YOU'], 
              autoStart: true, 
              loop: true 
            }} 
          />
        ) : (
          <Typewriter
            options={{
              strings: ["YOU'RE EARLY...", 'SIGN UP FOR OUR NEWSLETTER'],
              autoStart: true,
              loop: true,
            }}
          />
        )}
      </h1>

      {!hasSubscribed && isMainLevel && (
        <div className={glassStyles.liquidGlassFormContainer}>
          <div className={glassStyles.liquidGlassFilter}></div>
          <div className={glassStyles.liquidGlassOverlay}></div>
          <div className={glassStyles.liquidGlassSpecular}></div>
          <div className={glassStyles.liquidGlassContent}>
            <form onSubmit={onSubmit} className={glassStyles.liquidGlassForm}>
              <input
                type="email"
                placeholder="enter your email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                className={glassStyles.inputField}
                required
              />
              <button type="submit" className={glassStyles.submitButton}>
                subscribe
              </button>
            </form>
            {error && (
              <p className={glassStyles.error}>{error}</p>
            )}
          </div>
        </div>
      )}

      {hasSubscribed && isMainLevel && (
        <div className={glassStyles.liquidGlassFormContainer}>
          <div className={glassStyles.liquidGlassFilter}></div>
          <div className={glassStyles.liquidGlassOverlay}></div>
          <div className={glassStyles.liquidGlassSpecular}></div>
          <div className={glassStyles.liquidGlassContent}>
            <p className={glassStyles.subscribedText}>subscribed.</p>
          </div>
        </div>
      )}
    </div>
  );
});

ContentLayer.displayName = 'ContentLayer';

// Memoized recursive layer component
const RecursiveLayer = memo<{
  level: number;
  depth: number;
  hasSubscribed: boolean;
  email: string;
  error: string;
  isInteractive: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onEmailChange: (value: string) => void;
  onFormClick: (e: React.MouseEvent) => void;
}>(({ level, depth, hasSubscribed, email, error, isInteractive, onSubmit, onEmailChange, onFormClick }) => {
  if (level >= depth) return null;
  
  // progressive scaling and opacity for seamless depth
  const baseScale = Math.pow(0.85, level);
  const baseOpacity = Math.max(0.1, 1 - (level * 0.045));
  
  return (
    <div 
      className={styles.recursiveLevel}
      style={{ 
        '--level': level,
        '--base-scale': baseScale,
        '--base-opacity': baseOpacity,
        zIndex: depth - level
      } as React.CSSProperties}
    >
      <div className={styles.levelBorder}>
        <div className={styles.levelContent}>
          
          {/* Only render content on first 3 levels for performance */}
          {level < 3 && (
            <ContentLayer
              level={level}
              hasSubscribed={hasSubscribed}
              email={email}
              error={error}
              isInteractive={isInteractive}
              onSubmit={onSubmit}
              onEmailChange={onEmailChange}
              onFormClick={onFormClick}
            />
          )}

          {/* Nested child - creates the infinite tunnel */}
          <div className={styles.childContainer}>
            <RecursiveLayer 
              level={level + 1}
              depth={depth}
              hasSubscribed={hasSubscribed}
              email={email}
              error={error}
              isInteractive={isInteractive}
              onSubmit={onSubmit}
              onEmailChange={onEmailChange}
              onFormClick={onFormClick}
            />
          </div>

        </div>
      </div>
    </div>
  );
});

RecursiveLayer.displayName = 'RecursiveLayer';

const InfiniteMirror: React.FC<InfiniteMirrorProps> = ({ depth = 8, className }) => {
  const [mounted, setMounted] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleContainerClick = useCallback(() => {
    setIsInteractive(!isInteractive);
  }, [isInteractive]);

  if (!mounted) return null;

  const animationDuration = 48; 
  const numberOfLayers = 6; 
  
  const levels = [];
  for (let i = 0; i < numberOfLayers; i++) {
    const delay = (animationDuration / numberOfLayers) * i; 
    
    const layerStyle: CSSProperties = {};

    levels.push(
      <div 
        key={`layer-${i}`}
        className={styles.animatedLayer}
        style={{ 
          '--animation-delay': `-${delay}s`,
          '--duration': `${animationDuration}s`,
          zIndex: numberOfLayers - i,
          ...layerStyle
        } as React.CSSProperties}
      >
        <div className={styles.levelBorder}>
          <div className={styles.levelContent}>
            {/* Completely empty - just the container */}
          </div>
        </div>
      </div>
    );
  }

  const containerStyle: CSSProperties = {};

  return (
    <div 
      className={`${styles.infiniteContainer} ${className || ''} ${isInteractive ? styles.paused : ''}`}
      onClick={handleContainerClick}
      style={containerStyle}
    >
      {levels}
    </div>
  );
};

export default memo(InfiniteMirror); 