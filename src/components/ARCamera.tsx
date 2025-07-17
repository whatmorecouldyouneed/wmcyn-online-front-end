import React, { useRef, useState } from 'react';
import { type MarkerConfig, markerConfigs as defaultMarkerConfigs } from '../config/markers';
import { useARScene } from '../hooks/useARScene';
import styles from './ARCamera.module.scss';
import { useAuth } from '../contexts/AuthContext';
import { firestore } from '../utils/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface ARCameraProps {
  onClose: () => void;
  configs?: MarkerConfig[];
}

const ARCamera = ({ onClose, configs = defaultMarkerConfigs }: ARCameraProps): JSX.Element => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();

  const enhancedConfigs = configs.map(config => ({
    ...config,
    onFound: async () => {
      if (!currentUser) {
        alert('Please log in to claim this product.');
        return;
      }
      if (!firestore) {
        alert('Database not initialized.');
        return;
      }
      const markerRef = doc(firestore, 'markers', config.productId);
      const markerSnap = await getDoc(markerRef);
      if (!markerSnap.exists()) {
        await setDoc(markerRef, { owner: currentUser.uid, claimedAt: new Date() });
        await setDoc(doc(firestore, `users/${currentUser.uid}/products`, config.productId), {
          name: config.name,
          acquired: new Date(),
        });
        alert('Product claimed successfully!');
      } else {
        alert('This product has already been claimed.');
      }
    }
  }));

  // use the custom hook for AR scene management
  useARScene({ mountRef, configs: enhancedConfigs, setIsLoading });

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
