import { useState, SetStateAction } from 'react';
import { db, ref, push, set } from '../utils/lib/firebase';
import Typewriter from 'typewriter-effect';
import NextImage from '../components/NextImage';
import WMCYNLOGO from '../../public/wmcyn_logo_white.png';
import InstagramLogo from '../../public/instagram-logo.png';
import styles from '../styles/Home.module.css';
import router from 'next/router';

function writeUserData(emailID: string) {
  if (!db) return;
  const emailListRef = ref(db, 'emailList');
  const newEmailRef = push(emailListRef);
  set(newEmailRef, { email: emailID });
}

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hasSubscribed, setHasSubscribed] = useState(false);
  const [error, setError] = useState('');

  const handleEmailChange = (e: { target: { value: SetStateAction<string>; }; }) => setEmail(e.target.value);
  const handlePasswordChange = (e: { target: { value: SetStateAction<string>; }; }) => setPassword(e.target.value);

  const handleSubmit = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    if (!email) {
      setError('email is required.');
      return;
    }
    writeUserData(email);
    setHasSubscribed(true);
    setEmail('');
  };

  const handleShopAccess = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    if (password === 'test') {
      localStorage.setItem('hasAccessToShop', 'true'); // set flag in localStorage
      router.push('/shop');
    } else {
      setError('incorrect password');
    }
  };
  

  return (
    <>
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

        <div className={`${styles.container} ${styles.aboutSection}`} id="aboutSection">
          <h2 className={styles.sectionHeading}>ABOUT WMCYN</h2>
          <p className={styles.sectionText}>
            future-forward start-up built on the advancement of modern technology intertwined with the basics of everyday lifestyle
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
      </div>
    </>
  );
}