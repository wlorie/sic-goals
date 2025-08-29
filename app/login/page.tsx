"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"enter-email" | "enter-code">("enter-email");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const canResend = cooldown === 0;

  // optional: small resend cooldown so users don't spam email
  function startCooldown(seconds = 30) {
    setCooldown(seconds);
    const id = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setSending(true);
    setMsg(null);
    setErr(null);

    // Send an email OTP (Supabase will also include a link, but we ignore it)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true, // create user if not exists
      },
    });

    setSending(false);
    if (error) {
      setErr(error.message);
      return;
    }

    setMsg("We emailed you a 6-digit code. Enter it below.");
    setStep("enter-code");
    startCooldown(30);
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email || code.trim().length < 6) return;

    setVerifying(true);
    setErr(null);
    setMsg(null);

    // Verify the 6-digit code
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email", // <-- 6-digit email OTP
    });

    setVerifying(false);

    if (error || !data?.user) {
      setErr(error?.message ?? "Invalid code. Please try again.");
      return;
    }

    // success → go to the app (SSR not required)
    window.location.href = "/app";
  }

  async function resendCode() {
    if (!canResend || !email) return;
    setErr(null);
    setMsg(null);
    setSending(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    setSending(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setMsg("We sent a new code. Check your inbox.");
    startCooldown(30);
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

        {step === "enter-email" && (
          <>
            <p style={{ color: "#555", marginBottom: 16 }}>
              Enter your email and we’ll send you a <b>6-digit code</b>.
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

            <form onSubmit={sendCode}>
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
                {sending ? "Sending…" : "Send code"}
              </button>
            </form>
          </>
        )}

        {step === "enter-code" && (
          <>
            <p style={{ color: "#555", marginBottom: 16 }}>
              Enter the 6-digit code we emailed to <b>{email}</b>.
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

            <form onSubmit={verifyCode}>
              <label htmlFor="code" style={{ display: "block", marginBottom: 6 }}>
                6-digit code
              </label>
              <input
                id="code"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="••••••"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                required
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                  marginBottom: 12,
                  letterSpacing: 4,
                  textAlign: "center",
                  fontSize: 18,
                }}
              />

              <button
                type="submit"
                disabled={verifying || code.trim().length < 6}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #111",
                  background: verifying ? "#888" : "#111",
                  color: "#fff",
                  cursor: verifying ? "not-allowed" : "pointer",
                  fontWeight: 600,
                }}
                aria-busy={verifying}
              >
                {verifying ? "Verifying…" : "Verify & Sign in"}
              </button>
            </form>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
              <button
                onClick={() => setStep("enter-email")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#0645AD",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                Use a different email
              </button>

              <button
                onClick={resendCode}
                disabled={!canResend || sending}
                style={{
                  background: "transparent",
                  border: "none",
                  color: canResend ? "#0645AD" : "#888",
                  textDecoration: "underline",
                  cursor: canResend ? "pointer" : "not-allowed",
                }}
              >
                {canResend ? "Resend code" : `Resend in ${cooldown}s`}
              </button>
            </div>
          </>
        )}

        <p style={{ fontSize: 12, color: "#666", marginTop: 12 }}>
          If you don’t receive the code, check spam or ask IT to allowlist Supabase auth emails.
        </p>
      </div>
    </main>
  );
}
