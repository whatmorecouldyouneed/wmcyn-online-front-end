// src/pages/pair.tsx
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { AuthAPI } from "@/utils/auth-api";

export default function Pair() {
  const { currentUser, getIdToken } = useAuth();
  const [code, setCode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);


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
          <p style={{ 
            margin: "0 0 32px 0", 
            fontSize: "16px", 
            color: "#bbb", 
            lineHeight: "1.5" 
          }}>
            Please sign in to generate a pairing code.
          </p>
          <Link href="/login" style={styles.btnPrimary}>Go to Login</Link>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <h1 style={styles.h1}>Pair Your Headset</h1>
        
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
  btnPrimary: { 
    display: "inline-block", 
    background: "#2a5fff", 
    color: "#fff", 
    padding: "16px 24px", 
    borderRadius: 16, 
    textDecoration: "none",
    fontSize: "16px",
    fontWeight: "600",
    transition: "all 0.2s ease"
  },
  small: { 
    display: "block", 
    marginTop: 16, 
    color: "#9a9a9a", 
    fontSize: "14px",
    lineHeight: "1.4"
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
