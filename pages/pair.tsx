// src/pages/pair.tsx
import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { AuthAPI } from "@/utils/auth-api";

// Disable SSR for QR component - temporarily disabled due to TypeScript issues
// const QRCode = dynamic(() => import("qrcode.react").then(mod => mod.default), { ssr: false });

type PairingMode = 'qr' | 'code';

export default function Pair() {
  const { currentUser, getIdToken } = useAuth();
  const [mode, setMode] = useState<PairingMode>('code');
  const [deepLink, setDeepLink] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const buildLink = useCallback(async (force = true) => {
    try {
      setError(null);
      setLoading(true);
      const token = await getIdToken(force);
      if (!token) {
        setDeepLink("");
        return;
      }
      const url = `wmcyn://pair?token=${encodeURIComponent(token)}`;
      setDeepLink(url);
    } catch (e: any) {
      setError("Could not refresh token. Please try again.");
      setDeepLink("");
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    if (!currentUser) {
      setDeepLink("");
      setLoading(false);
      return;
    }
    void buildLink(true);
  }, [currentUser, buildLink]);

  const onRefresh = () => void buildLink(true);

  const onCopy = async () => {
    if (!deepLink) return;
    try {
      await navigator.clipboard.writeText(deepLink);
      // optional: toast success (avoid console logging token)
    } catch {
      // optional: toast error
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !currentUser) return;

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const token = await getIdToken();
      if (!token) {
        setError("Could not get authentication token");
        return;
      }

      await AuthAPI.attachCode(code.trim(), token);
      setSuccess("✅ Successfully paired! Your VR headset should now be connected.");
      setCode("");
      
      // clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to pair device. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <main style={styles.main}>
        <div style={styles.card}>
          <h1 style={styles.h1}>Pair Your Headset</h1>
          <p>Please sign in to generate a pairing code.</p>
          <Link href="/login" style={styles.btnPrimary}>Go to Login</Link>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <h1 style={styles.h1}>Pair Your Headset</h1>
        
        {/* Mode Toggle */}
        <div style={styles.modeToggle}>
          <button 
            onClick={() => setMode('code')}
            style={{
              ...styles.modeBtn,
              ...(mode === 'code' ? styles.modeBtnActive : {})
            }}
          >
            6-Digit Code
          </button>
          <button 
            onClick={() => setMode('qr')}
            style={{
              ...styles.modeBtn,
              ...(mode === 'qr' ? styles.modeBtnActive : {})
            }}
          >
            QR Code
          </button>
        </div>

        {mode === 'code' ? (
          <>
            <p style={{ 
              margin: "0 0 24px 0", 
              fontSize: "16px", 
              color: "#bbb", 
              lineHeight: "1.5" 
            }}>
              Enter the 6-digit code shown on your VR headset
            </p>
            
            <form onSubmit={handleCodeSubmit} style={styles.form}>
              <div style={styles.inputGroup}>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Q7F9KJ"
                  maxLength={6}
                  style={styles.codeInput}
                  disabled={loading}
                />
              </div>

              {error && (
                <div style={styles.errorMsg}>{error}</div>
              )}

              {success && (
                <div style={styles.successMsg}>{success}</div>
              )}

              <button
                type="submit"
                disabled={!code.trim() || loading}
                style={{
                  ...styles.submitBtn,
                  ...(loading ? styles.submitBtnDisabled : {})
                }}
              >
                {loading ? 'Pairing...' : 'Pair Device'}
              </button>
            </form>

            <small style={styles.small}>
              Don't have a code? Start pairing on your VR headset first.
            </small>
          </>
        ) : (
          <>
            <p style={{ 
              margin: "0 0 24px 0", 
              fontSize: "16px", 
              color: "#bbb", 
              lineHeight: "1.5" 
            }}>
              Open the Wimson Online app on your Quest, then scan this QR.
            </p>
            {loading ? (
              <div style={{ padding: 24 }}>Generating token…</div>
            ) : error ? (
              <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>
            ) : deepLink ? (
              <div style={{ display: "grid", placeItems: "center", gap: 12 }}>
                <div style={{ 
                  width: 256, 
                  height: 256, 
                  background: "#1b1b1b", 
                  border: "2px solid #2a2a2a", 
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#666"
                }}>
                  QR Code (temporarily disabled)
                </div>
                <code style={styles.code}>{deepLink}</code>
              </div>
            ) : null}

            <div style={styles.row}>
              <button onClick={onRefresh} style={styles.btn}>Refresh</button>
              <button onClick={onCopy} style={styles.btn}>Copy Link</button>
            </div>

            <small style={styles.small}>
              Tip: This link includes a short-lived ID token. If scanning fails, tap Refresh and try again.
            </small>
          </>
        )}
      </div>
    </main>
  );
}

const styles: Record<string, any> = {
  main: { 
    minHeight: "100vh", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    padding: "16px", 
    background: "#0b0b0b",
    fontFamily: "system-ui, -apple-system, sans-serif"
  },
  card: { 
    width: "100%", 
    maxWidth: "400px", 
    background: "#121212", 
    color: "#ddd", 
    borderRadius: 16, 
    padding: "24px", 
    boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
    textAlign: "center"
  },
  h1: { 
    margin: "0 0 16px 0", 
    fontSize: "28px", 
    fontWeight: "600",
    color: "#fff"
  },
  code: { display: "block", wordBreak: "break-all", background: "#1b1b1b", padding: 12, borderRadius: 8 },
  row: { display: "flex", gap: 12, marginTop: 12 },
  btn: { background: "#1e1e1e", color: "#fff", padding: "10px 14px", borderRadius: 10, border: "1px solid #2a2a2a", cursor: "pointer" },
  btnPrimary: { display: "inline-block", background: "#2a5fff", color: "#fff", padding: "10px 14px", borderRadius: 10, textDecoration: "none" },
  small: { 
    display: "block", 
    marginTop: 16, 
    color: "#9a9a9a", 
    fontSize: "14px",
    lineHeight: "1.4"
  },
  
  // New styles for 6-digit code mode
  modeToggle: { 
    display: "flex", 
    gap: 6, 
    marginBottom: 24, 
    background: "#1e1e1e", 
    borderRadius: 12, 
    padding: 4 
  },
  modeBtn: { 
    flex: 1, 
    background: "transparent", 
    color: "#9a9a9a", 
    padding: "8px 16px", 
    borderRadius: 8, 
    border: "none", 
    cursor: "pointer",
    fontSize: 14,
    transition: "all 0.2s ease"
  },
  modeBtnActive: { 
    background: "#2a5fff", 
    color: "#fff" 
  },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  inputGroup: { display: "flex", flexDirection: "column", gap: 8 },
  codeInput: {
    width: "100%",
    padding: "20px 16px",
    fontSize: "28px",
    fontFamily: "monospace",
    textAlign: "center",
    letterSpacing: "6px",
    background: "#1b1b1b",
    border: "2px solid #2a2a2a",
    borderRadius: 16,
    color: "#fff",
    outline: "none",
    transition: "border-color 0.2s ease",
    boxSizing: "border-box",
    marginBottom: "8px"
  },
  submitBtn: {
    width: "100%",
    background: "#2a5fff",
    color: "#fff",
    padding: "18px 24px",
    borderRadius: 16,
    border: "none",
    fontSize: "18px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginTop: "8px"
  },
  submitBtnDisabled: {
    background: "#1a1a1a",
    color: "#666",
    cursor: "not-allowed"
  },
  errorMsg: {
    background: "rgba(220, 38, 38, 0.1)",
    border: "1px solid rgba(220, 38, 38, 0.3)",
    color: "#fca5a5",
    padding: "12px",
    borderRadius: 8,
    fontSize: 14
  },
  successMsg: {
    background: "rgba(34, 197, 94, 0.1)",
    border: "1px solid rgba(34, 197, 94, 0.3)",
    color: "#86efac",
    padding: "12px",
    borderRadius: 8,
    fontSize: 14
  }
};
