"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase"; // ⬅ use the shared client

type Row = Record<string, unknown>;

function toCSV(rows: Row[]) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    if (v == null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = cols.join(",");
  const body = rows.map(r => cols.map(c => esc(r[c])).join(",")).join("\n");
  return [header, body].join("\n");
}

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function check() {
      setChecking(true);
      setError(null);

      // 1) Get current session (more reliable right after navigation)
      const { data: sessRes, error: sErr } = await supabase.auth.getSession();
      if (sErr || !sessRes?.session?.user) {
        // Not signed in yet (or restoring); we’ll also listen below.
        if (mounted) setChecking(false);
        return;
      }

      // 2) Confirm admin via RPC
      const { data: ok, error: aErr } = await supabase.rpc("is_admin");
      if (mounted) {
        if (aErr) setError(aErr.message);
        setIsAdmin(!!ok);
        setChecking(false);
      }
    }

    check();

    // 3) Listen for auth changes (restores after OTP flow / page nav)
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!mounted) return;
      if (session?.user) {
        // Re-check admin once session is present
        (async () => {
          const { data: ok } = await supabase.rpc("is_admin");
          setIsAdmin(!!ok);
          setChecking(false);
        })();
      } else {
        setIsAdmin(false);
        setChecking(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function downloadCSV() {
    setError(null);
    setDownloading(true);
    const { data, error } = await supabase.rpc("admin_export");
    setDownloading(false);
    if (error) {
      setError(error.message);
      return;
    }
    const rows = (data ?? []) as Row[];
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "parts_export.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main style={{ padding: 20, fontFamily: "system-ui", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Admin</h1>

      {checking && <p>Checking admin access…</p>}

      {!checking && !isAdmin && (
        <div
          style={{
            padding: 10,
            borderRadius: 8,
            border: "1px solid #f5c6cb",
            background: "#f8d7da",
            color: "#721c24",
            marginTop: 10,
          }}
        >
          You are not signed in or do not have admin access.
        </div>
      )}

      {!checking && isAdmin && (
        <>
          <p style={{ marginBottom: 16 }}>
            Read-only export of all records. Click the button below to download CSV.
          </p>
          <button
            onClick={downloadCSV}
            disabled={downloading}
            style={{
              display: "inline-block",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #111",
              background: downloading ? "#888" : "#111",
              color: "#fff",
              fontWeight: 600,
              cursor: downloading ? "not-allowed" : "pointer",
            }}
          >
            {downloading ? "Preparing…" : "Download CSV"}
          </button>
          {error && (
            <div
              style={{
                padding: 10,
                borderRadius: 8,
                border: "1px solid #f5c6cb",
                background: "#f8d7da",
                color: "#721c24",
                marginTop: 10,
              }}
            >
              {error}
            </div>
          )}
        </>
      )}
    </main>
  );
}

