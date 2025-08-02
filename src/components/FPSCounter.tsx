import React, { useState, useEffect } from 'react';

interface FPSCounterProps {
  isVisible: boolean;
}

const FPSCounter: React.FC<FPSCounterProps> = ({ isVisible }) => {
  const [fps, setFps] = useState<number>(0);

  useEffect(() => {
    if (!isVisible) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const updateFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
      }
      
      animationId = requestAnimationFrame(updateFPS);
    };

    animationId = requestAnimationFrame(updateFPS);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  // Color-code FPS for quick visual feedback
  const getFpsColor = (fps: number): string => {
    if (fps >= 30) return '#00ff00'; // Green
    if (fps >= 20) return '#ffaa00'; // Orange
    return '#ff0000'; // Red
  };

  const fpsColor = getFpsColor(fps);

  return (
    <div style={{
      position: 'absolute',
      top: '15px',
      left: '15px',
      zIndex: 1001, // higher than test overlay
      backgroundColor: 'rgba(0,0,0,0.8)',
      color: fpsColor,
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: 'bold',
      fontFamily: 'monospace',
      border: `1px solid ${fpsColor}`,
    }}>
      FPS: {fps}
    </div>
  );
};

export default FPSCounter;