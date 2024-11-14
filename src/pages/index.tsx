/* eslint-disable @typescript-eslint/no-namespace */
import { useState, useEffect } from 'react';
import { db, ref, push, set } from '../utils/lib/firebase';
import Typewriter from 'typewriter-effect';
import NextImage from '../components/NextImage';
import WMCYNLOGO from '../../public/wmcyn_logo_white.png';
import InstagramLogo from '../../public/instagram-logo.png';
import WMCYNQRCODE from '../../public/wmcyn-qr.png';
import styles from '../styles/Home.module.css';
import router from 'next/router';

// Define custom elements in the global JSX namespace
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'a-scene': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        embedded?: boolean;
        arjs?: string;
        renderer?: string;
        'vr-mode-ui'?: string;
      };
      'a-entity': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        camera?: boolean;
        position?: string;
        'text-geometry'?: string;
        material?: string;
      };
      'a-marker': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        preset?: string;
        type?: string;
        url?: string;
      };
    }
  }
}

interface ARCameraProps {
  onClose: () => void;
}

const ARCamera: React.FC<ARCameraProps> = ({ onClose }) => {
  useEffect(() => {
    // initial mount log
    console.log('AR Camera component mounting...');

    const waitForAFrame = () => {
      // check if AFRAME is loaded
      if (typeof window.frames === 'undefined') {
        console.log('Waiting for A-Frame to load...');
        setTimeout(waitForAFrame, 100);
        return;
      }
      
      console.log('A-Frame loaded, setting up AR...');
      setupAR();
    };

    const setupAR = () => {
      const sceneEl = document.querySelector('a-scene');
      console.log('Found scene element:', sceneEl);

      if (!sceneEl) {
        console.warn('No scene element found!');
        return;
      }

      const setupMarkerEvents = () => {
        console.log('Setting up marker events...');
        const marker = document.querySelector('a-marker');
        
        if (!marker) {
          console.warn('No marker element found!');
          return;
        }

        console.log('Marker element found, attaching events...');
        
        const markerFound = () => {
          console.log('🎯 QR Code detected!');
        };

        const markerLost = () => {
          console.log('❌ QR Code lost...');
        };

        // attach events
        marker.addEventListener('markerFound', markerFound);
        marker.addEventListener('markerLost', markerLost);
        
        console.log('Events attached successfully');

        // cleanup function
        return () => {
          console.log('Cleaning up marker events...');
          marker.removeEventListener('markerFound', markerFound);
          marker.removeEventListener('markerLost', markerLost);
        };
      };

      if (sceneEl.getAttribute('loaded')) {
        console.log('Scene already loaded');
        setupMarkerEvents();
      } else {
        console.log('Waiting for scene to load...');
        sceneEl.addEventListener('loaded', setupMarkerEvents);
      }
    };

    // start the process
    waitForAFrame();

    // cleanup
    return () => {
      console.log('AR Camera component unmounting...');
    };
  }, []);

  return (
    <div className={styles.cameraOverlay}>
      <a-scene
        embedded
        arjs="sourceType: webcam; debugUIEnabled: true; detectionMode: mono; patternRatio: 0.75;"
        renderer="logarithmicDepthBuffer: true; alpha: true;"
        vr-mode-ui="enabled: false"
        className={styles.cameraScene}
      >
        <a-marker 
          preset="custom"
          type="pattern"
          url="/pattern-wmcyn-qr.patt"
          emit-events="true"
        >
          <a-entity
            position="0 0 0"
            text-geometry="value: WMCYN; size: 1;"
            material="color: white;"
          ></a-entity>
        </a-marker>
        <a-entity camera></a-entity>
      </a-scene>
      <button onClick={onClose} className={styles.cameraCloseButton}>
        Close Camera
      </button>
    </div>
  );
};

function writeUserData(emailID: string) {
  if (!db) return;
  const emailListRef = ref(db, 'emailList');
  const newEmailRef = push(emailListRef);
  set(newEmailRef, { email: emailID });
}

export default function Home() {
  const [showCamera, setShowCamera] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hasSubscribed, setHasSubscribed] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (showCamera) {
      document.body.classList.add(styles.cameraActive);
    } else {
      document.body.classList.remove(styles.cameraActive);
    }
    return () => {
      document.body.classList.remove(styles.cameraActive);
    };
  }, [showCamera]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value);
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('email is required.');
      return;
    }
    writeUserData(email);
    setHasSubscribed(true);
    setEmail('');
  };

  const handleShopAccess = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'test') {
      localStorage.setItem('hasAccessToShop', 'true');
      router.push('/shop');
    } else {
      setError('Incorrect password');
    }
  };

  return (
    <div>
      {showCamera ? (
        <ARCamera onClose={() => setShowCamera(false)} />
      ) : (
        <div className={styles.pageContainer}>
          <div className={styles.container} id="homeSection">
            <NextImage src={WMCYNLOGO} alt="WMCYN Logo" className={styles.logo} priority />
            {hasSubscribed ? (
              <>
                <h1 className={styles.typewriter}>
                  <Typewriter options={{ strings: ['WMCYN WELCOMES YOU'], autoStart: true, loop: true }} />
                </h1>
                <p>subscribed.</p>
              </>
            ) : (
              <>
                <h1 className={styles.typewriter}>
                  <Typewriter options={{ strings: ["YOU'RE EARLY...", 'SIGN UP FOR OUR NEWSLETTER'], autoStart: true, loop: true }} />
                </h1>
                <form onSubmit={handleSubmit} className={styles.form}>
                  <input
                    type="email"
                    placeholder="enter your email"
                    value={email}
                    onChange={handleEmailChange}
                    className={styles.inputField}
                  />
                  <button type="submit" className={styles.submitButton}>subscribe</button>
                </form>
                {error && <p className={styles.error}>{error}</p>}
              </>
            )}
          </div>

          {/* Other sections */}
          <div className={`${styles.container} ${styles.aboutSection}`} id="aboutSection">
            <h2 className={styles.sectionHeading}>ABOUT WMCYN</h2>
            <p className={styles.sectionText}>
              future-forward start-up built on the advancement of modern technology intertwined with the basics of everyday lifestyle.
            </p>
            <div className={styles.instagramContainer}>
              <a href="https://instagram.com/whatmorecouldyouneed" className={styles.instagramLink}>
                <NextImage src={InstagramLogo} alt="Instagram Logo" className={styles.instagramLogo} />
              </a>
            </div>
          </div>

          <div id="friendsAndFamilySection" className={`${styles.container} ${styles.friendsAndFamilySection}`}>
            <h2 className={styles.sectionHeading}>FRIENDS AND FAMILY SHOP</h2>
            <form onSubmit={handleShopAccess} className={styles.form}>
              <input
                type="password"
                placeholder="password"
                value={password}
                onChange={handlePasswordChange}
                className={styles.inputField}
              />
              <button type="submit" className={styles.submitButton}>enter store</button>
            </form>
            {error && <p className={styles.error}>{error}</p>}
          </div>
          {/* QR Code Section with Scanner */}
          <div id="qrCodeSection" className={`${styles.container} ${styles.qrCodeSection}`}>
            <h2 className={styles.sectionHeading}>SCAN QR CODE</h2>
            <div onClick={() => setShowCamera(true)} style={{ cursor: 'pointer' }}>
              <NextImage src={WMCYNQRCODE} alt="WMCYN QR Code" className={styles.qrCodeImage} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
