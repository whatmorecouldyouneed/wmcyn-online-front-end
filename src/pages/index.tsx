/* eslint-disable @typescript-eslint/no-namespace */
import { useState, useEffect } from 'react';
import router from 'next/router';
import dynamic from 'next/dynamic';
import { db, ref, push, set } from '../utils/lib/firebase';
import Typewriter from 'typewriter-effect';
import NextImage from '../components/NextImage';

import WMCYNLOGO from '../../public/wmcyn_logo_white.png';
import InstagramLogo from '../../public/instagram-logo.png';
import WMCYNQRCODE from '../../public/wmcyn-qr.png';
import styles from '@/styles/Index.module.scss';

// --- dynamically import arcamera ---
const ARCamera = dynamic(
  () => import('../components/ARCamera'),
  {
    ssr: false, // critical: prevents server-side rendering attempts
    loading: () => <div className={styles.arjsLoader}>Initializing AR Scanner...</div>
  }
);

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
    if (showCamera) document.body.classList.add(styles.cameraActive);
    else document.body.classList.remove(styles.cameraActive);

    return () => document.body.classList.remove(styles.cameraActive);
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
    setError('');
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
          {/* HOME / Newsletter Section */}
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
                  <Typewriter
                    options={{
                      strings: ["YOU'RE EARLY...", 'SIGN UP FOR OUR NEWSLETTER'],
                      autoStart: true,
                      loop: true,
                    }}
                  />
                </h1>
                <form onSubmit={handleSubmit} className={styles.form}>
                  <input
                    type="email"
                    placeholder="enter your email"
                    value={email}
                    onChange={handleEmailChange}
                    className={styles.inputField}
                    required
                  />
                  <button type="submit" className={styles.submitButton}>
                    subscribe
                  </button>
                </form>
                {/* Only show error related to this form */}
                {error && !password && <p className={styles.error}>{error}</p>}
              </>
            )}
          </div>

          {/* ABOUT Section */}
          <div className={`${styles.container} ${styles.aboutSection}`} id="aboutSection">
            <h2 className={styles.sectionHeading}>ABOUT WMCYN</h2>
            <p className={styles.sectionText}>
              future-forward start-up built on the advancement of modern technology
              intertwined with the basics of everyday lifestyle.
            </p>
            <div className={styles.instagramContainer}>
              <a href="https://instagram.com/whatmorecouldyouneed" target="_blank" rel="noopener noreferrer" className={styles.instagramLink}>
                <NextImage src={InstagramLogo} alt="Instagram Logo" className={styles.instagramLogo} />
              </a>
            </div>
          </div>

          {/* FRIENDS & FAMILY SHOP Section */}
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
              <button type="submit" className={styles.submitButton}>
                enter store
              </button>
            </form>
             {/* only show error related to this form */}
            {error && password && <p className={styles.error}>{error}</p>}
          </div>

          {/* AR Scanner -> NFT Marker */}
          <div id="qrCodeSection" className={`${styles.container} ${styles.qrCodeSection}`}>
            <h2 className={styles.sectionHeading}>SCAN WMCYN ID</h2>
            <div onClick={() => { setError(''); setShowCamera(true); }} className={styles.cameraButton}>
              <NextImage src={WMCYNQRCODE} alt="SCAN WMCYN ID" className={styles.qrCodeImage} width={150} height={150} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}