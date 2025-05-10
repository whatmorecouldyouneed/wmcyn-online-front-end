import React, { useRef, useState } from 'react';
import { type MarkerConfig, markerConfigs as defaultMarkerConfigs } from '../config/markers';
import { useARScene } from '../hooks/useARScene';
import styles from './ARCamera.module.scss'; 

interface ARCameraProps {
  onClose: () => void;
  configs?: MarkerConfig[];
}

const ARCamera = ({ onClose, configs = defaultMarkerConfigs }: ARCameraProps): JSX.Element => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  // use the custom hook for AR scene management
  useARScene({ mountRef, configs, setIsLoading });

  // useEffect for body class management
  React.useEffect(() => {
    document.body.classList.add('cameraActive');
    return () => {
      document.body.classList.remove('cameraActive');
    };
  }, []);

  return (
    <div className={styles.arCameraContainer}>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          Initializing AR...
        </div>
      )}
      <div ref={mountRef} className={styles.mountPoint}></div>
      <button 
        onClick={onClose} 
        className={styles.closeButton}
      >
        Close AR
      </button>
    </div>
  );
};

export default ARCamera;
