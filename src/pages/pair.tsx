// src/pages/pair.tsx
import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

// Disable SSR for QR component
const QRCode = dynamic(() => import("qrcode.react"), { ssr: false });

export default function Pair() {
  const { currentUser, getIdToken } = useAuth();
  const [deepLink, setDeepLink] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
        <p>Open the Wimson Online app on your Quest, then scan this QR.</p>
        {loading ? (
          <div style={{ padding: 24 }}>Generating token…</div>
        ) : error ? (
          <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>
        ) : deepLink ? (
          <div style={{ display: "grid", placeItems: "center", gap: 12 }}>
            <QRCode value={deepLink} size={256} />
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
      </div>
    </main>
  );
}

const styles: Record<string, any> = {
  main: { minHeight: "100svh", display: "grid", placeItems: "center", padding: 24, background: "#0b0b0b" },
  card: { width: "100%", maxWidth: 560, background: "#121212", color: "#ddd", borderRadius: 16, padding: 24, boxShadow: "0 8px 24px rgba(0,0,0,0.35)" },
  h1: { margin: "0 0 8px 0", fontSize: 24 },
  code: { display: "block", wordBreak: "break-all", background: "#1b1b1b", padding: 12, borderRadius: 8 },
  row: { display: "flex", gap: 12, marginTop: 12 },
  btn: { background: "#1e1e1e", color: "#fff", padding: "10px 14px", borderRadius: 10, border: "1px solid #2a2a2a", cursor: "pointer" },
  btnPrimary: { display: "inline-block", background: "#2a5fff", color: "#fff", padding: "10px 14px", borderRadius: 10, textDecoration: "none" },
  small: { display: "block", marginTop: 12, color: "#9a9a9a" },
};
