import React, { useState } from "react";

export default function Login({ onLoggedIn }: { onLoggedIn: (token: string, user: any) => void }) {
  const [email, setEmail] = useState("");
  const [magicUrl, setMagicUrl] = useState<string | null>(null);

  async function requestMagicLink() {
    const res = await fetch("http://localhost:4000/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    setMagicUrl(data.magicUrl || null);
    alert("Magic link created (dev): check backend logs or use the URL shown on the page.");
  }

  async function useTokenFromUrl() {
    // In dev we show the magicUrl; emulate visiting it and retrieving JWT
    if (!magicUrl) return alert("No magicUrl available. Request one first.");
    const url = new URL(magicUrl);
    const token = url.searchParams.get("token");
    if (!token) return;
    const res = await fetch(`http://localhost:4000/api/auth/verify?token=${token}`);
    const data = await res.json();
    if (data.token) {
      onLoggedIn(data.token, data.user);
    } else {
      alert(JSON.stringify(data));
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Sign in (dev magic link)</h2>
      <input placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
      <button onClick={requestMagicLink}>Request magic link</button>
      {magicUrl && (
        <>
          <div style={{ marginTop: 12 }}>
            <div><strong>Dev magic URL:</strong></div>
            <code style={{ display: "block", wordBreak: "break-all" }}>{magicUrl}</code>
            <button onClick={useTokenFromUrl} style={{ marginTop: 8 }}>Use this magic URL (dev)</button>
          </div>
        </>
      )}
    </div>
  );
}
