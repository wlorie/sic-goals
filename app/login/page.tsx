"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setMsg(null);
    setErr(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
   `${process.env.NEXT_PUBLIC_SITE_URL ?? (typeof window !== "undefined" ? window.location.origin : "")}/auth/callback`,
      },
    });

    setSending(false);
    if (error) {
      setErr(error.message);
    } else {
      setMsg("Check your email for the magic link.");
    }
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        fontFamily: "system-ui",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          border: "1px solid #e5e5e5",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
          SIC Goals Portal
        </h1>
        <p style={{ color: "#555", marginBottom: 16 }}>
          Sign in with your email and we’ll send you a magic link.
        </p>

        {msg && (
          <div
            style={{
              padding: 10,
              borderRadius: 8,
              border: "1px solid #c3e6cb",
              background: "#d4edda",
              color: "#155724",
              marginBottom: 10,
            }}
          >
            {msg}
          </div>
        )}
        {err && (
          <div
            style={{
              padding: 10,
              borderRadius: 8,
              border: "1px solid #f5c6cb",
              background: "#f8d7da",
              color: "#721c24",
              marginBottom: 10,
            }}
          >
            {err}
          </div>
        )}

        <form onSubmit={sendMagicLink}>
          <label htmlFor="email" style={{ display: "block", marginBottom: 6 }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@school.org"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #ccc",
              marginBottom: 12,
            }}
          />

          <button
            type="submit"
            disabled={!email || sending}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #111",
              background: sending ? "#888" : "#111",
              color: "#fff",
              cursor: sending ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
            aria-busy={sending}
          >
            {sending ? "Sending..." : "Send magic link"}
          </button>
        </form>

        <p style={{ fontSize: 12, color: "#666", marginTop: 12 }}>
          You’ll be redirected back here after clicking the link.
        </p>
      </div>
    </main>
  );
}
